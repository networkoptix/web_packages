import json
from dataclasses import dataclass
from functools import wraps
from typing import (
    Any,
    Callable,
    Dict,
    List,
    TypeVar,
    Union,
)

import structlog
from rest_framework.response import Response
from rest_framework.views import APIView

from partners.models import CloudUser
from partners.services.caching.cache_dependency import CacheDependency
from partners.services.caching.dependent_cache import DependentCache
from partners.utils.nx_http_request import NxRequest


logger = structlog.getLogger()

# Define a generic type T that is either a subclass of APIView or a Callable (function)
T = TypeVar('T', bound=Union[type[APIView], Callable])

# Additional Type
ViewAction = TypeVar('ViewAction', bound=str)

# Key parameters used in the cache key
KEY_PARAMS: List[str] = ["method", "host", "user_id", "path"]
PROTOCOL_VERSION: int = 1


@dataclass
class Dependencies:
    dependencies: List[CacheDependency]
    validate_user: bool = True


class ValidationSource:
    @staticmethod
    def build(req: NxRequest, dependencies: Union[Dependencies, List[CacheDependency]], **kwargs) -> Dict[str, Any]:
        result: Dict[str, Any] = {}

        source_handlers: Dict[str, Callable] = {
            "path": lambda source: ValidationSource._handle_path_or_query_param(source, result, kwargs),
            "query": lambda source: ValidationSource._handle_path_or_query_param(source, result, req.query_params),
            "cloud_user": lambda _: ValidationSource._handle_cloud_user(req, result)
        }

        if isinstance(dependencies, Dependencies):
            dependencies = dependencies.dependencies

        for dependency in dependencies:
            source_type: str = dependency.source.split(".")[0]
            if source_type not in source_handlers:
                raise ValueError(f"Unknown source type [{dependency.source}] in dependencies")
            source_handlers[source_type](dependency.source)
        return result

    @staticmethod
    def _handle_cloud_user(request: NxRequest, result: Dict[str, Any]) -> None:
        if "cloud_user" in result:
            raise ValueError("Duplicate cloud_user found in dependencies")
        result["cloud_user"] = request.user.id

    @staticmethod
    def _handle_path_or_query_param(source: str, result: Dict[str, Any], data: Dict[str, Any]) -> None:
        key = source.split(".")[1]
        if key not in data:
            raise ValueError(f"{source.split('.')[0].capitalize()} key {key} not found")
        if source in result:
            raise ValueError(f"Duplicate {source.split('.')[0]} key {key} found in dependencies")
        result[source] = data[key]


def generate_cache_key_params(request: NxRequest, view_name: str) -> Dict[str, Any]:
    """
    Generate cache key parameters based on the request and view name.
    This function creates a unique identifier for caching purposes.
    """
    user_id = str(request.user.id)
    cloud_host = request.cloud_host.hostname
    request_path = request.get_full_path(force_append_slash=True)
    cache_key_params = {
        "method": request.method,
        "host": cloud_host,
        "user_id": user_id,
        "path": request_path
    }
    logger.debug("Cache key params for", view_name=view_name, params=cache_key_params)
    return cache_key_params


def retrieve_from_cache(
        cache: DependentCache,
        cache_key_params: Dict[str, Any],
        user: CloudUser,
        validation_sources: Dict[str, Any],
) -> Union[List[Any], Dict[str, Any], None]:
    """
    Attempt to retrieve a response from the cache.
    If found, deserialize and return the cached content.
    """
    cached_response = cache.validate_and_retrieve(
        keys=cache_key_params,
        validation_sources=validation_sources,
        data_fields=["content"],
        user=user
    )

    if cached_response:
        content = cached_response["content"]
        if isinstance(content, str):
            return json.loads(content)
        else:
            return content

    return None


def store_in_cache(
        cache: DependentCache,
        cache_key_params: Dict[str, Any],
        response: Response,
        user: CloudUser,
        validation_sources: Dict[str, Any]
) -> None:
    """
    Store a successful response in the cache for future retrieval.
    """
    if response.status_code == 200:
        content = response.data
        logger.debug("Caching response")
        cache.set(
            keys=cache_key_params,
            validation_sources=validation_sources,
            data={"content": content},
            user=user
        )


def initialize_request_and_perform_initial_steps(
        self: APIView,
        request: NxRequest,
        *args: Any,
        **kwargs: Any
) -> NxRequest:
    # Initialize the request
    self.args = args
    self.kwargs = kwargs
    request = self.initialize_request(request, *args, **kwargs)
    self.request = request
    self.headers = self.default_response_headers  # deprecate? (used in the original dispatch method)

    # Perform initial steps
    self.format_kwarg = self.get_format_suffix(**kwargs)
    neg = self.perform_content_negotiation(request)
    request.accepted_renderer, request.accepted_media_type = neg
    version, scheme = self.determine_version(request, *args, **kwargs)
    request.version, request.versioning_scheme = version, scheme
    self.perform_authentication(request)
    self.check_throttles(request)

    return request


def validate_actions(dependencies: Dict[str, Dependencies], view: T) -> None:
    """
    Validate that all actions in the view have dependencies specified.
    """
    actions = {}
    if isinstance(view, type) and issubclass(view, APIView):
        actions = set(dir(view))
    elif callable(view):
        actions = {view.cls.__name__}
    else:
        raise TypeError("View must be a subclass of APIView or a function-based view")

    for key in dependencies.keys():
        if key not in actions:
            raise ValueError(f"Action {key} not found in view")


def create_caches(view: T, dependencies: Dict[str, Dependencies]) -> Dict[str, DependentCache]:
    """
    Create a cache for each action in the view.
    """
    caches = {}
    if isinstance(view, type) and issubclass(view, APIView):
        for action_name in dependencies.keys():
            cache_name = f"{view.__name__}:{action_name}"
            cache = DependentCache(
                name=cache_name,
                key_params=KEY_PARAMS,
                dependencies=dependencies[action_name].dependencies,
                validate_user=dependencies[action_name].validate_user,
            )
            caches[action_name] = cache
    elif callable(view):
        action_name = view.cls.__name__
        if action_name in dependencies:
            cache_name = action_name
            cache = DependentCache(
                name=cache_name,
                key_params=KEY_PARAMS,
                dependencies=dependencies[action_name].dependencies,
                validate_user=dependencies[action_name].validate_user,
            )
            caches[action_name] = cache
    return caches


def process_views(
        self: APIView,
        request: NxRequest,
        dependent_cache_name: str,
        cache: DependentCache,
        validation_sources: Dict[str, Any],
        *args: Any,
        **kwargs: Any
) -> Response:
    method = request.method.lower()
    # Initialize request and perform initial steps
    request = initialize_request_and_perform_initial_steps(self, request, *args, **kwargs)

    # Get the cache for the action
    cache_key_params = generate_cache_key_params(request, dependent_cache_name)

    cached_response = None
    try:
        cached_response = retrieve_from_cache(cache, cache_key_params, request.user, validation_sources)
    except Exception as exc:
        # This would come from initial validation stages of retrieving from cache
        logger.error("Error validating and retrieving cache", exc=exc)

    if cached_response:
        return Response(cached_response)

    else:
        # Not found in cache - proceed with the request
        self.check_permissions(request)
        handler = getattr(self, method, self.http_method_not_allowed)
        response = handler(request, *args, **kwargs)

        # Attempt to store the response in the cache
        try:
            if cache is not None and validation_sources is not None:
                store_in_cache(cache, cache_key_params, response, request.user, validation_sources)
        except Exception as exc:
            logger.error("Error storing in cache", exc=exc)

        # Return the response to the wrapper
        return response


# TODO: Add type hints
def wrap_class_view(view, caches: Dict[ViewAction, DependentCache]) -> T:
    # Still on View level (class based view) -- should be hit 3 times.
    original_dispatch = view.dispatch

    @wraps(view.dispatch)
    def _new_dispatch(self: APIView, request: NxRequest, *args: Any, **kwargs: Any) -> Response:
        method = request.method.lower()
        if method != 'get':
            return original_dispatch(self, request, *args, **kwargs)

        action = self.action_map.get(request.method.lower())
        dependent_cache_name: str = f"{self.__class__.__name__}:{action}"

        cache = caches.get(action)
        if cache is None:
            logger.error("Cache not found", view_name=self.__class__.__name__, action=action)
            return original_dispatch(self, request, *args, **kwargs)

        try:
            validation_sources = ValidationSource.build(request, cache.dependencies, **kwargs)
        except Exception as e:
            logger.error("Error building validation sources", exc_info=e)
            return original_dispatch(self, request, *args, **kwargs)

        response = None
        try:
            response: Response = process_views(
                self,
                request,
                dependent_cache_name,
                cache,
                validation_sources,
                *args,
                **kwargs)

        except Exception as exc:
            response = self.handle_exception(exc)

        # Finalize the response
        self.response = self.finalize_response(request, response, *args, **kwargs)
        return self.response

    view.dispatch = _new_dispatch
    return view


# TODO: Add type hints
def wrap_func_view(view, caches: Dict[ViewAction, DependentCache]) -> Callable:
    @wraps(view)
    def _new_dispatch(request, *args, **kwargs):
        method = request.method.lower()
        if method != 'get':
            return view(request, *args, **kwargs)

        self: APIView = view.cls()
        dependent_cache_name = action = view.cls.__name__

        cache = caches.get(action)
        if cache is None:
            logger.error("Cache for DRF View not found", view_name=self.cls.__name__, action=action)
            return view(self, request, *args, **kwargs)

        try:
            validation_sources = ValidationSource.build(request, cache.dependencies, **kwargs)
        except Exception as e:
            logger.error("Error building validation sources", exc_info=e)
            return view(request, *args, **kwargs)

        response = None
        try:
            response: Response = process_views(
                self,
                request,
                dependent_cache_name,
                cache,
                validation_sources,
                *args,
                **kwargs)

        except Exception as exc:
            response = self.handle_exception(exc)

        self.response = self.finalize_response(request, response, *args, **kwargs)
        return self.response

    return _new_dispatch


def dependent_view_cache(dependencies: Dict[ViewAction, Dependencies]) -> Callable[[T], T]:
    # Should be hit 2 time. (1 class based view | 1 function based view)
    caches: Dict[ViewAction, DependentCache] = {}

    def decorator(view_or_cls: T) -> T:
        # Should be hit 4 times (3 for class based view | 1 for function based view)
        validate_actions(dependencies, view_or_cls)
        caches = create_caches(view_or_cls, dependencies)

        if isinstance(view_or_cls, type) and issubclass(view_or_cls, APIView):
            return wrap_class_view(view_or_cls, caches)

        elif callable(view_or_cls):
            @wraps(view_or_cls)
            def wrapped_view(*args, **kwargs):
                # ....? need this level for it to work, I think....
                return wrap_func_view(view_or_cls, caches)(*args, **kwargs)

            return wrapped_view

    return decorator

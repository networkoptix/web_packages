import json
from dataclasses import dataclass
from functools import wraps
from hashlib import md5
from typing import (
    Any,
    Callable,
    Dict,
    List,
    Tuple,
    TypeVar,
    Union,
)

import structlog
from django.utils.http import quote_etag
from rest_framework.response import Response
from rest_framework.status import HTTP_304_NOT_MODIFIED
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
E_TAG_CACHE_KEY: str = "**etag"
CACHE_STATUS_HEADER_KEY: str = "X-CPS-Cache-Status"
CACHE_ETAG_HEADER_KEY: str = "ETag"


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


def generate_etag(content: Any) -> str:
    """
    Generate an eTag for the given content by serializing it to JSON format,
    encoding the JSON string to bytes, and then hashing the result.
    """
    # Convert the content to a JSON string and encode it to bytes
    # content_bytes = json.dumps(content).encode('utf-8')
    # Generate the MD5 hash of the bytes-like object
    etag_hash = md5(content, usedforsecurity=False).hexdigest()
    # Quote the ETag for use in HTTP headers
    return quote_etag(etag_hash)


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
        verify_etag: bool = False
) -> Tuple[Union[List[Any], Dict[str, Any], None], Union[str, None]]:
    """
    Attempt to retrieve a response from the cache.
    If found, deserialize and return the cached content.
    """
    cached_response = cache.validate_and_retrieve(
        keys=cache_key_params,
        validation_sources=validation_sources,
        data_fields=["content"] if not verify_etag else [E_TAG_CACHE_KEY],
        user=user
    )

    if cached_response:
        etag = cached_response.get(E_TAG_CACHE_KEY, None)
        content = cached_response.get("content", None)
        # TODO: This needs to be more robust
        if isinstance(content, str):
            return json.loads(content), etag
        else:
            return content, etag

    return None, None


def store_in_cache(
        cache: DependentCache,
        cache_key_params: Dict[str, Any],
        response: Response,
        user: CloudUser,
        validation_sources: Dict[str, Any],
        etag: str
) -> None:
    """
    Store a successful response in the cache for future retrieval.

    We use `response.data` instead of `response.content` for caching because:
    - `response.data` contains the original data in a structured format (e.g., dict, list), which is more suitable for
    serialization and deserialization when storing and retrieving from the cache.
    - `response.content` is a rendered byte string, which includes serialized JSON data. Using `response.content`
    directly could lead to issues with escaped characters (e.g., "\\" becomes "\\\\") when serialized, making the
    data less readable and potentially causing issues when deserialized.
    """
    if response.status_code == 200:
        # TODO: Review if i should be using response.data or response.content
        # response.content gets escaped characters, such as "\\" when stored in cache...
        content = response.data
        logger.debug("Caching response")
        cache.set(
            keys=cache_key_params,
            validation_sources=validation_sources,
            data={"content": content, E_TAG_CACHE_KEY: etag},
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
        cache: DependentCache,
        validation_sources: Dict[str, Any],
        cache_key_params: Dict[str, Any],
        *args: Any,
        **kwargs: Any
) -> Response:
    method = request.method.lower()

    cached_response = None
    etag = None

    try:
        request_etag = request.headers.get(CACHE_ETAG_HEADER_KEY, None)
        if request_etag is not None:
            _, etag = retrieve_from_cache(
                cache,
                cache_key_params,
                request.user,
                validation_sources,
                verify_etag=True)
            # Do comparison here.
            if etag == request_etag:
                return Response(status=HTTP_304_NOT_MODIFIED,
                                headers={CACHE_ETAG_HEADER_KEY: etag, CACHE_STATUS_HEADER_KEY: "hit"})
        cached_response, etag = retrieve_from_cache(cache, cache_key_params, request.user, validation_sources)
    except Exception as exc:
        # This would come from initial validation stages of retrieving from cache
        logger.error("Error validating and retrieving cache", exc=exc)

    if cached_response:
        return Response(cached_response, headers={CACHE_ETAG_HEADER_KEY: etag, CACHE_STATUS_HEADER_KEY: "hit"})

    # Not found in cache - proceed with the request
    self.check_permissions(request)
    handler = getattr(self, method, self.http_method_not_allowed)
    response: Response = handler(request, *args, **kwargs)

    # Return the response to the wrapper
    return response


def dispatch_with_cache(
        self: APIView,
        request: NxRequest,
        dependent_cache_name: str,
        cache: DependentCache,
        validation_sources: Dict[str, Any],
        *args: Any,
        **kwargs: Any
):
    # Initialize request and perform initial steps
    request = initialize_request_and_perform_initial_steps(self, request, *args, **kwargs)

    # Get the cache for the action
    cache_key_params = generate_cache_key_params(request, dependent_cache_name)

    try:
        response: Response = process_views(
            self,
            request,
            cache,
            validation_sources,
            cache_key_params,
            *args,
            **kwargs)

    except Exception as exc:
        response = self.handle_exception(exc)

    # Finalize the response
    self.response = self.finalize_response(request, response, *args, **kwargs)

    if self.response.status_code == 200 and self.response.headers.get("ETag", None) is None:
        # TODO: Add a detailed comment on how and why this is why it is.
        try:
            # Attempt to store the response in the cache
            if cache is not None and validation_sources is not None:
                if not self.response.is_rendered:
                    self.response.render()
                etag = generate_etag(self.response.content)
                store_in_cache(cache, cache_key_params, response, request.user, validation_sources, etag)
                self.response.headers[CACHE_ETAG_HEADER_KEY] = etag
                self.response.headers[CACHE_STATUS_HEADER_KEY] = "miss"
        except Exception as exc:
            logger.error("Error storing in cache", exc=exc)

    return self.response


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

        return dispatch_with_cache(
            self,
            request,
            dependent_cache_name,
            cache,
            validation_sources,
            *args,
            **kwargs)

    view.dispatch = _new_dispatch
    return view


# TODO: Add type hints
def wrap_func_view(view, caches: Dict[ViewAction, DependentCache]) -> Callable:
    @wraps(view)
    def _new_dispatch(request: NxRequest, *args, **kwargs):
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

        return dispatch_with_cache(
            self,
            request,
            dependent_cache_name,
            cache,
            validation_sources,
            *args,
            **kwargs)

    return _new_dispatch


def dependent_view_cache(dependencies: Dict[ViewAction, Dependencies]) -> Callable[[T], T]:
    caches: Dict[ViewAction, DependentCache] = {}

    def decorator(view_or_cls: T) -> T:
        validate_actions(dependencies, view_or_cls)
        caches = create_caches(view_or_cls, dependencies)

        if isinstance(view_or_cls, type) and issubclass(view_or_cls, APIView):
            return wrap_class_view(view_or_cls, caches)

        elif callable(view_or_cls):
            @wraps(view_or_cls)
            def wrapped_view(*args, **kwargs):
                return wrap_func_view(view_or_cls, caches)(*args, **kwargs)

            return wrapped_view

    return decorator

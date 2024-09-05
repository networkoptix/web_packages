import json
from collections import defaultdict
from dataclasses import dataclass
from functools import wraps
from hashlib import md5
from typing import (
    Any,
    Callable,
    Dict,
    List,
    Optional,
    Tuple,
    Type,
    TypeVar,
    Union,
)

import structlog
from django.contrib.auth.models import AnonymousUser
from django.db.models import (
    Model,
    Q,
)
from django.utils.http import quote_etag
from rest_framework.response import Response
from rest_framework.status import HTTP_304_NOT_MODIFIED
from rest_framework.views import APIView

from channel_partners.settings import (
    CACHE_ETAG_HEADER_KEY,
    CACHE_STATUS_HEADER_KEY,
)
from partners.models import (
    CloudSystemId,
    CloudUser,
)
from partners.services.cache_service import CacheService
from partners.services.caching.cache_dependency import CacheDependency
from partners.services.caching.dependent_cache import (
    AuthEntity,
    DependentCache,
)
from partners.utils.nx_http_request import NxRequest


logger = structlog.getLogger()

# Define a generic type T that is either a subclass of APIView or a Callable (function)
T = TypeVar('T', bound=Union[type[APIView], Callable])

# Additional Type
ViewAction = TypeVar('ViewAction', bound=str)

# Key parameters used in the cache key
# NOTE: "auth_*_id" has a wildcard which is replaced with the actual auth entity name
KEY_PARAMS: List[str] = [
    "method",
    "host",
    "auth_*_id",
    "path"
]

PROTOCOL_VERSION: int = 1

E_TAG_CACHE_KEY: str = "**etag"
CACHE_FLUSH_HEADER_KEY: str = "X-Flush-CPS-Cache"
CACHE_SKIP_HEADER_KEY: str = "X-Ignore-CPS-Cache"


@dataclass
class Dependencies:
    dependencies: List[CacheDependency]
    validate_user: bool = True
    ttl: Optional[int] = None  # TODO: Implement TTL for this; if present, either | or & ttl with the cache ttl


def get_auth_entity(request: NxRequest) -> AuthEntity:
    """
    Retrieves the authentication entity from the given request.

    This function checks for the presence of a `user` or `cloud_system`
    attribute in the request. If the `user` attribute is present, it returns
    it directly, regardless of whether it represents an authenticated or
    anonymous user. If the `cloud_system` attribute is found, its value is
    returned. If neither attribute is found, an error is logged, and a new
    instance of `AnonymousUser` is returned.

    Args:
        request (NxRequest): The request object from which to extract the
        authentication entity.

    Returns:
        AuthEntity: The authentication entity found
        in the request or an instance of `AnonymousUser` if no such entity
        is found.
    """
    if hasattr(request, 'user'):
        # Return the user whether authenticated or anonymous
        return request.user

    elif hasattr(request, 'cloud_system'):
        return request.cloud_system

    # Log an error if no auth entity is found
    logger.error("No auth entity found in request")
    return AnonymousUser()


class ValidationSource:
    """
    A utility class for building validation sources from request parameters and dependencies.

    This class provides methods to handle path and query parameters, perform bulk lookups,
    and build a dictionary of validation sources based on the provided dependencies.

    Attributes:
        CUSTOM_FIELD_MAP (Dict[Type[Model], str]): A map of models with their custom lookup fields.
    """

    # Define a map of models with their custom lookup fields
    CUSTOM_FIELD_MAP: Dict[Type[Model], str] = {
        CloudSystemId: 'system_id',
        CloudUser: 'email',
        # Add more models and their custom fields as needed
    }

    @staticmethod
    def build(req: NxRequest, dependencies: Union[Dependencies, List[CacheDependency]], **kwargs) -> Dict[str, Any]:
        """
        Build a dictionary of validation sources from the request and dependencies.

        Args:
            req (NxRequest): The request object containing path and query parameters.
            dependencies (Union[Dependencies, List[CacheDependency]]): The dependencies to validate against.
            **kwargs: Additional keyword arguments.

        Returns:
            Dict[str, Any]: A dictionary of validation sources.

        Raises:
            ValueError: If an unknown source type is encountered in dependencies.

        Usage:
            validation_sources = ValidationSource.build(request, dependencies)
        """
        result: Dict[str, Any] = {}
        db_lookups: Dict[Type[Model], List[Tuple[str, Any, str]]] = defaultdict(list)

        if isinstance(dependencies, Dependencies):
            dependencies = dependencies.dependencies

        for dependency in dependencies:
            source_type, source_key = dependency.source.split(".", 1)

            if source_type == "path":
                ValidationSource._handle_path_param(source_key, result, kwargs, dependency, db_lookups)
            elif source_type == "query":
                ValidationSource._handle_query_param(source_key, result, req.query_params, dependency, db_lookups)
            else:
                raise ValueError(f"Unknown source type [{source_type}] in dependencies")

        ValidationSource._perform_bulk_lookups(result, db_lookups)

        return result

    @staticmethod
    def _handle_path_param(
            source_key: str,
            result: Dict[str, Any],
            data: Dict[str, Any],
            dependency: CacheDependency,
            db_lookups: Dict[Type[Model], List[Tuple[str, Any, str]]]
    ) -> None:
        """
        Handle a path parameter and update the result and db_lookups dictionaries.

        Args:
            source_key (str): The key of the path parameter.
            result (Dict[str, Any]): The dictionary to store the result.
            data (Dict[str, Any]): The data dictionary containing path parameters.
            dependency (CacheDependency): The cache dependency object.
            db_lookups (Dict[Type[Model], List[Tuple[str, Any, str]]]): The dictionary to store database lookups.

        Usage:
            ValidationSource._handle_path_param('id', result, kwargs, dependency, db_lookups)
        """
        ValidationSource._handle_param(source_key, result, data, "path", dependency, db_lookups)

    @staticmethod
    def _handle_query_param(
            source_key: str,
            result: Dict[str, Any],
            data: Dict[str, Any],
            dependency: CacheDependency,
            db_lookups: Dict[Type[Model], List[Tuple[str, Any, str]]]
    ) -> None:
        """
        Handle a query parameter and update the result and db_lookups dictionaries.

        Args:
            source_key (str): The key of the query parameter.
            result (Dict[str, Any]): The dictionary to store the result.
            data (Dict[str, Any]): The data dictionary containing query parameters.
            dependency (CacheDependency): The cache dependency object.
            db_lookups (Dict[Type[Model], List[Tuple[str, Any, str]]]): The dictionary to store database lookups.

        Usage:
            ValidationSource._handle_query_param('email', result, req.query_params, dependency, db_lookups)
        """
        ValidationSource._handle_param(source_key, result, data, "query", dependency, db_lookups)

    @staticmethod
    def _handle_param(
            source_key: str,
            result: Dict[str, Any],
            data: Dict[str, Any],
            param_type: str,
            dependency: CacheDependency,
            db_lookups: Dict[Type[Model], List[Tuple[str, Any, str]]]
    ) -> None:
        """
        Handle a parameter (path or query) and update the result and db_lookups dictionaries.

        Args:
            source_key (str): The key of the parameter.
            result (Dict[str, Any]): The dictionary to store the result.
            data (Dict[str, Any]): The data dictionary containing parameters.
            param_type (str): The type of the parameter ('path' or 'query').
            dependency (CacheDependency): The cache dependency object.
            db_lookups (Dict[Type[Model], List[Tuple[str, Any, str]]]): The dictionary to store database lookups.

        Raises:
            ValueError: If the source key is not found in the data dictionary.

        Usage:
            ValidationSource._handle_param('id', result, kwargs, 'path', dependency, db_lookups)
        """
        if source_key not in data:
            raise ValueError(f"{param_type.capitalize()} key {source_key} not found")

        value = data[source_key]
        source = f"{param_type}.{source_key}"
        result[source] = value

        model = dependency.model

        # Check if the model has a custom field mapping
        if model in ValidationSource.CUSTOM_FIELD_MAP:
            if ValidationSource.CUSTOM_FIELD_MAP[model] == source_key:
                custom_field = ValidationSource.CUSTOM_FIELD_MAP[model]
                db_lookups[model].append((custom_field, value, source))

    @staticmethod
    def _generate_cache_keys(
            db_lookups: Dict[Type[Model], List[Tuple[str, Any, str]]]
    ) -> Dict[Tuple[str, str], Tuple[Type[Model], Any, str]]:
        # Generate cache keys for bulk lookups
        cache_keys = {}
        for model, lookups in db_lookups.items():
            custom_field = ValidationSource.CUSTOM_FIELD_MAP[model]
            for field, value, source in lookups:
                cache_key = (custom_field, value)
                cache_keys[cache_key] = (model, value, source)
        return cache_keys

    @staticmethod
    def _fetch_missing_lookups_from_db(
            missing_lookups: Dict[Type[Model], List[Tuple[str, Any, str]]]
    ) -> Dict[Tuple[str, Any, str], Any]:
        # Fetch missing lookups from the database
        result = {}
        for model, lookups in missing_lookups.items():
            custom_field = ValidationSource.CUSTOM_FIELD_MAP[model]
            q_objects = Q()
            for field, value, _ in lookups:
                # Build a Q object for filtering the database query
                q_objects |= Q(**{field: value})

            # Query the database for objects matching the Q object
            objects = model.objects.filter(q_objects)
            # Create a lookup dictionary mapping custom field values to object IDs
            lookup_dict = {getattr(obj, custom_field): obj.id for obj in objects}

            for field, value, source in lookups:
                if value in lookup_dict:
                    # Add the found value to the result dictionary
                    result[(custom_field, value, source)] = str(lookup_dict[value])
                else:
                    raise ValueError(f"No {model.__name__} found with {custom_field}={value}")
        return result

    @staticmethod
    def _perform_bulk_lookups(
            result: Dict[str, Any],
            db_lookups: Dict[Type[Model], List[Tuple[str, Any, str]]]
    ) -> None:
        # Perform bulk lookups for missing values
        cache_keys = ValidationSource._generate_cache_keys(db_lookups)
        cached_values = CacheService.get_bulk_validation_source_keys(list(cache_keys.keys()))

        missing_lookups = defaultdict(list)
        for cache_key, (model, value, source) in cache_keys.items():
            if cache_key in cached_values:
                # If the cache key is found in cached values, add it to the result
                result[source] = cached_values[cache_key]
            else:
                # If the cache key is missing, add it to the missing lookups
                missing_lookups[model].append((ValidationSource.CUSTOM_FIELD_MAP[model], value, source))

        if missing_lookups:
            logger.info("Keys not found in cache, fetching from database")

        # Fetch missing values from the database
        fetched_values = ValidationSource._fetch_missing_lookups_from_db(missing_lookups)
        for (_, __, source), fetched_value in fetched_values.items():
            # Update the result with fetched values
            result[source] = fetched_value

        if fetched_values:
            logger.info("Setting fetched values in cache")

        # Set the fetched values in the cache
        CacheService.set_bulk_validation_source_keys(fetched_values)


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


def generate_cache_key_params(request: NxRequest, view_name: str, auth_entity: AuthEntity) -> Dict[str, Any]:
    """
    Generate cache key parameters based on the request and view name.
    This function creates a unique identifier for caching purposes.
    """
    auth_id = str(auth_entity.id)
    auth_key = f"auth_{DependentCache.get_auth_model_name(auth_entity)}_id"
    cloud_host = request.cloud_host.hostname
    request_path = request.get_full_path(force_append_slash=True)
    cache_key_params = {
        "method": request.method,
        "host": cloud_host,
        auth_key: auth_id,
        "path": request_path
    }
    logger.debug("Cache key params for", view_name=view_name, params=cache_key_params)
    return cache_key_params


def retrieve_from_cache(
        cache: DependentCache,
        cache_key_params: Dict[str, Any],
        auth_entity: AuthEntity,
        validation_sources: Dict[str, Any],
        verify_etag: bool = False,
        flush_cache: bool = False
) -> Tuple[Union[List[Any], Dict[str, Any], None], Union[str, None]]:
    """
    Attempt to retrieve a response from the cache.

    Args:
        cache (DependentCache): The cache instance to retrieve data from.
        cache_key_params (Dict[str, Any]): Parameters used to generate the cache key.
        auth_entity (AuthEntity): The authenticated entity making the request.
        validation_sources (Dict[str, Any]): Sources used to validate the cache entry.
        verify_etag (bool, optional): Whether to verify the ETag. Defaults to False.
        flush_cache (bool, optional): Whether to flush the existing cache. Defaults to False.

    Returns:
        Tuple[Union[List[Any], Dict[str, Any], None], Union[str, None]]:
            - The cached content if found and valid, otherwise None.
            - The ETag associated with the cached content, if any.

    If `flush_cache` is True, the function will skip cache retrieval and return None.
    If a valid cached response is found, it will be deserialized and returned along with its ETag.
    """
    if flush_cache:
        logger.info("Flushing cache for the current request.")
        return None, None

    cached_response = cache.validate_and_retrieve(
        keys=cache_key_params,
        validation_sources=validation_sources,
        data_fields=["content"] if not verify_etag else [E_TAG_CACHE_KEY],
        auth_entity=auth_entity
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
        auth_entity: AuthEntity,
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
            auth_entity=auth_entity
        )


def initialize(self: APIView, request: NxRequest, *args: Any, **kwargs: Any) -> NxRequest:
    """
    Initialize the request object with the given arguments and keyword arguments.
    """
    # Initialize the request
    self.args = args
    self.kwargs = kwargs
    request = self.initialize_request(request, *args, **kwargs)
    self.request = request
    self.headers = self.default_response_headers  # deprecate? (used in the original dispatch method)
    return request


def perform_initial_steps(
        self: APIView,
        request: NxRequest,
        *args: Any,
        **kwargs: Any
) -> NxRequest:
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
                validate_auth=dependencies[action_name].validate_user,
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
                validate_auth=dependencies[action_name].validate_user,
            )
            caches[action_name] = cache
    return caches


def process_views(
        self: APIView,
        request: NxRequest,
        cache: DependentCache,
        validation_sources: Dict[str, Any],
        cache_key_params: Dict[str, Any],
        auth_entity: AuthEntity,
        flush_cache: bool = False,
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
                auth_entity,
                validation_sources,
                verify_etag=True,
                flush_cache=flush_cache)
            # Do comparison here.
            if etag == request_etag:
                return Response(
                    status=HTTP_304_NOT_MODIFIED,
                    headers={
                        CACHE_ETAG_HEADER_KEY: etag,
                        CACHE_STATUS_HEADER_KEY: "hit"
                    })
        cached_response, etag = retrieve_from_cache(
            cache,
            cache_key_params,
            request.user,
            validation_sources,
            flush_cache=flush_cache)
    except Exception as exc:
        # This would come from initial validation stages of retrieving from cache
        logger.error("Error validating and retrieving cache", error=str(exc), exc_info=True)

    if cached_response is not None:
        return Response(
            cached_response,
            headers={
                CACHE_ETAG_HEADER_KEY: etag,
                CACHE_STATUS_HEADER_KEY: "hit"
            })

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
    request = initialize(self, request, *args, **kwargs)
    try:
        request = perform_initial_steps(self, request, *args, **kwargs)
    except Exception as exc:
        response = self.handle_exception(exc)
        return self.finalize_response(request, response, *args, **kwargs)

    # Get the auth entity
    auth_entity = get_auth_entity(request)
    # Get the cache for the action
    cache_key_params = generate_cache_key_params(request, dependent_cache_name, auth_entity)

    # Check if the cache should be flushed
    flush_cache = request.headers.get(CACHE_FLUSH_HEADER_KEY, "false").lower() == "true"

    try:
        response: Response = process_views(
            self,
            request,
            cache,
            validation_sources,
            cache_key_params,
            auth_entity,
            flush_cache=flush_cache,
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
                store_in_cache(cache, cache_key_params, response, auth_entity, validation_sources, etag)

                self.response.headers[CACHE_ETAG_HEADER_KEY] = etag
                self.response.headers[CACHE_STATUS_HEADER_KEY] = "miss"
        except Exception as e:
            logger.error("Error storing in cache", error=str(e), exc_info=True)

    return self.response


# TODO: Add type hints
def wrap_class_view(view, caches: Dict[ViewAction, DependentCache]) -> T:
    # Still on View level (class based view) -- should be hit 3 times.
    original_dispatch = view.dispatch

    @wraps(view.dispatch)
    def _new_dispatch(self: APIView, request: NxRequest, *args: Any, **kwargs: Any) -> Response:
        method = request.method.lower()
        if method != 'get' or request.headers.get(CACHE_SKIP_HEADER_KEY, "false").lower() == "true":
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
            logger.error("Error building validation sources", exc_info=True, error=str(e))
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
    def _new_dispatch(request: NxRequest, *args: Any, **kwargs: Any) -> Response:
        method = request.method.lower()
        if method != 'get' or request.headers.get(CACHE_SKIP_HEADER_KEY, "false").lower() == "true":
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
            logger.error("Error building validation sources", exc_info=True, error=str(e))
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


def DependentViewCache(dependencies: Dict[ViewAction, Dependencies]) -> Callable[[T], T]:
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

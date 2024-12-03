import importlib
import inspect
from typing import (
    List,
    Optional,
    Tuple,
    Type,
    Union,
)

import structlog
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.urls import (
    URLResolver,
    include,
    path,
)
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
)
from rest_framework.serializers import Serializer
from rest_framework.views import APIView

from partners.serializers.serializer_version import versions_mapping
from tools.versioning.routers import VersionedRouter


logger = structlog.getLogger(__name__)


def get_urlpatterns(versioned_urls: List[str], version: str) -> list:
    """
    Retrieve URL patterns for a specific API version.

    This function imports modules listed in `versioned_urls`, extracting urlpatterns and routers.
    It ensures compatibility with the specified API version by filtering urlpatterns and versioned
    URLs from routers. It raises an ImproperlyConfigured exception if routers are not subclasses
    of BaseRouter or urlpatterns are not lists.

    Args:
        versioned_urls (List[str]): A list of module names containing URL configurations.
        version (str): The API version for which to retrieve URL patterns.

    Returns:
        list: A list of URL patterns compatible with the specified API version.

    Raises:
        ImproperlyConfigured: If a module's router is not a subclass of BaseRouter or urlpatterns
                              is not a list.
    """

    unfiltered_urlpatterns = []
    for mod_name in versioned_urls:
        url_mod = importlib.import_module(mod_name)
        if get_router := getattr(url_mod, 'get_router', None):
            if router := get_router():
                if not isinstance(router, VersionedRouter):
                    raise ImproperlyConfigured(f"Router {router} must be instance of VersionedRouter.")
                unfiltered_urlpatterns += router.get_versioned_urls(version)
        if get_patterns := getattr(url_mod, 'get_urlpatterns', None):
            if urlpatterns := get_patterns():
                if not isinstance(urlpatterns, list):
                    raise ImproperlyConfigured(f"urlpatterns in {url_mod} must be a list.")
                unfiltered_urlpatterns += urlpatterns
    return unfiltered_urlpatterns


def filter_patterns(patterns: list, version: str) -> list:
    """
    Filter URL patterns based on API version compatibility.

    This function filters a list of URL patterns, retaining only those compatible with the specified
    API version. Patterns are filtered based on whether their associated view classes are marked
    with compatible versions. It also handles URLResolvers by recursively filtering their
    urlconf_name if it's a list.

    Args:
        patterns: A list of URL patterns (URLResolver or URLPattern instances).
        version: The API version to filter patterns against.

    Returns:
        A list of filtered URL patterns compatible with the specified API version.

    Raises:
        ImproperlyConfigured: If duplicate paths are detected for the same version.
    """

    from tools.versioning.views import VersionedViewMixin
    accepted_paths = []
    filtered = []
    for pat in patterns:
        if isinstance(pat, URLResolver) and isinstance(pat.urlconf_name, list):
            pat.urlconf_name = pat.url_patterns = pat.urlconf_module = filter_patterns(pat.urlconf_name, version)
            if pat.url_patterns:
                filtered.append(pat)
        if hasattr(pat.callback, 'cls'):
            if issubclass(pat.callback.cls, VersionedViewMixin) or issubclass(pat.callback.cls, APIView):
                if not hasattr(pat.callback.cls, 'versions'):
                    # skipping views that are not versioned,
                    # versions attribute is assigned to class in version_range decoration
                    continue
                # Getting init arguments for the view
                if not (initkwargs := getattr(pat.callback, 'view_initkwargs', None)):
                    initkwargs = getattr(pat.callback, 'initkwargs', {})
                # Creating an instance of the view with the init arguments, to populate versions
                # attribute for custom actions.
                view = pat.callback.cls(**initkwargs)
                versions: Versions = view.versions

                # If version is None, it means that versioned viewset is used without decoration
                if versions is None or versions.is_active(version):
                    if pat.pattern.regex in accepted_paths:
                        raise ImproperlyConfigured(
                            f"Path {pat.pattern} or name {pat.name} is already in use. Version {version}, view {view}.")

                    filtered.append(pat)
                    accepted_paths.append(pat.pattern.regex)
    return filtered


def versioned_include(
        version: str,
        app_name: str,
        versioned_urls: list,
        unversioned_urls: Optional[list] = None
):
    """
    Include versioned and unversioned URL patterns for a Django application.

    This function dynamically constructs a list of URL patterns for a specified API version,
    combining both version-specific and general (unversioned) patterns. It first retrieves all
    potential URL patterns from the modules listed in `versioned_urls`, filters them for compatibility
    with the specified version, and then combines them with any `unversioned_urls`.

    Args:
        version (str): The API version for which to include URL patterns.
        app_name (str): The name of the Django application.
        versioned_urls (list): A list of module names containing version-specific URL configurations.
        unversioned_urls (Optional[list]): An optional list of unversioned URL patterns to include.

    Returns:
        An include() call incorporating the filtered and combined URL patterns into the Django URL configuration,
        namespaced by the version and application name.
    """

    unfiltered_urlpatterns = get_urlpatterns(versioned_urls, version)

    accepted_urls = unversioned_urls or []
    accepted_urls += filter_patterns(unfiltered_urlpatterns, version)
    url_patterns = [
        path(f'{version}/', include((accepted_urls, app_name), namespace=version)),
    ]
    return include(url_patterns)


def swagger_urls(urlconf):
    """
    Generate Swagger UI URL patterns for all available API versions.

    This function constructs URL patterns for the Swagger UI documentation and schema views for each
    API version specified in the Django settings under AVAILABLE_VERSIONS. It uses the SpectacularAPIView
    and SpectacularSwaggerView to generate the schema and UI views, respectively.

    Args:
        urlconf: The URL configuration module to use for generating the schema views.

    Returns:
        A list of URL patterns for accessing the Swagger UI and schema for each available API version.
    """

    urlpatterns = []
    for version in settings.AVAILABLE_VERSIONS:
        urlpatterns += [
            path(f'api/schema/{version}/', SpectacularAPIView.as_view(
                api_version=version,
                urlconf=urlconf
            ), name=f'schema-internal-{version}'),
            path(f'api/api-docs/{version}/',
                 SpectacularSwaggerView.as_view(url_name=f'schema-internal-{version}'),
                 name=f'swagger-ui-{version}'),
        ]
    return urlpatterns


def versioned_serializer(base_serializer: Union[Type[Serializer], Serializer], version: str) -> Type[Serializer]:
    """
    Retrieve a version-specific serializer class.

    This function returns a serializer class tailored to a specific API version. It looks up a mapping
    defined in `versions_mapping` to find a serializer class that matches the `base_serializer` for the
    specified version. If no version-specific serializer is found, it attempts to find a serializer for
    previous versions, defaulting to the base serializer if none are found.

    Args:
        base_serializer (Type[Serializer]): The base serializer class or instance.
        version (str): The API version for which to retrieve a serializer.

    Returns:
        Type[Serializer]: A serializer class compatible with the specified API version.
    """
    if version not in settings.AVAILABLE_VERSIONS:
        raise ImproperlyConfigured(f"Invalid version {version}.")
    base_class = base_serializer if inspect.isclass(base_serializer) else base_serializer.__class__
    if serializer_class := versions_mapping.get(version, {}).get(base_class):
        return serializer_class
    versions = settings.AVAILABLE_VERSIONS[:settings.AVAILABLE_VERSIONS.index(version)]
    for ver in reversed(versions):
        if serializer_class := versions_mapping.get(ver, {}).get(base_class):
            return serializer_class
    logger.warning(
        "Serializer not found for version",
        version=version,
        base_serializer=base_class)
    return base_serializer


def get_versions(
        min_version: str,
        max_version: Optional[str],
        deprecated_in: Optional[str] = None,
) -> Tuple[List[str], List[str], List[str]]:
    """
    Calculate version ranges for API views.

    This function determines the range of API versions a view supports, based on minimum, maximum,
    and deprecated version parameters. It calculates three lists: all versions the view supports,
    versions where the view is allowed and not deprecated, and versions where the view is deprecated.

    Args:
        min_version (str): The minimum API version the view supports.
        max_version (Optional[str]): The maximum API version the view supports, inclusive.
        deprecated_in (Optional[str]): The version in which the view becomes deprecated.

    Returns:
        Tuple[List[str], List[str], List[str]]: Three lists representing all supported versions,
                                                non-deprecated versions, and deprecated versions, respectively.
    """

    versions = settings.AVAILABLE_VERSIONS

    if not min_version:
        raise ImproperlyConfigured("min_version is required.")
    if any(version not in versions for version in [min_version, max_version, deprecated_in] if version):
        raise ImproperlyConfigured(f"Invalid version range: min_version={min_version}, max_version={max_version}, "
                                   f"deprecated_in={deprecated_in}.")
    min_idx = versions.index(min_version)
    max_idx = versions.index(max_version) if max_version else len(versions) - 1
    if deprecated_in:
        deprecated_idx = versions.index(deprecated_in)
        if not min_idx <= deprecated_idx <= max_idx:
            raise ImproperlyConfigured(f"Invalid version range: min_version={min_version}, max_version={max_version}, "
                                       f"deprecated_in={deprecated_in}.")
    else:
        if not min_idx <= max_idx:
            raise ImproperlyConfigured(f"Invalid version range: min_version={min_version}, max_version={max_version}, "
                                       f"deprecated_in={deprecated_in}.")

    versions = versions[min_idx:max_idx + 1]

    if deprecated_in:
        return versions, versions[:versions.index(deprecated_in)], versions[versions.index(deprecated_in):]

    return versions, versions, []


class Versions:
    """
    Represents the versioning information for a view.

    This class encapsulates the versioning information for API views, including the range of versions
    the view supports, and provides methods to check if a version is allowed, deprecated, or active
    for the view.

    Attributes:
        min_version (str): The minimum API version the view supports.
        max_version (str): The maximum API version the view supports, inclusive.
        deprecated_in (str): The version in which the view becomes deprecated.
        versions (List[str]): All versions the view supports.
        allowed_versions (List[str]): Versions where the view is allowed and not deprecated.
        deprecated_versions (List[str]): Versions where the view is deprecated.

    Methods:
        is_allowed(version: str): Checks if a version is allowed for the view.
        is_deprecated(version: str): Checks if a version is deprecated for the view.
        is_active(version: str): Checks if a version is active for the view.
    """

    def __init__(self,
                 min_version: str = None,
                 max_version: str = None,
                 deprecated_in: str = None):
        self.min_version: str = min_version or settings.AVAILABLE_VERSIONS[0]
        self.max_version: str = max_version
        self.deprecated_in: str = deprecated_in
        versions, allowed_versions, deprecated_versions = (
            get_versions(self.min_version, self.max_version, self.deprecated_in))
        # All versions that are available for view
        self.versions: List[str] = versions
        # Versions that are allowed for view and not deprecated
        self.allowed_versions: List[str] = allowed_versions
        # Versions that are deprecated
        self.deprecated_versions: List[str] = deprecated_versions

    def is_allowed(self, version: str):
        return version in self.allowed_versions

    def is_deprecated(self, version: str):
        return version in self.deprecated_versions

    def is_active(self, version: str):
        return version in self.versions

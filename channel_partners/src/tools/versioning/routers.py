from typing import Dict

from django.urls import (
    path,
    re_path,
)
from rest_framework.viewsets import GenericViewSet
from rest_framework_extensions.routers import ExtendedSimpleRouter


class VersionRouterMixin:

    def get_versioned_urls(self, version) -> list:
        """
        Use the registered viewsets to generate a list of URL patterns.
        """
        ret = []

        for prefix, viewset, basename in self.registry:
            lookup = self.get_lookup_regex(viewset)
            routes = self.get_routes(viewset)

            for route in routes:

                # Only actions which actually exist on the viewset will be bound
                mapping = self.get_versioned_method_map(viewset, route.mapping, version)
                if not mapping:
                    continue

                # Build the url pattern
                regex = route.url.format(
                    prefix=prefix,
                    lookup=lookup,
                    trailing_slash=self.trailing_slash
                )

                # If there is no prefix, the first part of the url is probably
                #   controlled by project's urls.py and the router is in an app,
                #   so a slash in the beginning will (A) cause Django to give
                #   warnings and (B) generate URLS that will require using '//'.
                if not prefix:
                    if self._url_conf is path:
                        if regex[0] == '/':
                            regex = regex[1:]
                    elif regex[:2] == '^/':
                        regex = '^' + regex[2:]

                initkwargs = route.initkwargs.copy()
                initkwargs.update({
                    'basename': basename,
                    'detail': route.detail,
                })

                view = viewset.as_view(mapping, **initkwargs)
                name = route.name.format(basename=basename)
                ret.append(re_path(regex, view, name=name))

        return ret

    def get_versioned_method_map(self,
                                 viewset: GenericViewSet,
                                 method_map: Dict[str, str],
                                 version: str) -> Dict[str, str]:
        """
        Given a viewset, and a mapping of http methods to actions,
        return a new mapping which only includes any mappings that
        are actually implemented by the viewset and available in a
        version.
        Filter is applied to default actions only. URL list must
        be filtered by version_include.
        """
        bound_methods = {}
        actions_versions = getattr(viewset, 'actions_versions', None) or {}
        for method, action in method_map.items():
            if getattr(viewset, action, None):
                action_version = actions_versions.get(action, None)
                if not action_version or version in getattr(action_version, 'versions', []):
                    bound_methods[method] = action
        return bound_methods


class VersionedRouter(VersionRouterMixin, ExtendedSimpleRouter):
    pass

from typing import (
    List,
    Tuple,
)

from django.apps import apps
from django.core.cache import caches
from django.db import models

from partners.utils.cache_keys import get_version_cache_key


class PathCacheMixin(models.Model):
    class Meta:
        abstract = True

    """
    This mixin is used to add functionality for managing the path version of an instance.
    The path version is a list of tuples, where each tuple contains a model name and an id.
    The path version represents the full path to the root in the format: [(model, id), (model, id), ...]
    """

    def get_cached_path(self) -> List[Tuple[str, str]]:
        from partners.services.cache_service import CacheService

        """
        This method retrieves the path version from the cache.
        If the path version is not found in the cache, it is generated using the _build_path_for_systems method
        and then stored in the cache.
        """
        # This shows a warning because FieldChoiceEnum is not imported
        cache = caches["dependent_cache"]
        cache_key: str = get_version_cache_key(self.__class__, self.id, "path")
        path_version = cache.get(cache_key)
        if path_version is None:
            timestamp = CacheService.timestamp()
            self.refresh_from_db()
            if self.__class__.__name__ in ['SystemGroup', 'CloudSystemId']:
                path_version = self.systems_path
            else:
                path_version = self.build_path
            CacheService.set(timestamp, cache_key, path_version)
        return path_version

    def update_cached_path(self) -> None:
        from partners.services.cache_service import CacheService

        """
        This method updates the path version in the cache.
        """
        timestamp = CacheService.timestamp()
        cache_key: str = get_version_cache_key(self.__class__, self.id, "path")
        if self.__class__.__name__ in ['SystemGroup', 'CloudSystemId']:
            path_version = self.systems_path
        else:
            path_version = self.build_path
        CacheService.set(timestamp, cache_key, path_version)

    @property
    def build_path(self) -> List[List[str]]:
        """
        This method builds the path version for the instance.
        The path version is a list of tuples, where each tuple contains a model name and an id.
        """
        path = []
        for id in self.path:
            segment = ['ChannelPartner', str(id)]
            path.append(segment)
        return path

    @property
    def systems_path(self) -> List[List[str]]:
        """
        This method builds the path version for the instance.
        The path version is a list of tuples, where each tuple contains a model name and an id.
        """
        path = []
        model = 'SystemGroup'
        for id in self.path:
            if id == self.organization_id:
                segment = ['Organization', str(id)]
                path.append(segment)
                model = 'ChannelPartner'
            else:
                segment = [model, str(id)]
                path.append(segment)
        return path

    @property
    def systems_path_version_keys(self) -> List['VersionKey']:
        """
        This method builds the path version for the instance.
        """
        from partners.services.cache_service import VersionKey

        path = []
        model = 'SystemGroup'

        for id in self.path:
            if id == self.organization_id:
                path.append(VersionKey(model=apps.get_model('partners', 'Organization'), id=str(id)))
                model = 'ChannelPartner'
            else:
                path.append(VersionKey(model=apps.get_model('partners', model), id=str(id)))
        return path

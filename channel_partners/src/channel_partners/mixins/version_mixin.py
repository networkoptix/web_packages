from typing import (
    List,
    Union,
)
from uuid import UUID

from django.core.cache import caches
from django.db import (
    models,
    transaction,
)
from django.db.models import F

from partners.utils.cache_keys import get_version_cache_key


class VersionMixin(models.Model):
    version = models.PositiveBigIntegerField(default=0)

    class Meta:
        abstract = True

    def get_version(self) -> int:
        from partners.services.cache_service import CacheService

        cache = caches["dependent_cache"]
        cache_key = get_version_cache_key(self.__class__, self.id, "version")
        version = cache.get(cache_key)
        if version is None:
            version = self.version
            CacheService.set(cache_key, version)
        return version

    @transaction.atomic
    def set_version(self, version: int) -> None:
        from partners.services.cache_service import CacheService

        self.version = version
        (self.__class__.objects.select_for_update()
         .filter(id=self.id)
         .update(version=version))
        # This shows a warning because FieldChoiceEnum is not imported
        cache_key = get_version_cache_key(self.__class__, self.id, "version")
        CacheService().set(cache_key, version)

    @classmethod
    @transaction.atomic
    def increment_version_by_id(cls, id: Union[str, UUID]) -> None:
        from partners.services.cache_service import CacheService

        cache_key = get_version_cache_key(cls, id, "version")
        (cls.objects.select_for_update()
         .filter(id=id)
         .update(version=F('version') + 1))
        updated_instance = cls.objects.get(id=id)
        CacheService.set(cache_key, updated_instance.version)

    def increment_version(self):
        from partners.services.cache_service import CacheService

        # This shows a warning because FieldChoiceEnum is not imported
        cache_key = get_version_cache_key(self.__class__, self.id, "version")
        with transaction.atomic():
            (self.__class__.objects.select_for_update()
             .filter(id=self.id)
             .update(version=F('version') + 1))
            updated_instance = self.__class__.objects.get(id=self.id)
            CacheService.set(cache_key, updated_instance.version)

    @staticmethod
    @transaction.atomic
    def increment_version_bulk(cls, ids: List[Union[str, UUID]]) -> None:
        from partners.services.cache_service import CacheService

        if not ids:
            return

        # Increment the version for all instances
        (cls.objects.select_for_update()
         .filter(id__in=ids)
         .update(version=F('version') + 1))

        updated_instances = cls.objects.only("id", "version").in_bulk(ids)
        # Generate the cache data
        cache_data = {
            get_version_cache_key(cls, instance.id, "version"): instance.version
            for instance in updated_instances.values()
        }
        # Set the cache data
        CacheService.set_many(cache_data)

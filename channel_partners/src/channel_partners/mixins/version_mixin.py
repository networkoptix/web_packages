from typing import (
    List,
    Union,
)
from uuid import UUID

import structlog
from django.core.cache import caches
from django.db import (
    models,
    transaction,
)
from django.db.models import F

from partners.utils.cache_keys import get_version_cache_key


logger = structlog.getLogger()


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
            timestamp = CacheService.timestamp()
            self.refresh_from_db(fields=["version"])
            version = self.version
            CacheService.set(timestamp, cache_key, version)
        return version

    @classmethod
    @transaction.atomic
    def increment_version_by_id(cls, id: Union[str, UUID, int]) -> None:
        from partners.services.cache_service import CacheService

        try:
            # Get the timestamp before the database operation
            timestamp = CacheService.timestamp()
            cache_key = get_version_cache_key(cls, id, "version")

            # Perform the database operation
            (cls.objects.select_for_update()
             .filter(id=id)
             .update(version=F('version') + 1))
            updated_instance = cls.objects.get(id=id)

            # Update the cache with the new version and the previously retrieved timestamp
            CacheService.set(timestamp, cache_key, updated_instance.version)
        except Exception as e:
            logger.error("Error incrementing version", id=id, model=cls.__class__.__name__, error=str(e), exc_info=True)

    @transaction.atomic
    def increment_version(self):
        from partners.services.cache_service import CacheService

        try:
            # Get the timestamp before the database operation
            timestamp = CacheService.timestamp()
            # This shows a warning because FieldChoiceEnum is not imported
            cache_key = get_version_cache_key(self.__class__, self.id, "version")

            # Perform the database operation
            (self.__class__.objects.select_for_update()
             .filter(id=self.id)
             .update(version=F('version') + 1))
            updated_instance = self.__class__.objects.get(id=self.id)

            # Update the cache with the new version and the previously retrieved timestamp
            CacheService.set(timestamp, cache_key, updated_instance.version)
        except Exception as e:
            logger.error("Error incrementing version", id=self.id, model=self.__class__.__name__, error=str(e), exc_info=True)

    @classmethod
    @transaction.atomic
    def increment_version_bulk(cls, ids: List[Union[str, UUID, int]]) -> None:
        from partners.services.cache_service import CacheService

        try:
            if not ids: return

            timestamp = CacheService.timestamp()
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
            CacheService.set_many(timestamp, cache_data)
        except Exception as e:
            logger.error("Error incrementing version in bulk", ids=ids, model=cls.__name__, error=str(e), exc_info=True)

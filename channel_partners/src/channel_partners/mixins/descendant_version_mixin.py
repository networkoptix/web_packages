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


class DescendantVersionMixin(models.Model):
    descendant_version = models.PositiveBigIntegerField(default=0)

    class Meta:
        abstract = True

    def get_descendant_version(self) -> int:
        from partners.services.cache_service import CacheService
        try:
            # This shows a warning because FieldChoiceEnum is not imported
            cache = caches["dependent_cache"]
            cache_key = get_version_cache_key(self.__class__, self.id, "descendant_version")
            version = cache.get(cache_key)
            if version is None:
                timestamp = CacheService.timestamp()
                self.refresh_from_db(fields=["descendant_version"])
                version = self.descendant_version
                CacheService.set(timestamp, cache_key, version)
            return version
        except Exception as e:
            logger.error(
                "Error getting descendant_version",
                id=self.id,
                model=self.__class__.__name__,
                error=str(e))

    @classmethod
    @transaction.atomic
    def increment_descendant_version_by_id(cls, id: Union[str, UUID, int]) -> None:
        from partners.services.cache_service import CacheService

        try:
            timestamp = CacheService.timestamp()
            cache_key = get_version_cache_key(cls, id, "descendant_version")
            (cls.objects.select_for_update()
             .filter(id=id)
             .update(descendant_version=F('descendant_version') + 1))

            updated_instance = cls.objects.only("descendant_version").get(id=id)
            CacheService.set(timestamp, cache_key, updated_instance.descendant_version)
        except Exception as e:
            logger.error(
                "Error incrementing descendant_version",
                id=id,
                model=cls.__class__.__name__,
                error=str(e))

    @transaction.atomic
    def increment_descendant_version(self):
        from partners.services.cache_service import CacheService

        try:
            timestamp = CacheService.timestamp()
            # This shows a warning because FieldChoiceEnum is not imported
            cache_key = get_version_cache_key(self.__class__, self.id, "descendant_version")

            (self.__class__.objects.select_for_update()
             .filter(id=self.id)
             .update(descendant_version=F('descendant_version') + 1))

            updated_instance = self.__class__.objects.only("descendant_version").get(id=self.id)
            CacheService.set(timestamp, cache_key, updated_instance.descendant_version)
        except Exception as e:
            logger.error(
                "Error incrementing descendant_version",
                id=self.id,
                model=self.__class__.__name__,
                error=str(e))

    @classmethod
    @transaction.atomic
    def increment_descendant_version_bulk(cls, ids: List[Union[str, UUID, int]]) -> None:
        from partners.services.cache_service import CacheService

        try:
            if not ids: return

            timestamp = CacheService.timestamp()
            # Increment the descendant_version for all instances
            (cls.objects.select_for_update()
             .filter(id__in=ids)
             .update(descendant_version=F('descendant_version') + 1))

            updated_instances = cls.objects.only("id", "descendant_version").in_bulk(ids)
            # Generate the cache data
            cache_data = {
                get_version_cache_key(cls, instance.id, "descendant_version"): instance.descendant_version
                for instance in updated_instances.values()
            }
            # Set the cache data
            CacheService.set_many(timestamp, cache_data)
        except Exception as e:
            logger.error(
                "Error incrementing descendant_version",
                ids=ids,
                model=cls.__class__.__name__,
                error=str(e))

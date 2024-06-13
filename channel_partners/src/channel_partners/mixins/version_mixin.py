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
        cache = caches["dependent_cache"]
        cache_key = get_version_cache_key(self.__class__, self.id, "version")
        version = cache.get(cache_key)
        if version is None:
            version = self.version
            cache.set(cache_key, version)
        return version

    @transaction.atomic
    def set_version(self, version: int) -> None:
        cache = caches["dependent_cache"]
        self.version = version
        self.__class__.objects.filter(id=self.id).update(version=version)
        # This shows a warning because FieldChoiceEnum is not imported
        cache_key = get_version_cache_key(self.__class__, self.id, "version")
        cache.set(cache_key, None)

    @classmethod
    @transaction.atomic
    def increment_version_by_id(cls, id: Union[str, UUID]) -> None:
        cache = caches["dependent_cache"]
        cache_key = get_version_cache_key(cls, id, "version")
        cls.objects.filter(id=id).update(version=F('version') + 1)

        cache.set(cache_key, None)

    def increment_version(self):
        cache = caches["dependent_cache"]
        # This shows a warning because FieldChoiceEnum is not imported
        cache_key = get_version_cache_key(self.__class__, self.id, "version")
        with transaction.atomic():
            self.__class__.objects.filter(id=self.id).update(version=F('version') + 1)
            cache.set(cache_key, None)

    @staticmethod
    @transaction.atomic
    def increment_version_bulk(cls, ids: List[Union[str, UUID]]) -> None:
        if not ids:
            return

        cache = caches["dependent_cache"]
        # Increment the version for all instances
        cls.objects.filter(id__in=ids).update(version=F('version') + 1)
        # Generate the cache data
        cache_data = {
            get_version_cache_key(cls, id, "version"): None
            for id in ids
        }
        # Set the cache data
        cache.set_many(cache_data)

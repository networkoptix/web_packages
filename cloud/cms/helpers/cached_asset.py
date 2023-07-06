import asyncio
from logging import getLogger
from time import sleep
from uuid import uuid4

from asgiref.sync import sync_to_async, async_to_sync
from celery import shared_task
from django.conf import settings
from django.core.cache import caches

from cms.serializers import AssetSerializer
from cloud.customization_context import customization_ctx

logger = getLogger(__name__)


class AssetCacheLoaderBase:
    cache = caches["assets_values"]

    def __init__(self, asset, version_id=None, language=None, datastructure=None,
                 customization_name=None, request=None):
        self.asset = asset
        self.customization_name = customization_name
        self.request = request
        self.language = language
        self.language_code = getattr(language, 'code', None)
        self.datastructure = datastructure
        self.version_id = version_id

    @staticmethod
    def generate_hash_key(asset_id, version_id=None):
        """
        Generates hash key based on asset id and version id.
        Args:
            asset_id (int|str, required): asset id
            version_id (int|str, optional): version id

        Returns:

        """
        return f'asset-values-{asset_id}-{version_id}-{settings.STRUCTURES_HASH}'

    @property
    def hash_key(self):
        return self.generate_hash_key(self.asset.id, self.version_id)

    @staticmethod
    def generate_field_key(customization_name, language_code, datastructure_id, request_customization=None):
        """
        Generates key for hash field
        Args:
            customization_name (int|str, required): customization name argument which passed to find_actual_value(s)
            language_code (int|str, required): value language code
            datastructure_id (int|str, required): value datastructure id
            request_customization (int|str, optional): customization from hostname, default customization_ctx value

        Returns: str

        """
        return f'{request_customization or customization_ctx.get()}-' \
               f'{customization_name}-{language_code}-{datastructure_id}'

    @property
    def field_key(self):
        """
        '{customization from hostname}-{requested customization_name}-{language_code}-{datastructure.id}'
        customization from hostname - used to determine from what customization value is requested.
        requested customization_name - argument passed to find_actual_value.
        language - Language can be None. But key generated like requested.
        """
        return f'{customization_ctx.get()}-{self.customization_name}-{self.language_code}-{self.datastructure.id}'

    async def save_data_to_cache_async(self, data):
        await self.cache.ahset(self.hash_key, self.field_key, data)

    def save_data_to_cache(self, data):
        self.cache.hset(self.hash_key, self.field_key, data)

    def get_actual_value(self):
        data = self.datastructure.find_actual_value(asset=self.asset, language=self.language,
                                                    version_id=self.version_id, use_cached=False,
                                                    customization_name=self.customization_name)
        self.save_data_to_cache(data)
        return data

    def clear_asset_version_values(self):
        self.cache.delete(self.hash_key)

    def get_value(self, request_db=False):
        if not (data := self.cache.hget(self.hash_key, self.field_key)) and request_db:
            return self.get_actual_value()
        return data

    @classmethod
    def get_values(cls, asset, datastructures, version_id=None,
                   language=None, customization_name=None, request_db=False):
        data = {}
        loader = cls(asset, version_id=version_id, language=language, customization_name=customization_name)
        for ds in datastructures:
            loader.datastructure = ds
            value = loader.get_value(request_db=request_db)
            if value is not None:
                data[ds] = value
        return data


    @classmethod
    def invalidate_all_latest_values(cls):
        """
        Deletes all latest values for all assets
        """
        lookup_key = cls.generate_hash_key('*', None)
        keys = cls.cache.keys(lookup_key)
        if keys:
            cls.cache.delete(*keys)

    @classmethod
    def invalidate_asset_latest_values(cls, asset):
        """
        Deletes all latest accepted asset's values
        Args:
            asset: asset id
        """
        loader = cls(asset=asset)
        loader.cache.delete(loader.hash_key)

    @classmethod
    def invalidate_asset_version_values(cls, asset, version_id):
        """
        Deletes all latest accepted asset's values
        Args:
            asset: asset id
            version_id: version id
        """
        loader = cls(asset=asset, version_id=version_id)
        loader.cache.delete(loader.hash_key)

    @classmethod
    def invalidate_all_asset_values(cls, asset):
        """
        Deletes all stored asset's values for all versions
        Args:
            asset: asset to delete values for
        """
        lookup_key = cls.generate_hash_key(asset.id, '*')
        keys = cls.cache.keys(lookup_key)
        if keys:
            cls.cache.delete_many(*keys)

    @classmethod
    def clear_values_by_keys(cls, asset_id="*", datastructure_id="*", version_id="*", language_code="*",
                             customization_name="*", request_customization=None):
        """
        Deletes all values fields in all hashes which satisfy given search keys.
        Note! Using without defined params leads to deletion of all values
        Args:
            asset_id: asset id, a hash key param, must be integer or '*' to match all assets, default '*'
            datastructure_id: datastructure id, a hash key param, must be integer or '*' to match all ds,
             default '*'
            version_id: version id, a field key param, must be integer or '*' to match all versions or None
             to match latest, default '*'
            language_code: language code, a field key param, must be str or '*' to match all languages or None
             to match requested without language, default '*'
            customization_name: language code, a field key param, must be str or '*' to match all customizations or
             None to match requested without customization, default '*'
            request_customization: customization from hostname, must be str or '*' to match all customizations or
             None to use customization from customization_ctx, default None

        """
        lookup_hash_key = cls.generate_hash_key(asset_id, version_id)
        lookup_field_key = cls.generate_field_key(customization_name, language_code, datastructure_id,
                                                  request_customization=request_customization)
        hashes_keys = cls.cache.keys(lookup_hash_key)
        for hk in hashes_keys:
            cursor = 0
            while True:
                cursor, ret = cls.cache.hscan(hk, cursor=cursor, match=lookup_field_key, count=200)
                if not ret:
                    break
                keys = list(ret.keys())
                cls.cache.hdel(hk, *keys)

    @classmethod
    def invalidate_changed_ds(cls, data_structure):
        """
        Invalidates caches of all values of a given data structure
        for all assets, customization and languages, for all hostnames customizations.
        Args:
            data_structure: data structure
        """
        cls.clear_values_by_keys(datastructure_id=data_structure.id, request_customization='*')

    @classmethod
    def invalidate_changed_dr(cls, data_record):
        """
        Invalidates caches of all values of a given data record for related asset.
        Values will be deleted for all languages, if customization is not set for data record
        then values will be deleted for all customization.
        Args:
            data_record: data record
        """
        asset_id = data_record.asset_id
        data_structure_id = data_record.data_structure_id
        customization = '*'
        cls.clear_values_by_keys(asset_id=asset_id, datastructure_id=data_structure_id,
                                 customization_name=customization,
                                 request_customization='*')





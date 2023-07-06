from uuid import uuid4

import pytest
from asgiref.sync import sync_to_async, async_to_sync
from django.conf import settings
from django.core.cache import caches

from cloud.customization_context import customization_ctx
from cms.helpers.cached_asset import AssetCacheLoaderBase
from cms.models import Language, Context, get_cloud_portal_asset, DataStructure, AssetCustomizationReview


class TestAssetCacheLoader:
    @pytest.fixture(autouse=True)
    def setup(self, db, default_customization, default_portal):
        self.asset = default_portal
        self.customization = default_customization
        customization_ctx.set(settings.TEST_CUSTOMIZATION)
        self.eng = Language.objects.get_or_create(name='English', code='en_US')[0]
        self.data_structures = DataStructure.objects.filter(context__asset_type=self.asset.asset_type)
        self.values_versioned = self.get_versioned_values(use_cached=True)
        self.values_latest = self.get_values(use_cached=True)
        self.ds_0 = self.data_structures[0]
        self.loader_versioned = AssetCacheLoaderBase(asset=self.asset, datastructure=self.ds_0,
                                                version_id=self.asset.version_id(), language=self.eng,
                                                customization_name=self.customization.name)
        self.loader_latest = AssetCacheLoaderBase(asset=self.asset, datastructure=self.ds_0)
        self.ds_value_latest = self.loader_latest.get_value()
        self.ds_value_versioned = self.loader_versioned.get_value()
        self.file_types = [DataStructure.DATA_TYPES.file, DataStructure.DATA_TYPES.image]

    def get_contexts_ids(self):
        contexts = Context.objects.filter(asset_type=self.asset.asset_type).values_list("id", flat=True)
        return sorted(contexts)

    def get_values(self, version=None, language=None, customization=None, use_cached=False):
        values = DataStructure.find_actual_values(
            data_structures=self.data_structures, asset=self.asset, version_id=version,
            language=language, customization_name=customization, use_cached=use_cached)
        return values

    def get_versioned_values(self, use_cached=False):
        return self.get_values(version=self.asset.version_id(), language=self.eng,
                               customization=self.customization.name, use_cached=use_cached)

    @staticmethod
    def filter_file_values(values: dict):
        file_types = [DataStructure.DATA_TYPES.file, DataStructure.DATA_TYPES.image]
        return {k: v for k, v in values.items() if k.type not in file_types}

    def test_caching(self):

        assert self.ds_value_latest is not None
        assert self.ds_value_versioned is not None
        assert self.ds_value_versioned == self.ds_value_latest

        cached_values_versioned = AssetCacheLoaderBase.get_values(asset=self.asset, datastructures=self.data_structures,
                                                                  version_id=self.asset.version_id(), language=self.eng,
                                                                  customization_name=self.customization.name)
        cached_values_latest = AssetCacheLoaderBase.get_values(asset=self.asset, datastructures=self.data_structures,
                                                               version_id=self.asset.version_id(), language=self.eng,
                                                               customization_name=self.customization.name)
        # If find_actual_value(s) is used, it returns files dr from db. Files DR is not cached
        assert set(cached_values_latest.keys()) == {ds for ds in self.data_structures if ds.type not in self.file_types}
        assert self.filter_file_values(cached_values_latest) == self.filter_file_values(self.values_latest)
        assert self.filter_file_values(cached_values_versioned) == self.filter_file_values(self.values_versioned)
        values_versioned = self.get_values(version=self.asset.version_id(), language=self.eng,
                                           customization=self.customization.name, use_cached=True)
        values_latest = self.get_values(use_cached=True)
        assert self.filter_file_values(cached_values_latest) == self.filter_file_values(self.values_latest)
        assert self.filter_file_values(cached_values_versioned) == self.filter_file_values(self.values_versioned)

    def test_clear_values_by_keys(self):
        AssetCacheLoaderBase.clear_values_by_keys(asset_id=self.asset.id, datastructure_id=self.ds_0.id)
        assert self.loader_versioned.get_value() is None
        assert self.loader_latest.get_value() is None

    def test_clear_asset_latest_values(self):
        hash_key = self.loader_latest.hash_key
        assert caches["assets_values"].keys(hash_key)
        AssetCacheLoaderBase.invalidate_asset_latest_values(self.asset)
        assert not caches["assets_values"].keys(hash_key)

    def test_single_values(self, record_factory, review_factory):
        value = f'changed_value-{uuid4()}'
        record = record_factory(ds=self.ds_0, asset=self.asset, customization=self.customization, value=value)
        review = review_factory(version=record.version, customization=self.customization,
                                state=AssetCustomizationReview.REVIEW_STATES.accepted)
        rev_version = review.version_id
        self.loader_versioned.version_id = rev_version
        values = self.get_versioned_values()
        assert values[self.ds_0] == value
        assert self.loader_versioned.get_value() == value
        assert self.loader_latest.get_value() is None
        latest_values = self.get_values()
        assert self.loader_latest.get_value() == value

    def test_get_value_with_db(self, record_factory, review_factory):
        value = f'changed_value-{uuid4()}'
        record = record_factory(ds=self.ds_0, asset=self.asset, customization=self.customization, value=value)
        review = review_factory(version=record.version, customization=self.customization,
                                state=AssetCustomizationReview.REVIEW_STATES.accepted)
        assert self.loader_latest.get_value(request_db=True) == value

    def test_get_values_with_db(self, record_factory, review_factory):
        value = f'changed_value-{uuid4()}'
        record = record_factory(ds=self.ds_0, asset=self.asset, customization=self.customization, value=value)
        review = review_factory(version=record.version, customization=self.customization,
                                state=AssetCustomizationReview.REVIEW_STATES.accepted)
        self.values_latest[self.ds_0] = value
        assert AssetCacheLoaderBase.get_values(
            asset=self.asset, datastructures=self.data_structures, request_db=True) == self.values_latest


    def test_invalidation(self, record_factory, review_factory):
        assert caches["assets_values"].keys(self.loader_latest.hash_key)
        assert caches["assets_values"].keys(self.loader_versioned.hash_key)
        assert self.loader_latest.get_value() is not None
        assert self.loader_versioned.get_value() is not None

        value = f'changed_value-{uuid4()}'
        record = record_factory(ds=self.ds_0, asset=self.asset, customization=self.customization, value=value)
        # record has been created - all values for this data structure must be invalidated
        assert self.loader_latest.get_value() is None
        assert self.loader_versioned.get_value() is None

        review = review_factory(version=record.version, customization=self.customization)
        # review has been created in pending status, not changes
        assert caches["assets_values"].keys(self.loader_latest.hash_key)
        assert caches["assets_values"].keys(self.loader_versioned.hash_key)

        review.state = review.REVIEW_STATES.accepted
        review.save()
        # review has been saved within accepted state latest values must be invalidated
        assert not caches["assets_values"].keys(self.loader_latest.hash_key)
        assert caches["assets_values"].keys(self.loader_versioned.hash_key)

        # fill caches,
        self.get_values()
        self.get_values(version=self.asset.version_id())
        assert len(caches["assets_values"].keys('*')) == 3
        assert self.loader_latest.get_value() == value

        ds_1 = self.data_structures[1]
        ds_1.default = '1'
        ds_1.save()
        # data structure is saved, all values for this ds must be deleted
        keys = caches["assets_values"].keys('*')
        assert len(keys) == 3
        for key in keys:
            assert caches["assets_values"].hget(
                key, AssetCacheLoaderBase.generate_field_key('*', '*', ds_1.id, '*')
            ) is None

        rev_version = review.version_id
        review.delete()
        # review is deleted must left the only cached asset
        assert not caches["assets_values"].keys(self.loader_latest.hash_key)
        assert caches["assets_values"].keys(self.loader_versioned.hash_key)
        assert not caches["assets_values"].keys(AssetCacheLoaderBase.generate_hash_key(self.asset.id, rev_version))









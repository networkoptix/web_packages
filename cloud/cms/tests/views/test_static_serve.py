import base64

import pytest
from asgiref.sync import sync_to_async, async_to_sync
from django.db import transaction
from model_bakery import baker
from datetime import datetime
from cms.controllers.static_files import load_structure, get_customizable_static
from cms.models import Asset, AssetType, Context, DataStructure, DataRecord, ContentVersion, AssetCustomizationReview
from cms.views.static_serve import customizable_files
from conftest import get_asset_type, get_context_datastructure_by_name, get_asset_context_by_name, \
    create_record_with_review


class TestStaticServe:
    @pytest.fixture(autouse=True)
    def setup(self, db, default_customization, default_portal):
        self.customization = default_customization
        self.asset_type = get_asset_type(AssetType.ASSET_TYPES.cloud_portal)
        self.cloud_portal = default_portal

    def create_structures(self, set_value=None):
        data = []
        for ctx in load_structure()["contexts"]:
            context = get_asset_context_by_name(name=ctx["name"], asset=self.cloud_portal)
            for ctx_value in ctx.get("values", []):
                if ctx_value["type"] not in ("file", "image"):
                    continue
                ds = get_context_datastructure_by_name(context=context, name=ctx_value["name"],
                                                       default=ctx_value.get("value"))
                dr_value = set_value or ''
                record, review = create_record_with_review(asset=self.cloud_portal,context=context, ds_name=ds.name,
                                                           value=dr_value,
                                                           customization=self.customization)
                ctx_value.update(dr_id=record.id, ds_id=ds.id, asset_id=self.cloud_portal.id)
                data.append(ctx_value)
        return data

    def test_default_values(self, arf, mocker):
        preloaded = self.create_structures()
        mocker.patch('cms.views.static_serve.is_db_static_enabled', return_value=True)
        for structure in preloaded:
            request = arf.get(f'/{structure["name"]}')
            data = async_to_sync(get_customizable_static)(self.customization.name, f'{structure["name"]}')
            ds = DataStructure.objects.get(id=structure["ds_id"])
            assert data == base64.b64decode(ds.default)
            resp = async_to_sync(customizable_files)(request)
            assert resp.content == base64.b64decode(ds.default)

    def test_custom_values(self, arf, mocker):
        test_val = b'test value'
        with transaction.atomic():
            preloaded = self.create_structures(set_value=base64.b64encode(test_val).decode())
        mocker.patch('cms.views.static_serve.is_db_static_enabled', return_value=True)
        for structure in preloaded:
            request = arf.get(f'/{structure["name"]}')
            data = async_to_sync(get_customizable_static)(self.customization.name, f'{structure["name"]}')
            assert data == test_val
            resp = async_to_sync(customizable_files)(request)
            assert resp.content == test_val


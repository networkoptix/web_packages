import base64
import os
import random
import re
from datetime import datetime
from random import randint
from uuid import uuid4

import boto3
import pytest
from asgiref.sync import async_to_sync
from django.conf import settings
from django.core.cache import caches
from django.db import transaction
from model_bakery import baker
from moto import mock_s3

from cloud.customization_context import customization_ctx
from cloud.storage_backend import MediaStorage
from cms.management.commands.readstructure import read_languages, read_structure
from cms.models import ContextTemplate, AssetType, Language, ContentVersion, AssetCustomizationReview, Context, \
    DataStructure, DataRecord, ExternalFile
from cms.controllers.static_files import get_template, read_customized_db_file, StaticFileNotFound, load_structure, \
    convert_structures_in_customization, get_new_name, get_old_name
from cms.controllers import filldata, structure
from conftest import get_asset_type, get_asset_context_by_name, get_context_datastructure_by_name, \
    create_record_with_review


def get_filename(filename, lang=None):
    if not lang:
        return os.path.join(settings.BASE_DIR, 'static', settings.TEST_CUSTOMIZATION, 'static', filename)
    return os.path.join(settings.BASE_DIR, 'static', settings.TEST_CUSTOMIZATION, 'static', f'lang_{lang}', filename)


def get_files():
    templates = ContextTemplate.objects\
        .filter(context__asset_type__type=AssetType.ASSET_TYPES.cloud_portal,
                context__file_path__isnull=False)\
        .exclude(context__file_path__startswith='templates/')
    return [(template.context.file_path, template.language) for template in templates]


def read_struct(portal):
    read_languages(settings.DEFAULT_SKIN)
    customization = settings.TEST_CUSTOMIZATION
    if not customization_ctx.get():
        customization_ctx.set(customization)
    def_customization = portal.customizations.first()
    def_customization.default_language=Language.by_code('en_US')
    if not def_customization.languages.filter(code='en_US').exists():
        def_customization.languages.add(Language.by_code('en_US'))
    if not def_customization.languages.filter(code='es_ES').exists():
        def_customization.languages.add(Language.by_code('es_ES'))
    def_customization.save()
    asset_type = AssetType.get_type_by_name('cloud_portal')
    structure.read_structure_json()
    read_structure(asset_type)
    structure.read_menu_structure('cms/menus.json')


class TestTemplate:
    @pytest.fixture(autouse=True)
    def setup(self, default_portal, default_customization, superuser):
        if not settings.LOCAL_ENVIRONMENT:
            return
        customization_ctx.set(settings.TEST_CUSTOMIZATION)
        caches['templates'].clear()
        accepted_date = datetime.now()
        read_struct(default_portal)
        version = baker.make(
            ContentVersion, asset=default_portal,
            customization=default_customization,
            accepted_date=accepted_date)

        review = baker.make(AssetCustomizationReview,
                            customization=default_customization, version=version)

        review.update_state(user=superuser, state=AssetCustomizationReview.REVIEW_STATES.accepted)
        filldata.init_skin(default_portal, False, workers=1, management=True)
        self.templates = get_files()

    @pytest.mark.skip(reason="Test can be run locally only and probably useless.")
    def test_get_template(self, superuser, default_portal, default_customization, arf, mocker):
        request = arf.get('/')
        accepted_date = datetime.now()
        skin = 'blue'
        mocker.patch('cms.models.Asset.read_global_value', return_value=skin)
        version = baker.make(
            ContentVersion, asset=default_portal,
            customization=default_customization,
            accepted_date=accepted_date)

        review = baker.make(AssetCustomizationReview,
                            customization=default_customization, version=version)

        review.update_state(user=superuser, state=AssetCustomizationReview.REVIEW_STATES.accepted)
        assert len(self.templates) > 0
        for ctx_file_path, language in self.templates:
            filename = ctx_file_path.replace('static/', '').replace('lang_{{language}}/', '')
            lang_code = getattr(language, 'code', None)
            with open(get_filename(filename, lang=lang_code), 'r') as f:
                filldata_file = f.read()

            file_from_db = async_to_sync(get_template)(request, ctx_file_path, language_code=lang_code)
            file_from_cache = async_to_sync(get_template)(request, ctx_file_path, language_code=lang_code)

            assert filldata_file == file_from_db
            assert filldata_file == file_from_cache


def test_read_customized_db_file(mocker, default_portal):
    mock_file = f'{uuid4()}'
    filename = f'templates/lang_{{{{language}}}}/{uuid4()}.mustache'
    customization_name = settings.TEST_CUSTOMIZATION
    language_code = 'en_US'
    version_id = randint(1000, 2000)
    skin = 'blue'

    def read_file():
        return read_customized_db_file(default_portal, customization_name, filename, language_code, skin, version_id)

    # test exception on non existing file
    err = None
    try:
        read_file()
    except Exception as ex:
        err = ex
    assert isinstance(err, StaticFileNotFound)

    #  test data structure file default value
    context = baker.make(Context, name='test', file_path='test data structure',
                         asset_type=default_portal.asset_type)

    ds = baker.make(DataStructure, name=filename, context=context,
                    type=DataStructure.DATA_TYPES.text, default=mock_file)

    assert read_file() == base64.b64decode(mock_file)

    # test context processed value
    mock_file_ctx = f'{uuid4()}'
    context = baker.make(Context, name='test', file_path=filename, asset_type=default_portal.asset_type)
    mock_process_context = mocker.patch('cms.controllers.filldata.ContextProcessor.process_context',
                                        return_value=mock_file_ctx)

    assert read_file() == mock_file_ctx


class TestS3Static:
    @pytest.fixture(autouse=True)
    def setup(self, db, arf, default_portal, default_customization):
        self.customization = default_customization
        self.asset_type = get_asset_type(AssetType.ASSET_TYPES.cloud_portal)
        self.cloud_portal = default_portal

    def fill_records(self):
        structs = load_structure()
        values = [
            ("empty", ""),
            ("custom_value", base64.b64encode(b'custom_value').decode()),
        ]

        def get_random_value():
            if random.choice([1,0]):
                return base64.b64encode(uuid4().bytes).decode()
            return ''

        preloaded_data = []
        for ctx in structs['contexts']:
            context = get_asset_context_by_name(
                asset=self.cloud_portal, name=ctx["name"], asset_type=self.cloud_portal.asset_type
            )
            for ctx_value in ctx.get("values", []):
                # Create new structures if not exist
                if ctx_value.get("type") in ('external_image', 'external_file'):
                    ds = get_context_datastructure_by_name(
                        context=context, name=ctx_value["name"], default=ctx_value.get("value", ""),
                        type=getattr(DataStructure.DATA_TYPES, ctx_value["type"]),
                    )
                # Create old type structures and records
                if ctx_value.get("type") not in ('image', 'file'):
                    continue
                ds = get_context_datastructure_by_name(
                    context=context, name=ctx_value["name"], default=ctx_value.get("value", ""),
                    type=getattr(DataStructure.DATA_TYPES, ctx_value["type"]),
                )
                saved_value = get_random_value()

                dr = baker.make(DataRecord, asset=self.cloud_portal, customization=self.customization,
                                data_structure=ds, value=saved_value)
                preloaded_data.append({"name": ctx_value.get("name"),
                                       "type": ctx_value.get("type"),
                                       "value": saved_value,
                                       "id": dr.id})
        return preloaded_data

    @mock_s3
    def test_conversion_all_records(self, bakery):
        with mock_s3():
            # create local bucket
            conn = boto3.resource("s3", region_name="us-east-1")
            conn.create_bucket(Bucket=settings.AWS_STORAGE_BUCKET_NAME)
            with transaction.atomic():
                preloaded = self.fill_records()
            convert_structures_in_customization("default", convert_records=True)
            for data in preloaded:

                dr = DataRecord.objects.filter(
                    data_structure__name=get_new_name(data["name"])).last()

                if data.get("type") == "image":
                    assert dr.data_structure.type == DataStructure.DATA_TYPES.external_image
                if data.get("type") == "file":
                    assert dr.data_structure.type == DataStructure.DATA_TYPES.external_file
                if not data.get("value"):
                    assert dr.value == ''
                else:
                    assert dr.value.startswith('https://')
                    assert dr.external_file.file.read() == base64.b64decode(data["value"])

    @mock_s3
    def create_records(self, review_state=AssetCustomizationReview.REVIEW_STATES.accepted,
                       structures_only=False, value_prefix=None):
        conn = boto3.resource("s3", region_name="us-east-1")
        conn.create_bucket(Bucket=settings.AWS_STORAGE_BUCKET_NAME)
        structures = load_structure()
        data_structures = []
        for ctx in structures["contexts"]:
            context = get_asset_context_by_name(self.cloud_portal, ctx["name"])
            for ctx_value in ctx["values"]:
                if ctx_value["type"] not in ('external_image', 'external_file', 'image', 'file'):
                    continue
                # Create datastructures
                ds = get_context_datastructure_by_name(
                    context=context, name=ctx_value["name"], default=ctx_value.get("value"),
                    type=getattr(DataStructure.DATA_TYPES, ctx_value["type"])
                )
                # Skip external and record filling
                if ctx_value["type"] in ('external_image', 'external_file'):
                    continue

                if structures_only:
                    data_structures.append([ds, None, None])
                    continue
                value = f'{value_prefix}_{ds.name}_{review_state}'
                record, review = create_record_with_review(
                    asset=self.cloud_portal, context=context, ds_name=ds.name,
                    value=base64.b64encode(value.encode()).decode(),
                    customization=self.customization, review_state=review_state
                )
                data_structures.append([ds, record, review])

        return data_structures

    def get_defaults_value(self):
        structs = load_structure()
        defaults = {}
        for ctx in structs["contexts"]:
            for ctx_value in ctx["values"]:
                defaults[ctx_value['name']] = ctx_value.get("value") or ''
        return defaults

    def test_latest_version_defaults(self):
        with transaction.atomic():
            old_data_structures = self.create_records(structures_only=True)
        convert_structures_in_customization("default")
        defaults = self.get_defaults_value()

        assert len(old_data_structures) > 0

        for old_ds, rec, rev in old_data_structures:
            new_ds = get_context_datastructure_by_name(old_ds.context, get_new_name(old_ds.name))
            assert get_old_name(new_ds.name) == old_ds.name
            actual_value = new_ds.find_actual_value(self.cloud_portal, customization_name=self.customization.name)
            assert actual_value == defaults[new_ds.name]

    @mock_s3
    def test_single_review(self):
        accepted = AssetCustomizationReview.REVIEW_STATES.accepted
        rejected = AssetCustomizationReview.REVIEW_STATES.rejected
        pending = AssetCustomizationReview.REVIEW_STATES.pending
        with transaction.atomic():
            old_data_structures = self.create_records(value_prefix='single', review_state=accepted)
        convert_structures_in_customization("default")
        defaults = self.get_defaults_value()

        assert len(old_data_structures) > 0
        ms = MediaStorage()
        for old_ds, old_record, review in old_data_structures:
            new_ds = get_context_datastructure_by_name(old_ds.context, get_new_name(old_ds.name))
            assert get_old_name(new_ds.name) == old_ds.name
            assert base64.b64decode(old_record.value).decode() == f'single_{old_ds.name}_{accepted}'

            # As soon as we need to get file content we need to download the file.
            # The simplest way is to get it by id from url.
            actual_value = new_ds.find_actual_value(asset=self.cloud_portal, draft=False,
                                                    customization_name=self.customization.name)
            m = re.match(r".*-(?P<idx>\d+)/", actual_value)
            idx = m.group('idx')
            ext_file = ExternalFile.objects.filter(id=idx).last()
            assert ext_file is not None
            assert ext_file.file.read().decode() == f'single_{old_ds.name}_{accepted}'

    @mock_s3
    def test_multiple_reviews(self):
        accepted = AssetCustomizationReview.REVIEW_STATES.accepted
        rejected = AssetCustomizationReview.REVIEW_STATES.rejected
        pending = AssetCustomizationReview.REVIEW_STATES.pending
        with transaction.atomic():
            self.create_records(value_prefix='first', review_state=accepted)
            self.create_records(value_prefix='second', review_state=rejected)
            old_data_structures = self.create_records(value_prefix='third', review_state=pending)
        convert_structures_in_customization("default")

        assert len(old_data_structures) > 0

        for old_ds, old_record, review in old_data_structures:
            new_ds = get_context_datastructure_by_name(old_ds.context, get_new_name(old_ds.name))
            assert get_old_name(new_ds.name) == old_ds.name
            actual_value = new_ds.find_actual_value(asset=self.cloud_portal, draft=False,
                                                    customization_name=self.customization.name)
            m = re.match(r".*-(?P<idx>\d+)/", actual_value)
            idx = m.group('idx')
            ext_file = ExternalFile.objects.filter(id=idx).last()
            assert ext_file is not None
            assert ext_file.file.read().decode() == f'first_{old_ds.name}_{accepted}'

import os

from model_bakery import baker, seq
import pytest

from cms.controllers.filldata import *


def test_make_dir(fs):
    make_dir('test_dir/test_file')
    assert os.path.isdir('test_dir')


def test_target_file(fs):
    file_name = target_file(
        'test_file_{{language}}', save_location='test_save_loc', language_code='en_US', preview=False
    )
    assert file_name == 'static/test_save_loc/test_file_en_US'


def test_target_file_preview(fs):
    file_name = target_file(
        'test_file_{{language}}', save_location='test_save_loc', language_code='en_US', preview=True
    )
    assert file_name == 'static/test_save_loc/preview/test_file_en_US'


@pytest.fixture()
def context_setup(cloud_portal_type, default_portal, default_customization, english_language):
    context = baker.make('Context', asset_type=cloud_portal_type, is_global=True)
    data_structures = baker.make('DataStructure', name=seq('glob_'), context=context, _quantity=3)
    version = baker.make('ContentVersion', asset=default_portal)
    for idx, ds in enumerate(data_structures):
        baker.make('DataRecord', version=version, data_structure=ds, asset=default_portal, value=f'val_{idx + 1}', language=english_language)
    review = baker.make(
        'AssetCustomizationReview', version=version, state=AssetCustomizationReview.REVIEW_STATES.accepted,
        customization=default_customization
    )

    return {'context': context, 'asset': default_portal, 'version': version, 'data_structures': data_structures, 'review': review}


@pytest.fixture()
def mock_special_structs(mocker):
    mocker.patch.dict(SPECIAL_STRUCTURES.function_dict, {'test_spec_1': 'val', 'test_spec_2': 'val'}, clear=True)
    mocker.patch.object(SPECIAL_STRUCTURES, 'calc', return_value='val')


def test_global_contexts_to_dict(context_setup, mock_special_structs):
    global_context_dict = global_contexts_to_dict([context_setup['context']], context_setup['asset'])
    assert global_context_dict == {
        'glob_1': 'val_1', 'glob_2': 'val_2', 'glob_3': 'val_3', 'glob_1__en_US': 'val_1', 'glob_2__en_US': 'val_2', 'glob_3__en_US': 'val_3',
        'test_spec_1': 'val', 'test_spec_2': 'val'
    }


@pytest.fixture
def collection():
    return {
        '1': '%var%',
        '2': '%notVar%',
        '3': 'more %var% here',
        '4': {
            '1': 'more %var% here2',
            '2': ['%notVar%', '%var%', '%var% here', {'1': '%var%'}]
        },
        '5': ['%notVar%', '%var%', '%var% here']
    }


def test_replace_in(collection):
    replace_in(collection, '%var%', 'testVal')
    assert collection == {
        '1': 'testVal',
        '2': '%notVar%',
        '3': 'more testVal here',
        '4': {
            '1': 'more testVal here2',
            '2': ['%notVar%', 'testVal', 'testVal here', {'1': 'testVal'}]
        },
        '5': ['%notVar%', 'testVal', 'testVal here']
    }


def test_replace_in_delete(collection):
    replace_in(collection, '%var%', 'testVal', delete=True)
    assert collection == {
        '2': '%notVar%',
        '3': 'more testVal here',
        '4': {
            '1': 'more testVal here2',
            '2': ['%notVar%', 'testVal here', {}]
        },
        '5': ['%notVar%', 'testVal here']
    }


def test_save_content(fs):
    path = 'test_dir/test_file'
    content = 'file content\nmore content'
    save_content(filename=path, content=content)
    assert os.path.isfile(path)
    with open(path) as file:
        assert file.read() == content


@pytest.fixture()
def context_processor(context_setup):
    global_contexts = Context.objects.filter(id=context_setup['context'].id)
    asset = context_setup['asset']
    global_contexts_dict = global_contexts_to_dict(global_contexts, asset)

    return ContextProcessor(
        asset=asset, preview=False, version_id=context_setup['version'].id,
        global_contexts=global_contexts, skin='blue', global_contexts_dict=global_contexts_dict
    )


class ContextSetup:
    @pytest.fixture(autouse=True)
    def context_setup(self, context_processor, english_language):
        self.context_processor = context_processor
        self.asset = context_processor.asset
        self.version_id = context_processor.version_id
        self.language = english_language

    @pytest.fixture()
    def non_global_context(self, english_language, default_customization, context_setup):
        regular_context = baker.make('Context', asset_type=self.asset.asset_type, translatable=False, is_global=False,
                                     file_path='template.html')
        data_structures = baker.make('DataStructure', context=regular_context, name=seq('%ds_', suffix='%'),
                                     translatable=False, _quantity=3)
        version = baker.make('ContentVersion', asset=self.asset)

        for idx, ds in enumerate(data_structures):
            baker.make('DataRecord', version=version, data_structure=ds, asset=self.asset, value=f'val_{idx + 1}')
        baker.make(
            'AssetCustomizationReview', version=version, state=AssetCustomizationReview.REVIEW_STATES.accepted,
            customization=default_customization
        )
        baker.make('ContextTemplate', context=regular_context, template='Template with %ds_1% glob_2')
        self.version_id = version.id
        self.context_processor.version_id = self.version_id
        return regular_context


class TestContextProcessor(ContextSetup):
    def test_process_global_contexts(self, mock_special_structs):
        assert self.context_processor.process_global_contexts('replace this glob_1', self.language) == 'replace this val_1'
        assert self.context_processor.process_global_contexts(
            {'key': 'here is glob_2 replaced', 'key2': 'here is test_spec_1'}, self.language
        ) == {'key': 'here is val_2 replaced', 'key2': 'here is val'}

    def test_process_data_structure(self):
        assert self.context_processor.process_data_structure(
            'replace %this%', tag='%this%', data_structure_type=DataStructure.DATA_TYPES.text, content_value='that'
        ) == 'replace that'

    def test_process_data_structure_check_box(self):
        assert self.context_processor.process_data_structure(
            'replace %this%', tag='%this%', data_structure_type=DataStructure.DATA_TYPES.check_box, content_value=True
        ) == 'replace True'

    def test_process_data_structure_collection(self):
        assert self.context_processor.process_data_structure(
            content={'key': 'here is %this% replaced'}, tag='%this%', data_structure_type=DataStructure.DATA_TYPES.text,
            content_value='that'
        ) == {'key': 'here is that replaced'}

    def test_process_context_structure(self, non_global_context):
        assert self.context_processor.process_context_structure(non_global_context, 'replace %ds_1%', False) == 'replace val_1'

    def test_process_context_structure_custom_data(self, non_global_context, default_customization_ctx):
        self.context_processor.custom = True
        self.context_processor.custom_data = {'%ds_1%': 'custom_val_1'}
        assert self.context_processor.process_context_structure(non_global_context, 'replace %ds_1% %ds_2%', False) == \
               'replace custom_val_1 val_2'

    def test_process_context_structure_context_dict(self, non_global_context):
        assert self.context_processor.process_context_structure(
            non_global_context, 'replace %ds_1% %ds_2%', False, context_dict={'%ds_1%': 'context_dict_1'}
        ) == 'replace context_dict_1 val_2'

    def test_process_context(self, non_global_context):
        content = self.context_processor.process_context(non_global_context, self.language)
        assert content == 'Template with val_1 val_2'

    def test_save_context(self, fs, non_global_context):
        self.context_processor.save_context(non_global_context, self.language)
        with open('static/default/template.html') as file:
            content = file.read()
            assert content == 'Template with val_1 val_2'

    def test_save_contexts(self, fs, non_global_context):
        self.context_processor.save_contexts(non_global_context, [self.language])
        with open('static/default/template.html') as file:
            content = file.read()
            assert content == 'Template with val_1 val_2'


class TestPackageExporter(ContextSetup):
    @pytest.fixture(autouse=True)
    def exporter_setup(self, non_global_context):
        self.exporter = PackageExporter(asset=self.asset, preview=False, version_id=self.version_id)
        self.context = non_global_context

    def test__zip_context(self):
        zip_data = BytesIO()
        zip_file = zipfile.ZipFile(zip_data, "a", zipfile.ZIP_DEFLATED, False)
        self.exporter._zip_context(zip_file, self.context, self.language)
        with zip_file.open('default/template.html') as file:
            content = file.read()
            assert content.decode('utf-8') == 'Template with val_1 val_2'

    def test_zip_package(self, default_customization_ctx):
        zip_data = self.exporter.get_zip_package()
        zip_data = BytesIO(zip_data)
        zip_file = zipfile.ZipFile(zip_data, "r", zipfile.ZIP_DEFLATED, False)
        with zip_file.open('default/template.html') as file:
            content = file.read()
            assert content.decode('utf-8') == 'Template with val_1 val_2'

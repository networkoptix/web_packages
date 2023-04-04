import pytest
from unittest.mock import call
from uuid import uuid4
from random import randint, choice
from math import ceil
from shutil import rmtree
from unittest.mock import call

from model_bakery import baker

from cms.management.commands.readstructure import *


BASE_PATH = 'cms.management.commands.readstructure'


def test_context_for_file():
    skin_name, language, context = [str(uuid4()) for _ in range(3)]
    base_dir = SOURCE_DIR.replace("{{skin}}", skin_name)
    lang_dir_template = 'lang_{{language}}/'
    lang_dir = lang_dir_template.replace('{{language}}', language)
    filename = f'{base_dir}{lang_dir}{context}'

    context_name, language_name = context_for_file(filename, skin_name)
    assert language_name == language
    assert context_name == f'{lang_dir_template}{context}'


def chunk(arr, chunk_size=3):
    return [
        arr[i*chunk_size:i*chunk_size+chunk_size]
        for i in range(
            ceil(len(arr)/chunk_size))
    ]


def test_customizable_file():
    langauge, filename, * \
        non_supported = [str(uuid4()) for _ in range(randint(3, 7))]
    english = 'lang_en_US/'
    other = f'lang_{langauge}/'

    # Test customizable
    for ending in CUSTOMIZABLE_FILES:
        filename_other = f'{other}{filename}{ending}'
        filename_english = f'{english}{filename}{ending}'

        assert customizable_file(filename_other, False)
        assert not customizable_file(filename_other, True)
        assert customizable_file(filename_english, True)
        assert customizable_file(filename_english, False)

    # Test not customizable
    for ending in non_supported:
        filename_other = f'{other}{filename}{ending}'
        filename_english = f'{english}{filename}{ending}'
        for lang_filename in [filename_other, filename_english]:
            for ignore_not_english in [True, False]:
                assert not customizable_file(lang_filename, ignore_not_english)


def test_iterate_cms_files(mocker):
    skin_name, ignore_not_english, root, *filenames = [
        str(uuid4()) for _ in range(25, 75)]
    target_dir = SOURCE_DIR.replace("{{skin}}", skin_name)
    mock_walk_list = [
        (root, None, files)
        for files in chunk(filenames)]
    mock_walk = mocker.patch.object(
        os, 'walk', return_value=mock_walk_list)
    mock_customize_file = mocker.patch(
        f'{BASE_PATH}.customizable_file', return_value=True)

    iterated_files = list(iterate_cms_files(skin_name, ignore_not_english))
    expected_files = [
        os.path.join(root, filename) for filename in filenames]

    assert iterated_files == expected_files
    mock_walk.assert_called_once_with(target_dir)
    mock_customize_file.assert_has_calls(
        call(filename, ignore_not_english) for filename in expected_files)


def test_find_or_add_context_by_file(db):
    file_path = str(uuid4())
    asset_type_id = AssetType.get_type_by_name(choice(AssetType.ASSET_TYPES))
    asset_type, _ = AssetType.objects.get_or_create(type=asset_type_id)
    has_language = choice([True, False])

    context = find_or_add_context_by_file(
        file_path, asset_type, has_language)

    assert context
    assert context.id
    assert context.hidden
    assert context.asset_type == asset_type
    assert context.name == file_path
    assert context.file_path == file_path
    assert context.translatable == has_language
    assert not context.deprecated
    assert not context.is_global


def test_find_or_add_context_template(db):
    context = baker.make(Context)
    langauge = baker.make(Language)
    skin = str(uuid4())[:16]

    context_template = find_or_add_context_template(
        context, langauge.code, skin)

    assert context_template
    assert context_template.id
    assert context_template.context == context
    assert context_template.language == langauge
    assert context_template.skin == skin


class FileTest:
    base_dir = 'test_dir/'

    def __init__(self, filename=None, content=None):
        filename = filename or str(uuid4())
        content = content or str(uuid4())
        self.filename = f'{self.base_dir}{filename}'
        self.content = content

    def __enter__(self):
        try:
            os.mkdir(self.base_dir)
        except FileExistsError:
            pass

        with open(self.filename, 'w') as file:
            file.write(self.content)
            return self.filename

    def __exit__(self, *args):
        rmtree(self.base_dir, ignore_errors=True)


def test_read_cms_strings():
    cms_strings = {
        f'%{uuid4()}%'.replace('-', '_')
        for _ in range(randint(5, 15))}
    data = ' '.join(
        f'{{{cms_string}}}'
        for cms_string in cms_strings)

    with FileTest(content=data) as filename:
        read_data, matches = read_cms_strings(filename)
        assert read_data == data
        assert matches == cms_strings


def generate_args(min_args=5, max_args=15):
    return [
        str(uuid4())
        for _ in range(
            randint(min_args, max_args))]


def generate_nested_args(nested=3):
    return [generate_args() for _ in range(nested)]


def test_read_structure_file(mocker, db):
    cms_only, _common, _other = generate_nested_args()
    context_name, data, filename, _uuid, *_global = _other
    _asset_type_id = AssetType.get_type_by_name(choice(AssetType.ASSET_TYPES))
    asset_type = structure.find_or_add_asset_type(_asset_type_id)
    language_code = _uuid[:8]
    skin = _uuid[:16]
    cms_strings = _common + cms_only
    global_strings = _common + _global
    context = find_or_add_context_by_file(
        context_name, asset_type, True)
    context_template = find_or_add_context_template(
        context, language_code, skin)

    mock_context_for_file = mocker.patch(
        f'{BASE_PATH}.context_for_file', return_value=[
            context_name, language_code])
    mock_read_cms_strings = mocker.patch(
        f'{BASE_PATH}.read_cms_strings', return_value=[
            data, cms_strings])
    mock_find_or_add_context_by_file = mocker.patch(
        f'{BASE_PATH}.find_or_add_context_by_file', return_value=context)
    mock_find_or_add_context_template = mocker.patch(
        f'{BASE_PATH}.find_or_add_context_template', return_value=context_template)
    mock_find_or_add_data_structure = mocker.patch.object(
        structure, 'find_or_add_data_structure')

    read_structure_file(
        filename, asset_type, global_strings, skin)

    updated_context = Context.objects.get(
        id=context.id)
    updated_context_template = ContextTemplate.objects.get(
        id=context_template.id)
    expected_add_data_structure_calls = [
        call(string, None, updated_context, True)
        for string in cms_only]

    mock_context_for_file.assert_called_once_with(filename, skin)
    mock_read_cms_strings.assert_called_once_with(filename)
    mock_find_or_add_context_by_file.assert_called_once_with(
        context_name, asset_type, True)
    mock_find_or_add_context_template.assert_called_once_with(
        context, language_code, skin)
    assert updated_context_template.template == data
    mock_find_or_add_data_structure.assert_has_calls(
        expected_add_data_structure_calls, any_order=True)


def test_read_structure(mocker, db):
    for asset_type_id, _ in AssetType.ASSET_TYPES:
        asset_type = structure.find_or_add_asset_type(asset_type_id)
        global_strings, skins, cms_files = generate_nested_args()

        for global_string in global_strings:
            baker.make(
                DataStructure,
                name=global_string,
                context__is_global=True,
                context__asset_type=asset_type
            )

        mock_get_skins = mocker.patch(
            f'{BASE_PATH}.get_skins', return_value=skins)
        mock_iterate_cms_files = mocker.patch(
            f'{BASE_PATH}.iterate_cms_files', return_value=cms_files)
        mock_read_structure_file = mocker.patch(
            f'{BASE_PATH}.read_structure_file')

        read_structure(asset_type_id)

        if asset_type_id == AssetType.ASSET_TYPES.cloud_portal:
            # Need special handling for checking cloud portal type since asset is created before tests can run
            actual_global_strings = mock_read_structure_file.mock_calls[0].args[2]
            mock_strings = set(actual_global_strings)
            mock_with_global_strings = set(
                actual_global_strings + global_strings)

            assert mock_strings == mock_with_global_strings

            global_strings = actual_global_strings

        expected_read_structure_file_calls = [
            call(file, asset_type, global_strings, skin)
            for skin in skins
            for file in cms_files]

        mock_get_skins.assert_called_once_with()
        mock_iterate_cms_files.assert_has_calls(
            call(skin, False) for skin in skins)

        mock_read_structure_file.assert_has_calls(
            expected_read_structure_file_calls)


def test_find_or_add_language(mocker, db):
    code, language_name = [str(uuid4()) for _ in range(2)]
    language_code = code[:8]
    json_content = json.dumps({'language_name': language_name})

    with FileTest(content=json_content) as json_path:
        mock_join = mocker.patch.object(
            os.path, 'join', return_value=json_path)

        language = find_or_add_language(language_code)

        assert language
        assert language.id
        assert language.code == language_code
        assert language.name == language_name

        mock_join.assert_called_once_with(
            SOURCE_DIR.replace(
                "{{skin}}", settings.DEFAULT_SKIN),
            "static", "lang_" + language_code,
            "language_compiled.json"
        )


def test_read_languages(mocker):
    skin_name, *languages = [
        str(uuid4()) for _ in range(5, 15)]
    languages_dir = os.path.join(
        SOURCE_DIR.replace("{{skin}}", skin_name), "static")
    language_dirs = [
        f'lang_{language}' for language in languages]
    mock_listdir = mocker.patch.object(
        os, 'listdir', return_value=language_dirs)
    mock_find_or_add_language = mocker.patch(
        f'{BASE_PATH}.find_or_add_language')

    read_languages(skin_name)

    mock_listdir.assert_called_once_with(languages_dir)
    mock_find_or_add_language.assert_has_calls(
        call(language) for language in languages)


class TestReadStructure:
    def test_add_arguments(self, mocker):
        parser = mocker.MagicMock()
        Command().add_arguments(parser)
        parser.add_argument.assert_has_calls(
            [call('--customization', default='default', nargs='?', type=str),
             call('asset_type', nargs='?', default='cloud_portal')]
        )

    def test_handle(self, mocker, asset_factory, db):
        deployment_cache = caches['deployment']
        deployment_cache.set(settings.DEPLOYMENT_READY, False)
        instance = Command()
        customization_name = str(uuid4())
        asset_type = 'cloud_portal'

        mock_read_structure_json = mocker.patch.object(
            structure, 'read_structure_json')
        mock_read_structure = mocker.patch(
            f'{BASE_PATH}.read_structure')
        mock_read_menu_structure = mocker.patch.object(
            structure, 'read_menu_structure')
        mock_write_stdout = mocker.patch.object(
            instance.stdout, 'write')
        mock_read_languages = mocker.patch(
            'cms.management.commands.readstructure.read_languages')

        # Test error if missing asset_type
        pytest.raises(ValueError, instance.handle, match='asset_type required')

        # Test new customization is created and successful deployment
        expected_std_messages = [
            'Successfully initiated data structure for CMS',
            'Successfully initiated menu structure',
            'Set deployment status to ready'
        ]
        instance.handle(asset_type=asset_type, customization=customization_name)
        created_customization, = asset_factory(
            name=customization_name, lang_code='en_US')
        added_default_to_languages = list(
            created_customization.languages.all()) == [created_customization.default_language]

        assert created_customization and added_default_to_languages
        mock_read_structure_json.assert_called_once_with()
        mock_read_structure.assert_called_once_with(
            AssetType.get_type_by_name(asset_type))
        mock_read_menu_structure.assert_called_once_with(
            'cms/menus.json')
        mock_write_stdout.assert_has_calls(
            call(instance.style.SUCCESS(
                message))
            for message in expected_std_messages)
        mock_read_languages.assert_called_with(settings.DEFAULT_SKIN)
        assert deployment_cache.get(settings.DEPLOYMENT_READY)

from collections import OrderedDict
from io import BytesIO
import pytest
import re
from uuid import uuid4
from random import randint, choice

from cms.models import AssetType


class TestGenerateStructure:
    def test_image_meta_image_file(self):
        from PIL import Image
        from cms.controllers.generate_structure import image_meta
        width = randint(0, 1000)
        height = randint(0, 1000)
        format = "JPEG"

        image = Image.new('RGB', (width, height))
        buffer = BytesIO()
        image.save(buffer, format=format)

        meta = image_meta(buffer.getvalue(), format)

        assert meta == OrderedDict(
            [('width', width), ('height', height), ('format', format)])

    def test_image_meta_not_image(self):
        from cms.controllers.generate_structure import image_meta

        assert image_meta(b'', uuid4()) is None

    def test_find_context_by_name(self):
        from cms.controllers.generate_structure import find_context
        contexts = [{'name': str(uuid4()), 'file_path': str(
            uuid4()), 'value': str(uuid4())} for _ in range(randint(15, 20))]
        structure = {'contexts': contexts}
        context_to_find = choice(contexts)
        context = find_context(context_to_find['name'], '', structure, None)

        assert context is context_to_find

    def test_find_context_by_file_path(self):
        from cms.controllers.generate_structure import find_context
        contexts = [{'name': str(uuid4()), 'file_path': str(
            uuid4()), 'value': str(uuid4())} for _ in range(randint(15, 20))]
        structure = {'contexts': contexts}
        context_to_find = choice(contexts)
        context = find_context(
            '', context_to_find['file_path'], structure, None)

        assert context is context_to_find

    def test_find_context_by_db(self, db):
        from model_bakery import baker
        from cms.models import Context
        from cms.controllers.generate_structure import find_context
        contexts = [{'name': str(uuid4()), 'file_path': str(
            uuid4()), 'value': str(uuid4())} for _ in range(randint(15, 20))]
        structure = {'contexts': contexts}
        name, file_path, label, description = (str(uuid4()) for _ in range(4))
        hidden = choice([True, False])
        translatable = choice([True, False])
        context_to_find = baker.make(
            Context, name=name, file_path=file_path, label=label, description=description, asset_type=AssetType.objects.first(), hidden=hidden, translatable=translatable)
        context = find_context('', context_to_find.file_path,
                               structure, context_to_find.asset_type)

        assert context['name'] == name
        assert context['label'] == label
        assert context['description'] == description
        assert context['file_path'] == file_path
        assert context['hidden'] == hidden
        assert context['translatable'] == translatable
        assert context in structure['contexts']

    def test_find_structure_in_context(self):
        from cms.controllers.generate_structure import find_structure
        structures = [{'name': str(uuid4()), 'value': str(uuid4())}
                      for _ in range(randint(15, 20))]
        context = {'values': structures}
        structure_to_find = choice(structures)
        structure = find_structure(
            structure_to_find['name'], context, None, None)

        assert structure is structure_to_find

    def test_find_structure_in_db(self, mocker, db):
        from model_bakery import baker
        from cms.models import DataStructure
        name, placeholder, label, description, fieldset = (
            str(uuid4()) for _ in range(5))
        advanced, optional, protected = (
            choice([True, False]) for _ in range(3))
        structures = [{'name': str(uuid4()), 'value': str(uuid4())}
                      for _ in range(randint(15, 20))]
        context = {'values': structures}

        from cms.controllers.generate_structure import find_structure
        structure_to_find = baker.make(
            DataStructure, name=name, label=label, description=description, placeholder=placeholder, fieldset=fieldset, advanced=advanced, optional=optional, protected=protected, type=DataStructure.DATA_TYPES.html)

        structure = find_structure(structure_to_find.name, context, None, None)

        assert structure['name'] == name
        assert structure['placeholder'] == placeholder
        assert structure['label'] == label
        assert structure['description'] == description
        assert structure['fieldset'] == fieldset
        assert structure['advanced'] == advanced
        assert structure['optional'] == optional
        assert structure['protected'] == protected

    def test_read_cms_strings(self):
        from cms.controllers.generate_structure import read_cms_strings
        cms_string = "%TEST_STRING%"
        data = f'{uuid4()} {cms_string} {uuid4}'
        (returned_data, found_string), = read_cms_strings(data.encode())

        assert found_string == cms_string
        assert returned_data == data
        assert not read_cms_strings(f'{uuid4()} {uuid4()}'.encode())

    def test_templatify_json(self):
        tag_regex = re.compile('^%[^%]+%$')

        def add_nodes(nodes_to_add=None):
            nonlocal added_nodes
            if not nodes_to_add:
                nodes_to_add = randint(1, 5)
                added_nodes += nodes_to_add
            return {str(uuid4()): str(uuid4()) if nodes_to_add < 7 else add_nodes() for _ in range(nodes_to_add)}

        num_root_nodes = randint(7, 17)
        added_nodes = 0
        parent_node = add_nodes(num_root_nodes)

        from cms.controllers.generate_structure import templatify_json
        values, json_data = templatify_json(parent_node)

        assert len(values) == added_nodes
        for root_value in json_data.values():
            for value in root_value.values():
                assert type(value) == str and tag_regex.match(value)

    def test_check_if_json_dict(self, db):
        from cms.controllers.generate_structure import check_if_json
        array_json = '{}'
        structure = {'contexts': []}
        asset_type = AssetType.ASSET_TYPES.documentation

        assert check_if_json(array_json, 'file.json',
                             structure, asset_type) is True

    def test_check_if_json_non_json_file(self):
        from cms.controllers.generate_structure import check_if_json

        assert check_if_json(None, 'file.notjson', None, None) is False

    def test_check_if_json_array(self):
        from cms.controllers.generate_structure import check_if_json
        array_json = '["item1", "item2", "item3"]'

        assert check_if_json(array_json, 'file.json', None, None) is False

    def test_check_if_customizable(self, mocker):
        short_name, asset_type, structure, data_str, context = (
            str(uuid4()) for _ in range(5))
        cms_string = "%TEST_STRING%"
        data = f'{data_str} {cms_string} {data_str}'
        mock_find_context = mocker.patch(
            'cms.controllers.generate_structure.find_context', return_value=context)
        mock_find_structure = mocker.patch(
            'cms.controllers.generate_structure.find_structure')

        from cms.controllers.generate_structure import check_if_customizable
        customizable = check_if_customizable(
            data.encode(), short_name, structure, asset_type)

        assert customizable is True
        mock_find_context.assert_called_once_with(
            short_name, short_name, structure, asset_type)
        mock_find_structure.assert_called_once_with(
            cms_string, context, 'Text', asset_type, meta={"regex": ""}, description=data)
        assert check_if_customizable(
            f'{data_str} {data_str}'.encode(), None, None, None) is False

    def test_read_data_image(self, mocker):
        from PIL import Image
        mock_find_structure = mocker.patch(
            'cms.controllers.generate_structure.find_structure')
        width = randint(0, 1000)
        height = randint(0, 1000)
        image = Image.new('RGB', (width, height))
        buffer = BytesIO()
        image.save(buffer, format="JPEG")
        extension = 'jpg'
        meta = OrderedDict(
            [('width', width), ('height', height), ('format', extension)])
        data = buffer.getvalue()
        path, name, context, cms_structure, asset_type = (
            str(uuid4()) for _ in range(5))
        short_name = f'{path}/{name}.{extension}'

        from cms.controllers.generate_structure import read_data
        read_data(data, short_name, context, cms_structure, asset_type)

        mock_find_structure.assert_called_once_with(
            short_name, context, 'image', asset_type, meta=meta)

    def test_read_data_file(self, mocker):
        mock_check_if_json = mocker.patch(
            'cms.controllers.generate_structure.check_if_json', return_value=False)
        mock_check_customizable = mocker.patch(
            'cms.controllers.generate_structure.check_if_customizable', return_value=False)
        mock_find_structure = mocker.patch(
            'cms.controllers.generate_structure.find_structure')
        path, name, context, cms_structure, asset_type = (
            str(uuid4()) for _ in range(5))
        extension = 'pdf'
        data = b''
        meta = OrderedDict(format=extension)
        short_name = f'{path}/{name}.{extension}'

        from cms.controllers.generate_structure import read_data
        read_data(data, short_name, context, cms_structure, asset_type)

        mock_find_structure.assert_called_once_with(
            short_name, context, 'file', asset_type, meta=meta)
        mock_check_if_json.assert_called_once_with(
            data, short_name, cms_structure, asset_type)
        mock_check_customizable.assert_called_once_with(
            data, short_name, cms_structure, asset_type)

    def test_iterate_zip(self, mocker):
        root_files = [f'{uuid4()}.txt' for _ in range(randint(5, 15))]
        root_folder = f'{uuid4()}/'
        files_in_root_folder = [
            f'{uuid4()}.txt' for _ in range(randint(5, 15))]
        mocker.patch('zipfile.ZipFile.__init__', return_value=None)
        mocker.patch('zipfile.ZipFile.namelist', return_value=[
                     *root_files, root_folder, *[f'{root_folder}{file}' for file in files_in_root_folder]])
        mock_read = mocker.patch('zipfile.ZipFile.read')
        from cms.controllers.generate_structure import iterate_zip
        files = list(iterate_zip('test'))

        assert mock_read.call_count == len(files_in_root_folder)
        assert len(files) == len(files_in_root_folder)
        for index, (file_name, _) in enumerate(files):
            assert file_name in files_in_root_folder
            assert file_name not in root_files
            mock_read.mock_calls[index].args[0] == f'{root_folder}{file_name}'

    def test_iterate_directory(self, tmp_path):
        num_files = randint(3, 17)
        root_folder_name = str(uuid4())
        root = tmp_path / root_folder_name
        root.mkdir()
        child_dirs = [str(uuid4()) for _ in range(num_files)]
        for dir in child_dirs:
            (root / dir).mkdir()
        files = [root / child_dirs[index] /
                 str(uuid4()) for index in range(num_files)]
        file_content = [str(uuid4()) for _ in range(num_files)]
        for index, file in enumerate(files):
            file.write_text(file_content[index])

        from cms.controllers.generate_structure import iterate_directory
        directory_content = list(iterate_directory(str(root)))

        assert len(directory_content) == len(child_dirs) + num_files + 1
        for _, data in directory_content:
            if data:
                assert data.decode() in file_content

    def test_iterate_contexts(self):
        from cms.controllers.generate_structure import iterate_contexts
        ignored_mac_file = ('__ignore_this', str(uuid4()))
        ignored_structure_json = ('ignore_this_structure.json', str(uuid4()))
        ignored_help_directory = ('help/some.file', str(uuid4()))
        ignored_directory = ('this/is/directory/', str(uuid4()))
        context_in_root = ('some.file', str(uuid4()))
        context_in_child_dir = ('child_dir/some.file', str(uuid4()))
        ignored_context = [ignored_mac_file, ignored_structure_json,
                           ignored_help_directory, ignored_directory]
        valid_context = context_in_root, context_in_child_dir
        iterator = [*ignored_context, *valid_context]

        context_list = list(iterate_contexts(iterator))

        def list_contains(context_to_find):
            return next((context for context in context_list if context[0] == context_to_find[0]), None)

        assert all(list_contains(context)
                   is None for context in ignored_context)
        assert all(list_contains(context) for context in valid_context)

    def test_get_object_by_name(self):
        from cms.controllers.generate_structure import get_object_by_name
        num_objects = randint(10, 15)
        objects = [{'name': str(uuid4()), 'data': str(uuid4())}
                   for _ in range(num_objects)]
        to_find = choice(objects)

        found = get_object_by_name(to_find['name'], objects)
        not_found = get_object_by_name(
            {'name': str(uuid4()), 'data': str(uuid4())}, objects)

        assert found is to_find
        assert not_found is None

    def test_list_to_dict(self):
        from cms.controllers.generate_structure import list_to_dict
        num_items = randint(10, 15)
        list_to_convert = [{'id': id, 'data': str(
            uuid4())} for id in range(num_items)]
        converted_to_dict = list_to_dict(list_to_convert, 'id')

        assert len(converted_to_dict.items()) == num_items
        for item in list_to_convert:
            assert converted_to_dict[item['id']]['data'] == item['data']

    def test_merge_object(self):
        from cms.controllers.generate_structure import merge_object, REC_STATE
        FROM_SOURCE_TWO = 'from_source_two'
        SHOULD_BE_DELETED = 'should_be_deleted'
        source_one = {'status': str(
            uuid4()), FROM_SOURCE_TWO: False, SHOULD_BE_DELETED: False}
        source_two = {'status': str(uuid4()), FROM_SOURCE_TWO: True}
        target = {SHOULD_BE_DELETED: True}

        status = merge_object(source_one, source_two, target)

        assert status == REC_STATE.updated
        assert SHOULD_BE_DELETED not in target
        assert target[FROM_SOURCE_TWO]

    def test_merge_context(self):
        def generate_ds():
            return [{'name': str(uuid4()), 'status': str(uuid4()), 'value': str(uuid4()), 'type': 'text'} for _ in range(randint(3, 17))]

        def assert_correct_status(expected_ds, status):
            assert len(expected_ds) == len(
                [ds for ds in merged if ds['status'] == status])

        unchanged = generate_ds()
        changed = generate_ds()
        deprecated = generate_ds()
        new = generate_ds()

        base_ds = unchanged + changed + deprecated
        new_ds = unchanged + new + \
            [{**ds, 'value': str(uuid4())} for ds in changed]

        from cms.controllers.generate_structure import merge_context
        merged = merge_context({'values': base_ds}, {'values': new_ds})

        assert len(merged) == len(unchanged + changed + deprecated + new)
        assert_correct_status(unchanged, 'same')
        assert_correct_status(changed, 'updated')
        assert_correct_status(deprecated, 'deprecated')
        assert_correct_status(new, 'new')

    def test_merge_structure(self):
        def generate_contexts():
            return [{'name': str(uuid4()), 'values': [{'name': str(uuid4()), 'status': str(uuid4())}]} for _ in range(randint(3, 17))]

        def assert_correct_status(contexts, status):
            assert len(contexts) == len(
                [context for context in merged['contexts'] if context['status'] == status])

        common_unchanged = generate_contexts()
        common_changed = generate_contexts()
        added_contexts = generate_contexts()

        from cms.controllers.generate_structure import merge_structure
        base_structure_contexts = common_changed + common_unchanged
        new_structure_contexts = common_unchanged + added_contexts + [
            {'name': context['name'], 'values': [
                {'name': str(uuid4()), 'status': str(uuid4())}]}
            for context in common_changed
        ]
        merged = merge_structure({'contexts': base_structure_contexts}, {
                                 'contexts': new_structure_contexts})

        assert len(merged['contexts']) == len(
            base_structure_contexts) == len(new_structure_contexts)
        assert_correct_status(common_changed, 'updated')
        assert_correct_status(common_unchanged, 'same')
        assert_correct_status(added_contexts, 'new')

    def test_process_files(self,  asset_factory, account_factory, db):
        from cms.controllers.generate_structure import process_files
        asset = next(asset_factory(account=account_factory()))
        ignored_mac_file = ('__ignore_this', str(uuid4()).encode())
        ignored_structure_json = (
            'ignore_this_structure.json', str(uuid4()).encode())
        ignored_help_directory = ('help/some.file', str(uuid4()).encode())
        ignored_directory = ('this/is/directory/', str(uuid4()).encode())
        context_in_root = ('some.file', str(uuid4()).encode())
        context_in_child_dir = ('child_dir/some.file', str(uuid4()).encode())
        ignored_context = [ignored_mac_file, ignored_structure_json,
                           ignored_help_directory, ignored_directory]
        valid_context = context_in_root, context_in_child_dir
        iterator = [*ignored_context, *valid_context]

        [processed_structure], log_errors = process_files(iterator, asset)

        def assert_value_for(key, expected_value):
            assert processed_structure[key] == expected_value

        assert not log_errors
        assert processed_structure
        assert_value_for('asset', asset.name)
        assert_value_for('type', AssetType.ASSET_TYPES[asset.asset_type.type])
        assert_value_for('single_customization',
                         asset.asset_type.single_customization)
        assert_value_for('can_preview', asset.asset_type.can_preview)
        contexts_in_struct = [context['name']
                              for context in processed_structure['contexts'][0]['values']]
        for context_name, _ in valid_context:
            assert context_name in contexts_in_struct

    def test_from_database(self, asset_factory, account_factory, db):
        from cms.controllers.generate_structure import from_database
        account = account_factory()
        asset = next(asset_factory(account=account))
        asset_from_db, = from_database(asset)
        assert asset_from_db

    def test_from_directory(self, mocker):
        directory, asset, iterate_directory_return, process_files_return = (
            str(uuid4()) for _ in range(4))
        mock_iterate_directory = mocker.patch(
            'cms.controllers.generate_structure.iterate_directory', return_value=iterate_directory_return)
        mock_process_files = mocker.patch(
            'cms.controllers.generate_structure.process_files', return_value=process_files_return)

        from cms.controllers.generate_structure import from_directory
        processed = from_directory(directory, asset)

        mock_iterate_directory.assert_called_once_with(directory)
        mock_process_files.assert_called_once_with(
            iterate_directory_return, asset)
        assert processed == process_files_return

    def test_from_zip(self, mocker):
        file_descriptor, asset, iterate_zip_return, process_files_return = (
            str(uuid4()) for _ in range(4))
        mock_iterate_zip = mocker.patch(
            'cms.controllers.generate_structure.iterate_zip', return_value=iterate_zip_return)
        mock_process_files = mocker.patch(
            'cms.controllers.generate_structure.process_files', return_value=process_files_return)

        from cms.controllers.generate_structure import from_zip
        processed = from_zip(file_descriptor, asset)

        mock_iterate_zip.assert_called_once_with(file_descriptor)
        mock_process_files.assert_called_once_with(iterate_zip_return, asset)
        assert processed == process_files_return

    def test_merge_db_with_archive(self, mocker):
        file_descriptor, asset, db_structure, archive_structure, merge_structure_return = (
            str(uuid4()) for _ in range(5))
        from_db_return = [db_structure]
        from_zip_return = [[archive_structure]]
        mock_from_database = mocker.patch(
            'cms.controllers.generate_structure.from_database', return_value=from_db_return)
        mock_from_zip = mocker.patch(
            'cms.controllers.generate_structure.from_zip', return_value=from_zip_return)
        mock_merge_structure = mocker.patch(
            'cms.controllers.generate_structure.merge_structure', return_value=merge_structure_return)

        from cms.controllers.generate_structure import merge_db_with_archive
        merged = merge_db_with_archive(file_descriptor, asset)

        mock_from_database.assert_called_once_with(
            asset, use_actual_values=False)
        mock_from_zip.assert_called_once_with(file_descriptor, asset)
        mock_merge_structure.assert_called_once_with(
            db_structure, archive_structure)
        assert merged == merge_structure_return

    def test_set_data_structure_state(self):
        from cms.controllers.generate_structure import set_data_structure_state
        updated_state = uuid4()
        data_structures = [{'id': id, 'state': uuid4()}
                           for id in range(randint(5, 20))]
        set_data_structure_state(data_structures, updated_state)

        assert all(structure['state'] ==
                   updated_state for structure in data_structures)

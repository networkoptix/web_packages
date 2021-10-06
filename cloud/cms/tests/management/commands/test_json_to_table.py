import pytest
from unittest.mock import call
from uuid import uuid4
from random import randint
import os
from shutil import rmtree

from cms.management.commands.json_to_table import *


class TestJsonToTable:
    def test_handle(self, mocker):
        def mock_process_structure(asset_type, template):
            return f'{asset_type["type"]} - {template}'
        mock_template, *mock_asset_types = [
            str(uuid4())
            for _ in range(randint(3, 7))]
        mock_asset_types_dicts = [
            {'type': f'test_dir/{asset_type}'}
            for asset_type in mock_asset_types]
        mocker.patch(
            'cms.management.commands.json_to_table.get_template', return_value=mock_template)
        mocker.patch.object(
            structure, 'read_structure_files', return_value=mock_asset_types_dicts)
        mocker.patch.object(
            structure_to_html, 'process_structure_json', mock_process_structure)

        Command().handle()

        files_to_check = [
            (f'cms/{asset_type["type"]}.html', mock_process_structure(
                asset_type, mock_template))
            for asset_type in mock_asset_types_dicts]

        for path, expected_content in files_to_check:
            with open(path) as saved_file:
                saved_content = saved_file.read()
                assert saved_content and saved_content == expected_content

    @pytest.fixture(autouse=True)
    def setup_and_teardown(self):
        try:
            os.mkdir('cms/test_dir')
        except FileExistsError:
            pass

        yield

        rmtree('cms/test_dir', ignore_errors=True)

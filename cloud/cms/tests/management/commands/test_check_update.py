import pytest
from unittest.mock import call
from random import randint
from uuid import uuid4
import os

from cms.management.commands.check_update import *

class TestCheckUpdate:
    def test_handle(self, mocker):
        options = {'customization': settings.TEST_CUSTOMIZATION}
        current_version = randint(10, 1000)
        local_version = current_version - randint(1, 10)
        mock_check_update_cache = mocker.patch.object(
            models, 'check_update_cache', return_value=[True, current_version])
        instance = Command()
        mock_read_id = mocker.patch.object(instance, 'read_id', return_value=None)
        mock_write_id = mocker.patch.object(instance, 'write_id')
        mock_log_info = mocker.patch.object(logger, 'info')
        mock_write_stdout = mocker.patch.object(instance.stdout, 'write')
        mock_initialize_static_content = mocker.patch.object(
            instance, 'initialize_static_content')

        # Test initialize version.id file
        instance.handle(**options)
        mock_log_info.assert_has_calls([
            call(f'Local version: None\tUpdate: True\tCurrent Version: {current_version}'),
            call(current_version)])
        mock_write_id.assert_called_with(current_version)
        mock_write_stdout.assert_called_with(
            instance.style.SUCCESS('Initialized version.id file.'))
        mock_initialize_static_content.assert_not_called()

        # Test initialize static content
        mock_read_id.return_value = local_version
        instance.handle(**options)
        mock_initialize_static_content.assert_called_once_with(current_version, settings.TEST_CUSTOMIZATION)

        # Test no changes
        mock_check_update_cache.return_value = [False, current_version]
        instance.handle(**options)
        mock_write_stdout.assert_called_with(instance.style.SUCCESS('No change was detected'))

    def test_read_and_write_id(self):
        instance = Command()
        try:
            os.remove(instance._id_file)
        except FileNotFoundError:
            pass
        # check not existing
        assert not instance.read_id()

        # check existing
        expected = randint(1, 10000)
        instance.write_id(expected)
        assert instance.read_id() == expected

    def test_initialize_static_content(self, mocker):
        instance = Command()
        current_version = randint(1, 1000)
        asset = str(uuid4())
        mocker.patch.object(models, 'get_cloud_portal_asset', return_value=asset)
        mock_log_info = mocker.patch.object(logger, 'info')
        mock_write_stdout = mocker.patch.object(instance.stdout, 'write')
        mock_init_skin = mocker.patch.object(filldata, 'init_skin')
        expected_logged_info = [
            'Need to update content.',
            f'Init skin: {asset}\t Preview: False',
            f'Init skin: {asset}\t Preview: True',
            'Content has been updated.'
        ]

        instance.initialize_static_content(current_version, customization=settings.TEST_CUSTOMIZATION)
        assert instance.read_id() == current_version
        mock_log_info.assert_has_calls(call(message) for message in expected_logged_info)
        mock_write_stdout.assert_called_once_with(
            instance.style.SUCCESS(
                f'Successfully initiated static content for {asset}'))
        mock_init_skin.assert_has_calls(
            call(asset, state, workers=1) for state in [False, True])


    @pytest.fixture(autouse=True)
    def cleanup_created_version_id_file(self):
        yield
        try:
            os.remove(Command._id_file)
        except FileNotFoundError:
            pass

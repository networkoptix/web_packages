import pytest
from uuid import uuid4
from unittest.mock import call

from api.management.commands.bindsystem import *


class TestBindSystem:
    required_arguments = [
        'email', 'password', 'system_name', 'system_url']

    def test_add_arguments(self, mocker):
        parser = mocker.MagicMock()
        Command().add_arguments(parser)
        parser.add_argument.assert_has_calls(
            call(arg, type=str)
            for arg in self.required_arguments
        )

    def test_handle(self, mocker):
        options = {}
        instance = Command()
        environ = {
            **dict(os.environ),
            'LOCAL_ENV': False
        }
        mocker.patch.object(os, 'environ', environ)
        bind_res_to_cloud_info_mapping = {
            'cloudAccountName': 'ownerAccountEmail',
            'cloudAuthKey': 'authKey',
            'cloudSystemID': 'id',
            'systemName': 'name'
        }
        cloud_info = {
            cloud_info_key: str(uuid4())
            for cloud_info_key in bind_res_to_cloud_info_mapping}

        bind_res = {
            bind_res_to_cloud_info_mapping[key]: value
            for key, value in cloud_info.items()}
        mock_bind = mocker.patch.object(System, 'bind', return_value=bind_res)
        mock_post = mocker.patch.object(requests, 'post')

        # Test command only available locally
        pytest.raises(
            RuntimeError,
            instance.handle,
            match='This command can only be ran locally!'
        )

        # Test checking for correct arguments
        environ['LOCAL_ENV'] = True
        for arg in self.required_arguments:
            pytest.raises(
                ValueError,
                instance.handle,
                match=f'{arg} is required',
                **options)
            options[arg] = str(uuid4())

        # Test bind system
        instance.handle(**options)
        bind_args = [options[arg]
                     for arg in ['email', 'password', 'system_name']]
        mock_bind.assert_called_once_with(*bind_args)
        mock_post.assert_called_once_with(
            f'{options["system_url"]}/api/setupCloudSystem',
            json=cloud_info,
            auth=requests.auth.HTTPDigestAuth('admin', 'admin')
        )
        mock_post.return_value.raise_for_status.assert_called_once_with()

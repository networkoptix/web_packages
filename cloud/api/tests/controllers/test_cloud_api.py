import api.controllers.cloud_api as cloud_api
from api.controllers.cloud_api import *
from api.helpers.exceptions import *

import pytest
from unittest import TestCase

from rest_framework import status


class TestAPIWrappers:
    @staticmethod
    def check_wrapper(wrapper, request_mock, include_json=True, include_params=True):
        url = 'https://www.google.com'
        params = {'param1': 'param1val', 'param2': 'param2Val'}
        auth = HTTPBasicAuth('test_user', 'test_pass')
        headers = {'header1': 'header1val', 'header2': 'header2Val'}
        json_data = {'json1': 'json1Val', 'json2': 'json2Val'}
        req_kwargs = {'url': url, 'auth': auth, 'headers': headers}
        if include_json:
            req_kwargs['json'] = json_data
        if include_params:
            req_kwargs['params'] = params

        with TestCase().assertLogs() as log:
            wrapper(**req_kwargs)

        args = request_mock.call_args[0]
        kwargs = request_mock.call_args[1]

        assert args[0] == url
        assert kwargs['headers'] == headers
        assert kwargs['auth'] == auth

        if include_params:
            assert kwargs['params'].items() >= params.items()
            assert len(kwargs['params']['salt']) == 15

        if include_json:
            assert kwargs['json'] == json_data

    def test_get_wrapper(self, mocker):
        request_mock = mocker.patch.object(cloud_api.requests, 'get')
        self.check_wrapper(get_wrapper, request_mock, include_json=False)

    def test_post_wrapper(self, mocker):
        request_mock = mocker.patch.object(cloud_api.requests, 'post')
        self.check_wrapper(post_wrapper, request_mock)

    def test_put_wrapper(self, mocker):
        request_mock = mocker.patch.object(cloud_api.requests, 'put')
        self.check_wrapper(put_wrapper, request_mock)

    def test_delete_wrapper(self, mocker):
        request_mock = mocker.patch.object(cloud_api.requests, 'delete')
        self.check_wrapper(delete_wrapper, request_mock, include_params=False, include_json=False)


class MockResponse:
    def __init__(self, **kwargs):
        self.status_code = kwargs.get('status_code', status.HTTP_200_OK)
        self.json_data = kwargs.get('json', {})

    def json(self):
        return self.json_data


class TestSystemAPI:
    user = 'system_user@test.com'
    password = 'systemPass'
    basic_auth = HTTPBasicAuth(user, password)
    sample_data = {'d1': 'd1val', 'd2': 'd2Val', 'resultCode': ErrorCodes.ok.value}
    system_id = 'dd11cd4f-c74b-4589-9457-d126502fdff6'
    slave_system_id = 'e0a0d0c8-afe9-482a-9617-a80c760f1208'
    system_name = 'A System'

    @pytest.fixture
    def cloud_api_get_mock(self, mocker):
        get_mock = mocker.patch.object(cloud_api, 'get_wrapper')
        get_mock.return_value = MockResponse(json=self.sample_data)
        return get_mock

    @pytest.fixture
    def cloud_api_post_mock(self, mocker):
        post_mock = mocker.patch.object(cloud_api, 'post_wrapper')
        post_mock.return_value = MockResponse(json=self.sample_data)
        return post_mock

    def test_list(self, cloud_api_get_mock):
        # One customizatoin
        system_list = System.list(self.user, self.password)
        cloud_api_get_mock.assert_called_with(
            CLOUD_DB_URL + '/system/get', params={'customization': settings.CUSTOMIZATION}, auth=self.basic_auth
        )
        assert system_list == self.sample_data

        # Any customization
        system_list = System.list(self.user, self.password, one_customization=False)
        cloud_api_get_mock.assert_called_with(
            CLOUD_DB_URL + '/system/get', params={}, auth=self.basic_auth
        )
        assert system_list == self.sample_data

    def test_get(self, cloud_api_get_mock):
        system = System.get(self.user, self.password, self.system_id)
        cloud_api_get_mock.assert_called_with(
            CLOUD_DB_URL + '/system/get', params={'systemId': self.system_id}, auth=self.basic_auth
        )
        assert system == self.sample_data

    def test_users(self, cloud_api_get_mock):
        users = System.users(self.user, self.password, self.system_id)
        cloud_api_get_mock.assert_called_with(
            CLOUD_DB_URL + '/system/getCloudUsers', params={'systemId': self.system_id}, auth=self.basic_auth
        )
        assert users == self.sample_data

    def test_share(self, cloud_api_post_mock):
        share_email = 'share@share.com'
        access_role = 'viewer'
        share = System.share(self.user, self.password, self.system_id, share_email, access_role)
        cloud_api_post_mock.assert_called_with(
            CLOUD_DB_URL + '/system/share',
            json={'systemId': self.system_id, 'accountEmail': share_email, 'accessRole': access_role},
            auth=self.basic_auth
        )
        assert share == self.sample_data

    def test_get_nonce(self, cloud_api_get_mock):
        nonce = System.get_nonce(self.user, self.password, self.system_id)
        cloud_api_get_mock.assert_called_with(
            CLOUD_DB_URL + '/auth/getNonce', params={'systemId': self.system_id}, auth=self.basic_auth
        )
        assert nonce == self.sample_data

    def test_rename(self, cloud_api_post_mock):
        rename = System.rename(self.user, self.password, self.system_id, self.system_name)
        cloud_api_post_mock.assert_called_with(
            CLOUD_DB_URL + '/system/rename', json={'systemId': self.system_id, 'name': self.system_name},
            auth=self.basic_auth
        )
        assert rename == self.sample_data

    def test_access_roles(self, cloud_api_get_mock):
        roles = System.access_roles(self.user, self.password, self.system_id)
        cloud_api_get_mock.assert_called_with(
            CLOUD_DB_URL + '/system/getAccessRoleList', params={'systemId': self.system_id},
            auth=self.basic_auth
        )
        assert roles == self.sample_data

    def test_unbind(self, cloud_api_post_mock):
        unbind = System.unbind(self.user, self.password, self.system_id)
        cloud_api_post_mock.assert_called_with(
            CLOUD_DB_URL + '/system/unbind', json={'systemId': self.system_id},
            auth=self.basic_auth
        )
        assert unbind == self.sample_data

    def test_bind(self, cloud_api_post_mock):
        bind = System.bind(self.user, self.password, self.system_name)
        cloud_api_post_mock.assert_called_with(
            CLOUD_DB_URL + '/system/bind', json={'name': self.system_name, 'customization': settings.CUSTOMIZATION},
            auth=self.basic_auth
        )
        assert bind == self.sample_data

    def test_merge(self, cloud_api_post_mock):
        merge = System.merge(self.user, self.password, self.system_id, self.slave_system_id)
        cloud_api_post_mock.assert_called_with(
            CLOUD_DB_URL + f'/system/{self.system_id}/merged_systems/',
            json={'systemId': self.slave_system_id},
            auth=self.basic_auth
        )
        assert merge == self.sample_data


import api.controllers.cloud_api as cloud_api
from api.controllers.cloud_api import *

import pytest
from unittest import TestCase


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


class TestSystemAPI:
    pass


class TestCloudSystem:
    @pytest.fixture(autouse=True)
    def setup(self, mocker):
        self.mocker = mocker

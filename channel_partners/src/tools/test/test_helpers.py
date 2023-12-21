from uuid import uuid4

import httpx
import pytest
from rest_framework.exceptions import APIException

from tools.helpers import forward_cdb_resp, settings as django_settings

class TestForwardCdbResp:

    @pytest.fixture(autouse=True)
    def setUp(self, mocker):
        self.url = f'https://testserver/{uuid4()}'
        self.data = {'message': f'{uuid4()}'}
        mocker.patch.object(django_settings, 'DEBUG', return_value=True)

    @property
    def response(self):
        return httpx.post(url=self.url)

    def test_response_200(self, httpx_mock):
        httpx_mock.add_response(url=self.url, json=self.data, status_code=200)
        response = forward_cdb_resp(self.response)
        assert response.status_code == 200
        assert response.data == self.data

    def test_response_400(self, httpx_mock):
        httpx_mock.add_response(url=self.url, json=self.data, status_code=400)
        response = forward_cdb_resp(self.response)
        assert response.status_code == 400
        assert response.data == self.data

    def test_empty_json_response(self, httpx_mock):
        httpx_mock.add_response(url=self.url, json=None, status_code=400)
        response = forward_cdb_resp(self.response)
        assert response.status_code == 400
        assert response.data == ''

    def test_test_response(self, httpx_mock, mocker):
        httpx_mock.add_response(url=self.url, content='some data', status_code=400)
        response = forward_cdb_resp(self.response)
        assert response.status_code == 400
        assert response.data == 'some data'

    def test_exception_200(self, httpx_mock):
        httpx_mock.add_response(url=self.url, json=self.data, status_code=200)
        try:
            response = forward_cdb_resp(self.response, via_exception=True)
        except APIException as ex:
            assert ex.status_code == 200
            assert ex.detail == self.data
        else:
            raise AssertionError('Exception is not called')

    def test_exception_400(self, httpx_mock):
        httpx_mock.add_response(url=self.url, json=self.data, status_code=400)
        try:
            response = forward_cdb_resp(self.response, via_exception=True)
        except APIException as ex:
            assert ex.status_code == 400
            assert ex.detail == self.data
        else:
            raise AssertionError('Exception is not called')

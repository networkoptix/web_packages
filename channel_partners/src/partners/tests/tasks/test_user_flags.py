import json
from uuid import uuid4

import httpx
import pytest
from django.conf import settings

from partners.tasks.user_flags import (
    mark_organization_user,
    save_attrs,
)


class TestSaveAttrs:
    @pytest.fixture(autouse=True)
    def setup(self, httpx_mock, mocker):
        self.httpx_mock = httpx_mock
        self.mock_get_auth_token = mocker.patch('partners.tasks.user_flags.get_auth_token')
        self.email = 'test@example.com'
        self.attrs = {'key': 'value'}
        self.url = f'https://{settings.DEFAULT_HOST_NAME}/cdb/internal/v0/account/{self.email}/organization-attrs'

    def test_save_attrs_successful_response(self):
        self.mock_get_auth_token.return_value = 'fake_token'
        self.httpx_mock.add_response(method='PUT', url=self.url, json=self.attrs, status_code=200)
        response = save_attrs(self.email, self.attrs)
        assert response.status_code == 200
        request = self.httpx_mock.get_request(url=self.url)
        assert request.method == 'PUT'
        assert json.loads(request.content) == self.attrs

    def test_save_attrs_failed_auth_token(self):
        self.mock_get_auth_token.side_effect = httpx.TimeoutException('Failed to get auth credentials')
        self.httpx_mock.add_response(method='PUT', url=self.url, json=self.attrs, status_code=200)
        response = save_attrs(self.email, self.attrs)
        assert response.status_code == 200
        request = self.httpx_mock.get_request(url=self.url)
        assert request.method == 'PUT'
        assert json.loads(request.content) == self.attrs

    def test_save_attrs_not_found(self):
        self.mock_get_auth_token.return_value = 'fake_token'
        self.httpx_mock.add_response(method='PUT', url=self.url, json=self.attrs, status_code=404)
        response = save_attrs(self.email, self.attrs)
        assert response.status_code == 404
        request = self.httpx_mock.get_request(url=self.url)
        assert request.method == 'PUT'
        assert json.loads(request.content) == self.attrs


class TestMarkOrganizationUser:
    @pytest.fixture(autouse=True)
    def setup(self, httpx_mock, mocker):
        self.httpx_mock = httpx_mock
        self.mock_get_auth_token = mocker.patch('partners.tasks.user_flags.get_auth_token')
        self.mock_register_cps_user = mocker.patch('partners.tasks.user_flags.register_cps_user.delay')
        self.email = 'test@example.com'
        self.attrs = {'key': 'value'}
        self.response_data = {'key': f'{uuid4()}'}
        self.url = f'https://{settings.DEFAULT_HOST_NAME}/cdb/internal/v0/account/{self.email}/organization-attrs'

    def test_mark_organization_user_successful_response(self):
        self.mock_get_auth_token.return_value = 'fake_token'
        self.httpx_mock.add_response(method='PUT', url=self.url, json=self.response_data, status_code=200)
        response = mark_organization_user(self.email)
        assert response == self.response_data
        self.mock_register_cps_user.assert_not_called()

    def test_mark_organization_user_not_found(self):
        self.mock_get_auth_token.return_value = 'fake_token'
        self.mock_register_cps_user.return_value = None
        self.httpx_mock.add_response(method='PUT', url=self.url, json=self.response_data, status_code=404)
        response = mark_organization_user(self.email)
        assert response is None
        self.mock_register_cps_user.assert_called_once_with(self.email)

    @pytest.mark.parametrize('status_code, side_effect, expected_exception', [
        (500, None, httpx.HTTPStatusError),
        (400, None, httpx.HTTPStatusError),
        (None, httpx.TimeoutException('Timeout'), httpx.TimeoutException),
    ])
    def test_mark_organization_user_failed_response(self, status_code, side_effect, expected_exception):
        self.mock_get_auth_token.return_value = 'fake_token'
        if status_code:
            self.httpx_mock.add_response(method='PUT', url=self.url, json=self.response_data, status_code=status_code)
        else:
            self.httpx_mock.add_exception(side_effect, method='PUT', url=self.url)
        with pytest.raises(expected_exception):
            mark_organization_user(self.email)
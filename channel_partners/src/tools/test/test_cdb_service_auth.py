from time import sleep
from uuid import uuid4

import httpx
import pytest
from django.core.cache import caches
from django.test import override_settings
from mock.mock import call

import tools.cdb_service_auth
from tools.cdb_service_auth import (
    SECRET_CACHE_KEY,
    get_auth_token,
)


@pytest.mark.no_service_auth_mock
@pytest.mark.httpx_mock(can_send_already_matched_responses=True)
class TestGetAuthToken:
    @pytest.fixture(autouse=True)
    def setup(self):
        pass

    @override_settings(AUTH_SRV_PROVIDERS="")
    @override_settings(IS_PRIVATE_CLOUD=False)
    def test_missing_settings_public(self, mocker):
        with pytest.raises(ValueError) as exc:
            get_auth_token()
        assert str(exc.value) == "Missing required auth settings."

    def test_timeout_error(self, mock_service_auth_token):
        error_text = f"Timeout {uuid4()}"
        mock_service_auth_token(side_effect=httpx.TimeoutException(error_text))
        with pytest.raises(httpx.TimeoutException) as exc:
            get_auth_token()
        assert str(exc.value) == error_text

    def test_http_status_error(self, mock_service_auth_token):
        data = mock_service_auth_token(status_code=400)
        with pytest.raises(httpx.HTTPStatusError) as exc:
            get_auth_token()

    def test_decoding_error(self, mock_service_auth_token):
        data = mock_service_auth_token(side_effect=httpx.DecodingError("Decoding error"))
        with pytest.raises(httpx.DecodingError) as exc:
            get_auth_token()
        assert str(exc.value) == "Decoding error"

    def test_successful_request(self, mock_service_auth_token, mocker):
        token = str(uuid4())
        spy_cache_set = mocker.spy(caches['local'], 'set')
        spy_cache_get = mocker.spy(caches['local'], 'get')
        data = mock_service_auth_token(token=token, expires_in=21)
        assert get_auth_token() == token
        assert spy_cache_set.call_count == 1
        assert spy_cache_get.call_count == 1
        assert spy_cache_set.call_args == call(SECRET_CACHE_KEY, token, 1)
        # test cached token
        assert get_auth_token() == token
        assert spy_cache_set.call_count == 1
        assert spy_cache_get.call_count == 2
        # test expired cache
        sleep(1)
        assert get_auth_token() == token
        assert spy_cache_set.call_count == 2
        assert spy_cache_get.call_count == 3

    @override_settings(AUTH_SRV_PROVIDERS="")
    @override_settings(IS_PRIVATE_CLOUD=True)
    def test_predefined_token_private_cloud(self, mocker):
        spy_get_internal_token = mocker.spy(tools.cdb_service_auth, 'get_internal_token')
        token = get_auth_token()
        assert token == "token_is_unavailable"
        assert spy_get_internal_token.call_count == 0

    @override_settings(IS_PRIVATE_CLOUD=True)
    def test_service_token_private_cloud(self, mocker, mock_service_auth_token):
        token = str(uuid4())
        mock_service_auth_token(token=token)
        spy_get_internal_token = mocker.spy(tools.cdb_service_auth, 'get_internal_token')
        token = get_auth_token()
        assert token == token
        assert spy_get_internal_token.call_count == 1

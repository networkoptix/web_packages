from time import sleep
from uuid import uuid4

import httpx
import pytest
from django.core.cache import caches
from mock.mock import call

from tools.cdb_service_auth import (
    SECRET_CACHE_KEY,
    get_auth_token,
)


@pytest.mark.no_service_auth_mock
class TestGetAuthToken:
    @pytest.fixture(autouse=True)
    def setup(self):
        pass

    def test_missing_settings(self, mocker):
        mocker.patch('tools.cdb_service_auth.settings.AUTH_SRV_PROVIDERS', '')
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

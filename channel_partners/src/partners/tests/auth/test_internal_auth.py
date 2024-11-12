from datetime import (
    datetime,
    timezone,
)
from uuid import uuid4

import pytest
from nx_jwt.jwt_auth import SAJWTPayload
from rest_framework.exceptions import AuthenticationFailed

from accounts.models import Account
from conftest import RequestFactory
from partners.auth.indentity import NxInternalService
from partners.auth.internal_auth import NxS2SAuthentication
from tools.exception import ErrorCodes


class TestNxS2SAuthentication:

    @pytest.fixture(autouse=True)
    def setup(self, cloud_test_host, mocker, arf):
        self.now = int(datetime.now(timezone.utc).timestamp())
        self.valid_payload = {
            'auth_time': self.now - 1000,
            'client_id': 'channel_partners_service',
            'exp': self.now + 2600,
            'iat': self.now - 1000,
            'jti': 'ac03b35e-1cd7-411e-8b12-388cc09ba104',
            'scope': '[{"service":"cloud_db","rules":[{"method":"PUT","path":"/cdb/internal/v0/account/[^/]+/organization-attrs/?"},{"method":"POST","path":"/cdb/internal/accounts/info/?"}]}, {"service": "channel_partners"}]',
            'sub': 'channel_partners_service',
            'token_use': 'access',
            'version': 2
        }
        self.token = f'Service {uuid4()}'
        self.wrong_keyword = f'Bearer {uuid4()}'
        self.hostname = cloud_test_host.hostname
        self.mock_decode_jwt_token = mocker.patch('partners.auth.internal_auth.get_sa_token_payload')

    def request_factory(self, token):
        arf = RequestFactory(cloud_host=self.hostname, headers={'Authorization': token})
        return arf.get('/')

    def test_valid_token(self):
        token_payload = SAJWTPayload(**self.valid_payload)
        self.mock_decode_jwt_token.return_value = token_payload
        request = self.request_factory(self.token)
        authenticator = NxS2SAuthentication()
        user, token = authenticator.authenticate(request)
        assert isinstance(user, Account)
        assert token == self.token.replace('Service ', '')
        assert isinstance(request.internal_service, NxInternalService)
        assert request.internal_service.token_payload == token_payload
        assert request.internal_service.id == token_payload.token_hash()

    def test_wrong_keyword(self):
        request = self.request_factory(self.wrong_keyword)
        authenticator = NxS2SAuthentication()
        assert authenticator.authenticate(request) is None

    def test_no_payload(self):
        self.mock_decode_jwt_token.return_value = None
        request = self.request_factory(self.token)
        authenticator = NxS2SAuthentication()
        with pytest.raises(AuthenticationFailed) as ex:
            authenticator.authenticate(request)
        assert ex.value.detail == 'Invalid or expired token.'
        assert ex.value.detail.code == ErrorCodes.invalid_token

    def test_invalid_scope(self):
        payload = self.valid_payload.copy()
        payload['scope'] = '[{"service":"cloud_db","rules":[{"method":"PUT","path":"/cdb/internal/v0/account/[^/]+/organization-attrs/?"},{"method":"POST","path":"/cdb/internal/accounts/info/?"}]}]'
        token_payload = SAJWTPayload(**payload)
        self.mock_decode_jwt_token.return_value = token_payload
        request = self.request_factory(self.token)
        authenticator = NxS2SAuthentication()
        with pytest.raises(AuthenticationFailed) as ex:
            authenticator.authenticate(request)
        assert ex.value.detail == 'Invalid or expired token.'
        assert ex.value.detail.code == ErrorCodes.invalid_token_scope

import zlib
from uuid import uuid4

import pytest
from unittest.mock import patch, MagicMock
from django.contrib.auth import get_user_model
from django.core.exceptions import ObjectDoesNotExist

from api.account_backend import BearerAuthentication, Auth, AccountBackend
from cloud.helpers.exceptions import APINotAuthorisedException, ErrorCodes, APILogicException

User = get_user_model()


class TestBearerAuthentication:
    @patch.object(Auth, 'validate_token')
    def test_authenticate_credentials_with_valid_token(self, mock_validate_token, superuser):
        mock_validate_token.return_value = {'username': superuser.email}
        auth = BearerAuthentication()
        assert auth.authenticate_credentials('valid_token') == (superuser, 'valid_token')

    @patch.object(Auth, 'validate_token')
    def test_authenticate_credentials_with_invalid_token(self, mock_validate_token):
        mock_validate_token.side_effect = APINotAuthorisedException(error_text='error text')
        auth = BearerAuthentication()
        assert auth.authenticate_credentials('invalid_token') == None

    @patch.object(Auth, 'validate_token')
    def test_authenticate_credentials_with_non_existent_user(self, mock_validate_token, superuser):
        mock_validate_token.return_value = {'username': 'non_existent_user@test.com'}
        auth = BearerAuthentication()
        assert auth.authenticate_credentials('valid_token') == (None, 'valid_token')


class TestAccountBackendAuthenticate:
    @pytest.fixture(autouse=True)
    def setup(self, mocker, superuser):
        self.mock_validate_token = mocker.patch('cloud.controllers.cloud_api.Auth.validate_token', autospec=True)
        self.mock_account_get = mocker.patch('cloud.controllers.cloud_api.Account.get',
                                             autospec=True,
                                             return_value={'customization': 'default',
                                                           'fullName': 'Test User',
                                                           'email': "test_user@networkoptix.com"})

    def test_password_successful_scenario(self, arf, superuser):
        data = {'username': superuser.email, 'password': 'valid_password'}
        request = arf.get('/', data)
        request.session = MagicMock()
        self.mock_account_get.return_value = {'email': superuser.email}
        account_backend = AccountBackend()
        user = account_backend.authenticate(request=request, username=data['username'], password=data['password'])
        assert user == superuser

    def test_password_invalid_credentials(self, arf, superuser):
        data = {'username': 'test@test.com', 'password': 'invalid_password'}
        request = arf.get('/', data)
        request.session = {}
        self.mock_account_get.side_effect = APINotAuthorisedException('error text')
        account_backend = AccountBackend()
        user = account_backend.authenticate(request=request, username=data['username'], password=data['password'])
        assert user is None
        assert 'account_blocked' not in request.session

    def test_password_blocked_account(self, arf, superuser):
        data = {'username': 'test@test.com', 'password': 'invalid_password'}
        request = arf.get('/', data)
        request.session = {}
        self.mock_account_get.side_effect = APINotAuthorisedException('error text',
                                                                      error_code=ErrorCodes.account_blocked)
        account_backend = AccountBackend()
        user = account_backend.authenticate(request=request, username=data['username'], password=data['password'])
        assert user is None
        assert request.session['account_blocked'] is True

    def test_password_non_existent_account(self, arf, superuser):
        data = {'username': superuser.email, 'password': 'valid_password'}
        request = arf.get('/', data)
        request.session = {}
        self.mock_account_get.return_value = {'email': 'test@test.com'}
        account_backend = AccountBackend()
        with pytest.raises(APILogicException) as e:
            account_backend.authenticate(request=request, username=data['username'], password=data['password'])
        assert str(e.value) == 'Login does not match users email'

    def test_password_not_valid_temp_cred(self, arf, superuser):
        email = 'test@test.com'
        temp_crc32 = zlib.crc32(email.encode('utf-8')) & 0xffffffff
        data = {'username': f'{uuid4().int}-{temp_crc32}', 'password': 'valid_password'}
        request = arf.get('/', data)
        request.session = {}
        self.mock_account_get.return_value = {'email': 'email@test.com'}
        account_backend = AccountBackend()
        with pytest.raises(APILogicException) as e:
            account_backend.authenticate(request=request, username=data['username'], password=data['password'])
        assert str(e.value) == 'Login does not match users email'

    def test_password_valid_temp_cred(self, arf, superuser):
        temp_crc32 = zlib.crc32(superuser.email.encode('utf-8')) & 0xffffffff
        data = {'username': f'{uuid4().int}-{temp_crc32}', 'password': 'valid_password'}
        request = arf.get('/', data)
        request.session = {}
        self.mock_account_get.return_value = {'email': superuser.email}
        account_backend = AccountBackend()
        user = account_backend.authenticate(request=request, username=data['username'], password=data['password'])
        assert user == superuser

    def test_token_successful_scenario(self, arf, superuser):
        data = {'username': superuser.email, 'password': 'valid_password'}
        request = arf.get('/', data, HTTP_AUTHORIZATION='Bearer valid_token')
        request.session = MagicMock()
        self.mock_validate_token.return_value = {'username': superuser.email}
        account_backend = AccountBackend()
        user = account_backend.authenticate(request=request)
        assert user == superuser

    def test_token_not_authorized(self, arf, superuser):
        data = {'username': superuser.email, 'password': 'valid_password'}
        request = arf.get('/', data, HTTP_AUTHORIZATION='Bearer valid_token')
        request.session = MagicMock()
        self.mock_validate_token.side_effect = APINotAuthorisedException('error text')
        account_backend = AccountBackend()
        user = account_backend.authenticate(request=request, username=data['username'], password=data['password'])
        assert user is None
        assert 'account_blocked' not in request.session

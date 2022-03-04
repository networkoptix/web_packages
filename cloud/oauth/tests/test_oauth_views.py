from django.http.response import HttpResponse
import pytest
from unittest.mock import MagicMock, patch, Mock
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.request import Request
from rest_framework.response import Response
from uuid import uuid4
from oauth.views import *


class TestOauthViews:
    @pytest.fixture(autouse=True)
    def setup_instance(self, django_user_model, arf):
        self.email = 'testuser@email.com'
        self.arf = arf
        self.password = 'wasd1234'
        self.user = django_user_model(email=self.email)

    def assert_wrong_parameters(self, response):
        assert response.status_code == 400
        assert response.data['resultCode'] == 'wrongParameters'
        assert response.data['errorText'] == 'Parameters are missing'

    # Test helper functions
    def test_check_signature(self, mocker):
        mock_validate_signature = mocker.patch(
            'cloud.controllers.cloud_api.System.validate_signature', return_value='validate signature')
        system_id = '00000000-0000-0000-0000-000000000000'
        mock_valid_scope = 'cloudSystemId=' + system_id
        signature = str(uuid4())
        redirect_uri = str(uuid4())

        # Valid check_signature
        check_signature(signature, mock_valid_scope, redirect_uri)
        mock_validate_signature.assert_called_once_with(
            system_id, signature, redirect_uri)

        # Test exceptions
        with pytest.raises(APIRequestException, match='Scope is missing a valid system id'):
            check_signature(signature, '', redirect_uri)

        mock_validate_signature = mocker.patch(
            'cloud.controllers.cloud_api.System.validate_signature', side_effect=APILogicException('', ''))
        with pytest.raises(APIRequestException, match='Signature does not match'):
            check_signature(signature, mock_valid_scope, redirect_uri)

    def test_get_param(self):
        query_param_value = str(uuid4())
        req = Request(self.arf.get(f'/?item={query_param_value}'))
        assert get_param(req, 'item') == query_param_value

        data_param_value = str(uuid4())

        class Req:
            method = 'POST'
            data = {
                'item': data_param_value
            }
        assert get_param(Req(), 'item') == data_param_value

    def test_set_params_for_redirect(self):
        code = str(uuid4())
        state = str(uuid4())
        params = set_params_for_redirect(code, state)
        assert params['code'] == code
        assert params['state'] == state

    # Each view being tested has a wrapper that provides it a request
    # Authenticate View Tests
    def authenticate(self, password, response_type, request_data=None, signature=None):
        if request_data is None:
            data = {
                'email': self.email,
                'password': password,
                'response_type': response_type,
                'client_id': 'cloud_portal',
                'redirect_uri': f'https://{uuid4()}.com'
            }
        else:
            data = request_data
        if signature:
            data['signature'] = signature
        # The path doesn't actually do anything here, but a path is required and it may as well be the correct path
        request = self.arf.post('/oauth/authenticate', data=data)
        request.session = {}
        return authenticate(request)

    def test_valid_authenticate(self, mocker):
        mocker.patch('cloud.controllers.cloud_api.Auth.get_code',
                     return_value={'code': str(uuid4())})
        mocked_check_signature = mocker.patch(
            'oauth.views.check_signature', return_value='')
        test_signature = str(uuid4())
        redirect_uri = f'https://{uuid4()}.com'
        request_data = {
            'email': self.email,
            'password': self.password,
            'response_type': Auth.RESPONSE_TYPE.code,
            'client_id': 'cloud_portal',
            'redirect_uri': redirect_uri
        }
        response = self.authenticate(
            self.password, Auth.RESPONSE_TYPE.code, request_data, test_signature)

        mocked_check_signature.assert_called_with(
            test_signature, None, redirect_uri)
        assert response.status_code == 200

    def test_authenticate_raises_wrong_code(self):
        response = self.authenticate(self.password, Auth.RESPONSE_TYPE.token)

        assert response.status_code == 400
        assert response.data['resultCode'] == 'badRequest'
        assert response.data['errorText'] == 'Invalid value for response_type. It must be code.'

    def test_authenticate_raises_not_authorized(self, mocker):
        # This exception requires some positional arguments
        mocker.patch('oauth.views.Auth.get_code', side_effect=APINotAuthorisedException(
            'Invalid credentials'), return_value='')
        response = self.authenticate('wrongPassword', Auth.RESPONSE_TYPE.code)

        assert response.status_code == 401
        assert response.data['resultCode'] == 'notAuthorized'
        assert response.data['errorText'] == 'Invalid credentials'

    # logout View Tests
    def logout(self, access_token=None, refresh_token=str(uuid4()), cloud_access_token=str(uuid4())):
        self.data = {
            'cloudAccessToken': cloud_access_token,
            'refreshToken': refresh_token
        }
        if access_token:
            self.data['accessToken'] = access_token
        request = self.arf.post('/oauth/logout/', data=self.data)
        request.session = {}
        return logout(request)

    def test_valid_logout(self, mocker):
        mock_delete_token = mocker.patch(
            'cloud.controllers.cloud_api.Auth.delete_token', return_value=True)
        response = self.logout(access_token=str(uuid4()))

        assert response.status_code == 200
        assert response.data == 'Successfully logged out.'
        # All three 'try' statements were run
        assert mock_delete_token.call_count == 3

    def test_logout_invalid_tokens(self, mocker):
        mock_delete_token = mocker.patch(
            'cloud.controllers.cloud_api.Auth.delete_token', side_effect=APILogicException('', ''))
        response = self.logout(access_token=str(uuid4()))

        assert response.status_code == 401
        assert mock_delete_token.call_count == 1
        assert response.data['errorText'] == 'Invalid cloud access and refresh token'
        assert response.data['resultCode'] == 'notAuthorized'

    def test_logout_no_access_token(self, mocker):
        # test that Auth.delete_token throws an error, but logout still succeeds
        mock_delete_token = mocker.patch(
            'cloud.controllers.cloud_api.Auth.delete_token', side_effect=APILogicException('', ''))
        # No access token
        response = self.logout()

        assert response.status_code == 200
        assert response.data == 'Successfully logged out.'
        # First 'try' statement was skipped because access_token does not exist
        assert mock_delete_token.call_count == 2

    # register_client View Tests
    def register_client(self):
        self.description = str(uuid4())
        self.name = str(uuid4())
        data = {
            'description': self.description,
            'name': self.name
        }
        request = self.arf.post('/oauth/register_client/', data=data)
        request.user = self.user
        return register_client(request)

    def test_register_client(self, mocker):
        mock_auth_register_client = mocker.patch(
            'cloud.controllers.cloud_api.Auth.register_client', return_value=Response())
        response = self.register_client()
        args, kwargs = mock_auth_register_client.call_args_list[0]

        assert self.description in args
        assert self.name in args
        assert response.status_code == 200

    # token View Tests
    def token(self, data):
        request = self.arf.post('/oauth/token/', data=data)
        request.session = {}
        return token(request)

    @pytest.fixture()
    def mock_get_ip(self, monkeypatch):
        self.mock_ip = str(uuid4())
        mock_func = MagicMock(return_value=self.mock_ip)
        monkeypatch.setattr('oauth.views.get_ip', mock_func)

    def test_token_valid_refresh_token(self, mock_get_ip, mocker):
        mock_get_refresh_token = mocker.patch(
            'cloud.controllers.cloud_api.Auth.get_refresh_token', return_value=Response())
        # Refresh token grant_type and token response type
        data = {
            'refresh_token': str(uuid4()),
            'scope': str(uuid4())
        }
        response = self.token(data)

        assert response.status_code == 200
        mock_get_refresh_token.assert_called_once_with(
            data['refresh_token'], ip=self.mock_ip, scope=data['scope'])

    def test_token_valid_authorization_code(self, mock_get_ip, mocker):
        mock_get_access_token = mocker.patch(
            'cloud.controllers.cloud_api.Auth.get_access_token', return_value=Response())
        # Authorization code grant_type and token response_type
        data = {
            'code': str(uuid4()),
        }
        response = self.token(data)

        assert response.status_code == 200
        mock_get_access_token.assert_called_once_with(
            data['code'], ip=self.mock_ip)

    def test_token_valid_password(self, mock_get_ip, mocker):
        mock_code = str(uuid4())
        mock_get_code = mocker.patch(
            'cloud.controllers.cloud_api.Auth.get_code', return_value={'code': mock_code})
        mock_check_signature = mocker.patch(
            'oauth.views.check_signature', return_value=True)
        mock_redirect = mocker.patch(
            'oauth.views.redirect', return_value=Response())
        # Password grant_type and code response type
        data = {
            'grant_type': Auth.GRANT_TYPE.password,
            'response_type': Auth.RESPONSE_TYPE.code,
            'code': str(uuid4()),
            'scope': str(uuid4()),
            'email': str(uuid4()),
            'password': str(uuid4()),
            'client_id': str(uuid4()),
            'redirect_uri': str(uuid4()),
            'signature': str(uuid4()),
            'state': str(uuid4()),
        }
        self.token(data)

        mock_check_signature.assert_called_once_with(
            data['signature'], data['scope'], data['redirect_uri'])
        mock_get_code.assert_called_once_with(
            data['email'],
            data['password'],
            client_id=data['client_id'],
            ip=self.mock_ip,
            redirect_uri=data['redirect_uri'],
            scope=data['scope']
        )
        mock_redirect.assert_called_once_with(
            f"{data['redirect_uri']}?{urllib.parse.urlencode(set_params_for_redirect(mock_code, data['state']))}")

    def test_token_require_params_grant_type_and_response_type(self):
        data = {}
        response = self.token(data)

        self.assert_wrong_parameters(response)
        assert 'This field is required.' in response.data['errorData']['grant_type']
        assert 'This field is required.' in response.data['errorData']['response_type']

    def test_token_fails_no_refresh_token(self):
        # Refresh token grant_type with no refresh_token provided leads to a require_params error
        data = {
            'response_type': Auth.RESPONSE_TYPE.token,
            'grant_type': Auth.GRANT_TYPE.refresh_token
        }
        response = self.token(data)

        self.assert_wrong_parameters(response)
        assert 'This field is required.' in response.data['errorData']['refresh_token']

    def test_token_fails_no_code(self):
        data = {
            'response_type': Auth.RESPONSE_TYPE.token,
            'grant_type': Auth.GRANT_TYPE.authorization_code
        }
        response = self.token(data)

        self.assert_wrong_parameters(response)
        assert 'This field is required.' in response.data['errorData']['code']

    def test_token_password_require_params(self):
        # Test error from require_params in password authentication
        data = {
            'grant_type': Auth.GRANT_TYPE.password,
            'response_type': Auth.RESPONSE_TYPE.code
        }
        response = self.token(data)

        self.assert_wrong_parameters(response)
        assert 'This field is required.' in response.data['errorData']['email']
        assert response.data['errorData']['password']
        assert 'This field is required.' in response.data['errorData']['client_id']
        assert 'This field is required.' in response.data['errorData']['redirect_uri']

    def test_token_invalid_combination(self):
        def assert_invalid():
            assert response.status_code == 400
            assert response.data['resultCode'] == 'badRequest'
            assert response.data['errorText'] == 'Invalid grant_type and response_type combination'
        # Test three different invalid combinations
        data = {
            'grant_type': Auth.GRANT_TYPE.password,
            'response_type': Auth.RESPONSE_TYPE.token,
            'email': str(uuid4()),
            'password': str(uuid4()),
            'client_id': str(uuid4()),
            'redirect_uri': str(uuid4()),
        }
        response = self.token(data)
        assert_invalid()

        data = {
            'grant_type': Auth.GRANT_TYPE.authorization_code,
            'response_type': Auth.RESPONSE_TYPE.code
        }
        response = self.token(data)
        assert_invalid()

        data = {
            'grant_type': Auth.GRANT_TYPE.refresh_token,
            'response_type': Auth.RESPONSE_TYPE.code
        }
        response = self.token(data)
        assert_invalid()

    # revoke_token View Tests
    def revoke_token(self, data):
        request = self.arf.post('/oauth/revoke/', data=data)
        request.session = {}
        request.user = self.user
        return revoke_token(request)

    def test_valid_revoke_token(self, mocker):
        mock_delete_token = mocker.patch(
            'cloud.controllers.cloud_api.Auth.delete_token', return_value=Response())
        data = {
            'token': str(uuid4())
        }
        response = self.revoke_token(data)
        args, kwargs = mock_delete_token.call_args_list[0]

        assert response.status_code == 200
        assert data['token'] in args

    def test_revoke_token_require_params(self):
        response = self.revoke_token({})

        self.assert_wrong_parameters(response)
        assert 'This field is required.' in response.data['errorData']['token']

    # validate_token View Tests
    def validate_token(self, data):
        request = self.arf.get('/oauth/introspect/', data=data)
        request.session = {}
        request.user = self.user
        return validate_token(request)

    def test_valid_validate_token(self, mocker):
        mock_validate_token = mocker.patch(
            'cloud.controllers.cloud_api.Auth.validate_token', return_value=Response())
        data = {
            'token': str(uuid4())
        }
        response = self.validate_token(data)
        args, kwargs = mock_validate_token.call_args_list[0]

        assert response.status_code == 200
        assert data['token'] in args

    def test_validate_token_require_params(self):
        response = self.validate_token({})

        self.assert_wrong_parameters(response)
        assert 'This field is required.' in response.data['errorData']['token']

from api.views import systems
from api.views.systems import *

from django.contrib.auth.models import AnonymousUser
from django.http import QueryDict
from django.test import RequestFactory

from rest_framework import status
from rest_framework.test import force_authenticate
import pytest


def test_digest():
    login = 'login'
    password = 'pass'
    realm = 'VMS'
    nonce = 'aiyYJ80GY286xJNVuxmC21/Er1eTIs=hzuvez'

    auth_get = digest(login, password, realm, nonce, 'GET')
    assert auth_get == b'bG9naW46YWl5WUo4MEdZMjg2eEpOVnV4bUMyMS9FcjFlVElzPWh6dXZlejplZmI4MDQ5NWYwZDNhMDM2Y2M5OTE1NjlkMzkzNDNlMg=='
    auth_post = digest(login, password, realm, nonce, 'POST')
    assert auth_post == b'bG9naW46YWl5WUo4MEdZMjg2eEpOVnV4bUMyMS9FcjFlVElzPWh6dXZlejo4ZDRlZmE1NTVkOWFhOGU1MDQ3NWQwOWNlNjQ3M2JjMA=='
    auth_play = digest(login, password, realm, nonce, 'PLAY')
    assert auth_play == b'bG9naW46YWl5WUo4MEdZMjg2eEpOVnV4bUMyMS9FcjFlVElzPWh6dXZlejo1NGE0YTQwNzQzNmVlMGQ0YTA5MGFmYThlZDJlYjNkZQ=='


class TestSystemViews:
    user = 'system_user@test.com'
    password = 'systemPass'
    system_id = 'dd11cd4f-c74b-4589-9457-d126502fdff6'
    slave_system_id = 'e0a0d0c8-afe9-482a-9617-a80c760f1208'
    system_name = 'A System'
    sample_data = {'d1': 'd1val', 'd2': 'd2val'}

    @pytest.fixture(autouse=True)
    def setup(self, django_user_model, arf, mocker):
        self.email = 'sys_view@test.com'
        self.email2 = 'sys_view2@test.com'
        self.password = 'qweasd123'
        self.user = django_user_model(email=self.email)
        self.session = {'login': self.email, 'password': self.password}
        self.factory = arf.defaults['session'] = 'test'
        self.tokens = mocker.sentinel.test_tokens

    @pytest.fixture()
    def temp_login_mock(self, mocker):
        mock = mocker.patch.object(cloud_api, 'TempLogin')
        # Mock context manager
        mock.return_value.__enter__.return_value.tokens = self.tokens
        return mock

    def test_system(self, arf, mocker):
        system_data = {'systems': ['sys1'], 'd2': 'd2Val'}
        system_get_mock = mocker.patch.object(cloud_api.System, 'get')
        system_get_mock.return_value = system_data
        request = arf.get(f'/api/systems/{self.system_id}/')
        request.session = self.session
        request.user = self.user

        response = system(request, self.system_id)
        system_get_mock.assert_called()
        _, system_id_arg = system_get_mock.call_args.args
        assert system_id_arg == self.system_id
        assert response.status_code == status.HTTP_200_OK
        assert response.data == system_data['systems']

    def test_list_systems(self, arf, mocker):
        system_data = {'systems': ['sys1', 'sys2'], 'd2': 'd2Val'}
        system_list_mock = mocker.patch.object(cloud_api.System, 'list')
        system_list_mock.return_value = system_data
        request = arf.get(f'/api/systems/')
        request.session = self.session
        request.user = self.user

        response = list_systems(request)
        system_list_mock.assert_called()
        assert response.status_code == status.HTTP_200_OK
        assert response.data == system_data['systems']

    def test_sharing_get(self, arf, mocker):
        # Check unauthorized
        share_data = {'sharing': ['user1', 'user2'], 'd2': 'd2Val'}
        request = arf.get(f'/api/systems/{self.system_id}/users')
        request.user = AnonymousUser()
        request.session = {}
        response = sharing(request, self.system_id)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert response.data['resultCode'] == ErrorCodes.not_authorized.value

        # Check authorized
        share_mock = mocker.patch.object(cloud_api.System, 'users')
        share_mock.return_value = share_data
        request.user = self.user
        request.session = self.session
        response = sharing(request, self.system_id)
        share_mock.assert_called()
        _, system_id_arg = share_mock.call_args.args
        assert system_id_arg == self.system_id
        assert response.status_code == status.HTTP_200_OK
        assert response.data == share_data['sharing']

    def sharing_post(self, request, share_data, share_mock):
        response = sharing(request, self.system_id)
        share_mock.assert_called()
        assert response.status_code == status.HTTP_200_OK
        assert response.data == share_data
        return response

    def test_sharing_post(self, arf, mocker, temp_login_mock):
        request_data = {'user_email': self.email2, 'role': 'viewer'}
        share_data = {'sharing': ['user1', 'user2'], 'd2': 'd2Val'}
        share_mock = mocker.patch.object(cloud_api.System, 'share')
        share_mock.return_value = share_data

        # Unauthorized
        request = arf.post(f'/api/systems/{self.system_id}/users', data=request_data)
        request.user = AnonymousUser()
        request.session = {}
        response = sharing(request, self.system_id)
        assert response.status_code == status.HTTP_400_BAD_REQUEST

        # Session auth
        request = arf.post(f'/api/systems/{self.system_id}/users', data=request_data)
        request.user = self.user
        request.session = self.session

        self.sharing_post(request, share_data, share_mock)
        _, system_id_arg, user_email_arg, role_arg = share_mock.call_args.args
        assert system_id_arg == self.system_id
        assert user_email_arg == request_data['user_email']
        assert role_arg == request_data['role']

        # Data auth
        request_data.update({'email': self.email, 'password': self.password})
        request = arf.post(f'/api/systems/{self.system_id}/users', data=request_data)
        request.user = AnonymousUser()
        request.session = {}
        self.sharing_post(request, share_data, share_mock)

        temp_login_mock.assert_called_with(self.email, self.password)
        share_mock.assert_called_with(self.tokens, self.system_id, request_data['user_email'], request_data['role'])

    def test_get_auth(self, arf, mocker):
        def mock_digest(*args, **kwargs):
            method = kwargs.get('method', '') or (args[4] if len(args) >= 5 else None)
            if method == 'GET':
                return 'get_key'
            elif method == 'POST':
                return 'post_key'
            elif method == 'PLAY':
                return 'play_key'

        nonce_data = {'nonce': 'aiyYJ80GY286xJNVuxmC21/Er1eTIs=hzuvez'}
        nonce_mock = mocker.patch.object(cloud_api.System, 'get_nonce', return_value=nonce_data)
        temp_creds = {'login': 'temp_user', 'password': 'temp_pass'}
        temp_cred_mock = mocker.patch.object(
            cloud_api.Account, 'create_temporary_credentials',
            return_value={'login': 'temp_user', 'password': 'temp_pass'}
        )

        digest_mock = mocker.patch.object(systems, 'digest')
        digest_mock.side_effect = mock_digest

        request = arf.get(f'/api/systems/{self.system_id}/auth')
        # request.session = self.session
        request.user = self.user

        response = get_auth(request, self.system_id)
        _, system_id_arg = nonce_mock.call_args.args
        assert system_id_arg == self.system_id
        assert temp_cred_mock.call_args.kwargs['credential_type'] == 'short'

        digest_mock.assert_any_call(temp_creds['login'], temp_creds['password'], 'VMS', nonce_data['nonce'], 'GET')
        digest_mock.assert_any_call(temp_creds['login'], temp_creds['password'], 'VMS', nonce_data['nonce'], 'POST')
        digest_mock.assert_any_call(temp_creds['login'], temp_creds['password'], 'VMS', nonce_data['nonce'], 'PLAY')
        assert response.data == {'authGet': 'get_key', 'authPost': 'post_key', 'authPlay': 'play_key'}

    def test_rename(self, arf, mocker):
        rename_mock = mocker.patch.object(cloud_api.System, 'rename')
        rename_mock.return_value = self.sample_data

        rename_data = {'name': 'newName'}
        request = arf.post(f'/api/systems/{self.system_id}/name', data=rename_data)
        request.session = self.session
        request.user = self.user
        response = rename(request, self.system_id)
        _, system_id_arg, name_arg = rename_mock.call_args.args
        assert system_id_arg == self.system_id
        assert name_arg == rename_data['name']
        assert response.data == self.sample_data

    # TODO: Comeback and update this to handle merging with and without password.
    # Problem was that the internal request object could not be evaluated in the assert
    def test_merge(self, arf, mocker):
        merge_mock = mocker.patch.object(cloud_api.System, 'merge')
        merge_mock.return_value = self.sample_data

        # Successful
        merge_data = {'master_system_id': self.system_id, 'slave_system_id': self.slave_system_id, 'password': self.password}
        request = arf.post('/api/systems/merge', data=merge_data)
        request.session = self.session
        request.user = self.user
        response = merge(request)

        assert response.data == self.sample_data

        # Exception handling
        merge_mock.side_effect = APINotAuthorisedException('error_text')
        response = merge(request)
        assert response.status_code == status.HTTP_400_BAD_REQUEST

        merge_mock.side_effect = APIInternalException('error_text', '2', error_data={'d1': 'd1val'})
        response = merge(request)
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_access_roles(self, arf, mocker):
        role_data = {'accessRoles': 'val'}
        access_roles_mock = mocker.patch.object(cloud_api.System, 'access_roles')
        access_roles_mock.return_value = role_data

        request = arf.get(f'/api/systems/{self.system_id}/accessRoles')
        request.session = self.session
        request.user = self.user
        response = access_roles(request, self.system_id)
        _, system_id_arg = access_roles_mock.call_args.args
        assert system_id_arg == self.system_id
        assert response.data == role_data['accessRoles']

    def test_disconnect(self, arf, mocker, temp_login_mock):
        unbind_mock = mocker.patch.object(cloud_api.System, 'unbind')
        disconnect_data = {'password': self.session['password'], 'system_id': self.system_id}

        # Session auth
        request = arf.post(f'/api/systems/disconnect', data=disconnect_data)
        request.session = self.session
        request.user = self.user
        response = disconnect(request)
        _, system_id_arg = unbind_mock.call_args.args
        assert system_id_arg == self.system_id
        assert response.status_code == status.HTTP_200_OK

        # Data auth
        disconnect_data['email'] = self.email
        request = arf.post(f'/api/systems/disconnect', data=disconnect_data)
        request.session = {}
        response = disconnect(request)
        temp_login_mock.assert_called_with(self.user.email, self.password)
        unbind_mock.assert_called_with(self.tokens, self.system_id)
        assert response.status_code == status.HTTP_200_OK

        # No auth
        unbind_mock.side_effect = APINotAuthorisedException('error_text')
        response = disconnect(request)
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_connect(self, arf, mocker, temp_login_mock):
        bind_mock = mocker.patch.object(cloud_api.System, 'bind')
        bind_mock.return_value = self.sample_data
        connect_data = {'name': self.system_name, 'password': self.password}

        # Session auth
        request = arf.post('/api/systems/connect', data=connect_data)
        request.session = self.session
        request.user = self.user
        response = connect(request)
        _, name_arg = bind_mock.call_args.args
        assert name_arg == connect_data['name']
        assert response.data == self.sample_data

        # Data auth
        connect_data['email'] = self.email
        request = arf.post('/api/systems/connect', data=connect_data)
        request.session = {}
        response = connect(request)
        temp_login_mock.assert_called_with(self.user.email, self.password)
        bind_mock.assert_called_with(self.tokens, connect_data['name'])
        assert response.data == self.sample_data

    def test_proxy(self, arf, mocker):
        gw_get_mock = mocker.patch.object(systems.cloud_gateway, 'get')
        gw_get_mock.return_value = self.sample_data
        gw_post_mock = mocker.patch.object(systems.cloud_gateway, 'post')
        gw_post_mock.return_value = self.sample_data
        url = 'some_url'

        request = arf.get(f'/api/systems/{self.system_id}/proxy/{url}')
        request.user = self.user
        request.session = self.session
        response = proxy(request, self.system_id, url)
        gw_get_mock.assert_called_with(self.system_id, url, email=self.email, password=self.password)
        assert response.data == self.sample_data

        send_data = {'send': 'val'}
        request = arf.post(f'/api/systems/{self.system_id}/proxy/{url}', data=send_data)
        request.user = self.user
        request.session = self.session
        response = proxy(request, self.system_id, url)
        query_dict = QueryDict(mutable=True)
        query_dict.update(send_data)
        gw_post_mock.assert_called_with(self.system_id, url, query_dict, email=self.email, password=self.password)
        assert response.data == self.sample_data

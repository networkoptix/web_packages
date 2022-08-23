from django.contrib.sessions.backends.db import SessionStore

import pytest
from rest_framework import status
from rest_framework.request import Request

from api.views.account import *
from cloud.helpers.exceptions import kill_tokens
from notifications.models import PushDevice


def test_kill_tokens(arf, mocker):
    req = arf.get('')
    req.session = {'refresh_token': 'ref_token', 'access_token': 'acc_token'}
    mock = mocker.patch.object(Auth, 'delete_token')
    kill_tokens(req, mock)
    for token in ['ref_token', 'acc_token']:
        mock.assert_any_call(req, token)


def test_login_helper(arf, mocker, django_user_model, mock_session):
    req = arf.post('/')
    req.session = mock_session()
    req.data = {'timezone': 'America/Los_Angeles'}
    token = {'refresh_token': 'ref_token', 'access_token': 'acc_token'}
    user = django_user_model(email='test@test.com')
    req.user = user
    mocker.patch.object(django.contrib.auth, 'login')
    timezone_now = timezone.now()
    now = time.time()
    mocker.patch.object(timezone, 'now', return_value=timezone_now)
    mocker.patch.object(time, 'time', return_value=now)
    mocker.patch.object(Account, 'get', return_value={
                        'account2faEnabled': True})
    mocker.patch.object(Account, 'get_2fa_settings', return_value={'totpExistsForAccount': True})

    resp = login_helper(req, token, user)
    assert req.session['access_token'] == 'acc_token'
    assert req.session['refresh_token'] == 'ref_token'
    assert req.session['timezone'] == 'America/Los_Angeles'
    assert user.activated_date == timezone_now
    assert req.session['time'] == now
    assert resp.data == AccountSerializer(req).data
    assert req.session['has2fa'] is True

    mocker.patch.object(Account, 'get', return_value={
                        'account2faEnabled': False})

    login_helper(req, token, user)
    assert req.session['has2fa'] is False


class TestAccountViews:
    @pytest.fixture(autouse=True)
    def setup(self, django_user_model, arf, mocker):
        self.email = 'user_email@test.com'
        self.password = "wasd1234"
        self.user = django_user_model(email=self.email)
        self.session = {'login': self.email, 'password': self.password}
        self.arf = arf
        self.mocker = mocker

    def register(self, email):
        self.manager_mock = self.mocker.patch.object(models, 'AccountManager')
        self.manager_mock.return_value.check_if_activated.return_value = False
        data = {
            'email': email,
            'first_name': 'First',
            'last_name': 'Last',
            'password': 'qweasd1234'
        }
        self.expected_data = data.copy()
        self.expected_data.update({'language': 'en_US', 'IP': '8.8.8.8'})
        req = self.arf.post('/api/account/register', data=data,
                            HTTP_X_FORWARDED_FOR='8.8.8.8', REMOTE_ADDR='8.8.8.8')
        req.session = {}
        return register(req)

    def test_register_new(self):
        serializer_mock = self.mocker.patch(
            'api.views.account.CreateAccountSerializer')
        resp = self.register('new@test.com')
        assert resp.data == {'activated': False}
        assert dict(
            serializer_mock.call_args.kwargs['data'].items()) == self.expected_data
        serializer_mock.return_value.save.assert_called()

    def test_register_existing(self, active_user):
        resp = self.register(active_user.email)
        assert resp.data == {'resultCode': 'alreadyExists',
                             'errorText': 'User already registered', 'errorData': None}

    def test_register_cloud_invite(self, active_user):
        active_user.is_active = False
        active_user.save()

        resp = self.register(active_user.email)
        assert self.manager_mock.return_value.register_cloud_invite_user.called_with(
            self.expected_data['email'], self.expected_data['password'], self.expected_data
        )
        assert resp.data == {'activated': False}

    def test_logout(self):
        req = self.arf.post('/api/account/logout')
        req.user = self.user
        session_data = {'access_token': 'a',
                        'refresh_token': 'b', 'timezone': 'c', 'time': 'd'}
        req.session = SessionStore()
        req.session.update(session_data)
        self.mocker.patch.object(Auth, 'delete_token')

        resp = logout(req)
        assert resp.status_code == status.HTTP_200_OK
        for key in session_data:
            assert key not in req.session

    def test_index_anonymous(self):
        req = self.arf.get('/api/account')
        resp = index(req)
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data == {'is_authenticated': False}

    @pytest.fixture()
    def mock_cdb_account(self):
        return self.mocker.patch.object(Account, 'get', return_value={'account2faEnabled': True})

    def test_index_get(self, mock_cdb_account, active_user):
        mock_get_2fa_settings = self.mocker.patch.object(
            Account, 'get_2fa_settings', return_value={'totpExistsForAccount': True})
        req = self.arf.get('/api/account')
        req.user = active_user
        req.session = self.mocker.MagicMock()
        req.session.get = lambda _, val: val

        # Test with totp exists
        resp = index(req)
        assert resp.status_code == status.HTTP_200_OK
        expected_data = AccountSerializer(req).data

        assert resp.data == expected_data

        # Test with totp doesn't exist
        mock_get_2fa_settings.return_value = {'totpExistsForAccount': False}
        resp = index(req)
        assert not resp.data['totpExistsForAccount']

    def test_index_post(self, mock_cdb_account, active_user):
        mock_get_2fa_settings = self.mocker.patch.object(
            Account, 'get_2fa_settings', return_value={'totpExistsForAccount': True})
        account_update_mock = self.mocker.patch.object(Account, 'update')
        req = self.arf.post(
            '/api/account', data={'first_name': 'new name', 'last_name': 'new last', 'language': 'en_US'})
        req.user = active_user
        req.session = self.mocker.MagicMock()
        req.session.get = lambda _, val: val

        resp = index(req)
        expected_data = AccountUpdateSerializer(req).data

        assert resp.data == expected_data
        assert resp.status_code == status.HTTP_200_OK
        assert account_update_mock.call_args.args[1] == 'new name'
        assert account_update_mock.call_args.args[2] == 'new last'

    def test_auth_key(self):
        req = self.arf.post('/api/account/authKey')
        req.user = self.user
        self.mocker.patch.object(Account, 'create_temporary_credentials', return_value={
                                 'login': 'log', 'password': 'pass'})

        resp = auth_key(req)
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data == {'auth_key': b'bG9nOnBhc3M='}

    @pytest.fixture()
    def delete_mock(self):
        def delete(email, password):
            if password == 'pass':
                return True
            else:
                raise APINotAuthorisedException('Incorrect password')

        return self.mocker.patch.object(Account, 'delete', side_effect=delete)

    def test_delete_user(self, delete_mock, active_user):
        req = self.arf.post('/api/account/delete', data={'password': 'pass'})
        req.user = active_user
        req.session = {}
        kill_token_mock = self.mocker.patch('api.views.account.kill_tokens')
        kill_session_mock = self.mocker.patch('api.views.account.kill_session')

        resp = delete_user(req)
        assert resp.status_code == status.HTTP_200_OK
        assert not models.Account.objects.filter(
            email=active_user.email).exists()
        kill_token_mock.assert_called()
        kill_session_mock.assert_called()

    def test_delete_user_wrong_password(self, delete_mock, active_user):
        req = self.arf.post('/api/account/delete',
                            data={'password': 'wrong_pass'})
        req.user = active_user
        req.session = {}

        resp = delete_user(req)
        assert resp.data == {'errorData': {'password': '*****'},
                             'errorText': 'Wrong password', 'resultCode': 'wrongPassword'}
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        assert models.Account.objects.filter(email=active_user.email).exists()

    def mock_update_2fa(self, two_fa):
        return self.mocker.patch.object(Account, 'update_2fa_settings', return_value=two_fa)

    def request_security(self, active_user, action=None):
        data = {
            'password': 'pass',
            'mfaCode': '456723'
        }

        if action:
            data['action'] = action

        req = self.arf.post('/api/account/security', data=data)
        req.user = active_user
        req.session = {}
        return req

    def test_security_missing_activate(self, active_user):
        req = self.request_security(active_user)
        view = AccountSecurity().as_view()
        assert view(req).status_code == status.HTTP_400_BAD_REQUEST

    def test_security_activate(self, active_user):
        two_fa = {
            "account2faEnabled": True
        }
        req = self.request_security(active_user, action="activate")
        security_mock = self.mock_update_2fa(two_fa)
        view = AccountSecurity().as_view()

        assert view(req).status_code == status.HTTP_200_OK
        assert view(req).data == {'account2faEnabled': True}
        assert security_mock.call_args.args[1] == '456723'
        assert security_mock.call_args.args[2] is True
        assert security_mock.call_args.kwargs['password'] == 'pass'

    def test_security_deactivate(self, active_user):
        two_fa = {
            "account2faEnabled": False
        }
        req = self.request_security(active_user, action="deactivate")
        security_mock = self.mock_update_2fa(two_fa)
        self.mocker.patch.object(Auth, 'delete_2fa_key', return_value={
                                 'account2faEnabled': False})
        view = AccountSecurity().as_view()

        assert view(req).status_code == status.HTTP_200_OK
        assert view(req).data == {'account2faEnabled': False}
        assert security_mock.call_args.args[1] == '456723'
        assert security_mock.call_args.args[2] is False

    def test_security_toggle(self, active_user):
        two_fa = {
            "account2faEnabled": False
        }
        req = self.request_security(active_user, "toggle")
        self.mocker.patch.object(Account, 'get', return_value={
                                 'account2faEnabled': True})
        security_mock = self.mock_update_2fa(two_fa)
        view = AccountSecurity().as_view()

        assert view(req).status_code == status.HTTP_200_OK
        assert view(req).data == {'account2faEnabled': False}
        assert security_mock.call_args.args[1] == '456723'
        assert security_mock.call_args.args[2] is False

        two_fa["account2faEnabled"] = True
        req = self.request_security(active_user, "toggle")
        self.mocker.patch.object(Account, 'get', return_value={
                                 'account2faEnabled': False})
        security_mock = self.mock_update_2fa(two_fa)
        verify_mock = self.mocker.patch.object(Auth, 'verify_2fa_code')
        view = AccountSecurity().as_view()

        assert view(req).status_code == status.HTTP_200_OK
        assert view(req).data == {'account2faEnabled': True}
        assert security_mock.call_args.args[1] == '456723'
        assert security_mock.call_args.args[2] is True

    def test_security_delete_2fa_enabled(self, active_user):
        self.mocker.patch.object(Account, 'get', return_value={
                                 'account2faEnabled': True})
        req = self.arf.delete('/api/account/security')
        req.user = active_user
        req.session = {}

        view = AccountSecurity().as_view()
        assert view(req).status_code == status.HTTP_400_BAD_REQUEST

    def test_security_delete_2fa_disabled(self, active_user):
        self.mocker.patch.object(Account, 'get', return_value={
                                 'account2faEnabled': False})
        self.mocker.patch.object(Auth, 'delete_2fa_key', return_value={})
        req = self.arf.delete('/api/account/security')
        req.user = active_user
        req.session = {}

        view = AccountSecurity().as_view()
        assert view(req).status_code == status.HTTP_200_OK

    def test_review_cookie(self):
        assert not self.user.cookie_reviewed
        request = self.arf.post(f'/api/account/reviewCookie')
        request.user = self.user
        response = review_cookie(request)
        assert response.status_code == status.HTTP_200_OK
        assert self.user.cookie_reviewed

    @pytest.fixture()
    def mock_change_password(self):
        def change_pass(request, email, old_password, new_password, mfa_code=None, headers=None):
            if old_password == 'old_pass':
                return True
            else:
                raise APINotAuthorisedException('Incorrect old password')

        return self.mocker.patch.object(Account, 'change_password', side_effect=change_pass)

    def test_change_password_success(self, active_user, mock_change_password):
        PushDevice.objects.create(user=active_user)
        data = {'old_password': 'old_pass', 'new_password': 'new_pass'}
        req = self.arf.post('/api/account/changePassword', data=data)
        req.user = active_user
        req.session = {}

        resp = change_password(req)
        mock_change_password.assert_called()
        assert resp.status_code == status.HTTP_200_OK
        assert not PushDevice.objects.filter(user=active_user).exists()

    def test_change_password_invalid_new_password(self, active_user):
        data = {'old_password': 'old_pass', 'new_password': 'new'}
        req = self.arf.post('/api/account/changePassword', data=data)
        req.user = active_user
        req.session = {}

        resp = change_password(req)
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        assert resp.data == {'errorData': {'new_password': '****'},
                             'errorText': 'Incorrect new password', 'resultCode': 'wrongParameters'}

    def test_change_password_incorrect_old_password(self, active_user, mock_change_password):
        data = {'old_password': 'incorrect_pass', 'new_password': 'new_pass'}
        req = self.arf.post('/api/account/changePassword', data=data)
        req.user = active_user
        req.session = {}

        resp = change_password(req)
        mock_change_password.assert_called()
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        assert resp.data == {'errorData': None,
                             'errorText': 'Wrong old password or invalid mfaCode', 'resultCode': 'badRequest'}

    def test_verify_password(self):
        account_mock = self.mocker.patch.object(Account, 'get')
        req = self.arf.post('/api/account/verify', data={'password': 'pass'})
        req.user = self.user
        req.session = {}
        resp = verify_password(req)
        assert resp.status_code == status.HTTP_200_OK
        account_mock.assert_called_with(
            {}, email=self.user.email, password='pass')

    def test_activate_missing_params(self):
        req = self.arf.post('/api/account/activate')
        req.session = {}
        resp = activate(req)
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        assert resp.data == {
            'errorData': {
                'code': ['This field is required.'],
                'user_email': ['This field is required.']
            },
            'errorText': 'Parameters are missing',
            'resultCode': 'wrongParameters'
        }

    def test_activate_with_code(self):
        self.user.save()
        code = str(base64.b64encode(
            ('act_code' + ':' + self.user.email).encode('utf-8')), 'utf-8')
        req = self.arf.post('/api/account/activate', data={'code': code})
        req.session = {}
        timezone_now = timezone.now()
        self.mocker.patch.object(timezone, 'now', return_value=timezone_now)
        self.mocker.patch.object(Account, 'activate', return_value={
                                 'email': self.user.email})

        resp = activate(req)
        assert resp.status_code == status.HTTP_200_OK
        self.user.refresh_from_db()
        assert self.user.activated_date == timezone_now

    def test_activate_with_email(self, active_user):
        req = self.arf.post('/api/account/activate',
                            data={'user_email': self.user.email})
        req.session = {}
        reactivate_mock = self.mocker.patch.object(Account, 'reactivate')

        resp = activate(req)
        assert resp.status_code == status.HTTP_200_OK
        reactivate_mock.assert_called_with(self.user.email)

    def test_restore_password_missing_params(self):
        req = self.arf.post('/api/account/restorePassword')
        req.session = {}
        resp = restore_password(req)
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        assert resp.data == {
            'errorData': {
                'code': ['This field is required.'],
                'user_email': ['This field is required.']
            },
            'errorText': 'Parameters are missing',
            'resultCode': 'wrongParameters'
        }

    def restore_password_with_code(self, password):
        self.code = str(base64.b64encode(
            ('restore_code' + ':' + self.user.email).encode('utf-8')), 'utf-8')
        req = self.arf.post('/api/account/restorePassword',
                            data={'code': self.code, 'new_password': password, 'mfaCode': 'mfaCode'})
        req.session = {}
        self.timezone_now = timezone.now()
        self.timezone_mock = self.mocker.patch.object(
            timezone, 'now', return_value=self.timezone_now)
        self.restore_mock = self.mocker.patch.object(
            Account, 'restore_password', return_value={'email': self.user.email})
        return restore_password(req)

    def test_restore_password_with_code(self):
        self.user.activated_date = None
        self.user.save()
        PushDevice.objects.create(user=self.user)

        resp = self.restore_password_with_code('new_pass')
        assert resp.status_code == status.HTTP_200_OK
        self.user.refresh_from_db()
        assert self.user.activated_date == self.timezone_now
        assert not PushDevice.objects.filter(user=self.user).exists()
        self.restore_mock.assert_called_with(
            self.code, 'new_pass', 'mfaCode', None)

        # Check that date is only updated if none exists
        old_time = self.timezone_now
        self.timezone_mock.return_value = 2
        resp = self.restore_password_with_code('new_pass')
        assert resp.status_code == status.HTTP_200_OK
        self.user.refresh_from_db()
        assert self.user.activated_date == old_time

    def test_restore_password_with_code_bad_password(self):
        resp = self.restore_password_with_code('pass')
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        assert resp.data == {'errorData': {'new_password': '****'},
                             'errorText': 'Wrong new password', 'resultCode': 'wrongParameters'}

    def test_restore_password_with_email(self):
        req = self.arf.post('/api/account/restorePassword', data={
                            'user_email': self.user.email}, HTTP_X_FORWARDED_FOR='8.8.8.8', REMOTE_ADDR='8.8.8.8')
        req.session = {}
        reset_mock = self.mocker.patch.object(Account, 'reset_password')

        resp = restore_password(req)
        assert resp.status_code == status.HTTP_200_OK
        reset_mock.assert_called_with(self.user.email, '8.8.8.8')

    def test_check_account_in_portal_doesnt_exist(self):
        req = self.arf.post('/api/account/check',
                            data={'email': 'not_exist@test.com'})
        req.session = {}
        self.mocker.patch.object(Account,
                                 'check_account',
                                 side_effect=APINotFoundException(error_text=''))
        resp = check_account_in_portal(req)
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data == {'active': False, 'emailExists': False}

    def test_check_account_in_cloud_db_exists(self):
        req = self.arf.post('/api/account/check',
                            data={'email': 'not_exist@test.com'})
        req.session = {}
        self.mocker.patch.object(Account, 'check_account', return_value={
                                 'status': 'invited'})
        resp = check_account_in_portal(req)
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data == {'active': False, 'emailExists': True}

    def test_check_account_in_portal_not_active(self):
        self.user.activated_date = None
        self.user.save()
        req = self.arf.post('/api/account/check',
                            data={'email': self.user.email})
        resp = check_account_in_portal(req)
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data == {'active': False, 'emailExists': True}

    def test_check_account_in_portal_active(self):
        self.user.activated_date = timezone.now()
        self.user.save()
        req = self.arf.post('/api/account/check',
                            data={'email': self.user.email})
        resp = check_account_in_portal(req)
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data == {'active': True, 'emailExists': True}

    def check_code_in_portal(self, email):
        code = str(base64.b64encode(
            ('restore_code' + ':' + email).encode('utf-8')), 'utf-8')
        req = self.arf.post('/api/account/checkCode', data={'code': code})
        resp = check_code_in_portal(req)
        assert resp.status_code == status.HTTP_200_OK
        return resp

    def test_check_code_in_portal_exists(self, active_user):
        resp = self.check_code_in_portal(active_user.email)
        assert resp.data == {'emailExists': True}

    def test_check_code_in_portal_doesnt_exist(self, active_user):
        resp = self.check_code_in_portal('not_exist@test.com')
        assert resp.data == {'emailExists': False}

    def check_auth_code(self, temp_pass):
        def check_auth(request, username, password):
            if username == self.user.email and password == 'right_pass':
                request.user = self.user
                return self.user
            else:
                return None

        code = str(base64.b64encode(
            f'{self.user.email}:{temp_pass}'.encode('utf-8')), 'utf-8')
        self.mocker.patch('django.contrib.auth.authenticate',
                          side_effect=check_auth)
        req = self.arf.post('/api/account/checkAuthCode', data={'code': code})
        req.session = {}
        return check_auth_code(req)

    def test_check_auth_code_correct(self):
        resp = self.check_auth_code('right_pass')
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data == {'email': self.user.email}

    def test_check_auth_code_incorrect(self):
        resp = self.check_auth_code('wrong_pass')
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED
        assert resp.data == {
            'errorData': None, 'errorText': 'Auth code has expired.', 'resultCode': 'notAuthorized'}

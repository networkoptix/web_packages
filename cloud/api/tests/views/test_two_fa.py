import random
import re
from rest_framework import serializers
from rest_framework.fields import CharField, IntegerField
from api.views.two_fa import *
from uuid import uuid4
from rest_framework.request import Request
import pytest


class TestTwoFAViews:
    auth_mock_path = 'cloud.controllers.cloud_api.Auth.'

    @pytest.fixture()
    def create_user(self, django_user_model):
        self.user = django_user_model(email='testemail@email.com')

    def make_uuids(self, amount):
        return map(lambda x: str(uuid4()), [None]*amount)

    def test_two_factor_permissions_mixin(self, arf):
        mockPermissionClass = str(uuid4())

        class MockAPIView:
            def __init__(self, method):
                if(method == 'get'):
                    req = arf.get('/')
                else:
                    req = arf.post('/')
                self.request = Request(req)

            def get_permissions(self):
                return [mockPermissionClass]

        class MockView(TwoFactorPermissionsMixin, MockAPIView):
            pass

        # Uses TwoFactorPermissionMixin's get_permissions()
        view = MockView('get')
        assert isinstance(view.get_permissions()[0], AllowAny)

        # Uses super().get_permissions()
        view = MockView('post')
        assert view.get_permissions()[0] == mockPermissionClass

    def test_create_backup_code_serializer(self):
        count = CreateBackupCodeSerializer().fields['count']

        assert isinstance(count, IntegerField)
        assert count.required == False
        assert count.default == 8
        assert count.min_value == 1

    def test_delete_backup_code_serializer(self):
        with pytest.raises(serializers.ValidationError, match='Backup Codes should be comma seperated with no spaces'):
            DeleteBackupCodeSerializer.validate_backup_codes('I have spaces')

        uuid = str(uuid4())
        assert DeleteBackupCodeSerializer.validate_backup_codes(uuid) == uuid

    def test_verification_serializer(self):
        fields = VerificationSerializer().fields
        code, verification_code = fields['code'], fields['verification_code']

        assert len(fields) == 2

        assert isinstance(code, CharField)
        assert code.required == True

        assert isinstance(verification_code, CharField)
        assert verification_code.required == True

    def test_two_factor_verification(self, create_user, arf, mocker):
        mock_verify_2fa = mocker.patch(self.auth_mock_path + 'verify_2fa_code', return_value=True)
        mock_generate_2fa_key = mocker.patch(self.auth_mock_path + 'generate_2fa_key', return_value=True)
        access_token, code, verification_code = self.make_uuids(3)
        code = re.sub(r'\D', '', code)
        verification_code = re.sub(r'\D', '', verification_code)
        view = TwoFactorVerification().as_view()

        # Valid Get
        request = arf.get(f'/2fa/verification?code={code}&verification_code={verification_code}')
        request.session = {'access_token': access_token}
        request.user = self.user

        assert view(request).status_code == 200
        assert mock_verify_2fa.call_count == 1

        # Valid Post
        request = arf.post(f'/2fa/verification')
        request.user = self.user

        assert view(request).status_code == 200
        args, kwargs = mock_generate_2fa_key.call_args_list[0]
        assert isinstance(args[0], Request)

    def test_backup_code_get(self, create_user, arf, mocker):
        mock_verify_backup_code = mocker.patch(self.auth_mock_path + 'verify_backup_code', return_value=True)
        access_token, code, verification_code = self.make_uuids(3)
        code = re.sub(r'\D', '', code)
        verification_code = re.sub(r'\D', '', verification_code)
        request = arf.get(f'/?code={code}&verification_code={verification_code}')
        request.session = {'access_token': access_token}
        request.user = self.user
        view = BackupCode().as_view()

        assert view(request).status_code == 200
        assert mock_verify_backup_code.call_count == 1


    def test_backup_code_post_and_delete(self, create_user, arf, mocker):
        backup_code_one, backup_code_two, backup_code_three = self.make_uuids(
            3)
        mock_get_active_backup_codes = mocker.patch(self.auth_mock_path + 'get_active_backup_codes', return_value=[
                                                    {'backup_code': backup_code_one}, {'backup_code': backup_code_two}])
        mock_delete_backup_codes = mocker.patch(
            self.auth_mock_path + 'delete_backup_codes', return_value=True)
        mock_generate_backup_code = mocker.patch(
            self.auth_mock_path + 'generate_backup_code')
        view = BackupCode().as_view()

        count = random.randint(1, 10)
        request = arf.post('/2fa/backup', {'count': count})
        request.user = self.user

        # POST
        assert view(request).status_code == 200

        args, kwargs = mock_get_active_backup_codes.call_args_list[0]
        assert isinstance(args[0], Request)

        args, kwargs = mock_delete_backup_codes.call_args_list[0]
        assert isinstance(args[0], Request)
        assert kwargs['codes'] == f'{backup_code_one},{backup_code_two}'

        args, kwargs = mock_generate_backup_code.call_args_list[0]
        assert isinstance(args[0], Request)
        assert count in args

        # DELETE
        delete_backup_codes_string = backup_code_one + \
            ',' + backup_code_two + ',' + backup_code_three
        request = arf.delete(
            '/2fa/backup', {'backup_codes': delete_backup_codes_string})
        request.user = self.user

        assert view(request).status_code == 200
        args, kwargs = mock_delete_backup_codes.call_args_list[1]
        assert isinstance(args[0], Request)
        assert delete_backup_codes_string in args

    def test_get_active_backup_codes(self, create_user, arf, mocker):
        mock_get_active_backup_codes = mocker.patch(
            self.auth_mock_path + 'get_active_backup_codes')
        req = arf.get('/')
        req.user = self.user
        response = get_active_backup_codes(req)
        args, kwargs = mock_get_active_backup_codes.call_args_list[0]

        assert response.status_code == 200
        assert isinstance(args[0], Request)

    def test_add_2fa_to_session(self, create_user, arf, mocker):
        mock_verify_2fa_code = mocker.patch(
            self.auth_mock_path + 'verify_2fa_code')
        verification_code, access_token = self.make_uuids(2)
        req = arf.post('/', {'verification_code': verification_code})
        req.session = {'access_token': access_token}
        req.user = self.user
        response = add_2fa_to_session(req)

        assert response.status_code == 200
        mock_verify_2fa_code.assert_called_once_with(
            verification_code, access_token)

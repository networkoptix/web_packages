import pytest
from uuid import uuid4
from random import randint
from model_bakery import baker
from django.urls import reverse
from rest_framework.test import force_authenticate


from push_notifications.models import GCMDevice
from notifications.views.push_notification import *


class WithInstanceFixture:
    @pytest.fixture()
    def instance(self, get_instance):
        return get_instance()

    @pytest.fixture(autouse=True)
    def remove_permissions(self):
        self.view_class.permission_classes = self.view_class.authentication_classes = ()

    @pytest.fixture()
    def get_instance(self, mocker):
        def _get_instance(view_class=self.view_class, **kwargs):
            assert getattr(self, 'view_class')
            instance = view_class(**kwargs)
            instance.request = mocker.MagicMock()
            instance.request.user = str(uuid4())

            return instance

        return _get_instance

    @pytest.fixture()
    def mock_get_serializer(self, instance, mocker, db):
        mock_request = mocker.MagicMock()
        push_device = baker.make(PushDevice)
        serializer = DeviceSubscriptionsSerializer(push_device)
        mock_request.data = serializer.data
        mock_serializer = mocker.patch.object(
            instance, 'get_serializer', return_value=DeviceSubscriptionsSerializer(
                data=mock_request.data))
        return mock_request, push_device, mock_serializer

    @pytest.fixture()
    def patch_get_object(self, mocker):
        def _patch_get_object(push_device=None):
            return mocker.patch.object(self.view_class, 'get_object', return_value=push_device)

        return _patch_get_object

    @pytest.fixture()
    def setup(self, mocker, account_factory, mock_set, db):
        def _setup(email=f'{uuid4()}@{uuid4()}.com', **kwargs):
            user = account_factory(email=email, **kwargs)
            devices = baker.make(PushDevice, user=user,
                                 _quantity=randint(5, 20))
            patched_qs = mocker.patch.object(
                self.view_class, 'get_queryset', return_value=mock_set(*devices))
            # mocker.patch.object(self.view_class, 'get_object', return_value=devices[0])

            return user, devices
        return _setup


def test_get_mobile_compatible_customization(db):
    mobile_customization = str(uuid4())
    mobile_customization_instance = baker.make(
        Customization, name=mobile_customization)

    # Test use current customization
    assert get_mobile_compatible_customization(settings.TEST_CUSTOMIZATION).name == settings.TEST_CUSTOMIZATION

    # Test use different push customization
    caches['push_config'].set('mobile_customizations', {
                              settings.TEST_CUSTOMIZATION: mobile_customization})
    assert get_mobile_compatible_customization(settings.TEST_CUSTOMIZATION).name == mobile_customization


class TestIsAuthenticatedUserOrSystem(WithInstanceFixture):
    view_class = IsAuthenticatedUserOrSystem

    def test_has_permission(self, mocker, instance):
        mock_request = mocker.MagicMock()
        mock_request.user.is_system = mock_request.user.is_authenticated = False

        # Test user doesn't have permission
        assert not instance.has_permission(mock_request, '')

        # Test is_system permission
        mock_request.user.is_system = True
        assert instance.has_permission(mock_request, '')

        # Test is_authenticated permission
        mock_request.user.is_system, mock_request.user.is_authenticated = mock_request.user.is_authenticated, mock_request.user.is_system
        assert instance.has_permission(mock_request, '')


class TestCloudSystemBasicAuthentication(WithInstanceFixture):
    view_class = CloudSystemBasicAuthentication

    def test_authenticate_credentials(self, mocker, instance):
        system_id, user, password, system, test_error, tokens = [
            str(uuid4()) for _ in range(6)]
        mock_request = mocker.MagicMock()
        mock_clouddb_account_get = mocker.patch(
            'cloud.controllers.cloud_api.Account.get', side_effect=APINotAuthorisedException(test_error))
        mock_clouddb_system_get = mocker.patch(
            'cloud.controllers.cloud_api.System.basic_get', return_value={'systems': [system]})
        mock_credentials = mocker.MagicMock()
        mock_credentials.tokens = tokens
        mock_temp_login_instance = mocker.MagicMock()
        mock_temp_login_instance.__enter__.return_value = mock_credentials
        mock_temp_login = mocker.patch(
            'cloud.controllers.cloud_api.TempLogin', return_value=mock_temp_login_instance)
        password_hash = sha256(password.encode()).hexdigest()
        login = f'{user}:{password_hash}'

        caches['push_authentication'].set(login, system)

        expected_request_data = {
            'systemId': system_id,
            'username': user,
            'password': password,
            'system': system
        }

        # Handle cached
        mock_request.data = {'systemId': system_id}
        assert isinstance(instance.authenticate_credentials(
            user, password, mock_request)[0], AnonymousUser)
        assert mock_request.data == expected_request_data

        # Handle not cached
        caches['push_authentication'].delete(login)
        mock_request.data = {'systemId': system_id}
        assert isinstance(instance.authenticate_credentials(
            user, password, mock_request)[0], AnonymousUser)
        assert caches['push_authentication'].get(login, False) == system
        mock_clouddb_system_get.assert_called_once_with(user, password, user)
        assert mock_request.data == expected_request_data

        # Handle non-system credentials
        caches['push_authentication'].delete(login)
        mock_request.data = {}
        err = None
        try:
            response = instance.authenticate_credentials(f'{uuid4()}@example.com', password, mock_request)
        except Exception as ex:
            err = ex
        assert isinstance(err, exceptions.AuthenticationFailed)

        #  Test empty password
        mock_request.data = {}
        err = None
        try:
            response = instance.authenticate_credentials(f'{uuid4()}@example.com', '', mock_request)
        except Exception as ex:
            err = ex
        assert isinstance(err, exceptions.AuthenticationFailed)



class TestCloudAccountBasicAuthentication(WithInstanceFixture):
    view_class = CloudAccountBasicAuthentication

    def test_authenticate_credentials(self, mocker, account_factory, instance, db):
        password = str(uuid4())
        email = f'{uuid4()}@{uuid4()}.com'
        mock_request = mocker.MagicMock()
        mock_request.data = {}
        test_account = account_factory(email)
        mock_clouddb_account_get = mocker.patch(
            'cloud.controllers.cloud_api.Account.get', return_value={'email': email})

        assert instance.authenticate_credentials(
            email, password, mock_request)[0] == test_account
        assert mock_request.data == {'username': email, 'password': password}
        mock_clouddb_account_get.assert_called_once_with(
            mock_request, email=email, password=password)


class TestCloudSessionAuthentication(WithInstanceFixture):
    view_class = CloudSessionAuthentication

    def test_authenticate(self, mocker, instance):
        name, login, password, access_token, refresh_token = [
            str(uuid4()) for _ in range(5)]
        email = f'{name}@networkoptix.com'
        cloud_db_account = {'email': email}
        session_login = {'login': login, 'password': password}
        mock_clouddb_account_get = mocker.patch(
            'cloud.controllers.cloud_api.Account.get', return_value=cloud_db_account)
        mock_clouddb_account_temp_credentials = mocker.patch(
            'cloud.controllers.cloud_api.Account.create_temporary_credentials', return_value=session_login)
        mock_request = mocker.MagicMock()
        mock_request.data = {}
        mock_request._request.user.email = email

        expected_request_data = {
            'clouddb_account': cloud_db_account,
            'username': login,
            'password': password
        }

        # Test no session
        assert instance.authenticate(mock_request) is None

        # Test session with login
        mock_request.session = {
            'access_token': access_token, 'refresh_token': refresh_token}
        assert instance.authenticate(mock_request)[
            0] == mock_request._request.user
        assert mock_request.data == expected_request_data

        # Test session with token
        mock_request.session = session_login
        assert instance.authenticate(mock_request)[
            0] == mock_request._request.user
        assert mock_request.data == expected_request_data


class TestCustomizationBearerAuthentication(WithInstanceFixture):
    view_class = CustomizationBearerAuthentication

    def test_authenticate_credentials_without_account(self, arf, mocker, instance, db):
        cdb_url = f'{uuid4()}'
        token = f'{uuid4()}'
        username = f'{uuid4()}@test.test'
        auth_response = {
            'token': token,
            'username': username
        }
        mock_cdb_config = mocker.patch.object(CloudDbConfig, 'url', return_value=cdb_url)
        mock_auth = mocker.patch.object(Clouddb_Auth, 'validate_token', return_value=auth_response)
        request = arf.get('/', headers={"Authorization": f"Bearer {token}"}, META={"HTTP_AUTHORIZATION": f"Bearer {token}"})

        without_user_actual = instance.authenticate_credentials(token, request)
        assert without_user_actual[0] is not None
        assert without_user_actual[0].id is not None
        assert without_user_actual[0].is_active
        assert without_user_actual[0].email == username
        assert without_user_actual[1] == token
        assert without_user_actual[0].customization == None

        mock_auth.assert_called_with(token, cloud_db_url=cdb_url)


    def test_authenticate_credentials_with_account(self, arf, mocker, instance, db):
        cdb_url = f'{uuid4()}'
        token = f'{uuid4()}'
        username = f'{uuid4()}@test.test'
        auth_response = {
            'token': token,
            'username': username
        }
        mock_cdb_config = mocker.patch.object(CloudDbConfig, 'url', return_value=cdb_url)
        mock_auth = mocker.patch.object(Clouddb_Auth, 'validate_token', return_value=auth_response)
        request = arf.get('/', headers={"Authorization": f"Bearer {token}"}, META={"HTTP_AUTHORIZATION": f"Bearer {token}"})

        account = baker.make(Account, email=username)
        assert instance.authenticate_credentials(token, request) == (account, token)
        mock_auth.assert_called_with(token, cloud_db_url=cdb_url)

    def test_authenticate_credentials_invalid_token(self, arf, mocker, instance, db):
        cdb_url = f'{uuid4()}'
        token = f'{uuid4()}'
        username = f'{uuid4()}@test.test'
        auth_response = {
            'token': token,
            'username': username
        }
        mock_cdb_config = mocker.patch.object(CloudDbConfig, 'url', return_value=cdb_url)
        mock_auth = mocker.patch.object(Clouddb_Auth, 'validate_token', return_value=auth_response)
        request = arf.get('/', headers={"Authorization": f"Bearer {token}"}, META={"HTTP_AUTHORIZATION": f"Bearer {token}"})

        mock_auth.side_effect = APINotAuthorisedException('Invalid token')
        assert instance.authenticate_credentials(token, request) is None


    def test_authenticate(self, arf, mocker, instance):
        token = f'{uuid4()}'
        username = f'{uuid4()}@test.test'
        mock_auth_cred = mocker.patch.object(CustomizationBearerAuthentication, 'authenticate_credentials',
                                             return_value=(token, username))
        # valid token
        request = arf.get('/')
        request.headers = {"Authorization": f"Bearer {token}"}
        request.META = {"HTTP_AUTHORIZATION": f"Bearer {token}"}
        assert instance.authenticate(request) == (token, username)
        mock_auth_cred.assert_called_with(token, request)

        # invalid keyword
        request.headers = {"Authorization": f"Fearer {token}"}
        request.META = {"HTTP_AUTHORIZATION": f"Fearer {token}"}
        assert instance.authenticate(request) is None

        # more spaces
        request.headers = {"Authorization": f"Bearer {token} asdasd"}
        request.META = {"HTTP_AUTHORIZATION": f"Bearer {token} asdasd"}
        try:
            instance.authenticate(request)
        except exceptions.AuthenticationFailed as ex:
            assert ex.detail.__str__() == 'Invalid token header. Token string should not contain spaces.'
        else:
            raise AssertionError("Must raise exception")

        # Missed token
        request.META = {"HTTP_AUTHORIZATION": f"Bearer "}
        request.headers = {"Authorization": f"Bearer "}
        try:
            instance.authenticate(request)
        except exceptions.AuthenticationFailed as ex:
            assert ex.detail.__str__() == 'Invalid token header. No credentials provided.'
        else:
            raise AssertionError("Must raise exception")


def test_push_notification(arf, account_factory, db, mocker, default_customization):
    mocker.patch('notifications.views.push_notification.get_mobile_compatible_customization',
                 return_value=default_customization)
    title, body, payload_key, payload_value, options_key, options_value, target, system_id = [
        str(uuid4()) for _ in range(8)]
    data = {
        'notification': {
            'payload': {
                payload_key: payload_value
            },
            'options': {
                options_key: options_value
            },
            'title': title,
            'body': body
        },
        'systemId': system_id,
        'targets': [target]
    }
    url = reverse('push_notification')
    request = arf.post(url, data, format='json')
    request.session = {}
    user = account_factory()
    force_authenticate(request, user=user)

    res = push_notification(request)

    assert res.status_code == status.HTTP_200_OK
    assert res.data == {'notificationId': PushNotification.objects.last().id}


class TestDeviceSubscriptionListView(WithInstanceFixture):
    view_class = DeviceSubscriptionListView

    def test_get_queryset(self, mocker, instance):
        devices = str(uuid4())
        mock_push_device_filter = mocker.patch(
            'notifications.models.PushDevice.objects.filter', return_value=devices)

        assert instance.get_queryset() == devices
        mock_push_device_filter.assert_called_once_with(
            user=instance.request.user)

    def test_get(self, instance, setup, api_client):
        _, devices = setup()

        expected_data = {
            device.registration_id: instance.serializer_class(device).data
            for device in devices
        }

        response_data = api_client.get(reverse('subscriptions')).data
        assert response_data == expected_data


class TestSubscriptions(WithInstanceFixture):
    view_class = Subscriptions

    def test_get_queryset(self, mocker, instance):
        devices = str(uuid4())
        mock_push_device_filter = mocker.patch(
            'notifications.models.PushDevice.objects.filter', return_value=devices)

        assert instance.get_queryset() == devices
        mock_push_device_filter.assert_called_once_with(
            user=instance.request.user)

    def test_get_object(self, mocker, setup, instance):
        _, devices = setup()
        instance.request.query_params.get.return_value = PushDevice.PROVIDERS[
            devices[0].provider]
        instance.request.data = {}
        setattr(instance, 'kwargs', {
                'deviceToken': devices[0].registration_id})

        assert instance.get_object() == devices[0]

    def test_format_response(self, instance, db):
        device = baker.make(PushDevice)
        expected_format = {
            'type': PushDevice.TYPES[device.type],
            'systems': [sub.system_id for sub in device.subscriptions.all()],
            'deviceInfo': {'name': device.name, 'model': device.model, 'os': PushDevice.OS[device.os]},
            'isEnabled': device.active,
            'provider': PROVIDERS_REVERSE_MAP[device.provider]
        }
        assert instance.format_response(device) == expected_format

    def test_retrieve(self, mocker, instance, db):
        device = baker.make(PushDevice)
        mocker.patch.object(self.view_class, 'get_object', return_value=device)

        # Testing existing device
        assert instance.retrieve(
            '').data == DeviceSubscriptionsSerializer(device).data

        # Test 404
        mocker.patch.object(self.view_class, 'get_object', return_value=None)
        try:
            # This should raise a 404
            instance.retrieve('')
            assert False
        except Http404:
            pass

    def test_create(self, instance, mock_get_serializer):
        mock_request = mock_get_serializer[0]

        res = instance.create(mock_request)
        assert res.status_code == status.HTTP_201_CREATED
        assert res.data['status'] == 'created'

    def test_update(self, instance, mock_get_serializer):
        mock_request = mock_get_serializer[0]

        res = instance.update(mock_request, object=None)
        assert res.status_code == status.HTTP_200_OK
        assert res.data['status'] == 'updated'

    def test_get(self, patch_get_object, api_client, instance, db):
        patch_get_object()

        # Test no device
        url = reverse('subscriptions', kwargs={'deviceToken': str(uuid4())})
        res = api_client.get(url)
        assert res.status_code == status.HTTP_404_NOT_FOUND

        # Test device found
        push_device = baker.make(PushDevice)
        patch_get_object(push_device)
        url = reverse('subscriptions', kwargs={
                      'deviceToken': push_device.registration_id})
        res = api_client.get(url)

        assert res.status_code == status.HTTP_200_OK
        assert res.data == DeviceSubscriptionsSerializer(push_device).data

    def test_put(self, mocker, api_client, patch_get_object, db):
        patch_get_object()
        mock_create = mocker.patch.object(
            self.view_class, 'create', return_value=Response('created'))
        mock_update = mocker.patch.object(
            self.view_class, 'update', return_value=Response('updated'))

        # Test unsaved
        data = DeviceSubscriptionsSerializer(None).data
        data['deviceToken'] = str(uuid4())
        url = reverse('subscriptions', kwargs={
                      'deviceToken': data['deviceToken']})
        res = api_client.put(url)
        assert res.data == 'created'

        # Test update
        push_device = baker.make(PushDevice)
        patch_get_object(push_device)

        data = DeviceSubscriptionsSerializer(push_device).data
        data['deviceToken'] = str(uuid4())
        url = reverse('subscriptions', kwargs={
                      'deviceToken': data['deviceToken']})
        res = api_client.put(url)
        assert res.data == 'updated'

    def test_delete(self, mocker, patch_get_object, api_client, instance, disable_feature_flags):
        patch_get_object()

        # Test no device to delete
        url = reverse('subscriptions', kwargs={'deviceToken': str(uuid4())})
        res = api_client.delete(url)

        assert res.status_code == status.HTTP_404_NOT_FOUND

        # Test device deleted
        push_device = mocker.MagicMock()
        patch_get_object(push_device)
        url = reverse('subscriptions', kwargs={'deviceToken': str(uuid4())})
        res = api_client.delete(url)

        assert res.status_code == status.HTTP_204_NO_CONTENT
        push_device.delete.assert_called_once_with()

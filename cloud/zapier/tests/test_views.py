import base64
import logging
import json

from rest_framework import status
from rest_framework.response import Response
from rest_framework.request import Request

import pytest
from conftest import generate_uuids
from api.helpers.exceptions import APIException, ErrorCodes, APINotAuthorisedException
from zapier.views import *
from zapier.models import *
from unittest.mock import MagicMock
from model_bakery import baker
from uuid import uuid4

class TestZapierViews:
    def test_zapier_exception(self, mocker):
        mock_log_error = mocker.patch('zapier.views.log_error')
        item_one, item_two = generate_uuids(2)
        def mock_func():
            return {'item': item_one}

        # Tests that even if a Response is not returned by the mock_func, a Response is still returned by the handler
        handler = zapier_exceptions(mock_func)
        assert isinstance(handler(), Response)
        assert handler().status_code == 200
        assert handler().data == {'item': item_one}

        # Test with func that returns a Response
        def mock_func():
            return Response({'item': item_two}, status=status.HTTP_200_OK)
        handler = zapier_exceptions(mock_func)
        assert isinstance(handler(), Response)
        assert handler().status_code == 200
        assert handler().data == {'item': item_two}

        # Test with API Exception error
        APIExceptionInstance = APIException('Mock error text', ErrorCodes.bad_request)
        test_arg = str(uuid4())
        @zapier_exceptions
        def mock_func(*args, **kwargs):
            raise APIExceptionInstance

        # Have to do this try statement so that the linter doesn't complain
        try:
            assert mock_func(test_arg).status_code == 500
        except Exception:
            pass
        mock_log_error.assert_called_once_with(test_arg, APIExceptionInstance, logging.WARNING)

        # Test with Exception error
        ExceptionInstance = Exception()
        test_arg = str(uuid4())
        @zapier_exceptions
        def mock_func(*args, **kwargs):
            raise ExceptionInstance

        try:
            response = mock_func(test_arg)
        except Exception:
            pass

        assert isinstance(response, Response)
        assert response.status_code == 503
        assert response.data['resultCode'] == status.HTTP_503_SERVICE_UNAVAILABLE
        assert response.data['errorText'] == 'System unavailable or offline'
        mock_log_error.assert_called_with(test_arg, ExceptionInstance, logging.WARNING)

    def test_authenticate(self, arf, mocker):
        mock_email, mock_password, mock_user = generate_uuids(3)
        mock_auth_authenticate = mocker.patch('django.contrib.auth.authenticate', return_value = mock_user)

        request = arf.get('/')
        # Need base64 encoded string
        auth_string = f'{mock_email}:{mock_password}'.encode('ascii')
        base64_string = base64.b64encode(auth_string).decode('ascii')
        request.META['HTTP_AUTHORIZATION'] = f'basic {base64_string}'
        returned_user, returned_email, returned_password, returned_tokens = authenticate(request)

        # Test valid
        assert returned_email == mock_email
        assert returned_password == mock_password
        assert returned_user == mock_user
        assert returned_tokens is None
        mock_auth_authenticate.assert_called_once_with(request=request, username=mock_email, password=mock_password)

        # Test raises exception
        mock_auth_authenticate.return_value = None
        with pytest.raises(APINotAuthorisedException, match='Credentials are invalid'):
            authenticate(request)

    @pytest.fixture()
    def generate_mock_authenticate(self, db, mocker, account_factory):
        self.email, self.password = generate_uuids(2)
        self.user = account_factory()
        self.mock_authenticate = mocker.patch('zapier.views.authenticate', return_value=[self.user, self.email,self.password, None])

    def test_increment_rule(self):
        class MockRule:
            times_used = 0
            save = MagicMock(return_value=True)

        rule = MockRule()
        increment_rule(rule)

        rule.save.assert_called_once()
        assert rule.times_used == 1

    def test_make_rule(self, mocker):
        mock_post = mocker.patch('api.controllers.cloud_gateway.post', return_value=True)
        mock_random_uuid = mocker.patch('zapier.views.random_uuid', return_value=str(uuid4()))
        email, password, system_id, caption, description, source, zapier_trigger = generate_uuids(7)
        # Test generic event
        make_rule('Generic Event', email, password, system_id, caption=caption, description=description, source=source, zapier_trigger=zapier_trigger)
        action_params = json.dumps({"additionalResources": ["{00000000-0000-0000-0000-100000000000}",
                                                            "{00000000-0000-0000-0000-100000000001}"],
                                    "allUsers": False,
                                    "durationMs": 5000,
                                    "forced": True,
                                    "fps": 10,
                                    "needConfirmation": False,
                                    "playToClient": True,
                                    "recordAfter": 0,
                                    "recordBeforeMs": 1000,
                                    "streamQuality": "highest",
                                    "useSource": False
                                    })
        event_condition = json.dumps({"caption": caption,
                                      "description": description,
                                      "eventTimestampUsec": "0",
                                      "eventType": "undefinedEvent",
                                      "metadata": {
                                          "allUsers": False
                                      },
                                      "reasonCode": "none",
                                      "resourceName": source
                                      })
        data = {
            "actionParams": action_params,
            "actionResourceIds": [],
            "actionType": "showPopupAction",
            "aggregationPeriod": 0,
            "comment": f"Auto generated rule for Generic Event from Zapier made by {email}",
            "disabled": False,
            "eventCondition": event_condition,
            "eventResourceIds": [],
            "eventState": "Undefined",
            "eventType": "userDefinedEvent",
            "schedule": "",
            "system": False
        }

        mock_post.assert_called_once_with(system_id, 'ec2/saveEventRule', data, email=email, password=password, tokens=None)

        make_rule('Http Action', email, password, system_id, caption=caption, description=description, source=source, zapier_trigger=zapier_trigger)
        action_params = json.dumps({"allUsers": False,
                                    "durationMs": 5000,
                                    "forced": True,
                                    "fps": 10,
                                    "needConfirmation": False,
                                    "playToClient": True,
                                    "recordAfter": 0,
                                    "recordBeforeMs": 1000,
                                    "requestType": "R0VU",
                                    "httpMethod": "GET",
                                    "streamQuality": "highest",
                                    "url": zapier_trigger,
                                    "useSource": False
                                    })
        event_condition = json.dumps({"caption": "Soft Trigger Send " + caption + " to Zapier",
                                      "description": "_bell_on",
                                      "eventTimestampUsec": "0",
                                      "eventType": "undefinedEvent",
                                      "inputPortId": mock_random_uuid.return_value,
                                      "metadata": {
                                          "allUsers": False,
                                          "instigators": ["{00000000-0000-0000-0000-100000000000}",
                                                          "{00000000-0000-0000-0000-100000000001}"]
                                      },
                                      "reasonCode": "none"
                                      })
        data = {
            "actionParams": action_params,
            "actionResourceIds": [],
            "actionType": "execHttpRequestAction",
            "aggregationPeriod": 0,
            "comment": f"Auto generated rule for HTTP action to Zapier made by {email}",
            "disabled": False,
            "eventCondition": event_condition,
            "eventResourceIds": [],
            "eventState": "Undefined",
            "eventType": "softwareTriggerEvent",
            "schedule": "",
            "system": False
        }

        mock_post.assert_called_with(system_id, 'ec2/saveEventRule', data, email=email, password=password, tokens=None)

    # make_or_increment_rule fixtures and tests
    @pytest.fixture()
    def mock_make_and_increment(self, mocker):
        self.mock_make_rule = mocker.patch('zapier.views.make_rule')
        self.mock_increment_rule = mocker.patch('zapier.views.increment_rule')


    def make_generated_rule(self, direction='Nx to Zapier', make_model=True):
        self.email, self.system_id, self.caption, self.source, self.password, self.description, self.target_url = generate_uuids(7)
        self.tokens = None
        if make_model:
            self.generated_rule = baker.make(GeneratedRule,
                                             email=self.email,
                                             system_id=self.system_id,
                                             caption=self.caption,
                                             source=self.source,
                                             direction=direction)

    def call_make_or_increment_rule(self, action):
        make_or_increment_rule( action,
                                self.email,
                                self.system_id,
                                self.caption,
                                self.password,
                                self.description,
                                self.source,
                                self.target_url)

    def test_generic_event_make(self, db, mock_make_and_increment):
        action = 'Generic Event'
        self.make_generated_rule(make_model=False)
        self.call_make_or_increment_rule(action)

        self.mock_make_rule.assert_called_once_with(action,
                                                    self.email,
                                                    self.password,
                                                    self.system_id,
                                                    caption=self.caption,
                                                    source=self.source,
                                                    description=self.description,
                                                    tokens=None)
        assert GeneratedRule.objects.filter(email=self.email,
                                            system_id=self.system_id,
                                            caption=self.caption,
                                            source=self.source,
                                            direction='Zapier to Nx').count() == 1

    def test_generic_event_increment(self, db, mock_make_and_increment):
        self.make_generated_rule('Zapier to Nx')
        self.call_make_or_increment_rule('Generic Event')

        self.mock_increment_rule.assert_called_once_with(self.generated_rule)

    def test_http_action_make(self, db, mock_make_and_increment):
        action = 'Http Action'
        self.make_generated_rule(make_model=False)
        self.call_make_or_increment_rule(action)

        self.mock_make_rule.assert_called_once_with(action,
                                                    self.email,
                                                    self.password,
                                                    self.system_id,
                                                    caption=self.caption,
                                                    zapier_trigger=self.target_url,
                                                    tokens=None)
        assert GeneratedRule.objects.filter(email=self.email,
                                            system_id=self.system_id,
                                            caption=self.caption,
                                            times_used=0,
                                            direction='Nx to Zapier').count() == 1


    def test_hook_fired_increment(self, db, mock_make_and_increment):
        self.make_generated_rule()
        self.call_make_or_increment_rule('Hook Fired')
        self.mock_increment_rule.assert_called_once_with(self.generated_rule)

    def test_get_systems(self, generate_mock_authenticate, arf, mocker):
        name, id = generate_uuids(2)
        mock_cloud_api_system_list = mocker.patch('api.controllers.cloud_api.System.list',
                                                   return_value={'systems': [{'stateOfHealth': 'online', 'name': name, 'id': id}]})
        mock_api_success = mocker.patch('zapier.views.api_success')
        request = arf.get('/')
        get_systems_call = get_systems(request)

        # Test the authenticate call
        args, kwargs = self.mock_authenticate.call_args_list[0]
        assert isinstance(args[0], Request)

        # Test the cloud_api.System.list call
        args, kwargs = mock_cloud_api_system_list.call_args_list[0]
        assert isinstance(args[0], Request)
        assert kwargs['email'] == self.email
        assert kwargs['password'] == self.password
        assert kwargs['one_customization'] == False

        # Test the zap_list is what is expected
        mock_api_success.assert_called_once_with({'systems': [{'name': name, 'system_id': id}]})

        assert get_systems_call.status_code == 200

    def test_encode_url(self):
        arg_one, arg_two = generate_uuids(2)
        arg_three = '+44 3'
        assert encode_url({'arg_one': arg_one, 'arg_two': arg_two, 'arg_three': arg_three}) == (
                          f'api/createEvent?arg_one={arg_one}&arg_two={arg_two}&arg_three=%2B44%203')

    def test_zapier_send_generic_event(self, generate_mock_authenticate, arf, mocker):
        if settings.CI:
            pytest.skip('Bug with html_sanitizer on 3.8 alpine causes test to fail')

        source, caption, systemId, description, access_token, refresh_token = generate_uuids(6)

        tokens = {"access_token": access_token, "refresh_token": refresh_token}
        mocker.patch('api.controllers.cloud_api.Auth.get_token', return_value=tokens)
        mocker.patch('api.controllers.cloud_api.Auth.delete_token')
        mocker.patch('api.controllers.cloud_api.System.get')

        mock_make_or_increment_rule = mocker.patch('zapier.views.make_or_increment_rule')
        mock_cloud_gateway_get = mocker.patch('api.controllers.cloud_gateway.get')
        request = arf.post('/', data={'description': description,
                            'source': source,
                            'caption': caption,
                            'systemId': systemId})
        query_params = {'source': source, 'caption': caption, 'description': description}

        zapier_send_generic_event(request)

        # Test the authenticate call
        args, kwargs = self.mock_authenticate.call_args_list[0]
        assert isinstance(args[0], Request)

        mock_make_or_increment_rule.assert_called_once_with('Generic Event',
                                                            self.email,
                                                            systemId,
                                                            caption,
                                                            password=self.password,
                                                            description=description,
                                                            source=source,
                                                            tokens=None)

        mock_cloud_gateway_get.assert_called_once_with(
            systemId, 'api/createEvent', params=query_params, email=self.email, password=self.password, tokens=None)

    def test_nx_http_actions(self, db, arf):
        caption, system_id = generate_uuids(2)
        request = arf.get('/', {'caption': caption, 'system_id': system_id})

        # Test with non-existent hooks event
        response = nx_http_action(request)

        assert response.status_code == 404
        assert response.data['message'] == f'Webhook for {caption} does not exist'

        # Test with hook exists
        baker.make(ZapHook, event=system_id + ' ' + caption)
        response = nx_http_action(request)

        assert response.status_code == 200
        assert response.data['message'] == f'Webhook fired for {caption}'

        # Test query params missing
        request = arf.get('/')
        response = nx_http_action(request)

        assert response.status_code == 400
        assert response.data['message'] == 'Caption or System Id are missing from query parameters'

    def test_ping(self, generate_mock_authenticate, mocker, arf):
        response = ping(arf.get(''))

        assert response.status_code == 200
        assert response.data['status'] == 'ok'
        self.mock_authenticate.assert_called_once()

    def test_subscribe_webhook(self, generate_mock_authenticate, db, mocker, arf):
        if settings.CI:
            pytest.skip('Bug with html_sanitizer on 3.8 alpine causes test to fail')

        systemId, caption, target, access_token, refresh_token = generate_uuids(5)

        tokens = {"access_token": access_token, "refresh_token": refresh_token}
        mocker.patch('api.controllers.cloud_api.Auth.get_token', return_value=tokens)
        mocker.patch('api.controllers.cloud_api.Auth.delete_token')
        mocker.patch('api.controllers.cloud_api.System.get')

        mock_make_or_increment_rule = mocker.patch('zapier.views.make_or_increment_rule')
        query_params = {"system_id": systemId, "caption": caption}
        url_link = generate_subscribe_url_link(query_params)
        request = arf.post(f'/?system_id={systemId}&caption={caption}', {'target_url': target})
        request.session = {}

        # Test does not exist
        response = subscribe_webhook(request)

        assert response.data['message'] == f'Webhook created for {caption}'
        assert response.data['link'] == url_link
        mock_make_or_increment_rule.assert_called_once_with('Http Action',
                                                            self.email,
                                                            systemId,
                                                            caption,
                                                            password=self.password,
                                                            target_url=url_link,
                                                            tokens=None)
        self.mock_authenticate.assert_called_once()

        # Test exists
        baker.make(ZapHook, user=self.user, target=target)
        response = subscribe_webhook(request)

        assert response.status_code == 500
        assert response.data['message'] == f'There is already a webhook for {caption}'
        assert response.data['link'] == None

    def test_unsubscribe_webhook(self, generate_mock_authenticate, db, arf):
        target = str(uuid4())
        request = arf.post('', {'target_url': target})

        # Test hook doesn't exist
        response = unsubscribe_webhook(request)

        assert response.status_code == 500
        assert response.data['message'] == f'Webhook for {target} does not exist'

        # Test hook exists
        user_hook = baker.make(ZapHook, user=self.user, target=target)
        response = unsubscribe_webhook(request)

        assert response.status_code == 200
        assert response.data['message'] == f'Webhook deleted for {user_hook.event}'

    def test_mock_subscribe(self, generate_mock_authenticate, arf):
        response = mock_subscribe(arf.get(''))

        assert response.status_code == 200
        assert response.data['data'] == [{'caption': 'caption'}]
        self.mock_authenticate.assert_called_once()

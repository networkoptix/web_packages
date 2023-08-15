from random import choice
from uuid import uuid4

from django.core.cache import caches
from model_bakery import baker
import pytest
from rest_framework.exceptions import Throttled

from api.models import Account
from cloud import settings
from notifications import notifications_api
from notifications.views.send import send_notification
from util.throttling import NotificationRateThrottle


class TestSend:
    msg = {
        "userFullName": 'user dummy'
    }
    data = [
        {'user_email': 'DUMmY@example.com', 'type': 'restore_password',
         'message': msg, 'customization': settings.TEST_CUSTOMIZATION},
        {'user_email': 'DummY@example.com', 'type': 'RESTORE_password',
         'message': msg, 'customization': settings.TEST_CUSTOMIZATION},
        {'user_email': 'DummY@example.com', 'type': 'RESTORE_password',
         'message': msg,
         'customization': settings.TEST_CUSTOMIZATION}
    ]
    data_with_sysid = [
        {
            'user_email': 'dummy@example.com', 'type': 'restore_password',
            'message': msg, 'customization': settings.TEST_CUSTOMIZATION,
            'system_id': uuid4()
        },
        {
            'user_email': 'DummY@example.com', 'type': 'RESTORE_password',
            'message': {"userFullName": 'user dummy', 'system_id': uuid4()},
            'customization': settings.TEST_CUSTOMIZATION
        }
    ]

    @pytest.fixture(autouse=True)
    def setup(self, db):
        caches['rate_limits'].clear()
        self.user_account = baker.make('Account', email='dummy@example.com', first_name='user', last_name='dummy')

    def make_request(self, arf, data):
        req = arf.post('/', data=data, format='json',
                       HTTP_X_FORWARDED_FOR='8.8.8.8', REMOTE_ADDR='8.8.8.8')
        req.session = {}
        return req

    def get_response(self, arf, data):
        return send_notification(self.make_request(arf, data))

    def test_send_rate(self, arf, mocker):
        send_mocker = mocker.patch('notifications.notifications_api.send')
        send_mocker.return_value = None
        resp = self.get_response(arf, self.data[0])
        assert resp.status_code == 200
        res = [self.get_response(arf, choice(self.data)) for x in range(5)]
        assert all(r.status_code == 429 for r in res)

    def test_system_id_key(self, arf):
        # without system id
        req = self.make_request(arf, data=self.data[0])
        req.data = self.data[0]
        key = NotificationRateThrottle().get_cache_key(req, send_notification)
        assert key == f'notification_rate_limit-{self.data[0]["type"]}-' \
               f'{self.data[0]["user_email"]}-{"not_presented"}'.lower()
        # with system id
        req = self.make_request(arf, data=self.data_with_sysid)
        req.data = self.data_with_sysid[0]
        key = NotificationRateThrottle().get_cache_key(req, send_notification)
        assert key == f'notification_rate_limit-{self.data_with_sysid[0]["type"]}-' \
               f'{self.data_with_sysid[0]["user_email"]}-{self.data_with_sysid[0]["system_id"]}'.lower()

        req = self.make_request(arf, data=self.data_with_sysid[1])
        req.data = self.data_with_sysid[1]
        key = NotificationRateThrottle().get_cache_key(req, send_notification)
        assert key == f'notification_rate_limit-{self.data_with_sysid[1]["type"]}-' \
               f'{self.data_with_sysid[1]["user_email"]}-{self.data_with_sysid[1]["message"]["system_id"]}'.lower()

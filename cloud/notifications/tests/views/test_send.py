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


class TestSend:
    msg = {
        "userFullName": 'user dummy'
    }
    data = [
        {'user_email': 'DUMmY@example.com', 'type': 'restore_password',
         'message': msg, 'customization': settings.CUSTOMIZATION},
        {'user_email': 'DummY@example.com', 'type': 'RESTORE_password',
         'message': msg, 'customization': settings.CUSTOMIZATION},
        {'user_email': 'DummY@example.com', 'type': 'RESTORE_password',
         'message': msg,
         'customization': settings.CUSTOMIZATION}
    ]
    data_with_sysid = [
        {
            'user_email': 'dummy@example.com', 'type': 'restore_password',
            'message': msg, 'customization': settings.CUSTOMIZATION,
            'system_id': uuid4()
        },
        {
            'user_email': 'DummY@example.com', 'type': 'RESTORE_password',
            'message': {"userFullName": 'user dummy', 'system_id': uuid4()},
            'customization': settings.CUSTOMIZATION
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


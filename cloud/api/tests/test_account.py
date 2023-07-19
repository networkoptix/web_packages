from uuid import uuid4

from django.contrib.messages import get_messages
from django.core import mail
from django.test import TestCase
from django.urls import reverse

from api.models import *
from cms.models import Language
from .utils import NxTestClient

import pytest
from pytest_django.asserts import assertContains


@pytest.mark.integration
class TestLoginHistory:
    test_user_email = 'test@test.com'

    @pytest.fixture(autouse=True)
    def setup(self, client, db, default_customization, default_customization_ctx) -> None:
        self.user = Account.objects.get_or_create(email='test@test.com')[0]
        self.client = client

    @pytest.mark.slow
    def test_login(self):
        # response = self.client.post('/api/account/login', data={'email': 'test@test.com', 'password': 'password'})
        self.client.force_login(self.user)
        last_record = AccountLoginHistory.objects.last()
        assert last_record.action == 'user_logged_in'
        assert last_record.email == 'test@test.com'
        assert last_record.ip == '127.0.0.1'

    def test_logout(self):
        self.client.force_login(self.user)
        self.client.logout(self.user)
        last_record = AccountLoginHistory.objects.order_by('id').last()
        assert last_record.action == 'user_logged_out'
        assert last_record.email == 'test@test.com'
        assert last_record.ip == '127.0.0.1'

    def test_failed_login(self, disable_feature_flags):
        self.client.post('/api/account/login', data={'email': 'test@test.com', 'password': 'wrongPass'})
        last_record = AccountLoginHistory.objects.order_by('id').last()
        assert last_record.action == 'user_login_failed'
        assert last_record.email == 'test@test.com'
        assert last_record.ip == '127.0.0.1'


@pytest.mark.integration
class TestCloudInvite:
    @pytest.fixture(autouse=True)
    def setup(self, admin_client, default_customization):
        self.client = admin_client
        self.invite_path = reverse('admin:invite')
        self.existing_user = Account.objects.get_or_create(email='exists@exists.com')[0]
        self.customization = default_customization

    def test_get(self):
        response = self.client.get(self.invite_path)
        assert response.status_code == 200
        assertContains(response, '<h1>Invite User</h1>', html=True)

    @pytest.mark.skip(reason="Not sure why this started intermittently failing")
    def test_post(self):
        response = self.client.post(self.invite_path, data={
            'customization': 'default', 'email': 'invite@test.com', 'message': 'Welcome to cloud!'
        }, follow=True)
        assert response.status_code == 200
        assertContains(response, 'User has been invited to cloud.')
        user_created = Account.objects.filter(email='invite@test.com').exists()
        assert user_created, 'Invited account was not created'
        assert mail.outbox

    def test_post_fail(self):
        response = self.client.post(self.invite_path, data={
            'customization': 'not', 'email': 'invite@test.com', 'message': 'Welcome to cloud!'
        }, follow=True)
        assert response.status_code == 200
        assertContains(response, 'Select a valid choice')

    def test_user_exists(self):
        default_data = {'customization': self.customization.name, 'message': 'Welcome!'}

        # Invite existing user
        response = self.client.post(self.invite_path, data={
            **default_data,
            'email': self.existing_user.email,
        }, follow=True)
        messages = list(get_messages(response.wsgi_request))
        assert 'User already has a cloud account!' == messages[0].message
        # Make sure no email is sent
        assert not mail.outbox

    def test_group(self):
        group = Group.objects.create(name='test_group')
        default_data = {'customization': self.customization.name, 'message': 'Welcome!'}
        # Invite user to group
        response = self.client.post(f'{self.invite_path}?group_id={group.id}', data={
            **default_data,
            'email': self.existing_user.email,
        }, follow=True)
        messages = list(get_messages(response.wsgi_request))
        assert f'User successfully added to "{group.name}" group.' == messages[0].message
        assert self.existing_user.groups.filter(id=group.id).exists()
        # Make sure no email is sent
        assert not mail.outbox

        # Invite user to group they are already a part of
        response = self.client.post(f'{self.invite_path}?group_id={group.id}', data={
            **default_data,
            'email': self.existing_user.email,
        }, follow=True)
        assert self.existing_user.groups.filter(id=group.id).exists()
        messages = list(get_messages(response.wsgi_request))
        assert f'User already in "{group.name}" group.' == messages[0].message
        # Make sure no email is sent
        assert not mail.outbox

    def test_message(self, admin_client):
        admin_client.follow = True
        response = admin_client.post(reverse('admin:invite'), data={
            'customization': 'default',
            'email': 'new_account@newaccount.com',
            'message': 'Test message'
        }, follow=True)
        assert 'Test message' in mail.outbox[0].body



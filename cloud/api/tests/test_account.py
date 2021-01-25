from django.contrib.messages import get_messages
from django.core import mail
from django.test import TestCase
from django.urls import reverse

from api.models import *
from cms.models import Language
from .utils import NxTestClient


class LoginHistoryTestCase(TestCase):
    client_class = NxTestClient

    @classmethod
    def setUpTestData(cls) -> None:
        cls.user = Account.objects.create(email='test@test.com')

    def test_login(self):
        # response = self.client.post('/api/account/login', data={'email': 'test@test.com', 'password': 'password'})
        self.client.force_login(self.user)
        last_record = AccountLoginHistory.objects.last()
        self.assertEqual('user_logged_in', last_record.action)
        self.assertEqual('test@test.com', last_record.email)
        self.assertEqual('127.0.0.1', last_record.ip)

    def test_logout(self):
        self.client.force_login(self.user)
        self.client.logout(self.user)
        last_record = AccountLoginHistory.objects.order_by('id').last()
        self.assertEqual('user_logged_out', last_record.action)
        self.assertEqual('test@test.com', last_record.email)
        self.assertEqual('127.0.0.1', last_record.ip)

    def test_failed_login(self):
        self.client.post('/api/account/login', data={'email': 'test@test.com', 'password':'wrongPass'})
        last_record = AccountLoginHistory.objects.order_by('id').last()
        self.assertEqual('user_login_failed', last_record.action)
        self.assertEqual('test@test.com', last_record.email)
        self.assertEqual('127.0.0.1', last_record.ip)


class CloudInviteViewTest(TestCase):
    @classmethod
    def setUpTestData(cls) -> None:
        cls.superuser = Account.objects.create(
            email='test@test.com', first_name='super', last_name='user', is_superuser=True, is_staff=True
        )
        lang = Language.objects.create(code='en_US')
        cls.customization = Customization.objects.create(name='default', default_language=lang)

    def setUp(self) -> None:
        self.client.force_login(self.superuser)
        self.invite_path = reverse('admin:invite')
        self.client.follow = True
        self.existing_user = Account.objects.create(email='exists@exists.com')

    def test_get(self):
        response = self.client.get(self.invite_path)
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, '<h1>Invite User</h1>', html=True)

    def test_post(self):
        response = self.client.post(self.invite_path, data={
            'customization': 'default', 'email': 'invite@test.com', 'message': 'Welcome to cloud!'
        }, follow=True)
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'User has been invited to cloud.')
        user_created = Account.objects.filter(email='invite@test.com').exists()
        self.assertTrue(user_created, 'Invited account was created')
        self.assertTrue(mail.outbox)

    def test_post_fail(self):
        response = self.client.post(self.invite_path, data={
            'customization': 'not', 'email': 'invite@test.com', 'message': 'Welcome to cloud!'
        }, follow=True)
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Select a valid choice')

    def test_user_exists(self):
        default_data = {'customization': self.customization.name, 'message': 'Welcome!'}

        # Invite existing user
        response = self.client.post(self.invite_path, data={
            **default_data,
            'email': self.existing_user.email,
        }, follow=True)
        messages = list(get_messages(response.wsgi_request))
        self.assertEqual('User already has a cloud account!', messages[0].message)
        # Make sure no email is sent
        self.assertFalse(mail.outbox)

    def test_group(self):
        group = Group.objects.create(name='test_group')
        default_data = {'customization': self.customization.name, 'message': 'Welcome!'}
        # Invite user to group
        response = self.client.post(f'{self.invite_path}?group_id={group.id}', data={
            **default_data,
            'email': self.existing_user.email,
        }, follow=True)
        messages = list(get_messages(response.wsgi_request))
        self.assertEqual(f'User successfully added to "{group.name}" group.', messages[0].message)
        self.assertTrue(self.existing_user.groups.filter(id=group.id).exists())
        # Make sure no email is sent
        self.assertFalse(mail.outbox)

        # Invite user to group they are already a part of
        response = self.client.post(f'{self.invite_path}?group_id={group.id}', data={
            **default_data,
            'email': self.existing_user.email,
        }, follow=True)
        self.assertTrue(self.existing_user.groups.filter(id=group.id).exists())
        messages = list(get_messages(response.wsgi_request))
        self.assertEqual(f'User already in "{group.name}" group.', messages[0].message)
        # Make sure no email is sent
        self.assertFalse(mail.outbox)

    def test_message(self):
        self.client.post(self.invite_path, data={
            'customization': self.customization.name,
            'email': 'new_account@newaccount.com',
            'message': 'Test message'
        }, follow=True)

        self.assertTrue('Test message' in mail.outbox[0].body)



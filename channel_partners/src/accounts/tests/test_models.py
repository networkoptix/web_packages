from uuid import uuid4

import pytest
from django.contrib.auth.backends import ModelBackend
from django.views.generic.dates import timezone_today

from accounts.models import Account


class TestAccount:

    @pytest.fixture(autouse=True)
    def setup(self):
        self.email = f'{uuid4()}'
        self.password = f'{uuid4()}'
        self.first, self.last = f'{uuid4()}', f'{uuid4()}'

    def test_create(self, db):
        Account.objects.create_user(self.email, self.password, first_name=self.first, last_name=self.last)

        user = Account.objects.get(email=self.email)

        assert user.first_name == self.first
        assert user.last_name == self.last
        assert user.created_date.date() == timezone_today()

    def test_authenticate(self, db):
        Account.objects.create_user(self.email, self.password, first_name=self.first, last_name=self.last)

        user = ModelBackend().authenticate({}, email=self.email, password=self.password)

        assert user.first_name == self.first
        assert user.last_name == self.last
        assert user.created_date.date() == timezone_today()

        user = ModelBackend().authenticate({}, email=self.email, password='wrong password')

        assert user is None


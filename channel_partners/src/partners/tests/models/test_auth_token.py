from uuid import uuid4

import pytest
from django.core.exceptions import ValidationError

from partners.models import AuthToken


class TestAuthTokenUpdateInternalToken:

    def test_update_internal_token_create(self, db):
        key = f'{uuid4()}'
        auth_token = AuthToken.update_internal_token(key=key)
        assert auth_token.key == key
        assert auth_token.internal is True
        assert auth_token.enabled is True

    def test_update_internal_token_update(self, db):
        key = f'{uuid4()}'
        AuthToken.objects.create(key=f'{uuid4()}', internal=True, enabled=True)
        auth_token = AuthToken.update_internal_token(key=key)
        assert auth_token.key == key
        assert auth_token.internal is True
        assert auth_token.enabled is True

    def test_update_internal_token_disable(self, db):
        #  creating disabled token
        key = ''
        AuthToken.objects.create(key=f'{uuid4()}', internal=True, enabled=True)
        auth_token = AuthToken.update_internal_token(key=key)
        assert auth_token.key == AuthToken.INTERNAL_TOKEN_NAME
        assert auth_token.internal is True
        assert auth_token.enabled is False

        # enabling token
        key = f'{uuid4()}'
        AuthToken.objects.create(key=f'{uuid4()}', internal=True, enabled=True)
        auth_token = AuthToken.update_internal_token(key=key)
        assert auth_token.key == key
        assert auth_token.internal is True
        assert auth_token.enabled is True

        # disabling token
        key = None
        AuthToken.objects.create(key=f'{uuid4()}', internal=True, enabled=True)
        auth_token = AuthToken.update_internal_token(key=key)
        assert auth_token.key == AuthToken.INTERNAL_TOKEN_NAME
        assert auth_token.internal is True
        assert auth_token.enabled is False

    def test_unique_internal_token(self, db):
        key = f'{uuid4()}'
        auth_token = AuthToken.update_internal_token(key=key)
        assert auth_token.key == key
        assert auth_token.internal is True
        assert auth_token.enabled is True

        #  creating another internal token
        key = f'{uuid4()}'
        with pytest.raises(ValidationError):
            auth_token = AuthToken.objects.create(key=key, enabled=True, name=AuthToken.INTERNAL_TOKEN_NAME)

        # renaming token
        token = AuthToken.objects.create(key=key, enabled=True, name='name')
        token.name = AuthToken.INTERNAL_TOKEN_NAME
        with pytest.raises(ValidationError):
            token.save()




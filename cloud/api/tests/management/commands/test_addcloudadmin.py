import pytest
from uuid import uuid4
from unittest.mock import call

from model_bakery import baker

from api.management.commands.addcloudadmin import *


class TestAddCloudAdmin:
    def test_add_arguments(self, mocker):
        parser = mocker.MagicMock()
        Command().add_arguments(parser)
        parser.add_argument.assert_has_calls([
            call('email', type=str), call('password', type=str)])

    def test_handle(self, mocker, account_factory, db):
        email = f'{uuid4()}@{uuid4()}.com'
        password = str(uuid4())
        environ = {
            **dict(os.environ),
            'LOCAL_ENV': False
        }
        mocker.patch.object(os, 'environ', environ)
        mock_sleep = mocker.patch.object(
            time, 'sleep')
        mock_register = mocker.patch.object(
            cloud_api.Account, 'register')
        mock_activate = mocker.patch.object(
            cloud_api.Account, 'activate')
        code = str(uuid4())
        message = baker.make(
            Message, user_email=email, message={'code': code})

        instance = Command()
        mock_write_stdout = mocker.patch.object(
            instance.stdout, 'write')

        # Test already contains accounts
        user = account_factory()
        pytest.raises(
            RuntimeError,
            instance.handle,
            match='This command should only be run if no accounts exists'
        )
        user.delete()

        # Test missing email
        pytest.raises(
            ValueError,
            instance.handle,
            match='Missing email!'
        )

        # Test missing password
        pytest.raises(
            ValueError,
            instance.handle,
            match='Missing password!',
            email=email
        )

        # Test successfully activated
        first, last, *_ = email
        instance.handle(
            email=email, password=password)
        mock_register.assert_called_once_with(
            '', email, password, first, last)
        mock_activate.assert_called_once_with(code)
        expected_calls = (
            ('SUCCESS', f'Successfully added user with {email} for email.'),
            ('NOTICE', f'Waiting for {SLEEP_TIMER}s to activate the account.'),
            ('SUCCESS', f'Successfully activated {email}.')
        )
        mock_write_stdout.assert_has_calls(
            call(getattr(instance.style, style)(msg))
            for style, msg in expected_calls)

        # Test activate failed
        Account.objects.filter(email=email).delete()
        message.delete()

        instance.handle(
            email=email, password=password)
        assert not Account.objects.filter(email=email).first()
        mock_write_stdout.assert_called_with(
            instance.style.ERROR(f"Failed to activate {email}. Deleting the account."
                                 f"Please try again. If it continues to fail please contact support.")
        )

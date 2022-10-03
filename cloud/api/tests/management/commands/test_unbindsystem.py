import pytest
from uuid import uuid4
from unittest.mock import call

from api.management.commands.unbindsystem import *


class TestUnbindSystem:
    required_arguments = ['systemId', 'email', 'password']

    def test_add_arguments(self, mocker):
        parser = mocker.MagicMock()
        default_email, default_password = [
            str(uuid4()) for _ in range(2)]
        environ = {
            **dict(os.environ),
            'UNBIND_EMAIL': default_email,
            'UNBIND_PASS': default_password
        }
        mocker.patch.object(os, 'environ', environ)

        Command().add_arguments(parser)

        parser.add_argument.assert_has_calls([
            call('systemId', type=str),
            call('--email', default=default_email, type=str),
            call('--password', default=default_password, type=str)
        ])

    def test_handle(self, mocker):
        options = {}
        instance = Command()
        environ = {
            **dict(os.environ),
            'LOCAL_ENV': False
        }
        mocker.patch.object(os, 'environ', environ)
        mock_unbind = mocker.patch.object(System, 'unbind')
        mock_err = mocker.patch.object(instance.stderr, 'write')

        # Test command only available locally
        pytest.raises(
            RuntimeError,
            instance.handle,
            match='This command can only be ran locally!'
        )

        # Test checking for correct arguments
        environ['LOCAL_ENV'] = True
        for arg in self.required_arguments:
            pytest.raises(
                ValueError,
                instance.handle,
                match=f'{arg} is required',
                **options)
            options[arg] = str(uuid4())

        # Test unsuccessful unbind
        instance.handle(**options)
        mock_err.assert_called_once_with(
            instance.style.ERROR(
                'Could not match a system id'))

        # Test successful bind
        system_to_unbind = str(uuid4())
        options['systemId'] += f'/{system_to_unbind}'
        instance.handle(**options)
        mock_unbind.assert_called_once_with(
            options['email'], options['password'], system_to_unbind)

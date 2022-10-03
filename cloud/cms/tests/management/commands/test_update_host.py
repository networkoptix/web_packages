import pytest
from unittest.mock import call
from random import randint
from uuid import uuid4

from cms.management.commands.update_host import *


class TestUpdateHost:
    def test_handle(self, mocker, db):
        instance = Command()
        current_customization = Customization.objects.filter(
            name=settings.CUSTOMIZATION).first()
        mock_write_stdout = mocker.patch.object(instance.stdout, 'write')
        expected_host = str(uuid4())
        mock_config = {
            'cloud_portal': {
                'url': expected_host
            }
        }
        mocker.patch.object(config, 'get_config', return_value=mock_config)
        customization = settings.CUSTOMIZATION
        mock_get_customization = mocker.patch(
            'cms.management.commands.update_host.get_customization', return_value=customization)

        # Test host updated
        instance.handle()
        mock_write_stdout.assert_called_with(
            instance.style.SUCCESS(
                f'Host for {customization} updated to {expected_host}'))
        assert Customization.objects.get(
            id=current_customization.id).host == expected_host

        # Test already correct host
        instance.handle()
        mock_write_stdout.assert_called_with(
            instance.style.SUCCESS(
                f'Host for {customization} already correct as {expected_host}'))
        assert Customization.objects.get(
            id=current_customization.id).host == expected_host

        # Test customization not found
        customization = mock_get_customization.return_value = str(uuid4())
        instance.handle()
        mock_write_stdout.assert_called_with(
            instance.style.ERROR(
                f'Customization object for {customization} not found'))

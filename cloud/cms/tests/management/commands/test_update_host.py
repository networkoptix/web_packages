import pytest
from unittest.mock import call
from random import randint
from uuid import uuid4

from cms.management.commands.update_host import *


class TestUpdateHost:
    def test_handle(self, mocker, db, default_customization):
        options = {'customization': settings.TEST_CUSTOMIZATION}
        instance = Command()
        current_customization = Customization.objects.filter(
            name=settings.TEST_CUSTOMIZATION).first()
        mock_write_stdout = mocker.patch.object(instance.stdout, 'write')
        expected_host = str(uuid4())

        customization = settings.TEST_CUSTOMIZATION

        # Test host updated
        instance.handle(**options, host=expected_host)
        mock_write_stdout.assert_called_with(
            instance.style.SUCCESS(
                f'Host for {customization} updated to {expected_host}'))
        assert Customization.objects.get(
            id=current_customization.id).host == expected_host

        # Test already correct host
        instance.handle(**options, host=expected_host)
        mock_write_stdout.assert_called_with(
            instance.style.SUCCESS(
                f'Host for {customization} updated to {expected_host}'))
        assert Customization.objects.get(
            id=current_customization.id).host == expected_host

        # Test customization not found
        customization = str(uuid4())
        instance.handle(customization=customization, host=expected_host)
        mock_write_stdout.assert_called_with(
            instance.style.ERROR(
                f'Host for {customization} updated to {expected_host}'))

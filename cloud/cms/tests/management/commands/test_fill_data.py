import pytest
from unittest.mock import call
from uuid import uuid4

from cms.management.commands.filldata import *
from cms.models import Asset, AssetType


class TestFillData:
    def test_add_arguments(self, mocker):
        parser = mocker.MagicMock()
        Command().add_arguments(parser)
        parser.add_argument.assert_has_calls([
            call('--customization', default='default', nargs='?', type=str),
            call('--preview', nargs='?', default=False, type=bool)
        ])

    def test_handle(self, mocker, db):
        customization_option, preview = [
            str(uuid4()) for _ in range(2)]
        instance = Command()

        mock_warning = mocker.patch.object(logger, 'warning')
        mock_critical = mocker.patch.object(logger, 'critical')
        mock_write_stdout = mocker.patch.object(instance.stdout, 'write')
        mock_init_skin = mocker.patch.object(
            filldata, 'init_skin', return_value=None)
        mock_sleep = mocker.patch.object(time, 'sleep')

        # Raise error if missing customization option
        pytest.raises(
            ValueError, instance.handle, match='customization is required')

        # Raise error if missing preview
        pytest.raises(
            ValueError, instance.handle, customization=customization_option, match='preview is required')

        # Test that new customization is generated and fill data failed
        instance.handle(customization=customization_option, preview=preview)

        created_customization = Customization.objects.filter(
            name=customization_option, default_language__code='en_US').first()
        added_default_to_languages = list(
            created_customization.languages.all()) == [created_customization.default_language]
        created_cloud_portal_asset = Asset.objects.filter(
            customizations__name__in=[customization_option],
            asset_type__name="",
            asset_type__type=AssetType.ASSET_TYPES.cloud_portal
        ).first()

        failed_messages = [
            f'Filldata Failed. Retrying in {settings.FILLDATA_TIMEOUT} seconds'
            for _ in range(settings.FILLDATA_TRIES)]

        failed_warning_calls = [
            call(message) for message in failed_messages]

        expected_warning_messages = [
            call(f'Customization {customization_option} was automatically generated.'
                 f'{settings.CONFIG_ERROR} To configure cloud for {customization_option}.'),
            *failed_warning_calls]

        failed_stdout_calls = [
            call(instance.style.WARNING(
                message))
            for message in failed_messages]

        failure_message = f"Filldata failed after running {settings.FILLDATA_TRIES} time(s). " \
                          f"Run forceupdate for {created_cloud_portal_asset} to fix the problem."

        expected_std_out_calls = [
            *failed_stdout_calls,
            call(instance.style.ERROR(failure_message))]

        expected_sleep_calls = [
            call(settings.FILLDATA_TIMEOUT)
            for _ in range(settings.FILLDATA_TRIES)]

        assert created_customization
        assert added_default_to_languages
        assert created_cloud_portal_asset
        mock_sleep.assert_has_calls(expected_sleep_calls)
        mock_warning.assert_has_calls(expected_warning_messages)
        mock_critical.assert_called_once_with(failure_message)
        mock_write_stdout.assert_has_calls(expected_std_out_calls)
        mock_init_skin.assert_has_calls(
            call(created_cloud_portal_asset, preview, workers=1)
            for _ in range(settings.FILLDATA_TRIES))

        # Test success
        mock_init_skin.return_value = True
        instance.handle(customization=customization_option, preview=preview)
        mock_write_stdout.assert_called_with(
            instance.style.SUCCESS(
                f"Successfully initiated static content for {created_cloud_portal_asset}"))

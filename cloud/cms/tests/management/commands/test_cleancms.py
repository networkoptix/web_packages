import pytest
from unittest.mock import call
from random import randint
from model_bakery import baker

from cms.management.commands.cleancms import *
from cms.models import DataRecord


class TestCleanCMS:
    @pytest.mark.slow
    def test_handle(self, mocker, db):
        instance = Command()
        mock_write_stdout = mocker.patch.object(
            instance.stdout, 'write')

        # Test not debug
        instance.handle()
        mock_write_stdout.assert_called_once_with(
            instance.style.ERROR('Command not allowed if DEBUG=False'))

        # Test already clean
        mocker.patch(
            'cms.management.commands.cleancms.check_if_debug', return_value=True)
        instance.handle()
        mock_write_stdout.assert_has_calls([
            call('Cleaning unused CMS records(no version, not latest)'),
            call(instance.style.SUCCESS('Cleaned 0 records'))])

        # Test records cleaned
        language = baker.make(Language)
        data_structure = baker.make(DataStructure)
        no_lang_to_clean = randint(3, 10)
        with_lang_to_clean = randint(3, 10)
        latest_no_language, *no_language_to_clean = [
            baker.make(DataRecord, data_structure=data_structure)
            for _ in range(no_lang_to_clean + 1)][::-1]
        latest_with_language, *with_language_to_clean = [
            baker.make(DataRecord, language=language,
                       data_structure=data_structure)
            for _ in range(with_lang_to_clean + 1)][::-1]

        should_still_exist = [
            record.id
            for record in [
                latest_no_language, latest_with_language]]
        should_not_exist = [
            record.id
            for record in [
                *no_language_to_clean, *with_language_to_clean]]

        instance.handle()
        mock_write_stdout.assert_called_with(
            instance.style.SUCCESS(
                f'Cleaned {no_lang_to_clean + with_lang_to_clean} records'))

        assert not DataRecord.objects.filter(
            id__in=should_not_exist)
        assert DataRecord.objects.filter(
            id__in=should_still_exist).count() == 2

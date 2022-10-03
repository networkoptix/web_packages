import pytest
from unittest.mock import call
from random import randint, choice
from uuid import uuid4
from model_bakery import baker

from cms.management.commands.cleanoldversions import *
from cms.models import AssetType


class TestCleanOldVersions:
    def test_handle(self, mocker, patch_thread_pool_executor, db):
        mock_process_asset, instance, mock_write_stdout, mock_executor_submit, mock_future = patch_thread_pool_executor(
            'process_asset')

        for _ in range(randint(5, 15)):
            baker.make(Asset)

        languages = list(Language.objects.all())
        customizations = list(Customization.objects.all())
        assets = Asset.objects.all().prefetch_related(
            'asset_type__context_set__datastructure_set')

        expected_submit_futures = [
            call(mock_process_asset, asset, languages, customizations)
            for asset in assets]
        processed_count = assets.count()

        # Test not in debug
        instance.handle()
        mock_write_stdout.assert_called_once_with(
            instance.style.ERROR('Command not allowed if DEBUG=False'))

        # Test handled
        mocker.patch(
            'cms.management.commands.cleanoldversions.check_if_debug')
        instance.handle()
        mock_write_stdout.assert_has_calls([
            call('Cleaning unused CMS versions'),
            call(instance.style.SUCCESS(
                f'Cleaned {processed_count} records for {processed_count} assets'))])
        mock_executor_submit.assert_has_calls(expected_submit_futures)
        assert mock_future.result.call_count == processed_count

    def test_process_asset(self, mocker, patch_thread_pool_executor, db):
        find_used_versions, instance, _, executor_submit, future = patch_thread_pool_executor(
            'find_used_versions')
        asset_type_id = AssetType.get_type_by_name(
            choice(AssetType.ASSET_TYPES))
        asset_type, _ = AssetType.objects.get_or_create(type=asset_type_id)
        asset = baker.make(Asset, asset_type=asset_type)
        expected_cleaned_count = 0
        not_used_versions = []

        def mock_result_handler():
            nonlocal expected_cleaned_count, not_used_versions
            not_used_versions.append(baker.make(
                ContentVersion, asset=asset).id)
            used_version = baker.make(ContentVersion, asset=asset)
            expected_cleaned_count += 1
            return [used_version.id]

        for _ in range(randint(3, 10)):
            baker.make(Customization)
            baker.make(Language)

        all_languages = list(Language.objects.all())
        all_customizations = list(Customization.objects.all())
        translatable_dss, non_translatable_dss = instance.get_dss(asset)

        expected_submit_futures = [
            call(find_used_versions, translatable_dss, asset,
                 language, all_customizations=all_customizations)
            for language in all_languages]

        expected_submit_futures.append(
            call(find_used_versions, non_translatable_dss, asset,
                 language=None, all_customizations=all_customizations))
        
        future.result = mock_result_handler

        cleaned_count = instance.process_asset(
            asset, all_languages, all_customizations)

        assert cleaned_count == expected_cleaned_count
        assert not ContentVersion.objects.filter(
            asset=asset, id__in=not_used_versions)
        executor_submit.assert_has_calls(
            expected_submit_futures)

    def test_find_used_version(self, mocker):
        instance = Command()
        expected_versions = set()
        data_structures, asset, language, mock_find_actual_values, *all_customizations = [
            mocker.MagicMock() for _ in range(randint(15, 25))]

        def find_actual_values(*args, **kwargs):
            mock_find_actual_values(*args, **kwargs)
            version = str(uuid4())
            expected_versions.add(version)
            return {'_': mocker.MagicMock(version_id=version)}

        for customization in all_customizations:
            customization.name = str(uuid4())

        asset.customizations.all.return_value = all_customizations

        find_value_args = data_structures, asset
        find_value_kwargs_for_calls = [{
            'language': language,
            'customization_name': customization.name,
            'as_records': True
        } for customization in all_customizations]
        mocker.patch.object(
            DataStructure, 'find_actual_values', find_actual_values)

        expected_find_actual_value_calls = [[
            call(*find_value_args, **kwargs),
            call(*find_value_args, **kwargs, only_review=True)]
            for kwargs in find_value_kwargs_for_calls]

        versions = instance.find_used_versions(
            data_structures, asset, language, all_customizations)

        assert versions == expected_versions
        mock_find_actual_values.assert_has_calls(
            expected_call
            for calls in expected_find_actual_value_calls
            for expected_call in calls)

    @pytest.fixture
    def patch_thread_pool_executor(self, mocker):
        def _patch_thread_pool_executor(method_to_patch):
            instance = Command()
            mock_write_stdout = mocker.patch.object(
                instance.stdout, 'write')
            mock_thread_pool_executor = mocker.patch.object(
                futures, 'ThreadPoolExecutor')
            mock_process_asset = str(uuid4())
            mocker.patch.object(instance, method_to_patch, mock_process_asset)
            mock_future = mocker.MagicMock()
            mock_future.result.return_value = 1
            mock_executor_submit = mock_thread_pool_executor\
                .return_value.__enter__\
                .return_value.submit
            mock_executor_submit.return_value = mock_future
            mocker.patch.object(
                futures, 'as_completed', lambda x: x)
            return mock_process_asset, instance, mock_write_stdout, mock_executor_submit, mock_future

        return _patch_thread_pool_executor

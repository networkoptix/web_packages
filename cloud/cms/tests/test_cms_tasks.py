import pytest
from uuid import uuid4
from random import randint
from unittest.mock import call
from model_bakery import baker
from django.conf import settings

from cms.models import AssetType, Customization
from cms.tasks import *


def test_get_updater(mocker):
    mock_current_task = mocker.MagicMock()
    mock_task = mocker.MagicMock()
    mock_task.result = {}
    total = 100
    updater = get_progress_updater(
        mock_current_task, initial_total=total, task=mock_task)
    progress = [state for state in range(
        total) if state < randint(0, round(state * 3))]

    # Test no error
    expected_calls = [
        call(state='PROGRESS', meta={
             'current': current, 'total': total, 'errors': []})
        for current in progress]

    for current in progress:
        updater(current)

    mock_current_task.update_state.assert_has_calls(expected_calls)

    # Test error
    error = str(uuid4())
    updater(total, error=error)
    mock_current_task.update_state.assert_called_with(
        state='PROGRESS', meta={'current': total, 'total': total, 'errors': [error]})


def test_update_complete():
    request_id, content, file_name = [str(uuid4()) for _ in range(3)]
    updater = get_complete_updater(request_id)

    updater(file_name, content)

    assert PACKAGE_CACHE[request_id] == {
        'file': content, 'file_name': file_name, 'is_ready': True}


def test_get_package_cache_key(mocker, db):
    asset_id = str(uuid4())
    version_id = str(uuid4())
    mock_asset = mocker.MagicMock()
    mock_asset.id = asset_id
    mock_asset.version_id.return_value = version_id
    kwargs = {key: None for key in [
        'preview', 'version_id', 'structure_format']}

    # Test only asset
    assert get_package_cache_key(
        mock_asset, **kwargs) == f'{asset_id}-{version_id}'

    # Test version arg
    kwargs['version_id'] = str(uuid4())
    assert get_package_cache_key(
        mock_asset, **kwargs) == f'{asset_id}-{kwargs["version_id"]}'

    # Test preview arg
    kwargs['preview'] = True
    assert get_package_cache_key(
        mock_asset, **kwargs) == f'{asset_id}-{kwargs["version_id"]}-preview'

    # Test structure_format arg
    kwargs['structure_format'] = str(uuid4())
    assert get_package_cache_key(
        mock_asset, **kwargs) == f'{asset_id}-{kwargs["version_id"]}-preview-{kwargs["structure_format"]}'


def test_make_package(mocker, db):
    mock_updater = str(uuid4())
    mock_zip_package = str(uuid4())
    get_progress_updater = mocker.patch(
        'cms.tasks.get_progress_updater', return_value=mock_updater)
    mock_exporter_instance = mocker.MagicMock()
    mock_exporter_instance.get_zip_package.return_value = mock_zip_package
    mock_exporter = mocker.patch(
        'cms.controllers.filldata.PackageExporter', return_value=mock_exporter_instance)
    asset = baker.make(Asset)
    preview = True
    version_id = str(uuid4())

    make_package(asset.id, preview, version_id)
    get_progress_updater.assert_called_once_with(None)
    mock_exporter.assert_called_once_with(
        asset, preview, version_id, update_progress_cb=mock_updater)
    cache_key = get_package_cache_key(asset, preview, version_id)
    PACKAGE_CACHE[cache_key] == {"file": mock_zip_package, "is_ready": True}


def test_get_custom_client_package_key():
    custom_pk = str(uuid4())
    download_id = str(uuid4())
    assert get_custom_client_package_key(
        custom_pk, download_id) == f'custom-client-{custom_pk}-{download_id}'


def test_get_task_id(mocker):
    task_id = str(uuid4())
    current_task = mocker.MagicMock()
    current_task.request.id = task_id
    assert get_task_id(current_task) == task_id


def test_raise_errors(mocker):
    errors = [str(uuid4())]
    current_task = mocker.MagicMock()
    try:
        raise_errors(current_task, errors)

        # Shouldn't run
        assert False
    except TaskErrors as e:
        assert e.errors == errors


def test_make_custom_client(mocker, db):
    task_id = str(uuid4())
    mock_updater = str(uuid4())
    mock_zip_package = str(uuid4())
    custom_data = str(uuid4())
    errors = [str(uuid4())]
    mocker.patch('cms.tasks.get_task_id', return_value=task_id)
    get_progress_updater = mocker.patch(
        'cms.tasks.get_progress_updater', return_value=mock_updater)
    mock_exporter_instance = mocker.MagicMock()
    mock_exporter_instance.get_zip_package.return_value = mock_zip_package
    mock_exporter = mocker.patch(
        'cms.controllers.filldata.PackageExporter', return_value=mock_exporter_instance)
    download_id = str(uuid4())
    mock_raise_errors = mocker.patch(
        'cms.tasks.raise_errors', side_effect=TaskErrors(errors))
    mocker.patch('cms.controllers.filldata.calculate_custom_client_data',
                 return_value=[custom_data, []])
    base_vms = baker.make(
        Asset, asset_type=AssetType.objects.filter(type=AssetType.ASSET_TYPES.vms).first())
    custom_client = baker.make(CustomClient, base_vms=base_vms, created_customization=Customization.objects.filter(
        name=settings.CUSTOMIZATION).first())

    # Test no errors
    make_custom_client(custom_client.id, download_id)
    cache_key = get_custom_client_package_key(custom_client.id, download_id)
    assert PACKAGE_CACHE[cache_key] == {
        "file": mock_zip_package, "is_ready": True, 'task_id': task_id}
    mock_raise_errors.assert_not_called()

    # Test raises errors
    mocker.patch('cms.controllers.filldata.calculate_custom_client_data',
                 return_value=[custom_data, errors])
    try:
        make_custom_client(custom_client.id, download_id)

        # Shouldn't run
        assert False
    except TaskErrors as e:
        assert e.errors == errors


def test_make_structure(mocker, account_factory, cloud_portal_type, db):
    asset = baker.make(Asset, asset_type=cloud_portal_type)
    mock_asset_dict = {'name': asset.name, 'other': str(uuid4())}
    use_actual_values = True
    mock_updater = mocker.MagicMock()
    mock_complete_updater = mocker.MagicMock()
    mocker.patch('cms.tasks.get_progress_updater', return_value=mock_updater)
    mocker.patch('cms.tasks.get_complete_updater',
                 return_value=mock_complete_updater)
    mock_make_asset_dict = mocker.patch(
        'cms.tasks.make_asset_dict', return_value=mock_asset_dict)
    user = account_factory()

    make_structure(user.id, asset_id=asset.id,
                   use_actual_values=use_actual_values)
    expected_file_name = f"{asset.asset_type}-structure.json".replace(" ", "_").lower()
    expected_content = json.dumps(
        [mock_asset_dict], ensure_ascii=False, indent=4, separators=(',', ': '))
    mock_updater.assert_has_calls([call(0, 1), call(1, 1)])
    mock_make_asset_dict.assert_called_once_with(asset, use_actual_values)
    mock_complete_updater.assert_called_once_with(
        expected_file_name, expected_content)


def test_make_asset_dict(mocker, db):
    asset = baker.make(Asset)
    use_actual_values = True
    base_asset_dict = {str(uuid4): str(uuid4())}
    mock_from_db = mocker.patch(
        'cms.controllers.generate_structure.from_database', return_value=[base_asset_dict])
    mock_prepare_asset_exports = mocker.patch(
        'cms.views.asset.prepare_asset_exports')
    expected_asset_dict = {**base_asset_dict, 'name': asset.name, 'uuid': str(asset.uuid), 'customizations': [
        customization.name for customization in asset.customizations.all()]}

    asset_dict = make_asset_dict(asset, use_actual_values)
    assert asset_dict == expected_asset_dict
    mock_from_db.assert_called_once_with(asset, use_actual_values)
    assert mock_prepare_asset_exports.call_count == 1


def test_async_import_assets_from_json(mocker, account_factory, db):
    mock_get_progress_updater = str(uuid4())
    mock_task = str(uuid4())
    mocker.patch('cms.tasks.get_progress_updater',
                 return_value=mock_get_progress_updater)
    mocker.patch(
        'cms.tasks.async_import_assets_from_json.AsyncResult', return_value=mock_task)
    mock_import_assets_from_json = mocker.patch(
        'cms.controllers.structure.import_assets_from_json')
    json_cache_id = str(uuid4())
    asset_list = str(uuid4())
    PACKAGE_CACHE[json_cache_id] = asset_list
    user = account_factory()
    publish = True

    async_import_assets_from_json(json_cache_id, user.id, publish=publish)
    mock_import_assets_from_json.assert_called_once_with(
        asset_list, user, publish=publish, increment_progress=mock_get_progress_updater)


def test_async_menu_import(mocker, account_factory, db):
    task_id, mock_updater_cb, cache_key, menu_dict = [
        str(uuid4()) for _ in range(4)]
    PACKAGE_CACHE[cache_key] = menu_dict
    menu = baker.make(Menu)
    user = account_factory()
    accept_reviews = True

    mocker.patch('cms.tasks.async_menu_import.AsyncResult',
                 return_value=task_id)
    mocker.patch('cms.tasks.get_progress_updater',
                 return_value=mock_updater_cb)
    mock_from_dict = mocker.patch('cms.models.Menu.from_dict')

    async_menu_import(cache_key, menu.name, user.email, accept_reviews)
    mock_from_dict.assert_called_once_with(
        menu_dict, user, update_progress_cb=mock_updater_cb, accept_reviews=accept_reviews)


def test_async_menu_export(mocker):
    menu_name, mock_complete_cb, mock_update_progress_cb = [
        str(uuid4()) for _ in range(3)]
    mock_generate_export = mocker.patch('cms.admin.MenuAdmin.generate_export')
    mocker.patch('cms.tasks.get_complete_updater',
                 return_value=mock_complete_cb)
    mocker.patch('cms.tasks.get_progress_updater',
                 return_value=mock_update_progress_cb)

    async_menu_export(menu_name)
    mock_generate_export.assert_called_once_with(
        menu_name, complete_cb=mock_complete_cb, update_progress_cb=mock_update_progress_cb)


def test_async_zendesk_sync(mocker, db):
    from cms.models import Menu, ZendeskSite
    customization = Customization.objects.filter(
        name=settings.CUSTOMIZATION).first()
    site = ZendeskSite.objects.filter(customization=customization).first(
    ) or baker.make(ZendeskSite, customization=customization)
    menu = baker.make(Menu)
    mock_log_id = str(uuid4())
    mock_log = str(uuid4())
    force_update = True
    mock_get_log = mocker.patch(
        'cms.models.ZendeskSyncLog.objects.get', return_value=mock_log)
    mock_update_customization_structure = mocker.patch(
        'cms.controllers.zendesk.update_customization_structure')
    async_zendesk_sync(menu.id, customization.name,
                       mock_log_id, force_update=force_update)
    mock_get_log.assert_called_once_with(id=mock_log_id)
    mock_update_customization_structure.assert_called_once_with(
        menu, site, mock_log, force_update)


def test_async_zendesk_push_article(mocker, asset_factory, db):
    mock_push_accepted_article_to_zendesk = mocker.patch(
        'cms.controllers.zendesk.push_accepted_article_to_zendesk')
    asset, = asset_factory()
    customization_name = str(uuid4())

    async_zendesk_push_article(asset.id, customization=customization_name)
    mock_push_accepted_article_to_zendesk.assert_called_once_with(
        asset, customization=customization_name, request=None)

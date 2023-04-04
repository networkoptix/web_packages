import pytest
from uuid import uuid4
from random import randint
from rest_framework import status
from model_bakery import baker

from cms.views.menu import *


@pytest.mark.no_db
def test_get_menu(mocker, arf, account_factory, db):
    account = account_factory(prepare_only=True)

    def request_factory(path = ''):
        mock_request = arf.get(path)
        mock_request.session = {}
        mock_request.user = account
        return mock_request

    menu_name = str(uuid4())
    mock_generate_menu = mocker.patch(
        'cms.models.Menu.generate_menu', return_value=None)

    # Test redirect
    res = get_menu(request_factory(), menu_name)
    assert res.status_code == status.HTTP_302_FOUND
    redirect_url = res.url

    res = get_menu(request_factory(redirect_url), menu_name)
    assert res.status_code == status.HTTP_404_NOT_FOUND
    assert res.data['errorText'] == f'Menu {menu_name} not found'
    mock_generate_menu.assert_called_once_with(menu_name=menu_name, customization=settings.TEST_CUSTOMIZATION)

    # Test found
    mock_menu = str(uuid4())
    mock_generate_menu = mocker.patch(
        'cms.models.Menu.generate_menu', return_value=mock_menu)
    mocker.patch(
        'cms.models.Menu.generate_menus', return_value={})
    res = get_menu(request_factory(redirect_url), menu_name)
    assert res.status_code == status.HTTP_200_OK
    assert res.data == mock_menu
    mock_generate_menu.assert_called_once_with(menu_name=menu_name, customization=settings.TEST_CUSTOMIZATION)


def test_menu_force_sync(arf, mocker, account_factory, disable_feature_flags, db):
    def generate_mock_request(arf, payload, user):
        result = arf.post('', payload)
        result.session = {}
        result.user = user
        return result

    mock_request = arf.post('')
    mock_request.session = {}
    user = mock_request.user = account_factory()
    mock_sync_menu = mocker.patch('cms.controllers.zendesk.sync_menu')
    mock_menu_id = str(uuid4())
    payload = {'menu_id': mock_menu_id}

    # Test invalid payload
    res = menu_force_sync(mock_request)
    assert res.status_code == status.HTTP_400_BAD_REQUEST
    assert res.data['errorText'] == 'Payload must contain menu_id property'
    assert res.data['resultCode'] == ErrorCodes.wrong_parameters.value
    assert not mock_sync_menu.call_count

    mock_request = generate_mock_request(arf, payload, user)
    mock_filter = mocker.MagicMock()
    mock_filter.return_value.first.return_value = None
    mocker.patch.object(Menu.objects, 'filter', mock_filter)

    res = menu_force_sync(mock_request)
    assert res.status_code == status.HTTP_404_NOT_FOUND
    assert res.data['errorText'] == f'Menu menu_id {mock_menu_id} not found'
    assert not mock_sync_menu.call_count

    # Test found
    mock_menu = mocker.MagicMock()
    mock_menu.name = str(uuid4())
    mock_filter.return_value.first.return_value = mock_menu

    res = menu_force_sync(mock_request)
    assert res.status_code == status.HTTP_200_OK
    assert res.data == f'Menu syncing started for {mock_menu.name} for All customizations '
    mock_sync_menu.assert_called_once_with(mock_menu, None)

    # Test found with customizations
    customizations = list(Customization.objects.all())
    payload = {**payload, 'customizations': [
        customization.name for customization in customizations]}
    mock_request = generate_mock_request(arf, payload, user)
    res = menu_force_sync(mock_request)
    assert res.status_code == status.HTTP_200_OK
    assert res.data == f'Menu syncing started for {mock_menu.name} for {payload["customizations"]} customizations '

    mock_sync_menu.assert_called_with(mock_menu, customizations)


def test_menu_cancel_sync(arf, mocker, account_factory, disable_feature_flags, db):
    mock_cancel = mocker.patch.object(ZendeskSyncLog, 'cancel_existing_sync')
    mock_request = arf.post('')
    mock_request.session = {}
    mock_request.user = account_factory()
    mock_log_id = str(uuid4())
    mock_log = str(uuid4())

    # Test invalid payload
    res = menu_cancel_sync(mock_request)
    assert res.status_code == status.HTTP_400_BAD_REQUEST
    assert res.data['errorText'] == 'Payload must contain menu_id property'
    assert res.data['resultCode'] == ErrorCodes.wrong_parameters.value
    assert not mock_cancel.call_count

    # Test not found
    mock_filter = mocker.MagicMock()
    mock_filter.return_value.first.return_value = None
    mocker.patch.object(ZendeskSyncLog.objects, 'filter', mock_filter)
    mock_request = arf.post('', {'log_id': mock_log_id})
    mock_request.session = {}
    mock_request.user = account_factory()
    res = menu_cancel_sync(mock_request)
    assert res.status_code == status.HTTP_404_NOT_FOUND
    assert res.data['errorText'] == f'Sync log with log_id {mock_log_id} not found'
    mock_filter.assert_called_once_with(id=mock_log_id)
    assert not mock_cancel.call_count

    # Test found
    mock_filter.return_value.first.return_value = mock_log
    res = menu_cancel_sync(mock_request)
    assert res.status_code == status.HTTP_200_OK
    assert res.data == f'Syncing canceled for {mock_log_id}'
    mock_cancel.assert_called_once_with(mock_log_id)


@pytest.mark.no_db
def test_menu_clean_zd(mocker, arf, account_factory, disable_feature_flags):
    mock_customization = str(uuid4())
    mock_payload = {str(uuid4()): str(uuid4())}
    mock_data = {'customization': mock_customization, **mock_payload}
    mock_mapper_instance = mocker.MagicMock()
    mock_zendesk_mapper = mocker.patch(
        'cms.controllers.zendesk.ZendeskMapper', return_value=mock_mapper_instance)
    mock_request = arf.post('', mock_data)
    mock_request.user = account_factory(prepare_only=True)
    mock_request.session = {}

    res = menu_clean_zd(mock_request)
    assert res.status_code == status.HTTP_200_OK
    assert res.data == 'Cleaning Zendesk started'
    mock_zendesk_mapper.assert_called_once_with(
        customization_name=mock_customization)
    mock_mapper_instance.clean_zd.assert_called_once_with(mock_payload)


class TestMenuNodeAutoComplete:
    @pytest.fixture()
    def get_instance(self, arf, account_factory, db):
        def _get_instance(menu, query=''):
            instance = MenuNodeAutocomplete()
            setattr(instance, 'forwarded', {'menu': menu})
            setattr(instance, 'q', query)
            instance.request = arf.get('')
            instance.request.user = account_factory()
            return instance

        return _get_instance

    def test_get_queryset(self, get_instance, db):
        menu = baker.make(Menu)
        num_matches = randint(1, 5)
        match = str(uuid4())
        menu_nodes = [
            baker.make(
                MenuNode,
                parent_menu=menu,
                name=match if index < num_matches else str(uuid4())
            ) for index in range(randint(5, 15))
        ]
        instance = get_instance(menu.id, match)
        nodes_from_qs = list(instance.get_queryset())
        assert len(nodes_from_qs) == num_matches
        assert all(
            next((qs_node for qs_node in nodes_from_qs if qs_node.id == node.id), False)
            for node in menu_nodes if node.name == match)

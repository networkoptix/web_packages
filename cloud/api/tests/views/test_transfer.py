from rest_framework import serializers
from api.views.transfer import *
from conftest import generate_uuids
import pytest


class TestTransferViews:
    ownership_transfer_mock_path = 'cloud.controllers.cloud_api.OwnershipTransfer.'

    @pytest.fixture()
    def create_user(self, django_user_model):
        self.user = django_user_model(email='testemail@email.com')

    def test_transfer_system_action_serializer(self):
        with pytest.raises(serializers.ValidationError):
            TransferSystemActionSerializer(data={'action': 'random'}).is_valid(raise_exception=True)

        # Testing valid actions
        for action in ['accepted', 'rejected']:
            serializer = TransferSystemActionSerializer(data={'action': action})
            serializer.is_valid(raise_exception=True)
            assert serializer.data.get('action') == action

    def test_transfer_system_info_get(self, create_user, arf, mocker):
        mock_list = mocker.patch(self.ownership_transfer_mock_path + 'list')

        view = TransferSystemInfo().as_view()
        request = arf.get(f'/transfer/')
        request.user = self.user

        assert view(request).status_code == 200
        mock_list.assert_called_once()

    def test_transfer_system_actions_post(self, create_user, arf, mocker):
        mock_start = mocker.patch(self.ownership_transfer_mock_path + 'start')
        system_id = generate_uuids(1)

        view = TransferSystemActions().as_view()
        request = arf.post(f'/transfer/{system_id}', {'newOwnerEmail': self.user.email})
        request.user = self.user
        request.session = {}

        assert view(request, system_id).status_code == 200
        args, kwargs = mock_start.call_args_list[0]
        mock_start.assert_called_once_with(args[0], system_id, self.user.email)

    def test_transfer_system_actions_put(self, create_user, arf, mocker):
        action = 'accepted'
        mock_act_on = mocker.patch(self.ownership_transfer_mock_path + 'act_on')
        system_id, invalid_action = generate_uuids(2)

        view = TransferSystemActions().as_view()
        request = arf.put(f'/transfer/{system_id}', {'action': invalid_action})
        request.user = self.user
        request.session = {}

        assert view(request, system_id).status_code == 400
        assert not mock_act_on.called

        request = arf.put(f'/transfer/{system_id}', {'action': action})
        request.user = self.user
        request.session = {}

        assert view(request, system_id).status_code == 200
        args, kwargs = mock_act_on.call_args_list[0]
        mock_act_on.assert_called_once_with(args[0], system_id, offered_status=action)

    def test_transfer_system_actions_delete(self, create_user, arf, mocker):
        mock_cancel = mocker.patch(self.ownership_transfer_mock_path + 'cancel')
        system_id = generate_uuids(1)

        view = TransferSystemActions().as_view()
        request = arf.delete(f'/transfer/{system_id}')
        request.user = self.user
        request.session = {}

        assert view(request, system_id).status_code == 200
        args, kwargs = mock_cancel.call_args_list[0]
        mock_cancel.assert_called_once_with(args[0], system_id)

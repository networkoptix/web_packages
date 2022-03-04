import statistics
import pytest
from uuid import uuid4
from urllib.parse import urlencode
from random import randint

from rest_framework import status


class TestStorageViews:
    @pytest.fixture(autouse=True)
    def setup(self, account_factory):
        self.user = account_factory(prepare_only=True)
        self.session = {'login': str(uuid4()), 'password': str(uuid4())}

    @pytest.fixture
    def request_factory(self, arf):
        def handler(endpoint, get=False, data=None, authenticated=True):
            request_method_mocker = arf.get if get else arf.post
            query_string = urlencode(data) if get and data else ''
            request = request_method_mocker(
                f'{endpoint}?{query_string}', data=data if not get else None, GET=data if get else None)
            if authenticated:
                request.user = self.user
                request.session = self.session

            return request

        return handler

    @pytest.fixture
    def mock_storage_controller(self, mocker):
        def handler(patched_method, mocked_return=None):
            expected_return = str(
                uuid4()) if mocked_return is None else mocked_return
            to_patch = f'cloud.controllers.cloud_api.Storage.{patched_method}'
            mocked_method = mocker.patch(
                to_patch, return_value=expected_return)
            return mocked_method, expected_return

        return handler

    @pytest.fixture
    def assert_auth_required(self, request_factory):
        def handler(func, endpoint, data, get=False):
            unauthenticated_request = request_factory(
                endpoint, data=data, get=get, authenticated=False)
            unauthenticated_response = func(unauthenticated_request)
            assert unauthenticated_response.status_code == status.HTTP_401_UNAUTHORIZED

        return handler

    @pytest.mark.no_db
    def test_create(self, mock_cloud_portal_customization_cache, request_factory, mock_storage_controller, assert_auth_required):
        endpoint = '/api/storage/create'
        storage_size = randint(1, 10000)
        system_id = str(uuid4())
        data = {'systemId': system_id}

        mock_cloud_portal_customization_cache(
            target='api.views.storage', config={'cloud_storage_size': storage_size}
        )
        request = request_factory(endpoint, data=data)

        mock_create, expected_return = mock_storage_controller('create')
        from api.views.storage import create
        response = create(request)

        mock_create.assert_called_once()
        _, id_used, storage_size_used = mock_create.call_args.args
        assert id_used == system_id
        assert storage_size_used == storage_size
        assert response.status_code == status.HTTP_200_OK
        assert response.data == expected_return
        assert_auth_required(create, endpoint, data)

    @pytest.mark.no_db
    def test_create_storage_size_not_setup(self, mock_cloud_portal_customization_cache, request_factory, mock_storage_controller, assert_auth_required):
        endpoint = '/api/storage/create'
        storage_size = 0
        system_id = str(uuid4())
        data = {'systemId': system_id}

        mock_cloud_portal_customization_cache(
            target='api.views.storage', config={'cloud_storage_size': storage_size}
        )
        request = request_factory(endpoint, data=data)

        mock_create, expected_return = mock_storage_controller('create')
        from api.views.storage import create
        response = create(request)

        assert mock_create.call_count == 0
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        assert_auth_required(create, endpoint, data)

    @pytest.mark.no_db
    def test_delete(self,  request_factory, mock_storage_controller, mocker, assert_auth_required):
        endpoint = '/api/storage/delete'
        system_id = str(uuid4())
        password = str(uuid4())
        tokens = {'access_token': str(uuid4()), 'refresh_token': str(uuid4())}
        data = {'systemId': system_id, 'password': password}

        mocker.patch('cloud.controllers.cloud_api.Auth.get_token',
                     return_value=tokens)
        mocker.patch(
            'cloud.controllers.cloud_api.TempLogin.__exit__', return_value=None)
        request = request_factory(endpoint, data=data)

        mock_delete, _ = mock_storage_controller('delete_from_system')
        from api.views.storage import delete
        response = delete(request)

        mock_delete.assert_called_once_with(tokens, system_id)
        assert response.status_code == status.HTTP_200_OK
        assert_auth_required(delete, endpoint, data)

    @pytest.mark.no_db
    def test_move(self, request_factory, mock_storage_controller, assert_auth_required):
        endpoint = '/api/storage/move'
        destination_system_id = str(uuid4())
        source_system_id = str(uuid4())
        data = {'destinationSystemId': destination_system_id,
                'sourceSystemId': source_system_id}

        request = request_factory(endpoint, data=data)

        mock_move, _ = mock_storage_controller('move')
        from api.views.storage import move
        response = move(request)

        mock_move.assert_called_once()
        _, destination_used, source_used = mock_move.mock_calls[0].args
        assert destination_used == destination_system_id
        assert source_used == source_system_id
        assert response.status_code == status.HTTP_200_OK
        assert_auth_required(move, endpoint, data)

    def test_usage_stats(self, request_factory, mock_storage_controller, mock_cloud_portal_customization_cache, assert_auth_required, db):
        self.user.save()
        endpoint = '/api/storage/statistics'
        storage_size = randint(1, 10000)
        mock_cloud_portal_customization_cache(
            config={'cloud_storage_size': storage_size})
        system_id = str(uuid4())
        data = {'systemId': system_id}
        expected_storage_info = {
            'spaceUsed': 0,
            'currentRecordingBitrate': [],
            'maxLiveDelay': [],
            'maxCameraRetention': 0,
            'cameraCount': 0,
            'cloudCapacity': 0
        }

        keys_to_add = ('cameraCount', 'maxCameraRetention',
                       'spaceUsed', 'currentRecordingBitrate', 'maxLiveDelay')
        storage = {
            'id': str(uuid4()),
            'totalSize': storage_size
        }

        def add(key):
            value = randint(1, 1000)
            storage[key] = value

        for key in keys_to_add:
            add(key)

        def generate_storage():
            return {**storage, 'id': str(uuid4())}

        storages = [generate_storage() for _ in range(randint(1, 12))]

        for key in keys_to_add:
            value = storage[key] if isinstance(
                expected_storage_info[key], int) else [storage[key]]
            expected_storage_info[key] = value * len(storages)

        expected_storage_info['cloudCapacity'] = storage_size * len(storages)

        for key in ('currentRecordingBitrate', 'maxLiveDelay'):
            expected_storage_info[key] = storage[key]

        for key in ('spaceUsed', 'cloudCapacity'):
            expected_storage_info[key] = str(expected_storage_info[key])

        request = request_factory(endpoint, get=True, data=data)

        mock_list_storages, _ = mock_storage_controller(
            'list_system_storages', mocked_return=storages)
        mock_statistics, _ = mock_storage_controller(
            'statistics', mocked_return=storage)
        from api.views.storage import usage_stats
        response = usage_stats(request)

        mock_list_storages.assert_called_once()
        assert response.status_code == status.HTTP_200_OK
        assert mock_list_storages.call_args.args[1] == system_id
        assert mock_statistics.call_count == len(storages)
        assert response.data == expected_storage_info
        assert_auth_required(usage_stats, endpoint, data, get=True)

    @pytest.mark.no_db
    def test_usage_stats_no_storage(self, request_factory, mock_storage_controller):
        system_id = str(uuid4())
        data = {'systemId': system_id}
        request = request_factory(
            '/api/storage/statistics', get=True, data=data)
        mock_list_storages, _ = mock_storage_controller(
            'list_system_storages', mocked_return=[])

        from api.views.storage import usage_stats
        response = usage_stats(request)

        mock_list_storages.assert_called_once()
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert mock_list_storages.call_args.args[1] == system_id
        assert response.data['errorText']['message'] == 'System does not cloud storage.'

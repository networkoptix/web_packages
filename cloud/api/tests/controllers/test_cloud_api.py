from typing import Callable, Optional
from unittest import TestCase
from unittest.mock import MagicMock
from uuid import uuid4

import pytest
from rest_framework import status

import cloud.controllers.cloud_api as cloud_api
from cloud.controllers.cloud_api import *
from cloud.helpers.exceptions import *
from api.tests.utils import MockResponse, unwrap

PatchedResponse = Callable[[Optional[dict]], MagicMock]


def generate_args(num_args=4):
    for _ in range(num_args):
        yield str(uuid4())


class TestAPIWrappers:
    @staticmethod
    def check_wrapper(wrapper, request_mock, include_json=True, include_params=True):
        url, param_1, param_2, email, password, header_1, header_2, json_1, json_2 = generate_args(
            9)
        params = {'param1': param_1, 'param2': param_2}
        auth = {'email': email, 'password': password}
        headers = {'header1': header_1, 'header2': header_2}
        json_data = {'json1': json_1, 'json2': json_2}
        req_kwargs = {'auth': auth, 'headers': headers}
        if include_json:
            req_kwargs['json'] = json_data
        if include_params:
            req_kwargs['params'] = params

        with TestCase().assertLogs() as log:
            wrapper(url, **req_kwargs)

        args = request_mock.call_args[0]
        kwargs = request_mock.call_args[1]

        assert args[0] == url
        assert kwargs['headers'] == headers
        assert kwargs['auth'] == HTTPDigestAuth(
            auth['email'], auth['password'])

        if include_params:
            assert kwargs['params'].items() >= params.items()
            assert len(kwargs['params']['salt']) == 15

        if include_json:
            assert kwargs['json'] == json_data

    @pytest.fixture
    def mock_request(self, mocker):
        def wrapper(request_type, status_code=200):
            return mocker.patch.object(cloud_api.requests, request_type, return_value=mocker.MagicMock(status_code=status_code))

        return wrapper

    def test_get_wrapper(self, mock_request):
        request_mock = mock_request('get')
        self.check_wrapper(get_wrapper, request_mock, include_json=False)

    def test_post_wrapper(self, mock_request):
        request_mock = mock_request('post')
        self.check_wrapper(post_wrapper, request_mock)

    def test_put_wrapper(self, mock_request):
        request_mock = mock_request('put')
        self.check_wrapper(put_wrapper, request_mock)

    def test_delete_wrapper(self, mock_request):
        request_mock = mock_request('delete')
        self.check_wrapper(delete_wrapper, request_mock,
                           include_params=False, include_json=False)

    def test_cdb_logger(self, mocker):
        mock_logger = mocker.patch(
            'cloud.controllers.cloud_api.logger', mocker.MagicMock())

        for status_code in [200, 300, 400, 500]:
            message, cdb_response, request_headers = generate_args(3)
            is_error = status_code >= 400

            cdb_logger(mocker.MagicMock(
                status_code=status_code, text=cdb_response), message, request_headers)

            if is_error:
                from_cdb = f'\nCDB RESPONSE: {cdb_response}'
                request_headers = f'\nREQUEST HEADERS: {request_headers}'
                mock_logger.error.assert_called_with(
                    f'{message} {from_cdb} {request_headers}')
            else:
                mock_logger.info.assert_called_with(message)

    def test_sanitize_log(self):
        to_sanitize = str({key: str(uuid4())
                           for key, val in SANITIZED_FIELDS.items()})
        sanitized = str(SANITIZED_FIELDS)

        assert sanitize_log(to_sanitize) == sanitized


class TestSystemAPI:
    @pytest.fixture(autouse=True)
    def setup(self):
        request, user, password, d1_key, d1_val, d2_key, d2_val, system_id, slave_system_id, system_name, headers = generate_args(
            11)
        self.request = request
        self.user = user
        self.password = password
        self.auth = {'email': user, 'password': password}
        self.sample_data = {d1_key: d1_val, d2_key: d2_val,
                            'resultCode': ErrorCodes.ok.value}
        self.system_id = system_id
        self.slave_system_id = slave_system_id
        self.system_name = system_name
        self.headers = headers

    @pytest.fixture
    def cloud_api_get_mock(self, mocker):
        return mocker.patch.object(cloud_api, 'get_wrapper', return_value=MockResponse(json=self.sample_data))

    @pytest.fixture
    def cloud_api_post_mock(self, mocker):
        return mocker.patch.object(cloud_api, 'post_wrapper', return_value=MockResponse(json=self.sample_data))

    @pytest.fixture
    def cloud_api_delete_mock(self, mocker):
        return mocker.patch.object(cloud_api, 'delete_wrapper', return_value=MockResponse(json=self.sample_data))

    def test_get_request_url_no_args(self):
        assert System.get_request_url() == f'{CLOUD_DB_URL}/system/get'

    def test_get_request_url_nonce(self):
        assert System.get_request_url(
            endpoint='getNonce') == f'{CLOUD_DB_URL}/auth/getNonce'

    def test_get_request_url_endpoint(self):
        assert System.get_request_url(
            endpoint='testEndpoint') == f'{CLOUD_DB_URL}/system/testEndpoint'

    def test_get_request_url_endpoint_and_system_id(self):
        assert System.get_request_url(
            endpoint='testEndpoint', system_id='testId') == f'{CLOUD_DB_URL}/system/testId/testEndpoint'

    def test_list(self, cloud_api_get_mock):
        # One customization
        system_list = unwrap(System.list)(
            self.request, self.user, self.password, headers=self.headers)
        cloud_api_get_mock.assert_called_with(
            System.get_request_url(),
            params={'customization': settings.CUSTOMIZATION},
            auth=self.auth,
            headers=self.headers
        )
        assert system_list.json() == self.sample_data

        # Any customization
        system_list = unwrap(System.list)(
            self.user, self.password, one_customization=False, headers=self.headers)
        cloud_api_get_mock.assert_called_with(
            System.get_request_url(),
            params={},
            headers=self.headers,
            auth=None
        )
        assert system_list.json() == self.sample_data

    def test_get(self, cloud_api_get_mock):
        system = unwrap(System.get)(
            self.request, self.system_id, headers=self.headers)
        cloud_api_get_mock.assert_called_with(
            System.get_request_url(),
            params={'systemId': self.system_id},
            headers=self.headers
        )
        assert system.json() == self.sample_data

    def test_users(self, cloud_api_get_mock):
        users = unwrap(System.users)(
            self.request, self.system_id, headers=self.headers)
        cloud_api_get_mock.assert_called_with(
            System.get_request_url('getCloudUsers'),
            params={'systemId': self.system_id},
            headers=self.headers
        )
        assert users.json() == self.sample_data

    def test_share(self, cloud_api_post_mock):
        share_email, access_role = generate_args(2)
        share = unwrap(System.share)(self.request, self.system_id,
                                     share_email, access_role, headers=self.headers)
        cloud_api_post_mock.assert_called_with(
            System.get_request_url('share'),
            json={'systemId': self.system_id,
                  'accountEmail': share_email,
                  'accessRole': access_role,
                  'isEnabled': True},
            headers=self.headers
        )
        assert share.json() == self.sample_data

    def test_get_nonce(self, cloud_api_get_mock):
        nonce = unwrap(System.get_nonce)(
            self.request, self.system_id, headers=self.headers)
        cloud_api_get_mock.assert_called_with(
            System.get_request_url('getNonce'),
            params={'systemId': self.system_id},
            headers=self.headers
        )
        assert nonce.json() == self.sample_data

    def test_rename(self, cloud_api_post_mock):
        rename = unwrap(System.rename)(
            self.request, self.system_id, self.system_name, headers=self.headers)
        cloud_api_post_mock.assert_called_with(
            System.get_request_url('rename'),
            json={'systemId': self.system_id, 'name': self.system_name},
            headers=self.headers
        )
        assert rename.json() == self.sample_data

    def test_access_roles(self, cloud_api_get_mock):
        roles = unwrap(System.access_roles)(
            self.request, self.system_id, headers=self.headers)
        cloud_api_get_mock.assert_called_with(
            System.get_request_url('getAccessRoleList'),
            params={'systemId': self.system_id},
            headers=self.headers
        )
        assert roles.json() == self.sample_data

    def test_unbind(self, cloud_api_delete_mock):
        unbind = unwrap(System.unbind)(
            self.request, self.system_id, headers=self.headers)
        cloud_api_delete_mock.assert_called_with(
            f"{CLOUD_DB_URL}/system/{self.system_id}",
            headers=self.headers
        )
        assert unbind.json() == self.sample_data

    def test_bind(self, cloud_api_post_mock):
        bind = unwrap(System.bind)(
            self.request, self.system_name, headers=self.headers)
        cloud_api_post_mock.assert_called_with(
            System.get_request_url('bind'),
            json={'name': self.system_name,
                  'customization': settings.CUSTOMIZATION},
            headers=self.headers
        )
        assert bind.json() == self.sample_data

    def test_merge(self, cloud_api_post_mock, mocker):
        mock_access_token, mock_refresh_token, master_token, slave_token = generate_args(
            4)

        request = mocker.MagicMock()
        request.session = {
            'access_token': mock_access_token,
            'refresh_token': mock_refresh_token
        }

        mock_token_lookup = {
            f"cloudSystemId={self.system_id}": master_token,
            f"cloudSystemId={self.slave_system_id}": slave_token
        }

        def mock_get_refresh_token(refresh_token, scope):
            nonlocal mock_refresh_token
            assert refresh_token == mock_refresh_token
            return {'access_token': mock_token_lookup[scope]}

        def mock_get_system(request, system_id):
            return {'systems': [{'id': system_id, 'version': '5.0.0.11111'}]}

        mocker.patch('cloud.controllers.cloud_api.System.get', mock_get_system)
        mocker.patch(
            'cloud.controllers.cloud_api.Auth.get_refresh_token', mock_get_refresh_token)
        merge = unwrap(System.merge)(request, self.system_id,
                                     self.slave_system_id, headers=self.headers)
        cloud_api_post_mock.assert_called_with(
            System.get_request_url('merged_systems/', self.system_id),
            json={
                'systemId': self.slave_system_id,
                'masterSystemAccessToken': master_token,
                'slaveSystemAccessToken': slave_token
            },
            headers=self.headers,
            auth=None
        )
        assert merge.json() == self.sample_data


class TestStorageApi:
    patch_get_with_response: PatchedResponse
    patch_post_with_response: PatchedResponse
    patch_put_with_response: PatchedResponse
    patch_delete_with_response: PatchedResponse

    # Helper methods

    @pytest.fixture(autouse=True)
    def setup(self, mocker):
        self.mock_data = generate_args(10)

        def patch(method) -> PatchedResponse:
            return lambda res_json=self.mock_data: mocker.patch.object(
                cloud_api, f'{method}_wrapper', return_value=MockResponse(json=res_json))

        self.patch_get_with_response = patch('get')
        self.patch_post_with_response = patch('post')
        self.patch_put_with_response = patch('put')
        self.patch_delete_with_response = patch('delete')

    def mock_list_system_storages(self, mocker, storages):
        return mocker.patch.object(
            cloud_api.Storage, 'list_system_storages', return_value=[{'id': id} for id in storages])

    # Storage Tests

    def test_delete_handler(self):
        mocked = self.patch_delete_with_response()
        request, storage_id, headers = generate_args(3)

        response = unwrap(Storage._delete)(
            request, storage_id, headers=headers)

        mocked.assert_called_once_with(
            Storage.get_request_url(storage_id), headers=headers)
        assert response.json() == self.mock_data

    def test_merge_handler(self):
        mocked = self.patch_put_with_response()
        request, headers, storage_id, storage_id_secondary = generate_args()

        response = unwrap(Storage._merge)(request, storage_id,
                                          storage_id_secondary, headers=headers)

        mocked.assert_called_once_with(
            Storage.get_request_url(
                storage_id,
                Storage.MERGED_STORAGES_ENDPOINT),
            headers=headers,
            json={'slaveStorageId': storage_id_secondary})
        assert response.json() == self.mock_data

    def test_move_handler(self):
        mocked = self.patch_put_with_response()
        request, headers, storage_id, system_id = generate_args()

        response = unwrap(Storage._move)(
            request, system_id, storage_id, headers=headers)

        mocked.assert_called_once_with(
            Storage.get_request_url(
                storage_id, Storage.SYSTEMS_ENDPOINT),
            headers=headers,
            json={'id': system_id})
        assert response.json() == self.mock_data

    def test_remove_from_system_handler(self):
        mocked = self.patch_delete_with_response()
        request, headers, storage_id, system_id = generate_args()

        response = unwrap(Storage._remove_from_system)(
            request, system_id, storage_id, headers=headers)

        mocked.assert_called_once_with(
            Storage.get_request_url(
                storage_id, Storage.SYSTEM_ENDPOINT, system_id),
            headers=headers)
        assert response.json() == self.mock_data

    def test_create(self):
        mocked = self.patch_put_with_response()
        _, auth, system_id, storage_size = generate_args()
        headers = {'auth': auth}

        response = unwrap(Storage.create)(
            None, system_id, storage_size, headers=headers)

        mocked.assert_called_once_with(
            Storage.get_request_url(use_storages_endpoint=True),
            headers=headers,
            json={'systems': [system_id], 'totalSpace': storage_size})
        assert response.json() == self.mock_data

    def test_delete_from_system(self, mocker):
        request, auth, system_id, *storages = generate_args(4)
        mocked_list_system_storages = self.mock_list_system_storages(
            mocker, storages)
        mocked_remove_from_system_handler = mocker.patch.object(
            cloud_api.Storage, '_remove_from_system')
        mocked_delete_handler = mocker.patch.object(
            cloud_api.Storage, '_delete')
        unwrap(Storage.delete_from_system)(request, system_id)

        mocked_list_system_storages.assert_called_once_with(request, system_id)

        for storage_id in storages:
            mocked_remove_from_system_handler.assert_called_once_with(
                request, system_id, storage_id)
            mocked_delete_handler.assert_called_once_with(request, storage_id)

    def test_list_system_storages(self):
        mocked = self.patch_get_with_response()
        request, headers, system_id = generate_args(3)

        response = unwrap(Storage.list_system_storages)(
            request, system_id, headers=headers)

        mocked.assert_called_once_with(
            Storage.get_request_url(use_storages_endpoint=True),
            params={'system-id': system_id},
            headers=headers)
        assert response.json() == self.mock_data

    def test_list_cameras(self):
        mocked = self.patch_get_with_response()
        request, storage_id, headers = generate_args(3)
        response = unwrap(Storage.list_cameras)(
            request, storage_id, headers=headers)

        mocked.assert_called_once_with(
            Storage.get_request_url(storage_id, Storage.CAMERAS_ENDPOINT),
            headers=headers)
        assert response.json() == self.mock_data

    def test_move(self, mocker):
        request, headers, source_system_id, destination_system_id, * \
            storages = generate_args(5)
        mocked_list_system_storages = self.mock_list_system_storages(
            mocker, storages)
        mocked_remove_from_system_handler = mocker.patch.object(
            cloud_api.Storage, '_remove_from_system')
        mocked_merge_handler = mocker.patch.object(cloud_api.Storage, '_merge')

        response = unwrap(Storage.move)(
            request, destination_system_id, source_system_id)

        assert mocked_list_system_storages.call_count == 2
        for storage_id in storages:
            mocked_remove_from_system_handler.assert_called_once_with(
                request, source_system_id, storage_id)
            mocked_merge_handler.assert_called_once_with(
                request, storage_id, storage_id)
        assert response.data is None

    def test_statistics(self):
        mocked = self.patch_get_with_response()
        request, headers, storage_id = generate_args(3)
        response = unwrap(Storage.statistics)(
            request, storage_id, headers=headers)
        mocked.assert_called_once_with(
            Storage.get_request_url(storage_id, Storage.STATISTICS_ENDPOINT),
            headers=headers)
        assert response.json() == self.mock_data


class TestOwnershipTransfer:
    @pytest.fixture(autouse=True)
    def setup(self):
        account, headers, request, system_id, key_1, val_1 = generate_args(6)
        self.account = account
        self.headers = headers
        self.request = request
        self.system_id = system_id
        self.sample_data = {key_1: val_1}

    @pytest.fixture
    def cloud_api_get_mock(self, mocker):
        return mocker.patch.object(cloud_api, 'get_wrapper', return_value=MockResponse(json=self.sample_data))

    @pytest.fixture
    def cloud_api_put_mock(self, mocker):
        return mocker.patch.object(cloud_api, 'put_wrapper', return_value=MockResponse(json=self.sample_data))

    @pytest.fixture
    def cloud_api_post_mock(self, mocker):
        return mocker.patch.object(cloud_api, 'post_wrapper', return_value=MockResponse(json=self.sample_data))

    @pytest.fixture
    def cloud_api_delete_mock(self, mocker):
        return mocker.patch.object(cloud_api, 'delete_wrapper', return_value=MockResponse(json=self.sample_data))

    def test_act_on_empty(self, cloud_api_put_mock):
        offered_status = ''
        unwrap(OwnershipTransfer.act_on)(
            self.request, self.system_id, offered_status=offered_status, headers=self.headers)
        cloud_api_put_mock.assert_called_with(
            f'{CLOUD_DB_URL}/offered-systems/{self.system_id}',
            json={},
            headers=self.headers
        )

    def test_act_on_accepted(self, cloud_api_put_mock):
        offered_status = 'accepted'
        unwrap(OwnershipTransfer.act_on)(
            self.request, self.system_id, offered_status=offered_status, headers=self.headers)
        cloud_api_put_mock.assert_called_with(
            f'{CLOUD_DB_URL}/offered-systems/{self.system_id}',
            json={'status': offered_status},
            headers=self.headers
        )

    def test_act_on_rejected(self, cloud_api_put_mock):
        offered_status = 'rejected'
        unwrap(OwnershipTransfer.act_on)(
            self.request, self.system_id, offered_status=offered_status, headers=self.headers)
        cloud_api_put_mock.assert_called_with(
            f'{CLOUD_DB_URL}/offered-systems/{self.system_id}',
            json={'status': offered_status},
            headers=self.headers
        )

    def test_cancel(self, cloud_api_delete_mock):
        unwrap(OwnershipTransfer.cancel)(self.request, self.system_id, headers=self.headers)
        cloud_api_delete_mock.assert_called_with(
            f'{CLOUD_DB_URL}/offered-systems/{self.system_id}',
            headers=self.headers
        )

    def test_list(self, cloud_api_get_mock):
        unwrap(OwnershipTransfer.list)(self.request, headers=self.headers)
        cloud_api_get_mock.assert_called_with(
            f'{CLOUD_DB_URL}/offered-systems',
            headers=self.headers
        )

    def test_start(self, cloud_api_post_mock):
        unwrap(OwnershipTransfer.start)(self.request, self.system_id, self.account, headers=self.headers)
        cloud_api_post_mock.assert_called_with(
            f'{CLOUD_DB_URL}/offered-systems',
            json={
                "systemId": self.system_id,
                "toAccount": self.account
            },
            headers=self.headers
        )


from uuid import uuid4
import uuid

from django.conf import settings

from cloud.customization_context import customization_ctx
from cloud.helpers.exceptions import ErrorCodes
from api.tests.utils import MockResponse
from api.views import utils
from uuid import uuid4

from asgiref.sync import async_to_sync, sync_to_async
from django.contrib.auth.models import AnonymousUser, Group, Permission
from django.core.cache import caches, cache

from rest_framework import status

import copy
from dateutil import parser as date_parser
import pytest


@pytest.fixture(scope='module', params=[None, False, True])
def cloud_capabilities(request):
    capabilities = {'capability1': 'cap1', 'capability2': 'cap2'}
    if request.param is not None:
        capabilities['integration_store_enabled'] = request.param
    return capabilities

@pytest.mark.asyncio
async def test_get_cloud_capabilities_from_cache(mocker, cloud_capabilities, settings):
    cache_mock = mocker.patch.object(utils, 'cloud_portal_customization_cache_async')
    cache_mock.return_value = cloud_capabilities
    expected = {'integrationStoreEnabled': cloud_capabilities.get(
        'integration_store_enabled', False)}

    cache_capabilities = await utils.get_cloud_capabilities_from_cache(customization=settings.TEST_CUSTOMIZATION)
    cache_mock.assert_called_with(settings.TEST_CUSTOMIZATION, 'cloud_capabilities')
    assert cache_capabilities == expected

@pytest.mark.asyncio
async def test_get_settings_from_cache(mocker, customization_config, settings_from_cache, settings, db):
    cache_mock = mocker.patch.object(utils, 'cloud_portal_customization_cache_async')
    cache_mock.return_value = settings_from_cache

    settings_dict = await utils.get_settings_from_cache(customization=settings.TEST_CUSTOMIZATION)
    cache_mock.assert_called_with(settings.TEST_CUSTOMIZATION, 'config')
    assert settings_dict == settings_from_cache


class TestFilterReleases:

    def test_releases_none(self):
        filtered_releases = utils.filter_releases([])
        assert filtered_releases == []

    def test_releases_vms(self):
        releases = [
            {'id': 1, 'platforms': [{'name': 'mac'}, {'name': 'win'}]},
            {'id': 2, 'platforms': [{'name': 'win'}]},
            {'id': 3, 'platforms': [{'name': 'win'}]}
        ]
        filtered_releases = utils.filter_releases(releases)
        assert filtered_releases == [releases[0]]

    def test_releases_mobile(self):
        releases = [
            {'id': 1, 'platforms': [{'name': 'android'}]},
            {'id': 2, 'platforms': [{'name': 'ios'}]},
            {'id': 3, 'platforms': [{'name': 'ios'}, {'name': 'android'}]}
        ]
        filtered_releases = utils.filter_releases(releases)
        assert filtered_releases == [releases[0]]

    def test_release_both(self):
        releases = [
            {'id': 1, 'platforms': [{'name': 'mac'}]},
            {'id': 2, 'platforms': [{'name': 'ubuntu'}]},
            {'id': 3, 'platforms': [{'name': 'ios'}]}
        ]
        filtered_releases = utils.filter_releases(releases)
        assert filtered_releases == [releases[0], releases[2]]


class TestVisitedKey:
    key = 'someKey123'

    @pytest.fixture(autouse=True)
    def clear_cache(self):
        caches['global'].clear()

    def test_get(self, arf):
        request = arf.get('/api/utils/visitedKey', {'key': self.key})
        request.session = {}
        response = async_to_sync(utils.visited_key)(request)
        assert response.status_code == status.HTTP_200_OK
        assert response.data == {'visited': False}

    def test_get_missing_key(self, arf):
        request = arf.get('/api/utils/visitedKey')
        request.session = {}
        response = async_to_sync(utils.visited_key)(request)
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_post(self, arf):
        request = arf.post('/api/utils/visitedKey', {'key': self.key})
        request.session = {}
        response = async_to_sync(utils.visited_key)(request)
        assert response.status_code == status.HTTP_200_OK
        assert response.data['visited']
        try:
            date_parser.parse(response.data['visited'])
        except ValueError:
            pytest.fail(
                f'Expected datetime in response, got: {response.data["visited"]}')


class TestLanguage:
    def test_get(self, mocker, arf):
        lang_detect = mocker.patch('util.helpers.detect_language_by_request')
        lang_detect.return_value = 'en_US'
        version = str(uuid4())
        mocker.patch.object(utils.settings, 'VERSION', version)

        request = arf.get('/api/utils/language')
        request.session = {}
        response = async_to_sync(utils.language)(request)
        lang_detect.assert_called()
        assert response.status_code == status.HTTP_302_FOUND
        assert response.url == f'/static/lang_en_US/language_compiled.json?version={version}'

    def check_post_assertions(self, request, response):
        assert response.status_code == status.HTTP_200_OK
        assert response.data == {'language': 'es_ES'}
        assert response.cookies['language'].value == 'es_ES'
        assert request.session['language'] == 'es_ES'

    def test_post(self, arf, active_user):
        # Anonymous
        request = arf.post('/api/utils/language', {'language': 'es_ES'})
        request.session = {}
        request.user = AnonymousUser

        response = async_to_sync(utils.language)(request)
        self.check_post_assertions(request, response)

        # Authenticated
        request = arf.post('/api/utils/language', {'language': 'es_ES'})
        request.session = {}
        request.user = active_user

        response = async_to_sync(utils.language)(request)
        self.check_post_assertions(request, response)
        active_user.refresh_from_db()
        assert active_user.language == 'es_ES'


@pytest.fixture
def download_user(active_user):
    group = Group.objects.create(name='downloader')
    releases_permission = Permission.objects.filter(
        codename='can_view_release').first()
    group.permissions.add(releases_permission)
    active_user.groups.add(group)
    return active_user


class TestDownloadHistory:
    downloads_json_data = {'d1': 'd1val', 'd2': 'd2val'}

    @pytest.fixture(autouse=True)
    def setup(self, download_user, mocker, arf):
        self.user = download_user
        self.arf = arf
        self.settings_mock = mocker.patch.object(
            utils, 'get_settings_from_cache')
        self.settings_mock.return_value = {
            'publicReleases': True, 'showAllBetas': True}

    def make_request(self):
        request = self.arf.get('/api/utils/downloads/history')
        request.user = self.user
        request.session = {}
        return async_to_sync(utils.downloads_history)(request)

    def test_no_permission_not_public(self, django_user_model):
        self.settings_mock.return_value['publicReleases'] = False
        self.user = django_user_model.objects.create()

        response = self.make_request()
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_json_not_found(self, mocker):
        downloads_json = mocker.patch.object(utils.HttpxAsyncRequest, 'get')
        downloads_json.return_value.status_code = status.HTTP_404_NOT_FOUND

        response = self.make_request()
        assert response.status_code == status.HTTP_200_OK
        assert not response.data

    def test_show_betas(self, mocker):
        self.settings_mock.return_value['showAllBetas'] = True
        downloads_request = mocker.patch.object(utils.HttpxAsyncRequest, 'get')
        downloads_request.return_value.json = mocker.MagicMock(return_value=self.downloads_json_data)
        downloads_request.return_value.status_code = status.HTTP_200_OK

        response = self.make_request()
        assert response.status_code == status.HTTP_200_OK
        assert response.data == self.downloads_json_data
        assert 'betas' not in response.data

    def test_not_show_betas(self, mocker):
        downloads_request = mocker.patch.object(utils.HttpxAsyncRequest, 'get')
        filtered_data = self.downloads_json_data.copy()
        filtered_data['betas'] = 'betasHere'
        downloads_request.return_value.status_code = status.HTTP_200_OK
        downloads_request.return_value.json = mocker.MagicMock(return_value=filtered_data)

        response = self.make_request()
        assert response.status_code == status.HTTP_200_OK
        assert response.data == filtered_data


class DownloadsBase:
    @pytest.fixture(autouse=True)
    def setup(self, download_user, mocker, arf, downloads_json, updates_json, settings_from_cache):
        def mock_requests(*args, **kwargs):
            url = kwargs.get('method', '') or (
                args[0] if len(args) >= 1 else None)
            if 'downloads.json' in url:
                return MockResponse(json=downloads_json)
            elif 'updates.json' in url:
                return MockResponse(json=updates_json)

        self.downloads_json = downloads_json
        self.updates_json = updates_json
        self.arf = arf
        self.user = download_user
        self.settings_mock = mocker.patch.object(
            utils, 'get_settings_from_cache')
        self.settings_mock.return_value = settings_from_cache
        self.downloads_request = mocker.patch.object(utils.HttpxAsyncRequest, 'get')
        self.downloads_request.side_effect = mock_requests
        caches['global'].clear()


class TestDownloadBuild(DownloadsBase):
    def make_request(self, build_number='12345'):
        request = self.arf.get('/api/utils/downloads/12345')
        request.user = self.user
        request.session = {}
        return async_to_sync(utils.download_build)(request, build_number)

    def test_no_permission_not_public(self, django_user_model):
        self.settings_mock.return_value['publicReleases'] = False
        self.user = django_user_model.objects.create()

        response = self.make_request()
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_build_regex(self):
        # Fails regex
        response = self.make_request(build_number='fail')
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert response.data['resultCode'] == ErrorCodes.bad_request.value

        # Sucessful
        response = self.make_request(build_number='4.2.0.32840')
        assert response.status_code == status.HTTP_200_OK

    def test_build_does_not_exist(self):
        self.downloads_request.return_value = MockResponse(status_code=400)
        self.downloads_request.side_effect = None
        response = self.make_request(build_number='4.1.242')
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert response.data['resultCode'] == ErrorCodes.not_found.value

    def test_no_release_notes(self):
        del self.downloads_json['releaseNotes']
        response = self.make_request(build_number='4.2.0.32840')

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert response.data['resultCode'] == ErrorCodes.not_found.value

    def test_no_customization(self, settings, other_portal):
        settings.TEST_CUSTOMIZATION = 'other'
        response = self.make_request(build_number='4.2.0.32840')
        assert response.status_code == status.HTTP_200_OK

    def test_success(self):
        response = self.make_request(build_number='4.2.0.32840')
        assert response.status_code == status.HTTP_200_OK
        expected_downloads_json = copy.deepcopy(self.downloads_json)
        expected_downloads_json['updatesPrefix'] = self.updates_json['default']['updates_prefix']
        assert response.data == expected_downloads_json


class TestDownloads(DownloadsBase):
    def make_request(self):
        request = self.arf.get('/api/utils/downloads')
        request.user = self.user
        request.session = {}
        return async_to_sync(utils.downloads)(request)

    def test_success(self):
        assert not caches['global'].get('downloads_default')
        response = self.make_request()
        assert response.status_code == status.HTTP_200_OK
        assert caches['global'].get('downloads_default')

        # With cache
        response = self.make_request()
        assert response.status_code == status.HTTP_200_OK
        assert caches['global'].get('downloads_default')

    def test_downloads_not_public(self):
        self.settings_mock.return_value['publicDownloads'] = False
        self.user = AnonymousUser()

        response = self.make_request()
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_clear_cache(self, mocker):
        assert not caches['global'].get('downloads_default')
        response = self.make_request()
        assert response.status_code == status.HTTP_200_OK
        assert caches['global'].get('downloads_default')

        cache_mock = mocker.patch.object(utils, 'caches')
        cache_mock['global'].aset = mocker.MagicMock()
        request = self.arf.post('/api/utils/downloads')
        request.user = self.user
        request.session = {}
        async_to_sync(utils.downloads)(request)
        cache_mock['global'].aset.assert_called_with('downloads_default', False)

class TestDownloadsReleases(DownloadsBase):
    def make_request(self):
        request = self.arf.get('/api/utils/downloads-releases')
        request.user = self.user
        request.session = {}
        return async_to_sync(utils.downloads_releases)(request)

    def test_success(self):
        assert not caches['global'].get('downloads_releases_default')
        response = self.make_request()
        assert response.status_code == status.HTTP_200_OK
        assert caches['global'].get('downloads_releases_default')

        # With cache
        response = self.make_request()
        assert response.status_code == status.HTTP_200_OK
        assert caches['global'].get('downloads_releases_default')

    def test_downloads_not_public(self):
        self.settings_mock.return_value['publicDownloads'] = False
        self.user = AnonymousUser()

        response = self.make_request()
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_clear_cache(self, mocker):
        assert not caches['global'].get('downloads_releases_default')
        response = self.make_request()
        assert response.status_code == status.HTTP_200_OK
        assert caches['global'].get('downloads_releases_default')
        cache_mock = mocker.patch.object(utils, 'caches')
        cache_mock['global'].aset = mocker.MagicMock()

        request = self.arf.post('/api/utils/downloads-releases')
        self.user.is_superuser = True
        request.user = self.user
        request.session = {}
        async_to_sync(utils.downloads_releases)(request)
        cache_mock['global'].aset.assert_called_with('downloads_releases_default', False)


class TestGetSettings:
    @pytest.fixture(autouse=True)
    def setup(self, settings_from_cache, mocker, arf, active_user):
        self.settings_mock = mocker.patch.object(
            utils, 'get_settings_from_cache')
        self.settings_mock.return_value = settings_from_cache
        self.arf = arf
        self.user = active_user

    def make_request(self):
        request = self.arf.get('/api/utils/settings')
        request.user = self.user
        request.session = {}
        redirect_res = async_to_sync(utils.get_settings)(request)
        assert redirect_res.status_code == status.HTTP_302_FOUND
        request = self.arf.get(redirect_res.url)
        request.user = self.user
        request.session = {}
        return async_to_sync(utils.get_settings)(request)

    def test_user_no_perms(self):
        response = self.make_request()
        assert response.status_code == status.HTTP_200_OK

    def test_no_version_id(self):
        self.settings_mock.return_value['version_id'] = 'test'
        response = self.make_request()
        assert response.status_code == status.HTTP_200_OK
        assert response.data
        assert 'version_id' not in response.data

    def test_cloud_merge_false(self):
        self.settings_mock.return_value['cloudMerge'] = False
        response = self.make_request()
        assert response.status_code == status.HTTP_200_OK
        assert response.data
        assert 'cloudMerge' not in response.data

    def test_cloud_merge_true(self):
        self.settings_mock.return_value['cloudMerge'] = True
        response = self.make_request()
        assert response.status_code == status.HTTP_200_OK
        assert response.data
        assert 'cloudMerge' in response.data
        assert response.data['cloudMerge']

    def test_show_all_betas_removed(self):
        self.settings_mock.return_value['showAllBetas'] = False
        response = self.make_request()
        assert response.status_code == status.HTTP_200_OK
        assert response.data
        assert 'showAllBetas' not in response.data

    def test_developers_with_perm(self, add_permission):
        self.settings_mock.return_value['developersEnabled'] = False
        add_permission(self.user, 'access_developers')
        response = self.make_request()
        assert response.status_code == status.HTTP_200_OK
        assert response.data
        assert response.data['developersEnabled']

    def test_developers_without_perm(self):
        self.settings_mock.return_value['developersEnabled'] = False
        response = self.make_request()
        assert response.status_code == status.HTTP_200_OK
        assert response.data
        assert not response.data['developersEnabled']

    def test_developers_enabled(self):
        self.settings_mock.return_value['developersEnabled'] = True
        response = self.make_request()
        assert response.status_code == status.HTTP_200_OK
        assert response.data
        assert response.data['developersEnabled']

    def test_integrations_with_perm(self, add_permission):
        self.settings_mock.return_value['integrationStoreEnabled'] = False
        add_permission(self.user, 'access_integration_store')
        response = self.make_request()
        assert response.status_code == status.HTTP_200_OK
        assert response.data
        assert response.data['integrationStoreEnabled']

    def test_integrations_without_perm(self):
        self.settings_mock.return_value['integrationStoreEnabled'] = False
        response = self.make_request()
        assert response.status_code == status.HTTP_200_OK
        assert response.data
        assert not response.data['integrationStoreEnabled']

    def test_integrations_enabled(self):
        self.settings_mock.return_value['integrationStoreEnabled'] = True
        response = self.make_request()
        assert response.status_code == status.HTTP_200_OK
        assert response.data
        assert response.data['integrationStoreEnabled']


class TestIPVD:
    def test_post(self, arf, mocker):
        version = str(uuid4())
        delete_cache_mock = mocker.patch.object(
            utils.cache, 'adelete', return_value=True)
        mocker.patch.object(utils.cache, 'aget', return_value=version)
        request = arf.post('/api/ipvd')

        # Test cache cleared
        response = async_to_sync(utils.get_ipvd)(request)
        assert response.status_code == status.HTTP_200_OK
        assert response.data == {utils.IPVD_CACHE_CLEARED}
        delete_cache_mock.assert_called_with(version)

        # Test no cached IPVD
        delete_cache_mock.return_value = False
        response = async_to_sync(utils.get_ipvd)(request)
        assert response.status_code == status.HTTP_202_ACCEPTED
        assert response.data == {utils.IPVD_CACHE_NOT_CLEARED}

    def test_get(self, arf, mocker, ipvd_data, ipvd_data_processed):
        ipvd_mock = mocker.patch.object(utils.HttpxAsyncRequest, 'get')
        ipvd_mock.return_value = MockResponse(json=ipvd_data)

        # Should redirect if not versioned request
        request = arf.get('/api/ipvd')
        response = async_to_sync(utils.get_ipvd)(request)

        versioned_url = response.url

        assert response.status_code == status.HTTP_302_FOUND

        # Versioned request should return data
        request = arf.get(versioned_url)
        response = async_to_sync(utils.get_ipvd)(request)
        assert response.status_code == status.HTTP_200_OK
        assert response.data == ipvd_data_processed
        ipvd_mock.assert_has_calls([mocker.call(settings.IPVD_CONNECT, params="[]")], any_order=True)
        # Test cached
        request = arf.get(versioned_url)
        response = async_to_sync(utils.get_ipvd)(request)
        ipvd_data_processed['cached'] = True
        assert response.status_code == status.HTTP_200_OK
        assert response.data == ipvd_data_processed


@pytest.mark.asyncio
async def test_cloud_capabilities_view(arf, mocker):
    capabilities_mock = mocker.patch.object(
        utils, 'get_cloud_capabilities_from_cache')
    capabilities_mock.return_value = mocker.sentinel.capabilities
    request = arf.get('/api/utils/cloudCapabilities/')
    response = await utils.cloud_capabilities(request)

    assert response.status_code == status.HTTP_200_OK
    assert response.data == mocker.sentinel.capabilities

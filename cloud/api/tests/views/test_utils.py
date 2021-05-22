from api.views import utils

from django.contrib.auth.models import AnonymousUser
from django.core.cache import caches

from rest_framework import status

from datetime import datetime
from dateutil import parser as date_parser
import pytest


@pytest.fixture(scope='module', params=[None, False, True])
def cloud_capabilities(request):
    capabilities = {'capability1': 'cap1', 'capability2': 'cap2'}
    if request.param is not None:
        capabilities['integration_store_enabled'] = request.param
    return capabilities


@pytest.fixture(scope='module')
def customization_config():
    return {
        'app_types_for_platform': {'arm': ['client', 'server'], 'linux': ['bundle', 'client', 'server'],
                                   'macos': ['client'], 'sdk': ['metadata_sdk', 'storage_sdk', 'video_source_sdk'],
                                   'windows': ['bundle', 'client', 'server']},
        'available_downloads_platform': ['arm', 'linux', 'macos', 'sdk', 'windows'], 'cloud_storage_enabled': False,
        'cloud_storage_size': '53687091200', 'copyright_year': '2020', 'company_name': 'Network Optix',
        'company_link': 'https://www.networkoptix.com', 'developers_enabled': True, 'feedback_enabled': True,
        'integration_filter_items': [{'id': 'automation', 'name': 'Automation', 'enabled': True},
                                     {'id': 'videoAnalytics', 'name': 'Video Analytics', 'enabled': True},
                                     {'id': 'objectDetection', 'name': 'Object Detection', 'enabled': True},
                                     {'id': 'eventDetection', 'name': 'Event Detection', 'enabled': True},
                                     {'id': 'faceRecognition', 'name': 'Face Recognition', 'enabled': True},
                                     {'id': 'licensePlateRecognition', 'name': 'License Plate Recognition',
                                      'enabled': True},
                                     {'id': 'health', 'name': 'Health Monitoring', 'enabled': False},
                                     {'id': 'storage', 'name': 'Storage', 'enabled': True},
                                     {'id': 'mine', 'name': 'My Integrations', 'enabled': True}],
        'integration_filter_limitation': '12',
        'integration_seo_page_description': 'The Integrations Marketplace is a centralized ecosystem of products that integrate seamlessly with VMS products like Nx Witness, all available in Nx Cloud so that you can find solutions to build and customize your IP Video system.',
        'integration_store_enabled': True,
        'landing_description': 'A simple way to connect to, manage and expand Nx Witness Systems. %CLOUD_HOST% - %CLOUD_LINK% test',
        'health_monitor_cache_timeout': 60, 'public_downloads': True, 'public_releases': True,
        'show_all_betas': False, 'show_analytics_events': True, 'sort_supported_devices_by_popularity': False,
        'support_link': 'https://support.networkoptix.com',
        'privacy_link': 'https://www.networkoptix.com/privacy-policy/',
        'supported_resolutions': [{'value': '0', 'name': 'All'}, {'value': '84480', 'name': '1CIF'},
                                  {'value': '168960', 'name': '2CIF'}, {'value': '337920', 'name': 'D1'},
                                  {'value': '307200', 'name': 'VGA'}, {'value': '786432', 'name': 'SVGA'},
                                  {'value': '921600', 'name': '720p'}, {'value': '1310720', 'name': '1mp'},
                                  {'value': '2073600', 'name': '1080p'}, {'value': '1920000', 'name': '2mp'},
                                  {'value': '3145728', 'name': '3mp'}, {'value': '4915200', 'name': '5mp'},
                                  {'value': '8000000', 'name': '8mp'}, {'value': '10039296', 'name': '10mp'}],
        'supported_hardware_types': [{'id': 'camera', 'label': 'Camera'},
                                     {'id': 'multiSensorCamera', 'label': 'Multi-Sensor Camera'},
                                     {'id': 'encoder', 'label': 'Encoder'}, {'id': 'dvr', 'label': 'DVR'},
                                     {'id': 'other', 'label': 'Other'}],
        'search_tags': [{'id': 'isAudioSupported', 'value': False}, {'id': 'isTwAudioSupported', 'value': False},
                        {'id': 'isPtzSupported', 'value': False}, {'id': 'isAptzSupported', 'value': False},
                        {'id': 'isFisheye', 'value': False}, {'id': 'isMdSupported', 'value': False},
                        {'id': 'isIoSupported', 'value': False}, {'id': 'isH265', 'value': False},
                        {'id': 'isMultiSensor', 'value': False}, {'id': 'isAnalyticsSupported', 'value': False}],
        'tested_operating_systems': {'linux': 'Ubuntu LTS: 16.04, 18.04, 20.04',
                                     'macos': 'OS X 10.13: “High Sierra”, 10.14: “Mojave”, 10.15 “Catalina”.',
                                     'windows': 'Windows 7, 8, 8.1, 10/Enterprise, 2008 R2, 2012, 2012 R2, 2016 v1607'},
        'vendors_shown': '30', 'cloud_name': 'Nx Cloud', 'vms_name': 'Nx Witness',
        'push_config': {'apiKey': 'AIzaSyA8bA6jCS4GnzmfGEg_I6mQyG5JIBKFrLI',
                        'authDomain': 'nx-push-test.firebaseapp.com',
                        'databaseURL': 'https://nx-push-test.firebaseio.com', 'projectId': 'nx-push-test',
                        'storageBucket': 'nx-push-test.appspot.com', 'messagingSenderId': '627461092708',
                        'appId': '1:627461092708:web:1b140238961b4213'}, 'google_tag_manager_id': '  ',
        'trial_license_key': '0000-0000-0000-0005'
    }


@pytest.fixture(scope='module')
def settings_from_cache():
    return {
        'appTypesForPlatform': {'arm': ['client', 'server'], 'linux': ['bundle', 'client', 'server'],
                                'macos': ['client'], 'sdk': ['metadata_sdk', 'storage_sdk', 'video_source_sdk'],
                                'windows': ['bundle', 'client', 'server']},
        'availableDownloadsPlatform': ['arm', 'linux', 'macos', 'sdk', 'windows'], 'cloudName': 'Nx Cloud',
        'vmsName': 'Nx Witness', 'cloudStorageEnabled': False, 'cloudStorageSize': '53687091200',
        'copyrightYear': '2020', 'companyName': 'Network Optix', 'companyLink': 'https://www.networkoptix.com',
        'developersEnabled': True, 'feedbackEnabled': True,
        'integrationFilterItems': [{'id': 'automation', 'name': 'Automation', 'enabled': True},
                                   {'id': 'videoAnalytics', 'name': 'Video Analytics', 'enabled': True},
                                   {'id': 'objectDetection', 'name': 'Object Detection', 'enabled': True},
                                   {'id': 'eventDetection', 'name': 'Event Detection', 'enabled': True},
                                   {'id': 'faceRecognition', 'name': 'Face Recognition', 'enabled': True},
                                   {'id': 'licensePlateRecognition', 'name': 'License Plate Recognition',
                                    'enabled': True}, {'id': 'health', 'name': 'Health Monitoring', 'enabled': False},
                                   {'id': 'storage', 'name': 'Storage', 'enabled': True},
                                   {'id': 'mine', 'name': 'My Integrations', 'enabled': True}],
        'integrationFilterLimitation': '12',
        'integrationSeoPageDescription': 'The Integrations Marketplace is a centralized ecosystem of products that integrate seamlessly with VMS products like Nx Witness, all available in Nx Cloud so that you can find solutions to build and customize your IP Video system.',
        'integrationStoreEnabled': True,
        'landingDescription': 'A simple way to connect to, manage and expand Nx Witness Systems. %CLOUD_HOST% - %CLOUD_LINK% test',
        'healthMonitorCacheTimeout': 60, 'trafficRelayHost': '{systemId}.relay-bur.vmsproxy.hdw.mx',
        'publicDownloads': True, 'publicReleases': True, 'showAllBetas': False, 'showAnalyticsEvents': True,
        'sortSupportedDevicesByPopularity': False,
        'testedOperatingSystems': {'linux': 'Ubuntu LTS: 16.04, 18.04, 20.04',
                                   'macos': 'OS X 10.13: “High Sierra”, 10.14: “Mojave”, 10.15 “Catalina”.',
                                   'windows': 'Windows 7, 8, 8.1, 10/Enterprise, 2008 R2, 2012, 2012 R2, 2016 v1607'},
        'supportLink': 'https://support.networkoptix.com',
        'privacyLink': 'https://www.networkoptix.com/privacy-policy/',
        'supportedResolutions': [{'value': '0', 'name': 'All'}, {'value': '84480', 'name': '1CIF'},
                                 {'value': '168960', 'name': '2CIF'}, {'value': '337920', 'name': 'D1'},
                                 {'value': '307200', 'name': 'VGA'}, {'value': '786432', 'name': 'SVGA'},
                                 {'value': '921600', 'name': '720p'}, {'value': '1310720', 'name': '1mp'},
                                 {'value': '2073600', 'name': '1080p'}, {'value': '1920000', 'name': '2mp'},
                                 {'value': '3145728', 'name': '3mp'}, {'value': '4915200', 'name': '5mp'},
                                 {'value': '8000000', 'name': '8mp'}, {'value': '10039296', 'name': '10mp'}],
        'supportedHardwareTypes': [{'id': 'camera', 'label': 'Camera'},
                                   {'id': 'multiSensorCamera', 'label': 'Multi-Sensor Camera'},
                                   {'id': 'encoder', 'label': 'Encoder'}, {'id': 'dvr', 'label': 'DVR'},
                                   {'id': 'other', 'label': 'Other'}],
        'searchTags': [{'id': 'isAudioSupported', 'value': False}, {'id': 'isTwAudioSupported', 'value': False},
                       {'id': 'isPtzSupported', 'value': False}, {'id': 'isAptzSupported', 'value': False},
                       {'id': 'isFisheye', 'value': False}, {'id': 'isMdSupported', 'value': False},
                       {'id': 'isIoSupported', 'value': False}, {'id': 'isH265', 'value': False},
                       {'id': 'isMultiSensor', 'value': False}, {'id': 'isAnalyticsSupported', 'value': False}],
        'vendorsShown': '30', 'pushConfig': {'apiKey': 'AIzaSyA8bA6jCS4GnzmfGEg_I6mQyG5JIBKFrLI',
                                             'authDomain': 'nx-push-test.firebaseapp.com',
                                             'databaseURL': 'https://nx-push-test.firebaseio.com',
                                             'projectId': 'nx-push-test', 'storageBucket': 'nx-push-test.appspot.com',
                                             'messagingSenderId': '627461092708',
                                             'appId': '1:627461092708:web:1b140238961b4213'},
        'googleTagManagerId': '  ', 'trialLicenseKey': '0000-0000-0000-0005'
    }


def test_get_cloud_capabilities_from_cache(mocker, cloud_capabilities, settings):
    cache_mock = mocker.patch.object(utils, 'cloud_portal_customization_cache')
    cache_mock.return_value = cloud_capabilities
    expected = {'integrationStoreEnabled': cloud_capabilities.get('integration_store_enabled', False)}

    cache_capabilities = utils.get_cloud_capabilities_from_cache()
    cache_mock.assert_called_with(settings.CUSTOMIZATION, 'cloud_capabilities')
    assert cache_capabilities == expected


def test_get_settings_from_cache(mocker, customization_config, settings_from_cache, settings):
    cache_mock = mocker.patch.object(utils, 'cloud_portal_customization_cache')
    cache_mock.return_value = customization_config

    settings_dict = utils.get_settings_from_cache()
    cache_mock.assert_called_with(settings.CUSTOMIZATION, 'config')
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
        response = utils.visited_key(request)
        assert response.status_code == status.HTTP_200_OK
        assert response.data == {'visited': False}

    def test_get_missing_key(self, arf):
        request = arf.get('/api/utils/visitedKey')
        request.session = {}
        response = utils.visited_key(request)
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_post(self, arf):
        request = arf.post('/api/utils/visitedKey', {'key': self.key})
        request.session = {}
        response = utils.visited_key(request)
        assert response.status_code == status.HTTP_200_OK
        assert response.data['visited']
        try:
            date_parser.parse(response.data['visited'])
        except ValueError:
            pytest.fail(f'Expected datetime in response, got: {response.data["visited"]}')


class TestLanguage:
    def test_get(self, mocker, arf):
        lang_detect = mocker.patch('util.helpers.detect_language_by_request')
        lang_detect.return_value = 'en_US'

        request = arf.get('/api/utils/language')
        request.session = {}
        response = utils.language(request)
        lang_detect.assert_called()
        assert response.status_code == status.HTTP_302_FOUND
        assert response.url == '/static/lang_en_US/language_compiled.json'

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

        response = utils.language(request)
        self.check_post_assertions(request, response)

        # Authenticated
        request = arf.post('/api/utils/language', {'language': 'es_ES'})
        request.session = {}
        request.user = active_user

        response = utils.language(request)
        self.check_post_assertions(request, response)
        active_user.refresh_from_db()
        assert active_user.language == 'es_ES'

class DownloadHistory:
    pass

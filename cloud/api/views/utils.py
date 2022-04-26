from math import log2
import datetime
import json
import logging
import re

import requests
from django.core.cache import cache, caches
from django.conf import settings
from django.shortcuts import redirect
from oauth2_provider.contrib.rest_framework import IsAuthenticatedOrTokenHasScope
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework import serializers
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from waffle import flag_is_active, switch_is_active, sample_is_active

from api.helpers.exceptions import handle_exceptions, require_params,\
    APIRequestException, APIForbiddenException, APINotFoundException, ErrorCodes
from cms.models import Customization, cloud_portal_customization_cache, get_cached_menu, UserGroupsToAssetPermissions, \
    cached_doc_menu_map, LicenseType
from cms.feature_flags import *

logger = logging.getLogger(__name__)


# Swagger params
build__route_param = openapi.Parameter('key', openapi.IN_PATH, type=openapi.TYPE_STRING)
visited_key__query_param = openapi.Parameter('key', openapi.IN_QUERY, type=openapi.TYPE_STRING)

# Swagger schemas
language__body = openapi.Schema(type=openapi.TYPE_STRING)
visited_key__body = openapi.Schema(type=openapi.TYPE_STRING)


def get_cloud_capabilities_from_cache():
    customization_cache = cloud_portal_customization_cache(settings.CUSTOMIZATION, 'cloud_capabilities')
    capabilities = {
        'integrationStoreEnabled': customization_cache.get('integration_store_enabled', False)
    }

    if smtp_disabled := customization_cache.get('smtp_disabled'):
        capabilities['smtpDisabled'] = smtp_disabled

    return capabilities


def get_settings_from_cache():
    customization_cache = cloud_portal_customization_cache(settings.CUSTOMIZATION, 'config')
    return {
        'appTypesForPlatform': customization_cache.get('app_types_for_platform', {}),
        'availableDownloadsPlatform': customization_cache.get('available_downloads_platform', []),
        'cloudName': customization_cache.get('cloud_name', ''),
        'vmsName': customization_cache.get('vms_name', ''),
        'alexaIntegrationEnabled': customization_cache.get('alexa_integration_enabled', False),
        'bookmarksEnabled': customization_cache.get('bookmarks_enabled', False),
        'cloudStorageEnabled': customization_cache.get('cloud_storage_enabled', False),
        'cloudStorageSize': customization_cache.get('cloud_storage_size', '53687091200'),
        'copyrightYear': customization_cache.get('copyright_year', ''),
        'companyName': customization_cache.get('company_name', ''),
        'companyLink': customization_cache.get('company_link', ''),
        'customClientsEnabled': customization_cache.get('public_custom_clients', False),
        'developersEnabled': customization_cache.get('developers_enabled', False),
        'feedbackEnabled': customization_cache.get('feedback_enabled', False),
        'integrationFilterItems': customization_cache.get('integration_filter_items', []),
        'integrationFilterLimitation': customization_cache.get('integration_filter_limitation', '12'),
        'integrationSeoPageDescription': customization_cache.get('integration_seo_page_description', ''),
        'integrationStoreEnabled': customization_cache.get('integration_store_enabled', False),
        'landingDescription': customization_cache.get('landing_description', ''),
        'healthMonitorCacheTimeout': customization_cache.get('health_monitor_cache_timeout', 60),
        'trafficRelayHost': settings.TRAFFIC_RELAY_HOST,
        'publicDownloads': customization_cache.get('public_downloads', False),
        'publicReleases': customization_cache.get('public_releases', False),
        'showAllBetas': customization_cache.get('show_all_betas', False),
        'showAnalyticsEvents': customization_cache.get('show_analytics_events', False),
        'sortSupportedDevicesByPopularity': customization_cache.get('sort_supported_devices_by_popularity', False),
        'testedOperatingSystems': customization_cache.get('tested_operating_systems', {}),
        'supportLink': customization_cache.get('support_link', ''),
        'privacyLink': customization_cache.get('privacy_link', ''),
        'supportedResolutions': customization_cache.get('supported_resolutions', []),
        'supportedHardwareTypes': customization_cache.get('supported_hardware_types', []),
        'searchTags': customization_cache.get('search_tags', []),
        'vendorsShown': customization_cache.get('vendors_shown', '30'),
        'pushConfig': customization_cache.get('push_config', {}),
        'googleTagManagerId': customization_cache.get('google_tag_manager_id', ''),
        'trialLicenseKey': customization_cache.get('trial_license_key', ''),
    }


def filter_releases(releases):
    """Finds a mobile and vms release"""
    filtered_releases = []
    has_mobile = False
    has_vms = False
    mobile_types = ["android", "ios"]

    for release in releases:
        is_mobile = any(map(lambda platform: platform.get("name") in mobile_types, release.get("platforms", [])))
        if is_mobile and not has_mobile:
            has_mobile = True
            filtered_releases.append(release)
        elif not is_mobile and not has_vms:
            has_vms = True
            filtered_releases.append(release)

        if has_mobile and has_vms:
            break

    return filtered_releases


@swagger_auto_schema(method="GET",  # auto_schema=None,
                     operation_description="Checks if the key has been used.",
                     manual_parameters=[visited_key__query_param])
@swagger_auto_schema(method="POST",  # auto_schema=None,
                     operation_description="Marks the key as visited.",
                     request_body=openapi.Schema(
                         type=openapi.TYPE_OBJECT,
                         properties={
                             "key": visited_key__body
                         },
                         required=["key"]
                     ))
@api_view(['GET', 'POST'])
@permission_classes((AllowAny, ))
def visited_key(request):
    global_cache = caches['global']
    if request.method == 'GET':
        # Check cache value here
        if 'key' not in request.query_params:
            raise APIRequestException('Parameter key is missing', ErrorCodes.wrong_parameters,
                                      error_data=request.query_params)
        key = 'visited_key_' + request.query_params['key']
        value = global_cache.get(key, False)

        logger.debug(f'check visited: {key}: {value}')

    else:
        # Save cache value here
        require_params(request, ('key',))
        key = 'visited_key_' + request.data['key']
        value = datetime.datetime.now().strftime('%c')
        global_cache.set(key, value, settings.LINKS_LIVE_TIMEOUT)

        logger.debug(f'visited: {key}: {value}')

    return Response({'visited': value})


@swagger_auto_schema(method="GET",  # auto_schema=None,
                     operation_description="Gets the language of the current user.",
                     responses={'302': 'Redirect to language file'})
@swagger_auto_schema(method="POST",  # auto_schema=None,
                     operation_description="Sets the language for current user.",
                     request_body=openapi.Schema(
                         type=openapi.TYPE_OBJECT,
                         properties={
                             "language": language__body
                         },
                         required=["language"]
                     ),
                     responses={'200': openapi.Schema(type=openapi.TYPE_OBJECT, properties={'language': openapi.Schema(type=openapi.TYPE_STRING)})})
@api_view(['GET', 'POST'])
@permission_classes((AllowAny, ))
@handle_exceptions
def language(request):
    if request.method == 'GET':  # Get language for current user
        from util.helpers import detect_language_by_request
        lang = detect_language_by_request(request)
        language_file = f'/static/lang_{lang}/language_compiled.json'
        # Return: redirect to language.json file for selected language
        response = redirect(language_file)

        request.session['language'] = lang
        response.set_cookie('language', lang, 60 * 60 * 24 * 7)  # Cookie for one week
        return response
    elif request.method == 'POST':
        require_params(request, ('language',))
        lang = request.data['language']

        # Save session value
        request.session['language'] = lang

        # Save account value
        if request.user.is_authenticated:
            request.user.language = lang
            request.user.save()

        response = Response({'language': lang})
        # Save cookie
        response.set_cookie('language', lang, 60 * 60 * 24 * 7)  # Cookie for one week
        return response


@swagger_auto_schema(method="GET",  # auto_schema=None,
                     operation_description="Returns a list of builds and patch notes for the current cloud portal.")
@api_view(['GET'])
@permission_classes((AllowAny, ))
def downloads_history(request):
    # TODO: later we can check specific permissions
    can_view_releases = UserGroupsToAssetPermissions.\
        check_customization_permission(request.user, settings.CUSTOMIZATION, 'api.can_view_release')
    public_release_history = get_settings_from_cache()['publicReleases']
    if not public_release_history and not can_view_releases:
        raise APIForbiddenException("Not authorized", ErrorCodes.forbidden)

    downloads_url = settings.DOWNLOADS_JSON.replace('{{customization}}', settings.CUSTOMIZATION)
    downloads_json = requests.get(downloads_url)

    if downloads_json.status_code == 404:
        logger.warning(
            f"downloads.json doesn't exist for customization: {settings.CUSTOMIZATION}, {settings.CONFIG_ERROR} "
            f"(publish and accept a release)"
        )
        return Response(None)

    downloads_json.raise_for_status()
    downloads_json = downloads_json.json()

    if not get_settings_from_cache()["showAllBetas"]:
        filter_type = "betas"
        downloads_json[filter_type] = filter_releases(downloads_json.get(filter_type, []))

    return Response(downloads_json)


@swagger_auto_schema(method="GET",  # auto_schema=None,
                     operation_description="Returns detailed information about a specific build for the current "
                                           "cloud portal.",
                     manual_parameters=[build__route_param])
@api_view(['GET'])
@permission_classes((IsAuthenticatedOrTokenHasScope, ))
def download_build(request, build):
    # TODO: later we can check specific permissions
    customization = settings.CUSTOMIZATION
    public_release_history = get_settings_from_cache()['publicReleases']
    can_view_releases = UserGroupsToAssetPermissions.\
        check_customization_permission(request.user, customization, 'api.can_view_release')
    if not public_release_history and not can_view_releases:
        raise APIForbiddenException("Not authorized", ErrorCodes.forbidden)
    """
        r'(?:(?:\d*\.){2,3})?\d+(?: \w\d+)?'
        This pattern looks for version, build, and in some cases R|H + number
        looks for the following patterns
        12345            - Build number (old way the rest are new)
        20.1.12345       - Mobile build with full version
        20.1.1.12345     - Desktop build with full version
        12345 R10        - Meta build with release
        20.1.12345 R10   - Mobile meta build with release
        20.1.1.12345 R10 - Desktop Meta build with release
    """
    if not re.search(r'(?:(?:\d*\.){2,3})?\d+(?: \w\d+)?', build):
        raise APINotFoundException("Invalid build number", ErrorCodes.bad_request)

    downloads_url = settings.DOWNLOADS_VERSION_JSON.replace('{{customization}}', customization).\
        replace('{{build}}', build)
    downloads_json = requests.get(downloads_url)

    if downloads_json.status_code != 200:
        raise APINotFoundException("Build number does not exist", ErrorCodes.not_found, error_data=request.query_params)

    downloads_json = downloads_json.json()

    if 'releaseNotes' not in downloads_json:
        raise APINotFoundException("No downloads.json for this build",
                                   ErrorCodes.not_found,
                                   error_data=request.query_params)

    updates_json = requests.get(settings.UPDATE_JSON)
    updates_json.raise_for_status()
    updates_json = updates_json.json()

    # find settings for customizations
    if customization not in updates_json:
        logger.warning(f'Customization not in updates.json: {customization}. {settings.CONFIG_ERROR}')
        customization = 'default'

    updates_record = updates_json[customization]
    downloads_json['updatesPrefix'] = updates_record['updates_prefix']

    return Response(downloads_json)


@swagger_auto_schema(method="GET",  # auto_schema=None,
                     operation_description="Returns the download information for the current build.")
@swagger_auto_schema(method="POST",  # auto_schema=None,
                     operation_description="Forces the downloads cache to clear and returns the "
                                           "new download information.")
@api_view(['GET', 'POST'])
@permission_classes((AllowAny, ))
def downloads(request):
    global_cache = caches['global']
    customization = settings.CUSTOMIZATION
    settings_cache = get_settings_from_cache()

    public_downloads = settings_cache['publicDownloads']
    if not public_downloads and not request.user.is_authenticated:
        raise APIForbiddenException("Not authorized", ErrorCodes.not_authorized)
    cache_key = f"downloads_{customization}"
    if request.method == 'POST':  # clear cache on POST request - only for this customization
        global_cache.set(cache_key, False)
    downloads_json = global_cache.get(cache_key, False)
    if not downloads_json:
        # get updates.json
        updates_json = requests.get(settings.UPDATE_JSON)
        updates_json.raise_for_status()
        updates_json = updates_json.json()

        # find settings for customizations
        if customization not in updates_json:
            logger.warning(f"Customization not in updates.json: {customization}. {settings.CONFIG_ERROR}")
            return Response(None)
        updates_record = updates_json[customization]
        latest_version = updates_record.get('download_version')

        # Fallback section for old structure and old versions
        if not latest_version or latest_version.startswith('2'):
            if latest_version and latest_version.startswith('2'):
                logger.warning(f'No 3.0 downloadable release for customization: {customization}. '
                               f'{settings.CONFIG_ERROR}')
            else:
                logger.warning(f'No download_version in updates.json for customization: {customization}. '
                               f'{settings.CONFIG_ERROR}')
            latest_release = None
            if 'current_release' in updates_record:
                latest_release = updates_record['current_release']
            if not latest_release:  # Hack for new customizations
                logger.warning(f'No official release for customization: {customization}. '
                             f'{settings.CONFIG_ERROR}')
                latest_release = '3.0'
            if latest_release.startswith('2'):  # latest release is 2.* - fallback for 3.0
                latest_release = '3.0'
            if latest_release not in updates_record['releases']:
                logger.warning(f'No 3.0 release for customization: {customization}. {settings.CONFIG_ERROR}')
                return Response(None)
            latest_version = updates_record['releases'][latest_release]
        # End of fallback section for old structure and old versions

        build_number = latest_version.split('.')[-1]
        if ' ' in build_number:
            build_number = build_number.split(' ')[0]
        updates_path = updates_record['updates_prefix']

        # get downloads.json for specific version. If get there - version is at least 3.0, so downloads.json is present
        downloads_path = updates_path + '/' + build_number + '/downloads.json'
        downloads_result = requests.get(downloads_path)
        downloads_result.raise_for_status()
        downloads_json = downloads_result.json()
        downloads_json['releaseNotes'] = updates_record['release_notes']
        downloads_json['releaseUrl'] = updates_path + '/' + build_number + '/'
        # add release notes to downloads.json
        # evaluate file paths
        # release_notes = updates_record['release_notes']

        global_cache.set(cache_key, json.dumps(downloads_json))
    else:
        downloads_json = json.loads(downloads_json)

    # Remove platforms that are not marked as available.
    available_platforms = settings_cache['availableDownloadsPlatform']
    platforms = []
    for platform in downloads_json['platforms']:
        if platform['name'] in available_platforms:
            platforms.append(platform)

    downloads_json['platforms'] = platforms
    return Response(downloads_json)


def get_feature_flags(request):
    return {
        **{FLAGS.json_key(key): flag_is_active(request, FLAGS[key]) for key in FLAGS.all_keys},
        **{SWITCHES.json_key(key): switch_is_active(SWITCHES[key]) for key in SWITCHES.all_keys},
        **{SAMPLES.json_key(key): sample_is_active(SAMPLES[key]) for key in SAMPLES.all_keys}
    }


@swagger_auto_schema(method="GET",  # auto_schema=None,
                     operation_description="Returns cloud config information to the web client.")
@api_view(['GET'])
@permission_classes((AllowAny, ))
def get_settings(request):
    settings_object = get_settings_from_cache()
    if 'version_id' in settings_object:
        del settings_object['version_id']
    settings_object['menus'] = get_cached_menu(settings.CUSTOMIZATION, user=request.user)
    settings_object['docMenuMap'] = cached_doc_menu_map(customization_name=settings.CUSTOMIZATION)
    settings_object['licenseTypes'] = LicenseType.get_license_types()

    # Hide cloud merge setting if its disabled to not reveal this feature to users.
    if 'cloudMerge' in settings_object and not settings_object['cloudMerge']:
        del settings_object['cloudMerge']

    if 'showAllBetas' in settings_object:
        del settings_object['showAllBetas']

    if not settings_object.get('integrationStoreEnabled') and \
            UserGroupsToAssetPermissions.user_has_beta_access(request.user):
        settings_object['integrationStoreEnabled'] = True
    if not settings_object.get('developersEnabled', False) and \
            UserGroupsToAssetPermissions.check_customization_permission(
                request.user, settings.CUSTOMIZATION, 'cms.access_developers'):
        settings_object['developersEnabled'] = True
    if not settings_object.get('customClientsEnabled', False) and \
            UserGroupsToAssetPermissions.check_customization_permission(
                request.user, settings.CUSTOMIZATION, 'api.custom_clients'):
        settings_object['customClientsEnabled'] = True

    settings_object['featureFlags'] = get_feature_flags(request)
    return Response(settings_object)


@swagger_auto_schema(method="GET",  # auto_schema=None,
                     operation_description="Returns the list of supported devices.")
@swagger_auto_schema(method="POST",  # auto_schema=None,
                     operation_description="Clear's the supported devices cache.",
                     responses={'200': 'IPVD cache cleared'})
@api_view(['GET', 'POST'])
@permission_classes((AllowAny,))
def get_ipvd(request):
    url = settings.IPVD_CONNECT

    if request.method == 'GET':
        # check cache and return cached item if any
        ipvd = cache.get("ipvd", dict())

        if all(k in ipvd for k in ("cameras", "vendors", "analytics", "num_cameras")):
            return Response({
                "cameras": ipvd["cameras"],
                "vendors": ipvd["vendors"],
                "analytics": ipvd["analytics"],
                "num_cameras": ipvd["num_cameras"],
                "cached": True
            })
        # ---------------------

        # else request and process
        cameras = requests.get(url, "[]").json()

        # build vendor list
        analytics_events = set()
        vendors_dict = {}
        camera_names = []

        for camera in cameras:
            camera["firmwares"] = json.loads(camera["firmwares"]) if camera["firmwares"] else {}

            firmwares = []
            max_firmware_count = 0
            total_camera_count = 0

            for firmware in camera["firmwares"]:
                if re.match('[<>]+', firmware):
                    continue

                count = camera["firmwares"][firmware]

                firmwares.append({'count': count, 'name': firmware})

                total_camera_count += count
                if count > max_firmware_count:
                    max_firmware_count = count

            for firmware in firmwares:
                percentage = round((firmware["count"] / total_camera_count) * 100)
                percentage = str(percentage) + "%" if percentage else "< 1"
                firmware["percentage"] = percentage

                pow_var = log2(200) / log2(max_firmware_count) if max_firmware_count > 200 else 1
                length = round(100 * pow(firmware["count"] / max_firmware_count, pow_var))
                length = length if length >= 2 else 2
                firmware["barLength"] = length

            firmwares.sort(key=lambda x: x["count"], reverse=True)

            camera["firmwares"] = firmwares
            camera["maxFirmwareCount"] = max_firmware_count
            camera["totalCameraCount"] = total_camera_count

            camera["isH265"] = camera["primaryCodec"] == 'H.265'

            if camera["hardwareType"] == "Camera" and camera["isMultiSensor"]:
                camera["hardwareType"] = 'Multi-Sensor Camera'
                camera["hardwareTypeId"] = 'multiSensorCamera'
            else:
                camera["hardwareTypeId"] = camera["hardwareType"].lower()

            res = camera["maxResolution"].split('x')
            if len(res) == 2:
                camera["resolutionArea"] = int(res[0]) * int(res[1])
            else:
                camera["resolutionArea"] = 0

            vendor = camera["vendor"]
            if vendor in vendors_dict:
                vendors_dict[vendor]['count'] += camera["count"]
            else:
                vendors_dict[vendor] = {'name': vendor, 'count': camera["count"]}

            vm = camera["vendor"].replace(" ", "") + camera["model"].replace(" ", "")
            camera["sortKey"] = vm
            camera_names.append(vm)

            if camera["aliases"]:
                for alias in camera["aliases"].split(','):
                    alias = alias.strip()
                    camera_names.append(camera["vendor"].replace(" ", "") + alias.replace(" ", ""))

            for event in camera['analyticsEvents']:
                analytics_events.add(event)

        num_cameras = len(set(camera_names))
        # ---------------------

        vendors = list(vendors_dict.values())
        analytics = list(analytics_events)
        analytics.sort()

        ipvd = {
            "cameras": cameras,
            "vendors": vendors,
            "analytics": analytics,
            "num_cameras": num_cameras
        }

        # cache ipvd
        cache.set("ipvd", ipvd, 60 * 60 * 24)  # 24 hours
        # ---------------------

        return Response(ipvd)

    elif request.method == 'POST':
        # clear cache
        cache.set("ipvd", dict())
        # --------------------

        return Response({'IPVD cache cleared'})


@swagger_auto_schema(method="GET", auto_schema=None,
                     operation_description="Returns what capabilities cloud portal supports. This is used "
                                           "mainly for vms.")
@api_view(['GET'])
@permission_classes((AllowAny, ))
def cloud_capabilities(request):
    capabilities = get_cloud_capabilities_from_cache()

    return Response(capabilities)


CUSTOMIZATIONS_STAFF_ONLY = f'Customizations list only available to users on the {settings.SUPERUSER_DOMAIN} domain'


@swagger_auto_schema(method="GET",
                     operation_description="Returns list of customizations.",
                     responses={
                         '200': serializers.ListSerializer(child=serializers.CharField()),
                         '401': openapi.Schema(type=openapi.TYPE_OBJECT, properties={
                             'details': openapi.Schema(type=openapi.TYPE_STRING, default='Authentication credentials were not provided.')}),
                         '403': openapi.Schema(type=openapi.TYPE_OBJECT, properties={
                             'resultCode': openapi.Schema(type=openapi.TYPE_STRING, default='notAuthorized'),
                             'errorText': openapi.Schema(type=openapi.TYPE_STRING, default=CUSTOMIZATIONS_STAFF_ONLY),
                             'errorData': openapi.Schema(type=openapi.TYPE_STRING)})
                    })
@api_view(['GET'])
@permission_classes((IsAuthenticatedOrTokenHasScope,))
@handle_exceptions
def get_customizations(request):
    if not request.user.email.endswith(settings.SUPERUSER_DOMAIN):
        raise APIForbiddenException(CUSTOMIZATIONS_STAFF_ONLY)

    return Response(Customization.objects.filter(enabled=True).values_list('name', flat=True))

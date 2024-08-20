import asyncio
import time

import httpx
import requests

import datetime
import json
import logging
import re
import os

import waffle
from django.http import HttpResponse
from django.urls import reverse
from uuid import uuid4

from asgiref.sync import sync_to_async
from rest_framework.request import Request

from cloud.customization_context import customization_ctx
from notifications.celery import update_ipvd
from util.helpers import HttpxAsyncRequest
from django.core.cache import cache, caches
from django.conf import settings
from django.shortcuts import redirect
from rest_framework.decorators import permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework import serializers, status
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from waffle import flag_is_active, switch_is_active, sample_is_active

from cloud import settings
from cloud.helpers.exceptions import api_success, handle_exceptions, require_params, \
    APIRequestException, APIForbiddenException, APINotFoundException, ErrorCodes, APIInternalException
from nx_drf.drf_async import async_api_view as api_view, async_api_view
from api.serializers import CustomizationCacheSerializer, SettingsSerializer, IpvdSerializer, ThemeSerializer, process_cameras, \
    CustomizationNameSerializer, ForceSyncSerializer
from cms.models import Customization, cloud_portal_customization_cache, UserGroupsToAssetPermissions, \
    cloud_portal_customization_cache_async, global_version_key, get_or_set_global_cache
from cms.feature_flags.feature_flags import FLAGS, SWITCHES, SAMPLES
from cms.permissions import IsSuperuser

logger = logging.getLogger(__name__)


# Swagger params
build__route_param = openapi.Parameter(
    'key', openapi.IN_PATH, type=openapi.TYPE_STRING)
visited_key__query_param = openapi.Parameter(
    'key', openapi.IN_QUERY, type=openapi.TYPE_STRING)

# Swagger schemas
language__body = openapi.Schema(type=openapi.TYPE_STRING)
visited_key__body = openapi.Schema(type=openapi.TYPE_STRING)


async def get_cloud_capabilities_from_cache(*, customization=None, request=None):
    if not customization and not request and not customization_ctx.get():
        raise APIInternalException('Customization must be given.',
                                  error_code=ErrorCodes.no_customization_given)
    customization = customization or getattr(request, 'CUSTOMIZATION', customization_ctx.get())
    customization_cache = await cloud_portal_customization_cache_async(
        customization, 'cloud_capabilities')
    capabilities = {
        'integrationStoreEnabled': customization_cache.get('integration_store_enabled', False)
    }

    if smtp_disabled := customization_cache.get('smtp_disabled'):
        capabilities['smtpDisabled'] = smtp_disabled

    return capabilities


async def get_settings_from_cache(*, customization=None, request=None):
    if not customization and not request and not customization_ctx.get():
        raise APIInternalException('Customization must be given.',
                                   error_code=ErrorCodes.no_customization_given)

    customization = customization or getattr(request, 'CUSTOMIZATION', customization_ctx.get())

    customization_cache = await cloud_portal_customization_cache_async(
        customization, 'config')
    serializer = CustomizationCacheSerializer(data=customization_cache)
    serializer.is_valid()
    return serializer.data


def filter_releases(releases):
    """Finds a mobile and vms release"""
    filtered_releases = []
    has_mobile = False
    has_vms = False
    mobile_types = ["android", "ios"]

    for release in releases:
        is_mobile = any(map(lambda platform: platform.get(
            "name") in mobile_types, release.get("platforms", [])))
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
async def visited_key(request):
    global_cache = caches['global']
    value = None
    if request.method == 'GET':
        # Check cache value here
        if 'key' in request.query_params:
            key = 'visited_key_' + request.query_params['key']
            value = await global_cache.aget(key, False)

            logger.debug(f'check visited: {key}: {value}')

    else:
        # Save cache value here
        require_params(request, ('key',))
        key = 'visited_key_' + request.data['key']
        value = datetime.datetime.now().strftime('%c')
        await global_cache.aset(key, value, settings.LINKS_LIVE_TIMEOUT)

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
async def language(request):
    if request.method == 'GET':  # Get language for current user
        from util.helpers import detect_language_by_request
        lang = await sync_to_async(detect_language_by_request)(request)
        language_file = f'/static/lang_{lang}/language_compiled.json?version={settings.VERSION}'
        # Return: redirect to language.json file for selected language
        response = redirect(language_file)

        request.session['language'] = lang
        response.set_cookie('language', lang, 60 * 60 *
                            24 * 7)  # Cookie for one week
        return response
    elif request.method == 'POST':
        require_params(request, ('language',))
        lang = request.data['language']

        # Save session value
        request.session['language'] = lang

        # Save account value
        if request.user.is_authenticated:
            request.user.language = lang
            await sync_to_async(request.user.save)()

        response = Response({'language': lang})
        # Save cookie
        response.set_cookie('language', lang, 60 * 60 *
                            24 * 7)  # Cookie for one week
        return response


@swagger_auto_schema(method="GET",  # auto_schema=None,
                     operation_description="Gets supported languages. Redirects to languages.json but with version query param for cache busting. When possible /static/{{version}}/languages.json should be required directly.",
                     deprecated=True,
                     responses={'302': 'Redirect to languages file with cache busting'})
@api_view(['GET'])
@permission_classes((AllowAny, ))
@handle_exceptions
def languages(request):
    return redirect(f'/static/languages.json?version={settings.VERSION}')


@swagger_auto_schema(method="GET",  # auto_schema=None,
                     operation_description="Returns a list of builds and patch notes for the current cloud portal.")
@api_view(['GET'])
@permission_classes((AllowAny, ))
async def downloads_history(request):
    # TODO: later we can check specific permissions
    customization = request.CUSTOMIZATION
    can_view_releases = await UserGroupsToAssetPermissions.\
        check_customization_permission_async(
            request.user, customization, 'api.can_view_release')
    settings_cache = await get_settings_from_cache(
        customization=customization)
    public_release_history = settings_cache['publicReleases']
    if not public_release_history and not can_view_releases:
        raise APIForbiddenException("Not authorized", ErrorCodes.forbidden)

    downloads_url = settings.DOWNLOADS_JSON.replace(
        '{{customization}}', customization)
    downloads_json = await HttpxAsyncRequest.get(downloads_url)

    if downloads_json.status_code == 404:
        logger.warning(
            f"downloads.json doesn't exist for customization: {customization}, {settings.CONFIG_ERROR} "
            f"(publish and accept a release)"
        )
        return Response(None)

    downloads_json.raise_for_status()
    downloads_json = downloads_json.json()

    if not settings_cache["showAllBetas"]:
        filter_type = "betas"
        downloads_json[filter_type] = filter_releases(
            downloads_json.get(filter_type, []))

    return Response(downloads_json)


@swagger_auto_schema(method="GET",  # auto_schema=None,
                     operation_description="Returns detailed information about a specific build for the current "
                                           "cloud portal.",
                     manual_parameters=[build__route_param])
@api_view(['GET'])
@permission_classes((AllowAny, ))
async def download_build(request, build):
    # TODO: later we can check specific permissions
    customization = request.CUSTOMIZATION
    cached_settings = await get_settings_from_cache(customization=customization)
    public_release_history = cached_settings['publicReleases']
    can_view_releases = False
    if request.user.is_authenticated:
        can_view_releases = await UserGroupsToAssetPermissions.\
            check_customization_permission_async(
                request.user, customization, 'api.can_view_release')

    if not public_release_history and not can_view_releases:
        customization_downloads = json.loads(await caches['global'].aget(f"downloads_{customization}", "{}"))
        if customization_downloads.get('version') != build:
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
        raise APINotFoundException(
            "Invalid build number", ErrorCodes.bad_request)

    build_downloads_json = await get_downloads_build_json(request, customization, build)

    if 'releaseNotes' not in build_downloads_json:
        raise APINotFoundException("No downloads.json for this build",
                                   ErrorCodes.not_found,
                                   error_data=request.query_params)

    try:
        customization_downloads_json = await get_downloads_json(customization)
    except httpx.HTTPError:
        customization_downloads_json = await get_downloads_json('default')

    build_downloads_json['updatesPrefix'] = customization_downloads_json['updatesPrefix']

    return Response(build_downloads_json)


async def get_updates_json():
    updates_json = await HttpxAsyncRequest.get(settings.UPDATE_JSON)
    updates_json.raise_for_status()
    return updates_json.json()

async def get_downloads_json(customization):
    try:
        downloads_json = await HttpxAsyncRequest.get(settings.DOWNLOADS_JSON.replace('{{customization}}', customization))
        downloads_json.raise_for_status()
        return downloads_json.json()
    except (httpx.HTTPStatusError, requests.exceptions.HTTPError) as e:
        if e.response.status_code == 404:
            logger.warning(
                f"downloads.json doesn't exist for customization: {customization}, {settings.CONFIG_ERROR} "
                f"(publish and accept a release)"
            )
        raise e


async def get_downloads_build_json(request, customization, build):
    try:
        downloads_url = settings.DOWNLOADS_VERSION_JSON.replace('{{customization}}', customization).replace('{{build}}', build)
        downloads_build_json_res = await HttpxAsyncRequest.get(downloads_url)
        downloads_build_json_res.raise_for_status()
        return downloads_build_json_res.json()
    except (httpx.HTTPStatusError, requests.exceptions.HTTPError):
        raise APINotFoundException(
            "Build number does not exist", ErrorCodes.not_found, error_data=request.query_params)


@swagger_auto_schema(method="GET",  # auto_schema=None,
                     operation_description="Returns the download information for the current build.")
@swagger_auto_schema(method="POST",  # auto_schema=None,
                     operation_description="Forces the downloads cache to clear and returns the "
                                           "new download information.")
@async_api_view(['GET', 'POST'])
@permission_classes((AllowAny, ))
async def downloads(request):
    global_cache = caches['global']
    customization = request.CUSTOMIZATION
    settings_cache = await get_settings_from_cache(customization=customization)
    public_downloads = settings_cache['publicDownloads']
    if not public_downloads and not request.user.is_authenticated:
        raise APIForbiddenException(
            "Not authorized", ErrorCodes.not_authorized)
    cache_key = f"downloads_{customization}"
    if request.method == 'POST':  # clear cache on POST request - only for this customization
        await global_cache.aset(cache_key, False)
    downloads_json = await global_cache.aget(cache_key, False)
    if not downloads_json:
        # get updates.json
        updates_json = await get_updates_json()
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
            # latest release is 2.* - fallback for 3.0
            if latest_release.startswith('2'):
                latest_release = '3.0'
            if latest_release not in updates_record['releases']:
                logger.warning(
                    f'No 3.0 release for customization: {customization}. {settings.CONFIG_ERROR}')
                return Response(None)
            latest_version = updates_record['releases'][latest_release]
        # End of fallback section for old structure and old versions

        build_number = latest_version.split('.')[-1]
        if ' ' in build_number:
            build_number = build_number.split(' ')[0]

        customization_downloads_json = await get_downloads_json(customization)
        updates_path = customization_downloads_json.get('updatesPrefix', updates_record['updates_prefix'])

        # get downloads.json for specific version. If get there - version is at least 3.0, so downloads.json is present
        downloads_json = await get_downloads_build_json(request, customization, build_number)
        downloads_json['releaseNotes'] = ''
        if (release_notes := updates_record.get('release_notes')) and release_notes != 'https://updates.hdwitness.com/release_notes.html':
            downloads_json['releaseNotes'] = release_notes
        downloads_json['releaseUrl'] = updates_path + '/' + build_number + '/'
        # add release notes to downloads.json
        # evaluate file paths
        # release_notes = updates_record['release_notes']

        global_cache.set(cache_key, json.dumps(downloads_json))
    else:
        downloads_json = json.loads(downloads_json)

    # Remove platforms that are not marked as available.
    available_platforms = settings_cache['availableDownloadsPlatform']
    downloads_json['platforms'] = clean_platforms(downloads_json, available_platforms)
    return Response(downloads_json)


def clean_platforms(release, available_platforms):
    platforms = []
    for platform in release.get('platforms'):
        if platform['name'] in available_platforms:
            platforms.append(platform)
    return platforms


def get_latest_vms_build_by_release_type(downloads_data, release_type, release_notes_url, available_version=None):
    PRODUCT_DESCRIPTION = "Video Management System"
    # Gets the first build for the release type that's a vms. Sometimes mobile builds are there in releases.
    if release := next(filter(lambda build: build.get('productDescription') == PRODUCT_DESCRIPTION and (release_type != 'releases' or build.get('version') == available_version), downloads_data.get(release_type, [])), None):
        del release['releaseNotes'] # Don't need on the releases page since its only show on the Other page.
        updates_prefix = downloads_data.get('updatesPrefix')
        release['releaseNotes'] = release_notes_url
        release['releaseUrl'] = updates_prefix + '/' + release.get('buildNumber') + '/'
    return release


@swagger_auto_schema(method="GET",  # auto_schema=None,
                     operation_description="Returns the download information for the latest beta, patch, and release.")
@swagger_auto_schema(method="POST",  # auto_schema=None,
                     operation_description="Forces the downloads cache to clear and returns the "
                                           "new download information.")
@async_api_view(['GET', 'POST'])
@permission_classes((AllowAny, ))
async def downloads_releases(request):
    global_cache = caches['global']
    customization = request.CUSTOMIZATION

    cache_key = f"downloads_releases_{customization}"
    settings_cache = await get_settings_from_cache(customization=customization)

    public_downloads = settings_cache['publicDownloads']
    if not public_downloads and not request.user.is_authenticated:
        raise APIForbiddenException(
            "Not authorized", ErrorCodes.not_authorized)

    if request.user.is_superuser and request.method == 'POST':  # clear cache on POST request - only for this customization
        await global_cache.aset(cache_key, False)

    downloads_releases_json = await global_cache.aget(cache_key, False)

    if not downloads_releases_json:
        updates_json = await get_updates_json()
        customized_updates_json = updates_json.get(customization, {})
        latest_version = customized_updates_json.get('download_version')
        release_notes_url = customized_updates_json.get('release_notes', '')
        beta_notes_url = customized_updates_json.get('beta_notes', '')

        if release_notes_url == 'https://updates.hdwitness.com/release_notes.html':
            release_notes_url = ''

        downloads_data = await get_downloads_json(customization)

        release_types = ['betas', 'releases']
        data = {}
        for release_type in release_types:
            notes_url = release_notes_url if release_type == 'releases' else beta_notes_url
            data[release_type] = get_latest_vms_build_by_release_type(downloads_data, release_type, notes_url, available_version=latest_version)
        data['updatesPrefix'] = downloads_data['updatesPrefix']
        await global_cache.aset(cache_key, json.dumps(data))
    else:
        data = json.loads(downloads_releases_json)

    available_platforms = settings_cache['availableDownloadsPlatform']
    for key, value in data.items():
        if value and 'platforms' in value:
            data[key]['platforms'] = clean_platforms(value, available_platforms)

    return Response(data)


def get_feature_flags(request):
    return {
        **{FLAGS.json_key(key): flag_is_active(request, FLAGS[key]) for key in FLAGS.all_keys},
        **{SWITCHES.json_key(key): switch_is_active(SWITCHES[key]) for key in SWITCHES.all_keys},
        **{SAMPLES.json_key(key): sample_is_active(SAMPLES[key]) for key in SAMPLES.all_keys}
    }


@swagger_auto_schema(method="GET",  # auto_schema=None,
                     operation_description="Get feature flags for webadmin",
                     responses={200: openapi.Schema(type=openapi.TYPE_OBJECT, additional_properties=openapi.Schema(type=openapi.TYPE_BOOLEAN))})
@api_view(['GET'])
@permission_classes((AllowAny, ))
async def webadmin_feature_flags(request):
    request.META['webadmin'] = True
    flags = await sync_to_async(get_feature_flags)(request)
    return api_success(flags, additional_headers={'access-control-allow-origin': request.META.get('HTTP_ORIGIN', request.META.get('HTTP_HOST', ''))})

@swagger_auto_schema(method="GET",
                     operation_description="Return the current theme for the cloud portal.",
                     responses={200: ThemeSerializer()})
@async_api_view(['GET'])
@permission_classes((AllowAny, ))
async def get_theme(request):
    if not (version := request.query_params.get('version')):
        current_version = await get_or_set_global_cache(request.CUSTOMIZATION)
        return redirect(f'{reverse("get_theme")}?version={current_version}')

    local_cache = caches['local']

    if not (theme := await local_cache.aget(f'theme_{version}', None)):
        serializer = await sync_to_async(lambda: ThemeSerializer(request=request))()
        serializer.is_valid()
        theme = serializer.data
        await local_cache.aset(f'theme_{version}', theme, 60**2 * 24 * 365)

    return Response(theme, headers={'Cache-Control': f'max-age={60**2 * 24 * 365}'})


@swagger_auto_schema(method="GET",  # auto_schema=None,
                     operation_description="Returns cloud config information to the web client.",
                     responses={200: SettingsSerializer()})
@async_api_view(['GET'])
@permission_classes((AllowAny, ))
async def get_settings(request):
    customization = request.CUSTOMIZATION
    global_cache = caches['customization']
    user = request.query_params.get('cached')
    features_cache_key = 'features_cache_key'
    user_key = getattr(request.user, 'email', 'anonymous_user')
    current_user = str(uuid4())
    if not (await cache.aadd(user_key, current_user, timeout=86400)):
        current_user = await cache.aget(user_key)
    user_changed = not user or not current_user or user != current_user
    version = request.query_params.get('version')
    try:
        version = int(version)
    except:
        version = None
    current_version = await get_or_set_global_cache(customization)
    sync_version = global_cache.get(global_version_key(customization))
    version_changed = version != current_version
    features = request.query_params.get('features')
    current_features = str(uuid4())
    if not (await global_cache.aadd(features_cache_key, current_features, timeout=86400)):
        current_features = await global_cache.aget(features_cache_key)
    features_changed = features != current_features
    if user_changed or version_changed or features_changed:
        tag = '[GET SETTINGS DEBUG]'
        logger.info(f"{tag} Something has been changed {customization} and user:{user_changed}, "
                    f"version:{version_changed}, features:{features_changed}")
        logger.info(f"{tag} For request: {request.get_full_path()}")
        logger.info(f"{tag} User {user}. current: {current_user}")
        logger.info(f"{tag} Version {version}. current: {current_version}, {sync_version}")
        logger.info(f"{tag} Features: {features}, current: {current_features}")
        logger.info(f'{tag} Redirecting to "?cached={current_user}'
                    f'&version={current_version}&features={current_features}"')

        return redirect(f'{reverse("get_settings")}?cached={current_user}&version={current_version}&features={current_features}')

    data = await get_settings_from_cache(customization=customization)
    serializer = await sync_to_async(lambda: SettingsSerializer(data=data, request=request))()
    serializer.is_valid()
    return Response(serializer.data, headers={'Cache-Control': f'max-age={60**2 * 24}'})


IPVD_CACHE_CLEARED = 'IPVD cache cleared'
IPVD_CACHE_ERROR = 'IPVD cache not cleared due to error'
IPVD_CACHE_CLEARING_IS_SCHEDULED = 'IPVD cache clearing is scheduled'
IPVD_CACHE_NOT_CLEARED = 'No cached IPVD to clear'
IPVD_CACHE_FORBIDDEN = 'Insufficient privileges to clear cache'

IPVD_EXPIRES = 60**2 * 24
IPVD_CACHE_HEADER = {'Cache-Control': f'max-age={IPVD_EXPIRES}'}


@swagger_auto_schema(method="GET",
                     operation_description="Returns the list of supported devices.",
                     responses={200: IpvdSerializer()})
@swagger_auto_schema(method="POST",
                     operation_description="Clear's the supported devices cache.",
                     responses={
                         '200': IPVD_CACHE_CLEARED,
                         '202': IPVD_CACHE_NOT_CLEARED})
@api_view(['GET', 'POST'])
@permission_classes((AllowAny,))
async def get_ipvd(request):
    url = settings.IPVD_CONNECT
    current_version = await cache.aget('ipvd', None)

    if request.method == 'GET':
        version = request.GET.get('version')

        if not current_version:
            # Update current version and redirect to cacheable url
            current_version = str(uuid4())
            await cache.aset('ipvd', current_version)
            return redirect(f'{reverse("get-ipvd")}?version={current_version}')

        elif version != current_version:
            # Redirect to new version if changed. Only really happens if IPVD cache was cleared
            return redirect(f'{reverse("get-ipvd")}?version={current_version}')

        ipvd = await cache.aget(version, {})
        if not ipvd or not all([k in ipvd for k in ("cameras", "vendors", "analytics", "num_cameras")]):
            ipvd = await HttpxAsyncRequest.get(url, params="[]")
            ipvd = ipvd.json()
            # serializer = IpvdSerializer(data=ipvd)
            # serializer.is_valid()
            # ipvd = serializer.data
            # del serializer
            ipvd = process_cameras(ipvd)
            # validate ipvd
            if not all([k in ipvd for k in ("cameras", "vendors", "analytics", "num_cameras")]):
                return Response({"message": "Cannot retrieve ipvd info."},
                                status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            # Save the IPVD data as the current version
            await cache.aset(current_version, ipvd, IPVD_EXPIRES)
        else:
            ipvd["cached"] = True

        # Added for monitoring.
        if request.headers.get('NX-TEST-REQ'):
            ipvd = {k: len(v) if hasattr(v, '__len__') else v for k, v in ipvd.items()}
        # The IPVD cache header max-age could outlive the data ttl in the cache but that's ok since we already checked the version
        return HttpResponse(json.dumps(ipvd).encode(), headers=IPVD_CACHE_HEADER, content_type='application/json')

    elif request.method == 'POST':
        # Really only care about deleting the ipvd cache so might not even have to check if current_version cache was deleted
        cleared = await cache.adelete("ipvd") and await cache.adelete(current_version)

        return Response({IPVD_CACHE_CLEARED}) if cleared else Response({IPVD_CACHE_NOT_CLEARED}, status.HTTP_202_ACCEPTED)


@swagger_auto_schema(method="POST",
                     operation_description="Update the supported devices cache.",
                     query_serializer=ForceSyncSerializer(),
                     responses={
                         '200': IPVD_CACHE_CLEARED,
                         '201': IPVD_CACHE_CLEARING_IS_SCHEDULED,
                         '202': IPVD_CACHE_NOT_CLEARED,
                         '400': IPVD_CACHE_ERROR,
                         '403': IPVD_CACHE_FORBIDDEN,
                     })
@api_view(['POST'])
@permission_classes((IsAuthenticated,))
def ipvd_update(request):
    if not waffle.flag_is_active(request, flag_name=FLAGS.ipvd_update):
        return Response({IPVD_CACHE_FORBIDDEN}, status=status.HTTP_403_FORBIDDEN)
    query_params = ForceSyncSerializer(data=request.query_params)
    query_params.is_valid(raise_exception=True)
    if query_params.validated_data.get('forceSync'):
        try:
            update_ipvd(force=True, ignore_errors=False)
        except Exception as e:
            logger.warning(f"Error occurred while updating IPVD. Exception: {e}")
            return Response(data={IPVD_CACHE_ERROR}, status=status.HTTP_400_BAD_REQUEST)
        return Response(data={IPVD_CACHE_CLEARED}, status=status.HTTP_200_OK)
    else:
        update_ipvd.apply_async(args=None, kwargs={'force': True, 'ignore_errors': False})
        return Response(data={IPVD_CACHE_CLEARING_IS_SCHEDULED}, status=status.HTTP_201_CREATED)


@swagger_auto_schema(method="GET", auto_schema=None,
                     operation_description="Returns what capabilities cloud portal supports. This is used "
                                           "mainly for vms.")
@api_view(['GET'])
@permission_classes((AllowAny, ))
async def cloud_capabilities(request):
    capabilities = await get_cloud_capabilities_from_cache(request=request)

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
@permission_classes((IsAuthenticated,))
@handle_exceptions
async def get_customizations(request):
    if not request.user.email.endswith(settings.SUPERUSER_DOMAIN):
        raise APIForbiddenException(CUSTOMIZATIONS_STAFF_ONLY)
    customizations = await sync_to_async(Customization.objects.filter(enabled=True).values_list)('name', flat=True)
    return Response(customizations)


@swagger_auto_schema(method="GET",
                     operation_description="Returns customization name.",
                     responses={
                         '200': CustomizationNameSerializer(),
                     })
@api_view(['GET'])
@handle_exceptions
async def get_customization(request):
    customization_name = getattr(request, 'CUSTOMIZATION', None)
    return Response(CustomizationNameSerializer(instance={'name': customization_name}).data)


PY_LICENSES = 'requirements-license.json'
if settings.LOCAL_ENVIRONMENT or settings.TESTING:
    PKG_LICENSES = '../package-license.json'
else:
    PKG_LICENSES = 'package-license.json'


def load_licences(rel_path):
    path = os.path.join(settings.BASE_DIR, rel_path)
    with open(path, 'rb') as f:
        licences = json.load(f)
    return licences


@async_api_view(['GET'])
@permission_classes([IsSuperuser])
@handle_exceptions
async def python_licenses(request):
    licenses = load_licences(PY_LICENSES)
    return Response(licenses)


@async_api_view(['GET'])
@permission_classes([IsSuperuser])
@handle_exceptions
async def package_licenses(request):
    licenses = load_licences(PKG_LICENSES)
    return Response(licenses)



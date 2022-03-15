from django.forms import ValidationError
from rest_framework import serializers
from django.conf import settings
from datetime import datetime
from math import log2
import functools
import json
import re

from cms.models import LicenseType, Menu, MenuNode, UserGroupsToAssetPermissions, cached_doc_menu_map, get_cached_menu


def to_camel_case(value):
    return ''.join(word.title() if index else word
                   for index, word in enumerate(value.split('_')))


def camel_case_keys(initial_dict):
    return {to_camel_case(key): value for key, value in initial_dict.items()}


class AuthKeySerializer(serializers.Serializer):
    authGet = serializers.CharField()
    authPost = serializers.CharField()
    authPlay = serializers.CharField()


class TwoFaSerializer(serializers.Serializer):
    verification_code = serializers.CharField(
        label='A 2fa code from your 2fa app.')


class CloudResponseSerializer(serializers.Serializer):
    errorClass = serializers.CharField(label='Type of error')
    errorDetail = serializers.CharField(
        label='Details from error such as stack trace')
    errorText = serializers.CharField(label='Description of error from cloud')
    resultCode = serializers.CharField(
        label='Result of request, "ok" if successful or some other code if error')


class CreateBackupCodeSerializer(serializers.Serializer):
    count = serializers.IntegerField(required=False, default=8, min_value=1)


class DeleteBackupCodeSerializer(serializers.Serializer):
    backup_codes = serializers.CharField()

    @staticmethod
    def validate_backup_codes(data):
        if ' ' in data:
            raise serializers.ValidationError(
                "Backup Codes should be comma seperated with no spaces")
        return data


class VerificationSerializer(serializers.Serializer):
    code = serializers.CharField(required=True)
    verification_code = serializers.CharField(required=True)


class TransferSystemActionSerializer(serializers.Serializer):
    action = serializers.ChoiceField(required=True, choices=(('accepted', 'Accepted'), ('rejected', 'Rejected')))


class TransferSystemOwnerSerializer(serializers.Serializer):
    newOwnerEmail = serializers.EmailField(required=True)


class TransferSystemSerializer(serializers.Serializer):
    fromAccount = serializers.EmailField(required=True)
    toAccount = serializers.EmailField(required=True)
    systemId = serializers.CharField(required=True)
    systemName = serializers.CharField(required=False)
    comment = serializers.CharField(required=False)
    status = serializers.CharField(required=True)


class CustomizationCacheSerializer(serializers.Serializer):
    appTypesForPlatform = serializers.DictField(default=lambda: {})
    availableDownloadsPlatform = serializers.ListField(
        child=serializers.CharField(), default=lambda: [])
    cloudName = serializers.CharField(default='')
    vmsName = serializers.CharField(default='')
    alexaIntegrationEnabled = serializers.BooleanField(default=False)
    bookmarksEnabled = serializers.BooleanField(default=False)
    cloudStorageEnabled = serializers.BooleanField(default=False)
    cloudStorageSize = serializers.CharField(default='53687091200')
    copyrightYear = serializers.CharField(default=lambda: datetime.now().year)
    trafficRelayHost = serializers.CharField(
        default=settings.TRAFFIC_RELAY_HOST)
    companyName = serializers.CharField(default='')
    companyLink = serializers.CharField(default='')
    customClientsEnabled = serializers.BooleanField(default=False)
    developersEnabled = serializers.BooleanField(default=False)
    feedbackEnabled = serializers.BooleanField(default=False)
    integrationFilterItems = serializers.ListField(
        child=serializers.CharField(), default=lambda: [])
    integrationFilterLimitation = serializers.CharField(default='12')
    integrationSeoPageDescription = serializers.CharField(default='')
    integrationStoreEnabled = serializers.BooleanField(default=False)
    landingDescription = serializers.CharField(default='')
    healthMonitorCacheTimeout = serializers.IntegerField(default=60)
    publicDownloads = serializers.BooleanField(default=False)
    publicReleases = serializers.BooleanField(default=False)
    showAllBetas = serializers.BooleanField(default=False)
    showAnalyticsEvents = serializers.BooleanField(default=False)
    sortSupportedDevicesByPopularity = serializers.BooleanField(default=False)
    testedOperatingSystems = serializers.DictField(default=lambda: {})
    supportLink = serializers.CharField(default='')
    privacyLink = serializers.CharField(default='')
    supportedResolutions = serializers.ListField(
        child=serializers.CharField(), default=lambda: [])
    supportedHardwareTypes = serializers.ListField(
        child=serializers.CharField(), default=lambda: [])
    searchTags = serializers.ListField(
        child=serializers.CharField(), default=lambda: [])
    vendorsShown = serializers.CharField(default='30')
    pushConfig = serializers.DictField(default=lambda: {})
    googleTagManagerId = serializers.CharField(default='')
    trialLicenseKey = serializers.CharField(default='')

    def __init__(self, *args, **kwargs):
        if data := kwargs.pop('data', False):
            kwargs['data'] = camel_case_keys(data)
        super().__init__(*args, **kwargs)


class RecursiveField(serializers.Serializer):
    def to_representation(self, value):
        serializer = self.parent.parent.__class__(value, context=self.context)
        return serializer.data


class LicenseTypesSerializer(serializers.Serializer):
    deactivationsAllowed = serializers.IntegerField()
    name = serializers.CharField()
    title = serializers.CharField()


class BlockSerializer(serializers.Serializer):
    type = serializers.CharField()
    contentHTML = serializers.CharField()
    content = serializers.CharField()


class AssetSerializer(serializers.DictField):
    title = serializers.CharField()
    shortDescription = serializers.CharField()
    blocks = BlockSerializer(many=True)
    script = serializers.CharField()
    labels = serializers.ListField(child=serializers.CharField())
    id = serializers.CharField()
    kbMenus = serializers.ListField(child=serializers.CharField())
    assetKB = serializers.CharField()


class MenuNodeSerializer(serializers.Serializer):
    subtitle = serializers.CharField()
    url = serializers.CharField()
    asset_id = serializers.IntegerField()
    asset = AssetSerializer(required=False)
    accepted = serializers.BooleanField()
    pending = serializers.BooleanField()
    draft = serializers.BooleanField()
    asset_type = serializers.IntegerField()
    related_asset_ids = serializers.ListField(child=serializers.IntegerField())
    next_item = serializers.BooleanField()
    new_window = serializers.BooleanField()
    icon = serializers.CharField()
    authentication = serializers.CharField()
    order = serializers.IntegerField()
    name = serializers.CharField()
    name_raw = serializers.CharField()
    display_name = serializers.CharField()
    nodes = RecursiveField(many=True)


class MenusSerializer(serializers.ModelSerializer):
    nodes = serializers.ListField(
        default=lambda: [], child=MenuNodeSerializer())
    description = serializers.CharField(source='short_description')

    class Meta:
        model = Menu
        fields = 'type', 'base_url', 'id', 'title', 'description', 'nodes'


class SettingsSerializer(CustomizationCacheSerializer):
    cloudMerge = serializers.BooleanField(required=False)
    showAllBetas = serializers.BooleanField(required=False)
    menus = serializers.DictField(child=MenusSerializer())
    docMenuMap = serializers.DictField()
    licenseTypes = LicenseTypesSerializer(many=True)
    featureFlags = serializers.DictField(child=serializers.BooleanField())
    integrationStoreEnabled = serializers.BooleanField()
    developersEnabled = serializers.BooleanField()
    customClientsEnabled = serializers.BooleanField()

    def extend_settings(self, request):
        from api.views.utils import get_feature_flags
        return {
            'menus': get_cached_menu(settings.CUSTOMIZATION, user=request.user),
            'docMenuMap': cached_doc_menu_map(customization_name=settings.CUSTOMIZATION),
            'licenseTypes': LicenseType.get_license_types(),
            'featureFlags': get_feature_flags(request)
        }

    def __init__(self, *args, **kwargs):
        if data := kwargs.pop('data', False):
            if not (request := kwargs.pop('request', False)):
                raise serializers.ValidationError('kwarg request is missing')

            hidden = 'cloudMerge', 'showAllBetas'
            for setting in hidden:
                if data.get(setting, True) == False:
                    del data[setting]

            kwargs['data'] = {
                **data,
                **self.extend_settings(request)
            }

            if not kwargs['data'].get('integrationStoreEnabled', False) and \
                    UserGroupsToAssetPermissions.user_has_beta_access(request.user):
                kwargs['data']['integrationStoreEnabled'] = True
            if not kwargs['data'].get('developersEnabled', False) and \
                    UserGroupsToAssetPermissions.check_customization_permission(
                        request.user, settings.CUSTOMIZATION, 'cms.access_developers'):
                kwargs['data']['developersEnabled'] = True
            if not kwargs['data'].get('customClientsEnabled', False) and \
                    UserGroupsToAssetPermissions.check_customization_permission(
                        request.user, settings.CUSTOMIZATION, 'api.custom_clients'):
                kwargs['data']['customClientsEnabled'] = True
            if not kwargs['data'].get('trafficRelayHost', False):
                kwargs['data']['trafficRelayHost'] = settings.TRAFFIC_RELAY_HOST

        super().__init__(*args, **kwargs)


def process_camera(processed, raw_data):
    update_handlers = update_num_cameras, update_vendors, update_analytics, update_camera

    for handler in update_handlers:
        handler(processed, raw_data)

    return processed


def update_analytics(processed, raw_data):
    processed['analytics'].update(raw_data.get('analyticsEvents', []))


def update_vendors(processed, raw_data):
    vendors = processed['vendors']
    vendor = raw_data['vendor']
    vendors[vendor] = vendors.get(vendor, 0) + raw_data.get('count', 0)


def update_num_cameras(processed, raw_data):
    vm = raw_data["vendor"].replace(
        " ", "") + raw_data["model"].replace(" ", "")
    processed['num_cameras'].add(vm)

    if raw_data["aliases"]:
        for alias in raw_data["aliases"].split(','):
            alias = alias.strip()
            processed['num_cameras'].add(raw_data["vendor"].replace(
                " ", "") + alias.replace(" ", ""))


def update_camera(processed, raw_data):
    processed['cameras'].append(update_custom_properties(raw_data))


def update_custom_properties(camera):
    update_handlers = process_firmwares, process_custom_properties

    for handler in update_handlers:
        handler(camera)

    return camera


def process_custom_properties(camera):
    camera["isH265"] = camera["primaryCodec"] == 'H.265'

    if camera["hardwareType"] == "Camera" and camera["isMultiSensor"]:
        camera["hardwareType"] = 'Multi-Sensor Camera'
        camera["hardwareTypeId"] = 'multiSensorCamera'
    else:
        camera["hardwareTypeId"] = camera["hardwareType"].lower()

    res = camera["maxResolution"].split('x')
    camera["resolutionArea"] = int(
        res[0]) * int(res[1]) if len(res) == 2 else 0
    vm = camera["vendor"].replace(
        " ", "") + camera["model"].replace(" ", "")
    camera["sortKey"] = vm


def process_firmwares(camera):
    camera["firmwares"] = json.loads(
        camera["firmwares"]) if camera["firmwares"] else {}
    max_firmware_count, total_camera_count, firmwares = process_firmware_counts(
        camera)

    for firmware in firmwares:
        update_firmware_counts(
            max_firmware_count, total_camera_count, firmware)

    firmwares.sort(key=lambda x: x["count"], reverse=True)

    camera.update({'firmwares': firmwares,
                   'maxFirmwareCount': max_firmware_count,
                   'totalCameraCount': total_camera_count})


def update_firmware_counts(max_firmware_count, total_camera_count, firmware):
    percentage = round(
        (firmware["count"] / total_camera_count) * 100)
    percentage = str(percentage) + "%" if percentage else "< 1"
    firmware["percentage"] = percentage
    pow_var = log2(
        200) / log2(max_firmware_count) if max_firmware_count > 200 else 1
    length = round(
        100 * pow(firmware["count"] / max_firmware_count, pow_var))
    length = max(length, 2)
    firmware["barLength"] = length


def process_firmware_counts(camera):
    max_firmware_count = 0
    total_camera_count = 0
    firmwares = []

    for firmware in camera["firmwares"]:
        if re.match('[<>]+', firmware):
            continue

        count = camera["firmwares"][firmware]
        firmwares.append({'count': count, 'name': firmware})
        total_camera_count += count

        if count > max_firmware_count:
            max_firmware_count = count

    return max_firmware_count, total_camera_count, firmwares


def process_cameras(cameras):
    return map_result(functools.reduce(process_camera, [{
        "cameras": [],
        "vendors": {},
        "analytics": set(),
        "num_cameras": set()
    }, *cameras]))


def map_result(result):
    return {
        'cameras': result['cameras'],
        'vendors': [{'name': name, 'count': count} for name, count in result['vendors'].items()],
        'analytics': sorted(list(result['analytics'])),
        'num_cameras': len(result['num_cameras'])
    }


class CountSerializer(serializers.Serializer):
    name = serializers.CharField()
    count = serializers.IntegerField()


class CameraSerializer(serializers.Serializer):
    vendor = serializers.CharField()
    model = serializers.CharField()
    count = serializers.IntegerField()
    primaryCodec = serializers.CharField()
    secondaryCodec = serializers.CharField()
    maxResolution = serializers.CharField()
    sndResolution = serializers.CharField()
    maxFps = serializers.IntegerField()
    isDualStreamingSupported = serializers.BooleanField()
    isIoSupported = serializers.BooleanField()
    isMdSupported = serializers.BooleanField()
    isPtzSupported = serializers.BooleanField()
    isAudioSupported = serializers.BooleanField()
    isTwAudioSupported = serializers.BooleanField()
    isAptzSupported = serializers.BooleanField()
    isMultiSensor = serializers.BooleanField()
    isFisheye = serializers.BooleanField()
    firmwares = CountSerializer(many=True)
    notes = serializers.CharField()
    timestamp = serializers.CharField()
    hardwareType = serializers.CharField()
    aliases = serializers.ListField(child=serializers.CharField())
    analyticsEvents = serializers.ListField(child=serializers.CharField())
    isAnalyticsSupported = serializers.BooleanField()
    maxFirmwarecount = serializers.IntegerField()
    totalCameraCount = serializers.IntegerField()
    isH265 = serializers.BooleanField()
    hardwareTypeId = serializers.CharField()
    resolutionArea = serializers.IntegerField()
    sortKey = serializers.CharField()
    cached = serializers.BooleanField(required=False)


class IpvdSerializer(serializers.Serializer):
    cameras = CameraSerializer(many=True)
    vendors = CountSerializer(many=True)
    num_cameras = serializers.IntegerField()
    analytics = serializers.ListField(child=serializers.CharField())

    def __init__(self, *args, **kwargs):
        if data := kwargs.pop('data', []):
            kwargs['data'] = process_cameras(data)
        super().__init__(*args, **kwargs)

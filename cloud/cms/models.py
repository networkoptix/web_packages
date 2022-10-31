import ast
import hashlib
import json
from json.decoder import JSONDecodeError
import os
import re
import sys
from typing import Any, List
import uuid
from contextlib import suppress
from itertools import chain
from functools import reduce
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta
from distutils.util import strtobool
from django.core.validators import RegexValidator

from django.db.models.aggregates import Count
from util.base_cache import BaseCache

from redis.exceptions import ConnectionError
from django.apps import apps
from django.core.cache import cache, caches
from django.core.exceptions import ObjectDoesNotExist
from django.db import models
from django.db.models import Q, Count
from django.db.models.deletion import Collector
from django.db.models.signals import post_delete, m2m_changed, post_save, pre_delete
from django.db.utils import ProgrammingError, OperationalError
from django.dispatch import receiver
from django.utils.functional import cached_property
from django.conf import settings
from django.core.exceptions import ValidationError, FieldError
from django.urls import reverse
from jsonfield import JSONField
from model_utils import Choices
from django.core.cache import cache, caches
from model_utils import FieldTracker
from waffle.models import AbstractUserFlag, keyfmt, get_cache
from waffle import flag_is_active, switch_is_active

from .feature_flags import FLAGS, SWITCHES, flag_is_active_for_user

from django.contrib.auth.models import Group, Permission
from django.template.defaultfilters import truncatechars
from cloud.storage_backend import MediaStorage

INITIALIZATION_TASK_TIMEOUT = 60 * 5
INITIALIZATION_TASK_KEY = f'initialize-{settings.CUSTOMIZATION}-menus'

class MenuCache(BaseCache):
    def __init__(self):
        super().__init__(cache_key='menus')

    def __getitem__(self, key):
        return super().__getitem__(key.lower())

    def __setitem__(self, key, menu):
        from cms.controllers.documentation import DOC_CACHE
        DOC_CACHE.clear_cache()
        super().__setitem__(key.lower(), menu)

    def clear_cache(self):
        from cms.controllers.documentation import DOC_CACHE
        from cms.tasks import async_generate_menus
        from notifications.celery import app
        super().clear_cache()
        if not settings.TESTING:
            running_task = cache.get(INITIALIZATION_TASK_KEY)
            if running_task:
                app.control.revoke(running_task, terminate=True, signal='SIGUSR1')
            task = async_generate_menus.apply_async(args=[settings.CUSTOMIZATION, self.cache_key])
            cache.set(INITIALIZATION_TASK_KEY, str(task), INITIALIZATION_TASK_TIMEOUT)
            DOC_CACHE.clear_cache()


READONLY_API_CACHE = BaseCache(cache_key='readonly_apis')
MENU_CACHE = MenuCache()
PORTAL_MANAGER_PERMISSIONS = [
    'access_customization',
    'change_account',
    'change_assetcustomizationreview',
    'change_asset',
    'edit_content',
    'force_update',
    'publish_version'
]
INTEGRATIONS_DEV_PERMISSIONS = [
    'edit_content', 'change_asset', 'change_assetcustomizationreview']

DEFAULT_MANIFEST = """[
            {
                "name": "Current API",
                "sections": [
                    {
                        "name": "REST",
                        "scheme": "openapi_v1.json"
                    },
                    {
                        "name": "LEGACY",
                        "scheme": "openapi_legacy.json"
                    }
                ]
            },
            {
               "name": "Deprecated API",
               "sections": [
                    {
                        "name": "LEGACY",
                        "scheme": "openapi_deprecated.json"
                    }
                ]
            }
        ]"""


def get_name_factory(base_group_name):
    def get_name_handler(asset):
        def generate_name(name=''):
            return f'{base_group_name} - {name} - {asset.id}'

        max_group_name_length = Group._meta.get_field('name').max_length
        max_asset_name_length = max_group_name_length - len(generate_name())
        trimmed_asset_name = asset.name[:max_asset_name_length]

        return generate_name(trimmed_asset_name)

    return get_name_handler


def portal_manager_group_name(asset):
    return get_name_factory('Portal Manager')(asset)


def integration_dev_group_name(asset):
    return get_name_factory('Developer')(asset)


def create_default_permission_group(asset):
    if not (asset.is_cloud_portal or asset.is_integration):
        return None

    if asset.is_cloud_portal:
        group = Group.objects.create(
            name=portal_manager_group_name(asset))
        permissions = Permission.objects.filter(
            codename__in=PORTAL_MANAGER_PERMISSIONS)

        # Bind the Group to the following asset_types so that the portal managers can review them
        asset_types = AssetType.objects.filter(name="",
                                               type__in=[AssetType.ASSET_TYPES.cloud_portal,
                                                         AssetType.ASSET_TYPES.integration])
        for asset_type in asset_types:
            UserGroupsToAssetType.objects.create(
                asset_type=asset_type, group=group)

    else:
        group = Group.objects.create(
            name=integration_dev_group_name(asset))
        permissions = Permission.objects.filter(
            codename__in=INTEGRATIONS_DEV_PERMISSIONS
        )

    group.permissions.set(permissions)
    UserGroupsToAssetPermissions.objects.create(asset=asset, group=group)

    return group


def rename_permission_group(group, asset):
    if asset.is_cloud_portal:
        group.name = portal_manager_group_name(asset)
    else:
        group.name = integration_dev_group_name(asset)
    group.save()


def get_cloud_portal_asset(*, customization=None, request=None, no_create=False):
    from util.helpers import get_customization
    customization = customization or get_customization(request)
    if asset := Asset.objects.filter(customizations__name__in=[customization], asset_type__name="", asset_type__type=AssetType.ASSET_TYPES.cloud_portal).first():
        return asset

    if no_create:
        return None

    if customization_obj := Customization.objects.filter(name=customization).first():
        asset_type = AssetType.objects.get(type=AssetType.ASSET_TYPES.cloud_portal, name='')

        cloud_portal = Asset.objects.create(name=f"Cloud portal - {customization}", asset_type=asset_type)

        cloud_portal.customizations.set([customization_obj])
        return cloud_portal

    raise Asset.DoesNotExist(f"""No cloud portal asset found for {customization}. Most likely a customization with the name \"{customization}\" doesn't exist.""")


def get_vms_asset(*, customization=None, request=None):
    from util.helpers import get_customization
    customization = customization or get_customization(request)
    return Asset.objects.filter(
        customizations__name__in=[customization], asset_type__name="",
        asset_type__type=AssetType.ASSET_TYPES.vms
    ).first()


def get_asset_by_revision(version_id):
    return Asset.objects.get(contentversion__in=[version_id])


def update_global_cache(customization, version_id):
    global_cache = caches['customization']
    global_cache.set(f'global_version_{customization}', version_id)


def check_update_cache(customization, version_id):
    global_cache = caches['customization']
    global_id = global_cache.get(f'global_version_{customization}')

    return version_id != global_id, global_id


def cloud_portal_customization_cache(customization_name, value=None, force=False):
    from cms.controllers.special_structures import SpecialStructures
    customization_cache = caches['customization']
    data = customization_cache.get(
        f'customization_{customization_name}', dict())
    asset = get_cloud_portal_asset(customization=customization_name)

    if data and 'version_id' in data and not force:
        force = check_update_cache(customization_name, data['version_id'])[0]

    if not data or force:
        customization = Customization.objects.get(name=customization_name)
        global_vars = ['%INTEGRATION_STORE_ENABLED%', '%PUSH_CONFIG_WEB%', '%CLOUD_NAME%', '%VMS_NAME%',
                       '%INTEGRATION_SEO_PAGE_DESCRIPTION%']
        email = ['%MAIL_FROM_NAME%', '%MAIL_FROM_EMAIL%', '%SMTP_HOST%', '%SMTP_PORT%', '%SMTP_USER%',
                 '%SMTP_PASSWORD%', '%SMTP_TLS%']
        config = ['%APP_TYPES_FOR_PLATFORM%', '%AVAILABLE_DOWNLOADS_PLATFORM%', '%ALEXA_INTEGRATION_ENABLED%',
                  '%BOOKMARKS_ENABLED%', '%CLOUD_STORAGE_ENABLED%', '%CLOUD_STORAGE_ENABLED%', '%CLOUD_STORAGE_SIZE%',
                  '%COPYRIGHT_YEAR%', '%COMPANY_NAME%', '%COMPANY_LINK%', '%DEVELOPERS_ENABLED%', '%FEEDBACK_ENABLED%',
                  '%INTEGRATION_FILTER_ITEMS%', '%INTEGRATION_SHOW_FILTER_LIMITATION%', '%HM_CACHE_TIMEOUT%',
                  '%PUBLIC_CUSTOM_CLIENTS%', '%PUBLIC_DOWNLOADS%', '%PUBLIC_RELEASE_HISTORY%', '%SHOW_ALL_BETAS%',
                  '%SHOW_ANALYTICS_EVENTS%', '%SORT_SUPPORTED_DEVICES_BY_POPULARITY%', '%SUPPORT_LINK%',
                  '%PRIVACY_LINK%', '%SUPPORTED_RESOLUTIONS%', '%SUPPORTED_HARDWARE_TYPES%', '%SEARCH_TAGS%',
                  '%TESTED_OPERATING_SYSTEMS%', '%VENDORS_SHOWN%', '%GOOGLE_TAG_MANAGER_ID%', '%LOGROCKET_PROJECT%',
                  '%FULLSTORY_ID%', '%TRIAL_LICENSE_KEY%']
        cloud_capabilities = ['%REVIEWS_ENABLED%', '%SMTP_DISABLED%']
        ds_data = asset.read_all_global_values(global_vars + email + config + cloud_capabilities)

        integration_store_enabled = ds_data.get('%INTEGRATION_STORE_ENABLED%')

        public_push_config = ds_data.get('%PUSH_CONFIG_WEB%') or \
            getattr(settings, 'PUSH_NOTIFICATIONS_SETTINGS', {}).get('PUBLIC')

        cloud_name = ds_data.get('%CLOUD_NAME%') or ''
        vms_name = ds_data.get('%VMS_NAME%') or ''
        seo_description = (ds_data.get('%INTEGRATION_SEO_PAGE_DESCRIPTION%') or '')\
            .replace("%CLOUD_NAME%", cloud_name)\
            .replace("%VMS_NAME%", vms_name)
        landing_description = ''
        landing_description_ds = DataStructure.objects.filter(
            context__name='Landing page', name='%SUBTITLE%').first()
        if landing_description_ds:
            landing_description = landing_description_ds.find_actual_value(
                asset)

        data = {
            'version_id': asset.version_id(),
            'languages': customization.languages_list,
            'default_language': customization.default_language.code,
            'email': {
                'mail_from_name': ds_data.get('%MAIL_FROM_NAME%'),
                'mail_from_email': ds_data.get('%MAIL_FROM_EMAIL%'),
                'portal_url': SpecialStructures.calc_cloud_link(asset),
                'smtp_host': ds_data.get('%SMTP_HOST%'),
                'smtp_port': ds_data.get('%SMTP_PORT%'),
                'smtp_user': ds_data.get('%SMTP_USER%'),
                'smtp_password': ds_data.get('%SMTP_PASSWORD%'),
                'smtp_tls': ds_data.get('%SMTP_TLS%')
            },
            'config': {
                'app_types_for_platform': ds_data.get('%APP_TYPES_FOR_PLATFORM%'),
                'available_downloads_platform': ds_data.get('%AVAILABLE_DOWNLOADS_PLATFORM%'),
                'alexa_integration_enabled': ds_data.get("%ALEXA_INTEGRATION_ENABLED%"),
                'bookmarks_enabled': ds_data.get("%BOOKMARKS_ENABLED%"),
                'cloud_storage_enabled': ds_data.get("%CLOUD_STORAGE_ENABLED%"),
                'cloud_storage_size': ds_data.get('%CLOUD_STORAGE_SIZE%'),
                'copyright_year': ds_data.get("%COPYRIGHT_YEAR%"),
                'company_name': ds_data.get("%COMPANY_NAME%"),
                'company_link': ds_data.get("%COMPANY_LINK%"),
                'developers_enabled': ds_data.get("%DEVELOPERS_ENABLED%"),
                'feedback_enabled': ds_data.get("%FEEDBACK_ENABLED%"),
                'integration_filter_items': ds_data.get("%INTEGRATION_FILTER_ITEMS%"),
                'integration_filter_limitation': ds_data.get("%INTEGRATION_SHOW_FILTER_LIMITATION%"),
                'integration_seo_page_description': seo_description,
                'integration_store_enabled': integration_store_enabled,
                'landing_description': landing_description,
                'health_monitor_cache_timeout': ds_data.get('%HM_CACHE_TIMEOUT%'),
                'public_custom_clients': ds_data.get('%PUBLIC_CUSTOM_CLIENTS%'),
                'public_downloads': ds_data.get("%PUBLIC_DOWNLOADS%"),
                'public_releases': ds_data.get("%PUBLIC_RELEASE_HISTORY%"),
                'show_all_betas': ds_data.get("%SHOW_ALL_BETAS%"),
                'show_analytics_events': ds_data.get("%SHOW_ANALYTICS_EVENTS%"),
                'sort_supported_devices_by_popularity': ds_data.get(
                    "%SORT_SUPPORTED_DEVICES_BY_POPULARITY%"),
                'support_link': ds_data.get("%SUPPORT_LINK%"),
                'privacy_link': ds_data.get("%PRIVACY_LINK%"),
                'supported_resolutions': ds_data.get("%SUPPORTED_RESOLUTIONS%"),
                'supported_hardware_types': ds_data.get("%SUPPORTED_HARDWARE_TYPES%"),
                'search_tags': ds_data.get("%SEARCH_TAGS%"),
                'tested_operating_systems': ds_data.get("%TESTED_OPERATING_SYSTEMS%"),
                'vendors_shown': ds_data.get("%VENDORS_SHOWN%"),
                'cloud_name': cloud_name,
                'vms_name': vms_name,
                'push_config': public_push_config,
                'google_tag_manager_id': ds_data.get('%GOOGLE_TAG_MANAGER_ID%'),
                'log_rocket': ds_data.get("%LOGROCKET_PROJECT%"),
                'full_story': ds_data.get("%FULLSTORY_ID%"),
                'trial_license_key': ds_data.get('%TRIAL_LICENSE_KEY%')
            },
            'cloud_capabilities': {
                'integration_store_enabled': integration_store_enabled,
                'reviews_enabled': ds_data.get('%REVIEWS_ENABLED%'),
                'smtp_disabled': ds_data.get("%SMTP_DISABLED%")
            }
        }
        customization_cache.set(f'customization_{customization_name}', data)
        update_global_cache(customization, data['version_id'])

    if value:
        return data.get(value)

    return data


def check_user_menu_permissions(nodes, user, overrides=None, *, customization=None, request=None):
    from util.helpers import get_customization
    customization = customization or get_customization(request)
    for i in reversed(range(len(nodes))):
        node = nodes[i]
        condition = node.pop('condition', None)
        condition_met = node.pop('condition_met', False)
        beta_permission = Customization.BETA_PERMISSION_MAP.get(
            condition, None)
        if feature_flag := (FLAGS.value_to_key(condition) or SWITCHES.value_to_key(condition)):
            if not feature_flag_is_active(feature_flag, user, overrides, customization=customization):
                del nodes[i]
                continue
        elif not condition_met and condition and \
                not (user and beta_permission and UserGroupsToAssetPermissions.check_customization_permission(
                    user, customization, f'cms.{beta_permission}'
                )):
            del nodes[i]
            continue
        permissions = node.get('permissions', [])
        for permission_codename in permissions:
            if not (user and UserGroupsToAssetPermissions.check_customization_permission(
                    user, customization, f'cms.{permission_codename}'
            )):
                del nodes[i]
                break
        else:
            node.pop('permissions', None)
            check_user_menu_permissions(node.get('nodes', []), user, overrides, customization=customization)

def feature_flag_is_active(feature_flag, user, overrides=None, *, customization=None, request=None):
    from util.helpers import get_customization
    customization = customization or get_customization(request)
    flag = getattr(FLAGS, feature_flag, None)
    switch = getattr(SWITCHES, feature_flag, None)
    return flag and flag_is_active_for_user(user, flag, overrides, customization=customization) or switch and switch_is_active(switch)


def cached_doc_menu_map(customization_name, refresh=False):
    cache_key = f'{customization_name}-doc-dir'
    menu_map = MENU_CACHE[cache_key]
    if refresh or not menu_map:
        menu_map = {}
        for menu in Menu.objects.filter(enabled=True, type__in=[Menu.MENU_TYPES.docs_struct, Menu.MENU_TYPES.docs_knowledgebase]):
            if menu.base_url not in menu_map:
                menu_map[menu.base_url] = {}
            if menu.url not in menu_map[menu.base_url]:
                menu_map[menu.base_url][menu.url] = menu.name

        MENU_CACHE[cache_key] = menu_map
    return menu_map


def get_cached_menu(customization_name, name=None, user=None, menu_type=None, request=None):
    overrides = {header: value for header, value in request.META.items() if header.startswith('HTTP_FEATURE_')} if request else {}

    menu_customization = MENU_CACHE[customization_name]

    if menu_customization is None:
        menus_to_generate = [*Menu.REQUIRED_MENUS, name] if name else Menu.REQUIRED_MENUS
        menu_customization = Menu.generate_menus(customization=customization_name, menu_names=menus_to_generate)
        MENU_CACHE[customization_name] = menu_customization

    elif name and not menu_customization.get(name.lower(), False):
        if generated := Menu.generate_menus(customization=customization_name, menu_names=[name]):
            MENU_CACHE[customization_name] = menu_customization = {**menu_customization, **generated}

    for menu_name, menu in menu_customization.items():
        check_user_menu_permissions(menu['nodes'], user, overrides, customization=customization_name, request=request)

    if menu_type:
        menu_customization = {name: menu for name, menu in menu_customization.items(
        ) if menu['type'] == menu_type}
    if name:
        return menu_customization.get(name.lower(), None)

    return menu_customization


def slugify(name, lowercase=False):
    if lowercase:
        name = name.lower()
    unsafe_chars = re.compile(r'[^a-z0-9-]', flags=re.IGNORECASE)
    return unsafe_chars.sub('-', name)


def rename_file(instance, filename):
    if instance.admin_upload:
        return os.path.join('admin-upload', filename)
    asset_ds_pair = instance.asset_ds_pair.first() if hasattr(
        instance, 'asset_ds_pair') else instance
    asset_name = slugify(asset_ds_pair.asset.name, True)
    structure_name = slugify(asset_ds_pair.data_structure.name, True)
    file_info = f"{structure_name}-{instance.id}"
    return os.path.join(asset_name, file_info, filename)


def get_integration_type():
    # Prevents issue when migrating from empty db
    try:
        integration = AssetType.objects.only('id', 'type').filter(
            type=AssetType.ASSET_TYPES.integration).first()
        if integration:
            return integration.id
    except ProgrammingError:
        pass
    return None


class PackagesCache(object):
    def __init__(self):
        self.cache = caches['packages']

    def __delitem__(self, file_name):
        self.cache.delete(file_name)

    def __getitem__(self, file_name):
        return self.cache.get(file_name, None)

    def __setitem__(self, file_name, package_file):
        self.cache.set(file_name, package_file)

    def clear_cache(self):
        self.cache.clear()

    def get(self, file_name):
        return self.cache.get(file_name, None)


# CMS structure (data structure). Only developers can change that
class Language(models.Model):
    name = models.CharField(max_length=255, unique=True)
    code = models.CharField(max_length=8, unique=True)

    def __str__(self):
        return self.code

    @staticmethod
    def by_code(language_code, default_language=None):
        if language_code:
            language = Language.objects.filter(code=language_code).first()
            return language or default_language
        return default_language


class Customization(models.Model):
    BETA_PERMISSION_MAP = {
        '%INTEGRATION_STORE_ENABLED%': 'access_integration_store',
        '%DEVELOPERS_ENABLED%': 'access_developers'
    }

    class Meta:
        # Used to allow a user to see the customization in list of customizations
        # Cloud portal(s) are now a asset so customization is not necessary for giving access anymore
        permissions = (
            ('access_customization', 'Can access customization'),
            ('access_integration_store', 'Can access the integration store'),
            ('access_developers', 'Can see Developers pages'),
            ('view_integration_drafts', 'Can view all integration drafts')
        )
        ordering = ['name']
    name = models.CharField(max_length=255, unique=True)
    enabled = models.BooleanField(default=True)
    default_language = models.ForeignKey(
        Language, related_name='default_in_%(class)s', on_delete=models.CASCADE)
    languages = models.ManyToManyField(Language)
    filter_horizontal = ('languages',)
    host = models.CharField(blank=True, max_length=255)
    parent = models.ForeignKey('Customization', default=None, null=True, blank=True,
                               related_name='children_customizations',
                               help_text="""Parent is the customization that the current customization depends on.<br>
                               The main purpose is to control how the integration review process works.
                               <br><br>
                               If there is a parent:<br>
                               - A review will be locked until the parent accepts that review.<br>
                               - If the parent rejects a review it will automatically be rejected for this
                               customization.<br><br>
                               If there is no parent selected or the parent is not in the review an integration
                               can be reviewed whenever.""",
                               on_delete=models.SET_DEFAULT)
    trust_parent = models.BooleanField(default=False, help_text="""Automatically accepts integrations the parent
                                                                   customization accepts.""")

    def __str__(self):
        return self.name

    @property
    def languages_list(self):
        return self.languages.values_list('code', flat=True)

    def get_children_ids(self, customization):
        children_list = []
        for child in customization.children_customizations.all():
            children_list.append(child.id)
            if child.children_customizations.exists():
                children_list.extend(self.get_children_ids(child))
        return children_list

    def save(self, *args, **kwargs):
        create_cloud_portal_asset = self.pk is None
        super(Customization, self).save(*args, **kwargs)
        if create_cloud_portal_asset:
            # Default cloud portal asset type
            asset_type, _ = AssetType.objects.get_or_create(name="", single_customization=True,
                                                            type=AssetType.ASSET_TYPES.cloud_portal)
            cloud_portal = Asset.objects.create(name=f"Cloud Portal",
                                                asset_type=asset_type)
            cloud_portal.customizations.set([self])
            # Automatically add new customization to all assets and menu_nodes that have all other customizations enabled
            all_customizations_count = Customization.objects.all().count() - 1
            if all_customizations_count > 0:
                assets_with_all_enabled = Asset.objects.annotate(num_customizations=Count('customizations')).filter(
                    num_customizations=all_customizations_count, asset_type__single_customization=False
                )
                menu_nodes_with_all_enabled = MenuNode.objects.annotate(num_customizations=Count(
                    'enabled')).filter(num_customizations=all_customizations_count)
                new_customization = self
                for asset in assets_with_all_enabled:
                    asset.customizations.add(new_customization)
                for menu_node in menu_nodes_with_all_enabled:
                    menu_node.enabled.add(new_customization)


class AssetType(models.Model):
    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["name", "type"], name="Unique Asset Type")
        ]
    ASSET_TYPES = Choices((0, "cloud_portal", "Cloud Portal"),
                          (1, "vms", "Vms"),
                          (2, "integration", "Integration"),
                          (3, "other", "Other"),
                          (4, "article", "Article"),
                          (5, "agreement", "Agreement"),
                          (6, "documentation", "Documentation Page"),
                          (7, 'release_notes', "Release Notes"),
                          (8, 'vms_extension', 'VMS Extension'))
    name = models.CharField(max_length=255, default="", blank=True)
    can_preview = models.BooleanField(default=False)
    single_customization = models.BooleanField(default=False)
    type = models.IntegerField(
        choices=ASSET_TYPES, default=ASSET_TYPES.cloud_portal)
    advanced = models.BooleanField(default=True)
    custom_field_overrides = JSONField(blank=True, default={})

    def __str__(self):
        if self.name:
            return f"{self.name} - {AssetType.ASSET_TYPES[self.type]}"
        return AssetType.ASSET_TYPES[self.type]

    @classmethod
    def get_model_by_type(cls, asset_type):
        return cls.objects.get(name='', type=asset_type)

    @staticmethod
    def get_type_by_name(name):
        if name == "":
            return AssetType.ASSET_TYPES.cloud_portal
        if name[0].islower():
            return getattr(AssetType.ASSET_TYPES, name, AssetType.ASSET_TYPES.cloud_portal)

        return next((index for index, _name in AssetType.ASSET_TYPES if _name == name), 0)

    @staticmethod
    def get_cache_key(asset_type):
        return f'ASSET_TYPE-{asset_type}-CUSTOM_FIELDS-{settings.VERSION}'

    @classmethod
    def get_custom_fields_by_type(cls, type):
        manage_py = any('manage.py' in arg for arg in sys.argv)
        run_server = 'runserver' in sys.argv
        running_manage_command = manage_py and not run_server

        if settings.MIGRATING or running_manage_command:
            # Short circuit when migrating or a manage.py command that isn't running a dev server
            # Several manage.py commands run when an instance is deployed
            # These could potentially call this method which would update the cache with stale data
            return {}

        try:
            cache_key = AssetType.get_cache_key(type)
            fields = cache.get(cache_key)
            if fields is None:
                asset_type = cls.get_model_by_type(type)
                fields = (asset_type.custom_field_overrides or dict()).get(
                    'fields', {})
                cache.set(cache_key, fields)
            return fields
        except (ConnectionError, OperationalError, ProgrammingError):
            return {}

    def get_customizations(self, asset):
        return self.asset_set.exclude(id=asset.id).exclude(customizations=None).\
            values_list('customizations__name', flat=True)

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        cache.delete(AssetType.get_cache_key(self.type))


class AssetManager(models.Manager):
    def create(self, *args, **kwargs):
        """Auto generated asset names could be longer than 255 characters. Problem usually only encountered in when assets get indirectly created using baker.make, the asset name field should at some point be changed to a TextField instead of CharField.

        Returns:
            Asset: Created Asset
        """
        NAME = 'name'
        max_length = getattr(Asset._meta.get_field(NAME), 'max_length', 255)
        kwargs[NAME] = kwargs.get(NAME, '')[:max_length]
        return super().create(*args, **kwargs)


class Asset(models.Model):
    class Meta:
        permissions = (
            ("can_download_package", "Can Download Asset Package"),
        )
    name = models.CharField(max_length=255)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True,
        blank=True, related_name='created_%(class)s', on_delete=models.CASCADE)
    customizations = models.ManyToManyField(
        Customization, default=None, blank=True)
    asset_type = models.ForeignKey(
        AssetType, default=get_integration_type, null=True, on_delete=models.CASCADE)

    PREVIEW_STATUS = Choices((0, 'draft', 'draft'), (1, 'review', 'review'))
    preview_status = models.IntegerField(
        choices=PREVIEW_STATUS, default=PREVIEW_STATUS.draft)
    primary_group = models.OneToOneField(
        Group, unique=True, on_delete=models.SET_NULL, null=True, blank=True)
    protected = models.BooleanField(default=False)
    uuid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)

    objects = AssetManager()

    def __str__(self):
        if self.asset_type and self.is_cloud_portal:
            return f"{self.name} - {self.asset_type} - {self.customizations.first()}"
        return self.name

    @property
    def can_preview_on_portal(self):
        return self.asset_type.can_preview and \
            self.customizations.filter(name=settings.CUSTOMIZATION).exists()

    @property
    def default_language(self):
        if len(self.customizations.all()) == 1:
            return self.customizations.first().default_language

        return Customization.objects.get(name=settings.CUSTOMIZATION).default_language

    @property
    def languages_list(self):
        if self.customizations.exists():
            lang_list = []
            for customization in self.customizations.all():
                lang_list.extend(customization.languages_list)
            return list(set(lang_list))
        return Customization.objects.get(name=settings.CUSTOMIZATION).languages_list

    @property
    def languages(self):
        customizations = self.customizations.all()
        if customizations:
            return Language.objects.filter(customization__in=customizations)
        else:
            return Customization.objects.get(name=settings.CUSTOMIZATION).languages.all()

    @property
    def asset_root(self):
        if self.asset_type and self.is_cloud_portal:
            return self.customizations.first().name
        return ""

    @property
    def is_agreement(self):
        return self.is_asset_type(AssetType.ASSET_TYPES.agreement)

    @property
    def is_article(self):
        return self.is_asset_type(AssetType.ASSET_TYPES.article)

    @property
    def is_documentation(self):
        return self.is_asset_type(AssetType.ASSET_TYPES.documentation)

    @property
    def is_cloud_portal(self):
        return self.is_asset_type(AssetType.ASSET_TYPES.cloud_portal)

    @property
    def is_integration(self):
        return self.is_asset_type(AssetType.ASSET_TYPES.integration)

    @property
    def is_vms(self):
        return self.is_asset_type(AssetType.ASSET_TYPES.vms)

    @property
    def is_release_notes(self):
        return self.is_asset_type(AssetType.ASSET_TYPES.release_notes)

    @property
    def is_single_customization(self):
        return self.asset_type.single_customization

    def urlify(self, name=None):
        if name is None:
            name = self.name
        name = re.sub(r'[^a-zA-Z0-9- ]+', '', name)
        name = name.lower().replace(' ', '-')
        return f'{self.id}-{name}'

    @property
    def is_dirty(self):
        version_id = self.contentversion_set.last(
        ).id if self.contentversion_set.exists() else 0
        records_for_version = self.datarecord_set.filter(
            version__id=version_id)
        if not records_for_version.exists():
            return self.datarecord_set.exists()
        most_recent_record = records_for_version.latest('created_date')
        return self.datarecord_set.filter(created_date__gt=most_recent_record.created_date).exists()

    @property
    def last_modified(self):
        current_version = self.version_id()
        if not current_version:
            return ''
        return ContentVersion.objects.get(id=current_version).accepted_date.strftime('%m/%d/%Y')

    @property
    def can_submit_for_review(self):
        return self.customizations.exists()

    @property
    def admin_link(self):
        kwargs = {'asset_id': self.id}

        if context := getattr(
            self.datarecord_set.first(), 'context', None) or Context.objects.filter(
                asset_type=self.asset_type.type).first():

            kwargs['context_id'] = context.id

            # Should use change page on pretty much all cases
            return reverse('admin:change_page', kwargs=kwargs)

        # This will handle a weird edge case where no context is found
        return reverse('admin:pages', kwargs=kwargs)

    def is_asset_type(self, asset_type):
        return self.asset_type.type == asset_type

    def version_id(self, customization=settings.CUSTOMIZATION):
        if self.asset_type and self.asset_type.single_customization:
            actual_customization = self.customizations.first()
            if actual_customization:
                customization = actual_customization.name

        accepted_review = AssetCustomizationReview.objects. \
            filter(customization__name=customization,
                   state=AssetCustomizationReview.REVIEW_STATES.accepted,
                   version__asset=self).last()

        return accepted_review.version.id if accepted_review else 0

    @classmethod
    def version_ids(cls, assets, customization=None, request=None):
        from util.helpers import get_customization
        customization = customization or get_customization(request)
        asset_ids = {asset.id for asset in assets}
        version_dict = {}
        accepted_reviews = AssetCustomizationReview.objects.filter(
            customization__name=customization, state=AssetCustomizationReview.REVIEW_STATES.accepted,
            version__asset__in=assets
        ).order_by('-version_id').select_related('version').only('version')

        for review in accepted_reviews:
            if review.version.asset_id not in version_dict:
                version_dict[review.version.asset_id] = review.version_id
                asset_ids.discard(review.version.asset_id)
                if not asset_ids:
                    break
        else:
            for asset_id in asset_ids:
                version_dict[asset_id] = 0
        return version_dict

    def change_preview_status(self, new_status):
        self.preview_status = new_status
        self.save()

    def read_global_value(self, record_name, language=None):
        global_contexts = self.asset_type.context_set.filter(is_global=True)
        data_structure = DataStructure.objects.filter(
            name=record_name, context__in=global_contexts).last()
        customization = None

        if self.asset_type.single_customization and self.customizations.exists():
            customization = self.customizations.first().name

        if not data_structure:
            return None
        return data_structure.find_actual_value(asset=self, language=language,
                                                version_id=self.version_id(),
                                                customization_name=customization)

    def read_all_global_values(self, record_names, language=None):
        customization = None
        if self.asset_type.single_customization and self.customizations.exists():
            customization = self.customizations.first().name
        data_structures = DataStructure.objects.filter(
                name__in=record_names, context__in=self.asset_type.context_set.filter(is_global=True))
        data = DataStructure.find_actual_values(
            data_structures, asset=self, customization_name=customization, version_id=self.version_id(),
            language=language)
        return {ds.name: value for ds, value in data.items()}

    def replace_global_values(self, content: str, global_contexts_dict=None):
        if not global_contexts_dict:
            from cms.controllers.filldata import global_contexts_to_dict
            global_contexts = Context.objects.filter(
                asset_type=self.asset_type, is_global=True)
            global_contexts_dict = global_contexts_to_dict(
                global_contexts, self)
        for tag in global_contexts_dict:
            if tag in content:
                content = content.replace(tag, global_contexts_dict[tag])
        return content

    def clean(self):
        if not self.is_cloud_portal and \
                Asset.objects.filter(name=self.name, asset_type=self.asset_type).exclude(pk=self.pk).exists():
            raise ValidationError({'name': 'Name already exists'})

    def save(self, *args, **kwargs):
        create_group = False
        update_group = False
        rename_group = False
        need_update = False
        orig = None
        if self.pk is None:
            create_group = True
            need_update = True
        else:
            orig = Asset.objects.get(pk=self.pk)
            if self.customizations.exists():
                need_update = self.preview_status == orig.preview_status
            if orig.created_by != self.created_by:
                update_group = True
            if orig.name != self.name:
                rename_group = True

        super(Asset, self).save(*args, **kwargs)
        if need_update and self.is_cloud_portal and len(self.customizations.all()) == 1 and self.can_preview_on_portal:
            cloud_portal_customization_cache(
                self.customizations.first().name, force=True)  # invalidate cache
            # TODO: need to update all static right here
        if create_group or update_group:
            if create_group:
                group = create_default_permission_group(orig or self)
                self.primary_group = group
                self.save()
                if self.is_cloud_portal:
                    MenuNode.enable_global(self)
            if self.primary_group and self.created_by:
                self.primary_group.user_set.add(self.created_by)
                self.created_by.is_staff = True
                self.created_by.save()
        if self.primary_group and rename_group:
            rename_permission_group(self.primary_group, self)

    def delete(self, *args, **kwargs):
        if self.protected:
            raise FieldError('Cannot delete a protected asset')
        else:
            return super().delete(*args, **kwargs)


@receiver(m2m_changed, sender=Asset.customizations.through)
def update_asset_customization_reviews(sender, instance, action, pk_set, **kwargs):
    if action in ["post_add", "post_remove"]:
        for asset_customization_review in AssetCustomizationReview.objects.\
                filter(version__asset=instance, customization_id__in=pk_set):
            asset_customization_review.update_children_reviews()

    if action == 'post_add':
        customizations = Customization.objects.filter(pk__in=pk_set)
        for customization in customizations:
            version = ContentVersion.objects.filter(
                asset=instance).order_by('-id').first()
            if version:
                ContentVersion.create_missing_reviews(
                    instance, version, customization)


class Context(models.Model):
    class Meta:
        permissions = (
            ("edit_content", "Can edit content and send for review"),
        )
        ordering = ['order', 'id']
    asset_type = models.ForeignKey(
        AssetType, null=True, on_delete=models.CASCADE)
    name = models.CharField(max_length=1024)
    label = models.CharField(max_length=1024, default="", blank=True)
    description = models.TextField(blank=True, default="")
    translatable = models.BooleanField(default=True)
    is_global = models.BooleanField(default=False)
    hidden = models.BooleanField(default=False)
    order = models.IntegerField(default=100000)
    deprecated = models.BooleanField(default=False)

    file_path = models.CharField(max_length=1024, blank=True, default='')
    url = models.CharField(max_length=1024, blank=True, default='')

    def __str__(self):
        if self.asset_type:
            return f"{self.asset_type} - {self.name}"
        return self.name

    def get_nice_name(self):
        return self.label if self.label else self.name

    def template_for_language(self, language, default_language, skin):

        priorities = ((language, skin),  # exact match
                      # skin is more important, fallback to default language
                      (default_language, skin),
                      # skin is more important, fallback to empty language
                      (None, skin),
                      (language, ''),  # give up skin - find by lang only
                      (default_language, ''),  # fallback to default_language
                      (None, ''))  # default of default - no skin, no language

        # instantiate generator for contexts based on priorities
        contexts = (self.contexttemplate_set.filter(
            language=item[0], skin=item[1]) for item in priorities)

        # retrieve first available template from the list or return None
        return next((context_template.first().template for context_template in contexts if context_template.exists()),
                    None)

    def get_state(self, asset, *, customization=None, request=None):
        from util.helpers import get_customization
        # (State, order) In order of importance. Only update a state if the new state is more important
        INCOMPLETE = ('Incomplete', 0)
        DRAFT = ('Draft', 1)
        IN_REVIEW = ('In review', 2)
        REJECTED = ('Rejected', 3)
        PUBLISHED = ('Published', 4)
        customization = customization or get_customization(request)

        if asset.asset_type.single_customization and asset.customizations.exists():
            customization = asset.customizations.first().name
        reviews = AssetCustomizationReview.objects.filter(version__asset=asset,
                                                          customization__name=customization)
        # Starting point so we don't get incorrect status with unpublished assets
        if reviews.filter(state=AssetCustomizationReview.REVIEW_STATES.accepted).first():
            state = PUBLISHED
        elif reviews.filter(state__in=[AssetCustomizationReview.REVIEW_STATES.pending,
                                       AssetCustomizationReview.REVIEW_STATES.blocked]).first():
            state = IN_REVIEW
        elif reviews.filter(state=AssetCustomizationReview.REVIEW_STATES.rejected).first():
            state = REJECTED
        else:
            state = DRAFT

        for datastructure in self.datastructure_set.all():
            records = datastructure.datarecord_set.filter(asset=asset)
            last_record = records.last()
            last_record_value = last_record.cast_value if last_record else None
            datastructure.default = DataStructure.cast_value(
                datastructure, datastructure.default)

            if type(datastructure.default) in [int, bool]:
                datastructure.default = str(datastructure.default)
            if type(last_record_value) in [int, bool]:
                last_record_value = str(last_record_value)

            if not datastructure.optional and not datastructure.default and \
                    (not records.exists() or not last_record_value):
                return INCOMPLETE[0]

            if last_record:
                if last_record.version:
                    if state[1] > IN_REVIEW[1]:
                        review = last_record.version.assetcustomizationreview_set.filter(
                            customization__name=settings.CUSTOMIZATION).first()
                        if review:
                            if review.state in [AssetCustomizationReview.REVIEW_STATES.pending,
                                                AssetCustomizationReview.REVIEW_STATES.blocked]:
                                state = IN_REVIEW
                            elif review.state == AssetCustomizationReview.REVIEW_STATES.rejected and \
                                    state[1] > REJECTED[1]:
                                state = REJECTED
                elif state[1] > DRAFT[1]:
                    state = DRAFT

        return state[0]


class ContextTemplate(models.Model):
    class Meta:
        unique_together = ('context', 'language', 'skin')

    context = models.ForeignKey(Context, on_delete=models.CASCADE)
    language = models.ForeignKey(
        Language, blank=True, null=True, on_delete=models.CASCADE)
    template = models.TextField()
    skin = models.CharField(max_length=16, default='', blank=True)
    # Skin is a bit hacky for now:
    # Skin cannot be mentioned in filename
    # Skin is supported only for file contexts

    def __str__(self):
        if not self.language:
            return self.context.name
        skin = f"{self.skin}/" if self.skin else ""
        if self.context.file_path:
            return skin + self.context.file_path.replace("{{language}}", self.language.code)
        return f"{self.context.name}-{skin}{self.language.name}"


class DataStructure(models.Model):
    """
    META SETTINGS
    meta_settings are additional options, usually for validation

    background: Image background class in CMS (Ex: white, black, light, dark, transparent)
    brand_vars: Show brand variables button in context edit form (true or false)
    char_limit: Character limit
    format: File format (ex: png)
    height: Image height
    height_ge: Image height, greater than or eqal to
    height_le: Image height, less than or equal to
    options: choices for selects, multiselects, checkboxes
    regex: Regular expression for a text field
    size: File size limit in MB

    # Represent properties in tiny.init method, "tiny_forced_root_block" sets property "forced_root_block"
    tiny_paste_word_valid_elements": Comma-separated list of tags that can be pasted from external word processors ("br,p,h1,h2")
    tiny_paste_retain_style_properties": CSS styles that can be interpreted from word processors ("font-weight,text-decoration")
    tiny_forced_root_block: Default tag to wrap text nodes or non block elements (ex: "p", "div", false)

    width: Image width
    width_ge: Image width, greater than or equal to
    width_le: Image width, less than or equal to

    """

    class Meta:
        permissions = (
            ("edit_advanced", "Can edit advanced DataStructures"),
        )
        index_together = [
            ["context", "order"],
        ]
        ordering = ['order', 'id']
    context = models.ForeignKey(Context, on_delete=models.CASCADE)
    name = models.CharField(max_length=1024)
    description = models.TextField(blank=True)
    label = models.CharField(max_length=1024, blank=True, default='')

    DATA_TYPES = Choices((0, 'text', 'Text'),
                         (1, 'image', 'Image'),
                         (2, 'html', 'HTML'),
                         (3, 'long_text', 'Long Text'),
                         (4, 'file', 'File'),
                         (5, 'guid', 'GUID'),
                         (6, 'select', 'Select'),
                         (7, 'external_file', 'External File'),
                         (8, 'external_image', 'External Image'),
                         (9, 'check_box', 'Check Box'),
                         (10, 'object', 'Object'),
                         (11, 'array', 'Array'),
                         (12, 'multiselect', 'Multiselect'),
                         (13, 'integer', 'Integer'),
                         (14, 'foreign_key', 'Foreign Key'))

    type = models.IntegerField(choices=DATA_TYPES, default=DATA_TYPES.text)
    default = models.TextField(default='', blank=True)
    placeholder = models.TextField(default="", blank=True)
    translatable = models.BooleanField(default=True)
    meta_settings = JSONField(default=dict(),
                              blank=True,
                              help_text="For the regex field \\ needs to be escaped with another '\\'")
    advanced = models.BooleanField(default=False)
    order = models.IntegerField(default=100000)
    optional = models.BooleanField(default=False)
    unique = models.BooleanField(default=False)
    public = models.BooleanField(default=True)
    deprecated = models.BooleanField(default=False)
    protected = models.BooleanField(default=False)
    fieldset = models.CharField(blank=True, max_length=255)

    def __str__(self):
        return self.name

    def find_actual_value(self, asset=None, language=None, version_id=None, draft=False, customization_name=None):
        content_value = ""
        if not asset:
            return DataStructure.cast_value(self, self.default)
        content_record = DataRecord.objects.filter(
            asset=asset, data_structure=self)
        if not draft:
            if not asset.is_single_customization and customization_name:
                content_record = content_record.filter(
                    version__assetcustomizationreview__customization__name=customization_name,
                    version__assetcustomizationreview__state__in=[
                        AssetCustomizationReview.REVIEW_STATES.pending,
                        AssetCustomizationReview.REVIEW_STATES.accepted,
                        AssetCustomizationReview.REVIEW_STATES.blocked
                    ])
            else:
                content_record = content_record.\
                    exclude(
                        version__assetcustomizationreview__state=AssetCustomizationReview.REVIEW_STATES.rejected)
            content_record = content_record.order_by('version_id')

        # try to get translated content
        if self.translatable:
            default_lang = Customization.objects.get(
                name=settings.CUSTOMIZATION).default_language
            content_record_language = content_record.filter(language=language)
            content_record_default = content_record.filter(
                language=default_lang)
            content_record_english = content_record.filter(
                language__code='en_US')

            if language and content_record_language.exists():
                content_record = content_record_language
            elif language != default_lang and content_record_default.exists():
                content_record = content_record_default
            else:
                content_record = content_record_english

        if content_record.exists():
            if not version_id and draft:
                content_value = content_record.last().cast_value
            else:  # Here find a datarecord with version_id
                # which is not more than version_id
                # filter only accepted content_records
                if version_id:
                    content_record = content_record.filter(
                        version_id__lte=version_id)
                if not draft:
                    if not asset.is_single_customization and customization_name:
                        new_review_records = content_record.filter(
                            version__assetcustomizationreview__customization__name=customization_name,
                            version__assetcustomizationreview__state=AssetCustomizationReview.REVIEW_STATES.accepted
                        )
                    else:
                        new_review_records = content_record.filter(
                            version__assetcustomizationreview__state=AssetCustomizationReview.REVIEW_STATES.accepted
                        )
                    # If the version matches take it
                    version_content_record = None
                    if version_id:
                        version_content_record = content_record.filter(
                            version_id=version_id).last()
                    if version_content_record:
                        content_record = version_content_record
                    # Take any record that is accepted
                    elif new_review_records.exists():
                        content_record = new_review_records.last()
                    # No record should be used if non are accepted
                    else:
                        content_record = None
                else:
                    content_record = content_record.last()

                if content_record:
                    content_value = content_record.cast_value

        # if no value or optional and type file - use default value from structure
        if content_value == "" and (not self.optional or
                                    self.optional and self.type in [DataStructure.DATA_TYPES.file,
                                                                    DataStructure.DATA_TYPES.image,
                                                                    DataStructure.DATA_TYPES.external_file,
                                                                    DataStructure.DATA_TYPES.external_image,
                                                                    DataStructure.DATA_TYPES.check_box,
                                                                    DataStructure.DATA_TYPES.multiselect,
                                                                    DataStructure.DATA_TYPES.object]):
            content_value = DataStructure.cast_value(self, self.default)

        return content_value

    def validate_value(self, value: Any) -> List[str]:
        """Validates that a value is valid for the current data structure.

        TODO: Might need to add validation here for file meta_settings depending on how we handle uploads

        Args:
            value (Any): Accepts either the datarecord string or already casted value

        Returns:
            List[str]: List of validation errors
        """
        errors = []
        val_string = str(value)

        try:
            casted_value = DataStructure.cast_value(self, val_string)
        except JSONDecodeError:
            errors.append('Invalid JSON')
        else:
            if not self.optional and not casted_value:
                errors.append('This field is required.')

            if len(val_string) > (char_limit := self.meta_settings.get('char_limit', sys.maxsize)):
                errors.append(
                    f'Value is over the {char_limit} character limit')

            if val_string and (regex := self.meta_settings.get('regex', None)) and not re.compile(
                regex
            ).match(val_string):
                errors.append(
                    f"'{val_string}' is an invalid value. Should match regex pattern: {regex}")

            return errors

    @classmethod
    def find_actual_values(cls, data_structures, asset=None, language=None, version_id=None, draft=False,
                           customization_name=None, as_records=False, only_review=False):
        def fish(data_structures_needed: set, **kwargs):
            remaining = data_structures_needed.copy()
            while remaining:
                fished_records_qs = records.filter(
                    data_structure__in=remaining, **kwargs
                ).select_related('data_structure').order_by('-pk')[:len(data_structures_needed) * 3]
                if not fished_records_qs.count():
                    return remaining
                for record in fished_records_qs:
                    if record.data_structure in remaining:
                        fished_records[record.data_structure] = record
                        remaining.discard(record.data_structure)
                        if not remaining:
                            return remaining
            return remaining

        records = DataRecord.objects.filter(asset=asset)
        if version_id:
            records = records.filter(version_id__lte=version_id)
            if customization_name:
                records = records.filter(
                    version__assetcustomizationreview__customization__name=customization_name)

        if not (draft or only_review):
            records = records.filter(
                version__assetcustomizationreview__state=AssetCustomizationReview.REVIEW_STATES.accepted
            ).order_by('-version_id')
        elif version_id:
            records = records.order_by('-version_id')
        elif only_review:
            records = records.filter(
                version__assetcustomizationreview__state__in=[
                    AssetCustomizationReview.REVIEW_STATES.pending,
                    AssetCustomizationReview.REVIEW_STATES.rejected,
                    AssetCustomizationReview.REVIEW_STATES.blocked
                ]).order_by('-version_id')

        data_structure_set = set(data_structures)
        translatable_ds_set = {ds for ds in data_structures if ds.translatable}
        nontranslatable_ds_set = data_structure_set - translatable_ds_set
        default_lang = Customization.objects.get(
            name=settings.CUSTOMIZATION).default_language
        fished_records = {}

        # Get translatable records
        if language:
            translatable_ds_set = fish(translatable_ds_set, language=language)
        if translatable_ds_set and language != default_lang:
            translatable_ds_set = fish(
                translatable_ds_set, language=default_lang)
        if translatable_ds_set:
            fish(translatable_ds_set, language__code='en_US')

        # Get nontranslatable records
        fish(nontranslatable_ds_set)

        final_values = {}

        for ds in data_structure_set:
            if ds not in fished_records:
                if as_records:
                    final_values[ds] = None
                else:
                    final_values[ds] = ''
            elif as_records:
                final_values[ds] = fished_records[ds]
            else:
                final_values[ds] = fished_records[ds].cast_value

            if final_values[ds] == '' and (not ds.optional or
                                           ds.optional and ds.type in [DataStructure.DATA_TYPES.file,
                                                                       DataStructure.DATA_TYPES.image,
                                                                       DataStructure.DATA_TYPES.external_file,
                                                                       DataStructure.DATA_TYPES.external_image,
                                                                       DataStructure.DATA_TYPES.check_box,
                                                                       DataStructure.DATA_TYPES.multiselect,
                                                                       DataStructure.DATA_TYPES.object]):
                final_values[ds] = DataStructure.cast_value(ds, ds.default)
        return final_values

    def is_protected(self, asset):
        return self.protected and asset.version_id() > 0

    @staticmethod
    def cast_value(data_structure, value):
        if data_structure.type == DataStructure.DATA_TYPES.check_box:
            return bool(strtobool(value)) if value else False

        elif data_structure.type == DataStructure.DATA_TYPES.integer:
            return int(value) if value else 0

        elif data_structure.type == DataStructure.DATA_TYPES.foreign_key:
            try:
                foreign_id = int(value)
            except ValueError:
                return None

            foreign_model, filters = data_structure.get_foreign_key_config()
            return foreign_model.objects.filter(pk=foreign_id, **filters).first()

        elif data_structure.type in [DataStructure.DATA_TYPES.object, DataStructure.DATA_TYPES.array,
                                     DataStructure.DATA_TYPES.multiselect]:
            if not value:
                value = {} if data_structure.type in [
                    DataStructure.DATA_TYPES.object] else []
            # Only parse as json if str
            elif type(value) is str:
                value = json.loads(value)

            if data_structure.type == DataStructure.DATA_TYPES.multiselect:
                for choice in data_structure.meta_settings['options']:
                    if type(choice) == dict:
                        for i in range(len(value)):
                            if value[i] == choice['label']:
                                value[i] = choice
                                break

        return value

    @staticmethod
    def to_string(data_structure, value):
        if isinstance(value, str):
            return value

        if data_structure.type in [DataStructure.DATA_TYPES.array, DataStructure.DATA_TYPES.multiselect,
                                   DataStructure.DATA_TYPES.object]:
            value = json.dumps(value)
        elif data_structure.type == DataStructure.DATA_TYPES.foreign_key:
            value = str(value.pk) if value is not None else ''
        else:
            value = str(value)

        return value

    def get_foreign_key_config(self):
        foreign_key_options = self.meta_settings.get('foreign_key_config', {})
        app_name = foreign_key_options.get('app')
        model_name = foreign_key_options.get('model')
        filters = self.meta_settings['foreign_key_config'].get('filters', {})
        foreign_model = apps.get_model(app_name, model_name)
        return foreign_model, filters

    @staticmethod
    def get_type_by_name(name):
        if name[0].islower():
            return getattr(DataStructure.DATA_TYPES, name, DataStructure.DATA_TYPES.text)

        for index, _name in DataStructure.DATA_TYPES:
            if _name == name:
                return index
        return 0

    @staticmethod
    def is_file_or_image(data_type):
        if type(data_type) is not int:
            data_type = DataStructure.get_type_by_name(data_type)
        return data_type in [DataStructure.DATA_TYPES.image, DataStructure.DATA_TYPES.file]

    @staticmethod
    def is_string(data_type):
        return data_type in [DataStructure.DATA_TYPES.text, DataStructure.DATA_TYPES.long_text,
                             DataStructure.DATA_TYPES.guid, DataStructure.DATA_TYPES.html,
                             DataStructure.DATA_TYPES.select]

    @property
    def is_image(self):
        return self.type in [DataStructure.DATA_TYPES.image, DataStructure.DATA_TYPES.external_image]

    @property
    def has_image_field(self):
        return self.type == DataStructure.DATA_TYPES.image

    @property
    def has_file_field(self):
        return self.type in [DataStructure.DATA_TYPES.file,
                             DataStructure.DATA_TYPES.external_file,
                             DataStructure.DATA_TYPES.external_image]


class SpecialStructure(models.Model):
    name = models.CharField(max_length=255, unique=True)
    config = JSONField(default={}, blank=True)


# CMS settings. Release engineer can change that
class UserGroupsToAssetPermissions(models.Model):
    group = models.ForeignKey(Group, on_delete=models.CASCADE)
    asset = models.ForeignKey(
        Asset, default=None, null=True, on_delete=models.CASCADE)

    def __str__(self):
        return self.group.name

    @staticmethod
    def check_permission(user, asset, permission=None):
        if not user:
            return False
        if user.is_superuser:
            return True
        if permission and not user.has_perm(permission):
            return False

        groups = Group.objects.filter(
            Q(usergroupstoassetpermissions__asset=asset) |
            Q(options__all_assets=True,
              usergroupstoassettype__asset_type=asset.asset_type),
            user=user
        )
        if permission:
            codename = UserGroupsToAssetPermissions.convert_permission_to_codename(
                permission)
            groups = groups.filter(permissions__codename=codename)
        return groups.exists()

    @staticmethod
    def check_edit_advanced(user, asset):
        return UserGroupsToAssetPermissions.check_permission(user, asset, "cms.edit_advanced")

    @staticmethod
    def check_asset_edit_content(user, asset):
        return UserGroupsToAssetPermissions.check_permission(user, asset, "cms.edit_content")

    @staticmethod
    def check_customization_permission(user, customization=settings.CUSTOMIZATION, permission=None, no_create=True):
        if not (cloud_portal := get_cloud_portal_asset(customization=customization, no_create=no_create)):
            return False

        return UserGroupsToAssetPermissions.\
            check_permission(user, cloud_portal, permission)

    @staticmethod
    def get_customizations_with_permission(user, permission):
        codename = UserGroupsToAssetPermissions.convert_permission_to_codename(
            permission)
        if user.is_superuser or Group.objects.filter(
            options__all_assets=True, usergroupstoassettype__asset_type=AssetType.ASSET_TYPES.cloud_portal, user=user,
            permissions__codename=codename
        ).exists():
            return Customization.objects.filter(asset__asset_type__type=AssetType.ASSET_TYPES.cloud_portal,)
        else:
            return Customization.objects.filter(
                asset__asset_type__type=AssetType.ASSET_TYPES.cloud_portal,
                asset__usergroupstoassetpermissions__group__permissions__codename=codename,
                asset__usergroupstoassetpermissions__group__user=user
            )

    @staticmethod
    def check_customization_access(user, *, customization):
        return UserGroupsToAssetPermissions.\
            check_customization_permission(
                user, customization, "cms.access_customization")

    @staticmethod
    def check_customization_change_account(user, *, customization):
        return UserGroupsToAssetPermissions.\
            check_customization_permission(
                user, customization, "api.change_account")

    @staticmethod
    def check_customization_publish(user, *, customization=None, request=None):
        from util.helpers import get_customization
        customization = customization or get_customization(request)
        return UserGroupsToAssetPermissions.\
            check_customization_permission(
                user, customization, "cms.publish_version")

    @staticmethod
    def user_has_beta_access(user, *, customization):
        return UserGroupsToAssetPermissions.\
            check_customization_permission(
                user, customization, "cms.access_integration_store")

    @staticmethod
    def user_can_view_all_releases(user, *, customization):
        return UserGroupsToAssetPermissions.\
            check_customization_permission(
                user, customization, "cms.user_can_view_all_releases")

    @staticmethod
    def convert_permission_to_codename(permission):
        if permission.find('.') > -1:
            # need to remove app_label to get codename
            permission = permission[permission.find('.') + 1:]
        return permission


class UserGroupsToAssetType(models.Model):
    group = models.ForeignKey(Group, on_delete=models.CASCADE)
    asset_type = models.ForeignKey(
        AssetType, default=None, null=True, on_delete=models.CASCADE)

    def __str__(self):
        return self.group.name

    @staticmethod
    def check_asset_type(user, asset_type, permission):
        if user.is_superuser:
            return True

        codename = UserGroupsToAssetPermissions.convert_permission_to_codename(
            permission)
        asset_type_groups = UserGroupsToAssetType.objects.\
            filter(group_id__in=user.groups.values_list('id', flat=True),
                   group__permissions__codename=codename,
                   asset_type=asset_type).values_list('group__id', flat=True)

        return UserGroupsToAssetPermissions.objects.filter(group__id__in=asset_type_groups).exists()

@receiver(post_save, sender=UserGroupsToAssetPermissions)
@receiver(post_save, sender=UserGroupsToAssetType)
def clear_account_cache(sender, instance, created, **kwargs):
    for account in instance.group.user_set.all():
        cache.delete(account.email)

# CMS data. Partners can change that
class ContentVersion(models.Model):

    class Meta:
        verbose_name = 'revision'
        verbose_name_plural = 'revisions'

    # TODO: Remove this after release of 18.4 - Task: CLOUD-2299
    customization = models.ForeignKey(
        Customization, default=None, null=True, on_delete=models.SET_NULL)
    asset = models.ForeignKey(Asset, default=1, on_delete=models.CASCADE)

    created_date = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True,
        blank=True, related_name='created_%(class)s', on_delete=models.SET_NULL)

    accepted_date = models.DateTimeField(null=True, blank=True)
    accepted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        related_name='accepted_%(class)s', on_delete=models.SET_NULL)

    def __str__(self):
        return str(self.id)

    @staticmethod
    def create_missing_reviews(asset, version, customization, parent_in_review=None):
        blocked = AssetCustomizationReview.REVIEW_STATES.blocked
        pending = AssetCustomizationReview.REVIEW_STATES.pending

        if parent_in_review is None and customization.parent:
            parent_in_review = asset.customizations.filter(
                id=customization.parent.id).exists()

        for version in ContentVersion.objects.filter(
                ~Q(assetcustomizationreview__customization=customization), id__lt=version.id,
                id__gt=asset.version_id(customization.name),
                asset=asset, assetcustomizationreview__isnull=False
        ).distinct():
            review = None
            if parent_in_review:
                parent_review = version.assetcustomizationreview_set.filter(
                    customization=customization.parent).first()
                # If the review doesn't exist yet, it will be created at some point in the outer loop and this child review should be blocked
                # If parent review exists but is pending, this one should be blocked
                if not parent_review or parent_review.state == pending:
                    review = AssetCustomizationReview(
                        customization=customization, version=version, state=blocked)
                elif customization.trust_parent:
                    review = AssetCustomizationReview(customization=customization, version=version,
                                                      state=parent_review.state)
            if not review:
                review = AssetCustomizationReview(
                    customization=customization, version=version, state=pending)
            review.save()
            review.update_children_reviews()

    def create_reviews(self):
        blocked = AssetCustomizationReview.REVIEW_STATES.blocked
        pending = AssetCustomizationReview.REVIEW_STATES.pending

        if self.asset.asset_type.single_customization:
            AssetCustomizationReview(customization=self.asset.customizations.first(),
                                     version=self,
                                     state=pending).save()
            return

        for customization in self.asset.customizations.all():
            parent_in_review = False
            if customization.parent:
                parent_in_review = self.asset.customizations.filter(
                    id=customization.parent.id).exists()
            if parent_in_review:
                AssetCustomizationReview(
                    customization=customization, version=self, state=blocked).save()
            else:
                AssetCustomizationReview(
                    customization=customization, version=self, state=pending).save()

            # Create missing reviews caused by adding/removing customizations to assets
            self.create_missing_reviews(
                self.asset, self, customization, parent_in_review)

    @property
    def state(self):
        if not self.accepted_by:
            return 'in review'

        version_id = self.asset.version_id()

        if version_id > self.id:
            return 'old'

        return 'current'


class AssetCustomizationReviewManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().order_by('version_id', '-pk')


class AssetCustomizationReview(models.Model):
    class Meta:
        verbose_name = 'review'
        verbose_name_plural = 'reviews'
        permissions = (
            ("publish_version", "Can publish content to production"),
            ("force_update", "Can forcibly update content"),
        )

    REVIEW_STATES = Choices((0, "pending", "Pending"),
                            (1, "accepted", "Accepted"),
                            (2, "rejected", "Rejected"),
                            (3, "blocked", "Blocked"))
    customization = models.ForeignKey(Customization, on_delete=models.CASCADE)
    version = models.ForeignKey(ContentVersion, on_delete=models.CASCADE)
    state = models.IntegerField(
        choices=REVIEW_STATES, default=REVIEW_STATES.pending)
    notes = models.TextField(default="", blank=True)
    reviewed_date = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        related_name='accepted_%(class)s', on_delete=models.SET_NULL)
    default_preview = models.TextField(blank=True)

    objects = AssetCustomizationReviewManager()

    def __str__(self):
        return self.version.asset.__str__()

    def update_children_reviews(self):
        reviews = self.version.assetcustomizationreview_set.\
            filter(customization__in=self.customization.children_customizations.all())

        can_show_customization = UserGroupsToAssetPermissions. \
            check_customization_access(
                self.version.created_by, customization=self.customization)

        is_parent_in_asset = self.is_customization_in_asset
        recursive_update_states = [AssetCustomizationReview.REVIEW_STATES.blocked,
                                   AssetCustomizationReview.REVIEW_STATES.rejected]

        for review in reviews:
            if review.state == AssetCustomizationReview.REVIEW_STATES.rejected:
                continue

            review.reviewed_by = self.reviewed_by
            review.reviewed_date = self.reviewed_date
            review.state = self.state

            if review.state == AssetCustomizationReview.REVIEW_STATES.accepted:
                if review.customization.trust_parent:
                    if can_show_customization:
                        review.notes = f"Automatically accepted by {self.customization}"
                    else:
                        review.notes = "Automatically accepted"
                else:
                    review.state = AssetCustomizationReview.REVIEW_STATES.pending
                    # If the child customization does not trust its parent we need to set reviewed by and date to blank.
                    review.reviewed_by = None
                    review.reviewed_date = None
            # Handles then case when the  parent is added back
            elif is_parent_in_asset and review.state == AssetCustomizationReview.REVIEW_STATES.pending:
                review.state = AssetCustomizationReview.REVIEW_STATES.blocked
            # Handles the case when the parent is removed.
            elif not is_parent_in_asset:
                review.state = AssetCustomizationReview.REVIEW_STATES.pending
            elif can_show_customization:
                review.notes = f"Automatically rejected by {self.customization}"
            else:
                review.notes = "Automatically rejected"

            review.save()
            if review.state in recursive_update_states or review.customization.trust_parent:
                review.update_children_reviews()

    def update_state(self, user, state):
        self.reviewed_by = user
        self.reviewed_date = datetime.now()
        self.state = state
        self.save()
        self.update_children_reviews()

    def update_current_and_older(self, user, state):
        asset = self.version.asset
        customization_reviews = AssetCustomizationReview.objects. \
            filter(version__id__gt=asset.version_id(self.customization),
                   version__id__lte=self.version_id,
                   version__asset=asset,
                   customization=self.customization).distinct()

        # Rejection should only to the last
        if state == AssetCustomizationReview.REVIEW_STATES.rejected:
            customization_reviews = [customization_reviews.last()]
        for review in customization_reviews:
            review.update_state(user, state)

    @property
    def can_preview_customization(self):
        can_preview = self.version.asset.asset_type.can_preview
        in_review = self.state in [
            self.REVIEW_STATES.pending, self.REVIEW_STATES.blocked]
        is_current_customization = self.customization.name == settings.CUSTOMIZATION
        return can_preview and in_review and is_current_customization

    @property
    def is_customization_in_asset(self):
        return self.version.asset.customizations.filter(id=self.customization.id).exists()


@receiver(post_delete, sender=AssetCustomizationReview)
def unblock_child_reviews(sender, instance, **kwargs):
    instance.update_children_reviews()


class ExternalFileManager(models.Manager):
    def create(self, file=None, asset=None, data_structure=None, user=None, md5=None, size=None):
        '''
        Adds to asset_ds_pair if file already exist else creates new file.
        '''
        raw_bytes = b''

        if file:
            # Handle new upload, md5 provided for files directly uploaded to s3
            # TODO: Migrate old md5 using metadata from s3 once all file uploads use chunked uploader
            md5 = hashlib.md5()
            for count, chunk in enumerate(file.chunks()):
                md5.update(chunk)
                if count < 5:
                    raw_bytes += chunk
            md5 = md5.hexdigest()

        asset_ds_pair = None
        if asset and data_structure:
            try:
                asset_ds_pair = AssetDsPair.objects.get(
                    asset=asset, data_structure=data_structure)
            except ObjectDoesNotExist:
                asset_ds_pair = AssetDsPair(
                    asset=asset, data_structure=data_structure)
                asset_ds_pair.save()

        external_file_obj = None

        try:
            external_file_obj = ExternalFile.objects.get(md5=md5)

            if not external_file_obj.admin_upload and user and not asset_ds_pair:
                external_file_obj.admin_upload = user

        except ExternalFile.DoesNotExist:
            external_file_obj = ExternalFile(
                md5=md5, size=size or file.size, admin_upload=None if asset_ds_pair else user)
            external_file_obj.save()
            external_file_obj.file = file
        else:
            if external_file_obj.file and MediaStorage().exists(external_file_obj.file.name):
                if file:
                    # raw_bytes only populated when uploaded the old way, for files directly uploaded to S3 we just use their calculated hash
                    external_raw_bytes = b''
                    for count, chunk in enumerate(external_file_obj.file.chunks()):
                        if count < 5:
                            external_raw_bytes += chunk
                        else:
                            break
                    if external_raw_bytes != raw_bytes:
                        raise ValueError('md5 Hash Collision')
            else:
                external_file_obj.file = file

        if asset_ds_pair:
            external_file_obj.assest_ds_pair_last_added = datetime.now()
            external_file_obj.asset_ds_pair.add(asset_ds_pair)

        external_file_obj.save()

        return external_file_obj


class AssetDsPair(models.Model):
    data_structure = models.ForeignKey(DataStructure, on_delete=models.CASCADE)
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE)

    def __str__(self):
        return f"{self.asset.name} > {self.data_structure.name}"


class ExternalFile(models.Model):
    # Default limit is 100 chars. The new length comes from most paths being limited to 255 char.
    # Since we slugify the asset name, data structure name and file name we need a long length.
    file = models.FileField(upload_to=rename_file,
                            storage=MediaStorage(), max_length=1000, blank=True, null=True)
    md5 = models.CharField(max_length=32, blank=False, unique=True)
    size = models.FloatField(default=0.0)
    asset_ds_pair = models.ManyToManyField(
        AssetDsPair,  default=None, blank=True)
    assest_ds_pair_last_added = models.DateTimeField(default=datetime.now)
    admin_upload = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, default=None, blank=True, null=True)

    objects = ExternalFileManager()

    def delete(self, *args, asset_ds_pair=None, **kwargs):
        '''
        Removes asset_ds_pair relation from file, deletes file if no other relations exist or if no asset_ds_pair passed.
        '''
        if not asset_ds_pair or not self.id or not list(self.asset_ds_pair.all()):
            super().delete(*args, **kwargs)
        else:
            self.asset_ds_pair.remove(asset_ds_pair)
            self.save()
            if not self.asset_ds_pair.count():
                self.delete()

    def __str__(self):
        return self.file.name


def file_saved(sender, created, signal, instance, **kwargs):
    if created:
        return

    file = instance.file

    if not file:
        return

    md5 = hashlib.md5()

    try:
        chunks = file.file.chunks()
    except OSError:
        # Skip if chunked upload transferred directly into S3
        return

    for chunk in chunks:
        md5.update(chunk)
    md5 = md5.hexdigest()
    if instance.md5 != md5:
        instance.md5 = md5
        instance.size = file.size
        instance.save()


if not settings.TESTING:
    post_save.connect(file_saved, sender=ExternalFile,
                      dispatch_uid='file_post_save')


@receiver(pre_delete, sender=AssetDsPair)
def delete_asset_ds_reverse(sender, instance, **kwargs):
    external_files = instance.externalfile_set.all()
    files_to_delete = [file for file in external_files if not file.asset_ds_pair.exclude(
        id=instance.id).count()]
    for file in files_to_delete:
        file.delete()


class DataRecord(models.Model):
    data_structure = models.ForeignKey(DataStructure, on_delete=models.CASCADE)
    asset = models.ForeignKey(
        Asset, default=None, null=True, on_delete=models.CASCADE)
    language = models.ForeignKey(
        Language, null=True, blank=True, on_delete=models.CASCADE)
    # TODO: Remove this after release of 18.4 - Task: CLOUD-2299
    customization = models.ForeignKey(
        Customization, default=None, blank=True, null=True, on_delete=models.SET_NULL)
    version = models.ForeignKey(
        ContentVersion, null=True, blank=True, on_delete=models.SET_NULL)

    created_date = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True,
        blank=True, related_name='created_%(class)s', on_delete=models.SET_NULL)

    value = models.TextField(default='', blank=True)
    external_file = models.ForeignKey(
        ExternalFile, default=None, blank=True, null=True, on_delete=models.CASCADE)

    def __str__(self):
        return self.value

    # added for images base64 encoding makes the field really long
    @property
    def short_description(self):
        return truncatechars(self.value, 100)

    @property
    def context(self):
        return self.data_structure.context

    @property
    def get_data_structure_with_name(self):
        language = self.language.code if self.language else ''
        return f"{self.data_structure.context.name}-{self.data_structure.name}-{language}"

    @cached_property
    def cast_value(self):
        return self.data_structure.cast_value(self.data_structure, self.value)

    def save(self, *args, **kwargs):
        if not self.data_structure.translatable:
            self.language = None

        if self.data_structure:
            self.value = self.data_structure.to_string(
                self.data_structure, self.value)

        super(DataRecord, self).save(*args, **kwargs)


@receiver(post_delete, sender=DataRecord)
def delete_file_reverse(sender, **kwargs):
    try:
        file = kwargs['instance'].external_file
        if file:
            collector = Collector(using='default')
            collector.collect([file], keep_parents=True)
            # Check if any other object is referencing the ExternalFile
            for model, instance in collector.instances_with_model():
                if model != ExternalFile and (model != DataRecord or instance.id != kwargs['instance'].id):
                    break
            else:
                file.delete()
    except ObjectDoesNotExist:
        # Prevent circular deletion caused by cascading
        pass


class ContributorAgreement(models.Model):
    accepted_date = models.DateTimeField(auto_now_add=True)
    accepted_agreement = models.ForeignKey(
        AssetCustomizationReview, on_delete=models.CASCADE)
    user = models.ForeignKey(settings.AUTH_USER_MODEL,
                             on_delete=models.CASCADE)

    def __str__(self):
        return f'{self.accepted_agreement} - {self.user}'

    def clean(self):
        if self.accepted_agreement and \
                not self.accepted_agreement.version.asset.is_agreement:
            raise ValidationError({
                'accepted_agreement': 'Accepted agreement must be a review of an agreement-type asset'
            })

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    @staticmethod
    def get_current(*, customization=None, request=None):
        from util.helpers import get_customization
        customization = customization or get_customization(request)
        return AssetCustomizationReview.objects.filter(
            version__asset__asset_type__type=AssetType.ASSET_TYPES.agreement,
            state=AssetCustomizationReview.REVIEW_STATES.accepted, customization__name=customization
        ).last()

    def is_valid(self, *, customization=None, request=None):
        if not customization:
            from util.helpers import get_customization
            customization = self.accepted_agreement.customization or get_customization(request)
        review = self.get_current(customization=customization)
        return review and self.accepted_agreement == review


class Menu(models.Model):
    MENU_TYPES = Choices((0, "generic", "Generic"),
                         (1, "docs_struct", "Documentation Structure"),
                         (2, "docs_knowledgebase", "Documentation Knowledgebase"))

    name = models.CharField(max_length=255, unique=True)
    depth = models.IntegerField(default=2, blank=True)
    base_url = models.CharField(
        blank=True, max_length=255, help_text='Ex: developers')
    url = models.CharField(blank=True, max_length=255,
                           help_text='Ex: knowledgebase')
    type = models.IntegerField(choices=MENU_TYPES, default=MENU_TYPES.generic)
    allow_porting = models.BooleanField(default=False)
    zendesk_sync_enabled = models.ManyToManyField(
        Customization, blank=True, help_text="Used to select Customizations with Zendesk syncing enabled")
    title = models.CharField(max_length=255, blank=True,
                             help_text="Title, used in meta tags for SEO if applicable")
    short_description = models.TextField(
        blank=True, help_text="Short description, used in meta tags for SEO if applicable")
    admin_config = models.TextField(blank=False, help_text='customizes admin view', default=r"""{
        "header": ["name","url","enabled","order","preview"],
        "details": ["asset","icon","authentication"],
        "advanced": ["related_assets","next_item","subtitle","condition","permissions", "new_window", "is_global"]
    }""")

    enabled = models.BooleanField(default=True)

    LOGS_TO_SHOW = 10
    REQUIRED_MENUS = ['Header', 'Footer', 'Configuration']

    def __str__(self):
        if self.name:
            return self.name
        else:
            return super().__str__()

    def validate_unique(self, exclude=None):
        doc_menu = self.type is not self.MENU_TYPES.generic
        if doc_menu and Menu.objects.filter(base_url=self.base_url, url=self.url).exclude(id=self.id).exists():
            base_url = f'"{self.base_url}"' if self.base_url else "None"
            url = f'"{self.url}"' if self.url else "None"
            raise ValidationError(
                f'Menu already exists with base_url={base_url} and url={url}. Please select a unique route.')
        super(Menu, self).validate_unique(exclude=exclude)

    def preview_url(self, state='draft'):
        """Preview url for menu change form.
        """
        if self.type in (self.MENU_TYPES.docs_struct, self.MENU_TYPES.docs_knowledgebase):
            return f'/docs/{self.base_url or self.url}{f"/{self.url}" if self.base_url and self.url else ""}?state={state}'
        return ''

    @property
    def node_preview_url(self):
        """Preview url for child menu nodes.
        """
        return {
            self.MENU_TYPES.docs_struct: self.preview_url('draft'),
            self.MENU_TYPES.docs_knowledgebase: f'/docs/{self.base_url or self.url}{f"/{self.url}" if self.base_url and self.url else ""}/asset_id?state=draft'
        }.get(self.type, '')

    @classmethod
    def generate_menus_for_customization(cls, menus, customization, include_not_accepted=False):
        from cms.controllers.filldata import global_contexts_to_dict
        cloud_portal_asset = get_cloud_portal_asset(customization=customization.name)
        global_contexts = Context.objects.filter(
            asset_type=cloud_portal_asset.asset_type, is_global=True)
        global_contexts_dict = global_contexts_to_dict(
            global_contexts, cloud_portal_asset)
        document_dss = {
            'title': DataStructure.objects.filter(context__asset_type__type=AssetType.ASSET_TYPES.documentation,
                                                  name='title').first(),
            'url': DataStructure.objects.filter(context__asset_type__type=AssetType.ASSET_TYPES.documentation,
                                                name='url').first()
        }
        structures = {
            menu.name.lower(): {
                'nodes': MenuNode.generate_node_structure(
                    menu.nodes_list,
                    cloud_portal_asset,
                    customization,
                    global_contexts_dict,
                    max_depth=menu.depth,
                    include_not_accepted=include_not_accepted,
                    document_dss=document_dss
                ),
                'type': menu.type,
                'base_url': menu.base_url,
                'id': menu.id,
                'title': menu.title,
                'description': menu.short_description,
            }
            for menu in menus
        }

        return customization, structures

    @classmethod
    def generate_menu(cls, menu_name, *, customization):
        menu_name = menu_name.lower()
        customization = Customization.objects.filter(
            name=customization).first()
        menus = cls.get_prefetched_menus([menu_name])
        _, structures = cls.generate_menus_for_customization(
            menus, customization, include_not_accepted=True)
        return structures.get(menu_name)

    @classmethod
    def generate_menus(cls, *, customization=None, menu_names=None):
        menus = cls.get_prefetched_menus(menu_names)

        if customization:
            customizations = Customization.objects.filter(
                name=customization)
        else:
            customizations = [asset.customizations.first() for asset in Asset.objects.annotate(
                customization_count=models.Count('customizations')
            ).filter(asset_type__type=AssetType.ASSET_TYPES.cloud_portal, customization_count=1)]

        menu_customization_structure = {}

        with ThreadPoolExecutor(max_workers=4) as executer:
            futures = [executer.submit(cls.generate_menus_for_customization,
                                       menus, customization_instance) for customization_instance in customizations]

        for future in as_completed(futures):
            customization_instance, structures = future.result()
            menu_customization_structure[customization_instance.name] = structures

        return menu_customization_structure[customization] if customization else menu_customization_structure

    @classmethod
    def get_prefetched_menus(cls, menu_names=None, only_enabled=True):
        menu_names = menu_names or Menu.REQUIRED_MENUS
        menus = cls.objects.all()
        if only_enabled:
            menus = menus.filter(enabled=True)
        menu_query = menus.filter(name__in=menu_names)
        max_depth = menu_query.aggregate(
            models.Max('depth'))['depth__max']
        if max_depth is None:
            return []
        # Force qs evaluation to prevent threads from messing with prefetch cache
        return list(menu_query.prefetch_related(*cls.get_prefetch_objects(max_depth=max_depth, depth=1)))

    def prefetch_menu(self):
        return Menu.objects.prefetch_related(*self.get_prefetch_objects(max_depth=self.depth, depth=1)).get(id=self.id)

    @classmethod
    def get_prefetch_objects(cls, max_depth, depth=1):
        nodes_to_attr = 'nodes_list'
        parent_node_lookup = '__'.join(
            [nodes_to_attr for _ in range(1, depth)])
        nodes_lookup = parent_node_lookup + '__nodes' if depth > 1 else 'nodes'
        enabled_lookup = f'{parent_node_lookup}__{nodes_to_attr}__enabled' if depth > 1 else f'{nodes_to_attr}__enabled'
        permission_lookup = f'{parent_node_lookup}__{nodes_to_attr}__permissions' if depth > 1 else f'{nodes_to_attr}__permissions'
        related_assets_lookup = f'{parent_node_lookup}__{nodes_to_attr}__related_assets' if depth > 1 else f'{nodes_to_attr}__related_assets'
        prefetches = [models.Prefetch(nodes_lookup,
                                      queryset=MenuNode.objects.order_by('order').select_related(
                                          'asset', 'asset__asset_type'
                                      ).prefetch_related(models.Prefetch('asset__customizations', to_attr='asset_customizations_list')),
                                      to_attr=nodes_to_attr),
                      models.Prefetch(enabled_lookup, to_attr='enabled_list'),
                      models.Prefetch(permission_lookup),
                      models.Prefetch(related_assets_lookup)]
        child_prefetches = tuple()
        if depth < max_depth:
            child_prefetches = cls.get_prefetch_objects(max_depth, depth + 1)

        return (*prefetches, *child_prefetches)

    @classmethod
    def cache_all_customizations(cls, **kwargs):
        structures = cls.generate_menus()
        for customization, structure in structures.items():
            MENU_CACHE[customization] = structure

    @staticmethod
    def clear_all_customizations_cache():
        for customization in Customization.objects.all().values_list('name', flat=True):
            doc_cache_key = f'{customization}-doc-dir'
            MENU_CACHE[customization] = MENU_CACHE[doc_cache_key] = None

    def to_dict(self):
        assets = set()

        def get_nodes(nodes_list):
            nodes = []
            for node in nodes_list:
                node_dict = {
                    'name': node.name,
                    'subtitle': node.subtitle,
                    'url': node.url,
                    'asset': node.asset.name if node.asset else None,
                    'uuid': str(node.asset.uuid) if node.asset else None,
                    'asset_type': node.asset.asset_type.type if node.asset else None,
                    'related_assets': [(asset.name, asset.asset_type.type, str(asset.uuid)) for asset in node.related_assets.all()],
                    'next_item': node.next_item,
                    'new_window': node.new_window,
                    'icon': node.icon,
                    'available': [customization.name for customization in node.available.all()],
                    'enabled': [customization.name for customization in node.enabled_customizations],
                    'authentication': node.authentication,
                    'condition': node.condition,
                    'permissions': [permission.codename for permission in node.permissions.all()],
                    'order': node.order,
                    'is_global': node.is_global,
                    'touched': node.touched,
                    'nodes': get_nodes(getattr(node, 'nodes_list')) if hasattr(node, 'nodes_list') else []
                }
                assets.add(node_dict['uuid'])
                assets.update(
                    {str(related_asset[2]) for related_asset in node_dict['related_assets']})
                nodes.append(node_dict)
            return nodes

        menu = Menu.get_prefetched_menus(only_enabled=False, menu_names=[self.name])[0]

        return {
            'name': menu.name,
            'depth': menu.depth,
            'nodes': get_nodes(menu.nodes_list) if menu.nodes_list else [],
            'assets': list(filter(lambda id: id, assets))
        }

    def from_dict(self, menu_dict, user, update_progress_cb=None, accept_reviews=False):
        from cms.controllers.structure import import_assets_from_json
        node_asset_count = len(menu_dict['assets'])
        progress = 0

        def increment_progress(error=None):
            nonlocal progress
            if not update_progress_cb:
                return
            progress += 1
            update_progress_cb(progress, node_asset_count, error=error)

        def get_node_count(node):
            return 1 + sum(get_node_count(child) for child in node.get('nodes', []))

        node_asset_count += get_node_count(menu_dict)
        if update_progress_cb:
            update_progress_cb(progress, node_asset_count)
        import_assets_from_json(
            menu_dict['assets'], user, increment_progress=update_progress_cb and increment_progress, publish=accept_reviews)

        def set_nodes(nodes_list, parent):
            for node in nodes_list:
                parent_type = 'parent_menu' if isinstance(
                    parent, Menu)else 'parent_node'
                node_qs = MenuNode.objects.filter(
                    **{parent_type: parent}, id__in=all_node_ids)
                node_obj = None
                node_name = node.get('name', '')
                node_asset_uuid = node.get('uuid', '-1')
                if node_name:
                    node_obj = node_qs.filter(name=node_name).first()
                elif node_asset_uuid and node_asset_uuid != '-1':
                    node_obj = node_qs.filter(
                        asset__uuid=node_asset_uuid).first()
                if not node_obj:
                    node_obj = MenuNode()

                node_obj.name = node_name
                node_obj.subtitle = node.get('subtitle', '')
                node_obj.url = node['url']
                node_obj.next_item = node['next_item']
                node_obj.new_window = node['new_window']
                node_obj.icon = node['icon']
                node_obj.authentication = node['authentication']
                node_obj.condition = node['condition']
                node_obj.order = node['order']
                node_obj.is_global = node['is_global']
                node_obj.touched = node['touched']
                node_obj.__setattr__(parent_type, parent)
                if not node_obj.pk:
                    node_obj.save()

                node_obj.available.set(
                    list(Customization.objects.filter(name__in=node['available'])))
                node_obj.enabled.set(
                    list(Customization.objects.filter(name__in=node['enabled'])))
                node_obj.permissions.set(
                    list(Permission.objects.filter(codename__in=node['permissions'])))

                if node['asset']:
                    asset_obj = Asset.objects.filter(
                        uuid=node_asset_uuid).first()
                    if asset_obj:
                        asset_obj.name = node['asset']
                        asset_obj.customizations.set(
                            Customization.objects.filter(name__in=node['enabled']))
                        asset_obj.save()
                        node_obj.asset = asset_obj
                    else:
                        increment_progress(
                            f'Failed to set customizations for <b>"{node["asset"]}"</b> to due imported asset type <b>"{AssetType.ASSET_TYPES[node["asset_type"]]}"</b> not match existing assets type.')

                for asset, asset_type, asset_uuid in node.get('related_assets', []):
                    node_obj.related_assets.add(
                        Asset.objects.filter(uuid=asset_uuid).first())
                node_obj.save()

                increment_progress()
                if node['nodes']:
                    set_nodes(node['nodes'], node_obj)

        self.depth = menu_dict['depth']
        self.save()
        if menu_dict['nodes']:
            all_node_ids = self.all_node_ids
            set_nodes(menu_dict.get('nodes', []), self)

    def extract_from_nodes(self, process_node_callback):
        def append_nodes(nodes):
            for node in nodes:
                extracted = process_node_callback(node)
                if extracted:
                    all_nodes.append(extracted)
                if hasattr(node, 'nodes_list'):
                    append_nodes(node.nodes_list)

        all_nodes = []
        prefetched_menu = self.get_prefetched_menus(
            menu_names=[self.name], only_enabled=False)[0]
        if hasattr(prefetched_menu, 'nodes_list'):
            append_nodes(prefetched_menu.nodes_list)
        return all_nodes

    @property
    def all_node_ids(self):
        return self.extract_from_nodes(lambda node: node.id)

    @property
    def all_asset_ids(self):
        return self.extract_from_nodes(lambda node: node.asset and node.asset.id)

    @property
    def admin_link(self):
        return reverse("admin:cms_menu_change", args=(self.id,))

    LABEL_LOOKUP = {
        'Out of Sync': 'warning',
        'In Progress': 'primary',
        'Success': 'success',
        'Failed': 'danger',
        'Canceled': 'warning',
    }

    @property
    def zendesk_sync_state(self):
        PACKAGE_CACHE = PackagesCache()
        customizations_not_cached = []

        def get_cached(key):
            return PACKAGE_CACHE[f'menu_sync_{self.id}_{key}']

        def cache_item(key, item):
            PACKAGE_CACHE[f'menu_sync_{self.id}_{key}'] = item
            return item

        def not_cached(customization):
            customizations_not_cached.append(customization)
            return {
                'logs': [],
                'state': 'Out of Sync' if len(self.zendesk_out_of_sync(customization)) else 'Success',
                'out_of_sync': self.zendesk_out_of_sync(customization)
            }

        enabled_customizations = [
            customization.name for customization in self.zendesk_sync_enabled.all().order_by('name')]
        logs_by_customization = {customization: get_cached(customization) or not_cached(
            customization) for customization in enabled_customizations}
        for log in reversed(self.zendesksynclog_set.all().order_by('-sync_time')[:self.LOGS_TO_SHOW]):
            customization = log.zendesk_site.customization.name
            if customization in enabled_customizations:
                if customization in customizations_not_cached:
                    info = get_cached(log.id) or cache_item(
                        log.id, log.sync_info)
                    logs_by_customization[customization]['logs'].append(info)
                    success = not log.sync_items.exclude(
                        state=SYNC_STATES.success).count()
                    failed = log.sync_items.filter(
                        state=SYNC_STATES.failed).count()
                    if logs_by_customization[customization]['state'] != 'Out of Sync' and not success:
                        for sync_item in log.sync_items.all():
                            sync_item.zendesk_article.map_sync_stats(
                                customization, target=logs_by_customization[customization]['out_of_sync'])
                    state = SYNC_STATES.success if success else SYNC_STATES.failed if failed else SYNC_STATES.in_progress
                    logs_by_customization[customization]['state'] = SYNC_STATES[state]
                else:
                    logs_by_customization[customization]['out_of_sync'] = self.zendesk_out_of_sync(
                        customization)

        return [cache_item(customization, {
            'customization_name': customization,
            'menu_admin': f'{self.admin_link}?customization={customization}',
            'mapping_admin': reverse("admin:zendesk_mapping", args=(customization,)),
            **details
        }) for customization, details in logs_by_customization.items()]

    def get_sync_state(self):
        return {
            'customizations': self.zendesk_sync_state,
            'label_lookup': Menu.LABEL_LOOKUP,
            'menu_admin': self.admin_link,
            'menu_name': self.name,
            'menu_id': self.id
        }

    def zendesk_out_of_sync(self, customization):
        total = []
        categories = list(self.zendeskcategory_set.filter(sync=True))
        for category in categories:
            sections = list(category.zendesksection_set.filter(
                sync=True).exclude(menu_node=None))
            for section in sections:
                articles = section.zendeskarticle_set.filter(
                    sync=True).exclude(menu_node=None)
                for article in articles:
                    article.map_sync_stats(customization, total)

        return total


class MenuNodeManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().select_related('asset')


def node_asset_on_delete(collector, fields, sub_objs, using):
    sub_objs_no_children = sub_objs.filter(nodes=None).distinct()
    sub_objs_children = sub_objs.exclude(nodes=None).distinct()
    if sub_objs_no_children:
        models.CASCADE(collector, fields,
                       sub_objs=sub_objs_no_children, using=using)
    if sub_objs_children:
        models.SET_NULL(collector, fields,
                        sub_objs=sub_objs_children, using=using)


class MenuNode(models.Model):
    AUTH_CHOICES = Choices((0, "logged_out", "Logged Out"),
                           (1, "logged_in", "Logged In"),
                           (2, "both", "Both"))
    name = models.CharField(max_length=255, blank=True)
    subtitle = models.CharField(max_length=255, blank=True)
    url = models.CharField(max_length=2048, blank=True)
    asset = models.ForeignKey(
        Asset, null=True, blank=True, on_delete=node_asset_on_delete, related_name='nodes')
    related_assets = models.ManyToManyField(
        Asset, default=None, blank=True, related_name='nodes_related')
    next_item = models.BooleanField(default=False, verbose_name='Link to next')
    new_window = models.BooleanField(default=False)
    icon = models.CharField(blank=True, max_length=255)
    available = models.ManyToManyField(
        Customization, blank=True, related_name='available_nodes')
    enabled = models.ManyToManyField(
        Customization, blank=True, related_name='enabled_nodes')
    authentication = models.IntegerField(
        choices=AUTH_CHOICES, default=AUTH_CHOICES.both)
    condition = models.CharField(blank=True, max_length=255)
    permissions = models.ManyToManyField(Permission, default=None, blank=True)
    order = models.IntegerField(default=0)
    is_global = models.BooleanField(default=True, verbose_name='Global')
    parent_menu = models.ForeignKey(
        Menu, on_delete=models.CASCADE, null=True, blank=True, related_name='nodes')
    parent_node = models.ForeignKey(
        'self', on_delete=models.CASCADE, null=True, blank=True, related_name='nodes')
    touched = models.BooleanField(default=False)

    objects = MenuNodeManager()

    def __str__(self):
        parent = self.get_parent()
        return f'Item: {self.display_name()} (Menu: {parent.name if parent else "None"})'

    def display_name(self):
        if self.name:
            return self.name
        elif self.asset:
            return f'(Asset: {self.asset.name})'
        elif self.pk:
            return str(self.pk)
        return 'New'

    @staticmethod
    def generate_node_structure(nodes: ['MenuNode'], cloud_portal_asset, customization, global_contexts_dict, depth=1,
                                max_depth=2, include_not_accepted=False, document_dss=None):
        nodes_structure = []
        for node in nodes:
            pending = None
            enabled = node.is_enabled(customization)
            condition_met = not node.condition or global_contexts_dict.get(
                node.condition, False)
            version = node.asset.version_id(customization.name) if node.asset else 0
            asset_accepted = not node.asset or version != 0
            if enabled and (asset_accepted or include_not_accepted):
                if node.asset:
                    pending = AssetCustomizationReview.objects.filter(
                        customization=customization, version__asset=node.asset, state=AssetCustomizationReview.REVIEW_STATES.pending
                    ).select_related('version').last()
                node_structure = {
                    'subtitle': node.subtitle,
                    'url': cloud_portal_asset.replace_global_values(node.url, global_contexts_dict),
                    'asset_id': node.asset.id if node.asset else None,
                    'accepted': asset_accepted,
                    'pending': pending is not None,
                    'draft':  node.asset and node.asset.is_dirty,
                    'asset_type': AssetType.ASSET_TYPES[node.asset.asset_type.type] if node.asset else None,
                    'related_asset_ids': [asset.id for asset in node.related_assets.all()],
                    'next_item': node.next_item,
                    'new_window': node.new_window,
                    'icon': node.icon,
                    'permissions': list(node.permissions.values_list('codename', flat=True)),
                    'authentication': node.AUTH_CHOICES[node.authentication],
                    'order': node.order,
                    'condition': node.condition,
                    'condition_met': condition_met,
                    'version': version
                }

                title_ds = document_dss['title']
                url_ds = document_dss['url']
                title = ''
                url = ''
                if node.name:
                    title = node.name
                if node.asset and node.asset.asset_type.type == AssetType.ASSET_TYPES.documentation:
                    asset_title = None
                    asset_url = None
                    if asset_accepted:
                        asset_title = title_ds.find_actual_value(
                            node.asset, customization_name=customization.name)
                        asset_url = url_ds.find_actual_value(
                            node.asset, customization_name=customization.name)
                    elif pending is not None:
                        asset_title = title_ds.find_actual_value(
                            node.asset, draft=True, version_id=pending.version.id, customization_name=customization.name)
                        asset_url = url_ds.find_actual_value(
                            node.asset, draft=True, version_id=pending.version.id, customization_name=customization.name)
                    elif node_structure['draft']:
                        asset_title = title_ds.find_actual_value(
                            node.asset, draft=True, customization_name=customization.name)
                        asset_url = url_ds.find_actual_value(
                            node.asset, draft=True, customization_name=customization.name)

                    if not title and asset_title:
                        title = asset_title
                        node_structure['name'] = title

                    if asset_url:
                        url = f'{node.asset.id}-{asset_url}'
                    elif asset_title:
                        url = node.asset.urlify(asset_title)
                    node_structure['urlified'] = url or None

                if 'name' not in node_structure:
                    node_structure['name'] = title or 'Untitled'
                    # Raw string for translation
                    node_structure['name_raw'] = node_structure['name']

                if node_structure['name'] != 'untitled':
                    node_structure['name'] = cloud_portal_asset.replace_global_values(
                        node_structure['name'], global_contexts_dict)
                node_structure['display_name'] = node_structure['name']

                if depth < max_depth and node.nodes_list:
                    node_structure['nodes'] = node.generate_node_structure(
                        node.nodes_list, cloud_portal_asset, customization, global_contexts_dict, depth + 1,
                        max_depth=max_depth, include_not_accepted=include_not_accepted, document_dss=document_dss
                    )
                nodes_structure.append(node_structure)
        return nodes_structure

    @classmethod
    def enable_global(cls, cloud_portal_asset):
        customization = cloud_portal_asset.customizations.first()
        if customization:
            for node in cls.objects.filter(is_global=True):
                node.enabled.add(customization)
            Menu.cache_all_customizations()

    @property
    def enabled_customizations(self):
        if self.asset:
            return getattr(self.asset, 'asset_customizations_list', self.asset.customizations.all())
        else:
            return getattr(self, 'enabled_list', self.enabled.all())

    @property
    def admin_link(self):
        return reverse('admin:cms_menunode_change', args=(self.id,))

    def is_enabled(self, customization):
        return next(
            (cust for cust in self.enabled_customizations if cust.id == customization.id), False)

    def get_parent(self):
        if self.parent_node:
            return self.parent_node.get_parent()
        else:
            return self.parent_menu

    def save(self, *args, **kwargs):
        # Don't set obj.touched to True when touched=False is passed
        touched = kwargs.pop('touched', True)
        if not self.touched and touched:
            self.touched = True
        super().save(*args, **kwargs)


# Start Zendesk Models

class ZendeskSite(models.Model):
    customization = models.ForeignKey(Customization, on_delete=models.CASCADE)


class ZendeskCategory(models.Model):
    category_id = models.BigIntegerField(blank=True, null=True)
    name = models.CharField(max_length=500, blank=True)
    site = models.ForeignKey(ZendeskSite, on_delete=models.CASCADE)
    menu = models.ForeignKey(Menu, on_delete=models.CASCADE)
    position = models.IntegerField(default=0)
    general_section_title = models.CharField(max_length=500, default='General')

    sync = models.BooleanField(default=True)

    tracker = FieldTracker()

    class Meta:
        verbose_name_plural = 'Categories'

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        from cms.controllers.zendesk import Exporter
        exporter = Exporter(customization_name=self.site.customization)
        previous_general_title = self.tracker.previous('general_section_title')
        general_changed = previous_general_title != self.general_section_title
        previous_name = self.tracker.previous('name')
        name_changed = previous_name != self.name

        if general_changed:
            existing_section = self.zendesksection_set.filter(
                name=previous_general_title).first()
            if existing_section:
                existing_section.name = self.general_section_title
                existing_section.needs_sync = True
                existing_section.save()
                exporter.sync_section(existing_section, delete=False)

        if name_changed:
            exporter.sync_category(self, delete=False)

        super().save(*args, **kwargs)

    @property
    def general_section(self):
        return self.zendesksection_set.filter(name=self.general_section_title).first()

    @property
    def admin_link(self):
        return reverse('admin:cms_zendeskcategory_change', args=(self.id,))


class ZendeskSection(models.Model):
    site = models.ForeignKey(ZendeskSite, on_delete=models.CASCADE)
    menu_node = models.ForeignKey(
        MenuNode, blank=True, null=True, on_delete=models.CASCADE)
    parent_category = models.ForeignKey(
        ZendeskCategory, blank=True, null=True, on_delete=models.CASCADE)
    parent_section = models.ForeignKey(
        'self', blank=True, null=True, on_delete=models.CASCADE)
    section_id = models.BigIntegerField(blank=True, null=True)
    position = models.IntegerField(default=0)
    name = models.CharField(max_length=500, blank=True)

    sync = models.BooleanField(default=True)
    needs_sync = models.BooleanField(default=False)

    def __str__(self):
        return self.name

    @property
    def admin_link(self):
        return reverse('admin:cms_zendesksection_change', args=(self.id,))

    def get_parent_category_id(self):
        current_section = self
        while not current_section.parent_category:
            current_section = current_section.parent_section
        return current_section.parent_category.category_id


class ZendeskArticleLabel(models.Model):
    site = models.ForeignKey(ZendeskSite, on_delete=models.CASCADE)
    label_id = models.BigIntegerField(blank=True, null=True)
    name = models.CharField(max_length=255)

    def __str__(self):
        return self.name


class ZendeskArticleManager(models.Manager):
    def create(self, **kwargs):
        article = kwargs.pop('article', {})
        fields = ['author_id', 'comments_disabled', 'created_at', 'draft',
                  'edited_at', 'html_url', 'permission_group_id', 'position',
                  'promoted', 'title', 'updated_at', 'user_segment_id']
        kwarg_mapping = {
            field: getattr(article, field, None)
            for field in fields
            if field not in kwargs}
        kwarg_mapping['article_id'] = article.id

        return super().create(**kwargs, **kwarg_mapping)


class ZendeskArticle(models.Model):
    site = models.ForeignKey(ZendeskSite, on_delete=models.CASCADE)
    section = models.ForeignKey(ZendeskSection, on_delete=models.CASCADE)

    # ZD article meta properties
    article_id = models.BigIntegerField(blank=True, null=True)
    author_id = models.BigIntegerField(blank=True, null=True)
    comments_disabled = models.BooleanField(default=True)
    created_at = models.CharField(max_length=100, blank=True)
    draft = models.BooleanField(default=False)
    edited_at = models.CharField(max_length=100, blank=True)
    html_url = models.CharField(max_length=1000, blank=True)
    labels = models.ManyToManyField(ZendeskArticleLabel, blank=True)
    permission_group_id = models.BigIntegerField(blank=True, null=True)
    position = models.IntegerField(default=0)
    promoted = models.BooleanField(default=False)
    title = models.CharField(max_length=500, blank=True)
    updated_at = models.CharField(max_length=100, blank=True)
    user_segment_id = models.BigIntegerField(blank=True, null=True)

    asset = models.ForeignKey(Asset, on_delete=models.CASCADE)
    menu_node = models.ForeignKey(
        MenuNode, blank=True, null=True, on_delete=models.CASCADE)
    sync = models.BooleanField(default=True)

    needs_sync = models.BooleanField(default=False)
    ignore_structure = models.BooleanField(default=False)

    objects = ZendeskArticleManager()

    def __str__(self):
        return f'{self.title} ({self.article_id})'

    @property
    def admin_link(self):
        return reverse('admin:cms_zendeskarticle_change', args=(self.id,))

    @property
    def menu_sync_enabled(self):
        return self.menu_node.get_parent().zendesk_sync_enabled.filter(name=self.site.customization).exists()

    def cancel_existing_sync(self):
        ZendeskSyncItem.cancel_existing_sync(self)

    def latest_sync(self, sync_log):
        latest = ZendeskSyncItem.objects.filter(zendesk_article=self).last()
        return latest.sync_log == sync_log if latest else True

    def map_sync_stats(self, customization, target=[], include_published=False):
        if not self.sync or not self.article_id:
            return target

        published_version = self.asset.version_id(customization=customization)
        successful_syncs = self.zendesksyncitem_set.filter(
            state=SYNC_STATES.success, sync_log__zendesk_site__customization__name=customization, zendesk_article=self)
        update_to_date = next(filter(lambda sync: published_version == 0 or (
            sync.review.version.id == published_version), successful_syncs), None)

        if include_published or not published_version or not update_to_date:
            last_success = successful_syncs.last()
            mapped = {
                'admin_link': self.asset.admin_link,
                'title': self.asset.name,
                'latest_version': published_version,
                'last_sync_version': last_success.review_id if last_success else 0,
                'last_sync_time': last_success.sync_log.sync_time.timestamp() if last_success else 0
            }

            if not next(filter(lambda existing: existing['latest_version'] == mapped['latest_version'], target), None):
                target.append(mapped)

        return target


SYNC_STATES = Choices((0, "in_progress", "In Progress"),
                      (1, "success", "Success"),
                      (2, "failed", "Failed"),
                      (3, "canceled", "Canceled"))


@receiver(pre_delete, sender=ZendeskArticle)
def archive_on_zendesk(sender, instance, **kwargs):
    from cms.controllers.zendesk import Exporter
    if not instance.ignore_structure:
        Exporter(customization_name=instance.site.customization.name).sync_article(
            instance, delete=True)


class ZendeskSyncLog(models.Model):
    SYNC_STATES = SYNC_STATES
    sync_time = models.DateTimeField(auto_now_add=True)
    menu = models.ForeignKey(Menu, on_delete=models.CASCADE, editable=False)
    zendesk_site = models.ForeignKey(
        ZendeskSite, on_delete=models.CASCADE, editable=False)
    zendesk_category = models.ForeignKey(
        ZendeskCategory, on_delete=models.CASCADE, editable=False)

    @staticmethod
    def cancel_existing_sync(log_id):
        sync_log = ZendeskSyncLog.objects.filter(id=log_id).first()

        if not sync_log:
            return

        for sync_item in sync_log.sync_items.all():
            sync_item.mark_canceled()

    @property
    def sync_info(self):
        def get_state(state_id):
            return SYNC_STATES[state_id]

        state = get_state(SYNC_STATES.in_progress)

        sections = []
        articles = []

        nodes_total = self.sync_items.count()
        nodes_failed = 0
        nodes_success = 0
        nodes_canceled = 0
        nodes_in_progress = 0

        for item in self.sync_items.all():
            section = item.details['section']
            article = item.details['article']
            if item.state == SYNC_STATES.success:
                nodes_success += 1
            elif item.state == SYNC_STATES.failed:
                nodes_failed += 1
            elif item.state == SYNC_STATES.canceled:
                nodes_canceled += 1
            else:
                nodes_in_progress += 1

            section_added = next(
                filter(lambda existing_item: existing_item['zd_section_id'] == section['zd_section_id'] and
                       existing_item['zd_section_id'] is not None,
                       sections), None)
            article_added = next(
                filter(lambda existing_item: existing_item['zd_article_id'] == article['zd_article_id'] and
                       existing_item['zd_article_id'] is not None, articles), None)
            if not section_added:
                sections.append(section)
            if not article_added:
                articles.append(article)

        progress = round(nodes_success / nodes_total *
                         100) if nodes_success else 0

        sync_time = self.sync_time
        pending_time = datetime.now() - timedelta(seconds=30)
        pending = sync_time > pending_time

        if nodes_failed or not nodes_total and not pending:
            state = get_state(SYNC_STATES.failed)
        elif nodes_canceled:
            state = get_state(SYNC_STATES.canceled)
        elif progress == 100:
            state = get_state(SYNC_STATES.success)

        return {
            'summary': {
                'log_id': self.id,
                'sync_time': self.sync_time.timestamp(),
                'state': state,
                'progress_percentage': progress,
                'total': nodes_total,
                'success': nodes_success,
                'in_progress': nodes_in_progress,
                'failed': nodes_failed,
            },
            'details': {
                'sections': sections,
                'articles': articles
            }
        }


class ZendeskSyncItem(models.Model):
    SYNC_STATES = SYNC_STATES
    sync_log = models.ForeignKey(ZendeskSyncLog,
                                 on_delete=models.CASCADE, related_name='sync_items', editable=False)
    menu_node = models.ForeignKey(
        MenuNode, on_delete=models.CASCADE, editable=False)
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, editable=False)
    review = models.ForeignKey(
        AssetCustomizationReview, on_delete=models.CASCADE, editable=False, null=True, blank=True)
    zendesk_section = models.ForeignKey(
        ZendeskSection, on_delete=models.CASCADE, editable=False)
    zendesk_article = models.ForeignKey(
        ZendeskArticle, on_delete=models.CASCADE, editable=False)
    state = models.IntegerField(
        choices=SYNC_STATES, default=SYNC_STATES.in_progress)
    failure_message = models.TextField(null=True)

    def __init__(self, *args, **kwargs):
        article = kwargs.get('zendesk_article', None)
        if article:
            self.cancel_existing_sync(article)
        super().__init__(*args, **kwargs)

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        PACKAGE_CACHE = PackagesCache()

        def clear_item(key):
            del PACKAGE_CACHE[f'menu_sync_{menu.id}_{key}']
        menu = self.menu_node.get_parent()
        clear_item(self.sync_log.id)
        clear_item(self.sync_log.zendesk_site.customization.name)

    @staticmethod
    def cancel_existing_sync(zd_article):
        for article in ZendeskSyncItem.objects.filter(zendesk_article=zd_article):
            article.mark_canceled()

    @property
    def details(self):
        title_structure = DataStructure.objects.filter(
            context__asset_type__type=AssetType.ASSET_TYPES.documentation, name='title').first()
        title = DataStructure.find_actual_values(
            [title_structure], asset=self.asset, version_id=getattr(self.review, 'id', 0), customization_name=self.sync_log.zendesk_site.customization.name
        ).get(title_structure, self.zendesk_article.title)
        menu_node_id = getattr(self.zendesk_section.menu_node, 'id', 0)
        menu_node_admin_link = getattr(
            self.zendesk_section.menu_node, 'admin_link', '')
        return {
            'section': {
                'zd_section_id': self.zendesk_section.section_id,
                'zd_section_admin': self.zendesk_section.admin_link,
                'menu_node_id': menu_node_id,
                'menu_node_admin': menu_node_admin_link,
                'section_name': self.zendesk_section.name,
                'state': SYNC_STATES[self.state]
            },
            'article': {
                'zd_article_id': self.zendesk_article.article_id,
                'zd_article_admin': self.zendesk_article.admin_link,
                'menu_node_id': menu_node_id,
                'menu_node_admin': menu_node_admin_link,
                'asset_id': self.zendesk_article.asset.id,
                'asset_admin': self.zendesk_article.asset.admin_link,
                'asset_title': title,
                'failure_message': self.failure_message,
                'review_id': getattr(self.review, 'id', 0),
                'review_admin': reverse('admin:cms_assetcustomizationreview_change', args=(self.review.id,)) if self.review else '',
                'state': SYNC_STATES[self.state]
            }
        }

    def __update_state(self, state, exception: Exception = None):
        if self.state != SYNC_STATES.in_progress:
            return
        self.state = state
        if exception:
            self.failure_message = str(exception)
        self.save()

    def mark_completed(self):
        self.__update_state(self.SYNC_STATES.success)

    def mark_canceled(self):
        self.__update_state(self.SYNC_STATES.canceled)

    def mark_failed(self, message):
        self.__update_state(self.SYNC_STATES.failed, message)


# End Zendesk Models


class LicenseType(models.Model):
    name = models.CharField(max_length=100, blank=False,
                            null=False, unique=True)
    title = models.CharField(max_length=100, blank=False, null=False)
    deactivations_allowed = models.PositiveIntegerField(
        default=3, blank=False, null=False)

    @staticmethod
    def get_license_types():
        license_types = list(LicenseType.objects.all().values(
            'name', 'title', 'deactivations_allowed'))
        return [{"deactivationsAllowed" if k == 'deactivations_allowed' else k: v
                 for k, v in license.items()}
                for license in license_types]


class CustomClient(models.Model):
    name = models.CharField(max_length=100)
    last_modified = models.DateTimeField(auto_now=True)
    base_vms = models.ForeignKey(
        Asset, on_delete=models.CASCADE, limit_choices_to={
            'asset_type__type': AssetType.ASSET_TYPES.vms}
    )
    values = JSONField(default={})
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    created_on = models.DateTimeField(auto_now_add=True)
    created_customization = models.ForeignKey(
        Customization, null=True, on_delete=models.CASCADE)


class PortalNotification(models.Model):
    title = models.TextField(help_text='Title of notification')
    body = models.TextField(help_text='Body text of notification')
    min_ts = models.DateTimeField(
        null=True, blank=True, help_text='Notification should not be shown before this time')
    max_ts = models.DateTimeField(
        null=True, blank=True, help_text='Notification should not be shown after this time')
    build_raw = models.FloatField(
        null=True, blank=True, help_text="Stores build as a float, don't use directly, instead use build attribute/kwarg")
    users_viewed = models.ManyToManyField('api.Account')
    url = models.URLField(
        null=True, blank=True, help_text='Where to navigate if notification is clicked')

    def __init__(self, *args, **kwargs):
        if (build_raw := kwargs.pop('build_raw', None)) and not isinstance(build_raw, float):
            raise ValueError(
                "Don't use build_raw directly, instead use build kwarg")

        if build := kwargs.pop('build', None):
            kwargs['build_raw'] = PortalNotification.calc_build(build)

        super().__init__(*args, **kwargs)

    @property
    def build(self):
        return PortalNotification.parse_build(self.build_raw)

    @build.setter
    def build(self, value: str):
        self.build_raw = PortalNotification.calc_build(value)

    def get_serialized(self):
        from cms.serializers import PortalNotificationSerializer
        return PortalNotificationSerializer(self).data

    @staticmethod
    def parse_build(build_version: float) -> str:
        friendly_version = "{:,}".format(build_version or 0).replace(',', '.')

        friendly_version = re.sub("\.0",  ".", friendly_version)
        if (last_index := friendly_version.rindex('.')) > (expected_last := len(friendly_version) - 6):
            friendly_version += (last_index - expected_last) * '0'

        return friendly_version if friendly_version != '0' else ''

    @staticmethod
    def calc_build(build_version: str) -> float:
        build, *segments = [float(segment or 0)
                            for segment in build_version.split('.')[::-1]]

        while build > 1:
            build /= 10

        for index, segment in enumerate(segments):
            position = pow(1000, index) or 1
            build += segment * position

        return build


class MaintenanceScheduling(models.Model):
    datetime = models.DateTimeField(help_text='Maintenance scheduled datetime')
    components = models.TextField(help_text='List of affected components')
    partner_message = models.TextField(
        help_text='List of affected partner features')
    user_message = models.TextField(
        help_text='List of affected end user features')
    custom = models.TextField(help_text='Custom message text')
    portal_notification = models.ForeignKey(
        PortalNotification, on_delete=models.SET_NULL, null=True, blank=True, help_text='Related notification')

    MESSAGE_TITLE = 'Maintenance Scheduled'

    def get_serialized_notification(self):
        return {
            'title': self.MESSAGE_TITLE,
            'body': self.user_message,
            'min_ts': self.datetime,
            'max_ts': completed.datetime if (completed := self.maintenancecompletion_set.first()) else self.datetime + timedelta(weeks=1)
        }

    def save(self, *args, **kwargs):
        portal_notification = None

        if not self.user_message:
            if self.portal_notification:
                self.portal_notification.delete()
                self.portal_notification = None
            if (mc := self.maintenancecompletion_set.first()) and mc.portal_notification:
                mc.portal_notification.delete()

        else:
            portal_notification = self.portal_notification or PortalNotification()

            for attr, val in self.get_serialized_notification().items():
                setattr(portal_notification, attr, val)

            portal_notification.save()

        super().save(*args, **kwargs)

        if portal_notification:
            portal_notification.maintenancescheduling_set.add(self)


class MaintenanceCompletion(models.Model):
    datetime = models.DateTimeField(help_text='Maintenance completed datetime')
    partner_message = models.TextField(
        help_text='List of affected partner features')
    custom = models.TextField(help_text='Custom message text')
    scheduled_maintenance = models.ForeignKey(
        MaintenanceScheduling, on_delete=models.SET_NULL, null=True, blank=True, help_text='Related scheduled maintenance')
    portal_notification = models.ForeignKey(
        PortalNotification, on_delete=models.SET_NULL, null=True, blank=True, help_text='Related notification')

    MESSAGE_TITLE = 'Maintenance Completed'

    def save(self, *args, **kwargs):
        portal_notification = None
        if (scheduled := self.scheduled_maintenance) and scheduled.user_message:
            portal_notification = self.portal_notification or PortalNotification()
            notification_dict = {
                'body': scheduled.get_serialized_notification()['body'],
                'title': self.MESSAGE_TITLE,
                'min_ts': self.datetime,
                'max_ts': self.datetime + timedelta(weeks=1)
            }

            for attr, val in notification_dict.items():
                setattr(portal_notification, attr, val)

            portal_notification.save()

            if scheduled.portal_notification:
                scheduled.portal_notification.max_ts = self.datetime
                scheduled.portal_notification.save()

        elif self.portal_notification:
            self.portal_notification.delete()

        super().save(*args, **kwargs)

        if portal_notification:
            portal_notification.maintenancecompletion_set.add(self)

version_validator = RegexValidator(r"^(\d)\.(\d){1,2}\.(\d){1,2}\.(\d){5}$", "Version should be in a valid format. ex: 5.12.11.11111")

class ReadOnlyAPI(models.Model):
    class Meta:
        verbose_name = "Readonly API"

    API_TYPES = Choices((0, "VMS", "VMS"))

    name = models.CharField(help_text="API display name", max_length=36)
    version = models.CharField(help_text="API version", max_length=13, validators=[version_validator])
    type = models.IntegerField(
       choices=API_TYPES, default=API_TYPES.VMS)
    enabled = models.BooleanField(default=True)
    manifest = models.TextField(default=DEFAULT_MANIFEST, help_text="Content manifest")

    def save(self, *args, **kwargs):
        if self.id:
            # Clear cache
            READONLY_API_CACHE.lookup_key = "readonlyapi-" + str(self.id)
            READONLY_API_CACHE.set_cached_item({})

        super().save(*args, **kwargs)

    def clean(self):
        try:
            json.loads(self.manifest)
        except JSONDecodeError:
            raise ValidationError({'content': 'Content is not valid JSON'})

    def __str__(self):
        return f"{self.name} - {self.version}"

class ReadOnlyAPIFile(models.Model):
    class Meta:
        verbose_name = "Readonly API file"

    FILE_TYPES = Choices((0, "json", "JSON"),  (1, "preamble_markdown", "Preamble Markdown File"), (2, "changelog_markdown", "Changelog Markdown File"))
    readonly_api = models.ForeignKey(ReadOnlyAPI, on_delete=models.CASCADE)
    filename = models.CharField(max_length=46, help_text="File name must exist in the readonlyAPI's manifest")
    type = models.IntegerField(
        choices=FILE_TYPES, default=FILE_TYPES.json)
    content = models.TextField(blank=True, help_text="File contents")

    def clean(self):
        if self.type in [self.FILE_TYPES.json]:
            try:
                json.loads(self.content)
            except JSONDecodeError:
                raise ValidationError({'content': 'Content is not valid JSON'})
            manifest = json.loads(self.readonly_api.manifest)
            filename_found = False
            try:
                for type in manifest:
                    for section in type['sections']:
                        if section['scheme'] == self.filename:
                            filename_found = True
            except Exception:
                raise ValidationError({'content': 'Error parsing manifest to validate file name'})
            if not filename_found:
                raise ValidationError({'content': 'File name does not exist in manifest'})


    def validate_unique(self, exclude=None):
        if self.type in [self.FILE_TYPES.preamble_markdown, self.FILE_TYPES.changelog_markdown]:
            existing_file = ReadOnlyAPIFile.objects.filter(type=self.type, readonly_api=self.readonly_api).exclude(id=self.id)
            if existing_file:
                raise ValidationError('This file type is unique and already exists for this Readonly API')
            super(ReadOnlyAPIFile, self).validate_unique(exclude=exclude)

    def save(self, *args, **kwargs):
        # Clear cache
        READONLY_API_CACHE.lookup_key = "readonlyapi-" + str(self.readonly_api.id)
        READONLY_API_CACHE.set_cached_item({})
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.readonly_api.name}'s {self.filename}"

class Flag(AbstractUserFlag):
    FLAG_DS_VAL_CACHE_KEY = 'flag:%s:ds_val'

    data_structure = models.ForeignKey(
        DataStructure, blank=True, null=True, on_delete=models.SET_NULL)

    @classmethod
    def _ds_cache_key(cls, name, customization_name):
        return keyfmt(cls.FLAG_DS_VAL_CACHE_KEY, f'{name}--{customization_name}')

    def _get_data_structure_value(self, customization_name):
        flag_cache = get_cache()
        cache_key = self._ds_cache_key(self.name, customization_name)
        cached = flag_cache.get(cache_key)
        if cached:
            return cached

        ds_val = self.data_structure.find_actual_value(
            get_cloud_portal_asset(customization=customization_name))

        flag_cache.add(cache_key, ds_val)
        return ds_val

    @classmethod
    def flush_global_vals(cls):
        customizations = Customization.objects.values_list('name', flat=True)
        keys = [
            cls._ds_cache_key(flag.name, cust_name)
            for flag in cls.objects.filter(data_structure__isnull=False)
            for cust_name in customizations
        ]
        flag_cache = get_cache()
        flag_cache.delete_many(keys)

    def get_json_key(self):
        return FLAGS.json_key(FLAGS.value_to_key(self.name))

    def is_active(self, request):
        if override := request.META.get(f'HTTP_FEATURE_{self.get_json_key()}'.upper()):
            with suppress(ValueError):
                return bool(int(override))

        return super(AbstractUserFlag, self).is_active(request)


    def is_active_for_user(self, user, overrides=None, *, customization=None, request=None):
        from util.helpers import get_customization
        customization = customization or get_customization(request)
        if override := (overrides or {}).get(f'HTTP_FEATURE_{self.get_json_key()}'.upper()):
            with suppress(ValueError):
                return bool(int(override))

        if is_active := super(AbstractUserFlag, self).is_active_for_user(user):
            return is_active

        user_ids = self._get_user_ids()
        if hasattr(user, 'pk') and user.pk in user_ids:
            return True

        if hasattr(user, 'groups'):
            if group_ids := self._get_group_ids():
                user_groups = set(user.groups.filter(
                    Q(options__all_assets=True, usergroupstoassettype__asset_type__type=AssetType.ASSET_TYPES.cloud_portal) |
                    Q(usergroupstoassetpermissions__asset__asset_type__type=AssetType.ASSET_TYPES.cloud_portal,
                      usergroupstoassetpermissions__asset__customizations__name=customization)
                ).values_list('pk', flat=True))
                if group_ids.intersection(user_groups):
                    return True

        try:
            if self.data_structure and self.everyone is not False and self._get_data_structure_value(customization):
                return True
        except:
            pass

        return None

    def save(self, *args, **kwargs):
        if not self.pk:
            if (key := FLAGS.value_to_key(self.name)) and (ds_name := FLAGS.data_structure_name(key)) and \
                    (ds := DataStructure.objects.filter(context__asset_type__type=AssetType.ASSET_TYPES.cloud_portal,
                                                        name=ds_name).first()):
                self.data_structure = ds
        ret = super().save(*args, **kwargs)
        Flag.flush_global_vals()
        return ret

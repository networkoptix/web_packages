import os
import re
import json
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from distutils.util import strtobool
from util.base_cache import BaseCache

from django.core.exceptions import ObjectDoesNotExist
from django.db import models
from django.db.models import Q
from django.db.models.deletion import Collector
from django.db.models.signals import post_delete, m2m_changed
from django.db.utils import ProgrammingError
from django.dispatch import receiver
from django.utils.functional import cached_property
from django.conf import settings
from django.core.exceptions import ValidationError, FieldError
from jsonfield import JSONField
from model_utils import Choices
from django.core.cache import cache, caches
from util.config import get_config

from django.contrib.auth.models import Group, Permission
from django.template.defaultfilters import truncatechars
from cloud.storage_backend import MediaStorage


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
        super().clear_cache()
        DOC_CACHE.clear_cache()


MENU_CACHE = MenuCache()


def create_default_permission_group(asset):
    if not (asset.is_cloud_portal or asset.is_integration):
        return None

    if asset.is_cloud_portal:
        group = Group.objects.create(
            name=f'Portal Manager - {asset.name} - {asset.id}')
        permissions = Permission.objects.filter(codename__in=['access_customization', 'change_account',
                                                              'change_assetcustomizationreview',
                                                              'change_asset', 'edit_content',
                                                              'force_update', 'publish_version'])

        # Bind the Group to the following asset_types so that the portal managers can review them
        asset_types = AssetType.objects.filter(name="",
                                               type__in=[AssetType.ASSET_TYPES.cloud_portal,
                                                         AssetType.ASSET_TYPES.integration])
        for asset_type in asset_types:
            UserGroupsToAssetType.objects.create(
                asset_type=asset_type, group=group)

    else:
        group = Group.objects.create(
            name=f'Developer - {asset.name} - {asset.id}')
        permissions = Permission.objects.filter(
            codename__in=['edit_content', 'change_asset',
                          'change_assetcustomizationreview']
        )

    group.permissions.set(permissions)
    UserGroupsToAssetPermissions.objects.create(asset=asset, group=group)

    return group


def rename_permission_group(group, asset):
    if asset.is_cloud_portal:
        group.name = f'Portal Manager - {asset.name} - {asset.id}'
    else:
        group.name = f'Developer - {asset.name} - {asset.id}'
    group.save()


def get_cloud_portal_asset(customization=settings.CUSTOMIZATION):
    asset = Asset.objects.filter(
        customizations__name__in=[customization], asset_type__name="",
        asset_type__type=AssetType.ASSET_TYPES.cloud_portal
    ).first()
    if asset:
        return asset

    customization_obj = Customization.objects.filter(
        name=customization).first()
    if customization_obj:
        asset_type = AssetType.objects.get(
            type=AssetType.ASSET_TYPES.cloud_portal, name='')
        cloud_portal = Asset.objects.create(name=f"Cloud portal - {customization}",
                                            asset_type=asset_type)
        cloud_portal.customizations.set([customization_obj])
        return cloud_portal
    raise Asset.DoesNotExist(f"No cloud portal asset found for {customization}. "
                             f"Most likely a customization with the name \"{customization}\" doesn't exist.")


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
    asset = get_cloud_portal_asset(customization_name)

    if data and 'version_id' in data and not force:
        force = check_update_cache(customization_name, data['version_id'])[0]

    if not data or force:
        customization = Customization.objects.get(name=customization_name)
        custom_config = get_config(customization.name)

        integration_store_enabled = asset.read_global_value(
            "%INTEGRATION_STORE_ENABLED%")

        public_push_config = asset.read_global_value("%PUSH_CONFIG_WEB%") or \
            getattr(settings, 'PUSH_NOTIFICATIONS_SETTINGS', {}).get('PUBLIC')

        data = {
            'version_id': asset.version_id(),
            'languages': customization.languages_list,
            'default_language': customization.default_language.code,
            'email': {
                'mail_from_name': asset.read_global_value('%MAIL_FROM_NAME%'),
                'mail_from_email': asset.read_global_value('%MAIL_FROM_EMAIL%'),
                'portal_url': SpecialStructures.calc_cloud_link(asset),
                'smtp_host': asset.read_global_value('%SMTP_HOST%'),
                'smtp_port': asset.read_global_value('%SMTP_PORT%'),
                'smtp_user': asset.read_global_value('%SMTP_USER%'),
                'smtp_password': asset.read_global_value('%SMTP_PASSWORD%'),
                'smtp_tls': asset.read_global_value('%SMTP_TLS%')
            },
            'config': {
                'app_types_for_platform': asset.read_global_value('%APP_TYPES_FOR_PLATFORM%'),
                'available_downloads_platform': asset.read_global_value('%AVAILABLE_DOWNLOADS_PLATFORM%'),
                'cloud_storage_enabled': asset.read_global_value("%CLOUD_STORAGE_ENABLED%"),
                'cloud_storage_size': asset.read_global_value('%CLOUD_STORAGE_SIZE%'),
                'copyright_year': asset.read_global_value("%COPYRIGHT_YEAR%"),
                'company_name': asset.read_global_value("%COMPANY_NAME%"),
                'company_link': asset.read_global_value("%COMPANY_LINK%"),
                'developers_enabled': asset.read_global_value("%DEVELOPERS_ENABLED%"),
                'feedback_enabled': asset.read_global_value("%FEEDBACK_ENABLED%"),
                'integration_filter_items': asset.read_global_value("%INTEGRATION_FILTER_ITEMS%"),
                'integration_filter_limitation': asset.read_global_value("%INTEGRATION_SHOW_FILTER_LIMITATION%"),
                'integration_seo_page_description': asset.read_global_value("%INTEGRATION_SEO_PAGE_DESCRIPTION%"),
                'integration_store_enabled': integration_store_enabled,
                'health_monitor_cache_timeout': asset.read_global_value('%HM_CACHE_TIMEOUT%'),
                'public_downloads': asset.read_global_value("%PUBLIC_DOWNLOADS%"),
                'public_releases': asset.read_global_value("%PUBLIC_RELEASE_HISTORY%"),
                'show_analytics_events': asset.read_global_value("%SHOW_ANALYTICS_EVENTS%"),
                'sort_supported_devices_by_popularity': asset.read_global_value(
                    "%SORT_SUPPORTED_DEVICES_BY_POPULARITY%"),
                'support_link': asset.read_global_value("%SUPPORT_LINK%"),
                'privacy_link': asset.read_global_value("%PRIVACY_LINK%"),
                'supported_resolutions': asset.read_global_value("%SUPPORTED_RESOLUTIONS%"),
                'supported_hardware_types': asset.read_global_value("%SUPPORTED_HARDWARE_TYPES%"),
                'search_tags': asset.read_global_value("%SEARCH_TAGS%"),
                'tested_operating_systems': asset.read_global_value("%TESTED_OPERATING_SYSTEMS%"),
                'vendors_shown': asset.read_global_value("%VENDORS_SHOWN%"),
                'cloud_name': asset.read_global_value("%CLOUD_NAME%"),
                'vms_name': asset.read_global_value("%VMS_NAME%"),
                'push_config': public_push_config,
                'google_tag_manager_id': asset.read_global_value('%GOOGLE_TAG_MANAGER_ID%'),
                'trial_license_key': asset.read_global_value('%TRIAL_LICENSE_KEY%')
            },
            'cloud_capabilities': {
                'integration_store_enabled': integration_store_enabled,
                'reviews_enabled': asset.read_global_value('%REVIEWS_ENABLED%')
            }
        }
        customization_cache.set(f'customization_{customization_name}', data)
        update_global_cache(customization, data['version_id'])

    if value:
        return data.get(value)

    return data


def check_user_menu_permissions(nodes, user):
    for i in reversed(range(len(nodes))):
        node = nodes[i]
        condition = node.pop('condition', None)
        condition_met = node.pop('condition_met', False)
        beta_permission = Customization.BETA_PERMISSION_MAP.get(
            condition, None)
        if not condition_met and condition and \
                not (user and beta_permission and UserGroupsToAssetPermissions.check_customization_permission(
                    user, settings.CUSTOMIZATION, f'cms.{beta_permission}'
                )):
            del nodes[i]
        else:
            permissions = node.get('permissions', [])
            for permission_codename in permissions:
                if not (user and UserGroupsToAssetPermissions.check_customization_permission(
                        user, settings.CUSTOMIZATION, f'cms.{permission_codename}'
                )):
                    del nodes[i]
                    break
            else:
                node.pop('permissions', None)
                check_user_menu_permissions(node.get('nodes', []), user)


def cached_doc_menu_map(customization_name, refresh=False):
    cache_key = f'{customization_name}-doc-dir'
    menu_map = MENU_CACHE[cache_key]
    if refresh or not menu_map:
        menu_map = {}
        for menu in Menu.objects.filter(type__in=[Menu.MENU_TYPES.docs_struct, Menu.MENU_TYPES.docs_knowledgebase]):
            if menu.base_url not in menu_map:
                menu_map[menu.base_url] = {}
            if menu.url not in menu_map[menu.base_url]:
                menu_map[menu.base_url][menu.url] = menu.name

        MENU_CACHE[cache_key] = menu_map
    return menu_map


def get_cached_menu(customization_name, name=None, user=None, menu_type=None):
    menu_customization = MENU_CACHE[customization_name]
    if menu_customization is None:
        menu_customization = Menu.generate_menus(customization_name)
        MENU_CACHE[customization_name] = menu_customization
        cached_doc_menu_map(customization_name, refresh=True)
    for menu_name, menu in menu_customization.items():
        check_user_menu_permissions(menu['nodes'], user)
    if name:
        menu = menu_customization.get(name.lower(), None)
        if menu and menu['type'] == menu_type:
            return menu
        else:
            return None
    return menu_customization


def slugify(name, lowercase=False):
    if lowercase:
        name = name.lower()
    unsafe_chars = re.compile(r'[^a-z0-9-]', flags=re.IGNORECASE)
    return unsafe_chars.sub('-', name)


def rename_file(instance, filename):
    asset_name = slugify(instance.asset.name, True)
    structure_name = slugify(instance.data_structure.name, True)
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
            ('access_developers', 'Can see Developers pages')
        )
    name = models.CharField(max_length=255, unique=True)
    default_language = models.ForeignKey(
        Language, related_name='default_in_%(class)s', on_delete=models.CASCADE)
    languages = models.ManyToManyField(Language)
    filter_horizontal = ('languages',)

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
            asset_type = AssetType.objects.get(name="", single_customization=True,
                                               type=AssetType.ASSET_TYPES.cloud_portal)
            cloud_portal = Asset.objects.create(name=f"Cloud portal - {self.name}",
                                                asset_type=asset_type)
            cloud_portal.customizations.set([self])


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
                          (6, "documentation", "Documentation Page"))
    name = models.CharField(max_length=255, default="", blank=True)
    can_preview = models.BooleanField(default=False)
    single_customization = models.BooleanField(default=False)
    type = models.IntegerField(
        choices=ASSET_TYPES, default=ASSET_TYPES.cloud_portal)
    advanced = models.BooleanField(default=True)

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

        for index, _name in AssetType.ASSET_TYPES:
            if _name == name:
                return index
        return 0

    def get_customizations(self, asset):
        return self.asset_set.exclude(id=asset.id).exclude(customizations=None).\
            values_list('customizations__name', flat=True)


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
    def is_single_customization(self):
        return self.asset_type.single_customization

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
    def version_ids(cls, assets, customization=settings.CUSTOMIZATION):
        asset_ids = {asset.id for asset in assets}
        version_dict = {}
        accepted_reviews = AssetCustomizationReview.objects.filter(
            customization__name=customization, state=AssetCustomizationReview.REVIEW_STATES.accepted,
            version__asset__in=assets
        ).order_by('-pk').select_related('version').only('version')

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

    def get_state(self, asset):
        # (State, order) In order of importance. Only update a state if the new state is more important
        INCOMPLETE = ('Incomplete', 0)
        DRAFT = ('Draft', 1)
        IN_REVIEW = ('In review', 2)
        REJECTED = ('Rejected', 3)
        PUBLISHED = ('Published', 4)

        customization = settings.CUSTOMIZATION
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
                         (13, 'integer', 'Integer'))

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

        elif data_structure.type in [DataStructure.DATA_TYPES.object, DataStructure.DATA_TYPES.array,
                                     DataStructure.DATA_TYPES.multiselect]:
            if not value:
                if data_structure.type in [DataStructure.DATA_TYPES.object]:
                    value = {}
                else:
                    value = []
            else:
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
        else:
            value = str(value)

        return value

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


# CMS settings. Release engineer can change that
class UserGroupsToAssetPermissions(models.Model):
    group = models.ForeignKey(Group, on_delete=models.CASCADE)
    asset = models.ForeignKey(
        Asset, default=None, null=True, on_delete=models.CASCADE)

    def __str__(self):
        return self.group.name

    @staticmethod
    def check_permission(user, asset, permission=None):
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
    def check_customization_permission(user, customization=settings.CUSTOMIZATION, permission=None):
        return UserGroupsToAssetPermissions.\
            check_permission(user, get_cloud_portal_asset(
                customization), permission)

    @staticmethod
    def check_customization_access(user, customization=settings.CUSTOMIZATION):
        return UserGroupsToAssetPermissions.\
            check_customization_permission(
                user, customization, "cms.access_customization")

    @staticmethod
    def check_customization_change_account(user, customization=settings.CUSTOMIZATION):
        return UserGroupsToAssetPermissions.\
            check_customization_permission(
                user, customization, "api.change_account")

    @staticmethod
    def check_customization_publish(user, customization=settings.CUSTOMIZATION):
        return UserGroupsToAssetPermissions.\
            check_customization_permission(
                user, customization, "cms.publish_version")

    @staticmethod
    def user_has_beta_access(user):
        return UserGroupsToAssetPermissions.\
            check_customization_permission(
                user, settings.CUSTOMIZATION, "cms.access_integration_store")

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

    @property
    def state(self):
        if not self.accepted_by:
            return 'in review'

        version_id = self.asset.version_id()

        if version_id > self.id:
            return 'old'

        return 'current'


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

    def __str__(self):
        return self.version.asset.__str__()

    def update_children_reviews(self):
        reviews = self.version.assetcustomizationreview_set.\
            filter(customization__in=self.customization.children_customizations.all())

        can_show_customization = UserGroupsToAssetPermissions. \
            check_customization_access(
                self.version.created_by, self.customization)

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

    def update_between_published_and_current(self, user, state):
        asset = self.version.asset
        customization_reviews = AssetCustomizationReview.objects.\
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


class ExternalFile(models.Model):
    data_structure = models.ForeignKey(
        DataStructure, default=None, null=True, on_delete=models.CASCADE)
    # Default limit is 100 chars. The new length comes from most paths being limited to 255 char.
    # Since we slugify the asset name, data structure name and file name we need a long length.
    file = models.FileField(upload_to=rename_file,
                            storage=MediaStorage(), max_length=1000)
    md5 = models.CharField(max_length=1024, default='')
    asset = models.ForeignKey(
        Asset, default=None, null=True, on_delete=models.CASCADE)
    size = models.FloatField(default=0.0)

    def __str__(self):
        return self.file.name


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
        if kwargs['instance'].external_file:
            f = kwargs['instance'].external_file
            collector = Collector(using='default')
            collector.collect([f], keep_parents=True)
            # Check if any other object is referencing the ExternalFile
            for model, instance in collector.instances_with_model():
                if model != ExternalFile and (model != DataRecord or instance.id != kwargs['instance'].id):
                    break
            else:
                f.delete()
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
    def get_current(customization=settings.CUSTOMIZATION):
        return AssetCustomizationReview.objects.filter(
            version__asset__asset_type__type=AssetType.ASSET_TYPES.agreement,
            state=AssetCustomizationReview.REVIEW_STATES.accepted, customization__name=customization
        ).order_by('-reviewed_date').first()

    def is_valid(self):
        review = self.get_current()
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
    admin_config = models.TextField(blank=False, help_text='customizes admin view', default=r"""{
        "header": ["name","url","enabled","order","is_global","preview"],
        "details": ["asset","icon","authentication"],
        "advanced": ["related_assets","next_item","condition","permissions", "new_window"]
    }""")

    def __str__(self):
        if self.name:
            return self.name
        else:
            return super().__str__()

    @property
    def preview_url(self):
        if self.type is self.MENU_TYPES.generic or not self.base_url and not self.url:
            return ''

        return f'/docs/{self.base_url}{"/" if self.base_url and self.url else ""}{self.url}?state=draft'

    @classmethod
    def generate_menus_for_customization(cls, menus, customization):
        from cms.controllers.filldata import global_contexts_to_dict
        cloud_portal_asset = get_cloud_portal_asset(customization.name)
        global_contexts = Context.objects.filter(
            asset_type=cloud_portal_asset.asset_type, is_global=True)
        global_contexts_dict = global_contexts_to_dict(
            global_contexts, cloud_portal_asset)
        structures = {}
        for menu in menus:
            structures[menu.name.lower()] = {
                'nodes': MenuNode.generate_node_structure(menu.nodes_list, cloud_portal_asset, customization, global_contexts_dict, max_depth=menu.depth),
                'type': menu.type,
                'base_url': menu.base_url
            }
        return customization, structures

    @classmethod
    def generate_menus(cls, customization_name=None):
        menus = cls.get_prefetched_menus()

        if customization_name:
            customizations = Customization.objects.filter(
                name=customization_name)
        else:
            customizations = [asset.customizations.first() for asset in Asset.objects.annotate(
                customization_count=models.Count('customizations')
            ).filter(asset_type__type=AssetType.ASSET_TYPES.cloud_portal, customization_count=1)]

        menu_customization_structure = {}

        with ThreadPoolExecutor(max_workers=4) as executer:
            futures = [executer.submit(cls.generate_menus_for_customization,
                                       menus, customization) for customization in customizations]

        for future in as_completed(futures):
            customization, structures = future.result()
            menu_customization_structure[customization.name] = structures

        return menu_customization_structure[customization_name] if customization_name else menu_customization_structure

    @classmethod
    def get_prefetched_menus(cls):
        max_depth = cls.objects.all().aggregate(
            models.Max('depth'))['depth__max']
        # Force qs evaluation to prevent threads from messing with prefetch cache
        return list(cls.objects.all().prefetch_related(*cls.get_prefetch_objects(max_depth=max_depth, depth=1)))

    @classmethod
    def get_prefetch_objects(cls, max_depth, depth=1):
        parent_node_lookup = '__'.join(['nodes_list' for _ in range(1, depth)])
        nodes_lookup = parent_node_lookup + '__nodes' if depth > 1 else 'nodes'
        nodes_to_attr = 'nodes_list'
        enabled_lookup = f'{parent_node_lookup}__{nodes_to_attr}__enabled' if depth > 1 else f'{nodes_to_attr}__enabled'
        permission_lookup = f'{parent_node_lookup}__{nodes_to_attr}__permissions' if depth > 1 else f'{nodes_to_attr}__permissions'
        related_assets_lookup = f'{parent_node_lookup}__{nodes_to_attr}__related_assets' if depth > 1 else f'{nodes_to_attr}__related_assets'
        prefetches = [models.Prefetch(nodes_lookup, queryset=MenuNode.objects.order_by('order').select_related('asset', 'asset__asset_type'),
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

    def to_dict(self):
        def get_nodes(nodes_list):
            nodes = []
            for node in nodes_list:
                node_dict = {
                    'name': node.name,
                    'url': node.url,
                    'asset': node.asset.name if node.asset else None,
                    'asset_type': node.asset.asset_type.type if node.asset else None,
                    'related_assets': [(asset.name, asset.asset_type.type) for asset in node.related_assets.all()],
                    'next_item': node.next_item,
                    'new_window': node.new_window,
                    'icon': node.icon,
                    'available': [customization.name for customization in node.available.all()],
                    'enabled': [customization.name for customization in node.enabled.all()],
                    'authentication': node.authentication,
                    'condition': node.condition,
                    'permissions': [permission.codename for permission in node.permissions.all()],
                    'order': node.order,
                    'is_global': node.is_global,
                    'touched': node.touched,
                    'nodes': get_nodes(getattr(node, 'nodes_list')) if hasattr(node, 'nodes_list') else []
                }

                nodes.append(node_dict)
            return nodes

        menu = next(menu for menu in Menu.get_prefetched_menus()
                    if menu.id == self.id)
        menu_dict = {
            'name': menu.name,
            'depth': menu.depth,
            'nodes': get_nodes(menu.nodes_list) if menu.nodes_list else []
        }

        return menu_dict

    def from_dict(self, menu_dict):
        def find_or_create_asset(name, asset_type, customizations):
            asset = Asset.objects.filter(
                name=name, asset_type__type=asset_type).first()
            if not asset:
                asset_type = AssetType.objects.filter(
                    type=asset_type, name='').order_by('pk').first()
                asset = Asset.objects.create(name=name, asset_type=asset_type)
                asset.customizations.set(list(customizations))
            return asset

        def set_nodes(nodes_list, parent):
            for node in nodes_list:
                if isinstance(parent, Menu):
                    parent_type = 'parent_menu'
                else:
                    parent_type = 'parent_node'
                node_obj = MenuNode.objects.filter(
                    name=node['name'], **{parent_type: parent}).first()
                if not node_obj:
                    node_obj = MenuNode()
                node_obj.name = node['name']
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
                node_obj.save()

                node_obj.available.set(
                    list(Customization.objects.filter(name__in=node['available'])))
                node_obj.enabled.set(
                    list(Customization.objects.filter(name__in=node['enabled'])))
                node_obj.permissions.set(
                    list(Permission.objects.filter(codename__in=node['permissions'])))

                if node_obj.is_global:
                    asset_customizations = Customization.objects.all()
                else:
                    asset_customizations = node_obj.available.all()
                if node['asset']:
                    node_obj.asset = find_or_create_asset(
                        node['asset'], node['asset_type'], asset_customizations)
                    node_obj.save()
                for asset, asset_type in node.get('related_assets', []):
                    node_obj.related_assets.add(find_or_create_asset(
                        asset, asset_type, asset_customizations))

                if node['nodes']:
                    set_nodes(node['nodes'], node_obj)

        self.depth = menu_dict['depth']
        self.save()
        if menu_dict['nodes']:
            set_nodes(menu_dict.get('nodes', []), self)


class MenuNode(models.Model):
    AUTH_CHOICES = Choices((0, "logged_out", "Logged Out"),
                           (1, "logged_in", "Logged In"),
                           (2, "both", "Both"))
    name = models.CharField(max_length=255)
    url = models.CharField(max_length=2048, blank=True)
    asset = models.ForeignKey(
        Asset, null=True, blank=True, on_delete=models.CASCADE, related_name='nodes')
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

    def __str__(self):
        return f'Item: {self.name}'

    @staticmethod
    def generate_node_structure(nodes, cloud_portal_asset, customization, global_contexts_dict, depth=1, max_depth=2):
        nodes_structure = []
        for node in nodes:
            enabled = next(
                (cust for cust in node.enabled_list if cust.id == customization.id), False)
            condition_met = not node.condition or global_contexts_dict.get(
                node.condition, False)
            asset_accepted = not node.asset or node.asset.version_id(
                customization.name) != 0
            if enabled and asset_accepted:
                node_structure = {
                    'name': cloud_portal_asset.replace_global_values(node.name, global_contexts_dict),
                    'url': cloud_portal_asset.replace_global_values(node.url, global_contexts_dict),
                    'asset_id': node.asset.id if node.asset else None,
                    'asset_type': AssetType.ASSET_TYPES[node.asset.asset_type.type] if node.asset else None,
                    'related_asset_ids': [asset.id for asset in node.related_assets.all()],
                    'next_item': node.next_item,
                    'new_window': node.new_window,
                    'icon': node.icon,
                    'permissions': list(node.permissions.values_list('codename', flat=True)),
                    'authentication': node.AUTH_CHOICES[node.authentication],
                    'order': node.order,
                    'condition': node.condition,
                    'condition_met': condition_met
                }
                node_structure['display_name'] = node_structure['name']

                if depth < max_depth and node.nodes_list:
                    node_structure['nodes'] = node.generate_node_structure(
                        node.nodes_list, cloud_portal_asset, customization, global_contexts_dict, depth + 1,
                        max_depth=max_depth
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


class ZendeskArticleLabel(models.Model):
    site = models.ForeignKey(ZendeskSite, on_delete=models.CASCADE)
    label_id = models.BigIntegerField(blank=True, null=True)
    name = models.CharField(max_length=255)


class ZendeskArticle(models.Model):
    site = models.ForeignKey(ZendeskSite, on_delete=models.CASCADE)
    section = models.ForeignKey(ZendeskSection, on_delete=models.CASCADE)

    # ZD article meta properties
    article_id = models.BigIntegerField(blank=True, null=True)
    author_id = models.BigIntegerField(blank=True, null=True)
    comments_disabled = models.BooleanField()
    created_at = models.CharField(max_length=100, blank=True)
    draft = models.BooleanField()
    edited_at = models.CharField(max_length=100, blank=True)
    html_url = models.CharField(max_length=1000, blank=True)
    labels = models.ManyToManyField(ZendeskArticleLabel)
    permission_group_id = models.BigIntegerField(blank=True, null=True)
    position = models.IntegerField(default=0)
    promoted = models.BooleanField()
    title = models.CharField(max_length=500, blank=True)
    updated_at = models.CharField(max_length=100, blank=True)
    user_segment_id = models.BigIntegerField(blank=True, null=True)

    asset = models.ForeignKey(Asset, on_delete=models.CASCADE)
    menu_node = models.ForeignKey(
        MenuNode, blank=True, null=True, on_delete=models.SET_NULL)

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

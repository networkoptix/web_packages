import os
import re
import json
from datetime import datetime
from distutils.util import strtobool
from django.db import models
from django.db.utils import ProgrammingError
from django.utils.functional import cached_property
from django.conf import settings
from django.core.exceptions import ValidationError, FieldError
from jsonfield import JSONField
from model_utils import Choices
from django.core.cache import cache, caches
from util.config import get_config

from django.contrib.auth.models import Group
from django.template.defaultfilters import truncatechars
from cloud.storage_backend import MediaStorage


def create_default_permission_group(asset):
    from django.contrib.auth.models import Permission
    if not (asset.is_cloud_portal or asset.is_integration):
        return None

    if asset.is_cloud_portal:
        group = Group.objects.create(name=f'Portal Manager - {asset.name} - {asset.id}')
        permissions = Permission.objects.filter(codename__in=['access_customization', 'change_account',
                                                              'change_assetcustomizationreview',
                                                              'change_asset', 'edit_content',
                                                              'force_update', 'publish_version'])

        # Bind the Group to the following asset_types so that the portal managers can review them
        asset_types = AssetType.objects.filter(name="",
                                               type__in=[AssetType.ASSET_TYPES.cloud_portal,
                                                         AssetType.ASSET_TYPES.integration])
        for asset_type in asset_types:
            UserGroupsToAssetType.objects.create(asset_type=asset_type, group=group)

    else:
        group = Group.objects.create(name=f'Developer - {asset.name} - {asset.id}')
        permissions = Permission.objects.filter(
            codename__in=['edit_content', 'change_asset', 'change_assetcustomizationreview']
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
    return Asset.objects.get(customizations__name__in=[customization],
                             asset_type__name="",
                             asset_type__type=AssetType.ASSET_TYPES.cloud_portal)


def get_asset_by_revision(version_id):
    return Asset.objects.get(contentversion__in=[version_id])


def update_global_cache(customization, version_id):
    global_cache = caches['global']
    global_cache.set(customization, version_id)


def check_update_cache(customization, version_id):
    global_cache = caches['global']
    global_id = global_cache.get(customization)

    return version_id != global_id, global_id


def cloud_portal_customization_cache(customization_name, value=None, force=False):
    data = cache.get(customization_name)
    asset = get_cloud_portal_asset(customization_name)

    if data and 'version_id' in data and not force:
        force = check_update_cache(customization_name, data['version_id'])[0]

    if not data or force:
        customization = Customization.objects.get(name=customization_name)
        custom_config = get_config(customization.name)

        footer_items = asset.read_global_value('%FOOTER_ITEMS%')
        integration_store_enabled = asset.read_global_value("%INTEGRATION_STORE_ENABLED%")

        if footer_items:
            from cms.controllers.filldata import process_global_contexts
            global_contexts = Context.objects.filter(is_global=True, asset_type=asset.asset_type)
            # Replaces cms tags. If you add the key as itself in the global_context_dict it effectively is not replaced
            footer_items = process_global_contexts(asset, footer_items, asset.version_id(),
                                                   False, global_contexts, {"%CLOUD_NAME%": "%CLOUD_NAME%",
                                                                            "%VMS_NAME%": "%VMS_NAME%"})

        public_push_config = asset.read_global_value("%PUSH_CONFIG_WEB%") or \
            getattr(settings, 'PUSH_NOTIFICATIONS_SETTINGS', {}).get('PUBLIC')

        data = {
            'version_id': asset.version_id(),
            'languages': customization.languages_list,
            'default_language': customization.default_language.code,
            'email': {
                'mail_from_name': asset.read_global_value('%MAIL_FROM_NAME%'),
                'mail_from_email': asset.read_global_value('%MAIL_FROM_EMAIL%'),
                'portal_url': custom_config['cloud_portal']['url'],
                'smtp_host': asset.read_global_value('%SMTP_HOST%'),
                'smtp_port': asset.read_global_value('%SMTP_PORT%'),
                'smtp_user': asset.read_global_value('%SMTP_USER%'),
                'smtp_password': asset.read_global_value('%SMTP_PASSWORD%'),
                'smtp_tls': asset.read_global_value('%SMTP_TLS%')
            },
            'config': {
                'app_types_for_platform': asset.read_global_value('%APP_TYPES_FOR_PLATFORM%'),
                'available_downloads_platform': asset.read_global_value('%AVAILABLE_DOWNLOADS_PLATFORM%'),
                'cloud_merge': asset.read_global_value("%CLOUD_MERGE%"),
                'copyright_year': asset.read_global_value("%COPYRIGHT_YEAR%"),
                'company_name': asset.read_global_value("%COMPANY_NAME%"),
                'company_link': asset.read_global_value("%COMPANY_LINK%"),
                'feedback_enabled': asset.read_global_value("%FEEDBACK_ENABLED%"),
                'footer_items': footer_items,
                'integration_filter_items': asset.read_global_value("%INTEGRATION_FILTER_ITEMS%"),
                'integration_filter_limitation': asset.read_global_value("%INTEGRATION_SHOW_FILTER_LIMITATION%"),
                'integration_store_enabled': integration_store_enabled,
                'health_monitoring_enabled': asset.read_global_value('%HM_ENABLED%'),
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
                'push_subscription_auto_active': asset.read_global_value("%PUSH_SUB_ACTIVE%"),
                'push_config': public_push_config,
                'google_tag_manager_id': asset.read_global_value('%GOOGLE_TAG_MANAGER_ID%')
            },
            'cloud_capabilities': {
                'integration_store_enabled': integration_store_enabled
            }
        }
        cache.set(customization_name, data)
        update_global_cache(customization, data['version_id'])

    if value:
        return data[value] if value in data else None

    return data


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
        integration = AssetType.objects.only('id', 'type').filter(type=AssetType.ASSET_TYPES.integration).first()
        if integration:
            return integration.id
    except ProgrammingError:
        pass
    return None


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
    class Meta:
        # Used to allow a user to see the customization in list of customizations
        # Cloud portal(s) are now a asset so customization is not necessary for giving access anymore
        permissions = (
            ('access_customization', 'Can access customization'),
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
            models.UniqueConstraint(fields=["name", "type"], name="Unique Asset Type")
        ]
    ASSET_TYPES = Choices((0, "cloud_portal", "Cloud Portal"),
                          (1, "vms", "Vms"),
                          (2, "integration", "Integration"),
                          (3, "other", "Other"),
                          (4, "article", "Article"),
                          (5, "agreement", "Agreement"))
    name = models.CharField(max_length=255, default="", blank=True)
    can_preview = models.BooleanField(default=False)
    single_customization = models.BooleanField(default=False)
    type = models.IntegerField(choices=ASSET_TYPES, default=ASSET_TYPES.cloud_portal)
    advanced = models.BooleanField(default=True)

    def __str__(self):
        if self.name:
            return f"{self.name} - {AssetType.ASSET_TYPES[self.type]}"
        return AssetType.ASSET_TYPES[self.type]

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
    customizations = models.ManyToManyField(Customization, default=None, blank=True)
    asset_type = models.ForeignKey(AssetType, default=get_integration_type, null=True, on_delete=models.CASCADE)

    PREVIEW_STATUS = Choices((0, 'draft', 'draft'), (1, 'review', 'review'))
    preview_status = models.IntegerField(choices=PREVIEW_STATUS, default=PREVIEW_STATUS.draft)
    primary_group = models.OneToOneField(Group, unique=True, on_delete=models.SET_NULL, null=True, blank=True)
    protected = models.BooleanField(default=False)

    def __str__(self):
        if self.asset_type and self.is_cloud_portal:
            return f"{self.name} - {self.customizations.first()}"
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
    def is_cloud_portal(self):
        return self.is_asset_type(AssetType.ASSET_TYPES.cloud_portal)

    @property
    def is_integration(self):
        return self.is_asset_type(AssetType.ASSET_TYPES.integration)

    @property
    def is_dirty(self):
        version_id = self.contentversion_set.last().id if self.contentversion_set.exists() else 0
        records_for_version = self.datarecord_set.filter(version__id=version_id)
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

    def change_preview_status(self, new_status):
        self.preview_status = new_status
        self.save()

    def read_global_value(self, record_name):
        global_contexts = self.asset_type.context_set.filter(is_global=True)
        data_structure = DataStructure.objects.filter(name=record_name, context__in=global_contexts).last()

        return data_structure.find_actual_value(asset=self, version_id=self.version_id()) if data_structure else None

    def clean(self):
        if self.asset_type.type != AssetType.ASSET_TYPES.cloud_portal and \
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
        if need_update and self.is_cloud_portal \
                and len(self.customizations.all()) == 1:
            cloud_portal_customization_cache(self.customizations.first().name, force=True)  # invalidate cache
            # TODO: need to update all static right here
        if create_group or update_group:
            if create_group:
                group = create_default_permission_group(orig or self)
                self.primary_group = group
                self.save()
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


class Context(models.Model):
    class Meta:
        permissions = (
            ("edit_content", "Can edit content and send for review"),
        )
        ordering = ['order', 'id']
    asset_type = models.ForeignKey(AssetType, null=True, on_delete=models.CASCADE)
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
                      (default_language, skin),  # skin is more important, fallback to default language
                      (None, skin),  # skin is more important, fallback to empty language
                      (language, ''),  # give up skin - find by lang only
                      (default_language, ''),  # fallback to default_language
                      (None, ''))  # default of default - no skin, no language

        # instantiate generator for contexts based on priorities
        contexts = (self.contexttemplate_set.filter(language=item[0], skin=item[1]) for item in priorities)

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
            datastructure.default = DataStructure.cast_value(datastructure, datastructure.default)

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
    language = models.ForeignKey(Language, blank=True, null=True, on_delete=models.CASCADE)
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

    def __str__(self):
        return self.name

    def find_actual_value(self, asset=None, language=None, version_id=None, draft=False):
        content_value = ""
        if not asset:
            return DataStructure.cast_value(self, self.default)
        content_record = DataRecord.objects.filter(asset=asset, data_structure=self)
        if not draft:
            content_record = content_record.\
                exclude(version__assetcustomizationreview__state=AssetCustomizationReview.REVIEW_STATES.rejected).\
                order_by('version_id')

        # try to get translated content
        if self.translatable:
            if language:
                content_record = content_record.filter(language=language)
            elif asset.is_cloud_portal:
                content_record = content_record.filter(language=asset.customizations.first().default_language)

        if content_record.exists():
            if not version_id:
                content_value = content_record.last().cast_value
            else:  # Here find a datarecord with version_id
                # which is not more than version_id
                # filter only accepted content_records
                content_record = content_record.filter(version_id__lte=version_id)
                if not draft:
                    new_review_records = content_record.\
                        filter(version__assetcustomizationreview__state=AssetCustomizationReview.
                               REVIEW_STATES.accepted)
                    # If new versions or records dont exist use old vay of getting records
                    if new_review_records.exists():
                        content_record = new_review_records.last()
                    else:
                        content_record = content_record.filter(version__accepted_by__isnull=False).last()
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


# CMS settings. Release engineer can change that
class UserGroupsToAssetPermissions(models.Model):
    group = models.ForeignKey(Group, on_delete=models.CASCADE)
    asset = models.ForeignKey(Asset, default=None, null=True, on_delete=models.CASCADE)

    @staticmethod
    def check_permission(user, asset, permission=None):
        if user.is_superuser:
            return True
        if permission and not user.has_perm(permission):
            return False

        groups = UserGroupsToAssetPermissions.objects.filter(asset=asset,
                                                             group_id__in=user.groups.values_list('id', flat=True))
        if permission:
            codename = UserGroupsToAssetPermissions.convert_permission_to_codename(permission)
            groups = groups.filter(group__permissions__codename=codename)
        return groups.exists()

    @staticmethod
    def check_customization_permission(user, customization, permission=None):
        return UserGroupsToAssetPermissions.\
            check_permission(user, get_cloud_portal_asset(customization), permission)

    @staticmethod
    def check_customization_change_account(user, customization):
        return UserGroupsToAssetPermissions.\
            check_customization_permission(user, customization, 'api.change_account')

    @staticmethod
    def check_customization_access(user, customization):
        return UserGroupsToAssetPermissions.\
            check_customization_permission(user, customization, 'cms.access_customization')

    @staticmethod
    def convert_permission_to_codename(permission):
        if permission.find('.') > -1:
            # need to remove app_label to get codename
            permission = permission[permission.find('.') + 1:]
        return permission


class UserGroupsToAssetType(models.Model):
    group = models.ForeignKey(Group, on_delete=models.CASCADE)
    asset_type = models.ForeignKey(AssetType, default=None, null=True, on_delete=models.CASCADE)

    @staticmethod
    def check_asset_type(user, asset_type, permission):
        if user.is_superuser:
            return True

        codename = UserGroupsToAssetPermissions.convert_permission_to_codename(permission)
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
    customization = models.ForeignKey(Customization, default=None, null=True, on_delete=models.SET_NULL)
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
                parent_in_review = self.asset.customizations.filter(id=customization.parent.id).exists()
            if parent_in_review:
                AssetCustomizationReview(customization=customization, version=self, state=blocked).save()
            else:
                AssetCustomizationReview(customization=customization, version=self, state=pending).save()

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
    state = models.IntegerField(choices=REVIEW_STATES, default=REVIEW_STATES.pending)
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
            check_customization_access(self.version.created_by, self.customization)

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
            elif can_show_customization:
                review.notes = f"Automatically rejected by {self.customization}"
            else:
                review.notes = "Automatically rejected"

            review.save()
            if review.state == AssetCustomizationReview.REVIEW_STATES.rejected or review.customization.trust_parent:
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
        for review in customization_reviews:
            review.update_state(user, state)

    @property
    def can_preview_customization(self):
        can_preview = self.version.asset.asset_type.can_preview
        in_review = self.state in [self.REVIEW_STATES.pending, self.REVIEW_STATES.blocked]
        is_current_customization = self.customization.name == settings.CUSTOMIZATION
        return can_preview and in_review and is_current_customization


class ExternalFile(models.Model):
    data_structure = models.ForeignKey(DataStructure, default=None, null=True, on_delete=models.CASCADE)
    # Default limit is 100 chars. The new length comes from most paths being limited to 255 char.
    # Since we slugify the asset name, data structure name and file name we need a long length.
    file = models.FileField(upload_to=rename_file, storage=MediaStorage(), max_length=1000)
    md5 = models.CharField(max_length=1024, default='')
    asset = models.ForeignKey(Asset, default=None, null=True, on_delete=models.CASCADE)
    size = models.FloatField(default=0.0)

    def __str__(self):
        return self.file.name


class DataRecord(models.Model):
    data_structure = models.ForeignKey(DataStructure, on_delete=models.CASCADE)
    asset = models.ForeignKey(Asset, default=None, null=True, on_delete=models.CASCADE)
    language = models.ForeignKey(Language, null=True, blank=True, on_delete=models.CASCADE)
    # TODO: Remove this after release of 18.4 - Task: CLOUD-2299
    customization = models.ForeignKey(Customization, default=None, blank=True, null=True, on_delete=models.SET_NULL)
    version = models.ForeignKey(ContentVersion, null=True, blank=True, on_delete=models.SET_NULL)

    created_date = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True,
        blank=True, related_name='created_%(class)s', on_delete=models.SET_NULL)

    value = models.TextField(default='', blank=True)
    external_file = models.ForeignKey(ExternalFile, default=None, blank=True, null=True, on_delete=models.CASCADE)

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
        if self.language:
            return f"{self.data_structure.name}-{self.language.code}"
        return self.data_structure.name

    @cached_property
    def cast_value(self):
        return self.data_structure.cast_value(self.data_structure, self.value)

    def save(self, *args, **kwargs):
        if not self.data_structure.translatable:
            self.language = None

        if self.data_structure:
            self.value = self.data_structure.to_string(self.data_structure, self.value)

        super(DataRecord, self).save(*args, **kwargs)


class ContributerAgreement(models.Model):
    accepted_date = models.DateTimeField(auto_now_add=True)
    accepted_agreement = models.ForeignKey(AssetCustomizationReview, on_delete=models.CASCADE)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)

    def clean(self):
        if self.accepted_agreement and \
                self.accepted_agreement.version.asset.asset_type.type != AssetType.ASSET_TYPES.agreement:
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

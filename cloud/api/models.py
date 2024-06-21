from asgiref.sync import sync_to_async
from django.db import models
from django.db.models.signals import post_save
from django.contrib.auth.models import AbstractBaseUser, Group, Permission, PermissionsMixin
from django.dispatch import receiver
from django.db.models.signals import m2m_changed
from django.utils import timezone
from django.utils.html import format_html
from django.conf import settings
from django.core.cache import cache, caches
from django.contrib.contenttypes.models import ContentType

from jsonfield import JSONField

from cloud.controllers.cloud_api import Account as cloud_api_account
from cloud.customization_context import customization_ctx
from cloud.helpers.exceptions import (
    APIRequestException, APIException, APILogicException, APINotAuthorisedException, ErrorCodes, APIInternalException
)
from cms.helpers.cached_asset import AccountObjectCache
from cms.models import Customization, Asset, AssetType, UserGroupsToAssetPermissions, get_cloud_portal_asset


class AccountManager(models.Manager):

    """Custom manager for Account."""

    def _create_user(self, email, password, **extra_fields):
        """Create and save an Account with the given email and password.
        :param str email: user email
        :param str password: user password
        :param bool is_staff: whether user staff or not
        :param bool is_superuser: whether user admin or not
        :return custom_user.models.Account user: user
        :raise ValueError: email is not set
        """
        if not email:
            raise APIRequestException('Email code is absent', ErrorCodes.wrong_parameters,
                                      error_data={'email': ['This field is required.']})
        email = email.lower()

        ip = extra_fields.pop("IP", "")
        first_name = extra_fields.pop("first_name")
        last_name = extra_fields.pop("last_name")
        code = extra_fields.pop("code", None)
        request = extra_fields.pop('request', None)
        customization = extra_fields.pop('request', None)
        if not customization and not request and not customization_ctx.get():
            raise APIInternalException('Customization must be given.',
                                      error_code=ErrorCodes.no_customization_given)

        # this line will send request to cloud_db and raise an exception if fails:
        try:
            cloud_api_account.register(
                email, password, first_name, last_name, ip=ip, code=code,
                customization=customization, request=request)
        except APIException as a:
            if a.error_code == ErrorCodes.account_exists and not AccountManager.is_email_in_portal(email):
                raise APILogicException(
                    'User is not in portal', ErrorCodes.portal_critical_error)
            else:
                raise
        user = self.model(email=email,
                          first_name=first_name,
                          last_name=last_name,
                          customization=customization or getattr(request, 'CUSTOMIZATION', customization_ctx.get()),
                          **extra_fields)

        if code:
            user.activated_date = timezone.now()
        user.save(using=self._db)

        return user

    def create_user(self, email, password, **extra_fields):
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email, password, **extra_fields):
        return self._create_user(email, password, **extra_fields)

    @staticmethod
    async def register_cloud_invite_user(email, password, data, request):
        email = email.lower()
        ip = data.get("IP", "")
        first_name = data.pop("first_name")
        last_name = data.pop("last_name")

        await sync_to_async(cloud_api_account.register, thread_sensitive=False)(
            email, password, first_name, last_name, ip=ip, request=request)
        user = await Account.objects.aget(email=email)
        """
        When an account is created using cloud invites it is disabled because its registration
        is different from regular users. Once the user has registered their account it is set to
        active in this function.
        """
        user.is_active = True
        user.first_name = first_name
        user.last_name = last_name
        await sync_to_async(user.save)()

        return user

    @staticmethod
    def is_email_in_portal(email):
        return Account.objects.filter(email=email.lower()).count() > 0

    @staticmethod
    def check_email_in_portal(email, check_email_exists):
        mail_exists = AccountManager.is_email_in_portal(email)
        if not mail_exists and check_email_exists:
            raise APILogicException(
                'User is not in portal', ErrorCodes.not_found)
        if mail_exists and not check_email_exists:
            raise APILogicException(
                'User already registered', ErrorCodes.account_exists)
        return True

    @staticmethod
    def check_if_activated(request, email, password):
        activated = False
        try:
            # try to authenticate with clouddb to check if activated
            response = cloud_api_account.check_activated(request, email=email, password=password)
            if response.status_code == 200:
                activated = True
        except (APILogicException, APINotAuthorisedException) as exception:
            if exception.error_code != ErrorCodes.account_not_activated:
                raise exception
        return activated


class Account(AbstractBaseUser, PermissionsMixin):
    class Meta:
        permissions = (
            ("can_view_release", "Can view releases and patches"),
            ("invite_users", "Invite users"),
            ("ignore_exceptions", "Downgrades log level of exceptions to INFO"),
            ("custom_clients", "Can create/edit and download custom clients")
        )

    objects = AccountManager()

    email = models.CharField(unique=True, max_length=255)
    first_name = models.CharField(max_length=255)
    last_name = models.CharField(max_length=255)
    created_date = models.DateTimeField(auto_now_add=True)
    activated_date = models.DateTimeField(null=True, blank=True)
    last_login = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True, help_text="If false the account is disabled. <br> If user was "
                                                            "invited to the cloud it will switch to true on its own "
                                                            "when the user completes registration.")
    is_staff = models.BooleanField(
        default=False, help_text="If true then the user can view cloud admin.")
    language = models.CharField(max_length=7, blank=True)
    customization = models.CharField(max_length=255, null=True)
    password = None

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['registeredDate', 'createdDate']

    def save(self, *args, **kwargs):
        if not self.pk:
            self.is_staff |= self.email.endswith(settings.SUPERUSER_DOMAIN)
        cache.delete(self.email)
        if self.id:
            AccountObjectCache(self.id).clear_value()
        super().save(*args, **kwargs)
        self.add_to_all_releases_group()

    def delete(self, using=None, keep_parents=False):
        AccountObjectCache(self.id).clear_value()
        super().delete(using=using, keep_parents=keep_parents)

    def add_to_all_releases_group(self):
        user_at_superuser_domain = self.email.endswith(
            settings.SUPERUSER_DOMAIN)
        if not user_at_superuser_domain:
            return

        release_group, created = Group.objects.get_or_create(
            name='Nx Internal - All releases access')
        in_release_group = release_group.user_set.filter(email=self.email)

        if created or not in_release_group:
            release_group.user_set.add(self)

        if created:
            content_type = ContentType.objects.get_for_model(Account)
            permission, created = Permission.objects.get_or_create(
                name='User can view all releases', codename='user_can_view_all_releases', content_type=content_type)
            release_group.permissions.add(permission)
            UserGroupsToAssetPermissions.objects.get_or_create(
                group=release_group, asset=get_cloud_portal_asset(customization=self.customization))

    def get_full_name(self):
        full_name = self.first_name + ' ' + self.last_name
        return full_name.strip()

    def get_short_name(self):
        return self.first_name

    def get_username(self):
        return self.email

    def __str__(self):
        return self.get_username()

    @property
    def permissions(self):
        perm_cache = caches['permissions']
        key = f'account-permissions-{settings.VERSION}-{self.id}'
        if (permissions := perm_cache.get(key)) is not None:
            return permissions
        permissions = self.get_permissions()
        perm_cache.set(key, permissions, timeout=300)
        return permissions

    def get_permissions(self):
        if not UserGroupsToAssetPermissions.check_customization_permission(self, customization_ctx.get()):
            return []

        permissions = []
        for group in self.groups.all():
            permissions.extend(
                [permission.codename for permission in group.permissions.all()])
        return list(set(permissions))

    @property
    def global_permissions(self):
        perm_cache = caches['permissions']
        key = f'account-global-permissions-{settings.VERSION}-{self.id}'
        if (permissions := perm_cache.get(key)) is not None:
            return permissions
        permissions = self.get_global_permissions()
        perm_cache.set(key, permissions, timeout=300)
        return permissions

    def get_global_permissions(self):
        permissions = []
        for group in self.groups.all():
            permissions.extend(
                [permission.codename for permission in group.permissions.all()])
        return list(set(permissions))

    @property
    def assets(self):
        return self.assets_with_permission('cms.edit_content')

    @property
    def customizations(self):
        if self.is_superuser or Group.objects.filter(
                permissions__codename='access_customization', options__all_assets=True,
                usergroupstoassettype__asset_type__type=AssetType.ASSET_TYPES.cloud_portal, user=self
        ).exists():
            return list(Customization.objects.all().values_list('name', flat=True))

        cloud_portal_ids = UserGroupsToAssetPermissions.objects.\
            filter(group__in=self.groups.all(), asset__asset_type__type=AssetType.ASSET_TYPES.cloud_portal).\
            values_list('asset__id', flat=True)

        customizations = []

        for cloud_id in cloud_portal_ids:
            asset = Asset.objects.get(id=cloud_id)
            if UserGroupsToAssetPermissions.check_permission(self, asset, 'cms.access_customization') and \
                    asset.customizations.all().exists():
                customizations.append(asset.customizations.first().name)

        return list(set(customizations))

    def customizations_with_permission(self, permission):
        return [
            customization
            for customization in self.customizations
            if UserGroupsToAssetPermissions.check_customization_permission(
                self, customization, permission
            )
        ]

    def assets_with_permission(self, permission):
        permission_asset_ids = list(UserGroupsToAssetPermissions.objects.filter(group__in=self.groups.all())
                                    .values_list('asset__id', flat=True).distinct())

        wildcard_asset_types = [
            asset_type
            for asset_type in AssetType.objects.all()
            if Group.objects.filter(
                options__all_assets=True,
                usergroupstoassettype__asset_type=asset_type,
                user=self,
            ).exists()
        ]

        permission_asset_ids.extend(list(
            Asset.objects.filter(
                asset_type__in=wildcard_asset_types).values_list('id', flat=True)
        ))
        permission_asset_ids = set(permission_asset_ids)

        return [
            asset.id
            for asset in Asset.objects.filter(id__in=permission_asset_ids)
            if UserGroupsToAssetPermissions.check_permission(
                self, asset, permission
            )
        ]

    def custom_client_vms_assets(self, *, request=None):
        customization = request.CUSTOMIZATION if request else self.customization
        return Asset.objects.filter(models.Q(
            asset_type__type=AssetType.ASSET_TYPES.vms,
            customizations__in=UserGroupsToAssetPermissions.get_customizations_with_permission(
                self, 'custom_clients')) | models.Q(asset_type__type=AssetType.ASSET_TYPES.vms, customizations__name=customization)
        ).distinct()

    @property
    def is_portal_manager(self):
        if self.is_superuser:
            return False

        permission_based_group = Group.objects.filter(
            user=self, permissions__codename='publish_version').exists()
        named_group = Group.objects.filter(
            user=self, name__contains='Portal Manager').exists()
        return permission_based_group or named_group

    @property
    def is_developer(self):
        if self.is_portal_manager or self.is_superuser:
            return False

        permission_based_group = Group.objects.filter(
            user=self, permissions__codename='edit_content').exists()
        named_group = Group.objects.filter(
            user=self, name__contains='Developer').exists()
        return permission_based_group or named_group

    # Called when password is changed
    async def password_changed(self):
        from notifications.models import PushDevice
        await PushDevice.delete_for_account(self)

    def short_email(self):
        return format_html("<div class='truncate-email'><span>{}</span></div>", self.email)

    def short_first_name(self):
        return format_html("<div class='truncate-name'><span>{}</span></div>", self.first_name)

    def short_last_name(self):
        return format_html("<div class='truncate-name'><span>{}</span></div>", self.last_name)

    short_email.short_description = "email"
    short_first_name.short_description = "first name"
    short_last_name.short_description = "last name"

@receiver(m2m_changed, sender=Account.groups.through)
def clear_account_cache(sender, instance, action, pk_set, **kwargs):
    if action in ["post_add", "post_remove"]:
        for account in Account.objects.filter(pk__in=pk_set):
            cache.delete(account.email)

class AccountLoginHistory(models.Model):
    action = models.CharField(max_length=64)
    ip = models.CharField(max_length=255, null=True)
    email = models.CharField(max_length=256, null=True)
    date = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Authentication log record'
        verbose_name_plural = 'Authentication log'

    def __unicode__(self):
        return f'{self.action} - {self.email} - {self.ip}'


class ProxyGroup(Group):
    pass

    class Meta:
        proxy = True
        app_label = 'api'
        verbose_name = 'Group'
        verbose_name_plural = 'Groups'


class GroupOptions(models.Model):
    group = models.OneToOneField(
        Group, unique=True, on_delete=models.CASCADE, related_name='options')

    # options
    all_assets = models.BooleanField(default=False)


def group_saved(sender, created, signal, instance, **kwargs):
    if created:
        GroupOptions.objects.create(group=instance)


post_save.connect(group_saved, sender=Group, dispatch_uid='group_post_save')
post_save.connect(group_saved, sender=ProxyGroup,
                  dispatch_uid='proxy_group_post_save')


class AccountCustomProperty(models.Model):
    class Meta:
        verbose_name = 'Account Custom Property'
        verbose_name_plural = 'Account Custom Properties'
        constraints = [
            models.UniqueConstraint(
                fields=['account', 'endpoint'], name='User Unique Endpoints')
        ]

    account = models.ForeignKey(Account, on_delete=models.CASCADE)
    endpoint = models.SlugField()
    json_data = JSONField()

    def __str__(self):
        return f'{self.account} - {self.endpoint}'

    @staticmethod
    def alexa_account_linked(email):
        if account := Account.objects.filter(email=email).first():
            alexa_settings, _ = AccountCustomProperty.objects.get_or_create(account=account, endpoint='alexa')
            if not alexa_settings.json_data or not isinstance(alexa_settings.json_data, dict) or not alexa_settings.json_data.get('accountLinked', False):
                alexa_settings.json_data = {"accountLinked": True}
                alexa_settings.save()

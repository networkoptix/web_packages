import datetime
import enum
import queue
import secrets
import string
import uuid
from datetime import timedelta
from enum import (
    IntEnum,
    StrEnum,
)
from math import ceil
from threading import Lock
from typing import (
    Dict,
    List,
    TypedDict,
)

import django.db.transaction
import structlog
from dateutil.relativedelta import relativedelta
from django.conf import settings
from django.contrib.auth.models import Permission
from django.contrib.postgres.fields import ArrayField
from django.contrib.postgres.indexes import GinIndex
from django.core.cache import caches
from django.core.exceptions import ValidationError
from django.db import (
    models,
    transaction,
)
from django.db.models import (
    F,
    Func,
    IntegerChoices,
    Q,
    QuerySet,
    Subquery,
    Sum,
    Value,
)
from django.db.models.functions import Greatest
from django.utils import timezone
from django_cte import CTEManager
from rest_framework.authtoken.models import Token
from rest_framework.utils.encoders import JSONEncoder

from channel_partners.utils import FieldOriginalMixin
from partners.tasks.cloud_user_full_name import update_cloud_user_full_name
from partners.tasks.services import (
    new_channel_partner_created,
    new_channel_partner_service_created,
    organization_systems_negation_task,
)
from partners.tasks.states import expire_confirmation
from partners.utils.cache_keys import (
    cache_key_cloud_system_group_children_count,
    cp_direct_children_count,
    cp_monthly_charges,
    direct_organization_children_count,
    organization_system_count,
)
from partners.utils.context_vars import get_context_vars
from partners.utils.db import (
    MonthInterval,
    RemoveArrayElement,
    ReplaceAncestors,
    ToArray,
)
from tools.helpers import (
    get_path_from_parent,
    get_period_start,
    get_today,
)


logger = structlog.getLogger(__name__)


class Empty:
    pass


class GroupStructure(TypedDict):
    id: uuid.UUID
    name: str
    parent_id: uuid.UUID
    path: List[uuid.UUID]
    children: List['GroupStructure']


class AuthToken(Token):
    enabled = models.BooleanField(default=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, blank=True, null=True, on_delete=models.SET_NULL)
    name = models.CharField(max_length=255, blank=True)
    key = models.CharField("Key", max_length=40)
    internal = models.BooleanField(default=False,
                                   help_text='Only for internal services (such as clouddb). These keys have a higher level of access.')

    # Remove user from original Token model
    user = None


class ChannelPartnerStates:
    ACTIVE = 0
    SUSPENDED = 1
    SHUTDOWN = 2

    STATE_CHOICES = [
        (ACTIVE, 'Active'),
        (SUSPENDED, 'Suspended'),
        (SHUTDOWN, 'Shutdown')
    ]
    STATE_CODES = [
        ('active', ACTIVE),
        ('suspended', SUSPENDED),
        ('shutdown', SHUTDOWN)
    ]

    STATE_TEXTS = {
        ACTIVE: 'active',
        SUSPENDED: 'suspended',
        SHUTDOWN: 'shut down'
    }

    STATE_NAMES = {
        ACTIVE: 'active',
        SUSPENDED: 'suspended',
        SHUTDOWN: 'shutdown'
    }


class ExternalIdTargetManagerQueryset(models.QuerySet):
    @staticmethod
    def process_external_id(field_name, kwargs):
        value = kwargs[field_name]
        if type(value) is str and '--' in value:
            pieces = value.split('--')
            if len(pieces) > 1:
                channel_partner_id = pieces[0]
                custom_id = '--'.join(pieces[1:])
                del kwargs[field_name]
                kwargs['external_ids__created_by_id'] = channel_partner_id
                kwargs['external_ids__custom_id'] = custom_id

    def filter(self, *args, **kwargs):
        if self.model.external_id_field_name in kwargs:
            self.process_external_id(field_name=self.model.external_id_field_name, kwargs=kwargs)
        elif 'pk' in kwargs:
            self.process_external_id(field_name='pk', kwargs=kwargs)

        return super().filter(*args, **kwargs)


class ExternalIdTargetManager(models.Manager):
    def get_queryset(self):
        return ExternalIdTargetManagerQueryset(self.model, using=self._db)


class CloudUser(models.Model):
    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=255, null=True, blank=True, default=None)

    is_system_user = False

    def __str__(self):
        return self.email

    def save(self, *args, **kwargs):
        is_new: bool = self._state.adding

        # Call the original save method to ensure the user is saved
        super().save(*args, **kwargs)

        # If this is a new user, schedule the Celery task
        if is_new:
            context_vars = get_context_vars()
            cloud_host = context_vars.get("cloud_host", None)
            request_id = context_vars.get("request_id", None)

            update_cloud_user_full_name.delay(email=self.email, request_id=request_id, original_host=cloud_host)

    @property
    def is_authenticated(self):
        return True

    def systems_memberships(self):
        roles_with_sys_perm = list(get_roles_with_vms_perms().keys())
        cp_roles = [ChannelPartnerRoles.ADMINISTRATOR, ChannelPartnerRoles.MANAGER]

        organization_sys_q = Q(
            organization__organizationtouser__system_group__isnull=True,
            organization__organizationtouser__user=self,
            organization__organizationtouser__roles__overlap=roles_with_sys_perm,
            system_id__isnull=False
        )

        group_sys_q = Q(
            organization__organizationtouser__user=self,
            organization__organizationtouser__system_group_id__isnull=False,
            path__overlap=ToArray('organization__organizationtouser__system_group_id')
        )

        organization_queryset = CloudSystemId.objects.filter(organization_sys_q).annotate(
            org_id=F('organization_id'),
            sys_id=F('system_id'),
            membership_type=Value('organization'),
            org_roles=F('organization__organizationtouser__roles'),
        ).values('org_id', 'sys_id', 'membership_type', 'org_roles')

        group_queryset = CloudSystemId.objects.filter(group_sys_q).annotate(
            org_id=F('organization_id'),
            sys_id=F('system_id'),
            membership_type=Value('group'),
            org_roles=F('organization__organizationtouser__roles'),
        ).values('org_id', 'sys_id', 'membership_type', 'org_roles')

        channel_partner_queryset = CloudSystemId.objects.filter(
            organization__channel_partner_access_level__in=roles_with_sys_perm,
            organization__channel_partner__channelpartnertouser__user=self,
            organization__channel_partner__channelpartnertouser__roles__overlap=cp_roles,
        ).annotate(
            org_id=F('organization_id'),
            sys_id=F('system_id'),
            membership_type=Value('channel_partner'),
            org_roles=ToArray('organization__channel_partner_access_level_id')
        ).values('org_id', 'sys_id', 'membership_type', 'org_roles')

        queryset = organization_queryset.union(group_queryset, channel_partner_queryset)
        return queryset

    def all_systems(self):
        roles_with_sys_perm = list(get_roles_with_vms_perms().keys())
        cp_roles = [ChannelPartnerRoles.ADMINISTRATOR, ChannelPartnerRoles.MANAGER]
        channel_partner_membership_ids = Organization.objects.filter(
            channel_partner_access_level__in=roles_with_sys_perm,
            channel_partner__channelpartnertouser__user=self,
            channel_partner__channelpartnertouser__roles__overlap=cp_roles,
        ).values('id')

        organization_membership_ids = (
            OrganizationToUser.with_vms_roles()
            .filter(user=self, system_group__isnull=True)
            .values('organization_id')
        )

        group_memberships_ids = (
            OrganizationToUser.with_vms_roles()
            .filter(user=self, system_group__isnull=False)
            .annotate(system_group_ids=Func('system_group_id', function='array_agg'))
            .values('system_group_ids')
        )
        # Todo. Find a way to optimize this.
        return CloudSystemId.objects.filter(
            # Organization user systems
            Q(organization_id__in=Subquery(organization_membership_ids))
            # Parent channel partner user with CPAL enabled
            | Q(organization_id__in=Subquery(channel_partner_membership_ids))
            # User groups systems
            | Q(path__overlap=Subquery(group_memberships_ids)
            )
        ).distinct()


class CloudHost(models.Model):
    hostname = models.CharField(max_length=255, unique=True)

    def __str__(self):
        return self.hostname

    @property
    def cdb_base_url(self):
        return f'https://{self.hostname}'


class ServiceUsageDict(TypedDict):
    used: float
    quantity: int


class CloudSystemStates:
    NOT_ACTIVATED = 2
    ACTIVATED = 4
    DELETED = 6

    STATE_CHOICES = [
        (NOT_ACTIVATED, 'notActivated'),
        (ACTIVATED, 'activated'),
        (DELETED, 'deleted')
    ]
    STATE_CODES = [
        ('notActivated', NOT_ACTIVATED),
        ('activated', ACTIVATED),
        ('deleted', DELETED)
    ]
    STATE_DICT = dict(STATE_CODES)


class CloudSystemId(FieldOriginalMixin, ChannelPartnerStates, models.Model):
    system_id = models.UUIDField()
    usage_issue_detected = models.BooleanField(default=False)
    cloud_host = models.ForeignKey(CloudHost, on_delete=models.CASCADE)
    organization = models.ForeignKey('Organization', null=True, blank=True, on_delete=models.CASCADE,
                                     related_name='cloud_systems')
    system_group = models.ForeignKey(
        'SystemGroup',
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name='cloud_systems')
    name = models.CharField(max_length=150, blank=True)
    state = models.IntegerField(choices=ChannelPartnerStates.STATE_CHOICES, blank=False,
                                default=ChannelPartnerStates.ACTIVE)
    effective_state = models.IntegerField(choices=ChannelPartnerStates.STATE_CHOICES,
                                          blank=False, default=ChannelPartnerStates.ACTIVE)
    current_services = models.JSONField(default=dict)
    last_usage_check = models.DateTimeField(default=timezone.now)
    last_usage_report = models.DateTimeField(default=timezone.now)
    security_statuses = models.JSONField(default=dict)
    created_ts = models.DateTimeField(auto_now_add=True)
    path = ArrayField(base_field=models.UUIDField(null=False), null=True)
    system_state = models.IntegerField(choices=CloudSystemStates.STATE_CHOICES, blank=True,
                                       default=CloudSystemStates.NOT_ACTIVATED)

    objects = ExternalIdTargetManager()
    external_id_field_name = 'system_id'  # Field that is checked for possible external id usage
    observed_fields = ('organization_id', 'state', 'effective_state', 'system_group_id', 'system_state')

    def __str__(self):
        return self.name or str(self.system_id)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['system_id'], name='unique_system_id')
        ]
        indexes = [
            GinIndex(name="cloudsystemid_path_gin", fields=['path'], opclasses=['array_ops'])
        ]

    @property
    def activated(self) -> bool:
        effectively_active: bool = self.effective_state == ChannelPartnerStates.ACTIVE
        system_active: bool = self.system_state == CloudSystemStates.ACTIVATED
        return effectively_active and system_active

    def get_sec_statuses_lock(self) -> Lock:
        if lock := getattr(self, 'sec_statuses_lock', None):
            return lock
        self.sec_statuses_lock = Lock()
        return self.sec_statuses_lock

    def refresh_security_statuses(self):
        lock = self.get_sec_statuses_lock()
        lock.acquire(blocking=True)
        if (
                not self.security_statuses
                or not self.last_usage_check
                or self.last_usage_check < timezone.now() - timedelta(days=3)
        ):
            try:
                ServiceUsage.check_excess(self)
                self.refresh_from_db()
            except Exception as ex:
                logger.error("Error gotten when refreshing security statuses", exception=str(ex))
                lock.release()
                raise ex
        lock.release()

    @property
    def security_statuses_by_type(self):
        self.refresh_security_statuses()
        if not (statuses := self.security_statuses.get('types', {})):
            service_type_map = ChannelPartnerService.SERVICE_TYPE_TO_CODE_MAP
            return {
                service_type_map[ChannelPartnerService.LOCAL_RECORDING]: ServiceUsage.STATUS_OK,
                service_type_map[ChannelPartnerService.CLOUD_STORAGE]: ServiceUsage.STATUS_OK,
                service_type_map[ChannelPartnerService.ANALYTICS]: ServiceUsage.STATUS_OK,
            }
        return statuses

    @property
    def security_statuses_by_service(self):
        self.refresh_security_statuses()
        return self.security_statuses.get('services', {})

    def set_security_statuses(self, statuses):
        self.security_statuses = self.security_statuses or {}
        self.security_statuses['types'] = self.security_statuses.get('type', {})
        self.security_statuses['services'] = self.security_statuses.get('services', {})
        expiration_date = (timezone.now() + relativedelta(days=30)).strftime('%Y-%m-%d %H:%M:%S')
        for service_type, new_status in statuses['types'].items():
            service_code = ChannelPartnerService.SERVICE_TYPE_TO_CODE_MAP[service_type]
            old_status = (self.security_statuses
                          .get('types', {})
                          .get(service_code, {})
                          .get('status', ServiceUsage.STATUS_OK))
            if new_status == ServiceUsage.STATUS_OK:
                self.security_statuses['types'][service_code] = {
                    'status': new_status, 'issueExpirationDate': None
                }
            elif new_status != old_status:
                self.security_statuses['types'][service_code] = {
                    'status': new_status, 'issueExpirationDate': expiration_date
                }
        for service_id, new_status in statuses['services'].items():
            old_status = (self.security_statuses
                          .get('services', {})
                          .get(service_id, {})
                          .get('status', ServiceUsage.STATUS_OK))
            if new_status == ServiceUsage.STATUS_OK:
                self.security_statuses['services'][service_id] = {
                    'status': new_status, 'issueExpirationDate': None
                }
            elif new_status != old_status:
                self.security_statuses['services'][service_id] = {
                    'status': new_status, 'issueExpirationDate': expiration_date
                }

    def can_manage(self, user: CloudUser):
        return self.organization and self.organization.can_manage_systems(user)

    def can_access(self, user: CloudUser):
        queryset = OrganizationToUser.objects.none().values('id')
        if self.system_group_id:
            group_qs = OrganizationToUser.objects.filter(
                system_group_id__in=self.groups_path,
                user=user
            ).values('id')
            queryset = queryset.union(group_qs)
        if self.organization_id:
            org_qs = OrganizationToUser.objects.filter(
                organization_id=self.organization_id,
                system_group_id__isnull=True,
                user=user
            ).values('id')
            cp_qs = ChannelPartnerToUser.objects.filter(
                channel_partner__id=self.visible_path[-1], user=user).values('id')
            queryset = queryset.union(org_qs).union(cp_qs)
        return queryset.exists()

    def is_member_in_branch(self, user: CloudUser):
        queryset = OrganizationToUser.objects.none().values('id')
        if self.system_group_id:
            group_qs = OrganizationToUser.objects.filter(
                system_group_id__in=self.groups_path,
                user=user
            ).values('id')
            queryset = queryset.union(group_qs)
        if self.organization_id:
            org_qs = OrganizationToUser.objects.filter(
                organization_id=self.organization_id,
                system_group_id__isnull=True,
                user=user
            ).values('id')
            cp_qs = ChannelPartnerToUser.objects.filter(channel_partner__id__in=self.path, user=user).values('id')
            queryset = queryset.union(org_qs).union(cp_qs)
        return queryset.exists()

    def can_set_services(self, user: CloudUser):
        return self.organization and self.organization.can_modify_service_quantities(user)

    def has_vms_role(self, user: CloudUser, vms_roles: List[uuid.UUID]) -> bool:
        allowed_roles = OrganizationRole.objects.filter(system_role_uuid__in=vms_roles).values_list('id', flat=True)
        if not allowed_roles:
            return False
        if OrganizationToUser.objects.filter(
            Q(system_group_id=None) | Q(system_group_id=self.system_group_id),
            user_id=user.pk,
            roles__overlap=allowed_roles,
            organization_id=self.organization_id
        ).exists():
            return True
        if not self.organization.channel_partner_access_level_id:
            return False
        channel_partner_manager = ChannelPartnerToUser.objects.filter(
            user=user, channel_partner_id=self.organization.channel_partner_id,
            roles__overlap=[ChannelPartnerRoles.ADMINISTRATOR, ChannelPartnerRoles.MANAGER]
        ).exists()
        if channel_partner_manager:
            return self.organization.channel_partner_access_level_id in allowed_roles
        return False

    def save(self, *args, **kwargs):
        with transaction.atomic():
            new = self._state.adding

            # Check if the organization associated with the instance has changed
            orgs_are_different: bool = self.organization_id != self._original_organization_id

            # Check if the system group associated with the instance has changed
            system_groups_are_different: bool = self.system_group_id != self._original_system_group_id
            if system_groups_are_different:
                old_path = [self._original_system_group_id] + (self.path or [])

            # Convert system_id to a UUIDField type
            self.system_id = models.UUIDField().to_python(self.system_id)

            # If this is a new record or the organization or system group has changed, update the path
            if new or orgs_are_different or system_groups_are_different:
                if self.organization_id and self.system_group_id:
                    self.path = get_path_from_parent(self.system_group)
                elif self.organization_id:
                    self.path = get_path_from_parent(self.organization)
                else:
                    self.path = None

            # If this is a new record, invalidate the cache for the organization of the new record
            if new:
                CloudSystemId.invalidate_cache(str(self.organization_id))
                CloudSystemId.invalidate_groups_system_counters(self.groups_path)

            # If this is not a new record and the organization has changed,
            # invalidate the cache for both the original and new organizations
            if orgs_are_different:
                CloudSystemId.invalidate_cache(str(self._original_organization_id))
                CloudSystemId.invalidate_cache(str(self.organization_id))

            # System group is changed
            if system_groups_are_different:
                # Invalidate counters for a new group
                CloudSystemId.invalidate_groups_system_counters(self.groups_path)
                # Invalidate counters for an old group
                CloudSystemId.invalidate_groups_system_counters(old_path)

            self.update_state()
            super().save(*args, **kwargs)

            # If system transferred to another organization or disconnected from cloud
            # add system history record
            if orgs_are_different or new:
                CloudSystemHistory.add_history_record(cloud_system=self, ts=timezone.now())

            ChannelPartnerEvent.new_event(event_type=ChannelPartnerEvent.SYSTEM_UPDATED, system=self)

    def disconnect_system(self):
        self.state = ChannelPartnerStates.SHUTDOWN
        self.system_state = CloudSystemStates.DELETED
        self.organization = None
        self.system_group = None
        self.save()

    @staticmethod
    def invalidate_cache(organization_id: str | uuid.UUID) -> None:
        cache_key: str = organization_system_count(organization_id)
        caches['default'].delete(cache_key)

    @staticmethod
    def invalidate_groups_system_counters(path: List[uuid.UUID]) -> None:
        if not path:
            return
        for gid in path:
            cache_key: str = cache_key_cloud_system_group_children_count(gid)
            caches['default'].delete(cache_key)

    def negate_all_service(self, organization_id):
        """
        Negate all service for system with a given organization. Can be used when system goes down with
        current organization id or when system transferred to another organization with old organization id.
        """
        existing_services = (ChannelPartnerServiceRecord.objects
                             .filter(organization_id=organization_id, cloud_system=self)
                             )
        ChannelPartnerServiceRecord.negate_services(existing_services)
        # All services zeroed so we can save empty dict
        self.current_services = {}
        ChannelPartnerEvent.new_event(event_type=ChannelPartnerEvent.SYSTEM_UPDATED, system=self)

    def update_state(self):
        """
        Updates CloudSystemId.effective_state due to state changes, if effective_state
         changed then negates services when needed.
         Note. This method does not save states, super().save() must be called after.
        """
        self.effective_state = max(
            self.state,
            getattr(self.organization, 'effective_state', ChannelPartnerStates.ACTIVE)
        )

        if self._state.adding:
            return
        if (
                self.state == self._original_state
                and self.organization_id == self._original_organization_id
                and self.system_state == self._original_system_state
        ):
            return
        if (
                self.organization_id != self._original_organization_id
                or self.state == ChannelPartnerStates.SHUTDOWN
                or self.system_state == CloudSystemStates.DELETED
        ):
            self.negate_all_service(self._original_organization_id)

    class CurrentServices(TypedDict):
        services: Dict[str, Dict[str, int]]
        last_update_ts: int

    def calculate_current_services(self, organization_id=None, save_results=True) -> CurrentServices:
        services = {
            str(record['service']): {'quantity': record['quantity'], 'service_type': record['service__type']}
            for record in
            self.service_records
            .filter(organization_id=organization_id or self.organization.id)
            .values('service', 'service__type').annotate(quantity=Sum('quantity'))}
        self.current_services = {
            'services': services,
            'last_update_ts': round(timezone.now().timestamp())
        }
        if save_results:
            self.save()
        return self.current_services

    def get_current_services(self) -> Dict[str, Dict[str, int]]:
        current_services = self.current_services or self.calculate_current_services()
        if current_services:
            return current_services.get('services', {})
        else:
            return {}

    @property
    def services(self) -> Dict[str, ServiceUsageDict]:
        last_usages = ServiceUsage.get_latest_usages(self)
        used_services: Dict[str, dict[str, int]] = {
            service: {'used': 0, **quantity}
            for service, quantity in
            self.get_current_services().items()
        }
        for usage in last_usages:
            service_id: str = str(usage['service']) if usage['service'] else None
            used = ServiceUsage.get_quantity_from_usage(usage['service__type'], usage['usage'])
            if not used_services.get(service_id):
                logger.warning(f"Used service not in allocated services",
                               current_services=list(used_services.keys()),
                               service_id=service_id,
                               service_type=usage['service__type'])
                used_services[service_id] = {'used': used, 'quantity': 0}
            else:
                used_services[service_id]['used'] = used
        return used_services

    @staticmethod
    def get_systems_in_group_and_children_count(system_group_id: uuid.UUID) -> int:
        # TODO | NOTE: Talked with Kyrylo and he said to leave and it and he'll know where to place invalidations.
        cache_key: str = cache_key_cloud_system_group_children_count(system_group_id)
        cached_result = caches['default'].get(cache_key)
        if cached_result is not None:
            return cached_result
        else:
            count = CloudSystemId.objects.filter(
                path__contains=[system_group_id],
                system_state=CloudSystemStates.ACTIVATED,
            ).count()
            caches['default'].set(cache_key, count, timeout=3600)
        return count

    @property
    def groups_path(self):
        if not self.system_group or not self.organization_id:
            return []
        organization_idx = self.path.index(self.organization_id)
        if organization_idx + 2 > len(self.path):
            raise IndexError(f'organization_id or path is incorrect.')
        return self.path[:organization_idx]

    @property
    def visible_path(self) -> List[uuid.UUID]:
        """
        Returns path up to organization's parent channel partner
        """
        if not self.organization_id:
            return []
        organization_idx = self.path.index(self.organization_id)
        if organization_idx + 2 > len(self.path):
            raise IndexError(f'organization_id or path is incorrect.')
        return self.path[:organization_idx + 2]

    def get_organization_users(self, email=None) -> QuerySet[dict]:
        vms_roles = list(get_roles_with_vms_perms().keys())
        users = OrganizationToUser.objects.filter(organization=self.organization, roles__overlap=vms_roles)
        if email:
            users = users.filter(user__email=email)
        users = (
            users.filter(organization=self.organization, roles__overlap=vms_roles)
            .filter(Q(system_group__in=self.groups_path) | Q(system_group=None))
            .values('user__email', 'roles')
            .annotate(type=models.Value('organization', output_field=models.CharField()))
        )

        return users

    def get_channel_partner_users(self, email=None) -> QuerySet[dict]:
        vms_roles = list(get_roles_with_vms_perms().keys())
        cpal_role = self.organization.channel_partner_access_level_id
        if cpal_role not in vms_roles:
            return ChannelPartnerToUser.objects.none()
        users = ChannelPartnerToUser.objects.filter(
            channel_partner_id=self.organization.channel_partner_id, roles__overlap=vms_roles)
        if email:
            users = users.filter(user__email=email)
        users = (
            users.filter(channel_partner_id=self.organization.channel_partner_id, roles__overlap=vms_roles)
            .values('user__email')
            .distinct()
            .annotate(
                roles=models.Value([cpal_role], output_field=ArrayField(base_field=models.UUIDField())),
                type=models.Value('channel_partner', output_field=models.CharField())
            )
        )
        return users

    def get_all_users(self, email=None) -> QuerySet[dict]:
        users = self.get_organization_users(email=email)
        vms_roles = list(get_roles_with_vms_perms().keys())
        if self.organization.channel_partner_access_level_id in vms_roles:
            users = users.union(self.get_channel_partner_users(email=email))
        return users

    def get_user_role_by_email(self, email: str) -> dict:
        # It is supposed that user have the only relation in a branch
        # without any overlap. So, the first entry is the only one
        # TODO. Change to `.first()`
        for user in self.get_all_users(email=email):
            return user


class HierarchyLevels(IntEnum):
    parent = -1
    own = 0
    direct_child = 1


class ChannelPartnerRoles:
    ADMINISTRATOR = uuid.UUID('00000000-0000-4000-8000-000000000001')
    MANAGER = uuid.UUID('00000000-0000-4000-8000-000000000002')
    REPORTS_VIEWER = uuid.UUID('00000000-0000-4000-8000-000000000003')


class ChannelPartnerRole(models.Model):
    id = models.UUIDField(primary_key=True, editable=False, default=uuid.uuid4)
    name = models.CharField(max_length=100, unique=True)
    permissions = models.ManyToManyField(Permission)


class ChannelPartnerPermissions:
    configure_channel_partner = 'configure_channel_partner'
    manage_users = 'manage_users'
    add_remove_sub_channel_partners = 'add_remove_sub_channel_partners'
    add_remove_organizations = 'add_remove_organizations'
    alter_state_sub_channel_partners = 'alter_state_sub_channel_partners'
    alter_state_organizations = 'alter_state_organizations'
    administer_organization_systems = 'administer_organization_systems'
    view_service_reports = 'view_service_reports'
    add_remove_service_quantities = 'add_remove_service_quantities'


class ChannelPartner(FieldOriginalMixin, ChannelPartnerStates, models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    users = models.ManyToManyField(CloudUser, blank=True, related_name='channel_partners',
                                   through='ChannelPartnerToUser')
    name = models.CharField(max_length=150)
    parent_channel_partner = models.ForeignKey('ChannelPartner', null=True, blank=True,
                                               on_delete=models.CASCADE, related_name='channel_partners')
    state = models.IntegerField(choices=ChannelPartnerStates.STATE_CHOICES,
                                blank=False, default=ChannelPartnerStates.ACTIVE)
    effective_state = models.IntegerField(choices=ChannelPartnerStates.STATE_CHOICES,
                                          blank=False, default=ChannelPartnerStates.ACTIVE)
    cloud_host = models.ForeignKey(CloudHost, on_delete=models.CASCADE)
    monthly_additional_service_limit = models.BigIntegerField(default=None, null=True, blank=True)
    attributes = models.JSONField(blank=True, default=dict)
    support_information = models.JSONField(blank=True, default=dict)
    created_ts = models.DateTimeField(auto_now_add=True)
    path = ArrayField(base_field=models.UUIDField(null=False), null=True)

    objects = ExternalIdTargetManager()
    external_id_field_name = 'id'  # Field that is checked for possible external id usage

    observed_fields = ('state', 'effective_state', 'name')

    tree = CTEManager()

    MAX_DEPTH = 5

    class Meta:
        permissions = [
            (ChannelPartnerPermissions.configure_channel_partner, 'Change CP account settings if we have any'),
            (ChannelPartnerPermissions.manage_users,
             'Add/Remove users from CP account, assign them permissions, including Administrator permissions'),
            (ChannelPartnerPermissions.add_remove_sub_channel_partners,
             'A permission that allows to manage sub-CP accounts. This permission allow CP user to create/delete only direct children of their CP account.'),
            (ChannelPartnerPermissions.add_remove_organizations, 'Create and delete Organizations for CP account.'),
            (ChannelPartnerPermissions.alter_state_sub_channel_partners, 'Suspend & Shutdown Sub Channel Partners'),
            (ChannelPartnerPermissions.alter_state_organizations, 'Suspend & Shutdown Organizations'),
            (ChannelPartnerPermissions.administer_organization_systems,
             'Access/administer organization\'s systems. Final access is determined by organization\'s settings.'),
            (ChannelPartnerPermissions.view_service_reports,
             'Ability to view how many services are consumed by direct children of the CP. With a breakdown for each organization by services, by systems and system groups, for each Sub-CP by services.'),
            (ChannelPartnerPermissions.add_remove_service_quantities,
             'Change the quantity of services for child organizations')
        ]
        indexes = [
            GinIndex(name="channelpartner_path_gin", fields=['path'], opclasses=['array_ops'])
        ]

    permissions = ChannelPartnerPermissions

    def __str__(self):
        return f'{self.name} - {self.cloud_host.hostname}'

    @property
    def partner_count(self) -> int:
        return ChannelPartner.get_direct_channel_partner_children_count(channel_partner=self)

    @property
    def organization_count(self) -> int:
        return ChannelPartner.get_direct_organization_children_count(channel_partner=self)

    @django.db.transaction.atomic()
    def set_attributes(self, attributes: Dict[str, any], partial=False):
        obj = ChannelPartner.objects.filter(id=self.id).select_for_update().get()
        if partial:
            for key, val in attributes.items():
                if val == '*unset*':
                    obj.attributes.pop(key, None)
                else:
                    obj.attributes[key] = val
        else:
            obj.attributes = attributes
        obj.save()
        self.refresh_from_db()

    def allowed_role_names(self, perm: str):
        return [role.name for role in ChannelPartnerRole.objects.filter(permissions__codename=perm)]

    def allowed_role_uuid(self, perm: str) -> list:
        roles = get_channel_partner_roles()
        ids = {r['id'] for _, r in roles.items() if perm in r['permissions']}
        return list(ids)

    def has_perm(self, user: CloudUser, perm: str):
        allowed_role_uuid = self.allowed_role_uuid(perm)
        return ChannelPartnerToUser.objects.filter(
            user=user, roles__overlap=allowed_role_uuid, channel_partner=self).exists()

    def is_member_in_branch(self, user: CloudUser, perm=None) -> bool:
        """
        Checks if the user has role in channel partner or any of its ancestors.
        Args:
            user (CloudUser): The user whom permission is checked
            perm (str, optional): looking permission codename, if given only
             satisfying roles will be checked
        Returns:
            bool
        """
        queryset = ChannelPartnerToUser.objects.filter(
            user=user,
            channel_partner__id__in=get_path_from_parent(self)
        )
        if perm:
            allowed_role_uuid = self.allowed_role_uuid(perm)
            queryset = queryset.filter(roles__overlap=allowed_role_uuid)
        return queryset.exists()

    def is_member(self, user: CloudUser) -> bool:
        """
        Checks if the user has role in the channel partner.
        Args:
            user (CloudUser): The user whom permission is checked
        Returns:
            bool
        """
        return ChannelPartnerToUser.objects.filter(user=user, channel_partner=self).exists()

    def can_access(self, user: CloudUser) -> bool:
        """
        Checks if the user can access the channel partner information. The most loose permission for
        accessing channel partner. Can be used with exact channel partner only. Avoid using it
        from any of CP children (SubCP, org, groups, etc.).
        Args:
            user (CloudUser): The user whom permission is checked
        Returns:
            bool
        """
        return (
            # User has a role in this channel partner or any of its ancestors
                self.is_member_in_branch(user) or
                # User has a role in any of channel partner direct children channel partner
                user.channel_partners.filter(parent_channel_partner=self).exists() or
                # User has a role in any of channel partner direct organizations
                OrganizationToUser.objects.filter(organization__channel_partner=self, user=user).exists()
        )

    def can_manage(self, user: CloudUser):
        """
        Checks if the user can manage the channel partner services. Nx users can manage
        root channel partner. Other partners users cannot manage channel partner services.
        Args:
            user (CloudUser): The user whom permission is checked
        Returns:
            bool
        """
        if self.parent_channel_partner:
            return self.parent_channel_partner.can_add_or_remove_sub_chanel_partners(user)
        else:
            return self.has_perm(user, ChannelPartnerPermissions.configure_channel_partner)

    def can_configure(self, user: CloudUser):
        """
        Check if user can configure channel partner information.
        Args:
            user (CloudUser): The user whom permission is checked
        Returns:
            bool
        """
        if self.has_perm(user, ChannelPartnerPermissions.configure_channel_partner):
            return True
        return (self.parent_channel_partner and
                self.parent_channel_partner.can_add_or_remove_sub_chanel_partners(user))

    def can_manage_users(self, user: CloudUser):
        if self.has_perm(user, ChannelPartnerPermissions.manage_users):
            return True
        elif (self.users.filter(channelpartnertouser__roles__overlap=self.allowed_role_uuid(
            ChannelPartnerPermissions.manage_users)).count() == 0
              and self.parent_channel_partner
              and self.parent_channel_partner.can_add_or_remove_sub_chanel_partners(user)):
            return True
        return False

    def can_add_or_remove_sub_chanel_partners(self, user: CloudUser):
        return self.has_perm(user, ChannelPartnerPermissions.add_remove_sub_channel_partners)

    def can_add_or_remove_organizations(self, user: CloudUser):
        return self.has_perm(user, ChannelPartnerPermissions.add_remove_organizations)

    def can_alter_sub_channel_partner_state(self, user: CloudUser):
        return self.has_perm(user, ChannelPartnerPermissions.alter_state_sub_channel_partners)

    def can_alter_state(self, user: CloudUser):
        # switch to calculation on current instance instead of calling parent's one
        if self.parent_channel_partner:
            return self.parent_channel_partner.can_alter_sub_channel_partner_state(user)

    def can_alter_organization_state(self, user: CloudUser):
        return self.has_perm(user, ChannelPartnerPermissions.alter_state_organizations)

    def can_administer_organization_systems(self, user: CloudUser):
        return self.has_perm(user, ChannelPartnerPermissions.administer_organization_systems)

    def can_view_service_reports(self, user: CloudUser):
        return self.is_member_in_branch(user, ChannelPartnerPermissions.view_service_reports)

    def can_modify_organization_service_quantities(self, user: CloudUser):
        # return self.has_perm(user, ChannelPartnerPermissions.add_remove_service_quantities) \
        #     and self.allow_changing_services
        return self.has_perm(user, ChannelPartnerPermissions.add_remove_service_quantities)

    @staticmethod
    def get_direct_channel_partner_children_count(channel_partner: 'ChannelPartner') -> int:
        cache_key: str = cp_direct_children_count(str(channel_partner.id))
        cached_result = caches['default'].get(cache_key)
        if cached_result:
            return cached_result
        else:
            count = ChannelPartner.objects.filter(parent_channel_partner=channel_partner).count()
            caches['default'].set(cache_key, count, timeout=3600)
            return count

    @staticmethod
    def get_direct_organization_children_count(channel_partner: 'ChannelPartner') -> int:
        cache_key = direct_organization_children_count(str(channel_partner.id))
        count = caches['default'].get(cache_key)
        if count is None:
            count = Organization.objects.filter(channel_partner=channel_partner).count()
            caches['default'].set(cache_key, count, 3600)
        return count

    @property
    def all_services(self):
        services = self.services.all()
        return services

    def save(self, *args, **kwargs):
        new = self._state.adding
        effective_state_changed = False

        if not new:
            if self._original_effective_state != self.effective_state:
                effective_state_changed = True

        with transaction.atomic():
            # creation of channel partner with a different host is available through django admin site
            # and for second level of channel partners (direct children of Nx Channel Partner) only
            if self.parent_channel_partner:
                if self.parent_channel_partner.parent_channel_partner or not self.cloud_host_id:
                    self.cloud_host = self.parent_channel_partner.cloud_host
            name_changed = not new and self.name != self._original_name
            old_name = self._original_name
            if new:
                if self.parent_channel_partner is None or self.parent_channel_partner_id is None:
                    if ChannelPartner.objects.filter(parent_channel_partner__isnull=True).exclude(pk=self.pk).exists():
                        raise ValidationError({
                                'parent_channel_partner_id': 'Only one root channel partner is allowed.'
                        })
                if self.parent_channel_partner:
                    self.invalidate_cache(str(self.parent_channel_partner.id))

                if self.parent_channel_partner_id:
                    self.path = get_path_from_parent(self.parent_channel_partner)
            updated_descendants = self.update_state()
            super().save(*args, **kwargs)

            if self.parent_channel_partner and new:
                transaction.on_commit(
                    lambda: new_channel_partner_created.apply_async(args=[self.pk]))
            if name_changed:
                from partners.tasks.notification import (
                    run_partner_name_change_tasks,
                )
                run_partner_name_change_tasks(self, old_name=old_name, new_name=self.name)
            if updated_descendants:
                from partners.tasks.notification import (
                    run_organization_state_changed_tasks,
                    run_partner_state_changed_tasks,
                )
                transaction.on_commit(
                    lambda: run_partner_state_changed_tasks.apply_async(args=[updated_descendants]))
                transaction.on_commit(
                    lambda: run_organization_state_changed_tasks.apply_async(args=[updated_descendants]))

    @staticmethod
    def invalidate_cache(pk: str) -> None:
        cache_key: str = cp_direct_children_count(pk)
        cache = caches['default'].delete(cache_key)

    def parent_channel_partner_args(
            self,
            base_arg='service',
            secondary_arg='parent_service',
            suffix_arg='',
            value=None
        ) -> models.Q:
        """Returns Q object of parent channel partner condtions"""
        if value is None:
            value = self
        parent_conditions = models.Q(**{base_arg + (f'__{suffix_arg}' if suffix_arg else ''): value})
        for i in range(self.MAX_DEPTH):
            parent_conditions |= models.Q(
                **{base_arg + f'__{secondary_arg}' * (i + 1) + (f'__{suffix_arg}' if suffix_arg else ''): value})
        return parent_conditions

    def service_changes_summary(self, start_ts: datetime.date, end_ts: datetime.date):
        channel_partner_condition = self.parent_channel_partner_args('service', 'parent_service',
                                                                     value=models.OuterRef('pk'))
        if start_ts is None or end_ts is None:
            raise ValueError("Filter timestamps must be passed.")
        start_calc = {
            str(service.id): service
            for service in self.services.filter().annotate(quantity=models.Subquery(
                queryset=ChannelPartnerServiceRecord.objects.filter(
                    channel_partner_condition,
                    created_ts__lt=start_ts,
                ).annotate(sum=models.Func(F('quantity'), function='SUM')).values('sum'),
                output_field=models.IntegerField()
            ))
        }

        end_calc = list(self.services.filter().annotate(quantity=models.Subquery(
            queryset=ChannelPartnerServiceRecord.objects.filter(
                channel_partner_condition,
                created_ts__lt=end_ts
            ).annotate(sum=models.Func(F('quantity'), function='SUM')).values('sum'),
            output_field=models.IntegerField()
        )))

        summary = []
        for end_record in end_calc:
            start_record = start_calc.get(str(end_record.id))
            summary.append({
                'end': end_record.quantity if end_record.quantity else 0,
                'start': start_record.quantity if start_record and start_record.quantity else 0,
                'service': end_record
            })
        return summary

    def service_changes(self, start_ts: datetime.date,
                        end_ts: datetime.date) -> 'QuerySet[ChannelPartnerServiceRecord]':
        if start_ts is None or end_ts is None:
            raise ValueError("Filter timestamps must be passed.")
        qs = ChannelPartnerServiceRecord.objects.filter(
            self.parent_channel_partner_args(base_arg='service', secondary_arg='parent_service',
                                             suffix_arg='created_by_channel_partner', value=self),
            created_ts__gte=start_ts, created_ts__lt=end_ts
        ).select_related('organization', 'created_by',
                         f'service{"__parent_service" * (self.MAX_DEPTH - 1)}')

        return qs

    def calculate_monthly_changes(self, use_cache: bool = False) -> dict:
        start_ts = get_period_start()
        cache_key = cp_monthly_charges(self.id, start_ts.date())
        if use_cache and (changes := caches['default'].get(cache_key)):
            return changes
        cp_tree = self.get_successors(self.pk)
        qs = (
            ChannelPartnerServiceRecord.objects
            .exclude(cloud_system__state=ChannelPartnerStates.SHUTDOWN)
            .filter(created_ts__gte=start_ts, organization__channel_partner__in=cp_tree)
        ).values('service__type').annotate(monthly_changes=Sum('quantity'))
        changes = {change['service__type']: change['monthly_changes'] for change in qs}
        caches['default'].set(cache_key, changes, timeout=3600)
        return changes

    def remaining_monthly_limits(self):
        if self.monthly_additional_service_limit == 0 or self.monthly_additional_service_limit is None:
            return None
        monthly_changes = self.calculate_monthly_changes(use_cache=True)
        return {
            s_type: self.monthly_additional_service_limit - monthly_changes.get(s_type, 0)
            for s_type, _ in ChannelPartnerService.SERVICE_TYPES
        }

    @classmethod
    def get_successors(cls, ancestor_id: str = None,
                       include_ancestor: bool = True) -> 'QuerySet[ChannelPartner]':
        query = Q(path__contains=[ancestor_id])
        if include_ancestor:
            query |= Q(pk=ancestor_id)
        return cls.objects.filter(query)

    @classmethod
    def get_ancestors(cls, successor_id: str):
        partners_tree = (
            cls.objects
            .filter(id__in=Subquery(
                cls.objects
                .filter(id=successor_id)
                # unnest ( anyarray ) → setof anyelement
                # Expands an array into a set of rows. The array's elements are read out in storage order.
                .annotate(parents=models.Func('path', function='unnest'))
                .values('parents'))
            )
        )
        return partners_tree

    def successors(self) -> 'QuerySet[ChannelPartner]':
        return ChannelPartner.objects.filter(path__contains=[self.id])

    @classmethod
    def update_effective_states(cls, queryset, parent_effective_state):
        cp_to_update = []
        # exclude records which do not require for changing state
        queryset = queryset.exclude(
            effective_state=Greatest(F("state"), models.Value(parent_effective_state)))
        updated_ids = []
        for channel_partner in queryset:
            effective_state = max(channel_partner.state, parent_effective_state)
            if effective_state == channel_partner.effective_state:
                continue
            channel_partner.effective_state = max(channel_partner.state, parent_effective_state)
            cp_to_update.append(channel_partner)
            updated_ids.append(channel_partner.id)
            updated_ids += Organization.update_effective_states(
                channel_partner.organizations,
                parent_effective_state=effective_state)
            updated_ids += cls.update_effective_states(
                cls.objects.filter(parent_channel_partner=channel_partner),
                parent_effective_state=effective_state
            )
        cls.objects.bulk_update(cp_to_update, fields=['effective_state'])
        return updated_ids

    def update_state(self):
        """
        Updates Organization.effective_state due to state changes, if effective_state
         changed then updates effective states on all children organization and systems
         and negates services when needed.
         Note. This method does not save states themselves, super().save() must be called after.
        """
        self.effective_state = max(self.state, getattr(self.parent_channel_partner, 'effective_state', 0))
        if self._state.adding:
            return
        if self.state == self._original_state:
            return
        if self.effective_state == self._original_effective_state:
            return
        updated_ids = Organization.update_effective_states(
            self.organizations,
            parent_effective_state=self.effective_state)
        updated_ids += self.update_effective_states(self.channel_partners, parent_effective_state=self.effective_state)
        return updated_ids + [self.id]


class ChannelPartnerToUser(models.Model):
    channel_partner = models.ForeignKey(ChannelPartner, on_delete=models.CASCADE)
    user = models.ForeignKey(CloudUser, on_delete=models.CASCADE)
    roles = ArrayField(base_field=models.UUIDField(), default=list)
    title = models.CharField(max_length=100, blank=True)
    attributes = models.JSONField(blank=True, default=dict)
    created_ts = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.constraints.UniqueConstraint(fields=['channel_partner', 'user'], name='unique_channel_partner_user')
        ]
        indexes = [
            GinIndex(name="channelpartnertouser_roles_gin", fields=['roles'], opclasses=['array_ops'])
        ]

    def can_manage(self, user: CloudUser):
        return self.channel_partner.can_manage_users(user)

    def can_delete(self, user: CloudUser):
        if self.user == user:
            return True
        return self.can_manage(user)

    @classmethod
    def is_channel_partner_user(cls, user: CloudUser):
        return cls.objects.filter(user=user).exists()

    @property
    def roles_name(self):
        roles = get_channel_partner_roles()
        return [roles[r]['name'] for r in self.roles]

    @django.db.transaction.atomic()
    def set_attributes(self, attributes: Dict[str, any], partial: bool = False) -> None:
        # Lock row until transaction is complete
        obj: ChannelPartnerToUser = ChannelPartnerToUser.objects.filter(
            pk=self.pk
        ).select_for_update().get()

        if partial:
            for key, val in attributes.items():
                if val == '*unset*':
                    obj.attributes.pop(key, None)
                else:
                    obj.attributes[key] = val
        else:
            obj.attributes = attributes
        obj.save()
        self.refresh_from_db()

    def get_hierarchy_level(self, instance) -> None | int:
        # instance is relation's channel partner
        if instance.id == self.channel_partner_id:
            return HierarchyLevels.own
        if isinstance(instance, ChannelPartner):
            # instance is the parent of relation's channel partner
            if instance.id == self.channel_partner.parent_channel_partner_id:
                return HierarchyLevels.parent
        # instance some of relation's partner children, calculating level
        if instance.path and self.channel_partner_id in instance.path:
            if isinstance(instance, ChannelPartner) or isinstance(instance, Organization):
                return instance.path.index(self.channel_partner_id) + 1
            if isinstance(instance, CloudSystemId) or isinstance(instance, SystemGroup):
                return instance.path.index(self.channel_partner_id) - instance.path.index(instance.organization_id)


class OrganizationRoles:
    ORGANIZATION_ADMINISTRATOR = uuid.UUID('00000000-0000-4000-8000-000000000001')
    ADMINISTRATOR = uuid.UUID('00000000-0000-4000-8000-000000000002')
    POWER_USER = uuid.UUID('00000000-0000-4000-8000-000000000003')
    SYSTEM_HEALTH_VIEWER = uuid.UUID('00000000-0000-4000-8000-000000000004')
    ADVANCED_VIEWER = uuid.UUID('00000000-0000-4000-8000-000000000005')
    VIEWER = uuid.UUID('00000000-0000-4000-8000-000000000006')
    LIVE_VIEWER = uuid.UUID('00000000-0000-4000-8000-000000000007')

    CPAL_ROLES = [ORGANIZATION_ADMINISTRATOR, SYSTEM_HEALTH_VIEWER]
    CPAL_CHOICES = [
        (ORGANIZATION_ADMINISTRATOR, 'Organization Administrator'),
        (SYSTEM_HEALTH_VIEWER, 'System Health Viewer'),
        (None, 'Service Management Only'),
    ]


class VmsRoles:
    ADMINISTRATOR = uuid.UUID('00000000-0000-0000-0000-100000000000')
    POWER_USER = uuid.UUID('00000000-0000-0000-0000-100000000001')
    ADVANCED_VIEWER = uuid.UUID('00000000-0000-0000-0000-100000000002')
    VIEWER = uuid.UUID('00000000-0000-0000-0000-100000000003')
    LIVE_VIEWER = uuid.UUID('00000000-0000-0000-0000-100000000004')
    SYSTEM_HEALTH_VIEWER = uuid.UUID('00000000-0000-0000-0000-100000000005')

    ALL_ROLES = [
        ADMINISTRATOR,
        POWER_USER,
        ADVANCED_VIEWER,
        VIEWER,
        LIVE_VIEWER,
        SYSTEM_HEALTH_VIEWER,
    ]


class OrganizationRole(models.Model):
    id = models.UUIDField(primary_key=True, editable=False, default=uuid.uuid4)
    name = models.CharField(max_length=100, unique=True)
    system_role = models.CharField(max_length=100, blank=True, default='')
    system_role_uuid = models.UUIDField(blank=True, null=True)
    permissions = models.ManyToManyField(Permission)

    def __str__(self):
        return self.name


class OrganizationPermissions:
    manage_systems = 'manage_systems'
    manage_users = 'manage_users'
    configure_organization = 'configure_organization'
    view_service_reports = 'view_service_reports'
    view_health_monitoring = 'view_health_monitoring'
    access_systems = 'access_systems'


class ChannelPartnerAccessLevel:
    # leave empty spaces for additional levels
    FULL = OrganizationRoles.ORGANIZATION_ADMINISTRATOR
    PRIVACY_MODE = OrganizationRoles.SYSTEM_HEALTH_VIEWER
    NO_ACCESS = Empty

    LEVEL_CHOICES = [
        (FULL, 'Full Access'),
        (PRIVACY_MODE, 'Full Access + Activated Privacy Mode'),
        (NO_ACCESS, 'No Access')
    ]

    LEVEL_CODES = [
        ('full', FULL),
        ('privacy_mode', PRIVACY_MODE),
        ('no_access', NO_ACCESS)
    ]


class Organization(FieldOriginalMixin, ChannelPartnerAccessLevel, ChannelPartnerStates, models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    channel_partner = models.ForeignKey(ChannelPartner, on_delete=models.CASCADE, related_name='organizations')
    name = models.CharField(max_length=150)
    users = models.ManyToManyField(CloudUser, related_name='organizations',
                                   blank=True, through='OrganizationToUser')
    state = models.IntegerField(choices=ChannelPartnerStates.STATE_CHOICES,
                                blank=False, default=ChannelPartnerStates.ACTIVE)
    effective_state = models.IntegerField(choices=ChannelPartnerStates.STATE_CHOICES,
                                          blank=False, default=ChannelPartnerStates.ACTIVE)
    channel_partner_access_level = models.ForeignKey(OrganizationRole, null=True,
                                                     default=OrganizationRoles.ORGANIZATION_ADMINISTRATOR,
                                                     limit_choices_to={'id__in': OrganizationRoles.CPAL_ROLES},
                                                     on_delete=models.SET_NULL)
    created_ts = models.DateTimeField(auto_now_add=True)
    attributes = models.JSONField(default=dict, blank=True)
    path = ArrayField(base_field=models.UUIDField(null=False), null=True)

    objects = ExternalIdTargetManager()
    external_id_field_name = 'id'  # Field that is checked for possible external id usage

    observed_fields = ('state', 'effective_state', 'channel_partner_id', 'name')

    class Meta:
        permissions = [
            (OrganizationPermissions.manage_systems,
             'Can add and remove systems to the Organization and create, edit, delete groups'),
            (OrganizationPermissions.manage_users,
             'Add/Remove users from the Organization, assign them permissions, including Administrator permissions'),
            (OrganizationPermissions.configure_organization, 'Edit Organization settings'),
            (OrganizationPermissions.view_service_reports,
             'Ability to view how many services are consumed by this Organization.'),
            (OrganizationPermissions.view_health_monitoring, 'View health monitoring information'),
            (OrganizationPermissions.access_systems, 'Access Organization’s systems with system role\'s permissions')

        ]
        indexes = [
            GinIndex(name="organization_path_gin", fields=['path'], opclasses=['array_ops'])
        ]

    permissions = OrganizationPermissions

    def save(self, *args, **kwargs):
        new = self._state.adding
        name_changed = not new and self.name != self._original_name
        old_name = self._original_name
        effective_state_changed = False

        if not new:
            if self._original_effective_state != self.effective_state:
                effective_state_changed = True

        with transaction.atomic():
            if new:
                self.id = self.id or uuid.uuid4()
                if self.channel_partner_id:
                    self.path = get_path_from_parent(self.channel_partner)
                self.invalidate_channel_partner_org_count(self.channel_partner)
            state_changed = self.update_state()
            super().save(*args, **kwargs)
            if name_changed:
                from partners.tasks.notification import (
                    run_organization_name_change_tasks,
                )
                run_organization_name_change_tasks(self, old_name=old_name, new_name=self.name)
            if state_changed:
                from partners.tasks.notification import (
                    run_organization_state_changed_tasks,
                )
                transaction.on_commit(lambda: run_organization_state_changed_tasks.apply_async(args=[[self.id]]))


    @property
    def system_count(self) -> int:
        cache_key: str = organization_system_count(str(self.id))
        cached_result = caches['default'].get(cache_key)
        if cached_result is not None:
            return cached_result
        else:
            count = CloudSystemId.objects.filter(
                organization=self,
                system_state=CloudSystemStates.ACTIVATED,
            ).count()
            caches['default'].set(cache_key, count, timeout=3600)
            return count

    def invalidate_channel_partner_org_count(self, channel_partner: 'ChannelPartner') -> None:
        pk = str(channel_partner.id)
        cache_key = direct_organization_children_count(pk)
        cache = caches['default'].delete(cache_key)

    def __str__(self):
        return self.name

    @property
    def channel_partner_access_level_code(self):
        return self.channel_partner_access_level_id or self.NO_ACCESS

    @channel_partner_access_level_code.setter
    def channel_partner_access_level_code(self, value):
        if value is Empty:
            self.channel_partner_access_level = None
        else:
            self.channel_partner_access_level_id = value

    @django.db.transaction.atomic()
    def set_attributes(self, attributes, partial=False):
        obj = Organization.objects.filter(id=self.id).select_for_update().get()
        if partial:
            for key, val in attributes.items():
                if val == '*unset*':
                    obj.attributes.pop(key, None)
                else:
                    obj.attributes[key] = val
        else:
            obj.attributes = attributes
        obj.save()
        self.refresh_from_db()

    def service_changes_summary(self, start_ts: datetime.date, end_ts: datetime.date):
        if start_ts is None or end_ts is None:
            raise ValueError("Filter timestamps must be passed.")
        start_calc = {str(service.id): service
                      for service in ChannelPartnerService.objects.filter(
                channelpartnerservicerecord__organization=self,
                channelpartnerservicerecord__created_ts__lt=start_ts
            ).annotate(quantity=Sum('channelpartnerservicerecord__quantity'))}

        end_calc = list(ChannelPartnerService.objects.filter(
            channelpartnerservicerecord__organization=self,
            channelpartnerservicerecord__created_ts__lt=end_ts
        ).annotate(quantity=Sum('channelpartnerservicerecord__quantity')))

        summary = []
        for end_record in end_calc:
            start_record = start_calc.get(str(end_record.id))
            summary.append({
                'end': end_record.quantity,
                'start': start_record.quantity if start_record else 0,
                'service': end_record
            })
        return summary

    def service_changes(
            self,
            start_ts: datetime.date,
            end_ts: datetime.date
        ) -> 'QuerySet[ChannelPartnerServiceRecord]':
        if start_ts is None or end_ts is None:
            raise ValueError("Filter timestamps must be passed.")
        return ChannelPartnerServiceRecord.objects.filter(
            organization=self, created_ts__gte=start_ts, created_ts__lt=end_ts
        ).order_by('created_ts')

    def current_services(self) -> dict:

        service_records = (ChannelPartnerServiceRecord.objects.filter(organization=self)
                           .values('service').annotate(quantity=Sum('quantity')))
        services_ids = [service.get('service') for service in service_records]
        current_services = {}
        properties = ServiceToOrganizationProperties.objects.filter(organization=self, service__in=services_ids)
        for service in service_records:
            prop = next(filter(lambda p: p.service_id == service.get('service'), properties), None)
            price = 0 if not prop else (prop.price or 0)
            current_services[str(service['service'])] = {
                'price': price,
                'quantity': service.get('quantity') or 0,
                'total': price * (service.get('quantity') or 0)
            }
        return current_services

    def allowed_role_names(self, perm: str):
        return [role.name for role in OrganizationRole.objects.filter(permissions__codename=perm)]

    def allowed_role_uuid(self, perm: str) -> list:
        roles = get_organization_roles()
        ids = {r['id'] for _, r in roles.items() if perm in r['permissions']}
        return list(ids)

    def has_perm(self, user: CloudUser, perm: str):
        allowed_role_uuid = self.allowed_role_uuid(perm)
        user_with_roles = OrganizationToUser.objects.filter(
            organization=self,
            user=user,
            roles__overlap=allowed_role_uuid,
            system_group__isnull=True
        )
        if allowed_role_uuid and user_with_roles.exists():
            return True
        if not self.channel_partner_access_level_id:
            return False
        if self.channel_partner_access_level_id in allowed_role_uuid:
            channel_partner_manager = ChannelPartnerToUser.objects.filter(
                user=user, channel_partner=self.channel_partner,
                roles__overlap=[ChannelPartnerRoles.ADMINISTRATOR, ChannelPartnerRoles.MANAGER]
            ).exists()
            if channel_partner_manager:
                user.cpal_on = self.id
                return True
        return False

    def is_member_in_branch(self, user: CloudUser, perm: str = None) -> bool:
        if perm:
            org_level_access = self.has_perm(user, perm)
        else:
            org_level_access = OrganizationToUser.objects.filter(user=user, organization=self).exists()

        if org_level_access:
            return True

        is_member_in_ancestors = ChannelPartnerToUser.objects.filter(
            user=user,
            channel_partner_id__in=self.path
        ).exists()
        return is_member_in_ancestors

    def can_access(self, user: CloudUser):
        return (
            self.users.filter(pk=user.pk).exists()
            or self.channel_partner.users.filter(pk=user.pk).exists()
        )

    def can_add_or_remove(self, user: CloudUser):
        return self.channel_partner.can_add_or_remove_organizations(user)

    def can_modify_service_quantities(self, user: CloudUser):
        return self.channel_partner.can_modify_organization_service_quantities(user)

    def can_configure(self, user: CloudUser):
        if self.has_perm(user, OrganizationPermissions.configure_organization):
            return True
        # TODO: move changing state to another request handler with proper
        #  permissions. For now permissions are handled by access matrix.
        return self.can_alter_state(user)

    def can_manage_systems(self, user: CloudUser):
        return self.has_perm(user, OrganizationPermissions.manage_systems)

    def can_manage_users(self, user: CloudUser):
        if self.has_perm(user, OrganizationPermissions.manage_users):
            return True
        has_admins = self.users.filter(
            organizationtouser__roles__overlap=self.allowed_role_uuid(OrganizationPermissions.manage_users)
        ).exists()
        if not has_admins and self.channel_partner.can_add_or_remove_organizations(user):
            return True
        return False

    def can_view_service_reports(self, user: CloudUser):
        return (
            self.has_perm(user, OrganizationPermissions.view_service_reports)
            or self.channel_partner.is_member_in_branch(user, perm=ChannelPartnerPermissions.view_service_reports)
        )

    def can_view_health_monitoring(self, user: CloudUser):
        return self.has_perm(user, OrganizationPermissions.view_health_monitoring)

    def can_access_systems(self, user: CloudUser):
        return self.has_perm(user, OrganizationPermissions.access_systems)

    def can_access_organization_systems(self, user: CloudUser):
        """
        Checks if the user is allowed to access all organization systems list.
        Group users is not allowed to do that. Permission is granted based on
        membership only.
        Arguments:
            user (CloudUser): The user to check
        Returns:
            bool
        """
        return (
            OrganizationToUser.objects.filter(organization=self, system_group__isnull=True, user=user).exists()
            or self.channel_partner.is_member_in_branch(user)
        )

    def user_systems(self, user: CloudUser):
        if self.can_access_systems(user):
            return CloudSystemId.objects.filter(
                organization=self,
                system_state=CloudSystemStates.ACTIVATED
            )
        if self.organizationtouser_set.filter(user=user).exists():
            allowed_role_uuid = self.allowed_role_uuid(OrganizationPermissions.access_systems)
            return CloudSystemId.objects.filter(
                organization=self,
                system_state=CloudSystemStates.ACTIVATED,
                organization__organizationtouser__user=user,
                organization__organizationtouser__roles__overlap=allowed_role_uuid,
                path__overlap=ToArray('organization__organizationtouser__system_group_id')
            )

    def can_alter_state(self, user: CloudUser):
        return self.channel_partner.can_alter_organization_state(user)

    @property
    def all_services(self):
        return self.channel_partner.all_services

    @classmethod
    def update_effective_states(cls, queryset, parent_effective_state):
        org_updated = []
        updated_ids = []
        queryset = queryset.exclude(
            effective_state=Greatest("state", models.Value(parent_effective_state)))
        for organization in queryset:
            effective_state = max(organization.state, parent_effective_state)
            organization.effective_state = max(organization.state, parent_effective_state)
            org_updated.append(organization)
            updated_ids.append(organization.id)
            organization.update_systems_effective_states(organization_effective_state=effective_state)
        cls.objects.bulk_update(org_updated, fields=['effective_state'], batch_size=100)
        return updated_ids

    def update_systems_effective_states(self, organization_effective_state):
        queryset = self.cloud_systems.exclude(effective_state=organization_effective_state)
        if organization_effective_state == ChannelPartnerStates.SHUTDOWN:
            queryset.update(
                effective_state=Greatest("state", models.Value(organization_effective_state)),
                current_services={}
            )
            systems_ids = self.cloud_systems.values_list("id", flat=True)
            organization_systems_negation_task.apply_async(args=[self.id, list(systems_ids)])
        else:
            self.cloud_systems.update(
                effective_state=Greatest("state", models.Value(organization_effective_state)))

    def update_state(self) -> bool:
        """
        Updates Organization.effective_state due to state changes, if effective_state
         changed then updates effective states on all children systems and negates services when needed.
         Note. This method does not save states, super().save() must be called after.
        """
        self.effective_state = max(self.state, self.channel_partner.effective_state)
        if self._state.adding:
            return False
        if self.state == self._original_state:
            return False
        if self.effective_state == self._original_effective_state:
            return False
        self.update_systems_effective_states(organization_effective_state=self.effective_state)
        return True

    def system_group_member_dict(self, user: CloudUser):
        return {rel['system_group_id']: rel for rel in
                OrganizationToUser.objects.filter(organization=self, user=user).values('system_group_id', 'roles')}

    @property
    def groups_map(self):
        org_groups = self.groups.all().values()
        return {group['id']: group for group in org_groups}

    @property
    def groups_tree(self):
        org_groups = self.groups.all().values()
        tree_roots = []
        groups_map = {}

        for group in org_groups:
            groups_map[group['id']] = group
            group['children'] = []

        for group in org_groups:
            if group['parent_id']:
                groups_map[group['parent_id']]['children'].append(group)
            else:
                tree_roots.append(group)

        return tree_roots

    def get_groups_structure_for_user(self, user: CloudUser) -> List[GroupStructure]:
        # Todo. Where all duplicated roles will be deleted. Channel partner check
        #  can be removed from here as soon as has been done in view early and absence
        #  of organization roles means user has channel partner one.
        groups_membership = [None]
        if not (ChannelPartnerToUser.objects
                .filter(channel_partner_id=self.channel_partner_id, user=user).exists()):
            groups_membership = (
                OrganizationToUser.objects
                .filter(organization_id=self, user=user)
                .values_list('system_group_id', flat=True)
            )
            groups_membership = list(groups_membership)
            if len(groups_membership) == 0:
                return []
        if None in groups_membership:
            # User is a member of organization or channel partner
            user_groups = SystemGroup.objects.filter(organization=self)
        else:
            # User is a member of groups
            user_groups = SystemGroup.objects.filter(
                Q(path__overlap=groups_membership) | Q(id__in=groups_membership),
                organization=self
            )

        groups = user_groups.values()
        trees = []
        added = {}
        orphans = {}
        for group in groups:
            # get groups from orphans which are direct children
            group['children'] = orphans.pop(group['id'], [])
            added[group['id']] = group
            # check if group is on top of user branch or root group
            if not group['parent_id'] or group['id'] in groups_membership:
                trees.append(group)
                continue

            if parent := added.get(group['parent_id']):
                parent['children'].append(group)
            else:
                # add groups that cannot find parent to orphans dict
                if siblings := orphans.get(group['parent_id']):
                    siblings.append(group)
                else:
                    orphans[group['parent_id']] = [group]
        assert not orphans
        return trees

    @property
    def user_list(self):
        return self.users.all().distinct()

    @property
    def direct_users(self):
        return self.users.filter(organizationtouser__system_group=None)


class SystemGroup(FieldOriginalMixin, models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=1024)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='groups')
    parent = models.ForeignKey('SystemGroup', on_delete=models.PROTECT,
                               blank=True, null=True, related_name='groups')
    created_ts = models.DateTimeField(auto_now_add=True)
    path = ArrayField(base_field=models.UUIDField(null=False), null=True)

    observed_fields = ('organization_id', 'parent_id')

    class Meta:
        indexes = [
            GinIndex(name="systemgroup_path_gin", fields=['path'], opclasses=['array_ops'])
        ]

    def save(
            self, force_insert=False, force_update=False, using=None, update_fields=None
    ):
        with transaction.atomic():
            new = self._state.adding
            if not new and self.organization_id != self._original_organization_id:
                raise ValueError('Organization cannot be changed for a group.')
            group_changed = self.parent_id != self._original_parent_id
            old_path = self.path
            if new or group_changed:
                if self.parent_id:
                    self.path = get_path_from_parent(self.parent)
                elif self.organization_id:
                    self.path = get_path_from_parent(self.organization)
                else:
                    self.path = None

            super().save(force_insert=force_insert, force_update=force_update,
                         using=using, update_fields=update_fields)
            if not new and group_changed:
                self.move_children(old_path)

    def move_children(self, old_path: List[uuid.UUID]) -> None:
        # Altering paths for all nested groups
        SystemGroup.objects.filter(path__contains=[self.id]).update(
            path=ReplaceAncestors(old_ancestors=old_path, new_ancestors=self.path,
                                  output_field=ArrayField(base_field=models.UUIDField()))
        )
        # Altering paths for all nested systems
        CloudSystemId.objects.filter(path__contains=[self.id]).update(
            path=ReplaceAncestors(old_ancestors=old_path, new_ancestors=self.path,
                                  output_field=ArrayField(base_field=models.UUIDField()))
        )
        org_groups = self.organization.groups.all().values_list('id', flat=True)
        CloudSystemId.invalidate_groups_system_counters(org_groups)

        # Deleted overlapping in users memberships
        users_above = OrganizationToUser.objects.filter(
            organization=self.organization, system_group_id__in=self.path)
        overlaps_below = (OrganizationToUser.objects
                          .filter(organization=self.organization)
                          .filter(Q(system_group_id=self.id) | Q(system_group__path__contains=[self.id]))
                          .filter(user_id__in=users_above.values('user_id')))
        overlaps_below.delete()

    def delete(self, using=None, keep_parents=False):
        with transaction.atomic():
            organization_id = self.organization_id
            self_path = get_path_from_parent(self)
            # moving systems to a parent
            self.cloud_systems.all().update(system_group_id=self.parent_id)
            # moving child groups to a parent
            self.groups.all().update(parent=self.parent)
            # alter path for all groups below
            SystemGroup.objects.filter(path__contains=[self.id]).update(
                path=RemoveArrayElement(
                    "path",
                    element=self.id,
                    output_field=ArrayField(base_field=models.UUIDField()))
            )
            # Alter path for all systems below
            CloudSystemId.objects.filter(path__contains=[self.id]).update(
                path=RemoveArrayElement(
                    "path",
                    element=self.id,
                    output_field=ArrayField(base_field=models.UUIDField()))
            )
            super().delete(using=using, keep_parents=keep_parents)
        CloudSystemId.invalidate_groups_system_counters(self_path)
        CloudSystemId.invalidate_cache(organization_id)

    def __str__(self):
        return f'<Group {self.name}>'

    def is_root(self):
        return not self.parent

    @property
    def groups_path(self) -> List[uuid.UUID]:
        if not self.parent:
            return []
        return self.path[:self.path.index(self.organization_id)]

    @property
    def visible_path(self) -> List[uuid.UUID]:
        """
        Returns path up to organization's parent channel partner
        """
        return self.path[:self.path.index(self.organization_id) + 2]

    def get_all_users(self):
        return OrganizationToUser.objects.filter(
            Q(system_group__in=self.groups_path) | Q(system_group=None),
            organization=self.organization
        )

    @staticmethod
    def has_cycle(root):
        # Not used
        if not root:
            return False
        q = queue.SimpleQueue()
        q.put(root)
        visited = set()
        while not q.empty():
            current = q.get()
            if current.id in visited:
                return True
            visited.add(current.id)
            for child in current.groups:
                q.put(child)
        return False

    def can_access(self, user: CloudUser):
        # check organization or groups
        if (
                OrganizationToUser.objects
                        .filter(user=user)
                        .filter(
                    Q(organization_id=self.organization_id, system_group__isnull=True)
                    | Q(system_group_id__in=[self.id] + self.visible_path)
                ).exists()
        ):
            return True
        if (
                ChannelPartnerToUser.objects
                        .filter(user=user, channel_partner_id=self.visible_path[-1])
                        .exists()
        ):
            return True

        return False

    def can_manage(self, user: CloudUser):
        return self.organization.can_manage_systems(user)

    def can_manage_users(self, user: CloudUser):
        return self.organization.has_perm(user, OrganizationPermissions.manage_users)

    def has_overlaps(self, user: CloudUser):
        def user_groups():
            return (
                SystemGroup.objects
                .filter(Q(organizationtouser__user=user) | Q(id=self.id), organization=self.organization)
                .distinct()
            )

        ids_arr = user_groups().annotate(ids=models.Func('id', function='array_agg')).values('ids')
        overlaps = user_groups().filter(path__overlap=Subquery(ids_arr))
        return overlaps.exists()

    def has_cp_overlaps(self, user: CloudUser) -> bool:
        """
        Checks if user has access to parent channel partner.
        """
        return ChannelPartnerToUser.objects.filter(
            user=user, channel_partner_id=self.visible_path[-1]
        ).exists()

    def has_org_or_group_overlaps(self, user: CloudUser) -> bool:
        """
        Checks if user has access to an organization or a group above.
        """
        return OrganizationToUser.objects.filter(
            user=user, organization_id=self.organization_id
        ).filter(
            Q(system_group_id__isnull=True) | Q(system_group_id__in=self.groups_path)
        ).exists()


    @property
    def system_count(self) -> int:
        return CloudSystemId.get_systems_in_group_and_children_count(self.id)


class OrganizationToUser(models.Model):
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    system_group = models.ForeignKey('SystemGroup', blank=True, null=True, on_delete=models.CASCADE)
    user = models.ForeignKey(CloudUser, on_delete=models.CASCADE)
    roles = ArrayField(base_field=models.UUIDField(), default=list)
    title = models.CharField(max_length=100, blank=True)
    created_ts = models.DateTimeField(auto_now_add=True)

    membership_type = 'organization'

    class Meta:
        constraints = [
            models.constraints.UniqueConstraint(fields=['organization', 'user', 'system_group'],
                                                name='unique_organization_user')
        ]
        indexes = [
            GinIndex(name="organizationtouser_roles_gin", fields=['roles'], opclasses=['array_ops'])
        ]

    def save(self, *args, **kwargs):
        if self.system_group and OrganizationRoles.ORGANIZATION_ADMINISTRATOR in self.roles:
            raise ValidationError('Group user cannot be added with "Organization Administrator" role')
        super(OrganizationToUser, self).save(*args, **kwargs)

    def can_manage(self, user: CloudUser):
        return self.organization.can_manage_users(user)

    @classmethod
    def bulk_delete(cls, queryset: QuerySet) -> List[str]:
        deleted_emails = list(queryset.values_list('user__email', flat=True))
        queryset.delete()
        return deleted_emails

    @property
    def roles_name(self):
        roles = get_organization_roles()
        return [roles[r]['name'] for r in self.roles]

    @property
    def system_roles_name(self):
        roles = get_organization_roles()
        return [roles[r]['system_role'] for r in self.roles if roles[r]['system_role']]

    @classmethod
    def with_vms_roles(cls) -> 'QuerySet[OrganizationToUser]':
        sys_roles = list(get_roles_with_vms_perms().keys())
        return cls.objects.filter(roles__overlap=sys_roles)

    @property
    def has_access_to(self):
        return self.system_group or self.organization

    def get_hierarchy_level(self, instance) -> None | int:
        # instance is relation's organization
        if instance.id == self.organization_id:
            return HierarchyLevels.own
        # instance some of relation's organization children and calculated on own level
        if instance.path and self.organization_id in instance.path:
            return HierarchyLevels.own
        # instance is parent channel partner of organization
        if instance.id == self.organization.channel_partner_id:
            return HierarchyLevels.parent


class ChannelPartnerService(models.Model):
    # Service Types
    LOCAL_RECORDING = 0
    CLOUD_STORAGE = 1
    ANALYTICS = 2

    SERVICE_TYPES = (
        (LOCAL_RECORDING, 'Local Recording'),
        (CLOUD_STORAGE, 'Cloud Storage'),
        (ANALYTICS, 'Analytics')
    )
    SERVICE_TYPE_CODES = (
        ('local_recording', LOCAL_RECORDING),
        ('cloud_storage', CLOUD_STORAGE),
        ('analytics', ANALYTICS)
    )
    SERVICE_TYPE_TO_CODE_MAP = {val: code for code, val in SERVICE_TYPE_CODES}

    # States
    ACTIVE = 0
    OBSOLETE = 1
    STATES = (
        (ACTIVE, 'Active'),
        (OBSOLETE, 'Obsolete')
    )
    STATES_CODES = (
        ('active', ACTIVE),
        ('obsolete', OBSOLETE)
    )

    # Subtypes
    REGULAR = 0
    DEMO = 1
    TRIAL = 2
    SUB_TYPES = (
        (REGULAR, 'Regular'),
        (DEMO, 'Demo'),
        (TRIAL, 'Trial')
    )
    SUB_TYPES_CODES = (
        ('regular', REGULAR),
        ('demo', DEMO),
        ('trial', TRIAL)
    )
    SUB_TYPE_TO_CODE_MAP = {val: code for code, val in SUB_TYPES_CODES}

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    type = models.IntegerField(choices=SERVICE_TYPES)
    created_by_channel_partner = models.ForeignKey(ChannelPartner, on_delete=models.PROTECT, related_name='services')
    state = models.IntegerField(choices=STATES, default=ACTIVE)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    parameters = models.JSONField(default=dict, blank=True)
    parent_service = models.ForeignKey('ChannelPartnerService', blank=True, null=True, on_delete=models.CASCADE)
    created_ts = models.DateTimeField(auto_now_add=True)
    sub_type = models.IntegerField(choices=SUB_TYPES, default=REGULAR)
    duration = models.PositiveIntegerField(default=0)
    conversion_service = models.ForeignKey('ChannelPartnerService', null=True, blank=True, on_delete=models.PROTECT,
                                           related_name='converting_services')

    objects = ExternalIdTargetManager()
    external_id_field_name = 'id'  # Field that is checked for possible external id usage

    def __str__(self):
        return f'{self.name} - {self.created_by_channel_partner.name}'

    @property
    def is_expiring(self) -> bool:
        return self.sub_type in (self.DEMO, self.TRIAL)

    def save(self, *args, **kwargs):
        new = self._state.adding
        super().save(*args, **kwargs)
        ChannelPartnerEvent.new_event(event_type=ChannelPartnerEvent.SERVICE_CHANGED, service=self)
        if new:
            transaction.on_commit(lambda: new_channel_partner_service_created.apply_async(args=[self.pk]))


class ServiceRecordTypes:
    REGULAR = 1
    NEGATION = 2
    CONVERSION = 3
    LICENSE_MIGRATION = 4

    CHOICES = [
        (REGULAR, 'regular'),
        (NEGATION, 'negation'),
        (CONVERSION, 'conversion'),
        (LICENSE_MIGRATION, 'licence_migration')
    ]


class ChannelPartnerServiceRecord(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    service = models.ForeignKey(ChannelPartnerService, on_delete=models.PROTECT)
    quantity = models.IntegerField(default=0)
    created_ts = models.DateTimeField(auto_now_add=True)
    effective_ts = models.DateTimeField()
    in_effect = models.BooleanField(default=False)
    created_by = models.ForeignKey(CloudUser, on_delete=models.SET_NULL, null=True)
    cloud_system = models.ForeignKey(CloudSystemId, on_delete=models.SET_NULL, null=True,
                                     related_name='service_records')
    organization = models.ForeignKey(Organization, on_delete=models.SET_NULL, null=True, related_name='service_records')
    negation_record = models.ForeignKey('ChannelPartnerServiceRecord', null=True, on_delete=models.PROTECT)
    record_type = models.IntegerField(choices=ServiceRecordTypes.CHOICES, default=ServiceRecordTypes.REGULAR)

    def save(self, *args, **kwargs):
        if self._state.adding and not self.organization:
            self.organization = self.cloud_system.organization
        super().save(*args, **kwargs)

    @property
    def automated(self) -> bool:
        return self.record_type != ServiceRecordTypes.REGULAR

    @classmethod
    def negate_services_on_shutdown(cls, systems: QuerySet[CloudSystemId]) -> List['ChannelPartnerServiceRecord']:
        records = cls.objects.filter(cloud_system__in=systems)
        negation_records = cls.negate_services(records)
        systems.update(current_services={})
        return negation_records

    @classmethod
    def negate_services(
            cls,
            queryset: QuerySet['ChannelPartnerServiceRecord'],
    ) -> List['ChannelPartnerServiceRecord']:
        negation_quantities = (
            queryset.values('service_id', 'cloud_system_id', 'organization_id')
            .annotate(negation=-Sum('quantity'))
        )
        now = timezone.now()
        negation_records = []
        for record in negation_quantities:
            negation_records.append(cls(
                id=uuid.uuid4(),
                organization_id=record['organization_id'],
                cloud_system_id=record['cloud_system_id'],
                service_id=record['service_id'],
                quantity=record['negation'],
                effective_ts=now,
                in_effect=True,
                created_by=None,
                record_type=ServiceRecordTypes.NEGATION,
            ))
        cls.objects.bulk_create(negation_records, batch_size=100)
        for record in negation_records:
            (queryset
             .exclude(record_type=ServiceRecordTypes.NEGATION)
             .filter(
                negation_record__isnull=True,
                organization_id=record.organization_id,
                cloud_system_id=record.cloud_system_id,
                service_id=record.service_id
            ).update(negation_record=record.id))
        return negation_records

    @classmethod
    def check_expired_services(cls) -> List['ChannelPartnerServiceRecord']:
        with transaction.atomic():
            system_states = [ChannelPartnerStates.ACTIVE, ChannelPartnerStates.SUSPENDED]
            base_queryset = (
                cls.objects
                # not a negation record
                .exclude(record_type=ServiceRecordTypes.NEGATION)
                .filter(
                    # not negated yet
                    negation_record__isnull=True,
                    # system is not shut down
                    cloud_system__effective_state__in=system_states,
                    # service has duration
                    service__duration__gt=0,
                )
            )
            # made for tests
            today = get_today()
            # lookup for expired services
            expired_records = (
                base_queryset
                .filter(
                    created_ts__lt=models.ExpressionWrapper(
                        today - MonthInterval("service__duration"),
                        output_field=models.DateTimeField()
                    )
                ).distinct('service_id', 'cloud_system_id', 'organization_id')
            )
            negation_records = []
            conversion_services = []
            for expired_record in expired_records:
                now = timezone.now()
                negation_quantities = base_queryset.filter(
                    service_id=expired_record.service_id,
                    cloud_system_id=expired_record.cloud_system_id,
                    organization_id=expired_record.organization_id,
                ).aggregate(Sum('quantity'))
                # create negation for expired trial/demo
                negation_record = cls(
                    id=uuid.uuid4(),
                    organization_id=expired_record.organization_id,
                    cloud_system_id=expired_record.cloud_system_id,
                    service_id=expired_record.service_id,
                    quantity=-negation_quantities['quantity__sum'],
                    effective_ts=now,
                    in_effect=True,
                    created_by=None,
                    record_type=ServiceRecordTypes.NEGATION,
                )
                negation_records.append(negation_record)
                # creating converted service records
                if negation_record.service.conversion_service:
                    conversion_services.append(cls(
                        service=negation_record.service.conversion_service,
                        quantity=-negation_record.quantity,
                        organization_id=negation_record.organization_id,
                        cloud_system_id=negation_record.cloud_system_id,
                        in_effect=True,
                        record_type=ServiceRecordTypes.CONVERSION,
                        effective_ts=now,
                    ))
            # saving negations
            cls.objects.bulk_create(negation_records, batch_size=100)
            for expired_record, negation_record in zip(expired_records, negation_records):
                # set records as negated
                base_queryset.filter(
                    organization_id=expired_record.organization_id,
                    cloud_system_id=expired_record.cloud_system_id,
                    service_id=expired_record.service_id
                ).update(negation_record_id=negation_record.id)
            if conversion_services:
                # saving conversions
                cls.objects.bulk_create(conversion_services, batch_size=100)
        return negation_records


class ServiceUsage(models.Model):
    # Seconds a license is allowed to be used before it must check in
    STATUS_OK = "ok"
    STATUS_OVER_USE = "overUse"
    UNALLOCATED_SERVICE = "00000000-0000-0000-0000-000000000000"
    CHECK_PERIOD = 86400 # 1 day

    service = models.ForeignKey(ChannelPartnerService, on_delete=models.CASCADE)
    cloud_system = models.ForeignKey(CloudSystemId, on_delete=models.CASCADE, related_name='service_usages')
    usage = models.IntegerField()
    timestamp = models.DateTimeField(auto_now_add=True)
    from_ts = models.DateTimeField()
    to_ts = models.DateTimeField()

    @classmethod
    def get_usage_from_quantity(cls, service_type: int, service_qty: int) -> int:
        if not service_qty:
            return 0
        if service_type == ChannelPartnerService.CLOUD_STORAGE:
            return service_qty
        return service_qty * cls.CHECK_PERIOD

    @classmethod
    def get_quantity_from_usage(cls, service_type: int, service_usage: int) -> int:
        if not service_usage:
            return 0
        if service_type == ChannelPartnerService.CLOUD_STORAGE:
            return service_usage
        return ceil(service_usage / cls.CHECK_PERIOD)

    @classmethod
    def get_latest_usages(cls, cloud_system: CloudSystemId) -> QuerySet[dict]:
        base_queryset = cls.objects.filter(cloud_system=cloud_system)
        last_usage: ServiceUsage = (
            base_queryset
            .exclude(service__type=ChannelPartnerService.CLOUD_STORAGE)
            .order_by('-to_ts').first()
        )
        # cloud storage may report services at different time
        last_usage_cloud_storage: ServiceUsage = (
            base_queryset
            .filter(service__type=ChannelPartnerService.CLOUD_STORAGE)
            .order_by('-to_ts').first()
        )
        # Check if any service usage is greater than the allowed usage
        cloud_system.usage_issue_detected = False
        lookup_ts = []
        if last_usage:
            lookup_ts.append(last_usage.to_ts)
        if last_usage_cloud_storage:
            lookup_ts.append(last_usage_cloud_storage.to_ts)
        return (
            base_queryset
            .filter(to_ts__in=lookup_ts)
            .values('service', 'service__type')
            .annotate(usage=Sum('usage'))
        )

    @classmethod
    def check_excess(cls, cloud_system: CloudSystemId) -> Dict[str, dict]:
        cloud_system = CloudSystemId.objects.filter(pk=cloud_system.pk).select_for_update().first()
        cloud_system.last_usage_check = timezone.now()
        current_services = cloud_system.get_current_services()
        cloud_system.usage_issue_detected = False
        services = {
            service_id: ServiceUsage.STATUS_OK
            for service_id, service in current_services.items()
        }
        types = {
            ChannelPartnerService.LOCAL_RECORDING: ServiceUsage.STATUS_OK,
            ChannelPartnerService.CLOUD_STORAGE: ServiceUsage.STATUS_OK,
            ChannelPartnerService.ANALYTICS: ServiceUsage.STATUS_OK,
        }
        usage_records = cls.get_latest_usages(cloud_system)
        for record in usage_records:
            # Check if any service usage is greater than the allowed usage
            service_id = str(record['service'])
            service_type = record['service__type']
            allocated_service_qty = current_services.get(service_id, {}).get('quantity', 0)
            control_usage_seconds = cls.get_usage_from_quantity(service_type, allocated_service_qty)
            if record['usage'] > control_usage_seconds:
                cloud_system.usage_issue_detected = True
                services[service_id] = ServiceUsage.STATUS_OVER_USE
                types[service_type] = ServiceUsage.STATUS_OVER_USE
        statuses = {'services': services, 'types': types}
        cloud_system.set_security_statuses(statuses=statuses)
        cloud_system.save()
        return statuses


class ServiceToSubChannelProperties(models.Model):
    channel_partner = models.ForeignKey(ChannelPartner, on_delete=models.CASCADE, related_name='service_properties')
    service = models.ForeignKey(ChannelPartnerService, on_delete=models.CASCADE,
                                related_name='channel_partners_properties')
    price = models.DecimalField(null=True, max_digits=10, decimal_places=3)
    created_ts = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.constraints.UniqueConstraint(fields=['channel_partner', 'service'],
                                                name='unique_channel_partner_service_properties')
        ]

    def can_access(self, user: CloudUser):
        return self.channel_partner.can_access(user)

    def can_manage(self, user: CloudUser):
        return self.service.created_by_channel_partner.can_add_or_remove_sub_chanel_partners(user)

    @classmethod
    def create_missing(cls, channel_partner_id: int):
        """
        Create any missing properties linking channel partner to service
        Args:
            channel_partner_id:
        """
        services_ids = set(ChannelPartnerService.objects.filter(
            created_by_channel_partner__channel_partners=channel_partner_id).values_list('pk', flat=True))
        service_properties_service_ids = set(cls.objects.filter(
            channel_partner=channel_partner_id, service__in=services_ids
        ).values_list('service_id', flat=True))
        missing_service_ids = services_ids.difference(service_properties_service_ids)
        for id in missing_service_ids:
            cls.objects.create(service_id=id, channel_partner_id=channel_partner_id)


class ServiceToOrganizationProperties(models.Model):
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='service_properties')
    service = models.ForeignKey(ChannelPartnerService, on_delete=models.CASCADE, related_name='organization_properties')
    price = models.DecimalField(null=True, max_digits=10, decimal_places=3)
    created_ts = models.DateTimeField(auto_now_add=True)

    def can_access(self, user: CloudUser):
        return self.organization.can_access(user)

    def can_manage(self, user: CloudUser):
        return self.service.created_by_channel_partner.can_add_or_remove_organizations(user)

    class Meta:
        constraints = [
            models.constraints.UniqueConstraint(fields=['organization', 'service'],
                                                name='unique_organization_service_properties')
        ]

    @classmethod
    def create_missing(cls, organization_id: int):
        """
        Create any missing properties linking organization to service
        Args:
            organization_id: int
        """
        services_ids = set(ChannelPartnerService.objects.filter(
            created_by_channel_partner__organizations=organization_id).values_list('pk', flat=True))
        service_properties__service_ids = set(cls.objects.filter(
            organization=organization_id, service__in=services_ids
        ).values_list('service_id', flat=True))
        missing_service_ids = services_ids.difference(service_properties__service_ids)
        for id in missing_service_ids:
            props, created = cls.objects.get_or_create(service_id=id, organization_id=organization_id)
            if not created:
                logger.info("Service properties record already exists",
                            organization_id=organization_id,
                            service_id=id)


class ChannelPartnerEvent(models.Model):
    SERVICE_CHANGED = 0
    SYSTEM_UPDATED = 1

    EVENT_TYPES = (
        (SERVICE_CHANGED, 'Service Changed'),
        (SYSTEM_UPDATED, 'System Updated'),
    )
    EVENT_TYPE_CODES = (
        ('service_change', SERVICE_CHANGED),
        ('system_updated', SYSTEM_UPDATED),
    )

    event_type = models.IntegerField(choices=EVENT_TYPES)
    service = models.ForeignKey(ChannelPartnerService, null=True, blank=True, on_delete=models.CASCADE)
    cloud_system = models.ForeignKey(CloudSystemId, null=True, blank=True, on_delete=models.CASCADE)
    cloud_host = models.ForeignKey(CloudHost, on_delete=models.CASCADE)

    @classmethod
    def new_event(cls, event_type: int, system: CloudSystemId = None, service: ChannelPartnerService = None):
        if event_type == cls.SERVICE_CHANGED:
            if not service:
                raise Exception('service is required')
            new_obj = cls.objects.create(event_type=event_type, service=service,
                                         cloud_host=service.created_by_channel_partner.cloud_host)
        else:
            if not system:
                raise Exception('system is required')
            new_obj = cls.objects.create(event_type=event_type, cloud_system=system, cloud_host=system.cloud_host)

        # Delete any old events for the same service or system
        cls.objects.filter(cloud_system=new_obj.cloud_system, service=new_obj.service).exclude(id=new_obj.id).delete()


class ExternalIdManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().select_related(self.model.object_key)


class ExternalId(models.Model):
    object_key = ''
    created_by = models.ForeignKey(ChannelPartner, on_delete=models.CASCADE,
                                   related_name='%(class)s_created_external_ids')
    custom_id = models.CharField(max_length=100)
    objects = ExternalIdManager()
    created_ts = models.DateTimeField(auto_now_add=True)

    class Meta:
        abstract = True
        constraints = [
            models.constraints.UniqueConstraint(fields=['created_by', 'custom_id'], name='%(class)s_unique_external_id')
        ]

    def full_id(self):
        return f'{self.created_by_id}--{self.custom_id}'


class ChannelPartnerExternalId(ExternalId):
    object_key = 'channel_partner'
    channel_partner = models.ForeignKey('ChannelPartner', on_delete=models.CASCADE, related_name='external_ids')

    class Meta:
        constraints = [
            models.constraints.UniqueConstraint(fields=['created_by', 'custom_id'],
                                                name='channelpartner_unique_external_id')
        ]


class OrganizationExternalId(ExternalId):
    object_key = 'organization'
    organization = models.ForeignKey('Organization', on_delete=models.CASCADE, related_name='external_ids')

    class Meta:
        constraints = [
            models.constraints.UniqueConstraint(fields=['created_by', 'custom_id'],
                                                name='organization_unique_external_id')
        ]


class CloudSystemExternalId(ExternalId):
    object_key = 'cloud_system'
    cloud_system = models.ForeignKey('CloudSystemId', on_delete=models.CASCADE, related_name='external_ids')

    class Meta:
        constraints = [
            models.constraints.UniqueConstraint(fields=['created_by', 'custom_id'],
                                                name='cloudsystem_unique_external_id')
        ]


class ChannelPartnerServiceExternalId(ExternalId):
    object_key = 'channel_partner_service'
    channel_partner_service = models.ForeignKey('ChannelPartnerService', on_delete=models.CASCADE,
                                                related_name='external_ids')

    class Meta:
        constraints = [
            models.constraints.UniqueConstraint(fields=['created_by', 'custom_id'],
                                                name='channelpartnerservice_unique_external_id')
        ]


class BillingModel(models.Model):
    class DistributionTypes:
        PREPAID = 0
        POSTPAID = 1

        TYPES = (
            (PREPAID, 'Service Changed'),
            (POSTPAID, 'System Updated'),
        )
        CODES = (
            ('prepaid', PREPAID),
            ('postpaid', POSTPAID),
        )

    class RegularPeriodTypes:
        FULL = 0
        FRACTIONAL = 1

        TYPES = (
            (FULL, 'Full'),
            (FRACTIONAL, 'Fractional'),
        )
        CODES = (
            ('full', FULL),
            ('fractional', FRACTIONAL),
        )

    class InvoiceTypes:
        FIRST_DAY_OF_MONTH = 0
        FIXED_DATE = 1
        FIRST_PURCHASE_DATE = 2

        TYPES = (
            (FIRST_DAY_OF_MONTH, 'First Day of Month'),
            (FIXED_DATE, 'Fixed Date'),
            (FIRST_PURCHASE_DATE, 'First Purchase Date')
        )

        CODES = (
            ('firstDayOfMonth', FIRST_DAY_OF_MONTH),
            ('fixedDate', FIXED_DATE),
            ('firstPurchaseDate', FIRST_PURCHASE_DATE)
        )

    created_by = models.ForeignKey(ChannelPartner, on_delete=models.CASCADE)
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    display_name = models.CharField(max_length=150)
    distribution_type = models.IntegerField(choices=DistributionTypes.TYPES)
    grace_period_months = models.IntegerField()
    prepaid_period_months = models.IntegerField()
    regular_period_type = models.IntegerField(choices=RegularPeriodTypes.TYPES)
    invoice_type = models.IntegerField(choices=InvoiceTypes.TYPES)
    fixed_invoice_date = models.DateField(help_text='If invoice_type is "Fixed Date"', blank=True, null=True)


class FieldAccessPermissions(StrEnum):
    field_access_cp_admin = "field_access_cp_admin"
    field_access_cp_manager = "field_access_cp_manager"
    field_access_cp_accountant = "field_access_cp_accountant"
    field_access_org_admin = "field_access_org_admin"
    field_access_org_power_user = "field_access_org_power_user"
    field_access_org_other = "field_access_org_other"


def get_channel_partner_roles() -> Dict[uuid.UUID | str, dict]:
    if roles := caches['local'].get('channel_partner_roles', {}):
        return roles
    for role in ChannelPartnerRole.objects.all().prefetch_related('permissions'):
        if not role.permissions:
            continue
        roles[role.id] = roles[role.name] = {
            'permissions': [p.codename for p in role.permissions.all()],
            'name': role.name,
            'id': role.id
        }
    caches['local'].set('channel_partner_roles', roles)
    return roles


def get_organization_roles() -> Dict[uuid.UUID | str, dict]:
    if roles := caches['local'].get('organization_roles', {}):
        return roles
    for role in OrganizationRole.objects.all().prefetch_related('permissions'):
        if not role.permissions:
            continue
        roles[role.id] = roles[role.name] = {
            'permissions': [p.codename for p in role.permissions.all()],
            'name': role.name,
            'id': role.id,
            'system_role': role.system_role,
            'system_role_uuid': role.system_role_uuid
        }
    caches['local'].set('organization_roles', roles)
    return roles


def get_roles_with_vms_perms() -> Dict[uuid.UUID | str, dict]:
    return {
        uid: role for uid, role in get_organization_roles().items()
        if isinstance(uid, uuid.UUID) and role.get('system_role_uuid')
    }


def gen_confirmation_code():
    return ''.join([
        secrets.choice(string.ascii_uppercase + string.digits)
        for _ in range(settings.CONFIRMATION_CODE_LEN)
    ])


class ConfirmationCodeInvalid(Exception):
    pass


class ActionConfirmation(models.Model):
    class ConfirmationActionType(models.IntegerChoices):
        PARTNER_STATE_CHANGE = 0, 'Channel Partner State Change'
        ORGANIZATION_STATE_CHANGE = 1, 'Channel Partner State Change'

    class ConfirmationState(models.IntegerChoices):
        PENDING = 0, 'pending'
        CONFIRMED = 10, 'confirmed'
        EXPIRED = 20, 'expired'

    EXPIRATION = {
        ConfirmationActionType.ORGANIZATION_STATE_CHANGE: 60 * 60,
        ConfirmationActionType.PARTNER_STATE_CHANGE: 60 * 60,
    }

    id = models.UUIDField(primary_key=True, editable=False, default=uuid.uuid4)
    state = models.IntegerField(choices=ConfirmationState.choices, default=ConfirmationState.PENDING)
    action = models.IntegerField(choices=ConfirmationActionType.choices)
    target_id = models.UUIDField()
    changes = models.JSONField(null=True)
    code = models.CharField(max_length=40, default=gen_confirmation_code)
    created_ts = models.DateTimeField(auto_now_add=True)
    created_by = models.EmailField()
    confirmed_ts = models.DateTimeField(null=True)

    def save(
        self, force_insert=False, force_update=False, using=None, update_fields=None
    ):
        new = self._state.adding
        if new:
            ActionConfirmation.objects.filter(
                action=self.action, target_id=self.target_id,
                state=self.ConfirmationState.PENDING, created_by=self.created_by
            ).update(state=self.ConfirmationState.EXPIRED)
        super().save(force_insert=force_insert, force_update=force_update,
                     using=using, update_fields=update_fields)

    @property
    def is_expired(self) -> bool:
        expiring_at = self.created_ts + timedelta(seconds=self.EXPIRATION[self.action])
        return timezone.now() > expiring_at

    @classmethod
    def confirm_and_get_changes(cls, confirmation_id: uuid.UUID, action: int, code: str,
                                target_id: uuid.UUID, confirmed_by: CloudUser) -> dict:
        confirmation = cls.objects.filter(
            pk=confirmation_id, action=action,
            target_id=target_id, code=code,
            state=cls.ConfirmationState.PENDING,
            created_by=confirmed_by.email
        ).order_by('-created_ts').first()

        if not confirmation:
            raise ConfirmationCodeInvalid("Provided confirmation code is invalid.")
        if confirmation.is_expired:
            # Must be tested when celery will be available on cloud instance
            expire_confirmation.apply_async(args=(confirmation.id,))
            raise ConfirmationCodeInvalid("Provided confirmation code is expired.")
        confirmation.state = cls.ConfirmationState.CONFIRMED
        confirmation.confirmed_ts = timezone.now()
        confirmation.save()
        # Make all pending confirmations for the target and action expired
        cls.objects.filter(
            state=cls.ConfirmationState.PENDING,
            target_id=confirmation.target_id,
            action=confirmation.action
        ).exclude(id=confirmation.id).update(state=cls.ConfirmationState.EXPIRED)
        return confirmation.changes

    def get_notification_type(self) -> str | None:
        match self.action:
            case self.ConfirmationActionType.ORGANIZATION_STATE_CHANGE:
                return NotificationTypes.cps_organization_state_confirmation
            case self.ConfirmationActionType.PARTNER_STATE_CHANGE:
                return NotificationTypes.cps_partner_state_confirmation

    def get_state_confirmation_message(self) -> dict:
        message = {
            'status_name': dict(ChannelPartnerStates.STATE_CHOICES)[self.changes['targetState']],
            'code': self.code
        }
        match self.action:
            case self.ConfirmationActionType.ORGANIZATION_STATE_CHANGE:
                message['organization_name'] = Organization.objects.get(pk=self.target_id).name
            case self.ConfirmationActionType.PARTNER_STATE_CHANGE:
                message['partner_name'] = ChannelPartner.objects.get(pk=self.target_id).name
        return message


class NotificationTypes(enum.StrEnum):
    cps_organization_invite = 'cps_organization_invite'
    cps_organization_share = 'cps_organization_share'
    cps_organization_state_active = 'cps_organization_state_active'
    cps_organization_state_confirmation = 'cps_organization_state_confirmation'
    cps_organization_state_suspended = 'cps_organization_state_suspended'
    cps_organization_name_change = 'cps_organization_name_change'
    cps_partner_invite = 'cps_partner_invite'
    cps_partner_share = 'cps_partner_share'
    cps_partner_state_active = 'cps_partner_state_active'
    cps_partner_state_confirmation = 'cps_partner_state_confirmation'
    cps_partner_state_suspended = 'cps_partner_state_suspended'
    cps_partner_name_change = 'cps_partner_name_change'


class MigrationRecord(models.Model):
    license_key = models.CharField(max_length=128)
    service_record = models.ForeignKey(ChannelPartnerServiceRecord, on_delete=models.CASCADE)


class ReportSnapshot(models.Model):
    class ReportType(IntegerChoices):
        system_regular_report = 1, 'system_regular_report'
        system_expiring_report = 2, 'system_expiring_report'
        organization_regular_systems_reports = 20, 'organization_regular_system_reports'
        organization_regular_service_report = 21, 'organization_regular_service_report'
        organization_regular_detail_table = 22, 'organization_regular_detail_table'
        organization_usage_report = 23, 'organization_usage_report'
        organization_expiring_systems_reports = 24, 'organization_expiring_system_reports'
        organization_expiring_service_report = 25, 'organization_expiring_service_report'
        organization_expiring_detail_table = 26, 'organization_expiring_detail_table'
        channel_partner_organization_regular_usages = 40, 'channel_partner_organization_regular_usages'
        channel_partner_organization_expiring_usages = 45, 'channel_partner_organization_expiring_usages'
        channel_partner_channel_partner_regular_usages = 41, 'channel_partner_channel_partner_regular_usages'
        channel_partner_channel_partner_expiring_usages = 46, 'channel_partner_channel_partner_expiring_usages'
        channel_partner_regular_detail_table = 42, 'channel_partner_regular_detail_table'
        channel_partner_expiring_detail_table = 47, 'channel_partner_expiring_detail_table'
        channel_partner_regular_service_report = 43, 'channel_partner_regular_service_report'
        channel_partner_expiring_service_report = 48, 'channel_partner_expiring_service_report'
        channel_partner_usage_report = 44, 'channel_partner_usage_report'

    report_type = models.SmallIntegerField(choices=ReportType.choices)
    entity_id = models.UUIDField()
    service = models.ForeignKey(ChannelPartnerService, on_delete=models.PROTECT, null=True)
    organization = models.ForeignKey(Organization, on_delete=models.PROTECT, null=True)
    start_date = models.DateField(db_index=True)
    provisional = models.BooleanField(default=False)
    created_ts = models.DateTimeField(auto_now_add=True)
    updated_ts = models.DateTimeField(auto_now=True)
    report_data = models.JSONField(encoder=JSONEncoder)

    class Meta:
        unique_together = (
            ('entity_id', 'report_type', 'service_id', 'start_date')
        )

    def save(
        self, force_insert=False, force_update=False, using=None, update_fields=None
    ):
        if self.start_date + relativedelta(months=1) > get_today():
            # mark as provisional if current greater than new period start date
            self.provisional = True
        else:
            self.provisional = False
        super().save(force_insert=force_insert, force_update=force_update,
                     using=using, update_fields=update_fields)


class CloudSystemHistory(models.Model):

    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    cloud_system = models.ForeignKey(CloudSystemId, on_delete=models.PROTECT)
    organization = models.ForeignKey(Organization, on_delete=models.PROTECT, null=True, blank=True)
    from_ts = models.DateTimeField()
    to_ts = models.DateTimeField(null=True, blank=True)

    @classmethod
    def add_history_record(
            cls,
            cloud_system: CloudSystemId,
            ts: datetime,
    ):
        prev_record = cls.objects.filter(cloud_system=cloud_system).order_by('-from_ts').first()
        if prev_record:
            prev_record.to_ts = ts
            prev_record.save()
        cls.objects.create(
            cloud_system=cloud_system, organization=cloud_system.organization, from_ts=ts
        )



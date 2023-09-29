import datetime
from dataclasses import dataclass
from datetime import timedelta

import django.db.transaction
from dateutil.relativedelta import relativedelta
from enum import Enum
from itertools import chain
from typing import Dict, Union, Literal, List
import random
import string
import time
import llutil
import uuid

from django.conf import settings
from django.contrib.auth.base_user import AbstractBaseUser
from django.contrib.auth.models import User, PermissionsMixin, BaseUserManager, Permission
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Sum, F, QuerySet
from django.db.models.functions import Concat
from django.shortcuts import reverse
from django.utils import timezone
from django.utils.functional import cached_property
from django_cte import CTEManager, With
from nx_cloud_api_client.apis import BatchRequestItems, BatchRequestItem

from rest_framework.authtoken.models import Token


class AuthToken(Token):
    enabled = models.BooleanField(default=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, blank=True, null=True, on_delete=models.SET_NULL)
    name = models.CharField(max_length=255, blank=True)
    key = models.CharField("Key", max_length=40)
    internal = models.BooleanField(default=False, help_text='Only for internal services (such as clouddb). These keys have a higher level of access.')

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

    def __str__(self):
        return self.email

    def is_authenticated(self):
        return True


def get_cloud_test_instance():
    return CloudInstance.objects.get_or_create(name='cloud-test')[0].id


class CloudInstance(models.Model):
    name = models.CharField(max_length=50)

    def __str__(self):
        return self.name


class CloudHost(models.Model):
    hostname = models.CharField(max_length=255)
    instance = models.ForeignKey(CloudInstance, on_delete=models.CASCADE, default=get_cloud_test_instance)

    def __str__(self):
        return self.hostname

    @property
    def cdb_base_url(self):
        return f'https://{self.hostname}'


class CloudSystemId(ChannelPartnerStates, models.Model):
    system_id = models.UUIDField()
    usage_issue_detected = models.BooleanField(default=False)
    cloud_host = models.ForeignKey(CloudHost, on_delete=models.CASCADE)
    organization = models.ForeignKey('Organization', null=True, blank=True, on_delete=models.CASCADE, related_name='cloud_systems')
    name = models.CharField(max_length=150, blank=True)
    state = models.IntegerField(choices=ChannelPartnerStates.STATE_CHOICES, blank=False,
                                default=ChannelPartnerStates.ACTIVE)
    current_services = models.JSONField(default=dict)
    last_usage_check = models.DateTimeField(default=timezone.now)
    last_usage_report = models.DateTimeField(default=timezone.now)
    security_statuses = models.JSONField(default=dict)

    objects = ExternalIdTargetManager()
    external_id_field_name = 'system_id'  # Field that is checked for possible external id usage

    def __str__(self):
        return self.name or str(self.system_id)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['system_id', 'cloud_host'], name='unique_cloud_system')
        ]

    def get_security_statuses(self):
        if self.last_usage_check < timezone.now() - timedelta(days=3):
            ServiceUsage.check_excess(self)

        return {
            service_code: {
                'status': self.security_statuses.get(service_code, {}).get('status', 'ok'),
                'issueExpirationDate': self.security_statuses.get(service_code, {}).get('issueExpirationDate')
            }
            for service_type, service_code in ChannelPartnerService.SERVICE_TYPE_TO_CODE_MAP.items()
        }

    def set_security_statuses(self, statuses):
        self.security_statuses = self.security_statuses or {}
        for service, new_status in statuses.items():
            service_code = ChannelPartnerService.SERVICE_TYPE_TO_CODE_MAP[service]
            old_status = self.security_statuses.get(service_code, {}).get('status', 'ok')
            if new_status == 'ok':
                self.security_statuses[service_code] = {'status': new_status, 'issueExpirationDate': None}
            elif new_status != old_status:
                expiration_date = (timezone.now() + relativedelta(days=30)).strftime('%Y-%m-%d %H:%M:%S')
                self.security_statuses[service_code] = {'status': new_status, 'issueExpirationDate': expiration_date}

    def can_manage(self, user: CloudUser):
        return self.organization and self.organization.can_manage_systems(user)

    def can_access(self, user: CloudUser):
        return self.organization and self.organization.can_access_systems(user)

    def can_set_services(self, user: CloudUser):
        return self.organization and self.organization.can_modify_service_quantities(user)

    def save(self, *args, **kwargs):
        self.system_id = models.UUIDField().to_python(self.system_id)
        super().save(*args, **kwargs)
        ChannelPartnerEvent.new_event(event_type=ChannelPartnerEvent.SYSTEM_UPDATED, system=self)

    @property
    def effective_state(self):
        if self.organization:
            organization_state = self.organization.effective_state
            if organization_state > self.state:
                return organization_state

        return self.state

    def calculate_current_services(self):
        services = {str(record['service']): {'quantity': record['quantity']}
                    for record in self.service_records.values('service').annotate(quantity=Sum('quantity'))}
        self.current_services = {
            'services': services,
            'last_update_ts': round(timezone.now().timestamp())
        }
        self.save()
        return self.current_services

    @property
    def services(self):
        current_services = self.current_services or self.calculate_current_services()
        if current_services:
            return current_services.get('services', [])
        else:
            return {}

    def add_system_users_data(self):
        roles = OrganizationRole.objects \
            .exclude(system_role__isnull=True) \
            .exclude(system_role='') \
            .values('system_role', 'name')
        org_to_user_rels = OrganizationToUser.objects \
            .filter(organization=self.organization, roles__0__in=[r['name'] for r in roles]) \
            .values('roles__0', 'user__email')
        roles_users = {r['name']: {"system_role": r["system_role"], "users": []} for r in roles}
        for rel in org_to_user_rels:
            roles_users[rel['roles__0']]["users"].append(rel['user__email'])

        data = BatchRequestItems(
            items=[
                BatchRequestItem(
                    systems=[str(self.system_id)],
                    users=users["users"],
                    accessRole=users["system_role"],
                    attributes={}
                ) for role, users in roles_users.items() if users["users"]
            ]
        )
        return data

    def remove_system_users_data(self, user: CloudUser) -> dict:
        users = OrganizationToUser.objects\
            .exclude(user__email=user.email)\
            .filter(organization=self.organization)\
            .values_list('user__email', flat=True)
        data = BatchRequestItems(
            items=[
                BatchRequestItem(
                    systems=[str(self.system_id)],
                    users=list(users),
                    accessRole='none',
                    attributes={}
                )
            ]
        )
        return data


class LocalRecordingUsage(models.Model):
    # Seconds a license is allowed to be used before it must check in
    # CHECK_PERIOD = 24 * 60 * 60  # 1 day
    CHECK_PERIOD = 5 * 60  # 5 minutes

    usage = models.IntegerField()
    cloud_system_id = models.ForeignKey(CloudSystemId, on_delete=models.CASCADE, related_name='local_recording_usages')
    timestamp = models.DateTimeField(auto_now_add=True)
    from_ts = models.DateTimeField()
    to_ts = models.DateTimeField()

    @classmethod
    def excess_exists(cls, usages, cloud_system: CloudSystemId):
        total_channel_count = cloud_system.total_channel_count

        control_usage_seconds = cls.CHECK_PERIOD * total_channel_count
        actual_usage_seconds = sum(usage.usage for usage in usages)

        return actual_usage_seconds > control_usage_seconds

    @classmethod
    def security_check(cls, cloud_system: CloudSystemId):
        last_usage = LocalRecordingUsage.objects.filter(
            cloud_system_id=cloud_system,
        ).order_by('to_ts').last()

        if last_usage:
            usages = cls.objects.filter(
                cloud_system_id=cloud_system, to_ts=last_usage.to_ts, from_ts=last_usage.from_ts
            )
        else:
            return

        if cls.excess_exists(usages, cloud_system):
            cloud_system.usage_issue_detected = True
        else:
            cloud_system.usage_issue_detected = False
        cloud_system.save()


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


class ChannelPartner(ChannelPartnerStates, models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    users = models.ManyToManyField(CloudUser, blank=True, related_name='channel_partners', through='ChannelPartnerToUser')
    name = models.CharField(max_length=150)
    parent_channel_partner = models.ForeignKey('ChannelPartner', null=True, blank=True, on_delete=models.CASCADE, related_name='channel_partners')
    state = models.IntegerField(choices=ChannelPartnerStates.STATE_CHOICES, blank=False, default=ChannelPartnerStates.ACTIVE)
    instance = models.ForeignKey(CloudInstance, on_delete=models.CASCADE, default=get_cloud_test_instance)
    monthly_additional_service_limit = models.BigIntegerField(default=None, null=True, blank=True)
    attributes = models.JSONField(default=dict)
    can_create_sub_channels = models.BooleanField(default=True)

    objects = ExternalIdTargetManager()
    external_id_field_name = 'id'  # Field that is checked for possible external id usage

    tree = CTEManager()

    MAX_DEPTH = 5

    class Meta:
        permissions = [
            (ChannelPartnerPermissions.configure_channel_partner, 'Change CP account settings if we have any'),
            (ChannelPartnerPermissions.manage_users, 'Add/Remove users from CP account, assign them permissions, including Administrator permissions'),
            (ChannelPartnerPermissions.add_remove_sub_channel_partners, 'A permission that allows to manage sub-CP accounts. This permission allow CP user to create/delete only direct children of their CP account.'),
            (ChannelPartnerPermissions.add_remove_organizations, 'Create and delete Organizations for CP account.'),
            (ChannelPartnerPermissions.alter_state_sub_channel_partners, 'Suspend & Shutdown Sub Channel Partners'),
            (ChannelPartnerPermissions.alter_state_organizations, 'Suspend & Shutdown Organizations'),
            (ChannelPartnerPermissions.administer_organization_systems, 'Access/administer organization\'s systems. Final access is determined by organization\'s settings.'),
            (ChannelPartnerPermissions.view_service_reports, 'Ability to view how many services are consumed by direct children of the CP. With a breakdown for each organization by services, by systems and system groups, for each Sub-CP by services.'),
            (ChannelPartnerPermissions.add_remove_service_quantities, 'Change the quantity of services for child organizations')
        ]
    permissions = ChannelPartnerPermissions

    def __str__(self):
        return f'{self.name} - {self.instance.name}'

    @django.db.transaction.atomic()
    def set_attributes(self, attributes, partial=False):
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

    def has_perm(self, user: CloudUser, perm: str):
        allowed_role_names = self.allowed_role_names(perm)
        return self.users.filter(pk=user.pk, channelpartnertouser__roles__has_any_keys=allowed_role_names).exists()

    def can_access(self, user: CloudUser):
        return self.users.filter(pk=user.pk).exists() or (self.parent_channel_partner and self.parent_channel_partner.can_access(user))

    def can_manage(self, user: CloudUser):
        if self.parent_channel_partner:
            return self.parent_channel_partner.can_add_or_remove_sub_chanel_partners(user)
        else:
            return self.can_configure(user)

    def can_configure(self, user: CloudUser):
        return self.has_perm(user, ChannelPartnerPermissions.configure_channel_partner)

    def can_manage_users(self, user: CloudUser):
        if self.has_perm(user, ChannelPartnerPermissions.manage_users):
            return True
        elif self.users.filter(channelpartnertouser__roles__has_any_keys=self.allowed_role_names(
            ChannelPartnerPermissions.manage_users)
        ).count() == 0 and self.parent_channel_partner.can_add_or_remove_sub_chanel_partners(user):
            return True
        return False

    def can_add_or_remove_sub_chanel_partners(self, user: CloudUser):
        return self.can_create_sub_channels and self.has_perm(user, ChannelPartnerPermissions.add_remove_sub_channel_partners)

    def can_add_or_remove_organizations(self, user: CloudUser):
        return self.has_perm(user, ChannelPartnerPermissions.add_remove_organizations)

    def can_alter_sub_channel_partner_state(self, user: CloudUser):
        return self.has_perm(user, ChannelPartnerPermissions.alter_state_sub_channel_partners)

    def can_alter_organization_state(self, user: CloudUser):
        return self.has_perm(user, ChannelPartnerPermissions.alter_state_organizations)

    def can_administer_organization_systems(self, user: CloudUser):
        return self.has_perm(user, ChannelPartnerPermissions.administer_organization_systems)

    def can_view_service_reports(self, user: CloudUser):
        return self.has_perm(user, ChannelPartnerPermissions.view_service_reports)

    def can_modify_organization_service_quantities(self, user: CloudUser):
        return self.has_perm(user, ChannelPartnerPermissions.add_remove_service_quantities)

    @property
    def effective_state(self):
        return self.state

    @property
    def all_services(self):
        services = self.services.all()
        return services

    def save(self, *args, **kwargs):
        if self.parent_channel_partner:
            self.instance = self.parent_channel_partner.instance

        super().save(*args, **kwargs)

        if self.parent_channel_partner:
            for service in self.parent_channel_partner.services.all():
                copy = ChannelPartnerService.objects.get(id=service.id)
                copy.pk = None
                copy.id = None
                copy._state.adding = True
                copy.created_by_channel_partner = self
                copy.parent_service = service
                copy.save()

    def parent_channel_partner_args(self, base_arg='service', secondary_arg='parent_service', suffix_arg='', value=None) -> models.Q:
        """Returns Q object of parent channel partner condtions"""
        if value is None:
            value = self
        parent_conditions = models.Q(**{base_arg + f'__{suffix_arg}' if suffix_arg else '': value})
        for i in range(self.MAX_DEPTH):
            parent_conditions |= models.Q(**{base_arg + f'__{secondary_arg}' * (i + 1) + f'__{suffix_arg}' if suffix_arg else '': value})
        return parent_conditions

    def service_changes_summary(self, start_ts: datetime.date = None):
        channel_partner_condition = self.parent_channel_partner_args('service', 'parent_service', models.OuterRef('pk'))
        if start_ts is None:
            start_ts = timezone.now() - relativedelta(months=1)
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
                created_ts__lt=start_ts+relativedelta(months=1)
            ).annotate(sum=models.Func(F('quantity'), function='SUM')).values('sum'),
            output_field=models.IntegerField()
        )))

        summary = []
        for end_record in end_calc:
            start_record = start_calc.get(str(end_record.id))
            summary.append({
                'end': end_record.quantity,
                'start': start_record.quantity if start_record else 0,
                'service': end_record
            })
        return summary

    def service_changes(self, start_ts: datetime.date = None) -> List['ChannelPartnerServiceRecord']:
        if start_ts is None:
            start_ts = timezone.now() - relativedelta(months=1)
        qs = ChannelPartnerServiceRecord.objects.filter(
            self.parent_channel_partner_args(base_arg='service', secondary_arg='parent_service', suffix_arg='created_by_channel_partner', value=self),
            created_ts__gte=start_ts, created_ts__lt=start_ts+relativedelta(months=1)
        ).select_related('cloud_system__organization', 'created_by', f'service{"__parent_service" * (self.MAX_DEPTH - 1)}')

        return qs

    @classmethod
    def get_successors(cls, ancestor_id: str, include_ancestor: bool = True):
        if include_ancestor:
            filter_kwargs = {'id': ancestor_id}
        else:
            filter_kwargs = {'parent_channel_partner': ancestor_id}

        def make_partners_cte(cte):
            # non-recursive: get top parent(s) with respect to `include_parent`
            return cls.tree.filter(
                **filter_kwargs
            ).values(
                # Note. django-cte somehow annotates columns in raw SQL query with "col{col mun}"
                # alias, and it breaks query. So we need to create alias of ID column for further
                # using.
                cte_id=F("id"),
            ).union(
                # recursive union: get descendants
                cte.join(cls.tree.all(), parent_channel_partner_id=cte.col.cte_id).values(
                    cte_id=F("id"),
                ),
                all=True,
            )

        recursive_query = With.recursive(make_partners_cte)

        partners_tree = (
            recursive_query.join(cls.tree.all(), id=recursive_query.col.cte_id)
            .with_cte(recursive_query)
        )
        return partners_tree


    @cached_property
    def successors(self):
        return self.get_successors(ancestor_id=self.id)


class ChannelPartnerToUser(models.Model):
    channel_partner = models.ForeignKey(ChannelPartner, on_delete=models.CASCADE)
    user = models.ForeignKey(CloudUser, on_delete=models.CASCADE)
    roles = models.JSONField(default=list)
    title = models.CharField(max_length=100, blank=True)
    created_ts = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.constraints.UniqueConstraint(fields=['channel_partner', 'user'], name='unique_channel_partner_user')
        ]


    def can_manage(self, user: CloudUser):
        return self.channel_partner.can_manage_users(user)


class OrganizationRole(models.Model):
    ORGANIZATION_ADMINISTRATOR = uuid.UUID(int=1, version=4)
    SYSTEM_HEALTH_VIEWER = uuid.UUID(int=4, version=4)

    id = models.UUIDField(primary_key=True, editable=False, default=uuid.uuid4)
    name = models.CharField(max_length=100, unique=True)
    system_role = models.CharField(max_length=100, blank=True, default='')
    system_role_uuid = models.CharField(max_length=100, blank=True, default='')
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
    FULL = 0
    PRIVACY_MODE = 100
    NO_ACCESS = 200

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



class Organization(ChannelPartnerAccessLevel, ChannelPartnerStates, models.Model):

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    channel_partner = models.ForeignKey(ChannelPartner, on_delete=models.CASCADE, related_name='organizations')
    name = models.CharField(max_length=150)
    users = models.ManyToManyField(CloudUser, related_name='organizations',
                                   blank=True, through='OrganizationToUser')
    state = models.IntegerField(choices=ChannelPartnerStates.STATE_CHOICES,
                                blank=False, default=ChannelPartnerStates.ACTIVE)
    channel_partner_access_level = models.ForeignKey(OrganizationRole, null=True,
                                                     limit_choices_to={
                                                         "id__in": [
                                                             OrganizationRole.ORGANIZATION_ADMINISTRATOR,
                                                             OrganizationRole.SYSTEM_HEALTH_VIEWER
                                                         ]
                                                     },
                                                     default=OrganizationRole.ORGANIZATION_ADMINISTRATOR,
                                                     on_delete=models.SET_NULL)
    attributes = models.JSONField(default=dict)

    objects = ExternalIdTargetManager()
    external_id_field_name = 'id'  # Field that is checked for possible external id usage

    class Meta:
        permissions = [
            (OrganizationPermissions.manage_systems, 'Can add and remove systems to the Organization and create, edit, delete groups'),
            (OrganizationPermissions.manage_users, 'Add/Remove users from the Organization, assign them permissions, including Administrator permissions'),
            (OrganizationPermissions.configure_organization, 'Edit Organization settings'),
            (OrganizationPermissions.view_service_reports, 'Ability to view how many services are consumed by this Organization.'),
            (OrganizationPermissions.view_health_monitoring, 'View health monitoring information'),
            (OrganizationPermissions.access_systems, 'Access Organization’s systems with system role\'s permissions')

        ]
    permissions = OrganizationPermissions

    def __str__(self):
        return self.name

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

    def service_changes_summary(self, start_ts: datetime.date):
        if start_ts is None:
            start_ts = timezone.now() - relativedelta(months=1)
        start_calc = {str(service.id): service
                      for service in ChannelPartnerService.objects.filter(
                channelpartnerservicerecord__cloud_system__organization=self,
                channelpartnerservicerecord__created_ts__lt=start_ts
            ).annotate(quantity=Sum('channelpartnerservicerecord__quantity'))}

        end_calc = list(ChannelPartnerService.objects.filter(
            channelpartnerservicerecord__cloud_system__organization=self, channelpartnerservicerecord__created_ts__lt=start_ts+relativedelta(months=1)
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

    def service_changes(self, start_ts: datetime.date) -> 'QuerySet[ChannelPartnerServiceRecord]':
        if start_ts is None:
            start_ts = timezone.now() - relativedelta(months=1)
        return ChannelPartnerServiceRecord.objects.filter(
            cloud_system__organization=self, created_ts__gte=start_ts, created_ts__lt=start_ts+relativedelta(months=1)
        ).order_by('created_ts')

    def allowed_role_names(self, perm: str):
        return [role.name for role in OrganizationRole.objects.filter(permissions__codename=perm)]

    def has_perm(self, user: CloudUser, perm: str):
        allowed_role_names = self.allowed_role_names(perm)
        if self.users.filter(pk=user.pk, organizationtouser__roles__has_any_keys=allowed_role_names).exists():
            return True
        channel_partner_manager = ChannelPartnerToUser.objects.filter(user=user, channel_partner=self.channel_partner, roles__has_any_keys=['Administrator', 'Manager']).exists()
        if channel_partner_manager:
            if self.channel_partner_access_level_id == OrganizationRole.ORGANIZATION_ADMINISTRATOR:
                role = 'Organization Administrator'
            else:
                role = 'System Health Viewer'
            return role in allowed_role_names
        return False

    def can_access(self, user: CloudUser):
        return self.users.filter(pk=user.pk).exists() or self.channel_partner.can_access(user)

    def can_manage(self, user: CloudUser):
        return self.channel_partner.can_add_or_remove_organizations(user)

    def can_modify_service_quantities(self, user: CloudUser):
        return self.channel_partner.can_modify_organization_service_quantities(user)

    def can_configure(self, user: CloudUser):
        return self.has_perm(user, OrganizationPermissions.configure_organization)

    def can_manage_systems(self, user: CloudUser):
        return self.has_perm(user, OrganizationPermissions.manage_systems)

    def can_manage_users(self, user: CloudUser):
        if self.has_perm(user, OrganizationPermissions.manage_users):
            return True
        elif self.users.filter(organizationtouser__roles__has_any_keys=self.allowed_role_names(
                OrganizationPermissions.manage_users)
        ).count() == 0 and self.channel_partner.can_add_or_remove_organizations(user):
            return True
        return False

    def can_view_service_reports(self, user: CloudUser):
        return self.has_perm(user, OrganizationPermissions.view_service_reports)

    def can_view_health_monitoring(self, user: CloudUser):
        return self.has_perm(user, OrganizationPermissions.view_health_monitoring)

    def can_access_systems(self, user: CloudUser):
        return self.has_perm(user, OrganizationPermissions.access_systems) or self.channel_partner.can_access(user)

    @property
    def effective_state(self):
        channel_partner_state = self.channel_partner.effective_state
        if channel_partner_state > self.state:
            return channel_partner_state
        else:
            return self.state

    @property
    def all_services(self):
        return self.channel_partner.all_services


class OrganizationToUser(models.Model):
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    user = models.ForeignKey(CloudUser, on_delete=models.CASCADE)
    roles = models.JSONField(default=list)
    title = models.CharField(max_length=100, blank=True)
    created_ts = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.constraints.UniqueConstraint(fields=['organization', 'user'], name='unique_organization_user')
        ]

    def can_manage(self, user: CloudUser):
        return self.organization.can_manage_users(user)

    def update_user_systems_data(self, role: OrganizationRole | None) -> dict:
        systems = CloudSystemId.objects \
            .filter(organization=self.organization) \
            .exclude(state=ChannelPartnerStates.SHUTDOWN)
        systems = systems.values_list('system_id', flat=True)
        data = BatchRequestItems(
            items=[
                BatchRequestItem(
                    systems=[str(system) for system in systems],
                    users=[self.user.email],
                    accessRole=getattr(role, 'system_role', 'none') or 'none',
                    attributes={}
                )
            ]
        )
        return data


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
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    type = models.IntegerField(choices=SERVICE_TYPES)
    created_by_channel_partner = models.ForeignKey(ChannelPartner, on_delete=models.PROTECT, related_name='services')
    state = models.IntegerField(choices=STATES, default=ACTIVE)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    parameters = models.JSONField(default=dict, blank=True)
    parent_service = models.ForeignKey('ChannelPartnerService', blank=True, null=True, on_delete=models.CASCADE)

    objects = ExternalIdTargetManager()
    external_id_field_name = 'id'  # Field that is checked for possible external id usage

    def __str__(self):
        return f'{self.name} - {self.created_by_channel_partner.name}'

    def save(self, *args, **kwargs):
        new = self._state.adding
        super().save(*args, **kwargs)
        ChannelPartnerEvent.new_event(event_type=ChannelPartnerEvent.SERVICE_CHANGED, service=self)
        if new:
            for channel_partner in self.created_by_channel_partner.channel_partners.all():
                copy = ChannelPartnerService.objects.get(pk=self.pk)
                copy.pk = None
                copy.id = None
                copy._state.adding = True
                copy.created_by_channel_partner = channel_partner
                copy.parent_service = self
                copy.save()


class ChannelPartnerServiceRecord(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    service = models.ForeignKey(ChannelPartnerService, on_delete=models.PROTECT)
    quantity = models.IntegerField(default=0)
    created_ts = models.DateTimeField(auto_now_add=True)
    effective_ts = models.DateTimeField()
    in_effect = models.BooleanField(default=False)
    created_by = models.ForeignKey(CloudUser, on_delete=models.SET_NULL, null=True)
    cloud_system = models.ForeignKey(CloudSystemId, on_delete=models.SET_NULL, null=True, related_name='service_records')


class ServiceUsage(models.Model):
    # Seconds a license is allowed to be used before it must check in
    # CHECK_PERIOD = 24 * 60 * 60  # 1 day
    CHECK_PERIOD = 5 * 60  # 5 minutes

    service = models.ForeignKey(ChannelPartnerService, on_delete=models.CASCADE)
    cloud_system = models.ForeignKey(CloudSystemId, on_delete=models.CASCADE, related_name='service_usages')
    usage = models.IntegerField()
    timestamp = models.DateTimeField(auto_now_add=True)
    from_ts = models.DateTimeField()
    to_ts = models.DateTimeField()

    @classmethod
    def check_excess(cls, cloud_system: CloudSystemId) -> bool:
        # Lock this system to prevent concurrent calculations/modifications
        CloudSystemId.objects.filter(pk=cloud_system.pk).select_for_update().first()
        cloud_system.last_usage_check = timezone.now()

        # Get the last usage period if any exist
        last_usage: ServiceUsage = cloud_system.service_usages.all().order_by('to_ts').last()
        if not last_usage:
            cloud_system.usage_issue_detected = False
            cloud_system.save()
            return False

        # Get service usages for the last usage period
        service_usages: Dict[str, Dict[str, int]] = {
            str(record['service']): {'usage': record['usage']} for record in cloud_system.service_usages.filter(
                to_ts=last_usage.to_ts, from_ts=last_usage.from_ts
            ).values('service').annotate(usage=Sum('usage'))
        }
        current_services = cloud_system.services

        # Check if any service usage is greater than the allowed usage
        cloud_system.usage_issue_detected = False
        for service in service_usages:
            allocated_service_qty = current_services.get(service, {}).get('quantity', 0)
            control_usage_seconds = cls.CHECK_PERIOD * allocated_service_qty
            if service_usages[service]['usage'] > control_usage_seconds:
                cloud_system.set_security_statuses(statuses={ChannelPartnerService.LOCAL_RECORDING: 'overUse'})
                break
        else:
            cloud_system.set_security_statuses(statuses={ChannelPartnerService.LOCAL_RECORDING: 'ok'})
        cloud_system.save()


class ServiceToSubChannelProperties(models.Model):
    channel_partner = models.ForeignKey(ChannelPartner, on_delete=models.CASCADE, related_name='service_properties')
    service = models.ForeignKey(ChannelPartnerService, on_delete=models.CASCADE, related_name='channel_partners_properties')
    price = models.DecimalField(null=True, max_digits=10, decimal_places=3)

    class Meta:
        constraints = [
            models.constraints.UniqueConstraint(fields=['channel_partner', 'service'], name='unique_channel_partner_service_properties')
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

    def can_access(self, user: CloudUser):
        return self.organization.can_access(user)

    def can_manage(self, user: CloudUser):
        return self.service.created_by_channel_partner.can_add_or_remove_organizations(user)

    class Meta:
        constraints = [
            models.constraints.UniqueConstraint(fields=['organization', 'service'], name='unique_organization_service_properties')
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
            cls.objects.create(service_id=id, organization_id=organization_id)


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
    cloud_instance = models.ForeignKey(CloudInstance, on_delete=models.CASCADE)

    @classmethod
    def new_event(cls, event_type: int, system: CloudSystemId = None, service: ChannelPartnerService = None):
        if event_type == cls.SERVICE_CHANGED:
            if not service:
                raise Exception('service is required')
            new_obj = cls.objects.create(event_type=event_type, service=service,
                               cloud_instance=service.created_by_channel_partner.instance)
        else:
            if not system:
                raise Exception('system is required')
            new_obj = cls.objects.create(event_type=event_type, cloud_system=system, cloud_instance=system.cloud_host.instance)

        # Delete any old events for the same service or system
        cls.objects.filter(cloud_system=new_obj.cloud_system, service=new_obj.service).exclude(id=new_obj.id).delete()


class ExternalIdManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().select_related(self.model.object_key)


class ExternalId(models.Model):
    object_key = ''
    created_by = models.ForeignKey(ChannelPartner, on_delete=models.CASCADE, related_name='%(class)s_created_external_ids')
    custom_id = models.CharField(max_length=100)
    objects = ExternalIdManager()

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
            models.constraints.UniqueConstraint(fields=['created_by', 'custom_id'], name='channelpartner_unique_external_id')
        ]


class OrganizationExternalId(ExternalId):
    object_key = 'organization'
    organization = models.ForeignKey('Organization', on_delete=models.CASCADE, related_name='external_ids')

    class Meta:
        constraints = [
            models.constraints.UniqueConstraint(fields=['created_by', 'custom_id'], name='organization_unique_external_id')
        ]


class CloudSystemExternalId(ExternalId):
    object_key = 'cloud_system'
    cloud_system = models.ForeignKey('CloudSystemId', on_delete=models.CASCADE, related_name='external_ids')

    class Meta:
        constraints = [
            models.constraints.UniqueConstraint(fields=['created_by', 'custom_id'], name='cloudsystem_unique_external_id')
        ]


class ChannelPartnerServiceExternalId(ExternalId):
    object_key = 'channel_partner_service'
    channel_partner_service = models.ForeignKey('ChannelPartnerService', on_delete=models.CASCADE, related_name='external_ids')

    class Meta:
        constraints = [
            models.constraints.UniqueConstraint(fields=['created_by', 'custom_id'], name='channelpartnerservice_unique_external_id')
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

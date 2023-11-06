import datetime
from datetime import timedelta

import django.db.transaction
from dateutil.relativedelta import relativedelta
from typing import Dict, List
import uuid

from django.conf import settings
from django.contrib.auth.base_user import AbstractBaseUser
from django.contrib.auth.models import User, PermissionsMixin, Permission
from django.core.cache import caches
from django.db import models
from django.db.models.functions import Concat, Greatest
from django.db.models import Sum, F, QuerySet, FilteredRelation, Q
from django.utils import timezone
from django.utils.functional import cached_property
from django_cte import CTEManager, With

from channel_partners.utils import FieldOriginalMixin
from nx_cloud_api_client.apis import BatchRequestItems, BatchRequestItem

from rest_framework.authtoken.models import Token

from tools.helpers import get_period_start



class Empty:
    pass


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


class CloudInstance(models.Model):
    name = models.CharField(max_length=50)

    def __str__(self):
        return self.name


class CloudHost(models.Model):
    hostname = models.CharField(max_length=255)
    instance = models.ForeignKey(CloudInstance, on_delete=models.CASCADE)

    def __str__(self):
        return self.hostname

    @property
    def cdb_base_url(self):
        return f'https://{self.hostname}'


class CloudSystemId(FieldOriginalMixin, ChannelPartnerStates, models.Model):
    system_id = models.UUIDField()
    usage_issue_detected = models.BooleanField(default=False)
    cloud_host = models.ForeignKey(CloudHost, on_delete=models.CASCADE)
    organization = models.ForeignKey('Organization', null=True, blank=True, on_delete=models.CASCADE,
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

    objects = ExternalIdTargetManager()
    external_id_field_name = 'system_id'  # Field that is checked for possible external id usage
    activated = models.BooleanField(default=True)

    observed_fields = ('organization_id', 'state', 'effective_state')

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
        self.update_state()
        super().save(*args, **kwargs)

        ChannelPartnerEvent.new_event(event_type=ChannelPartnerEvent.SYSTEM_UPDATED, system=self)

    def negate_all_service(self, organization_id):
        """
        Negate all service for system with a given organization. Can be used when system goes down with
        current organization id or when system transferred to another organization with old organization id.
        """
        existing_services = (ChannelPartnerServiceRecord.objects
                             .filter(organization_id=organization_id, cloud_system=self)
                             .values('service_id', 'cloud_system_id', 'organization_id')
                             .annotate(negation=-Sum('quantity')))
        for service in existing_services:
            if service['negation'] not in (None, 0):
                ChannelPartnerServiceRecord.objects.create(
                    quantity=service['negation'],
                    service_id=service['service_id'],
                    effective_ts=timezone.now(),
                    in_effect=True,
                    cloud_system=self,
                    organization_id=organization_id,
                    created_by=None
                )
        # All services zeroed so we can save empty dict
        self.current_services = {}
        ChannelPartnerEvent.new_event(event_type=ChannelPartnerEvent.SYSTEM_UPDATED, system=self)

    def update_state(self):
        """
        Updates CloudSystemId.effective_state due to state changes, if effective_state
         changed then negates services when needed.
         Note. This method does not save states, super().save() must be called after.
        """
        self.effective_state = max(self.state, getattr(self.organization, 'effective_state', ChannelPartnerStates.ACTIVE))
        if self._state.adding:
            return
        if self.state == self._original_state and self.organization_id == self._original_organization_id:
            return
        if self.organization_id != self._original_organization_id or self.state == ChannelPartnerStates.SHUTDOWN:
            # TODO. Move to background.
            self.negate_all_service(self._original_organization_id)

    def calculate_current_services(self, organization_id=None, save_results=True):
        services = {
            str(record['service']): {'quantity': record['quantity']}
            for record in
            self.service_records
            .filter(organization_id=organization_id or self.organization.id)
            .values('service').annotate(quantity=Sum('quantity'))}
        self.current_services = {
            'services': services,
            'last_update_ts': round(timezone.now().timestamp())
        }
        if save_results:
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
        users = OrganizationToUser.objects \
            .exclude(user__email=user.email) \
            .filter(organization=self.organization) \
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
    # instance = models.ForeignKey(CloudInstance, on_delete=models.CASCADE, default=get_cloud_test_instance)
    cloud_host = models.ForeignKey(CloudHost, on_delete=models.CASCADE)
    monthly_additional_service_limit = models.BigIntegerField(default=None, null=True, blank=True)
    attributes = models.JSONField(default=dict)
    can_create_sub_channels = models.BooleanField(default=True)
    allow_changing_services = models.BooleanField(default=False)
    support_information = models.JSONField(blank=True, default=dict)
    created_ts = models.DateTimeField(auto_now_add=True)

    objects = ExternalIdTargetManager()
    external_id_field_name = 'id'  # Field that is checked for possible external id usage

    observed_fields = ('state', 'effective_state')

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

    permissions = ChannelPartnerPermissions

    def __str__(self):
        return f'{self.name} - {self.cloud_host.hostname}'

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
        return ((self.users.filter(pk=user.pk).exists()
                or OrganizationToUser.objects.filter(organization__channel_partner=self, user=user).exists()
                or (self.parent_channel_partner and self.parent_channel_partner.can_access(user)))
                or self.organizations.filter(users=user))

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
        elif (self.users.filter(channelpartnertouser__roles__has_any_keys=self.allowed_role_names(
            ChannelPartnerPermissions.manage_users)).count() == 0
              and self.parent_channel_partner
              and self.parent_channel_partner.can_add_or_remove_sub_chanel_partners(user)):
            return True
        return False

    def can_add_or_remove_sub_chanel_partners(self, user: CloudUser):
        return self.can_create_sub_channels and self.has_perm(user,
                                                              ChannelPartnerPermissions.add_remove_sub_channel_partners)

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
        return self.has_perm(user, ChannelPartnerPermissions.add_remove_service_quantities)\
            and self.allow_changing_services


    # @property
    # def effective_state(self):
    #     return self.state

    @property
    def all_services(self):
        services = self.services.all()
        return services

    def save(self, *args, **kwargs):
        new = self._state.adding
        # creation of channel partner with a different host is available through django admin site
        # and for second level of channel partners (direct children of Nx Channel Partner) only
        if self.parent_channel_partner and (self.parent_channel_partner.parent_channel_partner or not self.cloud_host):
            self.cloud_host = self.parent_channel_partner.cloud_host

        original_state = self._original_state
        self.update_state()
        super().save(*args, **kwargs)

        if self.parent_channel_partner and new:
            for service in self.parent_channel_partner.services.all():
                copy = ChannelPartnerService.objects.get(id=service.id)
                copy.pk = None
                copy.id = None
                copy._state.adding = True
                copy.created_by_channel_partner = self
                copy.parent_service = service
                copy.save()

        if not self.allow_changing_services and not new:
            self.disable_successors_acs()

    def disable_successors_acs(self):
        successors = self.get_successors(ancestor_id=self.id, include_ancestor=False)
        for successor in successors:
            successor.allow_changing_services = False
        ChannelPartner.objects.bulk_update(successors, fields=['allow_changing_services'])

    def parent_channel_partner_args(self, base_arg='service', secondary_arg='parent_service', suffix_arg='', value=None) -> models.Q:
        """Returns Q object of parent channel partner condtions"""
        if value is None:
            value = self
        parent_conditions = models.Q(**{base_arg + (f'__{suffix_arg}' if suffix_arg else ''): value})
        for i in range(self.MAX_DEPTH):
            parent_conditions |= models.Q(
                **{base_arg + f'__{secondary_arg}' * (i + 1) + (f'__{suffix_arg}' if suffix_arg else ''): value})
        return parent_conditions

    def service_changes_summary(self, start_ts: datetime.date = None):
        channel_partner_condition = self.parent_channel_partner_args('service', 'parent_service',
                                                                     value=models.OuterRef('pk'))
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
                created_ts__lt=start_ts + relativedelta(months=1)
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

    def service_changes(self, start_ts: datetime.date = None) -> 'QuerySet[ChannelPartnerServiceRecord]':
        if start_ts is None:
            start_ts = timezone.now() - relativedelta(months=1)
        qs = ChannelPartnerServiceRecord.objects.filter(
            self.parent_channel_partner_args(base_arg='service', secondary_arg='parent_service',
                                             suffix_arg='created_by_channel_partner', value=self),
            created_ts__gte=start_ts, created_ts__lt=start_ts + relativedelta(months=1)
        ).select_related('organization', 'created_by',
                         f'service{"__parent_service" * (self.MAX_DEPTH - 1)}')

        return qs

    def calculate_monthly_changes(self, use_cache: bool = False) -> dict:
        start_ts = get_period_start()
        cache_key = f'monthly-changes-{self.id}-{start_ts.date()}'
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

    @classmethod
    def get_ancestors(cls, successor_id: str):
        def make_partners_cte(cte):
            # non-recursive: get successor which branch will be searched above from
            return cls.tree.filter(id=successor_id).values(
                # Note. django-cte somehow annotates columns in raw SQL query with "col{col mun}"
                # alias, and it breaks query. So we need to create alias of ID column for further
                # using.
                cte_id=F("id"),
                cte_parent_channel_partner_id=F("parent_channel_partner_id")
            ).union(
                # recursive union: get descendants
                cte.join(cls.tree.all(), id=cte.col.cte_parent_channel_partner_id).values(
                    cte_id=F("id"),
                    cte_parent_channel_partner_id=F("parent_channel_partner_id")
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

    @classmethod
    def update_effective_states(cls, queryset, parent_effective_state):
        cp_to_update = []
        # exclude records which do not require for changing state
        queryset = queryset.exclude(
            effective_state=Greatest(F("state"), models.Value(parent_effective_state)))
        for channel_partner in queryset:
            effective_state = max(channel_partner.state, parent_effective_state)
            if effective_state == channel_partner.effective_state:
                continue
            channel_partner.effective_state = max(channel_partner.state, parent_effective_state)
            cp_to_update.append(channel_partner)
            Organization.update_effective_states(channel_partner.organizations, parent_effective_state=effective_state)
            cls.update_effective_states(
                cls.objects.filter(parent_channel_partner=channel_partner),
                parent_effective_state=effective_state
            )
        cls.objects.bulk_update(cp_to_update, fields=['effective_state'])

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
        Organization.update_effective_states(self.organizations, parent_effective_state=self.effective_state)
        self.update_effective_states(self.channel_partners, parent_effective_state=self.effective_state)


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
    FULL = OrganizationRole.ORGANIZATION_ADMINISTRATOR
    PRIVACY_MODE = OrganizationRole.SYSTEM_HEALTH_VIEWER
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
                                                     limit_choices_to={
                                                         "id__in": [
                                                             OrganizationRole.ORGANIZATION_ADMINISTRATOR,
                                                             OrganizationRole.SYSTEM_HEALTH_VIEWER
                                                         ]
                                                     },
                                                     default=OrganizationRole.ORGANIZATION_ADMINISTRATOR,
                                                     on_delete=models.SET_NULL)
    created_ts = models.DateTimeField(auto_now_add=True)
    attributes = models.JSONField(default=dict)

    objects = ExternalIdTargetManager()
    external_id_field_name = 'id'  # Field that is checked for possible external id usage

    observed_fields = ('state', 'effective_state')

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

    permissions = OrganizationPermissions

    def save(self, *args, **kwargs):
        self.update_state()
        super().save(*args, **kwargs)

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

    def service_changes_summary(self, start_ts: datetime.date):
        if start_ts is None:
            start_ts = timezone.now() - relativedelta(months=1)
        start_calc = {str(service.id): service
                      for service in ChannelPartnerService.objects.filter(
                channelpartnerservicerecord__organization=self,
                channelpartnerservicerecord__created_ts__lt=start_ts
            ).annotate(quantity=Sum('channelpartnerservicerecord__quantity'))}

        end_calc = list(ChannelPartnerService.objects.filter(
            channelpartnerservicerecord__organization=self,
            channelpartnerservicerecord__created_ts__lt=start_ts + relativedelta(months=1)
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
            organization=self, created_ts__gte=start_ts, created_ts__lt=start_ts + relativedelta(months=1)
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

    def has_perm(self, user: CloudUser, perm: str):
        allowed_role_names = self.allowed_role_names(perm)
        if self.users.filter(pk=user.pk, organizationtouser__roles__has_any_keys=allowed_role_names).exists():
            return True
        channel_partner_manager = ChannelPartnerToUser.objects.filter(user=user, channel_partner=self.channel_partner,
                                                                      roles__has_any_keys=['Administrator',
                                                                                           'Manager']).exists()
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
    def all_services(self):
        return self.channel_partner.all_services

    @classmethod
    def update_effective_states(cls, queryset, parent_effective_state):
        org_updated = []
        queryset = queryset.exclude(
            effective_state=Greatest("state", models.Value(parent_effective_state)))
        for organization in queryset:
            effective_state = max(organization.state, parent_effective_state)
            organization.effective_state = max(organization.state, parent_effective_state)
            org_updated.append(organization)
            organization.update_systems_effective_states(organization_effective_state=effective_state)
        cls.objects.bulk_update(org_updated, fields=['effective_state'], batch_size=100)

    def update_systems_effective_states(self, organization_effective_state):
        if organization_effective_state == ChannelPartnerStates.SHUTDOWN:
            ChannelPartnerServiceRecord.negate_services_on_shutdown(
                systems=self.cloud_systems.exclude(effective_state=organization_effective_state))
        self.cloud_systems.update(
            effective_state=Greatest("state", models.Value(organization_effective_state)))

    def update_state(self):
        """
        Updates Organization.effective_state due to state changes, if effective_state
         changed then updates effective states on all children systems and negates services when needed.
         Note. This method does not save states, super().save() must be called after.
        """
        self.effective_state = max(self.state, self.channel_partner.effective_state)
        if self._state.adding:
            return
        if self.state == self._original_state:
            return
        if self.effective_state == self._original_effective_state:
            return
        self.update_systems_effective_states(organization_effective_state=self.effective_state)


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
    created_ts = models.DateTimeField(auto_now_add=True)

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
    cloud_system = models.ForeignKey(CloudSystemId, on_delete=models.SET_NULL, null=True,
                                     related_name='service_records')
    organization = models.ForeignKey(Organization, on_delete=models.SET_NULL, null=True, related_name='service_records')

    def save(self, *args, **kwargs):
        if self._state.adding and not self.organization:
            self.organization = self.cloud_system.organization
        super().save(*args, **kwargs)

    @classmethod
    def negate_services_on_shutdown(cls, systems: QuerySet[CloudSystemId]):
        #  We probably need to zeroing of CloudSystemId.current_services
        systems.update(current_services={})
        records = (cls.objects
                   .filter(cloud_system__in=systems)
                   .values('service_id', 'cloud_system_id', 'organization_id')
                   .annotate(negation=-Sum('quantity')).exclude(negation=0))
        negation_records = []
        for record in records:
            negation_records.append(cls(
                organization_id=record['organization_id'],
                cloud_system_id=record['cloud_system_id'],
                service_id=record['service_id'],
                quantity=record['negation'],
                effective_ts=timezone.now(),
                in_effect=True,
                created_by=None
            ))
        cls.objects.bulk_create(negation_records, batch_size=100)


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
    # cloud_instance = models.ForeignKey(CloudInstance, on_delete=models.CASCADE)
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

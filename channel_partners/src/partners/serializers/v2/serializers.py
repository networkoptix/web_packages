import copy
import datetime
import json
import uuid
from collections import defaultdict
from dataclasses import (
    dataclass,
    field,
)
from typing import (
    Dict,
    Iterable,
    List,
    Set,
)

import httpx
import llutil
import structlog
from dateutil.relativedelta import relativedelta
from django.conf import settings
from django.core.cache import caches
from django.core.validators import RegexValidator
from django.db import transaction
from django.db.models import (
    Prefetch,
    Q,
    QuerySet,
    Sum,
)
from django.utils import timezone
from django.utils.functional import cached_property
from drf_spectacular.openapi import OpenApiTypes
from drf_spectacular.utils import (
    OpenApiExample,
    extend_schema_field,
    extend_schema_serializer,
)
from nx_cloud_api_client.base_auth import BearerTokenAuth
from rest_framework import (
    exceptions,
    serializers,
)
from rest_framework.exceptions import ValidationError
from rest_framework.reverse import reverse
from rest_framework.utils.encoders import JSONEncoder
from structlog.contextvars import get_contextvars

from channel_partners.utils import NonPartialCharfield
from partners.models import (
    ActionConfirmation,
    ChannelPartner,
    ChannelPartnerEvent,
    ChannelPartnerExternalId,
    ChannelPartnerRole,
    ChannelPartnerRoles,
    ChannelPartnerService,
    ChannelPartnerServiceExternalId,
    ChannelPartnerServiceRecord,
    ChannelPartnerStates,
    ChannelPartnerToUser,
    CloudHost,
    CloudSystemExternalId,
    CloudSystemId,
    CloudSystemStates,
    CloudUser,
    ConfirmationCodeInvalid,
    MigrationRecord,
    Organization,
    OrganizationExternalId,
    OrganizationRole,
    OrganizationRoles,
    OrganizationToUser,
    ServiceRecordTypes,
    ServiceToOrganizationProperties,
    ServiceToSubChannelProperties,
    ServiceUsage,
    SystemGroup,
    SystemServiceCurrentQuantity,
    get_channel_partner_roles,
    get_organization_roles,
)
from partners.tasks.notification import (
    added_channel_partner_role_task,
    added_organization_role_task,
    state_confirmation_task,
)
from partners.utils.cache_keys import (
    cp_direct_children_count,
    direct_organization_children_count,
)
from partners.utils.context_vars import get_context_vars
from partners.validators import (
    validate_active_organization,
    validate_dict_max_size,
    validate_role_and_roleId,
)
from tools.helpers import (
    forward_cdb_resp,
    get_license_server_client,
    get_path_from_parent,
    get_today,
)
from tools.serializers import (
    AccessMatrixMixin,
    FieldAccessModelSerializer,
    NullValuePKField,
)
from tools.utils import bind_system_to_cdb_organization


logger = structlog.getLogger(__name__)


STATE_CHOICES_STRS = [choice[1] for choice in ChannelPartnerStates.STATE_CHOICES]
STATE_CHOICES_MAP = {choice[0]: choice[1] for choice in ChannelPartnerStates.STATE_CHOICES}
STATE_CHOICES_STR_MAP = {choice[1]: choice[0] for choice in ChannelPartnerStates.STATE_CHOICES}


class CodeChoiceField(serializers.ChoiceField):
    def __init__(self, *args, **kwargs):
        super().__init__(**kwargs)
        self.value_to_code_map = {val: code for code, val in self.choices.items()}

    def to_representation(self, value):
        if value in ('', None):
            return value

        return self.value_to_code_map[value]

    def to_internal_value(self, data):
        if data == '' and self.allow_blank:
            return ''

        try:
            return self.choices[str(data)]
        except KeyError:
            self.fail('invalid_choice', input=data)


@extend_schema_serializer(
    examples=[
        OpenApiExample(
            'Support Information Example',
            value={
                "sites": [{"value": "123", "description": ""}],
                "phones": [{"value": "123", "description": "123"}],
                "emails": [{"value": "123", "description": "123"}],
                "custom": [{"label": "abc", "value": "123"}]
            }
        ),
    ]
)
class SupportInformationSerializer(serializers.Serializer):
    class ValueDescription(serializers.Serializer):
        value = NonPartialCharfield(required=True)
        description = NonPartialCharfield(required=False, allow_blank=True, default='')

    class CustomSerializer(serializers.Serializer):
        label = NonPartialCharfield(required=True)
        value = NonPartialCharfield(required=True)

    sites = ValueDescription(many=True, required=False, default=list)
    phones = ValueDescription(many=True, required=False, default=list)
    emails = ValueDescription(many=True, required=False, default=list)
    custom = CustomSerializer(many=True, required=False, default=list)

    def to_representation(self, instance: dict):
        for field in self.fields:
            if field not in instance:
                instance[field] = []
        return super().to_representation(instance)


class ErrorMessageSerializer(serializers.Serializer):
    message = serializers.CharField()


class DeletedEmailsSerializer(serializers.Serializer):
    emails = serializers.ListField(child=serializers.EmailField())


class RecursiveField(serializers.Serializer):
    """
    Serializer for recursive fields.
    There's also a much fuller implementation: https://github.com/heywbj/django-rest-framework-recursive
    """
    def __init__(self, parent_class, *args, **kwargs):
        if isinstance(parent_class, str):
            # To handle forward references
            self.parent_class_name = parent_class
            self.parent_class = None
        else:
            self.parent_class_name = None
            self.parent_class = parent_class
        super().__init__(*args, **kwargs)

    def to_representation(self, value):
        if self.parent_class is None:
            parent_class = globals()[self.parent_class_name]
        else:
            parent_class = self.parent_class
        serializer = parent_class(value, context=self.context)
        return serializer.to_representation(value)


class OrganizationDataSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    name = serializers.CharField()
    effectiveState = serializers.CharField()


class ChannelPartnerDataSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    name = serializers.CharField()
    effectiveState = serializers.CharField()
    subChannels = serializers.ListField(child=RecursiveField('ChannelPartnerDataSerializer'), required=False)
    organizations = OrganizationDataSerializer(many=True)


class ChannelStructureResponseSerializer(serializers.Serializer):
    organizations = OrganizationDataSerializer(many=True)
    channelPartners = ChannelPartnerDataSerializer(many=True)


class ChannelPartnerSerializer(AccessMatrixMixin, FieldAccessModelSerializer):
    CONTENT_TYPE = 'channelpartner'

    class UsersField(serializers.HyperlinkedRelatedField):
        view_name = 'v2:channelpartners-user-list'

        def get_url(self, obj, view_name, request, format):
            url_kwargs = {
                'parent_lookup_channel_partner': obj.pk
            }
            return reverse(view_name, kwargs=url_kwargs, request=request, format=format)

    class OrganizationsField(serializers.HyperlinkedRelatedField):
        view_name = 'v2:channelpartners-organization-list'

        def get_url(self, obj, view_name, request, format):
            url_kwargs = {
                'parent_lookup_channel_partner': obj.pk
            }
            return reverse(view_name, kwargs=url_kwargs, request=request, format=format)

    state = CodeChoiceField(choices=ChannelPartnerStates.STATE_CODES)
    effectiveState = CodeChoiceField(source='effective_state', choices=ChannelPartnerStates.STATE_CODES, read_only=True)
    parentChannelPartner = serializers.PrimaryKeyRelatedField(source='parent_channel_partner', read_only=True)
    monthlyAdditionalServiceLimit = serializers.IntegerField(source='monthly_additional_service_limit')
    attributes = serializers.DictField(
        allow_empty=True,
        allow_null=True,
        required=False,
        help_text='Set any custom properties. Pass value "*unset*" to remove a key.',
        validators=[validate_dict_max_size]
    )
    supportInformation = SupportInformationSerializer(source='support_information', default={}, required=False,
                                                      read_only=False)
    created = serializers.DateTimeField(source='created_ts', read_only=True)
    ownPermissions = serializers.SerializerMethodField(method_name='get_permissions_list', read_only=True)
    ownRolesIds = serializers.SerializerMethodField(method_name='get_roles_list', read_only=True)
    ownRoles = serializers.SerializerMethodField(method_name='get_roles_names', read_only=True)
    partnerCount = serializers.SerializerMethodField(read_only=True)
    lastModified = serializers.DateTimeField(source='last_modified', read_only=True)
    organizationCount = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = ChannelPartner
        fields = [
            "id",
            "state",
            "effectiveState",
            "parentChannelPartner",
            "monthlyAdditionalServiceLimit",
            "attributes",
            "supportInformation",
            "created",
            "lastModified",
            "ownPermissions",
            "ownRolesIds",
            "ownRoles",
            "name",
            'partnerCount',
            'organizationCount'
        ]
        read_only_fields = ['users', 'parentChannelPartner', 'partnerCount', 'organizationCount']

    @cached_property
    def partners_counters(self):
        if isinstance(self.instance, ChannelPartner):
            keys = [cp_direct_children_count(self.instance.id)]
        elif isinstance(self.instance, list):
            keys = [cp_direct_children_count(partner.id) for partner in self.instance]
        else:
            return {}
        return caches['default'].get_many(keys)

    def get_partnerCount(self, instance: ChannelPartner) -> int:
        cached = self.partners_counters.get(cp_direct_children_count(instance.id))
        if cached is not None:
            return cached
        return instance.partner_count(force=True)

    @cached_property
    def organization_counters(self):
        if isinstance(self.instance, ChannelPartner):
            keys = [direct_organization_children_count(str(self.instance.id))]
        elif isinstance(self.instance, list):
            keys = [direct_organization_children_count(str(partner.id)) for partner in self.instance]
        else:
            return {}
        return caches['default'].get_many(keys)

    def get_organizationCount(self, instance: ChannelPartner) -> int:
        cached = self.organization_counters.get(direct_organization_children_count(instance.id))
        if cached is not None:
            return cached
        return instance.organization_count(force=True)

    @cached_property
    def channel_partner_roles(self):
        return get_channel_partner_roles()

    def validate_parent_channel_partner(self, value: ChannelPartner):
        req = self.context.get('request')
        if not value.can_add_or_remove_sub_chanel_partners(req.user):
            raise exceptions.PermissionDenied(
                detail=f'User does not have {ChannelPartner.permissions.add_remove_sub_channel_partners} permission for {value.id}.')
        return value

    def update(self, instance: ChannelPartner, validated_data):
        instance.set_attributes(validated_data.get('attributes', {}), partial=self.partial)
        validated_data_filtered = validated_data.copy()
        validated_data_filtered.pop('attributes', None)
        return super().update(instance, validated_data_filtered)

    def get_permissions_list(self, instance) -> List[str]:
        rel = self.user_access_matrix.get_cp_to_user_rel(instance.id)
        if rel:
            return list(self.user_access_matrix.get_cp_permissions(rel.roles or [], filtered=False))
        return []

    def get_roles_list(self, instance) -> List[uuid.UUID]:
        rel = self.user_access_matrix.get_cp_to_user_rel(instance.id)
        return rel.roles if rel else []

    def get_roles_names(self, instance: Organization) -> List[str]:
        rel = self.user_access_matrix.get_cp_to_user_rel(instance.id)
        return rel.roles_name if rel else []


class CreateChannelPartnerSerializer(serializers.ModelSerializer):
    parentChannelPartner = serializers.PrimaryKeyRelatedField(source='parent_channel_partner', required=True,
                                                              queryset=ChannelPartner.objects.all())
    attributes = serializers.DictField(
        allow_empty=True,
        allow_null=True,
        required=False,
        help_text='Set any custom properties. Pass value "*unset*" to remove a key.',
        validators=[validate_dict_max_size]
    )
    monthlyAdditionalServiceLimit = serializers.IntegerField(source='monthly_additional_service_limit', required=False)
    supportInformation = SupportInformationSerializer(source='support_information', default={}, required=False)
    firstAdminEmail = serializers.EmailField(required=False, max_length=255)

    class Meta:
        model = ChannelPartner
        fields = [
            'name', 'parentChannelPartner', 'attributes',
            'monthlyAdditionalServiceLimit', 'supportInformation',
            'firstAdminEmail',
        ]

    def validate_parentChannelPartner(self, value: ChannelPartner):
        req = self.context.get('request')
        if not value.can_add_or_remove_sub_chanel_partners(req.user):
            raise exceptions.PermissionDenied(
                f'User does not have {ChannelPartner.permissions.add_remove_sub_channel_partners} permission')
        return value

    def create(self, validated_data):
        validated_data_filtered = validated_data.copy()
        validated_data_filtered.pop('attributes', None)
        admin_email = validated_data_filtered.pop('firstAdminEmail', None)
        instance: ChannelPartner = super().create(validated_data_filtered)
        instance.set_attributes(validated_data.get('attributes', {}))
        if admin_email:
            cloud_user, created = CloudUser.objects.get_or_create(email=admin_email)
            user_rel = ChannelPartnerToUser.objects.create(user=cloud_user, channel_partner=instance,
                                                roles=[ChannelPartnerRoles.ADMINISTRATOR])
            added_channel_partner_role_task.apply_async(args=[
                user_rel.channel_partner_id,
                self.context['request'].user.id,
                user_rel.user_id,
                instance.cloud_host.hostname,
                get_contextvars().get('request_id')
            ])
        return instance


class OrganizationQueryParamsSerializer(serializers.Serializer):
    includeChildOrgs = serializers.BooleanField(default=False)


class OrganizationSerializer(AccessMatrixMixin, FieldAccessModelSerializer):
    CONTENT_TYPE = 'organization'

    class CloudSystemsField(serializers.HyperlinkedRelatedField):
        view_name = 'v2:organizations-cloudsystem-list'

        def get_url(self, obj, view_name, request, format):
            url_kwargs = {
                'parent_lookup_organization': obj.pk
            }
            return reverse(view_name, kwargs=url_kwargs, request=request, format=format)

    # cloudSystems = CloudSystemsField(source='*', read_only=True)
    state = CodeChoiceField(choices=ChannelPartnerStates.STATE_CODES)
    created = serializers.DateTimeField(source='created_ts', read_only=True)
    lastModified = serializers.DateTimeField(source='last_modified', read_only=True)
    effectiveState = CodeChoiceField(source='effective_state', choices=ChannelPartnerStates.STATE_CODES, read_only=True)
    channelPartner = serializers.PrimaryKeyRelatedField(source='channel_partner', read_only=True)
    channelPartnerAccessLevel = serializers.ChoiceField(
        choices=OrganizationRoles.CPAL_CHOICES,
        required=False, allow_null=True,
        source='channel_partner_access_level_id')
    attributes = serializers.DictField(
        allow_empty=True,
        allow_null=True,
        required=False,
        help_text='Set any custom properties. Pass value "\*unset\*" to remove a key.',
        validators=[validate_dict_max_size]
    )
    currentServices = serializers.DictField(source='current_services', read_only=True)
    ownPermissions = serializers.SerializerMethodField(method_name='get_permissions_list', read_only=True)
    ownRolesIds = serializers.SerializerMethodField(method_name='get_roles_list', read_only=True)
    ownRoles = serializers.SerializerMethodField(method_name='get_roles_names', read_only=True)
    systemCount = serializers.IntegerField(source='system_count', read_only=True)

    class Meta:
        model = Organization
        fields = [
            "id",
            "state",
            "created",
            "lastModified",
            "effectiveState",
            "channelPartner",
            "channelPartnerAccessLevel",
            "attributes",
            "currentServices",
            "ownPermissions",
            "ownRolesIds",
            "ownRoles",
            "name",
            'systemCount'
        ]

    @cached_property
    def organization_roles(self):
        return get_organization_roles()

    def update(self, instance: Organization, validated_data):
        instance.set_attributes(validated_data.get('attributes', {}), partial=self.partial)
        validated_data_filtered = validated_data.copy()
        validated_data_filtered.pop('attributes', None)
        return super().update(instance, validated_data_filtered)

    def get_permissions_list(self, instance) -> List[str]:
        user_roles = self.get_roles_list(instance)
        perms = self.user_access_matrix.get_org_permissions(user_roles, filtered=False)
        return list(perms)

    def get_roles_list(self, instance: Organization) -> List[uuid.UUID]:
        own_roles = self.user_access_matrix.get_user_instance_roles(instance)
        if instance.channel_partner_access_level_id:
            if rel := self.user_access_matrix.get_cp_to_user_rel(instance.channel_partner_id):
                if set(rel.roles).intersection({ChannelPartnerRoles.ADMINISTRATOR, ChannelPartnerRoles.MANAGER}):
                    own_roles |= {instance.channel_partner_access_level_id}
        return list(own_roles)

    def get_roles_names(self, instance: Organization) -> List[str]:
        own_roles = self.get_roles_list(instance=instance)
        roles = self.user_access_matrix.access_matrix.organization_roles
        return [roles[r]['name'] for r in own_roles if roles[r]['name']]

    def validate_channelPartnerAccessLevel(self, value: uuid.UUID | None):
        if self.instance.channel_partner_access_level_id == value:
            return value
        if value == OrganizationRoles.ORGANIZATION_ADMINISTRATOR:
            return value
        if OrganizationToUser.objects.filter(
            organization=self.instance,
            roles__contains=[OrganizationRoles.ORGANIZATION_ADMINISTRATOR]
        ).exists():
            return value
        raise ValidationError('There should be at least one user in the organization '
                              'with Organization Administrator permissions')


class CreateOrganizationSerializer(serializers.ModelSerializer):
    channelPartner = serializers.PrimaryKeyRelatedField(source='channel_partner', queryset=ChannelPartner.objects.all())
    attributes = serializers.DictField(
        allow_empty=True,
        allow_null=True,
        required=False,
        help_text='Set any custom properties. Pass value "*unset*" to remove a key.',
        validators=[validate_dict_max_size]
    )
    firstAdminEmail = serializers.EmailField(required=False, max_length=255)

    class Meta:
        model = Organization
        fields = [
            'name', 'channelPartner',
            'attributes', 'firstAdminEmail'
        ]

    def validate_channelPartner(self, value: ChannelPartner):
        req = self.context.get('request')
        if not value.can_add_or_remove_organizations(req.user):
            raise exceptions.PermissionDenied(
                f'User does not have {ChannelPartner.permissions.add_remove_organizations} permission')
        return value

    def validate(self, attrs: dict):
        if first_admin_email := attrs.get('firstAdminEmail'):
            existing_partner_user = ChannelPartnerToUser.objects.filter(
                user__email=first_admin_email,
                channel_partner=attrs['channel_partner']
            ).exists()
            if existing_partner_user:
                raise ValidationError(detail={
                    "firstAdminEmail": [
                       f'User with this email has role in parent channel partner '
                       f'{attrs["channel_partner"].name} and cannot be added to organization.'
                    ]
                })
        return attrs

    def create(self, validated_data):
        # Create without attributes
        validated_data_filtered = validated_data.copy()
        validated_data_filtered.pop('attributes', None)
        admin_email = validated_data_filtered.pop('firstAdminEmail', None)
        # Create
        instance: Organization = super().create(validated_data_filtered)
        # Use model method to set original validated data's attributes
        instance.set_attributes(validated_data.get('attributes', {}))
        # Creating Admin
        if admin_email:
            cloud_user, created = CloudUser.objects.get_or_create(email=admin_email)
            user_rel = OrganizationToUser.objects.create(user=cloud_user, organization=instance,
                                              roles=[OrganizationRoles.ORGANIZATION_ADMINISTRATOR])
            added_organization_role_task.apply_async(args=[
                user_rel.organization_id,
                self.context['request'].user.id,
                user_rel.user_id,
                instance.channel_partner.cloud_host.hostname,
                structlog.contextvars.get_contextvars().get('request_id')
            ])
        return instance


class ServiceQuantitySerializer(serializers.Serializer):
    quantity = serializers.IntegerField(required=True)
    used = serializers.IntegerField(required=False, read_only=True)


class CloudSystemLightSerializer(AccessMatrixMixin, FieldAccessModelSerializer):
    CONTENT_TYPE = "cloudsystemid"
    state = CodeChoiceField(choices=ChannelPartnerStates.STATE_CODES)
    effectiveState = CodeChoiceField(source='effective_state', choices=ChannelPartnerStates.STATE_CODES, read_only=True)
    systemId = serializers.UUIDField(source='system_id', read_only=True)
    system_state = CodeChoiceField(choices=CloudSystemStates.STATE_CODES, read_only=True)
    created = serializers.DateTimeField(source='created_ts', read_only=True)
    groupId = serializers.PrimaryKeyRelatedField(source='system_group', queryset=SystemGroup.objects.all(),
                                                 allow_null=True)
    organizationName = serializers.CharField(source='organization.name', read_only=True)

    class Meta:
        model = CloudSystemId
        fields = [
            'id', 'state', 'effectiveState', 'systemId', 'name',
            'organization', 'created', 'system_state', 'groupId',
            'organizationName'
        ]
        read_only_fields = [
            'id', 'state', 'effectiveState', 'systemId', 'name',
            'organization', 'created', 'system_state', 'groupId',
            'organizationName'
        ]




class CloudSystemSerializer(AccessMatrixMixin, FieldAccessModelSerializer):
    CONTENT_TYPE = "cloudsystemid"
    state = CodeChoiceField(choices=ChannelPartnerStates.STATE_CODES)
    effectiveState = CodeChoiceField(source='effective_state', choices=ChannelPartnerStates.STATE_CODES, read_only=True)
    systemId = serializers.UUIDField(source='system_id', read_only=True)
    system_state = CodeChoiceField(choices=CloudSystemStates.STATE_CODES, read_only=True)
    services = serializers.DictField(read_only=True, child=ServiceQuantitySerializer())
    created = serializers.DateTimeField(source='created_ts', read_only=True)
    groupId = serializers.PrimaryKeyRelatedField(source='system_group', queryset=SystemGroup.objects.all(),
                                                 allow_null=True)
    organizationName = serializers.CharField(source='organization.name', read_only=True)

    class Meta:
        model = CloudSystemId
        fields = ['id', 'state', 'effectiveState', 'systemId', 'name',
                  'organization', 'services', 'created', 'system_state',
                  'groupId', 'organizationName']
        read_only_fields = ['users', 'organization', 'system_state', 'name']

    def validate_groupId(self, value: SystemGroup):
        if value:
            if value.organization_id != self.instance.organization_id:
                raise serializers.ValidationError('Parent group must be from the same organization')
        return value

    def validate(self, data):
        if not self.instance and CloudSystemId.objects.filter(system_id=data['system_id'],
                                                              cloud_host=data['cloud_host']):
            raise serializers.ValidationError('Cloud system with this id already exists')
        return data


@extend_schema_serializer(deprecate_fields=('role',))
class ChannelPartnerUserSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source='user.email', required=True)
    fullName = serializers.CharField(source='user.full_name', read_only=True)
    roles = serializers.ListField(source='roles_name', read_only=True, default=[], child=serializers.CharField())
    rolesIds = serializers.ListField(source='roles', read_only=True, default=[], child=serializers.CharField())
    role = serializers.SlugRelatedField(
        slug_field='name', write_only=True, required=False, queryset=ChannelPartnerRole.objects.all())
    roleId = serializers.PrimaryKeyRelatedField(
        queryset=OrganizationRole.objects.all(), write_only=True, required=False)
    created = serializers.DateTimeField(source='created_ts', read_only=True)
    lastModified = serializers.DateTimeField(source='last_modified', read_only=True)
    title = serializers.CharField(required=False, default='', allow_blank=True)
    attributes = serializers.DictField(
        allow_empty=True, allow_null=True, required=False,
        help_text='Set any custom properties. Pass value "*unset*" to remove a key.',
        validators=[validate_dict_max_size]
    )

    class Meta:
        model = ChannelPartnerToUser
        fields = [
            'email',
            'fullName',
            'roles',
            'role',
            'title',
            'created',
            'lastModified',
            'rolesIds',
            'roleId',
            'attributes'
        ]

    def validate_email(self, value: str):
        user, created = CloudUser.objects.get_or_create(email=value)
        if created:
            return user
        channel_partner = self.context.get('channel_partner')
        if OrganizationToUser.objects.filter(user=user, organization__channel_partner_id=channel_partner.id).exists():
            raise exceptions.ValidationError(f"User {user.email} has a role in the channel partner child organization"
                                             f" and cannot be added to channel partner {channel_partner.name}.")
        return user

    def validate(self, attrs):
        validate_role_and_roleId(attrs)
        user = attrs.get('user').get('email')
        role = attrs.get('roleId') or attrs.get('role')
        channel_partner = self.context.get('channel_partner')
        admins_queryset = ChannelPartnerToUser.objects.filter(
            channel_partner=channel_partner, roles__contains=[ChannelPartnerRoles.ADMINISTRATOR])
        if all([
            role.id != ChannelPartnerRoles.ADMINISTRATOR,
            admins_queryset.exists(),
            not admins_queryset.exclude(user=user).exists(),
        ]):
            raise ValidationError({'roleId': ['It is impossible to change role for the only administrator.']})
        return attrs

    def create(self, validated_data):
        user = validated_data.get('user').get('email')

        # Obtain the role information from the request; prioritize 'roleId' over 'role'.
        role = validated_data.get('roleId') or validated_data.get('role')

        # Extract the title from the validated data.
        title = validated_data.get('title')

        # Get the channel partner from the serializer's context; set in the view.
        channel_partner = self.context.get('channel_partner')

        # Retrieve the user making the request from the context.
        created_by = getattr(self.context.get('request'), 'user', None)

        # Attempt to retrieve or create the ChannelPartnerToUser relation based on the user and channel partner.
        relation, created = ChannelPartnerToUser.objects.get_or_create(user=user, channel_partner=channel_partner)

        # If there are attributes provided in the request, set them using the set_attributes method.
        if 'attributes' in validated_data:
            attributes = validated_data.get('attributes', {})
            # Note: The partial update flag is set to True; only specified attributes will be updated.
            relation.set_attributes(attributes, partial=True)

        # Set the title of the relation.
        relation.title = title

        # Set the roles of the user within the relation; currently assumes a single role ID.
        relation.roles = [role.id]

        # Save the relation instance after all updates.
        relation.save()

        # If this relation was newly created (not just updated), trigger an asynchronous task.
        if created:
            added_channel_partner_role_task.apply_async(args=[
                relation.channel_partner_id,
                created_by.id,
                relation.user_id,
                channel_partner.cloud_host.hostname,
                structlog.contextvars.get_contextvars().get('request_id')
            ])

        # Return the updated or newly created relation instance.
        return relation


class ReadWriteSerializerMethodField(serializers.Field):
    def __init__(self, method_name=None, **kwargs):
        self.method_name = method_name
        kwargs['source'] = '*'
        super(ReadWriteSerializerMethodField, self).__init__(**kwargs)

    def bind(self, field_name, parent):
        self.field_name = field_name
        # In order to enforce a consistent style, we error if a redundant
        # 'method_name' argument has been used. For example:
        # my_field = serializer.SerializerMethodField(method_name='get_my_field')
        default_method_name = 'get_{field_name}'.format(field_name=field_name)
        assert self.method_name != default_method_name, (
                "It is redundant to specify `%s` on SerializerMethodField '%s' in "
                "serializer '%s', because it is the same as the default method name. "
                "Remove the `method_name` argument." %
                (self.method_name, field_name, parent.__class__.__name__)
        )

        # The method name should default to `get_{field_name}`.
        if self.method_name is None:
            self.method_name = default_method_name

        super(ReadWriteSerializerMethodField, self).bind(field_name, parent)

    def to_representation(self, value):
        method = getattr(self.parent, self.method_name)
        return method(value)

    def to_internal_value(self, data):
        return {self.field_name: data}


class GroupRolesSerializer(serializers.Serializer):
    groupId = serializers.UUIDField(source='system_group_id')
    roles = serializers.ListField(source='roles_name', child=serializers.CharField())
    rolesIds = serializers.ListField(source='roles', child=serializers.UUIDField())
    created = serializers.DateTimeField(source='created_ts')
    lastModified = serializers.DateTimeField(source='last_modified')

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if not instance.system_group:
            return None
        return data


# TODO: This serializer looks like spaghetti code. Need to consider how we store and generate this data.
@extend_schema_serializer(deprecate_fields=('role',))
class OrganizationUserSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(required=True)
    fullName = serializers.CharField(source='full_name', read_only=True)
    roles = serializers.SerializerMethodField(method_name='get_roles', read_only=True)
    rolesIds = serializers.SerializerMethodField(method_name='get_roles_ids', read_only=True)
    groupRoles = GroupRolesSerializer(source="organization_relations", many=True, read_only=True)
    role = serializers.SlugRelatedField(
        slug_field='name', write_only=True, required=False, queryset=OrganizationRole.objects.all())
    # role = serializers.SlugRelatedField(slug_field='name', queryset=OrganizationRole.objects.all(),
    #                                     write_only=True, allow_null=True)
    roleId = serializers.PrimaryKeyRelatedField(
        queryset=OrganizationRole.objects.all(), write_only=True, required=False)
    created = serializers.SerializerMethodField(source='created_ts')
    title = ReadWriteSerializerMethodField(required=False, default='')

    class Meta:
        model = CloudUser
        fields = [
            'email',
            'fullName',
            'roles',
            'role',
            'rolesIds',
            'roleId',
            'title',
            'created',
            'groupRoles'
        ]

    def get_roles(self, obj: CloudUser) -> List[str]:
        relation = next(filter(lambda rel: rel.system_group is None, obj.organization_relations), None)
        if relation:
            return relation.roles_name
        else:
            return []

    def get_roles_ids(self, obj: CloudUser) -> List[uuid.UUID]:
        relation = next(filter(lambda rel: rel.system_group is None, obj.organization_relations), None)
        if relation:
            return relation.roles
        else:
            return []

    def to_representation(self, instance):
        data = super().to_representation(instance)
        group_roles = data['groupRoles']
        data['groupRoles'] = [rel for rel in group_roles if rel is not None] or []
        return data

    def validate_email(self, value: str):
        user, created = CloudUser.objects.get_or_create(email=value)
        if created:
            return user
        organization = self.context.get('organization')
        if ChannelPartnerToUser.objects.filter(
                user=user, channel_partner_id=organization.channel_partner_id).exists():
            raise exceptions.ValidationError(f"User {user.email} has a role in the organization parent "
                                             f"channel partner and cannot be added to organization "
                                             f"{organization.name}.")
        return user

    def get_created(self, obj: CloudUser) -> datetime.datetime:
        # Todo. replace wit CloudUser created date or creation date in exact organization
        relation = sorted(obj.organization_relations, key=lambda rel: rel.created_ts)[0]
        return relation.created_ts

    def get_title(self, obj: CloudUser):
        relation = sorted(obj.organization_relations, key=lambda rel: rel.created_ts)[0]
        return relation.title

    def validate(self, attrs: dict) -> dict:
        validate_role_and_roleId(attrs)
        organization = self.context.get('organization')
        user = attrs.get('email')
        role = attrs.get('roleId') or attrs.get('role')
        admins_queryset = OrganizationToUser.objects.filter(
            organization=organization, roles__contains=[OrganizationRoles.ORGANIZATION_ADMINISTRATOR])
        if (
            role.id != OrganizationRoles.ORGANIZATION_ADMINISTRATOR and
            admins_queryset.exists() and
            not admins_queryset.exclude(user__email=user).exists()
        ):
            is_cpal_admin = organization.channel_partner_access_level_id == OrganizationRoles.ORGANIZATION_ADMINISTRATOR
            cp_managers_queryset = ChannelPartnerToUser.objects.filter(
                channel_partner_id=organization.channel_partner_id,
                roles__overlap=[ChannelPartnerRoles.MANAGER, ChannelPartnerRoles.ADMINISTRATOR])
            if not is_cpal_admin or not cp_managers_queryset.exists():
                raise ValidationError({'roleId': ['It is impossible to change role for the only administrator.']})
        return attrs

    def create(self, validated_data):
        role = validated_data.get('roleId') or validated_data.get('role')
        user = validated_data['email']
        title = validated_data.get('title', '')
        organization = self.context.get('organization')
        created_by = self.context['request'].user
        # User can be moved from group to organization level. If user has any
        # group or organization membership then it is not a new role.
        with transaction.atomic():
            try:
                relation, created = OrganizationToUser.objects.get_or_create(
                    user=user, organization=organization)
            except OrganizationToUser.MultipleObjectsReturned:
                relations = (OrganizationToUser.objects
                             .filter(user=user, organization=organization)
                             .order_by('created_ts'))
                relation = relations.first()
                created = False

            relation.system_group = None
            relation.title = title
            relation.roles = [role.id] if role else []
            relation.save()
            OrganizationToUser.objects.filter(user=user, organization=organization, system_group__isnull=False).delete()
            user = CloudUser.objects.prefetch_related(
                Prefetch('organizationtouser_set',
                         queryset=OrganizationToUser.objects.filter(organization=organization),
                         to_attr='organization_relations')).distinct().get_or_create(email=user.email)[0]
        if created:
            added_organization_role_task.apply_async(args=[
                relation.organization_id,
                created_by.id,
                relation.user_id,
                organization.channel_partner.cloud_host.hostname,
                structlog.contextvars.get_contextvars().get('request_id')
            ])
        return user


class SignSerializerMixin:
    def to_representation(self, instance):
        ret = super().to_representation(instance)
        json_dump = json.dumps(ret, separators=(',', ':'), cls=JSONEncoder, ensure_ascii=False)
        ret['signature'] = llutil.sign(json_dump, settings.RSA_KEY4)
        return ret


class SaaSReportSerializer(SignSerializerMixin, serializers.Serializer):
    class SecuritySerializer(serializers.Serializer):
        lastCheck = serializers.DateTimeField(source='last_usage_report', format='%Y-%m-%d %H:%M:%S')
        tmpExpirationDate = serializers.SerializerMethodField()
        status = serializers.DictField(source='security_statuses_by_type')
        statusIds = serializers.DictField(source='security_statuses_by_service')
        checkPeriodS = serializers.SerializerMethodField()

        def get_tmpExpirationDate(self, obj: CloudSystemId) -> str:
            ret_ts = obj.last_usage_report + datetime.timedelta(seconds=settings.SERVICE_USAGE_CHECK_PERIOD * 30)
            return ret_ts.strftime('%Y-%m-%d %H:%M:%S')

        def get_checkPeriodS(self, obj: CloudSystemId) -> int:
            return settings.SERVICE_USAGE_CHECK_PERIOD

    class ChannelPartneNestedSerializer(serializers.ModelSerializer):
        supportInformation = SupportInformationSerializer(source='support_information')

        class Meta:
            model = ChannelPartner
            fields = ['id', 'name', 'supportInformation']

    class OrganizationNestedSerializer(serializers.ModelSerializer):
        class Meta:
            model = Organization
            fields = ['id', 'name']

    cloudSystemId = serializers.UUIDField(source='system_id')
    channelPartner = ChannelPartneNestedSerializer(source='organization.channel_partner')
    organization = OrganizationNestedSerializer()
    state = CodeChoiceField(source='effective_state', choices=ChannelPartnerStates.STATE_CODES)
    services = serializers.DictField(default={})
    security = SecuritySerializer(source='*')
    signature = serializers.CharField(default='')
    requestId = serializers.SerializerMethodField(read_only=True, required=False, default='')

    @extend_schema_field(OpenApiTypes.STR)
    def get_requestId(self, obj) -> str:
        return self.context.get('requestId', '')


class UsageSerializer(serializers.Serializer):
    class DeviceSerializer(serializers.Serializer):
        id = serializers.CharField()
        usage = serializers.IntegerField()

    service = NullValuePKField(queryset=ChannelPartnerService.objects.all(),
                               null_value=ServiceUsage.UNALLOCATED_SERVICE)
    devices = DeviceSerializer(many=True)


class SystemUsageReportSerializer(SignSerializerMixin, serializers.Serializer):


    usages = UsageSerializer(required=False, many=True)
    locals()['from'] = serializers.DateTimeField(format='%Y-%m-%d %H:%M:%S')
    locals()['to'] = serializers.DateTimeField(format='%Y-%m-%d %H:%M:%S')
    signature = serializers.CharField(default='', read_only=True)

    def validate_timestamp(self, value):
        timestamp_seconds = int(value.timestamp())
        interval_seconds = settings.SERVICE_USAGE_CHECK_PERIOD
        if timestamp_seconds % interval_seconds != 0:
            raise serializers.ValidationError(f'Timestamp must be divisible by {interval_seconds} seconds')
        return value

    def validate_from(self, value):
        return self.validate_timestamp(value)

    def validate_to(self, value):
        return self.validate_timestamp(value)

    def validate(self, data):
        from_ts = data.get('from')
        to_ts = data.get('to')
        if to_ts - from_ts != datetime.timedelta(seconds=settings.SERVICE_USAGE_CHECK_PERIOD):
            raise serializers.ValidationError(
                f'Time range must cover exactly {settings.SERVICE_USAGE_CHECK_PERIOD} seconds')
        return data

    def validate_usages(self, value):
        # CLOUD-12699 ignoring "00000000-0000-0000-0000-000000000000", ignoring cloud storage
        value = [
            usage for usage in (value or [])
            if usage['service'] and usage['service'].type != ChannelPartnerService.CLOUD_STORAGE
        ]
        return value

    def save_security_metrics(self, cloud_system: CloudSystemId):
        usages = self.validated_data.get('usages')
        from_ts = self.validated_data.get('from')
        to_ts = self.validated_data.get('to')

        service_usage_dict = defaultdict(int)
        for usage in usages:
            device_list = usage.get('devices')
            service_id = usage.get('service').id
            for device in device_list:
                service_usage_dict[service_id] += device.get('usage', 0)
        usage_records = []
        for service_id, usage in service_usage_dict.items():
            usage_records.append(ServiceUsage(
                usage=usage, cloud_system=cloud_system,
                service_id=service_id,
                from_ts=from_ts, to_ts=to_ts
            ))
        with transaction.atomic():
            cloud_system.last_usage_report = timezone.now()
            cloud_system.save()
            ServiceUsage.objects.bulk_create(usage_records)
            ServiceUsage.check_excess(cloud_system)


class CloudStorageUsageSerializer(serializers.Serializer):
    class StorageDeviceSerializer(serializers.Serializer):
        id = serializers.CharField()
        serviceId = NullValuePKField(
            source='service', null_value=ServiceUsage.UNALLOCATED_SERVICE,
            queryset=ChannelPartnerService.objects.filter(type=ChannelPartnerService.CLOUD_STORAGE),
        )

    cloudSystemId = serializers.UUIDField(source='cloud_system')
    devices = StorageDeviceSerializer(many=True)

    def validate_cloudSystemId(self, value) -> CloudSystemId:
        if system := CloudSystemId.objects.filter(system_id=value).first():
            return system
        raise exceptions.ValidationError('Invalid cloud system id or cloud system does not exists.')

    def validate_devices(self, value):
        value = [
            device for device in (value or [])
            if device and device['service']
        ]
        return value


class CloudStorageUsageReportSerializer(SignSerializerMixin, serializers.Serializer):

    usedDevices = CloudStorageUsageSerializer(required=True)
    signature = serializers.CharField(default='', read_only=True)

    def save_security_metrics(self):
        if not self.validated_data.get('usedDevices'):
            return
        cloud_system: CloudSystemId = self.validated_data['usedDevices']['cloud_system']
        devices = self.validated_data['usedDevices'].get('devices', [])
        service_type = ChannelPartnerService.CLOUD_STORAGE
        now = timezone.now()
        service_usage_dict = defaultdict(int)
        for device in devices:
            service = device['service']
            service_id = service.id if service else None
            service_usage_dict[service_id] += 1

        for service_id, usage in service_usage_dict.items():
            ServiceUsage.objects.create(
                usage=usage, cloud_system=cloud_system,
                service_id=service_id, from_ts=now, to_ts=now,
            )

        ServiceUsage.check_excess(cloud_system)


@extend_schema_serializer(
    examples=[
        OpenApiExample(
            'Services Example',
            value={
                'services': {'3fa85f64-5717-4562-b3fc-2c963f66afa6': {
                    'quantity': 10,
                    'used': 5
                }},
            },
            response_only=True
        ),
        OpenApiExample(
            'Services Example',
            value={
                'services': {'3fa85f64-5717-4562-b3fc-2c963f66afa6': {
                    'quantity': 10,
                }},
            },
            request_only=True
        ),
    ]
)
class SystemServiceQuantitySerializer(serializers.ModelSerializer):
    services = serializers.DictField(child=ServiceQuantitySerializer())

    class Meta:
        model = CloudSystemId
        fields = ['services']

    def update(self, instance: CloudSystemId, validated_data):
        services = validated_data.get('services')

        user = validated_data.get('user')
        created_by = CloudUser.objects.get_or_create(email=user.email)[0]

        new_records = []
        for service, qty_delta in services.items():
            new_records.append(ChannelPartnerServiceRecord(
                quantity=qty_delta,
                service=service,
                effective_ts=timezone.now(),
                in_effect=True,
                cloud_system=instance,
                organization=instance.organization,
                created_by=created_by
            ))

        ChannelPartnerServiceRecord.objects.bulk_create(new_records)
        instance.calculate_current_services()
        ServiceUsage.check_excess(cloud_system=instance)
        return instance

    def validate_services(self, value: dict):
        service_ids = list(value.keys())
        services = ChannelPartnerService.objects.filter(id__in=list(service_ids))

        self._check_shutdown_state()

        # Initiate errors collection
        errors = defaultdict(list)

        # Aggregate errors for each validation step
        self._validate_service_existence_and_quantity(services, value, errors)

        if errors:
            # Fail early to avoid information leaks
            self._raise_validation_error(errors)

        existing_services = self.instance.calculate_current_services()
        services_values = self._get_services_from_value(services, value)
        self._check_service_enabled(services, errors)
        self._check_expired_services(services_values, errors)
        self._check_credit_service_increased(services, value, errors)
        new_records, types_changes = self._calculate_service_changes(services_values, existing_services)
        self._check_monthly_limits(types_changes, errors)

        # Raise validation error if there are any errors collected
        if errors:
            self._raise_validation_error(errors)

        return new_records

    def _check_expired_services(self, services: Iterable[ChannelPartnerService], errors: dict):
        querysets = []

        for service in services:
            if service.is_expiring and service.duration > 0:
                cutoff_date = timezone.now() - relativedelta(months=service.duration)
                querysets.append(
                    ChannelPartnerServiceRecord.objects.filter(
                        service=service,
                        cloud_system_id=self.instance.id,
                        created_ts__lt=cutoff_date
                    )
                )

        if querysets:
            expired_records = querysets[0]
            for queryset in querysets[1:]:
                expired_records |= queryset

            for record in expired_records:
                errors[str(record.service.id)].append('Service has expired')

    def _check_shutdown_state(self):
        if self.instance.effective_state == ChannelPartnerStates.SHUTDOWN:
            error = f"System {self.instance.system_id} is in shutdown state. Services quantity cannot be changed."
            raise ValidationError(detail={self.instance.system_id: [error]})

    def _validate_service_existence_and_quantity(
            self,
            services: QuerySet[ChannelPartnerService],
            services_and_quantities: dict,
            errors: dict) -> None:

        for service in services:
            error_message = self._check_service_existence(service)
            if error_message:
                errors[str(service.id)].append(error_message)

            if not error_message:
                service_id = str(service.id)
                service_qty = services_and_quantities.get(service_id)
                quantity_error = self._check_service_quantity(service_qty)
                if quantity_error:
                    errors[service_id].append(quantity_error)

    def _check_service_enabled(self, services: QuerySet[ChannelPartnerService], errors: dict) -> None:
        for service in services:
            if service and not service.enabled:
                errors[str(service.id)].append('Service is disabled')

    def _check_credit_service_increased(self, services: QuerySet[ChannelPartnerService], value: dict,
                                        errors: dict) -> None:
        service_dict = {str(service.id): service for service in services}

        for service_id, attrs in value.items():
            service = service_dict.get(service_id)
            if service and not service.sub_type == ChannelPartnerService.CREDIT:
                continue
            quantity = attrs.get('quantity', 0)
            if quantity > 0:
                errors[service_id].append('Credit service quantity cannot be increased.')

    def _check_service_existence(self, service: ChannelPartnerService) -> str:
        try:
            if service.created_by_channel_partner != self.instance.organization.channel_partner:
                return 'Service does not belong to the system\'s channel partner'
        except ChannelPartnerService.DoesNotExist:
            return 'Service does not exist'
        return ''

    def _check_service_quantity(self, service_qty: dict) -> str:
        ser = ServiceQuantitySerializer(data=service_qty)
        if not ser.is_valid():
            return 'Quantity is invalid: ' + ', '.join(ser.errors['quantity'])
        return ''

    def _get_services_from_value(self, services: QuerySet[ChannelPartnerService], values: dict) -> dict:
        return {
            service: values[str(service.id)]
            for service in services
        }

    def _calculate_service_changes(self, services: dict, existing_services: dict) -> tuple:
        new_records = {}
        types_changes = {}
        for service, service_dict in services.items():
            qty = service_dict.get('quantity')
            current_qty = existing_services.get('services').get(str(service.id), {}).get('quantity')
            qty_delta = qty - current_qty if current_qty is not None else qty
            if qty_delta != 0:
                new_records[service] = qty_delta
                types_changes[service.type] = types_changes.get(service.type, 0) + qty_delta
        return new_records, types_changes

    def _check_monthly_limits(self, types_changes: dict, errors: dict):
        channel_partner = self.instance.organization.channel_partner
        exceeded_types = []
        while channel_partner:
            limits = channel_partner.remaining_monthly_limits()
            channel_partner = channel_partner.parent_channel_partner
            if not limits:
                continue
            for service_type, delta in types_changes.items():
                if service_type in exceeded_types:
                    continue
                if delta > limits[service_type]:
                    exceeded_types.append(service_type)
                    if set(exceeded_types) == set([t for t, n in ChannelPartnerService.SERVICE_TYPES]):
                        break

        if exceeded_types:
            types = ', '.join(
                [dict(ChannelPartnerService.SERVICE_TYPES)[service_type] for service_type in exceeded_types])
            errors[self.instance.system_id].append(f'Monthly limit exceeded for service types {types}.')

    def _raise_validation_error(self, errors: dict) -> None:
        formatted_errors = {service_id: error_list for service_id, error_list in errors.items()}
        raise ValidationError(detail=formatted_errors)



class ServiceSerializer(serializers.ModelSerializer):
    createdByChannelPartner = serializers.PrimaryKeyRelatedField(source='created_by_channel_partner', read_only=True)
    parentServiceId = serializers.UUIDField(source='parent_service_id', read_only=True)
    type = CodeChoiceField(choices=list(ChannelPartnerService.SERVICE_TYPE_CODES))
    subType = CodeChoiceField(source='sub_type', choices=list(ChannelPartnerService.SUB_TYPES_CODES))
    state = CodeChoiceField(choices=list(ChannelPartnerService.STATES_CODES))
    duration = serializers.IntegerField(default=0)
    displayName = serializers.CharField(source='name')
    created = serializers.DateTimeField(source='created_ts', read_only=True)
    parameters = serializers.DictField(validators=[validate_dict_max_size])

    class Meta:
        model = ChannelPartnerService
        fields = ['id', 'type', 'subType', 'state', 'displayName', 'description',
                  'createdByChannelPartner', 'parameters', 'created',
                  'parentServiceId', 'duration', 'enabled']


class ServiceExtendedSerializer(ServiceSerializer):
    expirationDate = serializers.DateTimeField(source='expiration_date', read_only=True)
    hidden = serializers.SerializerMethodField()

    class Meta:
        model = ChannelPartnerService
        fields = ['id', 'type', 'subType', 'state', 'displayName', 'description',
                  'createdByChannelPartner', 'parameters', 'created',
                  'parentServiceId', 'duration', 'enabled', 'expirationDate', 'hidden']

    def get_hidden(self, obj: ChannelPartnerService) -> bool:
        if not hasattr(obj, 'expiration_date'):
            # Avoid crashing if the object does not have the expiration_date attribute
            logger.error(
                "Improper usage",
                reason="Must have expiration_date annotated",
                object_id=obj.id)
            return False
        return obj.expiration_date.date() < get_today() if obj.expiration_date else False

class AvailableChannelPartnerServiceSerializer(serializers.ModelSerializer):
    service = ServiceSerializer(read_only=True)
    price = serializers.DecimalField(decimal_places=3, max_digits=10)
    created = serializers.DateTimeField(source='created_ts', read_only=True)

    class Meta:
        fields = ['service', 'price', 'created']
        model = ServiceToSubChannelProperties


class AvailableOrganizationServiceSerializer(serializers.ModelSerializer):
    service = ServiceSerializer(read_only=True)
    price = serializers.DecimalField(decimal_places=3, max_digits=10)
    created = serializers.DateTimeField(source='created_ts', read_only=True)

    class Meta:
        fields = ['service', 'price', 'created']
        model = ServiceToOrganizationProperties


class BindLocalSystemSerializer(serializers.ModelSerializer):
    id = serializers.CharField(required=False)
    customization = serializers.CharField()
    opaque = serializers.CharField(allow_blank=True, required=False)
    groupId = serializers.UUIDField(required=False)
    organization = serializers.PrimaryKeyRelatedField(queryset=Organization.objects.all(),
                                                      required=True, allow_null=False)

    class Meta:
        model = CloudSystemId
        fields = ['id', 'name', 'customization', 'opaque', 'organization', 'groupId']


    def validate_organization(self, value: Organization):
        req = self.context.get('request')
        if not value.can_manage_systems(req.user):
            raise exceptions.PermissionDenied(
                detail=f'User does not have {Organization.permissions.manage_systems} '
                       f'permission for this organization')
        validate_active_organization(value)
        return value

    def validate(self, attrs):
        organization = attrs.get('organization')
        if groupId := attrs.get('groupId'):
            if not SystemGroup.objects.filter(id=groupId, organization=organization).exists():
                raise exceptions.ValidationError(
                    detail={'groupId': [f'Group {groupId} does not exist in this organization.']}
                )
        return attrs

    def bind_system(self):
        validated_data = self.validated_data
        request = self.context.get('request')
        system_id = validated_data.get('id', '')
        organization = validated_data.get('organization')
        name = validated_data.get('name', '')
        customization = validated_data.get('customization')
        opaque = validated_data.get('opaque', '')

        system_bind_response, status_code = bind_system_to_cdb_organization(
            access_token=request.auth, cloud_host=request.cloud_host.hostname, organization_id=str(organization.id),
            system_id=str(system_id),
            name=name, customization=customization, opaque=opaque
        )

        return system_bind_response, status_code

    def create(self, validated_data):
        cloud_host = validated_data.get('cloud_host')
        system_id = validated_data.get('system_id')
        organization = validated_data.get('organization')
        system_group_id = validated_data.get('groupId')
        system_state = validated_data.get('system_state')
        name = validated_data.get('name', '')
        system = CloudSystemId.objects.get_or_create(
            system_id=system_id, cloud_host=cloud_host, defaults=dict(system_state=system_state))[0]
        system.name = name
        system.organization = organization
        if system_group_id:
            system.system_group_id = system_group_id
        system.save()
        return system


class SystemBindResponseSerializer(serializers.Serializer):
    id = serializers.CharField()
    name = serializers.CharField()
    customization = serializers.CharField()
    authKey = serializers.CharField()
    authKeyHash = serializers.CharField()
    status = serializers.ChoiceField(
        choices=('invalid', 'notActivated', 'activated', 'deleted_', 'beingMerged', 'deletedByMerge'))
    systemSequence = serializers.CharField()
    opaque = serializers.CharField()
    version = serializers.CharField()
    registrationTime = serializers.CharField()
    system2faEnabled = serializers.BooleanField()
    attributes = serializers.ListField(child=serializers.DictField(), validators=[validate_dict_max_size])
    organizationId = serializers.CharField()


class CreateSystemSerializer(serializers.ModelSerializer):
    cloudSystemId = serializers.UUIDField(source='system_id')

    class Meta:
        model = CloudSystemId
        fields = ['cloudSystemId', 'organization']

    def validate_cloudSystemId(self, value):
        raise NotImplementedError('Warning. This method does no validation. Implement yours before using it.')

    def validate_organization(self, value: Organization):
        req = self.context.get('request')
        if value.can_manage_systems(req.user):
            return value
        else:
            raise exceptions.PermissionDenied(
                detail=f'User does not have {Organization.permissions.manage_systems} permission for this organization')

    def create(self, validated_data):
        cloud_host = validated_data.get('cloud_host')
        system_id = validated_data.get('system_id')
        organization = validated_data.get('organization')
        system = CloudSystemId.objects.get_or_create(system_id=system_id, cloud_host=cloud_host)[0]
        system.organization = organization
        system.save()
        return system


class ChannelPartnerRoleSerializer(serializers.ModelSerializer):
    permissions = serializers.SlugRelatedField(slug_field='codename', many=True, read_only=True)

    class Meta:
        model = ChannelPartnerRole
        fields = '__all__'


@extend_schema_serializer(deprecate_fields=('system_role_uuid',))
class OrganizationRoleSerializer(serializers.ModelSerializer):
    permissions = serializers.SlugRelatedField(slug_field='codename', many=True, read_only=True)
    systemRole = serializers.CharField(source='system_role')
    systemRoleId = serializers.UUIDField(source='system_role_uuid', required=False, allow_null=True)

    class Meta:
        model = OrganizationRole
        fields = ['id', 'permissions', 'systemRole', 'name', 'system_role_uuid', 'systemRoleId']


class ChannelPartnerEventParamSerializer(serializers.Serializer):
    startId = serializers.IntegerField(min_value=1, default=1)
    limit = serializers.IntegerField(max_value=2000, default=100, help_text='Max 2000')
    cloudHost = serializers.SlugRelatedField(slug_field='hostname', queryset=CloudHost.objects.all())


class ChannelPartnerEventSerializer(serializers.ModelSerializer):
    class CloudSystemEventSerializer(serializers.ModelSerializer):
        effective_state = CodeChoiceField(choices=CloudSystemId.STATE_CODES)

        class Meta:
            model = CloudSystemId
            fields = ['system_id', 'services', 'effective_state']

    cloud_system = CloudSystemEventSerializer(allow_null=True)
    service = ServiceSerializer(allow_null=True)
    event_type = CodeChoiceField(choices=ChannelPartnerEvent.EVENT_TYPE_CODES)

    class Meta:
        model = ChannelPartnerEvent
        fields = ['id', 'cloud_system', 'event_type', 'service']


class ChannelPartnerAllServicesParamSerializer(serializers.Serializer):
    cloudHost = serializers.SlugRelatedField(slug_field='hostname', queryset=CloudHost.objects.all())


class ExternalIdSerializerBase:
    def create(self, validated_data):
        custom_id = validated_data.get('custom_id')
        created_by = validated_data.get('created_by')
        if self.Meta.model.objects.filter(custom_id=custom_id, created_by=created_by):
            raise serializers.ValidationError({'customId': 'An ExternalId with this customId already exists.'})
        return super().create(validated_data)


class ChannelPartnerExternalIdSerializer(ExternalIdSerializerBase, serializers.ModelSerializer):
    channelPartner = serializers.PrimaryKeyRelatedField(source='channel_partner', queryset=ChannelPartner.objects.all())
    customId = serializers.CharField(source='custom_id')
    fullId = serializers.CharField(source='full_id',
                                   help_text='The id to use in API requests. It is "{channel_partner_id}--{custom_id}"',
                                   read_only=True)
    created = serializers.DateTimeField(source='created_ts', read_only=True)

    class Meta:
        model = ChannelPartnerExternalId
        fields = ['customId', 'channelPartner', 'fullId', 'created']

    def validate_channelPartner(self, value: ChannelPartner):
        req = self.context.get('request')
        if not value.can_access(req.user):
            raise exceptions.PermissionDenied(
                detail=f'User does not have access permission for {value.id}.')
        return value


class OrganizationExternalIdSerializer(ExternalIdSerializerBase, serializers.ModelSerializer):
    customId = serializers.CharField(source='custom_id')
    fullId = serializers.CharField(source='full_id',
                                   help_text='The id to use in API requests. It is "{channel_partner_id}--{custom_id}"',
                                   read_only=True)
    created = serializers.DateTimeField(source='created_ts', read_only=True)

    class Meta:
        model = OrganizationExternalId
        fields = ['customId', 'organization', 'fullId', 'created']

    def validate_organization(self, value: Organization):
        req = self.context.get('request')
        if not value.can_access(req.user):
            raise exceptions.PermissionDenied(
                detail=f'User does not have access permission for {value.id}.')
        return value


class CloudSystemIdExternalIdSerializer(ExternalIdSerializerBase, serializers.ModelSerializer):
    cloudSystemId = serializers.SlugRelatedField(slug_field='system_id', source='cloud_system',
                                                 queryset=CloudSystemId.objects.exclude(organization=None))
    customId = serializers.CharField(source='custom_id')
    fullId = serializers.CharField(source='full_id',
                                   help_text='The id to use in API requests. It is "{channel_partner_id}--{custom_id}"',
                                   read_only=True)
    created = serializers.DateTimeField(source='created_ts', read_only=True)

    class Meta:
        model = CloudSystemExternalId
        fields = ['customId', 'cloudSystemId', 'fullId', 'created']

    def validate_cloudSystemId(self, value: CloudSystemId):
        req = self.context.get('request')
        if not value.organization.can_access(req.user):
            raise exceptions.PermissionDenied(
                detail=f'User does not have access permission for {value.organization_id}.')
        return value


class ChannelPartnerServiceExternalIdSerializer(ExternalIdSerializerBase, serializers.ModelSerializer):
    channelPartnerService = serializers.PrimaryKeyRelatedField(source='channel_partner_service',
                                                               queryset=ChannelPartnerService.objects.all())
    customId = serializers.CharField(source='custom_id')
    fullId = serializers.CharField(source='full_id',
                                   help_text='The id to use in API requests. It is "{channel_partner_id}--{custom_id}"',
                                   read_only=True)
    created = serializers.DateTimeField(source='created_ts', read_only=True)

    class Meta:
        model = ChannelPartnerServiceExternalId
        fields = ['customId', 'channelPartnerService', 'fullId', 'created']

    def validate_channel_partner_service(self, value: ChannelPartnerService):
        req = self.context.get('request')
        if not value.created_by_channel_partner.can_access(req.user):
            raise exceptions.PermissionDenied(
                detail=f'User does not have access permission for {value.id}.')
        return value


class ChannelPartnerRecordsParamSerializer(serializers.Serializer):
    startTs = serializers.DateField(required=False)
    endTs = serializers.DateField(required=False)

    @property
    def default_end_ts(self):
        return (datetime.datetime.now(datetime.timezone.utc) + relativedelta(days=1)).date()

    def validate(self, attrs):
        if not attrs.get('startTs') and not attrs.get('endTs'):
            attrs["endTs"] = self.default_end_ts
            attrs["startTs"] = attrs["endTs"] - relativedelta(months=1)
        elif not attrs.get('endTs'):
            attrs["endTs"] = attrs["startTs"] + relativedelta(months=1)
        elif not attrs.get('startTs'):
            attrs["startTs"] = attrs["endTs"] - relativedelta(months=1)

        if attrs["startTs"] > attrs['endTs']:
            raise ValidationError({'startTs': '"startTs" cannot be greater than "endTs".',
                                   'endTs': '"startTs" cannot be greater than "endTs".'})
        if attrs["startTs"] + relativedelta(years=1) < attrs['endTs']:
            raise ValidationError({'startTs': "Look up range cannot be more than 1 year.",
                                   'endTs': "Look up range cannot be more than 1 year."})
        return attrs


class OrganizationServiceRecordSerializer(serializers.ModelSerializer):
    class OrganizationServiceSerializer(serializers.ModelSerializer):
        type = CodeChoiceField(choices=list(ChannelPartnerService.SERVICE_TYPE_CODES))
        subType = CodeChoiceField(source='sub_type', choices=list(ChannelPartnerService.SUB_TYPES_CODES))

        class Meta:
            model = ChannelPartnerService
            fields = ['id', 'name', 'type', 'subType']

    service = OrganizationServiceSerializer()
    system = serializers.SlugRelatedField(source='cloud_system', slug_field='system_id', read_only=True)
    date = serializers.DateTimeField(source='created_ts')
    changedBy = serializers.SlugRelatedField(source='created_by', slug_field='email', read_only=True)
    changeQuantity = serializers.IntegerField(source='quantity')

    class Meta:
        model = ChannelPartnerServiceRecord
        fields = ['id', 'service', 'changeQuantity', 'system', 'date', 'changedBy']


class ChannelPartnerServiceRecordSerializer(serializers.ModelSerializer):
    serviceId = serializers.SerializerMethodField(required=False)
    organizationId = serializers.SerializerMethodField(read_only=True, required=False, default=None)
    channelPartnerId = serializers.SerializerMethodField(read_only=True, required=False, default=None)
    date = serializers.DateTimeField(source='created_ts')
    changedBy = serializers.SlugRelatedField(source='created_by', slug_field='email', read_only=True)
    changeQuantity = serializers.IntegerField(source='quantity')

    def __init__(self, *args, **kwargs):
        self.channel_partner = kwargs.get('context', {}).get('channel_partner', None)
        super().__init__(*args, **kwargs)

    def calculate_service_and_direct_consumer(self, obj: ChannelPartnerServiceRecord) -> None:
        def find_direct_sub_service(service: ChannelPartnerService):
            if service.parent_service.created_by_channel_partner == self.channel_partner:
                return service
            else:
                return find_direct_sub_service(service.parent_service)

        if hasattr(obj, 'service_calculated'):
            return
        else:
            if obj.service.created_by_channel_partner == self.channel_partner:
                obj.report_organization = obj.organization
                obj.report_service = obj.service
            else:
                service = find_direct_sub_service(obj.service)
                obj.direct_child_service = service
                obj.report_service = service.parent_service
                obj.report_channel_partner = service.created_by_channel_partner
            obj.service_calculated = True

    @extend_schema_field(OpenApiTypes.UUID)
    def get_serviceId(self, obj: ChannelPartnerServiceRecord):
        self.calculate_service_and_direct_consumer(obj)
        return obj.report_service.id

    @extend_schema_field(OpenApiTypes.UUID)
    def get_organizationId(self, obj: ChannelPartnerServiceRecord):
        self.calculate_service_and_direct_consumer(obj)
        organization: Organization = getattr(obj, 'report_organization', None)
        if organization:
            return organization.id

    @extend_schema_field(OpenApiTypes.UUID)
    def get_channelPartnerId(self, obj: ChannelPartnerServiceRecord):
        self.calculate_service_and_direct_consumer(obj)
        channel_partner: ChannelPartner = getattr(obj, 'report_channel_partner', None)
        if channel_partner:
            return channel_partner.id

    class Meta:
        model = ChannelPartnerServiceRecord
        fields = ['serviceId', 'organizationId', 'channelPartnerId', 'changedBy', 'changeQuantity', 'date']


class ChannelPartnerServiceSummarySerializer(serializers.Serializer):
    start = serializers.IntegerField()
    end = serializers.IntegerField()
    service = ServiceSerializer()


class IntegerMethodField(serializers.SerializerMethodField, serializers.IntegerField):
    pass


class ChannelPartnerAggDataSerializer(serializers.Serializer):
    channelPartners = IntegerMethodField(method_name='get_channel_partners_count', default=0)
    organizations = IntegerMethodField(method_name='get_organizations_count', default=0)
    systems = IntegerMethodField(method_name='get_systems_count', default=0)
    serviceUsageQuantity = IntegerMethodField(method_name='get_service_usage_quantity', default=0)

    @cached_property
    def successors(self):
        return self.instance.get_successors(ancestor_id=self.instance.id)

    @cached_property
    def children_organizations(self):
        return Organization.objects.filter(channel_partner_id__in=[cp.id for cp in self.successors])

    @cached_property
    def children_systems(self):
        return CloudSystemId.objects.filter(organization__in=self.children_organizations) \
            .exclude(state=ChannelPartnerStates.SHUTDOWN)

    def get_channel_partners_count(self, instance):
        """
        Querying all successors of given channel partner. By default, CP itself is included in result.
        `successor property is cached at instance of the serializer to allow reuse it in methods below.
        It is simpler to decrease total count by 1 than call query a few times with different parameters.
        """
        return len(self.successors) - 1

    def get_organizations_count(self, instance):
        count = self.children_organizations.count()
        return count

    def get_systems_count(self, instance):
        count = self.children_systems.count()
        return count

    def get_service_usage_quantity(self, instance):
        service_records_quantity = ChannelPartnerServiceRecord.objects \
            .filter(organization__in=self.children_organizations).aggregate(Sum('quantity'))
        return service_records_quantity.get('quantity__sum', 0) or 0


class OrganizationAggDataSerializer(serializers.Serializer):
    systems = IntegerMethodField(method_name='get_systems_count', default=0)
    serviceUsageQuantity = IntegerMethodField(method_name='get_service_usage_quantity', default=0)

    def get_systems_count(self, instance: Organization):
        count = instance.cloud_systems.count()
        return count

    def get_service_usage_quantity(self, instance):
        service_records_quantity = ChannelPartnerServiceRecord.objects \
            .filter(organization=instance).aggregate(Sum('quantity'))
        return service_records_quantity.get('quantity__sum', 0) or 0


class GroupsStructureSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    roles = serializers.ListField(default=list)
    name = serializers.CharField()
    parentId = serializers.UUIDField(source='parent_id')
    children = serializers.SerializerMethodField()
    systemCount = serializers.SerializerMethodField(method_name='get_system_count', read_only=True)

    def get_children(self, obj):
        serializer = GroupsStructureSerializer(data=obj['children'], many=True)
        serializer.is_valid()
        return serializer.data

    def get_system_count(self, instance) -> int:
        system_group_id: uuid.UUID = instance.get('id')
        return CloudSystemId.get_systems_in_group_and_children_count(system_group_id)


class CreateGroupSerializer(serializers.ModelSerializer):
    parentId = serializers.PrimaryKeyRelatedField(source='parent', queryset=SystemGroup.objects.all(), allow_null=True)
    organizationId = serializers.PrimaryKeyRelatedField(source='organization', queryset=Organization.objects.all())

    class Meta:
        model = SystemGroup
        fields = ['name', 'parentId', 'organizationId']

    def validate_organizationId(self, value: Organization):
        req = self.context.get('request')
        if not value.can_manage_systems(req.user):
            raise exceptions.PermissionDenied(
                detail=f'User does not have {Organization.permissions.manage_systems} permission for {value.id}.')
        return value

    def validate(self, attrs):
        parent = attrs.get('parentId')
        organization = attrs.get('organizationId')
        if parent and parent.organization_id != organization.id:
            raise serializers.ValidationError('Parent group must be from the same organization')
        return attrs


@extend_schema_serializer(deprecate_fields=('systems',))
class GroupSerializer(serializers.ModelSerializer):
    class ChildGroupSerializer(serializers.ModelSerializer):
        class Meta:
            model = SystemGroup
            fields = ['id', 'name']

    systems = serializers.SlugRelatedField(slug_field='system_id', source='cloud_systems', read_only=True, many=True)
    cloudSystems = CloudSystemLightSerializer(many=True, source='cloud_systems', read_only=True)
    children = ChildGroupSerializer(source='groups', read_only=True, many=True)
    parentId = serializers.PrimaryKeyRelatedField(source='parent', queryset=SystemGroup.objects.all(),
                                                  required=False, allow_null=True)
    organizationId = serializers.UUIDField(source='organization_id', read_only=True)
    path = serializers.ListField(child=serializers.UUIDField(), source='visible_path', default=list, read_only=True)
    systemCount = serializers.IntegerField(source='system_count', read_only=True)

    class Meta:
        model = SystemGroup
        fields = [
            'id', 'name', 'systems', 'cloudSystems', 'children',
            'parentId', 'organizationId', 'path', 'systemCount',
        ]

    def validate_parentId(self, value: SystemGroup):
        if value:
            if value.organization_id != self.instance.organization_id:
                raise serializers.ValidationError('Parent group must be from the same organization')
            if self.instance and self.instance.id in get_path_from_parent(value):
                raise serializers.ValidationError(f'Groups tree for group {value.id} '
                                                  f'already contains group {self.instance.id}')
        return value

    def update(self, instance, validated_data):
        instance: SystemGroup = super().update(instance, validated_data)
        if instance.parent:
            ancestor_users = instance.parent.get_all_users().values_list('user_id', flat=True)
        else:
            ancestor_users = instance.organization.direct_users.values_list('id', flat=True)
        instance.organizationtouser_set.filter(user_id__in=ancestor_users).delete()
        return instance


class SystemUserSerializer(serializers.Serializer):
    email = serializers.EmailField(source='user__email')
    vmsRoles = serializers.SerializerMethodField(allow_null=True)
    roles = serializers.ListField(allow_empty=True, allow_null=True)
    type = serializers.ChoiceField(choices=('organization', 'channel_partner'), allow_null=True)

    @cached_property
    def organization_roles(self):
        return get_organization_roles()

    @extend_schema_field(serializers.ListField(child=serializers.UUIDField()))
    def get_vmsRoles(self, obj: dict):
        roles = self.organization_roles
        vms_roles = []
        for role_uuid in obj.get('roles', []):
            matching_role = roles[role_uuid]
            if matching_role['system_role_uuid']:
                vms_roles.append(matching_role['system_role_uuid'])
        return vms_roles


class SystemSerializer(serializers.ModelSerializer):
    class Meta:
        model = CloudSystemId
        fields = ['system_id']


@extend_schema_serializer(deprecate_fields=('system_id', 'membership_type',))
class SystemMembershipSerializer(serializers.Serializer):
    system_id = serializers.UUIDField(source='sys_id')
    systemId = serializers.UUIDField(source='sys_id')
    vmsRoles = serializers.SerializerMethodField(method_name='get_vms_roles')
    membership_type = serializers.CharField()
    membershipType = serializers.CharField(source='membership_type')
    organizationId = serializers.UUIDField(source='org_id')
    organizationName = serializers.CharField(source='org_name')

    @cached_property
    def organization_roles(self):
        return get_organization_roles()

    def get_vms_roles(self, value: dict) -> List[uuid.UUID]:
        return [self.organization_roles[role]['system_role_uuid'] for role in value['org_roles']]


class UserListSerializer(serializers.Serializer):
    users = serializers.ListField()

@extend_schema_serializer(deprecate_fields=('roles',))
class SystemGroupUserSerializer(serializers.ModelSerializer):
    class MembershipSerializer(serializers.Serializer):

        id = serializers.UUIDField(read_only=True)
        name = serializers.CharField(read_only=True)
        membershipType = serializers.ChoiceField(source='_meta.model_name', read_only=True,
                                                 choices=[Organization._meta.model_name, SystemGroup._meta.model_name])
        groupsPath = serializers.ListField(source='groups_path', read_only=True,
                                           child=serializers.UUIDField(), default=None)

    email = serializers.EmailField(source='user.email')
    fullName = serializers.CharField(source='user.full_name', read_only=True)
    roles = serializers.ListField(source='roles_name', allow_empty=True, allow_null=True, read_only=True)
    rolesIds = serializers.ListField(source='roles', read_only=True, default=[], child=serializers.CharField())
    # todo. cache queryset. should we limit it to only roles containing system_role only
    role = serializers.SlugRelatedField(
        slug_field='name', write_only=True, required=False,
        queryset=OrganizationRole.objects.exclude(id=OrganizationRoles.ORGANIZATION_ADMINISTRATOR))
    roleId = serializers.PrimaryKeyRelatedField(
        queryset=OrganizationRole.objects.exclude(id=OrganizationRoles.ORGANIZATION_ADMINISTRATOR),
        write_only=True, required=False)
    hasAccessTo = MembershipSerializer(source='has_access_to', read_only=True)
    created = serializers.DateTimeField(source='created_ts', read_only=True)
    lastModified = serializers.DateTimeField(source='last_modified', read_only=True)

    class Meta:
        model = OrganizationToUser
        fields = [
            'email',
            'fullName',
            'created',
            'lastModified',
            'roles',
            'role',
            'roleId',
            'rolesIds',
            'hasAccessTo',
        ]

    def validate(self, attrs):
        validate_role_and_roleId(attrs)
        email = attrs.get('user', {}).get('email')
        group: SystemGroup = self.context.get('group')
        user, _ = CloudUser.objects.get_or_create(email=email)
        if group.has_cp_overlaps(user):
            raise exceptions.ValidationError({
                'email': [f'User {user.email} cannot be added to group {group} '
                          f'because user has access to parent channel partner.']
            })
        if group.has_org_or_group_overlaps(user):
            raise exceptions.ValidationError({
                'email': [f'User {user.email} cannot be added to group {group} '
                          f'because user has access to organization or a group above.']
            })
        attrs['user'] = user
        return attrs

    def create(self, validated_data):
        role = validated_data.get('roleId') or validated_data['role']
        group = self.context.get('group')
        organization = group.organization
        user = validated_data['user']
        created_by = self.context['request'].user
        with transaction.atomic():
            relations = OrganizationToUser.objects.filter(user=user, organization=organization,
                                                          system_group=group).order_by('created_ts')
            relation = relations.first()
            created = False
            if not relation:
                relation = OrganizationToUser(user=user, organization=organization, system_group=group)
                first_relation = (
                    OrganizationToUser.objects
                    .filter(organization=organization, user=user)
                    .order_by('created_ts').first()
                )
                if first_relation:
                    relation.created_ts = first_relation.created_ts
                else:
                    created = True

            relation.roles = [role.id]
            relation.save()
            # Delete User's Organization Roles
            (OrganizationToUser.objects
             .filter(user=user, organization=organization, system_group__isnull=True)
             .delete())
            # Delete User's Groups roles in parents and children groups
            (OrganizationToUser.objects
             .filter(Q(system_group_id__in=group.groups_path) | Q(system_group__path__contains=[group.id]))
             .filter(user=user, organization=organization)
             .delete())
        if created:
            added_organization_role_task.apply_async(args=[
                relation.organization_id,
                created_by.id,
                relation.user_id,
                organization.channel_partner.cloud_host.hostname,
                structlog.contextvars.get_contextvars().get('request_id')
            ])
        return relation


class SystemToOrgTransferSerializer(serializers.Serializer):
    organizationId = serializers.PrimaryKeyRelatedField(queryset=Organization.objects.all())
    comment = serializers.CharField(required=False, default='')

    def validate_organizationId(self, value: Organization):
        if not value.can_manage_systems(self.context['request'].user):
            raise exceptions.PermissionDenied(
                detail=f'User does not have {Organization.permissions.manage_systems} '
                       f'permission for this organization')
        validate_active_organization(value)
        return value

    def save(self, system_id: str | uuid.UUID, **kwargs):
        organization = self.validated_data['organizationId']
        # TODO. CLOUD-12144. replace with common API
        base_url = f'https://{organization.channel_partner.cloud_host.hostname}/cdb/v0'
        offer_url = f'{base_url}/systems/{system_id}/offer'
        accept_url = f'{base_url}/organizations/{organization.id}/system-offers/{system_id}/accept'
        auth = BearerTokenAuth(token=self.context["request"].auth)
        offer = {
            'organizationId': str(organization.id),
            'comment': self.validated_data['comment'],
            'systemId': str(system_id),
        }
        context_vars = get_context_vars()
        request_id = context_vars.get('request_id', None)
        if request_id is None:
            # TODO: This needs to be moved over to NxCloudApiClient
            request_id = "NOT SET"
        headers = {"x-request-id": request_id}
        if context_vars.get('cloud_host'):
            headers["x-original-host"] = context_vars.get('cloud_host')

        offer_response = httpx.post(offer_url, json=offer, auth=auth, headers=headers)

        if offer_response.status_code != 200:
            forward_cdb_resp(offer_response, via_exception=True)
        accept_response = httpx.post(accept_url, auth=auth, headers=headers)

        if accept_response.status_code != 200:
            forward_cdb_resp(accept_response, via_exception=True)
        system = CloudSystemId.objects.update_or_create(
            defaults={'organization': organization, 'system_state': CloudSystemStates.ACTIVATED},
            system_id=system_id, cloud_host=organization.channel_partner.cloud_host,
        )[0]

        # TODO. call background task to refresh system status from cdb
        return system


class RequestConfirmationBaseSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(read_only=True)
    changeId = serializers.UUIDField(read_only=True)
    code = serializers.SerializerMethodField(method_name='get_confirmation_code', read_only=True)
    action = None

    def __init__(self, instance=None, action: ActionConfirmation.ConfirmationActionType = None, **kwargs):
        if action:
            self.action = action
        super().__init__(instance=instance, **kwargs)

    def get_confirmation_code(self, instance) -> str:
        return instance.confirmation.code

    def changes(self, instance, validated_data):
        raise NotImplementedError("Please override this method due to requested changes.")

    def validate_changes(self, value):
        validate_dict_max_size(value)
        return value

    def update(self, instance, validated_data):
        changes = self.changes(instance, validated_data)
        self.validate_changes(changes)
        confirmation = ActionConfirmation.objects.create(
            action=self.action,
            target_id=instance.id,
            changes=changes,
            created_by=self.context['request'].user.email
        )
        # dirty hack to reuse serializer for response with serializer.data
        instance.confirmation = confirmation
        return instance


class ChangeStateBaseSerializer(RequestConfirmationBaseSerializer):
    targetState = CodeChoiceField(choices=ChannelPartnerStates.STATE_CODES)

    action = None

    def __init__(self, instance=None, action: ActionConfirmation.ConfirmationActionType = None, **kwargs):
        if action:
            self.action = action
        super().__init__(instance=instance, **kwargs)

    def changes(self, instance, validated_data):
        return copy.deepcopy(validated_data)

    def validate_targetState(self, value):
        if value == self.instance.state:
            raise exceptions.ValidationError(
                detail=f"Instance is already in {dict(ChannelPartnerStates.STATE_CHOICES).get(value)} state.")
        return value

    def update(self, instance, validated_data):
        instance = super().update(instance, validated_data)
        instance.changeId = instance.confirmation.id
        instance.targetState = instance.confirmation.changes['targetState']
        state_confirmation_task.apply_async(args=[
            instance.confirmation.id,
            self.context['request'].cloud_host.hostname
        ])
        return instance


# Note. Subclasses must be initialized to generate schema.
class ConfirmActionBaseSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(read_only=True)
    changeId = serializers.UUIDField(write_only=True)
    code = serializers.CharField(write_only=True)

    action = None

    def __init__(self, instance=None, action: ActionConfirmation.ConfirmationActionType = None, **kwargs):
        if action:
            self.action = action
        super().__init__(instance=instance, **kwargs)

    def validate(self, attrs):
        change_id = attrs.get('changeId')
        code = attrs.get('code')
        try:
            attrs['changes'] = ActionConfirmation.confirm_and_get_changes(
                confirmation_id=change_id, action=self.action,
                code=code, target_id=self.instance.id, confirmed_by=self.context['request'].user)
        except ConfirmationCodeInvalid as ex:
            raise exceptions.ValidationError(detail={"code": [str(ex)]})
        return attrs


class StateConfirmationSerializer(ConfirmActionBaseSerializer):
    state = CodeChoiceField(choices=ChannelPartnerStates.STATE_CODES, read_only=True)

    def validate(self, attrs):
        attrs = super().validate(attrs)
        validated_data = {
            'state': attrs['changes']['targetState']
        }
        return validated_data


class OrganizationStateChangeSerializer(ChangeStateBaseSerializer):
    action = ActionConfirmation.ConfirmationActionType.ORGANIZATION_STATE_CHANGE

    class Meta:
        model = Organization
        fields = [
            'id',
            'targetState',
            'changeId',
            'code'
        ]


class OrganizationStateConfirmationSerializer(StateConfirmationSerializer):
    action = ActionConfirmation.ConfirmationActionType.ORGANIZATION_STATE_CHANGE

    class Meta:
        model = Organization
        fields = [
            'id',
            'state',
            'changeId',
            'code',
        ]


class ChannelPartnerStateChangeSerializer(ChangeStateBaseSerializer):
    action = ActionConfirmation.ConfirmationActionType.PARTNER_STATE_CHANGE

    class Meta:
        model = ChannelPartner
        fields = [
            'id',
            'targetState',
            'changeId',
            'code'
        ]


class ChannelPartnerStateConfirmationSerializer(StateConfirmationSerializer):
    action = ActionConfirmation.ConfirmationActionType.PARTNER_STATE_CHANGE

    class Meta:
        model = ChannelPartner
        fields = [
            'id',
            'state',
            'changeId',
            'code',
        ]


@dataclass
class MigrationResult:
    migratedLicenses: List[str] = field(default_factory=list)
    skippedLicenses: List[str] = field(default_factory=list)
    failedLicenses: List[str] = field(default_factory=list)


class LegacyLicensesSerializer(serializers.Serializer):
    licenses = serializers.ListField(child=serializers.CharField(), allow_empty=False)
    hardwareIds = serializers.ListField(child=serializers.CharField(), allow_empty=False)

    @staticmethod
    def get_credit_service(system: CloudSystemId):
        service = ChannelPartnerService.objects.filter(
            created_by_channel_partner_id=system.organization.channel_partner_id,
            sub_type=ChannelPartnerService.CREDIT,
            type=ChannelPartnerService.LOCAL_RECORDING
        ).order_by('created_ts').first()
        if not service:
            logger.warning(
                "No service found.",
                system_id=system.system_id,
                organization_id=system.organization_id,
                channel_partner_id=system.organization.channel_partner_id)
            raise exceptions.ValidationError({"detail": f"Cannot determine trial service for system {system.system_id}"})
        return service

    def validate_licenses(self, value: List[str]) -> Set[str]:
        res = set(value)
        if len(res) != len(value):
            raise exceptions.ValidationError(detail="Duplicate license keys are not allowed.")
        return res

    @staticmethod
    def get_regular_service(system: CloudSystemId):
        service = ChannelPartnerService.objects.filter(
            created_by_channel_partner_id=system.organization.channel_partner_id,
            sub_type=ChannelPartnerService.REGULAR,
            type=ChannelPartnerService.LOCAL_RECORDING
        ).order_by('created_ts').first()
        if not service:
            logger.warning(
                "No service found.",
                system_id=system.system_id,
                organization_id=system.organization_id,
                channel_partner_id=system.organization.channel_partner_id)
            raise exceptions.ValidationError({"detail": f"Cannot determine trial service for system {system.system_id}"})
        return service


    def save(self, system: CloudSystemId, **kwargs):
        credit_service = self.get_credit_service(system)
        regular_service = self.get_regular_service(system)
        licence_client = get_license_server_client()
        results = MigrationResult()
        now = timezone.now()
        service_records = []
        migration_records = []

        already_migrated = (MigrationRecord.objects
                            .filter(license_key__in=self.validated_data['licenses'])
                            .values_list('license_key', flat=True))
        already_migrated = set(already_migrated)
        results.skippedLicenses.extend(already_migrated)

        licenses = self.validated_data['licenses'] - set(already_migrated)

        for license_key in licenses:
            data = {
                "licenses": [license_key],
                "hardwareIds": self.validated_data['hardwareIds']
            }
            try:
                lic_response = licence_client.post(url=settings.LICENSE_MIGRATION_URL, json=data)
            except httpx.HTTPError as ex:
                logger.error(
                    "Request to license server failed.",
                    exception_type=type(ex).__name__,
                    exception_details=str(ex),
                    exc_info=True)
                raise exceptions.APIException(detail="Cannot proceed request.")
            if not lic_response.is_success:
                # error returned
                results.failedLicenses.append(license_key)
                continue
            try:
                # not parseable json
                lic_data = lic_response.json()
            except:
                logger.error(
                    "Cannot decode response from license server",
                    response_content=lic_response.content,
                    exc_info=True)
                results.failedLicenses.append(license_key)
                continue
            if not lic_data or not isinstance(lic_data, list):
                # success response is a List[dict]
                results.failedLicenses.append(license_key)
                continue
            lic_data = lic_data[0]
            if (
                    not isinstance(lic_data, dict)
                    or lic_data.get('key') != license_key
                    or lic_data.get('status')
                    or 'count' not in lic_data
            ):
                # not a dict, 'key' is not equal to posted license key,
                # field 'status' means some error, 'count' field is required
                results.failedLicenses.append(license_key)
                continue

            # Check license type and choose service
            if lic_data.get('type') == 'permanent':
                service = credit_service
            elif lic_data.get('type') == 'saas':
                service = regular_service
            else:
                logger.error("License type is not provided by license server",
                             license_key=license_key,
                             response=lic_data)
                results.failedLicenses.append(license_key)
                continue

            results.migratedLicenses.append(license_key)

            # Create service record for each license
            service_record = ChannelPartnerServiceRecord(
                id=uuid.uuid4(),
                cloud_system=system,
                organization=system.organization,
                service=service,
                quantity=lic_data['count'],
                record_type=ServiceRecordTypes.LICENSE_MIGRATION,
                in_effect=True,
                effective_ts=now,
            )
            service_records.append(service_record)

            # Create migration record to store license key
            migration_records.append(MigrationRecord(
                license_key=license_key,
                service_record_id=service_record.id
            ))

        if results.migratedLicenses:
            with transaction.atomic():
                ChannelPartnerServiceRecord.objects.bulk_create(service_records, batch_size=100)
                MigrationRecord.objects.bulk_create(migration_records, batch_size=100)
                system.calculate_current_services(organization_id=system.organization_id, save_results=True)

        return results


class LicensesMigrationResultSerializer(serializers.Serializer):

    migratedLicenses = serializers.ListField(child=serializers.CharField())
    skippedLicenses = serializers.ListField(child=serializers.CharField())
    failedLicenses = serializers.ListField(child=serializers.CharField())


class OrganizationSystemsQueryParamsSerializer(serializers.Serializer):
    rootOnly = serializers.BooleanField(default=False, required=False)


class ServiceCurrentQuantitySerializer(serializers.Serializer):
    service = serializers.PrimaryKeyRelatedField(queryset=ChannelPartnerService.objects.all())
    quantity = serializers.IntegerField(min_value=0)

    def validate_service(self, value):
        if not value.created_by_channel_partner_id == self.parent.parent.instance.organization.channel_partner_id:
            raise exceptions.ValidationError(
                detail=f"Service {value.id} is not available for organization {self.parent.parent.instance.organization.id}",
                code='serviceNotAvailable'
            )
        return value


class SystemServiceCurrentQuantitySerializer(serializers.ModelSerializer):
    currentUsages = ServiceCurrentQuantitySerializer(many=True)

    class Meta:
        model = CloudSystemId
        fields = ['currentUsages']

    def update(self, instance: CloudSystemId, validated_data: Dict) -> CloudSystemId:

        SystemServiceCurrentQuantity.objects.filter(cloud_system=instance).delete()

        services: defaultdict = defaultdict(int)
        # consolidate & add
        for item in validated_data['currentUsages']:
            services[item['service'].id] += item['quantity']

        # create
        quantities = []
        for service_id, quantity in services.items():
            quantities.append(SystemServiceCurrentQuantity(
                cloud_system=instance,
                organization=instance.organization,
                service_id=service_id,
                quantity=quantity
            ))
        SystemServiceCurrentQuantity.objects.bulk_create(quantities)
        ServiceUsage.check_excess(instance)
        instance.refresh_from_db()
        return instance


class ServicePriceHistorySerializer(serializers.Serializer):
    price = serializers.DecimalField(max_digits=10, decimal_places=3)
    createdTs = serializers.DateTimeField(source='created_ts')


class GrantAccessSerializer(serializers.Serializer):

    email = serializers.EmailField(
        max_length=100,
        required=True,
        validators=[RegexValidator(
            regex=r'.*@networkoptix.com$',
            message="Must be a '@networkoptix.com' address"
        )]
    )


class GrantAccessResponseSerializer(serializers.Serializer):
    class CustomizationUsersSerializer(serializers.Serializer):
        email = serializers.EmailField(source='user.email')
        organizationName = serializers.CharField(source='organization.name', required=False)
        organizationId = serializers.UUIDField(source='organization.id', required=False)
        channelPartnerName = serializers.CharField(source='channel_partner.name', required=False)
        channelPartnerId = serializers.UUIDField(source='channel_partner.id', required=False)

    customization = serializers.CharField()
    users = CustomizationUsersSerializer(many=True)


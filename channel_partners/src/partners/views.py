from django.db.models import Q, Subquery, Prefetch
from time import sleep
from uuid import uuid4

from django.core.cache import caches
from django.shortcuts import get_object_or_404
from django.utils.encoding import force_str
from drf_spectacular.openapi import OpenApiParameter, OpenApiTypes
from drf_spectacular.utils import extend_schema_view, inline_serializer
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter
# from drf_spectacular.views import extend_schema
from rest_framework import status


from rest_framework.decorators import action, api_view, authentication_classes, permission_classes
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet, GenericViewSet, mixins
from rest_framework_extensions.mixins import NestedViewSetMixin

from tools.exception import Conflict
from tools.utils import paginated_response
from .authentication import NxCloudOauthTokenAuthentication, NxCloudSystemBasicAuthentication, NxTokenAuthentication
from partners import filters
from .models import OrganizationRoles, ChannelPartnerRoles
from .permissions import IsAuthenticatedCloudUserOrSystem, CanPerformChannelPartnerAction, IsAuthenticatedSystem, IsInternalToken
from .serializers import *
from drf_spectacular.utils import extend_schema


VIEW_LOCK_WAIT_TIME = 2


class DefaultPagination(PageNumberPagination):
    page_size = 100
    page_size_query_param = 'page_size'
    max_page_size = 1000

    def get_schema_operation_parameters(self, view):
        parameters = [
            {
                'name': self.page_query_param,
                'required': False,
                'in': 'query',
                'description': force_str(self.page_query_description),
                'schema': {
                    'type': 'integer',
                },
            },
        ]
        if self.page_size_query_param is not None:
            parameters.append(
                {
                    'name': self.page_size_query_param,
                    'required': False,
                    'in': 'query',
                    'description': f'{force_str(self.page_size_query_description)}{f" Maximum {self.max_page_size}." if self.max_page_size else ""}',
                    'schema': {
                        'type': 'integer',
                        'maximum': self.max_page_size
                    },
                },
            )
        return parameters


@extend_schema(
    tags=['Channel Partners - Channel Partner Users'], responses=ChannelPartnerRoleSerializer,
    summary='Get roles for Channel Partners',
    description='Returns list of available roles that can be assigned for a user of a Channel Partner'
)
@api_view(['GET'])
def channel_partner_roles(request):
    queryset = ChannelPartnerRole.objects.all().prefetch_related('permissions')
    serializer = ChannelPartnerRoleSerializer(queryset, many=True)
    return Response(serializer.data)


@extend_schema(
    tags=['Channel Partners - Organization Users'], responses=OrganizationRoleSerializer,
    summary='Get roles for Organizations',
    description='Returns list of available roles that can be assigned for a user of an Organization'
)
@api_view(['GET'])
def organization_roles(request):
    queryset = OrganizationRole.objects.all().prefetch_related('permissions')
    serializer = OrganizationRoleSerializer(queryset, many=True)
    return Response(serializer.data)


class ParentLookUpMixin:
    def get_related_pair(self):
        parents_dict = self.get_parents_query_dict()
        m2m_key, val = list(parents_dict.items())[-1]
        return m2m_key, val


@extend_schema(
    tags=['Channel Partners - Channel Partner Users'],
)
@extend_schema_view(
    create=extend_schema(summary='Add/update user to Channel Partner',
                         description='Add user to a Channel Partner or update a role',
                         extensions={'x-permission': f'{ChannelPartner.permissions.manage_users} for Channel Partner'}),
    list=extend_schema(summary='Get list of users for a Channel Partner',
                       extensions={'x-permission': f'{ChannelPartner.permissions.manage_users} for Channel Partner'}),
    retrieve=extend_schema(summary='Get a user of a Channel Partner',
                           description='Return a user of a Channel Partner by id',
                           extensions={'x-permission': f'{ChannelPartner.permissions.manage_users} for Channel Partner'}),
    destroy=extend_schema(summary='Delete a user of a Channel Partner',
                          description='Delete a user of a Channel Partner by id',
                          extensions={'x-permission': f'{ChannelPartner.permissions.manage_users} for Channel Partner'})
)
class ChannelPartnerUserViewSet(ParentLookUpMixin, NestedViewSetMixin, ModelViewSet):
    authentication_classes = (NxCloudOauthTokenAuthentication,)
    serializer_class = ChannelPartnerUserSerializer
    http_method_names = ['get', 'post', 'delete']
    lookup_field = 'user__email'
    lookup_value_regex = '[^/]*'
    lookup_url_kwarg = 'email'
    queryset = ChannelPartnerToUser.objects.all().select_related('user').order_by('created_ts')
    filter_backends = [DjangoFilterBackend]
    filterset_class = filters.UserFilter

    def get_permissions(self):
        perms = [IsAuthenticated()]
        if self.action in ('create', 'list'):
            perms.append(CanPerformChannelPartnerAction(ChannelPartner.can_manage_users))
        if self.action in ('retrieve', 'destroy'):
            perms.append(CanPerformChannelPartnerAction(ChannelPartnerToUser.can_manage))
        return perms

    @extend_schema(summary='Get user record for the current user', methods=['GET'])
    @action(methods=['get'], detail=False)
    def self(self, request, *args, **kwargs):
        self.kwargs['email'] = request.user.email
        return self.retrieve(request, *args, **kwargs)


    # def get_object(self):
    #     queryset = self.filter_queryset(self.get_queryset())
    #     lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
    #     filter_kwargs = {self.lookup_field: self.kwargs[lookup_url_kwarg]}
    #     obj = get_object_or_404(queryset, **filter_kwargs)
    #     # Check obj permissions against channel partner
    #     self.check_object_permissions(self.request, obj.channel_partner)
    #     return obj

    def check_permissions(self, request):
        super().check_permissions(request)
        if self.action == 'list':
            m2m_key, val = self.get_related_pair()
            channel_partner = get_object_or_404(ChannelPartner, pk=val)
            self.check_object_permissions(request, channel_partner)

    # Only create a user if it does not exist, otherwise just sets the relevant group it belongs to
    def create(self, request, *args, **kwargs):
        m2m_key, val = self.get_related_pair()
        channel_partner = get_object_or_404(ChannelPartner, pk=val)
        self.check_object_permissions(request, channel_partner)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(channel_partner=channel_partner)
        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        cp_admin_qs = self.queryset.filter(
            channel_partner=instance.channel_partner,
            roles__contains=[ChannelPartnerRoles.ADMINISTRATOR])
        if not cp_admin_qs.exists() or cp_admin_qs.exclude(pk=instance.pk).exists():
            return super().destroy(request, *args, **kwargs)
        raise Conflict(f'User {instance.user.email} is the only Administrator and may not be demoted or removed.')

@extend_schema(
    tags=['Channel Partners - Channel Partners'],
    summary='Get sub Channel Partners',
    description='Returns list of sub Channel Partners of a Channel Partner by id'
)
class ChannelPartnerNestedViewSet(NestedViewSetMixin, mixins.ListModelMixin, ParentLookUpMixin, GenericViewSet):
    http_method_names = ['get']
    serializer_class = ChannelPartnerSerializer
    authentication_classes = (NxCloudOauthTokenAuthentication,)
    # Base queryset used by NestedViewSetMixin
    queryset = ChannelPartner.objects.all().order_by('created_ts')
    pagination_class = DefaultPagination
    filter_backends = [DjangoFilterBackend]
    filterset_class = filters.ChannelPartnerFilter

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['channel_partner_to_user'] = ChannelPartnerToUser.objects.filter(user=self.request.user)
        return context

    def get_queryset(self):
        query = Q(
            Q(cloud_host=self.request.cloud_host) |
            Q(
                parent_channel_partner__in=Subquery(
                    ChannelPartnerToUser.objects.filter(user=self.request.user).values('channel_partner')),
                parent_channel_partner__parent_channel_partner__isnull=True
            )
        )
        qs = super().get_queryset()
        return qs.filter(query)

    def get_permissions(self):
        return IsAuthenticated(), CanPerformChannelPartnerAction(ChannelPartner.can_access)

    def check_permissions(self, request):
        super().check_permissions(request)
        m2m_key, val = self.get_related_pair()
        channel_partner = get_object_or_404(ChannelPartner, pk=val)
        self.check_object_permissions(request, channel_partner)


class ExternalIdBase:
    authentication_classes = (NxCloudOauthTokenAuthentication,)
    permission_classes = (IsAuthenticated,)
    lookup_url_kwarg = 'custom_id'
    lookup_field = 'custom_id'

    def get_channel_partner(self):
        channel_partner_id = self.kwargs.get('channel_partner_id')
        return get_object_or_404(ChannelPartner, id=channel_partner_id,
                                 cloud_host=self.request.cloud_host, users=self.request.user)

    def get_queryset(self):
        channel_partner = self.get_channel_partner()
        return super().get_queryset().filter(
            created_by=channel_partner,
        ).order_by('created_ts')

    def create(self, request, *args, **kwargs):
        creating_channel_partner = self.get_channel_partner()

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(created_by=creating_channel_partner)
        return Response(serializer.data)


@extend_schema(
    tags=['Channel Partners - Channel Partners External Ids'],
)
class ChannelPartnerExternalIdViewset(ExternalIdBase, ModelViewSet):
    serializer_class = ChannelPartnerExternalIdSerializer
    queryset = ChannelPartnerExternalId.objects.all()
    filter_backends = [DjangoFilterBackend]
    filterset_class = filters.ExternalId


@extend_schema(
    tags=['Channel Partners - Service External Ids'],
)
class ChannelPartnerServiceExternalIdViewset(ExternalIdBase, ModelViewSet):
    serializer_class = ChannelPartnerServiceExternalIdSerializer
    queryset = ChannelPartnerServiceExternalId.objects.all()
    filter_backends = [DjangoFilterBackend]
    filterset_class = filters.ExternalId


@extend_schema(
    tags=['Channel Partners - Organization External Ids'],
)
class OrganizationrExternalIdViewset(ExternalIdBase, ModelViewSet):
    serializer_class = OrganizationExternalIdSerializer
    queryset = OrganizationExternalId.objects.all()
    filter_backends = [DjangoFilterBackend]
    filterset_class = filters.ExternalId


@extend_schema(
    tags=['Channel Partners - Cloud System External Ids'],
)
class CloudSystemExternalIdViewset(ExternalIdBase, ModelViewSet):
    serializer_class = CloudSystemIdExternalIdSerializer
    queryset = CloudSystemExternalId.objects.all().select_related('cloud_system')
    filter_backends = [DjangoFilterBackend]
    filterset_class = filters.ExternalId


@extend_schema(
    tags=['Channel Partners - Service Management'],
    summary='Services that belong to channel partner queried'
)
class ChannelPartnerOwnedServiceViewset(NestedViewSetMixin, ModelViewSet):
    http_method_names = ['get']
    authentication_classes = (NxCloudOauthTokenAuthentication,)
    serializer_class = ServiceSerializer
    queryset = ChannelPartnerService.objects.all().order_by('created_ts')
    filter_backends = [DjangoFilterBackend]
    filterset_class = filters.CreatedTsAndNameFilter

    def get_permissions(self):
        perms = [IsAuthenticatedCloudUserOrSystem()]
        if self.action == 'retrieve':
            perms.append(CanPerformChannelPartnerAction(ChannelPartner.can_access))
        if self.action == 'partial_update':
            perms.append(CanPerformChannelPartnerAction(ChannelPartner.can_manage))
        return perms

@extend_schema(
    tags=['Channel Partners - Service Management'],
    summary='These are services that are available to inherit/extend from the parent Channel Partner including properties that are specific for each channel partner.'
)
class ChannelPartnerAvailableServiceViewset(ParentLookUpMixin, NestedViewSetMixin, ModelViewSet):
    http_method_names = ['get', 'patch']
    authentication_classes = (NxCloudOauthTokenAuthentication,)
    serializer_class = AvailableChannelPartnerServiceSerializer
    queryset = ServiceToSubChannelProperties.objects.all().order_by('created_ts')
    lookup_field = 'service_id'
    filter_backends = [DjangoFilterBackend]
    filterset_class = filters.CreatedTsAndNameFilter

    def get_queryset(self):
        _, channel_partner_id = self.get_related_pair()
        ServiceToSubChannelProperties.create_missing(channel_partner_id)
        return super().get_queryset()

    def get_permissions(self):
        perms = [IsAuthenticatedCloudUserOrSystem()]
        if self.action == 'retrieve':
            perms.append(CanPerformChannelPartnerAction(ServiceToSubChannelProperties.can_access))
        if self.action == 'partial_update':
            perms.append(CanPerformChannelPartnerAction(ServiceToSubChannelProperties.can_manage))
        return perms


@extend_schema(
    tags=['Channel Partners - Service Management'],
    summary='These are services that are available to this organization from its '
            'Channel Partner including properties that are specific to the organization'
)
class OrganizationServiceViewset(ParentLookUpMixin, NestedViewSetMixin, ModelViewSet):
    http_method_names = ['get', 'patch']
    authentication_classes = (NxCloudOauthTokenAuthentication,)
    serializer_class = AvailableOrganizationServiceSerializer
    queryset = ServiceToOrganizationProperties.objects.all().order_by('created_ts')
    lookup_field = 'service_id'
    filter_backends = [DjangoFilterBackend]
    filterset_class = filters.CreatedTsAndNameFilter

    def get_queryset(self):
        _, organization_id = self.get_related_pair()
        ServiceToOrganizationProperties.create_missing(organization_id)
        return super().get_queryset()

    def get_permissions(self):
        perms = [IsAuthenticatedCloudUserOrSystem()]
        if self.action in ['retrieve', 'list']:
            perms.append(CanPerformChannelPartnerAction(ServiceToOrganizationProperties.can_access))
        if self.action == 'partial_update':
            perms.append(CanPerformChannelPartnerAction(ServiceToOrganizationProperties.can_manage))
        return perms


@extend_schema(
    tags=['Channel Partners - Channel Partners']
)
@extend_schema_view(
    list=extend_schema(summary='Get list of channel partners',
                       description='Return list of channel partners that the requesting user is a member of.'),
    create=extend_schema(summary='Create a new Channel Partner',
                         extensions={'x-permission': f'{ChannelPartner.permissions.add_remove_sub_channel_partners} for parentChannelPartner'}),
    retrieve=extend_schema(summary='Get a channel partner', description='Return a channel partner\'s details by id'),
    partial_update=extend_schema(summary='Update Channel Partner properties', description='Update Channel Partner properties', extensions={'x-permission': f'{ChannelPartner.permissions.add_remove_sub_channel_partners} for parentChannelPartner'}),
    service_changes_summary=extend_schema(summary='Get summary of service changes in a single period'),
    service_changes_history=extend_schema(summary='Get individual records of service changes in a single period')
)
class ChannelPartnerViewSet(ParentLookUpMixin, NestedViewSetMixin, ModelViewSet):
    http_method_names = ['get', 'post', 'patch']
    authentication_classes = (NxCloudOauthTokenAuthentication,)
    queryset = ChannelPartner.objects.order_by('created_ts')
    pagination_class = DefaultPagination
    filter_backends = [DjangoFilterBackend]
    filterset_class = filters.ChannelPartnerFilter

    def get_permissions(self):
        perms = [IsAuthenticatedCloudUserOrSystem()]
        if self.action == 'retrieve':
            perms.append(CanPerformChannelPartnerAction(ChannelPartner.can_access))
        if self.action in ('partial_update'):
            perms.append(CanPerformChannelPartnerAction(ChannelPartner.can_manage))
        if self.action in ('service_changes_history', 'service_changes_summary'):
            perms.append(CanPerformChannelPartnerAction(ChannelPartner.can_view_service_reports))
        return perms

    def get_serializer_class(self):
        if self.action == 'create':
            return CreateChannelPartnerSerializer
        else:
            return ChannelPartnerSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['channel_partner_to_user'] = ChannelPartnerToUser.objects.filter(user=self.request.user)
        return context

    def get_queryset(self):
        # common case with filtering by cloud_host
        query = Q(cloud_host=self.request.cloud_host, id__in=Subquery(
                ChannelPartnerToUser.objects.filter(user=self.request.user).values('channel_partner_id')))
        if self.action == 'retrieve':
            # LIC-278
            # If user is member of an organization, they should have read access to parent
            query |= Q(id__in=Subquery(
                OrganizationToUser.objects.filter(user=self.request.user).values('organization__channel_partner_id')))
        if self.detail:
            # LIC-277 Map channel partners to cloud host instead of cloud instance
            # If channel partner’s parent has no parent (so it is the direct child of root channel partner)
            #   and current user is member of root channel partner:
            # /channel_partners/{id} should work even if the request is coming from a different cloud host
            parent_channel_partners_query = (
                ChannelPartnerToUser.objects
                .filter(user=self.request.user, channel_partner__parent_channel_partner__isnull=True)
                .values('channel_partner')
            )
            query |= Q(parent_channel_partner__in=Subquery(parent_channel_partners_query))

        return self.queryset.filter(query)


    @extend_schema(request=CreateChannelPartnerSerializer, responses=ChannelPartnerSerializer)
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        parent_channel_partner = serializer.validated_data.get('parent_channel_partner')
        channeL_partner = serializer.save(cloud_host=parent_channel_partner.cloud_host)

        response_serializer = ChannelPartnerSerializer(channeL_partner, context={'request': request})
        return Response(response_serializer.data)

    @extend_schema(parameters=[ChannelPartnerRecordsParamSerializer],
                   responses=ChannelPartnerServiceRecordSerializer(many=True),
                   extensions={'x-permission': f'{ChannelPartner.permissions.view_service_reports} for Organization'})
    @action(methods=['GET'], detail=True, pagination_class=DefaultPagination)
    def service_changes_history(self, request, pk=None):
        channel_partner: ChannelPartner = self.get_object()
        param_serializer = ChannelPartnerRecordsParamSerializer(data=request.query_params)
        param_serializer.is_valid(raise_exception=True)
        start_ts = param_serializer.validated_data.get('startTs')
        service_changes = channel_partner.service_changes(start_ts).select_related('created_by')
        context = self.get_serializer_context()
        context['channel_partner'] = channel_partner
        return paginated_response(self, service_changes, serializer_class=ChannelPartnerServiceRecordSerializer,
                                  serializer_context=context)

    @extend_schema(parameters=[ChannelPartnerRecordsParamSerializer],
                   responses=ChannelPartnerServiceSummarySerializer(many=True),
                   extensions={'x-permission': f'{ChannelPartner.permissions.view_service_reports} for Organization'})
    @action(methods=['GET'], detail=True, pagination_class=DefaultPagination)
    def service_changes_summary(self, request, pk=None):
        channel_partner: ChannelPartner = self.get_object()
        param_serializer = ChannelPartnerRecordsParamSerializer(data=request.query_params)
        param_serializer.is_valid(raise_exception=True)
        start_ts = param_serializer.validated_data.get('startTs')
        service_changes = channel_partner.service_changes_summary(start_ts)
        return paginated_response(self, service_changes, serializer_class=ChannelPartnerServiceSummarySerializer)

    @extend_schema(summary='Get aggregated usage data.',
                   methods=['GET'],
                   responses=ChannelPartnerAggDataSerializer,
                   extensions={'x-permission': f'{ChannelPartner.permissions.view_service_reports} for Organization'})
    @action(methods=['get'], detail=True)
    def aggregate(self, request, pk=None):
        serializer = ChannelPartnerAggDataSerializer(instance=self.get_object())
        return Response(serializer.data)


@extend_schema(
    tags=['Channel Partners - Organizations'],
    summary='Get a list of organizations belonging to a Channel Partner'
)
class OrganizationNesetedViewSet(NestedViewSetMixin, mixins.ListModelMixin, ParentLookUpMixin, GenericViewSet):
    http_method_names = ['get']
    serializer_class = OrganizationSerializer
    authentication_classes = (NxCloudOauthTokenAuthentication,)
    queryset = Organization.objects.all().order_by('created_ts').select_related('channel_partner')
    pagination_class = DefaultPagination
    filter_backends = [DjangoFilterBackend]
    filterset_class = filters.OrganizationFilter

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['organizations_to_user'] = OrganizationToUser.objects.filter(user=self.request.user)
        return context

    def get_permissions(self):
        return IsAuthenticated(), CanPerformChannelPartnerAction(ChannelPartner.can_access)

    def check_permissions(self, request):
        super().check_permissions(request)
        m2m_key, val = self.get_related_pair()
        channel_partner = get_object_or_404(ChannelPartner, pk=val)
        self.check_object_permissions(request, channel_partner)

    def get_queryset(self):
        return super().get_queryset().filter(channel_partner__cloud_host=self.request.cloud_host)


@extend_schema(
    tags=['Channel Partners - Organizations'],
)
@extend_schema_view(
    list=extend_schema(summary='Get list of user\'s Organizations'),
    retrieve=extend_schema(summary='Get an Organization'),
    create=extend_schema(summary='Create an Organization', extensions={'x-permission': f'{ChannelPartner.permissions.add_remove_organizations} for channelPartner'}),
    partial_update=extend_schema(summary='Update properties of an Organization', extensions={'x-permission': f'{ChannelPartner.permissions.add_remove_organizations} for channelPartner'}),
    service_changes_history=extend_schema()
)
class OrganizationViewSet(ParentLookUpMixin, NestedViewSetMixin, ModelViewSet):
    http_method_names = ['get', 'post', 'patch']
    authentication_classes = (NxCloudOauthTokenAuthentication,)
    permission_classes = (IsAuthenticated,)
    queryset = Organization.objects.all().order_by('created_ts').select_related('channel_partner')
    pagination_class = DefaultPagination
    filter_backends = [DjangoFilterBackend]
    filterset_class = filters.OrganizationFilter

    def get_serializer_class(self):
        if self.action == 'create':
            return CreateOrganizationSerializer
        else:
            return OrganizationSerializer

    def get_serializer_context(self):
        # todo. remove when access matrix is ready
        context = super().get_serializer_context()
        context['organizations_to_user'] = OrganizationToUser.objects.filter(user=self.request.user,
                                                                             system_group_id__isnull=True)
        context['channel_partner_to_user'] = ChannelPartnerToUser.objects.filter(user=self.request.user)
        return context

    def get_permissions(self):
        perms = [IsAuthenticatedCloudUserOrSystem()]
        if self.action == 'retrieve':
            perms.append(CanPerformChannelPartnerAction(Organization.can_access))
        if self.action in ('update'):
            perms.append(CanPerformChannelPartnerAction(Organization.can_manage))
        if self.action in ('service_changes_history',):
            perms.append(CanPerformChannelPartnerAction(Organization.can_view_service_reports))
        if self.action == 'groups_structure':
            perms.append(CanPerformChannelPartnerAction(Organization.can_access))
        return perms

    def get_queryset(self):
        if self.detail:
            return self.queryset.filter(channel_partner__cloud_host=self.request.cloud_host)
        else:
            return self.queryset.filter(channel_partner__cloud_host=self.request.cloud_host, users=self.request.user)

    @extend_schema(request=CreateOrganizationSerializer, responses=OrganizationSerializer)
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        organization = serializer.save()

        response_serializer = OrganizationSerializer(organization, context={'request': request})
        return Response(response_serializer.data)

    @extend_schema(parameters=[ChannelPartnerRecordsParamSerializer],
        responses=OrganizationServiceRecordSerializer(many=True),
                   extensions={'x-permission': f'{Organization.permissions.view_service_reports} for Organization'})
    @action(methods=['GET'], detail=True)
    def service_changes_history(self, request, pk=None):
        org: Organization = self.get_object()
        param_serializer = ChannelPartnerRecordsParamSerializer(data=request.query_params)
        param_serializer.is_valid(raise_exception=True)
        start_ts = param_serializer.validated_data.get('startTs')
        service_changes = org.service_changes(start_ts).select_related('service', 'created_by', 'cloud_system')
        return paginated_response(self, service_changes, serializer_class=OrganizationServiceRecordSerializer)

    @extend_schema(parameters=[ChannelPartnerRecordsParamSerializer],
                   responses=ChannelPartnerServiceSummarySerializer(many=True),
                   extensions={'x-permission': f'{Organization.permissions.view_service_reports} for Organization'})
    @action(methods=['GET'], detail=True)
    def service_changes_summary(self, request, pk=None):
        org: Organization = self.get_object()
        param_serializer = ChannelPartnerRecordsParamSerializer(data=request.query_params)
        param_serializer.is_valid(raise_exception=True)
        start_ts = param_serializer.validated_data.get('startTs')
        service_changes = org.service_changes_summary(start_ts)
        return paginated_response(self, service_changes, serializer_class=ChannelPartnerServiceSummarySerializer)

    @extend_schema(summary='Get aggregated usage data.',
                   methods=['GET'],
                   responses=OrganizationAggDataSerializer,
                   extensions={'x-permission': f'{Organization.permissions.view_service_reports} for Organization'})
    @action(methods=['get'], detail=True)
    def aggregate(self, request, pk=None):
        serializer = OrganizationAggDataSerializer(instance=self.get_object())
        return Response(serializer.data)

    @extend_schema(summary='Get groups structure of organization (that currrent user can access)',
                   methods=['GET'],
                   responses=GroupsStructureSerializer,
                   extensions={'x-permission': f'{Organization.permissions.manage_systems} for Organization'})
    @action(methods=['get'], detail=True)
    def groups_structure(self, request, pk=None):
        organization: Organization = self.get_object()
        serializer = GroupsStructureSerializer(data=organization.get_groups_structure_for_user(request.user), many=True)
        serializer.is_valid()
        return Response(serializer.data)


@extend_schema(tags=['Channel Partners - Organization Users'])
@extend_schema_view(
    list=extend_schema(summary='Get list of users belonging to an organization',
                       description='Return a list of users for an organization id', extensions={'x-permission': f'{Organization.permissions.manage_users} for Organization'}),
    retrieve=extend_schema(summary='Get a user of an organization',
                           description='Get a user of an organization by id', extensions={'x-permission': f'{Organization.permissions.manage_users} for Organization'}),
    create=extend_schema(summary='Add/update user of an organization', extensions={'x-permission': f'{Organization.permissions.manage_users} for Organization'}),
    destroy=extend_schema(summary='Remove a user from an organization', extensions={'x-permission': f'{Organization.permissions.manage_users} for Organization'})
)
class OrganizationUserViewSet(ParentLookUpMixin, NestedViewSetMixin, ModelViewSet):
    authentication_classes = (NxCloudOauthTokenAuthentication,)
    serializer_class = OrganizationUserSerializer
    http_method_names = ['get', 'delete', 'post']
    lookup_field = 'email'
    lookup_value_regex = '[^/]*'
    lookup_url_kwarg = 'email'
    queryset = CloudUser.objects.all().prefetch_related(Prefetch('organizationtouser_set', queryset=OrganizationToUser.objects.all(), to_attr='organization_relations')).distinct()
    filter_backends = [DjangoFilterBackend]
    filterset_class = filters.UserFilter
    _organization = None

    def get_queryset(self):
        organization = self.get_organization()
        return self.queryset.filter(organizations=organization)

    def get_permissions(self):
        perms = [IsAuthenticated()]
        if self.action in ('create', 'list', 'destroy', 'retrieve', 'bulk_delete'):
            perms.append(CanPerformChannelPartnerAction(Organization.can_manage_users))
        return perms

    def get_serializer_context(self):
        context = super().get_serializer_context()
        if self.detail:
            context['organization'] = self.get_organization()
        return context

    @extend_schema(summary='Get user record for the current user', methods=['GET'])
    @action(methods=['get'], detail=False)
    def self(self, request, *args, **kwargs):
        self.kwargs['email'] = request.user.email
        return self.retrieve(request, *args, **kwargs)

    def get_organization(self):
        if self._organization:
            return self._organization
        m2m_key, val = self.get_related_pair()
        self._organization = get_object_or_404(Organization, pk=val)
        return self._organization

    def check_permissions(self, request):
        super().check_permissions(request)
        if self.action == 'list':
            self.check_object_permissions(request, None)

    def check_object_permissions(self, request, obj):
        if self.action == 'retrieve' and self.kwargs.get('email', '').lower() == request.user.email.lower():
            return
        organization = self.get_organization()
        return super().check_object_permissions(request, obj=organization)

    # Only create a user if it does not exist, otherwise just sets the relevant group it belongs to
    def create(self, request, *args, **kwargs):
        organization = self.get_organization()
        self.check_object_permissions(request, organization)
        serializer = self.get_serializer(data=request.data, context=self.get_serializer_context())
        serializer.is_valid(raise_exception=True)
        serializer.save(organization=organization)
        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        instance: CloudUser = self.get_object()
        organization = self.get_organization()
        org_admin_qs = OrganizationToUser.objects.filter(
            organization=organization,
            roles__contains=[OrganizationRoles.ORGANIZATION_ADMINISTRATOR]
        )
        if not org_admin_qs.exists() or org_admin_qs.exclude(user=instance).exists():
            return super().destroy(request, *args, **kwargs)
        raise Conflict(f'User {instance.email} is the only Administrator and may not be demoted or removed.')

    @extend_schema(summary='Remove multiple users form an organization.',
                   methods=['post'],
                   request=serializers.ListSerializer(child=serializers.EmailField()),
                   extensions={'x-permission': f'{ChannelPartner.permissions.manage_users} for Organization'})
    @action(name='bulk_delete', methods=['post'], detail=False)
    def bulk_delete(self, request, *args, **kwargs):
        organization = self.get_organization()
        self.check_object_permissions(request, obj=organization)
        serializer = serializers.ListSerializer(
            data=request.data,
            child=serializers.EmailField()
        )
        serializer.is_valid(raise_exception=True)
        org_admin_qs = OrganizationToUser.objects.filter(
            organization=organization,
            roles__contains=[OrganizationRoles.ORGANIZATION_ADMINISTRATOR]
        )
        if org_admin_qs.exists() and not org_admin_qs.exclude(user__email__in=serializer.validated_data).exists():
            raise Conflict(f'You are trying to remove all organization administrators.')

        OrganizationToUser.objects.filter(
            organization=organization, user__email__in=serializer.validated_data).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @extend_schema(summary='Remove a user form multiple groups belonging to an organization.',
                   methods=['post'],
                   request=serializers.ListSerializer(child=serializers.UUIDField()),
                   extensions={'x-permission': f'{ChannelPartner.permissions.manage_users} for Organization'})
    @action(name='remove_groups', methods=['post'], detail=True)
    def remove_groups(self, request, *args, **kwargs):
        organization = self.get_organization()
        self.check_object_permissions(request, obj=organization)
        user = self.get_object()
        serializer = serializers.ListSerializer(
            data=request.data,
            child=serializers.UUIDField()
        )
        serializer.is_valid(raise_exception=True)

        OrganizationToUser.objects.filter(
            organization=organization, system_group_id__in=serializer.validated_data, user=user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(
    tags=['Channel Partners - Systems'],
    summary='Get list of Systems for an Organization',
    extensions={'x-permission': f'{Organization.permissions.access_systems} for Organization'},
    parameters=[
        OpenApiParameter('rootOnly', OpenApiTypes.BOOL, default=False)
    ]
)
class CloudSystemNestedViewSet(ParentLookUpMixin, NestedViewSetMixin, mixins.ListModelMixin, GenericViewSet):
    http_method_names = ['get']
    serializer_class = CloudSystemSerializer
    authentication_classes = (NxCloudOauthTokenAuthentication,)
    queryset = CloudSystemId.objects.all().order_by('created_ts')
    pagination_class = DefaultPagination
    filter_backends = [DjangoFilterBackend]
    filterset_class = filters.CreatedTsAndIdAndNameFilter

    def get_queryset(self):
        root_only = self.request.query_params.get('rootOnly', False)
        if root_only:
            return super().get_queryset().filter(organization__channel_partner__cloud_host=self.request.cloud_host, activated=True, system_group=None)
        return super().get_queryset().filter(organization__channel_partner__cloud_host=self.request.cloud_host, activated=True)

    def get_permissions(self):
        return IsAuthenticated(), CanPerformChannelPartnerAction(Organization.can_access_systems)

    def check_permissions(self, request):
        super().check_permissions(request)
        m2m_key, val = self.get_related_pair()
        organization = get_object_or_404(Organization, pk=val)
        self.check_object_permissions(request, organization)


@extend_schema_view(
    # list=extend_schema(summary='Get list of user\'s Systems'),
    retrieve=extend_schema(summary='Get a Group', extensions={'x-permission': f'Membership in organization, ancestor group, or the group itself'}),
    create=extend_schema(summary='Create a group', extensions={'x-permission': f'{Organization.permissions.manage_systems} for Organization'}),
    partial_update=extend_schema(summary='Update a group', extensions={'x-permission': f'{Organization.permissions.manage_systems} for Organization'}),
    destroy=extend_schema(summary='Update a group', extensions={'x-permission': f'{Organization.permissions.manage_systems} for Organization'}),
)
@extend_schema(tags=['Groups'])
class SystemGroupViewSet(NestedViewSetMixin,
                         mixins.CreateModelMixin,
                         mixins.RetrieveModelMixin,
                         mixins.UpdateModelMixin,
                         # mixins.ListModelMixin,
                         GenericViewSet):
    http_method_names = ['get', 'post', 'patch']
    serializer_class = GroupSerializer
    authentication_classes = (NxCloudOauthTokenAuthentication,)
    # pagination_class = DefaultPagination
    queryset = SystemGroup.objects.all()
    # filter_backends = [DjangoFilterBackend]
    # filterset_class = filters.CreatedTsAndIdAndNameFilter

    def get_queryset(self):
        return super().get_queryset().filter(
            organization_id__in=Subquery(
                OrganizationToUser.objects.filter(user=self.request.user).values('organization_id')
            )
        )

    def get_permissions(self):
        perms = [IsAuthenticated()]
        if self.action == 'retrieve':
            perms.append(CanPerformChannelPartnerAction(SystemGroup.can_access))

        if self.action in ('update', 'partial_update', 'destroy'):
            perms.append(CanPerformChannelPartnerAction(SystemGroup.can_manage))
        return perms

    @extend_schema(request=CreateGroupSerializer, responses=GroupSerializer)
    def create(self, request, *args, **kwargs):
        serializer = CreateGroupSerializer(data=request.data, context=self.get_serializer_context())
        serializer.is_valid(raise_exception=True)
        system_group = serializer.save()
        response_serializer = GroupSerializer(system_group)
        return Response(response_serializer.data)

@extend_schema(tags=['Group - Groups Users'])
@extend_schema_view(
    list=extend_schema(summary='Get list of users belonging to a group',
                       description='Return a list of users for a group id', extensions={'x-permission': f'{Organization.permissions.manage_users} for Organization'}),
    retrieve=extend_schema(summary='Get a user of a group',
                           description='Get a user by group id and email', extensions={'x-permission': f'{Organization.permissions.manage_users} for Organization'}),
    create=extend_schema(summary='Add/update user of a group', extensions={'x-permission': f'{Organization.permissions.manage_users} for Organization'}),
    destroy=extend_schema(summary='Remove a user from a group', extensions={'x-permission': f'{Organization.permissions.manage_users} for Organization'})
)
class SystemGroupUserViewSet(ParentLookUpMixin,
                             NestedViewSetMixin,
                             mixins.CreateModelMixin,
                             mixins.RetrieveModelMixin,
                             mixins.ListModelMixin,
                             mixins.DestroyModelMixin,
                             GenericViewSet):
    http_method_names = ['get', 'post']
    serializer_class = SystemGroupUserSerializer
    authentication_classes = (NxCloudOauthTokenAuthentication,)
    lookup_field = 'user__email'
    lookup_value_regex = '[^/]*'
    lookup_url_kwarg = 'email'
    queryset = OrganizationToUser.objects.filter(system_group__isnull=False).order_by('created_ts')
    _system_group = None

    def get_system_group(self):
        if self._system_group:
            return self._system_group
        m2m_key, val = self.get_related_pair()
        self._system_group = get_object_or_404(SystemGroup, pk=val)
        return self._system_group

    def get_queryset(self):
        system_group = self.get_system_group()
        queryset = self.queryset.filter(organization=system_group.organization,
                                        system_group=system_group)
        return queryset

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['group'] = self.get_system_group()
        return context

    def get_permissions(self):
        return IsAuthenticated(), CanPerformChannelPartnerAction(SystemGroup.can_manage)

    def check_permissions(self, request):
        super().check_permissions(request)
        self.check_object_permissions(request, self.get_system_group())

    @extend_schema(summary='Remove multiple users form a group.',
                   methods=['post'],
                   request=serializers.ListSerializer(child=serializers.EmailField()),
                   extensions={'x-permission': f'{Organization.permissions.manage_users} for Organization'})
    @action(name='bulk_delete', methods=['post'], detail=False)
    def bulk_delete(self, request, *args, **kwargs):
        self.check_object_permissions()
        serializer = serializers.ListSerializer(
            data=request.data,
            child=serializers.EmailField()
        )
        serializer.is_valid(raise_exception=True)
        self.get_queryset().filter(user__email__in=request.data).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema_view(
    list=extend_schema(summary='Get list of user\'s Systems'),
    retrieve=extend_schema(summary='Get a System', extensions={'x-permission': f'{Organization.permissions.access_systems} for Organization'}),
    create=extend_schema(summary='Bind a local system to an Organization', extensions={'x-permission': f'{Organization.permissions.manage_systems} for Organization'}),
    bind_existing=extend_schema(summary='Bind an existing cloud system to an Organization', extensions={'x-permission': f'{Organization.permissions.manage_systems} for Organization'}),
)
@extend_schema(tags=['Channel Partners - Systems'])
class CloudSystemViewSet(NestedViewSetMixin,
                         mixins.CreateModelMixin,
                         mixins.RetrieveModelMixin,
                         mixins.UpdateModelMixin,
                         mixins.ListModelMixin,
                         GenericViewSet):
    http_method_names = ['get', 'post', 'patch']
    serializer_class = CloudSystemSerializer
    authentication_classes = (NxCloudSystemBasicAuthentication, NxCloudOauthTokenAuthentication)
    pagination_class = DefaultPagination
    queryset = CloudSystemId.objects.all().order_by('created_ts')
    filter_backends = [DjangoFilterBackend]
    filterset_class = filters.CreatedTsAndIdAndNameFilter
    lookup_field = 'system_id'
    lookup_url_kwarg = 'id'

    @staticmethod
    def get_service_quantity_lock(obj):
        return f'views-locks-cloud_system-service_quantity-{obj.id}'

    def get_queryset(self):
        if self.detail:
            return self.queryset.filter(cloud_host=self.request.cloud_host)
        else:
            return self.queryset.filter(cloud_host=self.request.cloud_host, organization__users=self.request.user, activated=True)

    def get_serializer_class(self):
        if self.action == 'create':
            return BindLocalSystemSerializer
        elif self.action == 'bind_existing':
            return CreateSystemSerializer
        else:
            return CloudSystemSerializer

    def get_permissions(self):
        if self.action == 'system_usage_report':
            return [IsAuthenticatedSystem(system_id_kwarg=self.lookup_field)]
        perms = [IsAuthenticatedCloudUserOrSystem()]
        if self.action in ('retrieve', 'services', 'saas_report'):
            perms.append(CanPerformChannelPartnerAction(CloudSystemId.can_access, system_allowed=True, direct_access_allowed=True))
        if self.action == 'service_quantity':
            if self.request.method == 'PATCH':
                perms.append(CanPerformChannelPartnerAction(CloudSystemId.can_set_services))
            if self.request.method == 'GET':
                perms.append(CanPerformChannelPartnerAction(CloudSystemId.can_access, direct_access_allowed=True))
        return perms

    @extend_schema(auth=[{'Cloud Oauth Token': []}], request=BindLocalSystemSerializer, responses=SystemBindResponseSerializer)
    def create(self, request, *args, **kwargs):
        serializer: BindLocalSystemSerializer = self.get_serializer(data={**request.data})
        serializer.is_valid(raise_exception=True)
        system_reponse, status_code = serializer.bind_system()
        if status_code < 300:
            serializer.save(cloud_host=request.cloud_host, system_id=system_reponse['id'])
        return Response(system_reponse, status=status_code)

    @extend_schema(auth=[{'Cloud Oauth Token': []}], request=CreateSystemSerializer, responses=CloudSystemSerializer)
    @action(methods=['post'], detail=False)
    def bind_existing(self, request, *args, **kwargs):
        serializer = self.get_serializer(data={**request.data})
        serializer.is_valid(raise_exception=True)
        system = serializer.save(cloud_host=request.cloud_host)

        response_serializer = CloudSystemSerializer(system)
        return Response(response_serializer.data)

    @extend_schema(responses=SaaSReportSerializer, extensions={'x-permission': f'{Organization.permissions.access_systems} for Organization'})
    @action(methods=['GET'], detail=True)
    def saas_report(self, request, system_id):
        system: CloudSystemId = self.get_object()
        serializer = SaaSReportSerializer(system)
        return Response(serializer.data)

    @extend_schema(summary='Get service quantities for a System', methods=['GET'],
                   extensions={'x-permission': f'{Organization.permissions.access_systems} for Organization'})
    @extend_schema(summary='Set service quantities for a System', methods=['PATCH'],
                   responses={'200': SystemServiceQuantitySerializer,
                              '429': ErrorMessageSerializer,
                              '400': ErrorMessageSerializer},
                   extensions={'x-permission': f'{ChannelPartner.permissions.add_remove_service_quantities} for Organization\'s Channel Partner'})
    @extend_schema(auth=[{'Cloud Oauth Token': []}], request=SystemServiceQuantitySerializer,
                   responses=SystemServiceQuantitySerializer)
    @action(methods=['get', 'patch'], detail=True)
    def service_quantity(self, request, id):
        system: CloudSystemId = self.get_object()
        if request.method == 'GET':
            serializer = SystemServiceQuantitySerializer(system)
            return Response(serializer.data)
        elif request.method == 'PATCH':
            return self.update_service_quantity(request, system=system)

    def update_service_quantity(self, request, system):
        lock_val = f'{uuid4()}'
        if not caches['default'].add(self.get_service_quantity_lock(system), lock_val, timeout=60):
            wait = 0
            while caches['default'].get(self.get_service_quantity_lock(system)):
                sleep(0.2)
                if (wait := wait + 0.2) >= VIEW_LOCK_WAIT_TIME:
                    return Response(data={"message": f"System {system.system_id} service "
                                                     f"quantity was being modified during request."},
                                    status=429, headers={'Retry-After': 2})
            return self.update_service_quantity(request, system=system)
        serializer = SystemServiceQuantitySerializer(system, data=request.data)
        if serializer.is_valid(raise_exception=False):
            serializer.save(user=request.user)
            caches['default'].delete(self.get_service_quantity_lock(system))
        else:
            caches['default'].delete(self.get_service_quantity_lock(system))
            serializer.is_valid(raise_exception=True)
        return Response(serializer.data)

    @extend_schema(responses=ServiceSerializer, extensions={'x-permission': f'{Organization.permissions.access_systems} for Organization'})
    @action(methods=['get'], detail=True)
    def services(self, request, id):
        system: CloudSystemId = self.get_object()
        services = system.organization.all_services
        serializer = ServiceSerializer(services, many=True)
        return Response(serializer.data)

    @extend_schema(request=SystemUsageReportSerializer, responses=SystemUsageReportSerializer)
    @action(methods=['post'], detail=True)
    def system_usage_report(self, request, id):
        serializer = SystemUsageReportSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save_security_metrics(cloud_system=request.cloud_system)
        return Response(serializer.data)


@extend_schema(
    tags=['Channel Partners - Services Management']
)
class ServiceRecordsViewSet(ParentLookUpMixin, NestedViewSetMixin, ModelViewSet):
    http_method_names = ['get']


@extend_schema(
    parameters=[ChannelPartnerEventParamSerializer],
    responses=ChannelPartnerEventSerializer(many=True),
    description='Events related to channel partners',
    summary='Events related to channel partners',
    tags=['Internal']
)
@api_view(['GET'])
@authentication_classes([NxTokenAuthentication])
@permission_classes([IsAuthenticated, IsInternalToken])
def partner_events(request):
    serializer = ChannelPartnerEventParamSerializer(data=request.query_params)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data
    limit = data['limit']

    event_records = ChannelPartnerEvent.objects.filter(
        id__gte=data['startId'],
    )
    cloud_host: CloudHost = data.get('cloudHost')
    if data.get('cloudHost'):
        event_records = event_records.filter(cloud_host=cloud_host)
    event_records = event_records.select_related('cloud_system', 'service'
    ).order_by('id')[:limit]

    return Response(ChannelPartnerEventSerializer(event_records, many=True).data)


@extend_schema(
    parameters=[ChannelPartnerAllServicesParamSerializer],
    responses=ServiceSerializer(many=True),
    description='All services for a particular cloud instance',
    summary='All services for a particular cloud instance',
    tags=['Internal'],
)
@api_view(['GET'])
@authentication_classes([NxTokenAuthentication])
@permission_classes([IsAuthenticated, IsInternalToken])
def all_services(request):
    serializer = ChannelPartnerAllServicesParamSerializer(data=request.query_params)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data

    cloud_host: CloudHost = data.get('cloudHost')
    services = ChannelPartnerService.objects.filter(created_by_channel_partner__cloud_host__instance=cloud_host.instance)

    return Response(ServiceSerializer(services, many=True).data)


@extend_schema(
    responses=SystemSerializer(many=True),
    description='All services for a particular cloud instance',
    summary='All services for a particular cloud instance',
    tags=['Internal'],
)
@api_view(['GET'])
@authentication_classes([NxTokenAuthentication])
@permission_classes([IsAuthenticated, IsInternalToken])
def user_systems(request, email):
    user: CloudUser = CloudUser.objects.filter(email__iexact=email).first()
    if not user:
        raise exceptions.NotFound('User not found')

    systems = user.all_systems()
    serializer = SystemSerializer(systems, many=True)
    return Response(serializer.data)


@extend_schema(
    responses=SystemUserSerializer,
    summary='Get a specific user for a system',
    tags=['Internal'],
)
@api_view(['GET'])
@authentication_classes([NxTokenAuthentication])
@permission_classes([IsAuthenticated, IsInternalToken])
def system_user(request, system_id, email):
    system = CloudSystemId.objects.filter(system_id=system_id).first()
    if not system:
        raise exceptions.NotFound('System not found')

    user_rel = system.get_user_role_by_email(email=email)
    if not user_rel:
        raise exceptions.NotFound('User not found in system')
    serializer = SystemUserSerializer(user_rel)

    return Response(serializer.data)


@extend_schema(
    responses=SystemUserSerializer(many=True),
    summary='Get users for a system',
    tags=['Internal'],
)
@api_view(['GET'])
@authentication_classes([NxTokenAuthentication])
@permission_classes([IsAuthenticated, IsInternalToken])
def system_users(request, system_id, email=None):
    system = CloudSystemId.objects.filter(system_id=system_id).first()
    if not system:
        raise exceptions.NotFound('System not found')
    all_user_role_rels = system.get_all_users()
    serializer = SystemUserSerializer(all_user_role_rels, many=True)
    return Response(serializer.data)


@extend_schema(
    responses=UserListSerializer,
    summary='Get all users that have access to some channel partner or organization',
    tags=['Internal'],
)
@api_view(['GET'])
@authentication_classes([NxTokenAuthentication])
@permission_classes([IsAuthenticated, IsInternalToken])
def all_org_users(request):
    users_dict = {
        'users': CloudUser.objects.filter(Q(organizations__isnull=False) | Q(channel_partners__isnull=False)).distinct().values_list('email', flat=True)
    }
    serializer = UserListSerializer(users_dict)
    return Response(serializer.data)

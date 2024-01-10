import structlog

from time import sleep
from typing import TypedDict, Tuple
from uuid import uuid4, UUID

import httpx
from django.core.cache import caches
from django.db.models import Subquery, Q
from django.http import HttpResponseForbidden
from django.shortcuts import get_object_or_404
from django.shortcuts import render
from django.utils.encoding import force_str
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema
from drf_spectacular.utils import extend_schema_view, OpenApiParameter
from rest_framework import status
from rest_framework.decorators import action, api_view, authentication_classes, permission_classes
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet, GenericViewSet, mixins
from rest_framework_extensions.mixins import NestedViewSetMixin

from nx_cloud_api_client.apis import CdbSystemAPIBase
from nx_cloud_api_client.client import NxCloudAPISyncClient
from partners import filters
from tools.exception import Conflict
from tools.nx_cloud_api_client_factory import NxCloudApiClientFactory
from tools.utils import paginated_response
from .authentication import NxCloudOauthTokenAuthentication, NxCloudSystemBasicAuthentication, NxTokenAuthentication
from .forms.grant_access_form import GrantAccessForm
from .models import ChannelPartnerRoles, GroupStructure
from .permissions import IsAuthenticatedCloudUserOrSystem, CanPerformChannelPartnerAction, IsAuthenticatedSystem, \
    IsInternalToken
from .serializers import *

VIEW_LOCK_WAIT_TIME = 2


logger = structlog.get_logger(__name__)


def grant_access(request):
    if not settings.DEBUG:
        return HttpResponseForbidden()

    form: GrantAccessForm = GrantAccessForm(request.POST or None)
    if request.method == 'POST' and form.is_valid():

        email: str = form.cleaned_data.get("email")
        hostname: str = request.cloud_host or 'cloud-test.hdw.mx'

        # internal_grant_access: InternalGrantAccess = InternalGrantAccess()
        result: InternalGrantAccessResult = InternalGrantAccess.process(email, hostname)

        context = {'form': form, **result}
        return render(request, 'grant_access.html', context)

    return render(request, 'grant_access.html', {'form': form})


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
    tags=['Channel Partner Users'], responses=ChannelPartnerRoleSerializer,
    summary='Get roles for Channel Partners',
    description='Returns list of available roles that can be assigned for a user of a Channel Partner'
)
@api_view(['GET'])
def channel_partner_roles(request):
    queryset = ChannelPartnerRole.objects.all().prefetch_related('permissions')
    serializer = ChannelPartnerRoleSerializer(queryset, many=True)
    return Response(serializer.data)


@extend_schema(
    tags=['Organization Users'], responses=OrganizationRoleSerializer(many=True),
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
    tags=['Channel Partner Users'],
    parameters=[OpenApiParameter('parent_lookup_channel_partner', location='path', type=OpenApiTypes.UUID, description='The primary key of the channel partner')]

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
    _channel_partner = None

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

    def get_channel_partner(self):
        if self._channel_partner:
            return self._channel_partner
        m2m_key, val = self.get_related_pair()
        self._channel_partner = get_object_or_404(ChannelPartner, pk=val)
        return self._channel_partner


    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['channel_partner'] = self.get_channel_partner()
        return context

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
            channel_partner = self.get_channel_partner()
            self.check_object_permissions(request, channel_partner)

    # Only create a user if it does not exist, otherwise just sets the relevant group it belongs to
    def create(self, request, *args, **kwargs):
        channel_partner = self.get_channel_partner()
        self.check_object_permissions(request, channel_partner)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
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
    tags=['Channel Partners'],
    summary='Get sub Channel Partners',
    description='Returns list of sub Channel Partners of a Channel Partner by id',
    parameters=[OpenApiParameter('parent_lookup_parent_channel_partner', location='path', type=OpenApiTypes.UUID)]
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
    tags=['Channel Partners External Ids'],
)
@extend_schema_view(
    create=extend_schema(summary='Create a new external id'),
    list=extend_schema(summary='Get all external ids for a channel partner'),
    retrieve=extend_schema(summary='Get details for a single external id'),
    destroy=extend_schema(summary='Delete an external id'),
    partial_update=extend_schema(summary='Update an external id partially'),
    update=extend_schema(summary='Update an external id fully')
)
class ChannelPartnerExternalIdViewset(ExternalIdBase, ModelViewSet):
    serializer_class = ChannelPartnerExternalIdSerializer
    queryset = ChannelPartnerExternalId.objects.all()
    filter_backends = [DjangoFilterBackend]
    filterset_class = filters.ExternalId


@extend_schema(
    tags=['Service External Ids'],
)
@extend_schema_view(
    create=extend_schema(summary='Create a new external id'),
    list=extend_schema(summary='Get all external ids for a cloud system'),
    retrieve=extend_schema(summary='Get details for a single external id'),
    destroy=extend_schema(summary='Delete an external id'),
    partial_update=extend_schema(summary='Update an external id partially'),
    update=extend_schema(summary='Update an external id fully')
)
class ChannelPartnerServiceExternalIdViewset(ExternalIdBase, ModelViewSet):
    serializer_class = ChannelPartnerServiceExternalIdSerializer
    queryset = ChannelPartnerServiceExternalId.objects.all()
    filter_backends = [DjangoFilterBackend]
    filterset_class = filters.ExternalId


@extend_schema(
    tags=['Organization External Ids'],
)
@extend_schema_view(
    create=extend_schema(summary='Create a new external id'),
    list=extend_schema(summary='Get all external ids for an organization'),
    retrieve=extend_schema(summary='Get details for a single external id'),
    destroy=extend_schema(summary='Delete an external id'),
    partial_update=extend_schema(summary='Update an external id partially'),
    update=extend_schema(summary='Update an external id fully')
)
class OrganizationrExternalIdViewset(ExternalIdBase, ModelViewSet):
    serializer_class = OrganizationExternalIdSerializer
    queryset = OrganizationExternalId.objects.all()
    filter_backends = [DjangoFilterBackend]
    filterset_class = filters.ExternalId


@extend_schema(
    tags=['Cloud System External Ids'],
)
@extend_schema_view(
    create=extend_schema(summary='Create a new external id'),
    list=extend_schema(summary='Get all external ids for a cloud system'),
    retrieve=extend_schema(summary='Get details for a single external id'),
    destroy=extend_schema(summary='Delete an external id'),
    partial_update=extend_schema(summary='Update an external id partially'),
    update=extend_schema(summary='Update an external id fully')
)
class CloudSystemExternalIdViewset(ExternalIdBase, ModelViewSet):
    serializer_class = CloudSystemIdExternalIdSerializer
    queryset = CloudSystemExternalId.objects.all().select_related('cloud_system')
    filter_backends = [DjangoFilterBackend]
    filterset_class = filters.ExternalId


@extend_schema(
    tags=['Service Management'],
    summary='Services that belong to channel partner queried',
    parameters=[OpenApiParameter('parent_lookup_created_by_channel_partner', location='path', type=OpenApiTypes.UUID)]
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
    tags=['Service Management'],
    summary='These are services that are available to inherit/extend from the parent Channel Partner including properties that are specific for each channel partner.',
    parameters=[OpenApiParameter('parent_lookup_channel_partner', location='path', type=OpenApiTypes.UUID)]
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
    tags=['Service Management'],
    summary='These are services that are available to this organization from its '
            'Channel Partner including properties that are specific to the organization',
    parameters=[OpenApiParameter(
        'parent_lookup_organization',
        location='path',
        type=OpenApiTypes.UUID)
    ]
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
    tags=['Channel Partners']
)
@extend_schema_view(
    list=extend_schema(summary='Get list of channel partners',
                       description='Return list of channel partners that the requesting user is a member of.'),
    create=extend_schema(summary='Create a new Channel Partner',
                         extensions={'x-permission': f'{ChannelPartner.permissions.add_remove_sub_channel_partners} for parentChannelPartner'}),
    retrieve=extend_schema(summary='Get a channel partner', description='Return a channel partner\'s details by id'),
    partial_update=extend_schema(summary='Update Channel Partner properties',
                                 description='Update Channel Partner properties',
                                 extensions={'x-permission': f'{ChannelPartner.permissions.configure_channel_partner} for parentChannelPartner'}),
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
            perms.append(CanPerformChannelPartnerAction(ChannelPartner.can_configure))
        if self.action in ('service_changes_history', 'service_changes_summary'):
            perms.append(CanPerformChannelPartnerAction(ChannelPartner.can_view_service_reports))
        if self.action in ('change_state', 'confirm_state'):
            perms.append(CanPerformChannelPartnerAction(ChannelPartner.can_alter_state))
        return perms

    def get_serializer_class(self):
        if self.action == 'create':
            return CreateChannelPartnerSerializer
        else:
            return ChannelPartnerSerializer

    def get_queryset(self):
        # common case with filtering by cloud_host and user's channel partners
        query = Q(cloud_host=self.request.cloud_host, id__in=Subquery(
                ChannelPartnerToUser.objects.filter(user=self.request.user).values('channel_partner_id')))
        # or channel partner is a direct child of user's channel partner
        query |= Q(cloud_host=self.request.cloud_host, parent_channel_partner_id__in=Subquery(
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
                .filter(user=self.request.user, channel_partner__parent_channel_partner_id__isnull=True)
                .values('channel_partner_id')
            )
            query |= Q(parent_channel_partner_id__in=Subquery(parent_channel_partners_query))
            return self.queryset.filter(query)
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
        end_ts = param_serializer.validated_data.get('endTs')
        service_changes = channel_partner.service_changes(start_ts, end_ts).select_related('created_by')
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
        end_ts = param_serializer.validated_data.get('startTs')
        service_changes = channel_partner.service_changes_summary(start_ts, end_ts)
        return paginated_response(self, service_changes, serializer_class=ChannelPartnerServiceSummarySerializer)

    @extend_schema(summary='Get aggregated usage data.',
                   methods=['GET'],
                   responses=ChannelPartnerAggDataSerializer,
                   extensions={'x-permission': f'{ChannelPartner.permissions.view_service_reports} for Organization'})
    @action(methods=['get'], detail=True)
    def aggregate(self, request, pk=None):
        serializer = ChannelPartnerAggDataSerializer(instance=self.get_object())
        return Response(serializer.data)

    @extend_schema(summary='Change state of Channel Partner',
                   methods=['POST'],
                   request=ChannelPartnerStateChangeSerializer(many=False),
                   responses=ChannelPartnerStateChangeSerializer(many=False),
                   extensions={
                       'x-permission': f'{ChannelPartner.permissions.alter_state_sub_channel_partners}'
                                       f' for parent Channel Partner'
                   })
    @action(methods=['post'], detail=True)
    def change_state(self, request, pk=None):
        partner = self.get_object()
        serializer = ChannelPartnerStateChangeSerializer(instance=partner, data=request.data,
                                                         context=self.get_serializer_context())
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    @extend_schema(summary='Confirm changing state of Channel Partner',
                   methods=['POST'],
                   request=ChannelPartnerStateConfirmationSerializer(many=False),
                   responses=ChannelPartnerStateConfirmationSerializer(many=False),
                   extensions={
                       'x-permission': f'{ChannelPartner.permissions.alter_state_sub_channel_partners}'
                                       f' for parent Channel Partner'
                   })
    @action(methods=['post'], detail=True)
    def confirm_state(self, request, pk=None):
        partner = self.get_object()
        serializer = ChannelPartnerStateConfirmationSerializer(instance=partner, data=request.data,
                                                               context=self.get_serializer_context())
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


@extend_schema(
    tags=['Organizations'],
    summary='Get a list of organizations belonging to a Channel Partner',
    parameters=[OpenApiParameter('parent_lookup_channel_partner', location='path', type=OpenApiTypes.UUID)]
)
class OrganizationNesetedViewSet(NestedViewSetMixin, mixins.ListModelMixin, ParentLookUpMixin, GenericViewSet):
    http_method_names = ['get']
    serializer_class = OrganizationSerializer
    authentication_classes = (NxCloudOauthTokenAuthentication,)
    queryset = Organization.objects.all().order_by('created_ts').select_related('channel_partner')
    pagination_class = DefaultPagination
    filter_backends = [DjangoFilterBackend]
    filterset_class = filters.OrganizationFilter

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
    tags=['Organizations'],
)
@extend_schema_view(
    list=extend_schema(summary='Get list of user\'s Organizations', parameters=[OrganizationQueryParamsSerializer]),
    retrieve=extend_schema(summary='Get an Organization'),
    create=extend_schema(summary='Create an Organization', extensions={'x-permission': f'{ChannelPartner.permissions.add_remove_organizations} for channelPartner'}),
    partial_update=extend_schema(summary='Update properties of an Organization', extensions={'x-permission': f'{Organization.permissions.configure_organization} for Organization'}),
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

    def get_permissions(self):
        perms = [IsAuthenticatedCloudUserOrSystem()]
        if self.action == 'retrieve':
            perms.append(CanPerformChannelPartnerAction(Organization.can_access))
        if self.action in ('update'):
            perms.append(CanPerformChannelPartnerAction(Organization.can_configure))
        if self.action in ('service_changes_history',):
            perms.append(CanPerformChannelPartnerAction(Organization.can_view_service_reports))
        if self.action == 'groups_structure':
            perms.append(CanPerformChannelPartnerAction(Organization.can_access))
        if self.action in ('change_state', 'confirm_state'):
            perms.append(CanPerformChannelPartnerAction(Organization.can_alter_state))
        return perms

    def get_queryset(self):
        if self.detail:
            return self.queryset.filter(channel_partner__cloud_host=self.request.cloud_host)
        param_serializer = OrganizationQueryParamsSerializer(data=self.request.query_params)
        param_serializer.is_valid(raise_exception=True)
        query = Q(channel_partner__cloud_host=self.request.cloud_host, users=self.request.user)
        if param_serializer.validated_data.get('includeChildOrgs'):
            query |= Q(channel_partner__channelpartnertouser__user=self.request.user)
        queryset = self.queryset.filter(query)
        return queryset

    @extend_schema(request=CreateOrganizationSerializer, responses=OrganizationSerializer)
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        organization = serializer.save()

        response_serializer = OrganizationSerializer(organization, context={'request': request})
        return Response(response_serializer.data)

    @extend_schema(parameters=[ChannelPartnerRecordsParamSerializer],
                   summary='Get individual records of service changes in a single period',
                   responses=OrganizationServiceRecordSerializer(many=True),
                   extensions={'x-permission': f'{Organization.permissions.view_service_reports} for Organization'})
    @action(methods=['GET'], detail=True)
    def service_changes_history(self, request, pk=None):
        org: Organization = self.get_object()
        param_serializer = ChannelPartnerRecordsParamSerializer(data=request.query_params)
        param_serializer.is_valid(raise_exception=True)
        start_ts = param_serializer.validated_data.get('startTs')
        end_ts = param_serializer.validated_data.get('endTs')
        service_changes = org.service_changes(start_ts, end_ts).select_related('service', 'created_by', 'cloud_system')
        return paginated_response(self, service_changes, serializer_class=OrganizationServiceRecordSerializer)

    @extend_schema(parameters=[ChannelPartnerRecordsParamSerializer],
                   summary='Get summary of service changes in a single period',
                   responses=ChannelPartnerServiceSummarySerializer(many=True),
                   extensions={'x-permission': f'{Organization.permissions.view_service_reports} for Organization'})
    @action(methods=['GET'], detail=True)
    def service_changes_summary(self, request, pk=None):
        org: Organization = self.get_object()
        param_serializer = ChannelPartnerRecordsParamSerializer(data=request.query_params)
        param_serializer.is_valid(raise_exception=True)
        start_ts = param_serializer.validated_data.get('startTs')
        end_ts = param_serializer.validated_data.get('endTs')
        service_changes = org.service_changes_summary(start_ts, end_ts)
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
        user_groups_structure: List[GroupStructure | None] = organization.get_groups_structure_for_user(request.user)
        serializer = GroupsStructureSerializer(data=user_groups_structure, many=True)
        serializer.is_valid()
        return Response(serializer.data)

    @extend_schema(summary='Change state of Organization',
                   methods=['POST'],
                   request=OrganizationStateChangeSerializer(many=False),
                   responses=OrganizationStateChangeSerializer(many=False),
                   extensions={
                       'x-permission': f'{ChannelPartner.permissions.alter_state_organizations}'
                                       f' for parent Channel Partner'
                   })
    @action(methods=['post'], detail=True)
    def change_state(self, request, pk=None):
        organization: Organization = self.get_object()
        serializer = OrganizationStateChangeSerializer(instance=organization, data=request.data,
                                                       context=self.get_serializer_context())
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    @extend_schema(summary='Confirm changing state of Organization',
                   methods=['POST'],
                   request=OrganizationStateConfirmationSerializer(many=False),
                   responses=OrganizationStateConfirmationSerializer(many=False),
                   extensions={
                       'x-permission': f'{ChannelPartner.permissions.alter_state_organizations}'
                                       f' for parent Channel Partner'
                   })
    @action(methods=['post'], detail=True)
    def confirm_state(self, request, pk=None):
        organization: Organization = self.get_object()
        serializer = OrganizationStateConfirmationSerializer(instance=organization, data=request.data,
                                                             context=self.get_serializer_context())
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


@extend_schema(
    tags=['Organization Users'],
    parameters=[OpenApiParameter('parent_lookup_organizations', location='path', type=OpenApiTypes.UUID)]
)
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
        serializer = self.get_serializer(data=request.data)
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
    tags=['Systems'],
    summary='Get list of Systems for an Organization',
    extensions={'x-permission': f'{Organization.permissions.access_systems} for Organization'},
    parameters=[
        OpenApiParameter('rootOnly', OpenApiTypes.BOOL, default=False),
        OpenApiParameter('parent_lookup_organization', location='path', type=OpenApiTypes.UUID)
    ]
)
class CloudSystemNestedViewSet(ParentLookUpMixin, NestedViewSetMixin, mixins.ListModelMixin, GenericViewSet):
    http_method_names = ['get']
    serializer_class = CloudSystemSerializer
    authentication_classes = (NxCloudOauthTokenAuthentication,)
    queryset = (CloudSystemId.objects.exclude(system_state=CloudSystemStates.DELETED)
                .order_by('created_ts').select_related('organization'))
    pagination_class = DefaultPagination
    filter_backends = [DjangoFilterBackend]
    filterset_class = filters.CreatedTsAndIdAndNameFilter

    def get_queryset(self):
        root_only = self.request.query_params.get('rootOnly', False)
        if root_only:
            return super().get_queryset().filter(
                organization__channel_partner__cloud_host=self.request.cloud_host,
                system_state=True, system_group=None
            )
        return super().get_queryset().filter(
            organization__channel_partner__cloud_host=self.request.cloud_host,
            system_state=True
        )

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
            Q(
                organization_id__in=Subquery(
                    OrganizationToUser.objects.filter(user=self.request.user)
                    .exclude(roles__isnull=True).exclude(roles=[]).values('organization_id')
                )
            ) | Q(
                organization__channel_partner_id__in=Subquery(
                    ChannelPartnerToUser.objects.filter(user=self.request.user)
                    .exclude(roles__isnull=True).exclude(roles=[]).values('channel_partner_id')
                )
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


@extend_schema(
    tags=['Group - Groups Users'],
    parameters=[OpenApiParameter('parent_lookup_system_group', location='path', type=OpenApiTypes.UUID)]
               )
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
        serializer = serializers.ListSerializer(
            data=request.data,
            child=serializers.EmailField()
        )
        serializer.is_valid(raise_exception=True)
        self.get_queryset().filter(user__email__in=request.data).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @extend_schema(summary='Return list of users with access to a group.',
                   methods=['get'],
                   responses=SystemGroupUserSerializer(many=True),
                   extensions={'x-permission': f'{Organization.permissions.manage_users} for Organization'})
    @action(name='can_access', methods=['get'], detail=False)
    def can_access(self, request, *args, **kwargs):
        system_group = self.get_system_group()
        queryset = (
            OrganizationToUser.objects.filter(organization_id=system_group.organization_id)
            .filter(Q(system_group__isnull=True) | Q(system_group_id__in=[*system_group.groups_path, system_group.id]))
            .select_related('organization', 'system_group').order_by('created_ts')
        )
        serializer = SystemGroupUserSerializer(queryset, many=True)
        return Response(serializer.data)


@extend_schema_view(
    list=extend_schema(summary='Get list of user\'s Systems', deprecated=True),
    retrieve=extend_schema(summary='Get a System', extensions={'x-permission': f'{Organization.permissions.access_systems} for Organization'}),
    create=extend_schema(summary='Bind a local system to an Organization', extensions={'x-permission': f'{Organization.permissions.manage_systems} for Organization'}),
    bind_existing=extend_schema(summary='Bind an existing cloud system to an Organization', extensions={'x-permission': f'{Organization.permissions.manage_systems} for Organization'}),
)
@extend_schema(tags=['Systems'])
class CloudSystemViewSet(NestedViewSetMixin,
                         mixins.CreateModelMixin,
                         mixins.RetrieveModelMixin,
                         mixins.UpdateModelMixin,
                         mixins.ListModelMixin,
                         mixins.DestroyModelMixin,
                         GenericViewSet):
    http_method_names = ['get', 'post', 'patch', 'delete']
    serializer_class = CloudSystemSerializer
    authentication_classes = (NxCloudSystemBasicAuthentication, NxCloudOauthTokenAuthentication)
    pagination_class = DefaultPagination
    queryset = CloudSystemId.objects.all().order_by('created_ts').select_related('organization')
    filter_backends = [DjangoFilterBackend]
    filterset_class = filters.CreatedTsAndIdAndNameFilter
    lookup_field = 'system_id'
    lookup_url_kwarg = 'id'

    @staticmethod
    def get_service_quantity_lock(obj):
        return f'views-locks-cloud_system-service_quantity-{obj.id}'

    @staticmethod
    def get_service_quantity_cache_key(obj):
        return f'views-cloud_system-service_quantity-{obj.id}'

    def get_queryset(self):
        if self.detail:
            return self.queryset.filter(cloud_host=self.request.cloud_host)
        else:
            return self.queryset.filter(cloud_host=self.request.cloud_host,
                                        organization__users=self.request.user,
                                        system_state=CloudSystemStates.ACTIVATED)

    def get_serializer_class(self):
        if self.action == 'create':
            return BindLocalSystemSerializer
        else:
            return CloudSystemSerializer

    def get_permissions(self):
        if self.action == 'system_usage_report':
            return [IsAuthenticatedSystem(system_id_kwarg=self.lookup_url_kwarg)]
        perms = [IsAuthenticatedCloudUserOrSystem()]
        if self.action in ('retrieve', 'services', 'saas_report'):
            perms.append(CanPerformChannelPartnerAction(CloudSystemId.can_access,
                                                        system_allowed=True, direct_access_allowed=True))
        if self.action == 'destroy':
            perms.append(CanPerformChannelPartnerAction(CloudSystemId.can_manage, system_allowed=True))
        if self.action == 'transfer_offer':
            perms.append(CanPerformChannelPartnerAction(Organization.can_manage_systems))
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
            serializer.save(cloud_host=request.cloud_host, system_id=system_reponse['id'],
                            system_state=CloudSystemStates.STATE_DICT[system_reponse['status']])
        return Response(system_reponse, status=status_code)

    def perform_destroy(self, instance: CloudSystemId):
        host: str = self.request.cloud_host.hostname
        auth_token: str = self.request.headers.get('Authorization')
        system_id: str = str(instance.system_id)

        headers = {'Authorization': auth_token}

        client: NxCloudAPISyncClient= NxCloudApiClientFactory.get_sync_client(host=host)
        systems_api: CdbSystemAPIBase = client.system
        ignored_errors: bool = False
        try:
            response: httpx.Response = systems_api.delete_system(
                system_id=system_id,
                headers=headers)
            if response.status_code in [502, 504]:
                logger.warning("Got server error. Error will be ignored.",
                               status_code=response.status_code,
                               response=response.text)
        except httpx.TransportError as ex:
            # ignoring transport errors, DecodingError and TooManyRedirects are still raised
            logger.warning("Got transport error.",
                           exception=ex)
            ignored_errors = True

        if ignored_errors or response.status_code in [200, 502, 504]:
            instance.system_state = CloudSystemStates.DELETED
            instance.save()
            return

        if response.headers.get('content-type') == 'application/json':
            detail = response.json()
        else:
            detail = response.text or 'A server error occurred.'
        exception = exceptions.APIException(detail=detail)
        exception.status_code = response.status_code
        raise exception

    @extend_schema(responses=SaaSReportSerializer,
                   summary='Get SaaS report',
                   description="Retrieves a SaaS report for a specific cloud system",
                   extensions={'x-permission': f'{Organization.permissions.access_systems} for Organization'})
    @action(methods=['GET'], detail=True)
    def saas_report(self, request, id):
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
            if not (data := caches['default'].get(self.get_service_quantity_cache_key(system))):
                serializer = SystemServiceQuantitySerializer(system)
                data = serializer.data
                caches['default'].set(self.get_service_quantity_cache_key(system), data, timeout=86400)
            return Response(data)
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
        data = serializer.data
        caches['default'].set(self.get_service_quantity_cache_key(system), data, timeout=86400)
        return Response(data)

    @extend_schema(responses=ServiceSerializer, extensions={'x-permission': f'{Organization.permissions.access_systems} for Organization'})
    @action(methods=['get'], detail=True)
    def services(self, request, id):
        system: CloudSystemId = self.get_object()
        services = system.organization.all_services
        serializer = ServiceSerializer(services, many=True)
        return Response(serializer.data)

    @extend_schema(
        summary='Submit a system usage report',
        request=SystemUsageReportSerializer,
        responses=SystemUsageReportSerializer)
    @action(methods=['post'], detail=True)
    def system_usage_report(self, request, id):
        serializer = SystemUsageReportSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        caches['default'].delete(self.get_service_quantity_cache_key(request.cloud_system))
        serializer.save_security_metrics(cloud_system=request.cloud_system)
        return Response(serializer.data)

    @extend_schema(
        request=SystemToOrgTransferSerializer,
        responses=SystemSerializer(many=False),
        extensions={'x-permission': f'{Organization.permissions.manage_systems} for Organization'})
    @action(methods=['post'], detail=True)
    def transfer_offer(self, request, id):
        ser = SystemToOrgTransferSerializer(data=request.data, context=self.get_serializer_context())
        ser.is_valid(raise_exception=True)
        self.check_object_permissions(request, ser.validated_data['organizationId'])
        system = ser.save(system_id=id)
        return Response(CloudSystemSerializer(system, context=self.get_serializer_context()).data)


@extend_schema(
    tags=['Services Management']
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
    event_records = event_records.select_related('cloud_system', 'service').order_by('id')[:limit]

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
    responses=SystemMembershipSerializer(many=True),
    description='Retrieves all systems associated with a specified user email',
    summary='Get Systems By User Email',
    tags=['Internal'],
)
@api_view(['GET'])
# TODO: CLOUD-11974
def user_systems(request, email):
    user: CloudUser = CloudUser.objects.filter(email__iexact=email).first()
    if not user:
        raise exceptions.NotFound('User not found')

    systems = user.systems_memberships()
    serializer = SystemMembershipSerializer(systems, many=True)
    return Response(serializer.data)


@extend_schema(
    responses=SystemUserSerializer,
    summary='Get a specific user for a system',
    tags=['Internal'],
)
@api_view(['GET'])
# TODO: CLOUD-11974
def system_user(request, system_id, email):
    system = CloudSystemId.objects.filter(system_id=system_id).select_related('organization').first()
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
# TODO: CLOUD-11974
def system_users(request, system_id, email=None):
    system = (CloudSystemId.objects.filter(system_id=system_id)
              .select_related('organization').first())
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
# TODO: CLOUD-11974
def all_org_users(request):
    users_dict = {
        'users': CloudUser.objects.filter(
            Q(organizations__isnull=False) |
            Q(channel_partners__isnull=False))
        .distinct().values_list('email', flat=True)
    }
    serializer = UserListSerializer(users_dict)
    return Response(serializer.data)


class InternalGrantAccessResult(TypedDict):
    nx_admin: CloudUser
    cp_admin: CloudUser
    org_admin: CloudUser
    nx_cp: ChannelPartner
    cp: ChannelPartner
    org: Organization


class InternalGrantAccess:
    """
    A class to handle granting access to internal users
    """
    @classmethod
    def process(cls, email: str, hostname: str) -> InternalGrantAccessResult:
        """
        Processes the granting of access for an internal user.
        """
        base_user: str = email.split("@")[0]

        cloud_host: CloudHost = CloudHost.objects.get(hostname=hostname)

        nx_admin, cp_admin, org_admin = cls.__get_cloud_users(base_user)
        nx_cp: ChannelPartner = cls.__get_root_channel_partner(cloud_host)
        cp, org = cls.__get_or_create_org_and_partners(nx_cp, base_user, cloud_host)

        cls.__apply_channel_partner_role(nx_admin, nx_cp)
        cls.__apply_channel_partner_role(cp_admin, cp)
        cls.__apply_organization_role(org_admin, org)

        return {
            'nx_admin': nx_admin,
            'cp_admin': cp_admin,
            'org_admin': org_admin,
            'nx_cp': nx_cp,
            'cp': cp,
            'org': org
        }

    @classmethod
    def __get_root_channel_partner(cls, cloud_host: CloudHost) -> ChannelPartner:
        """
        Gets the root channel partner for a given cloud host.
        """
        return ChannelPartner.objects.filter(parent_channel_partner__isnull=True, cloud_host=cloud_host).first()

    @classmethod
    def __get_or_create_org_and_partners(
            cls,
            host_root_cp: ChannelPartner,
            base_user: str,
            cloud_host: CloudHost
    ) -> Tuple['ChannelPartner', 'Organization']:
        """
        Gets or creates an organization and its associated channel partner for a given internal user.
        """
        # Channel Partner Stuff
        channel_partner_name: str = f"{base_user}'s Channel Partner"
        channel_partner: ChannelPartner
        cp_created: bool
        channel_partner, cp_created = ChannelPartner.objects.get_or_create(
            parent_channel_partner=host_root_cp,
            name=channel_partner_name,
            cloud_host=cloud_host)

        # Organization Stuff
        organization_name: str = f"{base_user}'s Organization"
        organization: Organization
        org_created: bool
        organization, org_created = Organization.objects.get_or_create(
            channel_partner=channel_partner,
            name=organization_name)

        return channel_partner, organization

    @classmethod
    def __apply_organization_role(cls, user: CloudUser, organization: Organization) -> OrganizationToUser:
        """
        Applies an organization role to a given internal user for a specific organization.
        """
        org_admin_role: List[UUID] = [OrganizationRoles.ORGANIZATION_ADMINISTRATOR]

        organization_user: OrganizationToUser = OrganizationToUser.objects.filter(
            user=user,
            organization=organization)

        if organization_user.exists():
            logger.info(
                "Found user and deleting from organization_to_user",
                email=user.email)
            organization_user.delete()

        return OrganizationToUser(
            user=user,
            organization=organization,
            roles=org_admin_role).save()

    @classmethod
    def __apply_channel_partner_role(cls, user: CloudUser, channel_partner: ChannelPartner) -> ChannelPartnerToUser:
        """
         Applies a channel partner role to a given internal user for a specific channel partner.
        """
        admin_role: List[UUID] = [ChannelPartnerRoles.ADMINISTRATOR]

        channel_partner_user: ChannelPartnerToUser = ChannelPartnerToUser.objects.filter(
            user=user,
            channel_partner=channel_partner)

        if channel_partner_user.exists():
            logger.info(
                "Found user and deleting from channel_partner_to_user",
                email=user.email)
            channel_partner_user.delete()

        return ChannelPartnerToUser(
            user=user,
            channel_partner=channel_partner,
            roles=admin_role).save()

    @classmethod
    def __get_cloud_users(cls, base_user: str) -> Tuple['CloudUser', 'CloudUser', 'CloudUser']:
        """
        Gets or creates three internal users with specific roles for a given username.
        """
        domain: str = "networkoptix.com"

        nx_admin, _ = CloudUser.objects.get_or_create(email=f'{base_user}+nxadmin@{domain}')
        cp_admin, _ = CloudUser.objects.get_or_create(email=f'{base_user}+cpadmin@{domain}')
        org_admin, _ = CloudUser.objects.get_or_create(email=f'{base_user}+orgadmin@{domain}')

        return nx_admin, cp_admin, org_admin

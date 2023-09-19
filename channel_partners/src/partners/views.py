from django.shortcuts import get_object_or_404
from drf_spectacular.openapi import OpenApiParameter, OpenApiTypes
from drf_spectacular.utils import extend_schema_view, inline_serializer
# from drf_spectacular.views import extend_schema


from rest_framework.decorators import action, api_view, authentication_classes, permission_classes
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet, GenericViewSet, mixins
from rest_framework.generics import ListAPIView
from rest_framework.mixins import RetrieveModelMixin
from rest_framework_extensions.mixins import NestedViewSetMixin

from tools.exception import Conflict
from .authentication import NxCloudOauthTokenAuthentication, NxCloudSystemBasicAuthentication, NxTokenAuthentication
from .permissions import IsAuthenticatedCloudUserOrSystem, CanPerformChannelPartnerAction, IsAuthenticatedSystem, IsInternalToken
from .serializers import *
# from channel_partners.utils import nx_extend_schema as extend_schema
from drf_spectacular.utils import extend_schema


class DefaultPagination(PageNumberPagination):
    page_size = 100
    page_size_query_param = 'page_size'
    max_page_size = 1000


@extend_schema(
    tags=['Channel Partners - Channel Partner Users'], responses=ChannelPartnerRoleSerializer,
    summary='Get roles for Channel Partners',
    description='Returns list of available roles that can be assigned for a user of a Channel Partner'
)
@api_view(['GET'])
def channel_partner_roles(request):
    serializer = ChannelPartnerRoleSerializer(ChannelPartnerRole.objects.all(), many=True)
    return Response(serializer.data)


@extend_schema(
    tags=['Channel Partners - Organization Users'], responses=OrganizationRoleSerializer,
    summary='Get roles for Organizations',
    description='Returns list of available roles that can be assigned for a user of an Organization'
)
@api_view(['GET'])
def organization_roles(request):
    serializer = OrganizationRoleSerializer(OrganizationRole.objects.all(), many=True)
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
    queryset = ChannelPartnerToUser.objects.all()

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
        if self.queryset.filter(channel_partner=instance.channel_partner, roles=["Administrator"])\
                .exclude(pk=instance.pk).exists():
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
    queryset = ChannelPartner.objects.all()
    pagination_class = DefaultPagination

    def get_queryset(self):
        return super().get_queryset().filter(instance=self.request.cloud_host.instance)

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
        return get_object_or_404(ChannelPartner, id=channel_partner_id, instance=self.request.cloud_host.instance, users=self.request.user)

    def get_queryset(self):
        channel_partner = self.get_channel_partner()
        return super().get_queryset().filter(
            created_by=channel_partner,
        )

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


@extend_schema(
    tags=['Channel Partners - Service External Ids'],
)
class ChannelPartnerServiceExternalIdViewset(ExternalIdBase, ModelViewSet):
    serializer_class = ChannelPartnerServiceExternalIdSerializer
    queryset = ChannelPartnerServiceExternalId.objects.all()


@extend_schema(
    tags=['Channel Partners - Organization External Ids'],
)
class OrganizationrExternalIdViewset(ExternalIdBase, ModelViewSet):
    serializer_class = OrganizationExternalIdSerializer
    queryset = OrganizationExternalId.objects.all()


@extend_schema(
    tags=['Channel Partners - Cloud System External Ids'],
)
class CloudSystemExternalIdViewset(ExternalIdBase, ModelViewSet):
    serializer_class = CloudSystemIdExternalIdSerializer
    queryset = CloudSystemExternalId.objects.all()


@extend_schema(
    tags=['Channel Partners - Service Management'],
    summary='Services that belong to channel partner queried'
)
class ChannelPartnerOwnedServiceViewset(NestedViewSetMixin, ModelViewSet):
    http_method_names = ['get']
    authentication_classes = (NxCloudOauthTokenAuthentication,)
    serializer_class = ServiceSerializer
    queryset = ChannelPartnerService.objects.all()

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
    queryset = ServiceToSubChannelProperties.objects.all()
    lookup_field = 'service_id'

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
    summary='These are services that are available to this organization from its Channel Partner including properties that are specific to the organization'
)
class OrganizationServiceViewset(ParentLookUpMixin, NestedViewSetMixin, ModelViewSet):
    http_method_names = ['get', 'patch']
    authentication_classes = (NxCloudOauthTokenAuthentication,)
    serializer_class = AvailableOrganizationServiceSerializer
    queryset = ServiceToOrganizationProperties.objects.all()
    lookup_field = 'service_id'

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
    destroy=extend_schema(summary='Remove a Channel Partner', extensions={'x-permission': f'{ChannelPartner.permissions.add_remove_sub_channel_partners} for parentChannelPartner'}),
    service_changes_summary=extend_schema(summary='Get summary of service changes in a single period'),
    service_changes_history=extend_schema(summary='Get individual records of service changes in a single period')
)
class ChannelPartnerViewSet(ParentLookUpMixin, NestedViewSetMixin, ModelViewSet):
    http_method_names = ['get', 'post', 'patch', 'delete']
    authentication_classes = (NxCloudOauthTokenAuthentication,)
    pagination_class = DefaultPagination

    def get_permissions(self):
        perms = [IsAuthenticatedCloudUserOrSystem()]
        if self.action == 'retrieve':
            perms.append(CanPerformChannelPartnerAction(ChannelPartner.can_access))
        if self.action in ('partial_update', 'destroy'):
            perms.append(CanPerformChannelPartnerAction(ChannelPartner.can_manage))
        if self.action in ('service_changes_history', 'service_changes_summary'):
            perms.append(CanPerformChannelPartnerAction(ChannelPartner.can_view_service_reports))
        return perms

    def get_serializer_class(self):
        if self.action == 'create':
            return CreateChannelPartnerSerializer
        else:
            return ChannelPartnerSerializer

    def get_queryset(self):
        if self.detail:
            return ChannelPartner.objects.filter(
                instance=self.request.cloud_host.instance
            )
        else:
            return ChannelPartner.objects.filter(
                instance=self.request.cloud_host.instance, users=self.request.user
            )

    @extend_schema(request=CreateChannelPartnerSerializer, responses=ChannelPartnerSerializer)
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        parent_channel_partner = serializer.validated_data.get('parent_channel_partner')
        channeL_partner = serializer.save(instance=parent_channel_partner.instance)

        response_serializer = ChannelPartnerSerializer(channeL_partner, context={'request': request})
        return Response(response_serializer.data)

    @extend_schema(parameters=[ChannelPartnerRecordsParamSerializer],
                   responses=ChannelPartnerServiceRecordSerializer(many=True),
                   extensions={'x-permission': f'{ChannelPartner.permissions.view_service_reports} for Organization'})
    @action(methods=['GET'], detail=True)
    def service_changes_history(self, request, pk=None):
        channel_partner: ChannelPartner = self.get_object()
        param_serializer = ChannelPartnerRecordsParamSerializer(data=request.query_params)
        param_serializer.is_valid(raise_exception=True)
        start_ts = param_serializer.validated_data.get('startTs')
        service_changes = channel_partner.service_changes(start_ts)
        serializer = ChannelPartnerServiceRecordSerializer(service_changes, many=True, channel_partner=channel_partner)
        return Response(serializer.data)

    @extend_schema(parameters=[ChannelPartnerRecordsParamSerializer],
                   responses=ChannelPartnerServiceSummarySerializer(many=True),
                   extensions={'x-permission': f'{ChannelPartner.permissions.view_service_reports} for Organization'})
    @action(methods=['GET'], detail=True)
    def service_changes_summary(self, request, pk=None):
        channel_partner: ChannelPartner = self.get_object()
        param_serializer = ChannelPartnerRecordsParamSerializer(data=request.query_params)
        param_serializer.is_valid(raise_exception=True)
        start_ts = param_serializer.validated_data.get('startTs')
        service_changes = channel_partner.service_changes_summary(start_ts)
        serializer = ChannelPartnerServiceSummarySerializer(service_changes, many=True)
        return Response(serializer.data)


@extend_schema(
    tags=['Channel Partners - Organizations'],
    summary='Get a list of organizations belonging to a Channel Partner'
)
class OrganizationNesetedViewSet(NestedViewSetMixin, mixins.ListModelMixin, ParentLookUpMixin, GenericViewSet):
    http_method_names = ['get']
    serializer_class = OrganizationSerializer
    authentication_classes = (NxCloudOauthTokenAuthentication,)
    queryset = Organization.objects.all()
    pagination_class = DefaultPagination

    def get_permissions(self):
        return IsAuthenticated(), CanPerformChannelPartnerAction(ChannelPartner.can_access)

    def check_permissions(self, request):
        super().check_permissions(request)
        m2m_key, val = self.get_related_pair()
        channel_partner = get_object_or_404(ChannelPartner, pk=val)
        self.check_object_permissions(request, channel_partner)

    def get_queryset(self):
        return super().get_queryset().filter(channel_partner__instance=self.request.cloud_host.instance)


@extend_schema(
    tags=['Channel Partners - Organizations'],
)
@extend_schema_view(
    list=extend_schema(summary='Get list of user\'s Organizations'),
    retrieve=extend_schema(summary='Get an Organization'),
    create=extend_schema(summary='Create an Organization', extensions={'x-permission': f'{ChannelPartner.permissions.add_remove_organizations} for channelPartner'}),
    partial_update=extend_schema(summary='Update properties of an Organization', extensions={'x-permission': f'{ChannelPartner.permissions.add_remove_organizations} for channelPartner'}),
    destroy=extend_schema(summary='Remove an Organization', extensions={'x-permission': f'{ChannelPartner.permissions.add_remove_organizations} for channelPartner'}),
    service_changes_history=extend_schema()
)
class OrganizationViewSet(ParentLookUpMixin, NestedViewSetMixin, ModelViewSet):
    http_method_names = ['get', 'post', 'patch', 'delete']
    authentication_classes = (NxCloudOauthTokenAuthentication,)
    permission_classes = (IsAuthenticated,)
    pagination_class = DefaultPagination

    def get_serializer_class(self):
        if self.action == 'create':
            return CreateOrganizationSerializer
        else:
            return OrganizationSerializer

    def get_permissions(self):
        perms = [IsAuthenticatedCloudUserOrSystem()]
        if self.action == 'retrieve':
            perms.append(CanPerformChannelPartnerAction(Organization.can_access))
        if self.action in ('update', 'destroy'):
            perms.append(CanPerformChannelPartnerAction(Organization.can_manage))
        if self.action in ('service_changes_history',):
            perms.append(CanPerformChannelPartnerAction(Organization.can_view_service_reports))
        return perms

    def get_queryset(self):
        if self.detail:
            return Organization.objects.filter(channel_partner__instance=self.request.cloud_host.instance)
        else:
            return Organization.objects.filter(channel_partner__instance=self.request.cloud_host.instance, users=self.request.user)

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
        service_changes = org.service_changes(start_ts).select_related('service', 'created_by')
        serializer = OrganizationServiceRecordSerializer(service_changes, many=True)
        return Response(serializer.data)

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
        serializer = ChannelPartnerServiceSummarySerializer(service_changes, many=True)
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
    http_method_names = ['get', 'post', 'delete']
    lookup_field = 'user__email'
    lookup_value_regex = '[^/]*'
    lookup_url_kwarg = 'email'
    queryset = OrganizationToUser.objects.all()

    def get_permissions(self):
        perms = [IsAuthenticated()]
        if self.action in ('create', 'list'):
            perms.append(CanPerformChannelPartnerAction(Organization.can_manage_users))
        if self.action in ('retrieve', 'destroy'):
            perms.append(CanPerformChannelPartnerAction(OrganizationToUser.can_manage))
        return perms

    @extend_schema(summary='Get user record for the current user', methods=['GET'])
    @action(methods=['get'], detail=False)
    def self(self, request, *args, **kwargs):
        self.kwargs['email'] = request.user.email
        return self.retrieve(request, *args, **kwargs)

    def check_permissions(self, request):
        super().check_permissions(request)
        if self.action == 'list':
            m2m_key, val = self.get_related_pair()
            organization = get_object_or_404(Organization, pk=val)
            self.check_object_permissions(request, organization)

    # Only create a user if it does not exist, otherwise just sets the relevant group it belongs to
    def create(self, request, *args, **kwargs):
        m2m_key, val = self.get_related_pair()
        organization = get_object_or_404(Organization, pk=val)
        self.check_object_permissions(request, organization)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(organization=organization)
        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if self.queryset.filter(organization=instance.organization, roles=["Organization Administrator"])\
                .exclude(pk=instance.pk).exists():
            data = instance.update_user_systems_data(None)
            make_batch_request(request, data)
            return super().destroy(request, *args, **kwargs)
        raise Conflict(f'User {instance.user.email} is the only Administrator and may not be demoted or removed.')


@extend_schema(
    tags=['Channel Partners - Systems'],
    summary='Get list of Systems for an Organization',
    extensions={'x-permission': f'{Organization.permissions.access_systems} for Organization'}
)
class CloudSystemNestedViewSet(ParentLookUpMixin, NestedViewSetMixin, mixins.ListModelMixin, GenericViewSet):
    http_method_names = ['get']
    serializer_class = CloudSystemSerializer
    authentication_classes = (NxCloudOauthTokenAuthentication,)
    queryset = CloudSystemId.objects.all()
    pagination_class = DefaultPagination

    def get_queryset(self):
        return super().get_queryset().filter(organization__channel_partner__instance=self.request.cloud_host.instance)

    def get_permissions(self):
        return IsAuthenticated(), CanPerformChannelPartnerAction(Organization.can_access_systems)

    def check_permissions(self, request):
        super().check_permissions(request)
        m2m_key, val = self.get_related_pair()
        organization = get_object_or_404(Organization, pk=val)
        self.check_object_permissions(request, organization)


@extend_schema_view(
    list=extend_schema(summary='Get list of user\'s Systems'),
    retrieve=extend_schema(summary='Get a System', extensions={'x-permission': f'{Organization.permissions.access_systems} for Organization'}),
    create=extend_schema(summary='Bind a System to an Organization', extensions={'x-permission': f'{Organization.permissions.manage_systems} for Organization'}),
    destroy=extend_schema(summary='Remove a system from an Organization',
                          auth=[{'Cloud Oauth Token': []}],  extensions={'x-permission': f'{Organization.permissions.manage_systems} for Organization'})
)
@extend_schema(tags=['Channel Partners - Systems'])
class CloudSystemViewSet(NestedViewSetMixin,
                         mixins.CreateModelMixin,
                         mixins.RetrieveModelMixin,
                         mixins.DestroyModelMixin,
                         mixins.ListModelMixin,
                         GenericViewSet):
    http_method_names = ['get', 'post', 'delete', 'patch']
    serializer_class = CloudSystemSerializer
    lookup_field = 'system_id'
    authentication_classes = (NxCloudSystemBasicAuthentication, NxCloudOauthTokenAuthentication)
    pagination_class = DefaultPagination

    def get_queryset(self):
        if self.detail:
            return CloudSystemId.objects.filter(cloud_host=self.request.cloud_host)
        else:
            return CloudSystemId.objects.filter(cloud_host=self.request.cloud_host, organization__users=self.request.user)

    def get_serializer_class(self):
        if self.action == 'create':
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
        if self.action == 'destroy':
            perms.append(CanPerformChannelPartnerAction(CloudSystemId.can_manage))
        return perms

    @extend_schema(auth=[{'Cloud Oauth Token': []}], request=CreateSystemSerializer, responses=CloudSystemSerializer)
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data={**request.data})
        serializer.is_valid(raise_exception=True)
        system = serializer.save(cloud_host=request.cloud_host)

        response_serializer = CloudSystemSerializer(system)
        return Response(response_serializer.data)

    def destroy(self, request, *args, **kwargs):
        data = self.get_object().remove_system_users_data(request.user)
        response = super().destroy(request, *args, **kwargs)
        make_batch_request(request, data)
        return response

    @extend_schema(responses=SaaSReportSerializer, extensions={'x-permission': f'{Organization.permissions.access_systems} for Organization'})
    @action(methods=['GET'], detail=True)
    def saas_report(self, request, system_id):
        system: CloudSystemId = self.get_object()
        serializer = SaaSReportSerializer(system)
        return Response(serializer.data)

    @extend_schema(summary='Get service quantities for a System', methods=['GET'], extensions={'x-permission': f'{Organization.permissions.access_systems} for Organization'})
    @extend_schema(summary='Set service quantities for a System', methods=['PATCH'], extensions={'x-permission': f'{ChannelPartner.permissions.add_remove_service_quantities} for Organization\'s Channel Partner'})
    @extend_schema(auth=[{'Cloud Oauth Token': []}], request=SystemServiceQuantitySerializer, responses=SystemServiceQuantitySerializer)
    @action(methods=['get', 'patch'], detail=True)
    def service_quantity(self, request, system_id):
        system: CloudSystemId = self.get_object()
        if request.method == 'GET':
            serializer = SystemServiceQuantitySerializer(system)
            return Response(serializer.data)
        elif request.method == 'PATCH':
            serializer = SystemServiceQuantitySerializer(system, data=request.data)
            serializer.is_valid(raise_exception=True)
            serializer.save(user=request.user)
            return Response(serializer.data)

    @extend_schema(responses=ServiceSerializer, extensions={'x-permission': f'{Organization.permissions.access_systems} for Organization'})
    @action(methods=['get'], detail=True)
    def services(self, request, system_id):
        system: CloudSystemId = self.get_object()
        services = system.organization.all_services
        serializer = ServiceSerializer(services, many=True)
        return Response(serializer.data)

    @extend_schema(request=SystemUsageReportSerializer, responses=SystemUsageReportSerializer)
    @action(methods=['post'], detail=True)
    def system_usage_report(self, request, system_id):
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
        event_records = event_records.filter(cloud_instance=cloud_host.instance)
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
    services = ChannelPartnerService.objects.filter(created_by_channel_partner__instance=cloud_host.instance)

    return Response(ServiceSerializer(services, many=True).data)




# @extend_schema(
#     tags=['Channel Partners']
# )
# class CloudSystemViewSet(ParentLookUpMixin, NestedViewSetMixin, ModelViewSet):
#     http_method_names = ['get', 'post', 'put', 'delete']
#     # queryset = CloudSystemId.objects.all()
#     serializer_class = CloudSystemSerializer
#     authentication_classes = (NxCloudOauthTokenAuthentication,)
#     permission_classes = (IsAuthenticated,)

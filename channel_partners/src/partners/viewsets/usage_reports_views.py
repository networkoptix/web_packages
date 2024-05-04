import datetime
from typing import (
    Any,
    Callable,
    List,
)

from django.urls import converters
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import (
    OpenApiParameter,
    extend_schema,
)
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.exceptions import (
    NotFound,
    PermissionDenied,
    ValidationError,
)
from rest_framework.generics import get_object_or_404
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet
from rest_framework_extensions.mixins import NestedViewSetMixin

from partners.authentication import NxCloudOauthTokenAuthentication
from partners.models import (
    ChannelPartner,
    ChannelPartnerService,
    CloudSystemId,
    Organization,
)
from partners.serialization.usage_reports_serializers import (
    ChannelPartnerExpiringServiceReportSerializer,
    ChannelPartnerServiceReportSerializer,
    ChannelPartnerUsageReportRecordSerializer,
    ChannelPartnerUsageSerializer,
    ExpiringUsageDetailRecordSerializer,
    OrganizationExpiringServiceReportSerializer,
    OrganizationServiceReportSerializer,
    OrganizationUsageReportRecordSerializer,
    OrganizationUsageSerializer,
    RegularUsageDetailRecordSerializer,
    ReportPeriodParamSerializer,
    SystemUsageSerializer,
)
from partners.services.usage_reports_service import (
    ChannelPartnerExpiringServiceReport,
    ChannelPartnerReportsService,
    CloudSystemReportsService,
    ExpiringUsageDetailRecord,
    OrganizationExpiringServiceReport,
    OrganizationRegularServiceReport,
    OrganizationReportsService,
    RegularUsageDetailRecord,
    ReportSnapshotDoesNotExists,
    SystemRegularUsage,
)
from partners.views import (
    DefaultPagination,
    ParentLookUpMixin,
)


class UsageReportsBaseViewSet(ParentLookUpMixin, NestedViewSetMixin, GenericViewSet):
    http_method_names = ['get']
    authentication_classes = (NxCloudOauthTokenAuthentication,)
    pagination_class = DefaultPagination
    permission_classes = (IsAuthenticated,)
    report_entity_model = None
    entity_kwarg = None
    lookup_url_kwarg = 'service_id'
    _entity = None

    def validate_service_sub_type(self, service):
        # Determine the service type based on the path
        if "regular_" in self.request.path or "expiring_" in self.request.path:
            service_type = "expiring" if "expiring_" in self.request.path else "regular"

            # Check if the service type is regular and the requested type is not REGULAR
            if service_type == "regular" and service.is_expiring:
                raise ValidationError("Can't generate regular report for expiring service")
            elif service_type == "expiring" and not service.is_expiring:
                raise ValidationError("Can't generate expiring report for regular service")

    def get_entity(self) -> Organization | ChannelPartner:
        if self._entity:
            return self._entity
        m2m_key, val = self.get_related_pair()
        self._entity = get_object_or_404(self.report_entity_model, pk=val)
        return self._entity

    def get_service(self) -> ChannelPartnerService:
        service_id = self.kwargs.get('service_id')
        if not service_id:
            raise NotFound()
        service = get_object_or_404(ChannelPartnerService, pk=service_id)
        self.validate_service_sub_type(service)
        return service

    def check_permissions(self, request) -> None:
        super().check_permissions(request)
        entity = self.get_entity()
        if not entity.can_view_service_reports(request.user):
            raise PermissionDenied(detail='You do not have permission to access this report.')

    def get_period_start(self) -> datetime.date:
        param_serializer = ReportPeriodParamSerializer(data=self.request.query_params)
        param_serializer.is_valid(raise_exception=True)
        return param_serializer.validated_data['periodStartDate']

    def get_service_report(self, report_func: Callable) -> Any:
        kwargs = {
            self.entity_kwarg: self.get_entity(),
            'service': self.get_service(),
            'period_start': self.get_period_start(),
        }
        try:
            report = report_func(**kwargs)
        except ReportSnapshotDoesNotExists:
            raise PermissionDenied(
                detail=f'Report has not been generated yet for requested date: {self.get_period_start()}.')
        return report


@extend_schema(
    tags=['Organization Reports'],
    summary='Organization usage reports.',
    parameters=[ReportPeriodParamSerializer,
                OpenApiParameter('parent_lookup_organization',
                                 location='path',
                                 type=OpenApiTypes.UUID,
                                 description='The primary key of the channel partner')],
    extensions={'x-permission': f'{ChannelPartner.permissions.view_service_reports} for Organization'}
)
class OrganizationServiceReportsViewSet(UsageReportsBaseViewSet):
    report_entity_model = Organization
    lookup_url_kwarg = 'service_id'
    entity_kwarg = 'organization'

    @extend_schema(
        summary='Get an organization usage report.',
        responses={'200': OrganizationUsageReportRecordSerializer(many=True)},
    )
    @action(
        detail=False,
        methods=['get'],
    )
    def usage_report(self, request, *args, **kwargs):
        entity = self.get_entity()
        try:
            report = OrganizationReportsService.get_organization_report(
                organization=entity,
                period_start=self.get_period_start())
        except ReportSnapshotDoesNotExists:
            raise PermissionDenied(
                detail=f'Report has not been generated yet for requested date: {self.get_period_start()}.')
        serializer = OrganizationUsageReportRecordSerializer(instance=report, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        summary='Get an organization systems report.',
        responses={'200': SystemUsageSerializer(many=True)},
        parameters=[OpenApiParameter('service_id',
                                     location='path',
                                     type=OpenApiTypes.UUID,
                                     description='The primary key of the service',
                                     required=False)],
    )
    @action(
        detail=True,
        methods=['get'],
    )
    def system_reports(self, request, *args, **kwargs):
        report: List[SystemRegularUsage] = self.get_service_report(
            OrganizationReportsService.get_regular_system_reports)
        serializer = SystemUsageSerializer(instance=report, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        summary='Get an organization regular detail table.',
        responses={'200': RegularUsageDetailRecordSerializer(many=True)},
        parameters=[OpenApiParameter('service_id',
                                     location='path',
                                     type=OpenApiTypes.UUID,
                                     description='The primary key of the service',
                                     required=False)],
    )
    @action(
        detail=True,
        methods=['get'],
    )
    def regular_detail_table(self, request, *args, **kwargs):
        report: List[RegularUsageDetailRecord] = self.get_service_report(
            OrganizationReportsService.get_regular_detail_table)
        serializer = RegularUsageDetailRecordSerializer(instance=report, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        summary='Get an organization expiring detail table.',
        responses={'200': ExpiringUsageDetailRecordSerializer(many=True)},
        parameters=[OpenApiParameter('service_id',
                                     location='path',
                                     type=OpenApiTypes.UUID,
                                     description='The primary key of the service',
                                     required=False)],
    )
    @action(
        detail=True,
        methods=['get'],
    )
    def expiring_detail_table(self, request, *args, **kwargs):
        report: List[ExpiringUsageDetailRecord] = self.get_service_report(
            OrganizationReportsService.get_expiring_detail_table)
        serializer = ExpiringUsageDetailRecordSerializer(instance=report, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        summary='Get an organization regular service report.',
        responses={'200': OrganizationServiceReportSerializer(many=False)},
        parameters=[OpenApiParameter('service_id',
                                     location='path',
                                     type=OpenApiTypes.UUID,
                                     description='The primary key of the service',
                                     required=False)],
    )
    @action(
        detail=True,
        methods=['get'],
    )
    def regular_service_report(self, request, *args, **kwargs):
        report: OrganizationRegularServiceReport = self.get_service_report(
            OrganizationReportsService.get_regular_service_report)
        serializer = OrganizationServiceReportSerializer(instance=report, many=False)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        summary='Get an organization expiring service report.',
        responses={'200': OrganizationExpiringServiceReportSerializer(many=False)},
        parameters=[OpenApiParameter('service_id',
                                     location='path',
                                     type=OpenApiTypes.UUID,
                                     description='The primary key of the service',
                                     required=False)],
    )
    @action(detail=True, methods=['get'], )
    def expiring_service_report(self, request, *args, **kwargs):
        report: OrganizationExpiringServiceReport = self.get_service_report(
            OrganizationReportsService.get_expiring_service_report)
        serializer = OrganizationExpiringServiceReportSerializer(instance=report, many=False)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        summary='Get an organization cloud system regular report.',
        responses={'200': RegularUsageDetailRecordSerializer(many=True)},
        parameters=[OpenApiParameter('service_id',
                                     location='path',
                                     type=OpenApiTypes.UUID,
                                     description='The primary key of the service',
                                     required=False)],
    )
    @action(
        detail=True,
        methods=['get'],
        url_path=rf'cloud_system/(?P<cloud_system_id>{converters.UUIDConverter.regex})/regular_detail_table',
    )
    def system_regular_detail_table(self, request, *args, **kwargs):
        entity = self.get_entity()
        service = self.get_service()
        cloud_system = get_object_or_404(CloudSystemId, system_id=kwargs.get('cloud_system_id'))
        try:
            report: List[RegularUsageDetailRecord] = CloudSystemReportsService.get_regular_report(
                cloud_system=cloud_system,
                organization=entity,
                service=service,
                period_start=self.get_period_start())
        except ReportSnapshotDoesNotExists:
            raise PermissionDenied(
                detail=f'Report has not been generated yet for requested date: {self.get_period_start()}.')
        serializer = RegularUsageDetailRecordSerializer(instance=report, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        summary='Get an organization cloud system expiring report.',
        responses={'200': ExpiringUsageDetailRecordSerializer(many=True)},
        parameters=[OpenApiParameter('service_id',
                                     location='path',
                                     type=OpenApiTypes.UUID,
                                     description='The primary key of the service',
                                     required=False)],
    )
    @action(
        detail=True,
        methods=['get'],
        url_path=rf'cloud_system/(?P<cloud_system_id>{converters.UUIDConverter.regex})/expiring_detail_table',
    )
    def system_expiring_detail_table(self, request, *args, **kwargs):
        entity = self.get_entity()
        service = self.get_service()
        cloud_system = get_object_or_404(CloudSystemId, system_id=kwargs.get('cloud_system_id'))
        try:
            report: List[ExpiringUsageDetailRecord] = CloudSystemReportsService.get_expiring_report(
                cloud_system=cloud_system,
                organization=entity,
                service=service,
                period_start=self.get_period_start())
        except ReportSnapshotDoesNotExists:
            raise PermissionDenied(
                detail=f'Report has not been generated yet for requested date: {self.get_period_start()}.')
        serializer = ExpiringUsageDetailRecordSerializer(instance=report, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


@extend_schema(
    tags=['Channel Partner Reports'],
    summary='Channel Partner usage reports.',
    parameters=[ReportPeriodParamSerializer,
                OpenApiParameter('parent_lookup_channel_partner',
                                 location='path',
                                 type=OpenApiTypes.UUID,
                                 description='The primary key of the channel partner')],
    extensions={'x-permission': f'{ChannelPartner.permissions.view_service_reports} for ChannelPartner'}
)
class ChannelPartnerServiceReportsViewSet(UsageReportsBaseViewSet):
    report_entity_model = ChannelPartner
    lookup_url_kwarg = 'service_id'
    entity_kwarg = 'channel_partner'

    @extend_schema(
        summary='Get a channel partner usage report.',
        responses={'200': ChannelPartnerUsageReportRecordSerializer(many=True)},
    )
    @action(
        detail=False,
        methods=['get'],
    )
    def usage_report(self, request, *args, **kwargs):
        entity = self.get_entity()
        try:
            report = ChannelPartnerReportsService.get_channel_partner_report(
                channel_partner=entity,
                period_start=self.get_period_start())
        except ReportSnapshotDoesNotExists:
            raise PermissionDenied(
                detail=f'Report has not been generated yet for requested date: {self.get_period_start()}.')
        serializer = ChannelPartnerUsageReportRecordSerializer(instance=report, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        summary="Get sub channel partners usages.",
        responses={'200': ChannelPartnerUsageSerializer(many=True)},
        parameters=[OpenApiParameter('service_id',
                                     location='path',
                                     type=OpenApiTypes.UUID,
                                     description='The primary key of the service',
                                     required=False)],
    )
    @action(
        detail=True,
        methods=['get'],
    )
    def channel_partner_usages(self, request, *args, **kwargs):
        report = self.get_service_report(ChannelPartnerReportsService.get_regular_channel_partner_usages)
        serializer = ChannelPartnerUsageSerializer(instance=report, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        summary='Get usages of child organizations.',
        responses={'200': OrganizationUsageSerializer(many=True)},
        parameters=[OpenApiParameter('service_id',
                                     location='path',
                                     type=OpenApiTypes.UUID,
                                     description='The primary key of the service',
                                     required=False)],
    )
    @action(
        detail=True,
        methods=['get'],
    )
    def organization_usages(self, request, *args, **kwargs):
        report = self.get_service_report(ChannelPartnerReportsService.get_regular_organization_usages)
        serializer = OrganizationUsageSerializer(instance=report, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        summary='Get channel partner regular detail table.',
        responses={'200': RegularUsageDetailRecordSerializer(many=True)},
        parameters=[OpenApiParameter('service_id',
                                     location='path',
                                     type=OpenApiTypes.UUID,
                                     description='The primary key of the service',
                                     required=False)],
    )
    @action(
        detail=True,
        methods=['get'],
    )
    def regular_detail_table(self, request, *args, **kwargs):
        report = self.get_service_report(ChannelPartnerReportsService.get_regular_detail_table)
        serializer = RegularUsageDetailRecordSerializer(instance=report, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        summary='Get channel partner expiring detail table.',
        responses={'200': ExpiringUsageDetailRecordSerializer(many=True)},
        parameters=[OpenApiParameter('service_id',
                                     location='path',
                                     type=OpenApiTypes.UUID,
                                     description='The primary key of the service',
                                     required=False)],
    )
    @action(
        detail=True,
        methods=['get'],
    )
    def expiring_detail_table(self, request, *args, **kwargs):
        report: List[ExpiringUsageDetailRecord] = self.get_service_report(
            ChannelPartnerReportsService.get_expiring_detail_table)
        serializer = ExpiringUsageDetailRecordSerializer(instance=report, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        summary='Get channel partner regular service report.',
        responses={'200': ChannelPartnerServiceReportSerializer(many=False)},
        parameters=[OpenApiParameter('service_id',
                                     location='path',
                                     type=OpenApiTypes.UUID,
                                     description='The primary key of the service',
                                     required=False)],
    )
    @action(
        detail=True,
        methods=['get'],
    )
    def regular_service_report(self, request, *args, **kwargs):
        report = self.get_service_report(ChannelPartnerReportsService.get_regular_service_report)
        serializer = ChannelPartnerServiceReportSerializer(instance=report, many=False)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        summary='Get channel partner expiring service report.',
        responses={'200': ChannelPartnerExpiringServiceReportSerializer(many=False)},
        parameters=[OpenApiParameter('service_id',
                                     location='path',
                                     type=OpenApiTypes.UUID,
                                     description='The primary key of the service',
                                     required=False)],
    )
    @action(detail=True, methods=['get'])
    def expiring_service_report(self, request, *args, **kwargs):
        report: ChannelPartnerExpiringServiceReport = self.get_service_report(
            ChannelPartnerReportsService.get_expiring_service_report)
        serializer = ChannelPartnerExpiringServiceReportSerializer(instance=report, many=False)
        return Response(serializer.data, status=status.HTTP_200_OK)

import datetime
from typing import (
    Any,
    Callable,
)

from django.urls import converters
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.exceptions import (
    NotFound,
    PermissionDenied,
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
    ChannelPartnerServiceReportSerializer,
    ChannelPartnerUsageReportRecordSerializer,
    ChannelPartnerUsageSerializer,
    OrganizationServiceReportSerializer,
    OrganizationUsageReportRecordSerializer,
    OrganizationUsageSerializer,
    RegularUsageDetailRecordSerializer,
    ReportPeriodParamSerializer,
    SystemUsageSerializer,
)
from partners.services.usage_reports_service import (
    ChannelPartnerReportsService,
    CloudSystemReportsService,
    OrganizationReportsService,
    ReportSnapshotDoesNotExists,
)
from partners.views import (
    DefaultPagination,
    ParentLookUpMixin,
)


class UsageReportsBaseViewSet(ParentLookUpMixin, NestedViewSetMixin, GenericViewSet):
    http_method_names = ['get']
    authentication_classes = (NxCloudOauthTokenAuthentication,)
    pagination_class = DefaultPagination
    permission_classes = (IsAuthenticated, )
    report_entity_model = None
    entity_kwarg = None
    lookup_url_kwarg = 'service_id'
    _entity = None

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
        return get_object_or_404(ChannelPartnerService, pk=service_id)

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
    parameters=[ReportPeriodParamSerializer],
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
    )
    @action(
        detail=True,
        methods=['get'],
    )
    def system_reports(self, request, *args, **kwargs):
        report = self.get_service_report(OrganizationReportsService.get_regular_system_reports)
        serializer = SystemUsageSerializer(instance=report, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        summary='Get an organization regular detail table.',
        responses={'200': RegularUsageDetailRecordSerializer(many=True)},
    )
    @action(
        detail=True,
        methods=['get'],
    )
    def regular_detail_table(self, request, *args, **kwargs):
        report = self.get_service_report(OrganizationReportsService.get_regular_detail_table)
        serializer = RegularUsageDetailRecordSerializer(instance=report, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        summary='Get an organization regular service report.',
        responses={'200': OrganizationServiceReportSerializer(many=False)},
    )
    @action(
        detail=True,
        methods=['get'],
    )
    def regular_service_report(self, request, *args, **kwargs):
        report = self.get_service_report(OrganizationReportsService.get_regular_service_report)
        serializer = OrganizationServiceReportSerializer(instance=report, many=False)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        summary='Get an organization cloud system regular report.',
        responses={'200': RegularUsageDetailRecordSerializer(many=True)},
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
            report = CloudSystemReportsService.get_regular_report(
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
    tags=['Channel Partner Reports'],
    summary='Channel Partner usage reports.',
    parameters=[ReportPeriodParamSerializer],
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
        summary='Get channel partner regular service report.',
        responses={'200': ChannelPartnerServiceReportSerializer(many=False)},
    )
    @action(
        detail=True,
        methods=['get'],
    )
    def regular_service_report(self, request, *args, **kwargs):
        report = self.get_service_report(ChannelPartnerReportsService.get_regular_service_report)
        serializer = ChannelPartnerServiceReportSerializer(instance=report, many=False)
        return Response(serializer.data, status=status.HTTP_200_OK)

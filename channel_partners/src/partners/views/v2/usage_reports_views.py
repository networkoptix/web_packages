import datetime
import uuid
from typing import (
    Any,
    Callable,
    List,
)

import structlog
from django.db.models import F
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

from partners.auth.token_auth import NxCloudOauthTokenAuthentication
from partners.models import (
    ChannelPartner,
    ChannelPartnerService,
    ChannelPartnerToUser,
    CloudSystemId,
    HierarchyLevels,
    Organization,
    OrganizationToUser,
)
from partners.serializers.v2.usage_reports_serializers import (
    ChannelPartnerExpiringServiceReportSerializer,
    ChannelPartnerReportExportSerializer,
    ChannelPartnerServiceReportSerializer,
    ChannelPartnerUsageReportRecordSerializer,
    ChannelPartnerUsageSerializer,
    ExpiringUsageDetailRecordSerializer,
    OrganizationExpiringServiceReportSerializer,
    OrganizationReportExportSerializer,
    OrganizationServiceReportSerializer,
    OrganizationUsageReportRecordSerializer,
    OrganizationUsageSerializer,
    RegularUsageDetailRecordSerializer,
    ReportExportParamSerializer,
    ReportPeriodParamSerializer,
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
)
from partners.tasks.constants import ReportTaskState
from partners.tasks.service_reports_export import (
    ReportType,
    get_report_result,
    get_service_changes_requests_key,
    get_usage_report_requests_key,
    start_report_generation,
)
from partners.views.v2.views import (
    DefaultPagination,
    ParentLookUpMixin,
)
from tools.helpers import get_path_from_parent
from tools.versioning.decorators import version_range
from tools.versioning.utils import Versions
from tools.versioning.views import VersionedViewMixin


logger = structlog.get_logger(__name__)


def get_hierarchy_level(entity, user) -> int | None:
    if isinstance(entity, Organization):
        if OrganizationToUser.objects.filter(organization=entity, user=user).exists():
            return HierarchyLevels.own
        entity = entity.channel_partner
    user_relation = (
        ChannelPartnerToUser.objects
        .filter(user=user, channel_partner_id__in=get_path_from_parent(entity))
        .annotate(path=F('channel_partner__path'))
        .order_by('-channel_partner__path__len').first()
    )
    if not user_relation:
        return None
    return len(entity.path or []) - len(user_relation.path or [])


class UsageReportsBaseViewSet(ParentLookUpMixin, NestedViewSetMixin, GenericViewSet):
    http_method_names = ['get', 'post']
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
            raise NotFound(
                detail=f'Report has not been generated yet for requested date: {self.get_period_start()}.')
        return report

    @staticmethod
    def get_report_result(report_id: str | uuid.UUID, user_id: int):
        result = get_report_result(
            report_id=str(report_id),
            user_id=user_id,
        )
        if result.get('status') != ReportTaskState.success:
            logger.info(
                "Report generation is not yet completed or failed.",
                report_id=result.get('id'),
                status=result.get('status', None),
                reason=result.get('reason',None))
        return result

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['hierarchy_level'] = get_hierarchy_level(self.get_entity(), self.request.user)
        if context['hierarchy_level'] is None:
            # It must be filtered in permissions check, but leave it to ensure the hierarchy level is set
            raise PermissionDenied(detail='You do not have permission to access this report.')
        return context


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
# Not caching export report id
# report timestamp compare can be done for all.
@version_range(Versions(min_version="v2"))
class OrganizationServiceReportsViewSet(VersionedViewMixin, UsageReportsBaseViewSet):
    report_entity_model = Organization
    lookup_url_kwarg = 'service_id'
    entity_kwarg = 'organization'
    serializer_class = OrganizationServiceReportSerializer

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
            raise NotFound(
                detail=f'Report has not been generated yet for requested date: {self.get_period_start()}.')
        serializer = OrganizationUsageReportRecordSerializer(
            instance=report, many=True, context=self.get_serializer_context())
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
        serializer = RegularUsageDetailRecordSerializer(
            instance=report, many=True, context=self.get_serializer_context())
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
        serializer = ExpiringUsageDetailRecordSerializer(
            instance=report, many=True, context=self.get_serializer_context())
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
        serializer = OrganizationServiceReportSerializer(
            instance=report, many=False, context=self.get_serializer_context())
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
        serializer = OrganizationExpiringServiceReportSerializer(
            instance=report, many=False, context=self.get_serializer_context())
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
            raise NotFound(
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
            raise NotFound(
                detail=f'Report has not been generated yet for requested date: {self.get_period_start()}.')
        serializer = ExpiringUsageDetailRecordSerializer(instance=report, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        summary='Get an organization usage report generation result.',
        responses={'200': OrganizationReportExportSerializer()},
    )
    @action(
        detail=False,
        methods=['get'],
        url_path=rf'usage_report/export/(?P<report_id>{converters.UUIDConverter.regex})',
    )
    def export_usage_report(self, request, report_id=None, **kwargs):
        organization = self.get_entity()
        result = self.get_report_result(report_id, request.user.id)
        result['organization_id'] = organization.id
        serializer = OrganizationReportExportSerializer(result)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        summary='Generate an organization usage report file.',
        parameters=[ReportExportParamSerializer],
        responses={'200': OrganizationReportExportSerializer()},
    )
    @action(
        detail=False,
        methods=['post'],
        url_path=r'usage_report/export',
    )
    def generate_report(self, request, *args, **kwargs):
        param_serializer = ReportExportParamSerializer(data=self.request.query_params)
        param_serializer.is_valid(raise_exception=True)
        period_start = param_serializer.validated_data['periodStartDate']
        report_format = param_serializer.validated_data['reportFormat']
        organization = self.get_entity()
        cache_key = get_usage_report_requests_key(
            entity_id=organization.id,
            period_start=period_start,
            user_id=request.user.id,
            report_format=report_format,
        )
        task_kwargs = dict(
            organization_id=str(organization.id),
            period_start=period_start.isoformat(),
            user_id=request.user.id,
            report_format=report_format,
            hierarchy_level=get_hierarchy_level(organization, request.user),
            report_type=ReportType.usage_report,
        )
        task = start_report_generation(cache_key, task_kwargs)
        return Response({'id': task.task_id, 'status': ReportTaskState.pending.value},
                        status=status.HTTP_200_OK)

    @extend_schema(
        summary='Generate an organization service changes report file.',
        parameters=[ReportExportParamSerializer],
        responses={'200': OrganizationReportExportSerializer()},
    )
    @action(
        detail=False,
        methods=['post'],
        url_path=r'service_changes_history/export',
    )
    def generate_service_changes_report(self, request, *args, **kwargs):
        param_serializer = ReportExportParamSerializer(data=self.request.query_params)
        param_serializer.is_valid(raise_exception=True)
        period_start = param_serializer.validated_data['periodStartDate']
        report_format = param_serializer.validated_data['reportFormat']
        organization = self.get_entity()
        cache_key = get_service_changes_requests_key(
            entity_id=organization.id,
            period_start=period_start,
            user_id=request.user.id,
            report_format=report_format,
        )
        task_kwargs = dict(
            organization_id=str(organization.id),
            period_start=period_start.isoformat(),
            user_id=request.user.id,
            report_format=report_format,
            hierarchy_level=get_hierarchy_level(organization, request.user),
            report_type=ReportType.service_changes_report,
        )
        task = start_report_generation(cache_key, task_kwargs)
        return Response({'id': task.task_id, 'status': ReportTaskState.pending.value},
                        status=status.HTTP_200_OK)

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
# Not caching
@version_range(Versions(min_version="v2"))
class ChannelPartnerServiceReportsViewSet(VersionedViewMixin, UsageReportsBaseViewSet):
    report_entity_model = ChannelPartner
    lookup_url_kwarg = 'service_id'
    entity_kwarg = 'channel_partner'
    serializer_class = ChannelPartnerServiceReportSerializer

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
            raise NotFound(
                detail=f'Report has not been generated yet for requested date: {self.get_period_start()}.')
        serializer = ChannelPartnerUsageReportRecordSerializer(
            instance=report, many=True, context=self.get_serializer_context())
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
        serializer = ChannelPartnerUsageSerializer(
            instance=report, many=True, context=self.get_serializer_context())
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
        serializer = OrganizationUsageSerializer(
            instance=report, many=True, context=self.get_serializer_context())
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
        serializer = RegularUsageDetailRecordSerializer(
            instance=report, many=True, context=self.get_serializer_context())
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
        serializer = ExpiringUsageDetailRecordSerializer(
            instance=report, many=True, context=self.get_serializer_context())
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
        serializer = ChannelPartnerServiceReportSerializer(
            instance=report, many=False, context=self.get_serializer_context())
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
        serializer = ChannelPartnerExpiringServiceReportSerializer(
            instance=report, many=False, context=self.get_serializer_context())
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        summary='Get an channel partner usage report generation result.',
        responses={'200': ChannelPartnerReportExportSerializer()},
    )
    @action(
        detail=False,
        methods=['get'],
        url_path=rf'usage_report/export/(?P<report_id>{converters.UUIDConverter.regex})',
    )
    def export_report(self, request, report_id=None, **kwargs):
        channel_partner = self.get_entity()
        result = self.get_report_result(report_id, request.user.id)
        result['channel_partner_id'] = channel_partner.id
        serializer = ChannelPartnerReportExportSerializer(result)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        summary='Generate an channel partner usage report file.',
        parameters=[ReportExportParamSerializer],
        responses={'200': ChannelPartnerReportExportSerializer()},
    )
    @action(
        detail=False,
        methods=['post'],
        url_path=r'usage_report/export',
    )
    def generate_report(self, request, *args, **kwargs):
        param_serializer = ReportExportParamSerializer(data=self.request.query_params)
        param_serializer.is_valid(raise_exception=True)
        period_start = param_serializer.validated_data['periodStartDate']
        report_format = param_serializer.validated_data['reportFormat']
        channel_partner = self.get_entity()
        cache_key = get_usage_report_requests_key(
            entity_id=channel_partner.id,
            period_start=period_start,
            user_id=request.user.id,
            report_format=report_format,
        )
        task_kwargs = dict(
            channel_partner_id=str(channel_partner.id),
            period_start=period_start.isoformat(),
            user_id=request.user.id,
            report_format=report_format,
            hierarchy_level=get_hierarchy_level(channel_partner, request.user),
            report_type=ReportType.usage_report
        )
        task = start_report_generation(cache_key, task_kwargs)
        return Response({'id': task.task_id, 'status': ReportTaskState.pending.value},
                        status=status.HTTP_200_OK)

    @extend_schema(
        summary='Generate an channel partner service changes report file.',
        parameters=[ReportExportParamSerializer],
        responses={'200': ChannelPartnerReportExportSerializer()},
    )
    @action(
        detail=False,
        methods=['post'],
        url_path=r'service_changes_history/export',
    )
    def generate_service_changes_report(self, request, *args, **kwargs):
        param_serializer = ReportExportParamSerializer(data=self.request.query_params)
        param_serializer.is_valid(raise_exception=True)
        period_start = param_serializer.validated_data['periodStartDate']
        report_format = param_serializer.validated_data['reportFormat']
        channel_partner = self.get_entity()
        cache_key = get_service_changes_requests_key(
            entity_id=channel_partner.id,
            period_start=period_start,
            user_id=request.user.id,
            report_format=report_format,
        )
        task_kwargs = dict(
            channel_partner_id=str(channel_partner.id),
            period_start=period_start.isoformat(),
            user_id=request.user.id,
            report_format=report_format,
            hierarchy_level=get_hierarchy_level(channel_partner, request.user),
            report_type=ReportType.service_changes_report
        )
        task = start_report_generation(cache_key, task_kwargs)
        return Response({'id': task.task_id, 'status': ReportTaskState.pending.value},
                        status=status.HTTP_200_OK)

import datetime
from concurrent.futures import (
    ThreadPoolExecutor,
    as_completed,
)
from functools import wraps
from typing import List
from uuid import uuid4

import structlog
from celery import shared_task
from dateutil.relativedelta import relativedelta
from django.conf import settings
from django.core.cache import (
    cache,
    caches,
)
from django.db import connection
from django.db.models import QuerySet
from django.utils import timezone

from partners.models import (
    ChannelPartner,
    ChannelPartnerService,
    CloudSystemId,
    Organization,
    ReportSnapshot,
)
from partners.services.usage_reports_service import (
    ChannelPartnerReportsService,
    CloudSystemReportsService,
    OrganizationReportsService,
)
from tools.helpers import get_today


logger = structlog.getLogger(__name__)

WORKERS_NUMBER = 4
TASK_LOCK_KEY = "report-calculation-daily"
REGEN_TASK_LOCK_KEY = "report-regeneration-daily"

def close_thread_db_connections(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        finally:

            connection.close()

    return wrapper


class DjangoDBPoolExecutor(ThreadPoolExecutor):

    def submit(self, fn, /, *args, **kwargs):
        fn = close_thread_db_connections(fn)
        return super().submit(fn, *args, **kwargs)


def calculate_system_reports(system, services, period_start):
    for service in services:
        if service.is_expiring:
            logger.debug(
                "Cloud System Report -- Getting Expiring Report",
                system=system.name,
                org=system.organization.name,
                service=service.name)
            CloudSystemReportsService.get_expiring_report(
                cloud_system=system,
                organization=system.organization,
                service=service,
                period_start=period_start,
                generate=True,
            )
        else:
            logger.debug(
                "Cloud System Report -- Getting Regular Report",
                system=system.name,
                org=system.organization.name,
                service=service.name)
            CloudSystemReportsService.get_regular_report(
                cloud_system=system,
                organization=system.organization,
                service=service,
                period_start=period_start,
                generate=True)


def calculate_organization_reports(
        organization: Organization,
        services: List[ChannelPartnerService],
        period_start: datetime.date
):
    for service in services:
        if service.is_expiring:
            logger.debug(
                "Organization Report -- Getting Expiring System Report",
                org=organization.name,
                service=service.name,
                period_start=period_start)
            OrganizationReportsService.get_expiring_system_reports(
                organization=organization,
                service=service,
                period_start=period_start,
                generate=True)
            logger.debug(
                "Organization Report -- Getting Expiring Service Report",
                org=organization.name,
                service=service.name,
                period_start=period_start)
            OrganizationReportsService.get_expiring_service_report(
                organization=organization,
                service=service,
                period_start=period_start,
                generate=True)
        else:
            logger.debug(
                "Organization Report -- Getting Regular System Report",
                org=organization.name,
                service=service.name,
                period_start=period_start)
            OrganizationReportsService.get_regular_system_reports(
                organization=organization,
                service=service,
                period_start=period_start,
                generate=True)
            logger.debug(
                "Organization Report -- Getting Regular Service Report",
                org=organization.name,
                service=service.name,
                period_start=period_start)
            OrganizationReportsService.get_regular_service_report(
                organization=organization,
                service=service,
                period_start=period_start,
                generate=True
            )
        # OrganizationReportsService.get_regular_detail_table(
        #     organization=organization,
        #     service=service,
        #     period_start=period_start,
        #     generate=True
        # )
    logger.debug(
        "Organization Report -- Getting Organization Report",
        org=organization.name,
        period_start=period_start)
    OrganizationReportsService.get_organization_report(
        organization=organization,
        period_start=period_start,
        generate=True
    )


def calculate_partner_reports(channel_partner: ChannelPartner, period_start: datetime.date):
    services = list(channel_partner.services.all())
    systems = (
        CloudSystemId.objects
        .filter(organization__channel_partner=channel_partner)
        .iterator(chunk_size=100)
    )
    # TODO. Remove that hack see CLOUD-13213. Testing is broken when used with django_db(transaction=true).
    if settings.TESTING:
        for system in systems:
            logger.debug(
                "Calculating reports for system",
                system=system.name,
                services=len(services),
                org=system.organization.name,
                period_start=period_start)
            calculate_system_reports(system, services, period_start)
        for organization in channel_partner.organizations.all():
            logger.debug(
                "Calculating reports for organization",
                org=organization.name,
                services=len(services),
                period_start=period_start)
            calculate_organization_reports(organization, services, period_start)
    else:
        with DjangoDBPoolExecutor(max_workers=WORKERS_NUMBER) as executor:
            futures = []
            for system in systems:
                futures.append(
                    executor.submit(calculate_system_reports, system, services, period_start))
            for future in as_completed(futures):
                # ensure there has been no exception
                future.result()

        with DjangoDBPoolExecutor(max_workers=WORKERS_NUMBER) as executor:
            futures = []
            for organization in channel_partner.organizations.all():
                futures.append(
                    executor.submit(calculate_organization_reports, organization, services, period_start))
            for future in as_completed(futures):
                future.result()
    for service in services:
        if service.is_expiring:
            logger.debug(
                "Channel Partner Report -- Getting Expiring Organization Usages",
                channel_partner=channel_partner.name,
                service=service.name,
                period_start=period_start)
            ChannelPartnerReportsService.get_expiring_organization_usages(
                channel_partner=channel_partner,
                service=service,
                period_start=period_start,
                generate=True)
            logger.debug(
                "Channel Partner Report -- Getting Expiring Channel Partner Usages",
                channel_partner=channel_partner.name,
                service=service.name,
                period_start=period_start)
            ChannelPartnerReportsService.get_expiring_channel_partner_usages(
                channel_partner=channel_partner,
                service=service,
                period_start=period_start,
                generate=True)
            logger.debug(
                "Channel Partner Report -- Getting Expiring Service Report",
                channel_partner=channel_partner.name,
                service=service.name,
                period_start=period_start)
            ChannelPartnerReportsService.get_expiring_service_report(
                channel_partner=channel_partner,
                service=service,
                period_start=period_start,
                generate=True)
            logger.debug(
                "Channel Partner Report -- Getting Expiring Detail Table",
                channel_partner=channel_partner.name,
                service=service.name,
                period_start=period_start)
            ChannelPartnerReportsService.get_expiring_detail_table(
                channel_partner=channel_partner,
                service=service,
                period_start=period_start,
                generate=True)
        else:
            logger.debug(
                "Channel Partner Report -- Getting Regular Organization Usages",
                channel_partner=channel_partner.name,
                service=service.name,
                period_start=period_start)
            ChannelPartnerReportsService.get_regular_organization_usages(
                channel_partner=channel_partner,
                service=service,
                period_start=period_start,
                generate=True)
            logger.debug(
                "Channel Partner Report -- Getting Regular Channel Partner Usages",
                channel_partner=channel_partner.name,
                service=service.name,
                period_start=period_start)
            ChannelPartnerReportsService.get_regular_channel_partner_usages(
                channel_partner=channel_partner,
                service=service,
                period_start=period_start,
                generate=True)
            logger.debug(
                "Channel Partner Report -- Getting Regular Service Report",
                channel_partner=channel_partner.name,
                service=service.name,
                period_start=period_start)
            ChannelPartnerReportsService.get_regular_service_report(
                channel_partner=channel_partner,
                service=service,
                period_start=period_start,
                generate=True)
        # ChannelPartnerReportsService.get_regular_detail_table(
        #     channel_partner=channel_partner,
        #     service=service,
        #     period_start=period_start,
        #     generate=True
        # )
    logger.debug(
        "Channel Partner Report -- Getting Channel Partner Report",
        channel_partner=channel_partner.name,
        period_start=period_start)
    ChannelPartnerReportsService.get_channel_partner_report(
        channel_partner=channel_partner,
        period_start=period_start,
        generate=True)


def regenerate_outdated_schema_reports(outdated_reports: QuerySet[ReportSnapshot] = None):
    if not outdated_reports.exists():
        logger.info("No outdated reports found")
        return
    logger.debug(f"Regenerating outdated reports.", reports_count=outdated_reports.count())
    for report in outdated_reports:
        # refresh report from db to check if it has not been updated by another process
        report.refresh_from_db()
        if not report.is_schema_version_outdated():
            continue
        if report.report_type in (ReportSnapshot.ReportType.system_regular_report,
                                  ReportSnapshot.ReportType.system_expiring_report):
            if not report.organization:
                # For some system reports organization is missed. these reports are broken
                # and should be removed because data is insufficient to regenerate them.
                # With high probability it would be regenerated within higher report such
                # as organization's one.
                logger.warning(
                    "Removing report due to missing organization",
                    report_id=report.id,
                    system_id=report.entity_id,
                    service_id=report.service_id,
                    report_type=report.report_type,
                )
                report.delete()
                continue
        match report.report_type:
            case ReportSnapshot.ReportType.system_regular_report:
                CloudSystemReportsService.get_regular_report(
                    cloud_system=CloudSystemId.objects.get(system_id=report.entity_id),
                    organization=report.organization,
                    service=report.service,
                    period_start=report.start_date,
                    generate=True
                )
            case ReportSnapshot.ReportType.system_expiring_report:
                CloudSystemReportsService.get_expiring_report(
                    cloud_system=CloudSystemId.objects.get(system_id=report.entity_id),
                    organization=report.organization,
                    service=report.service,
                    period_start=report.start_date,
                    generate=True
                )
            case ReportSnapshot.ReportType.organization_regular_systems_reports:
                OrganizationReportsService.get_regular_system_reports(
                    organization=Organization.objects.get(id=report.entity_id),
                    service=report.service,
                    period_start=report.start_date,
                    generate=True
                )
            case ReportSnapshot.ReportType.organization_expiring_systems_reports:
                OrganizationReportsService.get_expiring_system_reports(
                    organization=Organization.objects.get(id=report.entity_id),
                    service=report.service,
                    period_start=report.start_date,
                    generate=True
                )

            case ReportSnapshot.ReportType.organization_regular_service_report:
                OrganizationReportsService.get_regular_service_report(
                    organization=Organization.objects.get(id=report.entity_id),
                    service=report.service,
                    period_start=report.start_date,
                    generate=True
                )
            case ReportSnapshot.ReportType.organization_expiring_service_report:
                OrganizationReportsService.get_expiring_service_report(
                    organization=Organization.objects.get(id=report.entity_id),
                    service=report.service,
                    period_start=report.start_date,
                    generate=True
                )
            case ReportSnapshot.ReportType.organization_regular_detail_table:
                OrganizationReportsService.get_regular_detail_table(
                    organization=Organization.objects.get(id=report.entity_id),
                    service=report.service,
                    period_start=report.start_date,
                    generate=True
                )
            case ReportSnapshot.ReportType.organization_expiring_detail_table:
                OrganizationReportsService.get_expiring_detail_table(
                    organization=Organization.objects.get(id=report.entity_id),
                    service=report.service,
                    period_start=report.start_date,
                    generate=True
                )
            case ReportSnapshot.ReportType.organization_usage_report:
                OrganizationReportsService.get_organization_report(
                    organization=Organization.objects.get(id=report.entity_id),
                    period_start=report.start_date,
                    generate=True
                )
            case ReportSnapshot.ReportType.channel_partner_organization_regular_usages:
                ChannelPartnerReportsService.get_regular_organization_usages(
                    channel_partner=ChannelPartner.objects.get(id=report.entity_id),
                    service=report.service,
                    period_start=report.start_date,
                    generate=True
                )
            case ReportSnapshot.ReportType.channel_partner_organization_expiring_usages:
                ChannelPartnerReportsService.get_expiring_organization_usages(
                    channel_partner=ChannelPartner.objects.get(id=report.entity_id),
                    service=report.service,
                    period_start=report.start_date,
                    generate=True
                )
            case ReportSnapshot.ReportType.channel_partner_channel_partner_regular_usages:
                ChannelPartnerReportsService.get_regular_channel_partner_usages(
                    channel_partner=ChannelPartner.objects.get(id=report.entity_id),
                    service=report.service,
                    period_start=report.start_date,
                    generate=True
                )
            case ReportSnapshot.ReportType.channel_partner_channel_partner_expiring_usages:
                ChannelPartnerReportsService.get_expiring_channel_partner_usages(
                    channel_partner=ChannelPartner.objects.get(id=report.entity_id),
                    service=report.service,
                    period_start=report.start_date,
                    generate=True
                )
            case ReportSnapshot.ReportType.channel_partner_regular_detail_table:
                ChannelPartnerReportsService.get_regular_detail_table(
                    channel_partner=ChannelPartner.objects.get(id=report.entity_id),
                    service=report.service,
                    period_start=report.start_date,
                    generate=True
                )
            case ReportSnapshot.ReportType.channel_partner_expiring_detail_table:
                ChannelPartnerReportsService.get_expiring_detail_table(
                    channel_partner=ChannelPartner.objects.get(id=report.entity_id),
                    service=report.service,
                    period_start=report.start_date,
                    generate=True
                )
            case ReportSnapshot.ReportType.channel_partner_regular_service_report:
                ChannelPartnerReportsService.get_regular_service_report(
                    channel_partner=ChannelPartner.objects.get(id=report.entity_id),
                    service=report.service,
                    period_start=report.start_date,
                    generate=True
                )
            case ReportSnapshot.ReportType.channel_partner_expiring_service_report:
                ChannelPartnerReportsService.get_expiring_service_report(
                    channel_partner=ChannelPartner.objects.get(id=report.entity_id),
                    service=report.service,
                    period_start=report.start_date,
                    generate=True
                )
            case ReportSnapshot.ReportType.channel_partner_usage_report:
                ChannelPartnerReportsService.get_channel_partner_report(
                    channel_partner=ChannelPartner.objects.get(id=report.entity_id),
                    period_start=report.start_date,
                    generate=True
                )


@shared_task()
def regenerate_outdated_reports_task(batch_size: int = 500):
    # limiting the number of reports to regenerate to avoid long running tasks
    logger.info(f"Regenerating outdated reports.", batch_size=batch_size)
    outdated_reports = ReportSnapshot.get_outdated_schema_reports()
    outdated_reports = outdated_reports[:batch_size]
    regenerate_outdated_schema_reports(outdated_reports)
    if ReportSnapshot.get_outdated_schema_reports().exists():
        # if there are still outdated reports, schedule another task
        logger.info("Scheduling another task to regenerate more outdated reports.")
        regenerate_outdated_reports_task.delay(batch_size=batch_size)
    else:
        logger.info("All outdated reports have been regenerated.")
        cache.delete(REGEN_TASK_LOCK_KEY)


def calculate_all_reports():
    period_start = get_today() - relativedelta(days=1)
    period_start.replace(day=1)
    partners_list = ChannelPartner.objects.filter(path__isnull=False).order_by("-path__len")
    partners_list = list(partners_list) + list(ChannelPartner.objects.filter(path__isnull=True))
    for channel_partner in partners_list:
        logger.debug("Calculating reports for channel partner", channel_partner=channel_partner.name)
        calculate_partner_reports(channel_partner, period_start)


@shared_task(max_retries=3)
def report_daily_calculation_task():
    if not caches['default'].add(TASK_LOCK_KEY, f'{uuid4()}', timeout=3600):
        logger.warning(f'Daily calculation task is already running.')
        return
    try:
        calculate_all_reports()
        logger.info("All reports have been calculated.")
        logger.info("Checking for outdated reports.")
        if ReportSnapshot.get_outdated_schema_reports().exists():
            logger.info("Scheduling task to regenerate outdated reports.")
            if caches['default'].add(REGEN_TASK_LOCK_KEY, timezone.now().timestamp()):
                regenerate_outdated_reports_task.delay()
            else:
                logger.warning("Regeneration task is already running.")
        else:
            logger.info("No outdated reports found.")
    finally:
        cache.delete(TASK_LOCK_KEY)



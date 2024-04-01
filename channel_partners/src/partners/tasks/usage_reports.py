import datetime
from concurrent.futures import (
    ThreadPoolExecutor,
    as_completed,
)
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

from partners.models import (
    ChannelPartner,
    ChannelPartnerService,
    CloudSystemId,
    Organization,
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


def calculate_system_reports(system, services, period_start):
    for service in services:
        CloudSystemReportsService.get_regular_report(
            cloud_system=system,
            organization=system.organization,
            service=service,
            period_start=period_start,
            generate=True,
        )


def calculate_organization_reports(organization: Organization, services: List[ChannelPartnerService], period_start: datetime.date):
    for service in services:
        OrganizationReportsService.get_system_reports(
            organization=organization,
            service=service,
            period_start=period_start,
            generate=True
        )
        OrganizationReportsService.get_regular_service_report(
            organization=organization,
            service=service,
            period_start=period_start,
            generate=True
        )
        OrganizationReportsService.get_regular_detail_table(
            organization=organization,
            service=service,
            period_start=period_start,
            generate=True
        )
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
            calculate_system_reports(system, services, period_start)
        for organization in channel_partner.organizations.all():
            calculate_organization_reports(organization, services, period_start)
    else:
        with ThreadPoolExecutor(max_workers=WORKERS_NUMBER) as executor:
            futures = []
            for system in systems:
                futures.append(
                    executor.submit(calculate_system_reports, system, services, period_start))
            for future in as_completed(futures):
                # ensure there has been no exception
                future.result()

        with ThreadPoolExecutor(max_workers=WORKERS_NUMBER) as executor:
            futures = []
            for organization in channel_partner.organizations.all():
                futures.append(
                    executor.submit(calculate_organization_reports, organization, services, period_start))
            for future in as_completed(futures):
                future.result()
    for service in services:
        ChannelPartnerReportsService.get_organization_usages(
            channel_partner=channel_partner,
            service=service,
            period_start=period_start,
            generate=True
        )
        ChannelPartnerReportsService.get_channel_partner_usages(
            channel_partner=channel_partner,
            service=service,
            period_start=period_start,
            generate=True
        )
        ChannelPartnerReportsService.get_regular_service_report(
            channel_partner=channel_partner,
            service=service,
            period_start=period_start,
            generate=True
        )
        ChannelPartnerReportsService.get_regular_detail_table(
            channel_partner=channel_partner,
            service=service,
            period_start=period_start,
            generate=True
        )
    ChannelPartnerReportsService.get_channel_partner_report(
        channel_partner=channel_partner,
        period_start=period_start,
        generate=True
    )


def calculate_all_reports():
    period_start = get_today() - relativedelta(days=1)
    period_start.replace(day=1)
    partners_list = ChannelPartner.objects.filter(path__isnull=False).order_by("-path__len")
    partners_list = list(partners_list) + list(ChannelPartner.objects.filter(path__isnull=True))
    for channel_partner in partners_list:
        calculate_partner_reports(channel_partner, period_start)


@shared_task(max_retries=3)
def report_daily_calculation_task():
    if not caches['default'].add(TASK_LOCK_KEY, f'{uuid4()}', timeout=3600):
        logger.warning(f'Daily calculation task if already running.')
        return
    try:
        calculate_all_reports()
    finally:
        cache.delete(TASK_LOCK_KEY)
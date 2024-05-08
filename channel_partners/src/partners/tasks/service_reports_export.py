import datetime
import uuid

import structlog
from celery import (
    current_task,
    shared_task,
)
from django.core.cache import caches

from channel_partners.storages import ReportsStorage
from partners.models import (
    ChannelPartner,
    Organization,
)
from partners.services.reports_export_service import (
    ChannelPartnerReportGenerator,
    OrganizationReportGenerator,
)


logger = structlog.get_logger(__name__)


class TaskRetry(Exception):
    pass


def get_cached_report_key(user_id: int, period_start: datetime.date, entity_id: uuid.UUID):
    return f'report=={entity_id}=={period_start}=={user_id}'


@shared_task(retry_kwargs={'max_retries': 3, 'countdown': 60}, autoretry_for=(TaskRetry,))
def generate_report(channel_partner_id: uuid.UUID = None,
                    organization_id: uuid.UUID = None,
                    report_date: datetime.date = None,
                    period_start: datetime.date = None,
                    user_id: int = None,
                    report_format: str = 'xlsx'):
    task_id = current_task.request.id
    retry_count = current_task.request.retries
    max_retries = current_task.max_retries
    if report_format != 'xlsx':
        logger.warning('Unsupported format', format=report_format, task_id=current_task.request.id)
        raise ValueError(f'Unsupported format format={report_format}')
    if not channel_partner_id and not organization_id:
        logger.warning('Missing channel_partner_id or organization_id', task_id=current_task.request.id)
        raise ValueError('Missing channel_partner_id or organization_id')
    if not user_id:
        logger.warning('Missing user_id', task_id=current_task.request.id)
        raise ValueError('Missing user_id.')
    if not report_date:
        report_date = datetime.date.today()
    if not period_start:
        period_start = report_date.replace(day=1)
    if channel_partner_id:
        channel_partner = ChannelPartner.objects.get(id=channel_partner_id)
        generator = ChannelPartnerReportGenerator(channel_partner, report_date=report_date, period_start=period_start)
    else:
        organization = Organization.objects.get(id=organization_id)
        generator = OrganizationReportGenerator(organization, report_date=report_date, period_start=period_start)
    try:
        if report_format == 'csv':
            fp = generator.stream_csv()
        else:
            fp = generator.stream()
    except Exception as e:
        logger.error('Failed to generate report', exc_info=e)
        if retry_count >= max_retries:
            caches['default'].delete(
                get_cached_report_key(user_id, period_start, channel_partner_id or organization_id))
        raise TaskRetry('Failed to generate report. Retrying...')
    file_name = f'{organization_id or channel_partner_id}/{task_id}.{report_format}'
    storage = ReportsStorage()
    try:
        filename = storage.save(file_name, fp)
    except Exception as e:
        logger.error('Failed to save report', exc_info=e)
        if retry_count >= max_retries:
            caches['default'].delete(
                get_cached_report_key(user_id, period_start, channel_partner_id or organization_id))
        raise TaskRetry('Failed to save report. Retrying...')
    return filename

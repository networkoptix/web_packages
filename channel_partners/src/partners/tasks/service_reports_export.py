import datetime
import json
import uuid
from typing import Any

import structlog
from celery import (
    current_task,
    shared_task,
    states,
)
from celery.result import AsyncResult
from django.core.cache import caches
from django.core.exceptions import ObjectDoesNotExist
from django.utils.text import slugify
from django_celery_results.models import TaskResult
from rest_framework.exceptions import (
    NotFound,
    PermissionDenied,
)

from channel_partners import settings
from channel_partners.storages import ReportsStorage
from partners.models import (
    ChannelPartner,
    HierarchyLevels,
    Organization,
)
from partners.services.reports_export_service import (
    ChannelPartnerReportGenerator,
    OrganizationReportGenerator,
    ReportFormat,
)
from partners.tasks.constants import ReportTaskState
from tools.helpers import cast_uuid


logger = structlog.get_logger(__name__)

# Task expiration time in seconds. Set for both task and cache.
REPORT_EXPORT_TASK_TTL = 1800
# Daily report generation limit for user.
DAILY_REPORTS_LIMIT = 100


class TaskRetry(Exception):
    pass


class GenerationFailed(Exception):
    pass


class GenerationPending(Exception):
    pass

class TaskNotFound(Exception):
    pass


def get_queued_report_key(task_id: str | uuid.UUID):
    return f'report_export_task-{task_id}'


def get_cached_report_key(
        entity_id: uuid.UUID,
        period_start: datetime.date,
        user_id: int,
        report_format: str = ReportFormat.xlsx,
):
    return f'report=={entity_id}=={period_start}=={report_format}=={user_id}'


@shared_task(retry_kwargs={'max_retries': 3, 'countdown': 60}, autoretry_for=(TaskRetry,), result_serializer='pickle')
def generate_report(channel_partner_id: str = None,
                    organization_id: str = None,
                    report_date: str = None,
                    period_start: str = None,
                    user_id: int = None,
                    report_format: ReportFormat = ReportFormat.xlsx,
                    hierarchy_level: int = HierarchyLevels.own):
    organization_id = cast_uuid(organization_id)
    channel_partner_id = cast_uuid(channel_partner_id)
    period_start = datetime.datetime.strptime(period_start, '%Y-%m-%d').date() if period_start else None
    report_date = datetime.datetime.strptime(report_date, '%Y-%m-%d').date() if report_date else None
    task_id = current_task.request.id
    retry_count = current_task.request.retries
    max_retries = current_task.max_retries
    match report_format:
        case ReportFormat.xlsx:
            file_ext = 'xlsx'
        case ReportFormat.csv:
            file_ext = 'zip'
        case _:
            logger.warning('Unsupported format', format=report_format, task_id=task_id)
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
        generator = ChannelPartnerReportGenerator(
            channel_partner,
            report_date=report_date,
            period_start=period_start,
            report_format=report_format,
            hierarchy_level=hierarchy_level,
        )
    else:
        organization = Organization.objects.get(id=organization_id)
        generator = OrganizationReportGenerator(
            organization,
            report_date=report_date,
            period_start=period_start,
            report_format=report_format,
            hierarchy_level=hierarchy_level,
        )
    try:
        fp = generator.stream()
    except Exception as e:
        logger.error('Failed to generate report', exc_info=e)
        if retry_count >= max_retries:
            caches['default'].delete(
                get_cached_report_key(entity_id=channel_partner_id or organization_id,
                                      period_start=period_start,
                                      user_id=user_id,
                                      report_format=report_format)
            )
        raise TaskRetry('Failed to generate report. Retrying...')
    file_name = f'{organization_id or channel_partner_id}/{task_id}.{file_ext}'
    storage = ReportsStorage()
    try:
        filename = storage.save(file_name, fp)
    except Exception as e:
        logger.error('Failed to save report', exc_info=e)
        if retry_count >= max_retries:
            caches['default'].delete(
                get_cached_report_key(entity_id=channel_partner_id or organization_id,
                                      period_start=period_start,
                                      user_id=user_id,
                                      report_format=report_format)
            )
        raise TaskRetry('Failed to save report. Retrying...')
    return filename


def failed_report(reason: str, report_id: Any, status: str = ReportTaskState.failed):
    return {
        'id': report_id,
        'status': status,
        'reason': reason
    }


def get_task(task_id):
    return TaskResult.objects.filter(task_id=task_id).first()


def get_task_kwargs(task):

    try:
        if settings.CELERY_TASK_ALWAYS_EAGER:
            task_kwargs = json.loads(task.task_kwargs)
        else:
            task_kwargs = json.loads(json.loads(task.task_kwargs).replace("'", '"'))
    except json.JSONDecodeError:
        task_kwargs = {}
    return task_kwargs


def get_report_result(
        report_id: str,
        user_id: int,
):
    task = get_task(task_id=report_id)
    if not task:
        if not caches['default'].get(get_queued_report_key(report_id)):
            raise NotFound(f'Task not found.')
        return failed_report('Task is running.', report_id, status=ReportTaskState.pending)

    task_kwargs = get_task_kwargs(task)

    if not task_kwargs:
        return failed_report('Task is invalid.', report_id=report_id)

    if task_kwargs.get('user_id') != user_id:
        raise PermissionDenied('User not authorized.')

    if task.status not in states.READY_STATES:
        return failed_report('Task is running.', report_id=report_id, status=ReportTaskState.pending)
    try:
        if entity_id := task_kwargs.get('channel_partner_id'):
            entity = ChannelPartner.objects.get(id=entity_id)
        else:
            entity_id = task_kwargs.get('organization_id')
            entity = Organization.objects.get(id=entity_id)
    except ObjectDoesNotExist:
        return failed_report('Entity not found.', report_id=report_id)

    report_format = task_kwargs.get('report_format', ReportFormat.xlsx)
    report_format = ReportFormat(report_format)
    period_start = task_kwargs.get('period_start')

    if task.status != states.SUCCESS:
        return failed_report('Task failed.', report_id=report_id)

    if not task.result or not (filename := json.loads(task.result)):
        return failed_report('Task result is empty.', report_id=report_id)

    storage = ReportsStorage()
    if not storage.exists(filename):
        return failed_report('File not found.', report_id=report_id)

    download_file_name = f'{slugify(entity.name)}_{period_start}.{report_format.report_extension()}'
    response_data = {
        'id': report_id,
        'status': ReportTaskState.success,
        'download_url': ReportsStorage().generate_presigned_url(filename=filename,
                                                                download_filename=download_file_name),
    }
    return response_data


def start_report_generation(task_usage_cache_key: str, task_kwargs: dict) -> AsyncResult:
    requests = caches['default'].get(task_usage_cache_key) or []
    now = datetime.datetime.now(tz=datetime.timezone.utc).timestamp()
    requests = [r for r in requests if r > now - 86400]
    if len(requests) >= DAILY_REPORTS_LIMIT:
        raise PermissionDenied(detail='Daily report generation limit exceeded.')
    task: AsyncResult = generate_report.apply_async(
        kwargs=task_kwargs,
        expires=datetime.datetime.now(tz=datetime.timezone.utc) + datetime.timedelta(seconds=REPORT_EXPORT_TASK_TTL)
    )
    caches['default'].set(get_queued_report_key(task.task_id), '1', timeout=REPORT_EXPORT_TASK_TTL)
    requests.append(now)
    caches['default'].set(task_usage_cache_key, requests, timeout=86400)
    return task
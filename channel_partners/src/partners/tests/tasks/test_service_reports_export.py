import datetime
import io
import re
from uuid import uuid4

import boto3
import pytest
from django.conf import settings
from django.core.cache import caches
from django.utils.text import slugify
from moto import mock_aws
from rest_framework.exceptions import NotFound

from channel_partners.storages import ReportsStorage
from partners.tasks.constants import ReportTaskState
from partners.tasks.service_reports_export import (
    ReportType,
    TaskRetry,
    generate_report,
    get_queued_report_key,
    get_report_result,
)


# When task called directly, it has no task_id.
name_pattern = r'{}/None.{}'


class TestGenerateReport:

    @pytest.fixture(autouse=True)
    def setup(self, channel_partner_factory, organization_factory, mocker, cp_user_factory):
        self.channel_partner = channel_partner_factory()
        self.channel_partner_id = self.channel_partner.id
        user_rel = cp_user_factory(channel_partner=self.channel_partner)
        self.user_id = user_rel.user.id
        self.organization_id = organization_factory().id
        self.report_date = datetime.date.today()
        self.period_start = self.report_date.replace(day=1)
        self.report_format = 'xlsx'
        self.ret_val = io.BytesIO(b'Hello World!')
        self.mock_partner_generator = mocker.patch(
            'partners.services.reports_export_service.ChannelPartnerReportGenerator.stream',
            return_value=self.ret_val)
        self.mock_organization_generator = mocker.patch(
            'partners.services.reports_export_service.OrganizationReportGenerator.stream',
            return_value=self.ret_val)
        self.mock_partner_changes_generator = mocker.patch(
            'partners.services.reports_export_service.ChannelPartnerServiceChangesReportGenerator.stream',
            return_value=self.ret_val)
        self.mock_organization_changes_generator = mocker.patch(
            'partners.services.reports_export_service.OrganizationServiceChangesReportGenerator.stream',
            return_value=self.ret_val)
        self.spy_storage_save = mocker.spy(ReportsStorage, 'save')
        self.spy_stream_xlsx = mocker.spy(generate_report, 's')

    @mock_aws
    def test_channel_partner_report_generation(self, ):
        boto3.resource('s3').Bucket(settings.AWS_STORAGE_BUCKET_NAME).create()
        result = generate_report(channel_partner_id=self.channel_partner_id,
                                 report_date=self.report_date.isoformat(),
                                 period_start=self.period_start.isoformat(),
                                 user_id=self.user_id,
                                 report_format=self.report_format,
                                 report_type=ReportType.usage_report)
        pattern = name_pattern.format(self.channel_partner_id, self.report_format)
        assert re.match(pattern, result)
        self.mock_partner_generator.assert_called_once()
        self.spy_storage_save.assert_called_once()
        assert result in self.spy_storage_save.mock_calls[0].args
        assert self.ret_val in self.spy_storage_save.mock_calls[0].args
        file = ReportsStorage().open(result)
        assert file.read() == b'Hello World!'

    @mock_aws
    def test_organization_report_generation(self):
        boto3.resource('s3').Bucket(settings.AWS_STORAGE_BUCKET_NAME).create()
        result = generate_report(organization_id=self.organization_id,
                                 report_date=self.report_date.isoformat(),
                                 period_start=self.period_start.isoformat(),
                                 user_id=self.user_id,
                                 report_format=self.report_format,
                                 report_type=ReportType.usage_report)
        pattern = name_pattern.format(self.organization_id, self.report_format)
        self.mock_organization_generator.assert_called_once()
        assert re.match(pattern, result)

    @mock_aws
    def test_partner_service_changes_report_generation(self):
        boto3.resource('s3').Bucket(settings.AWS_STORAGE_BUCKET_NAME).create()
        result = generate_report(channel_partner_id=self.channel_partner_id,
                                 report_date=self.report_date.isoformat(),
                                 period_start=self.period_start.isoformat(),
                                 user_id=self.user_id,
                                 report_format=self.report_format,
                                 report_type=ReportType.service_changes_report)
        pattern = name_pattern.format(self.channel_partner_id, self.report_format)
        self.mock_partner_changes_generator.assert_called_once()
        assert re.match(pattern, result)

    @mock_aws
    def test_organization_service_changes_report_generation(self):
        boto3.resource('s3').Bucket(settings.AWS_STORAGE_BUCKET_NAME).create()
        result = generate_report(organization_id=self.organization_id,
                                 report_date=self.report_date.isoformat(),
                                 period_start=self.period_start.isoformat(),
                                 user_id=self.user_id,
                                 report_format=self.report_format,
                                 report_type=ReportType.service_changes_report)
        pattern = name_pattern.format(self.organization_id, self.report_format)
        self.mock_organization_changes_generator.assert_called_once()
        assert re.match(pattern, result)

    def test_unsupported_format(self):
        with pytest.raises(ValueError):
            generate_report(channel_partner_id=self.channel_partner_id,
                            report_date=self.report_date.isoformat(),
                            period_start=self.period_start.isoformat(),
                            user_id=self.user_id,
                            report_format='pdf')

    def test_missing_ids(self):
        with pytest.raises(ValueError):
            generate_report(report_date=self.report_date.isoformat(),
                            period_start=self.period_start.isoformat(),
                            user_id=self.user_id,
                            report_format=self.report_format)

    def test_report_generation_failure(self, mocker):
        self.mock_partner_generator.side_effect = Exception('Test exception')
        with pytest.raises(TaskRetry):
            generate_report(channel_partner_id=self.channel_partner_id,
                            report_date=self.report_date.isoformat(),
                            period_start=self.period_start.isoformat(),
                            user_id=self.user_id,
                            report_format=self.report_format)

    @mock_aws
    def test_report_saving_failure(self):
        with pytest.raises(TaskRetry, match='Failed to save report. Retrying...'):
            generate_report(channel_partner_id=self.channel_partner_id,
                            report_date=self.report_date.isoformat(),
                            period_start=self.period_start.isoformat(),
                            user_id=self.user_id,
                            report_format=self.report_format)


class TestGenerateReportCsv:

    @pytest.fixture(autouse=True)
    def setup(self, channel_partner_factory, organization_factory, mocker, cp_user_factory):
        self.channel_partner = channel_partner_factory()
        self.channel_partner_id = self.channel_partner.id
        user_rel = cp_user_factory(channel_partner=self.channel_partner)
        self.user_id = user_rel.user.id
        self.organization_id = organization_factory().id
        self.report_date = datetime.date.today()
        self.period_start = self.report_date.replace(day=1)
        self.report_format = 'csv'
        self.ret_val = io.BytesIO(b'Hello World!')
        self.mock_partner_generator = mocker.patch(
            'partners.services.reports_export_service.ChannelPartnerReportGenerator.stream',
            return_value=self.ret_val)
        self.mock_organization_generator = mocker.patch(
            'partners.services.reports_export_service.OrganizationReportGenerator.stream',
            return_value=self.ret_val)
        self.mock_partner_changes_generator = mocker.patch(
            'partners.services.reports_export_service.ChannelPartnerServiceChangesReportGenerator.stream',
            return_value=self.ret_val)
        self.mock_organization_changes_generator = mocker.patch(
            'partners.services.reports_export_service.OrganizationServiceChangesReportGenerator.stream',
            return_value=self.ret_val)
        self.spy_storage_save = mocker.spy(ReportsStorage, 'save')

    @mock_aws
    def test_channel_partner_report_generation(self, ):
        boto3.resource('s3').Bucket(settings.AWS_STORAGE_BUCKET_NAME).create()
        result = generate_report(channel_partner_id=self.channel_partner_id,
                                 report_date=self.report_date.isoformat(),
                                 period_start=self.period_start.isoformat(),
                                 user_id=self.user_id,
                                 report_format=self.report_format,
                                 report_type=ReportType.usage_report)
        pattern = name_pattern.format(self.channel_partner_id, 'zip')
        assert re.match(pattern, result)
        self.spy_storage_save.assert_called_once()
        assert result in self.spy_storage_save.mock_calls[0].args
        assert self.ret_val in self.spy_storage_save.mock_calls[0].args
        file = ReportsStorage().open(result)
        assert file.read() == b'Hello World!'
        self.mock_partner_generator.assert_called_once()

    @mock_aws
    def test_organization_report_generation(self):
        boto3.resource('s3').Bucket(settings.AWS_STORAGE_BUCKET_NAME).create()
        result = generate_report(organization_id=self.organization_id,
                                 report_date=self.report_date.isoformat(),
                                 period_start=self.period_start.isoformat(),
                                 user_id=self.user_id,
                                 report_format=self.report_format,
                                 report_type=ReportType.usage_report)
        pattern = name_pattern.format(self.organization_id, 'zip')
        assert re.match(pattern, result)
        self.mock_organization_generator.assert_called_once()

    @mock_aws
    def test_partner_service_changes_report_generation(self):
        boto3.resource('s3').Bucket(settings.AWS_STORAGE_BUCKET_NAME).create()
        result = generate_report(channel_partner_id=self.channel_partner_id,
                                 report_date=self.report_date.isoformat(),
                                 period_start=self.period_start.isoformat(),
                                 user_id=self.user_id,
                                 report_format=self.report_format,
                                 report_type=ReportType.service_changes_report)
        pattern = name_pattern.format(self.channel_partner_id, self.report_format)
        self.mock_partner_changes_generator.assert_called_once()
        assert re.match(pattern, result)

    @mock_aws
    def test_organization_service_changes_report_generation(self):
        boto3.resource('s3').Bucket(settings.AWS_STORAGE_BUCKET_NAME).create()
        result = generate_report(organization_id=self.organization_id,
                                 report_date=self.report_date.isoformat(),
                                 period_start=self.period_start.isoformat(),
                                 user_id=self.user_id,
                                 report_format=self.report_format,
                                 report_type=ReportType.service_changes_report)
        pattern = name_pattern.format(self.organization_id, self.report_format)
        self.mock_organization_changes_generator.assert_called_once()
        assert re.match(pattern, result)

    def test_unsupported_format(self):
        with pytest.raises(ValueError):
            generate_report(channel_partner_id=self.channel_partner_id,
                            report_date=self.report_date.isoformat(),
                            period_start=self.period_start.isoformat(),
                            user_id=self.user_id,
                            report_format='pdf')

    def test_missing_ids(self):
        with pytest.raises(ValueError):
            generate_report(report_date=self.report_date.isoformat(),
                            period_start=self.period_start.isoformat(),
                            user_id=self.user_id,
                            report_format=self.report_format)

    def test_report_generation_failure(self, mocker):
        self.mock_partner_generator.side_effect = Exception('Test exception')
        with pytest.raises(TaskRetry):
            generate_report(channel_partner_id=self.channel_partner_id,
                            report_date=self.report_date.isoformat(),
                            period_start=self.period_start.isoformat(),
                            user_id=self.user_id,
                            report_format=self.report_format)

    @mock_aws
    def test_report_saving_failure(self):
        # There is no bucket, that will raise exception
        with pytest.raises(TaskRetry, match='Failed to save report. Retrying...'):
            generate_report(channel_partner_id=self.channel_partner_id,
                            report_date=self.report_date.isoformat(),
                            period_start=self.period_start.isoformat(),
                            user_id=self.user_id,
                            report_format=self.report_format)


class TestGetReportResult:

    @pytest.fixture(autouse=True)
    def setup(self, channel_partner_factory, organization_factory, mocker, cp_user_factory):
        self.channel_partner = channel_partner_factory()
        self.channel_partner_id = self.channel_partner.id
        user_rel = cp_user_factory(channel_partner=self.channel_partner)
        self.user_id = user_rel.user.id
        self.organization_id = organization_factory().id
        self.report_date = datetime.date.today()
        self.period_start = self.report_date.replace(day=1)
        self.report_format = 'csv'
        self.task_id = f'{uuid4()}.zip'
        self.file_name = f'{self.task_id}/{uuid4()}'
        self.task_kwargs = dict(
            channel_partner_id=self.channel_partner_id,
            report_date=self.report_date.isoformat(),
            period_start=self.period_start.isoformat(),
            user_id=self.user_id,
            report_format=self.report_format
        )
        self.mocked_get_task = mocker.patch('partners.tasks.service_reports_export.get_task')
        self.mocked_get_task_kwargs = mocker.patch('partners.tasks.service_reports_export.get_task_kwargs')
        self.task = mocker.MagicMock()
        self.task.task_id = self.task_id
        self.task.id = self.task_id


    @mock_aws
    def test_task_does_not_exist(self):
        boto3.resource('s3').Bucket(settings.AWS_STORAGE_BUCKET_NAME).create()
        self.mocked_get_task.return_value = None
        with pytest.raises(NotFound):
            get_report_result(self.task_id, self.user_id)

    @mock_aws
    def test_task_queue_and_not_in_db(self):
        boto3.resource('s3').Bucket(settings.AWS_STORAGE_BUCKET_NAME).create()
        self.mocked_get_task.return_value = None
        caches['default'].set(get_queued_report_key(self.task_id), '1')
        result = get_report_result(self.task_id, self.user_id)
        assert result['status'] == ReportTaskState.pending
        assert result['reason'] == 'Task is running.'


    @mock_aws
    def test_task_pending_state(self, ):
        boto3.resource('s3').Bucket(settings.AWS_STORAGE_BUCKET_NAME).create()
        self.mocked_get_task.return_value = self.task
        self.mocked_get_task_kwargs.return_value = self.task_kwargs
        self.task.status = 'PENDING'
        result = get_report_result(self.task_id, self.user_id)
        assert result['status'] == ReportTaskState.pending
        assert result['reason'] == 'Task is running.'

    @mock_aws
    def test_task_failure_state(self, ):
        boto3.resource('s3').Bucket(settings.AWS_STORAGE_BUCKET_NAME).create()
        self.mocked_get_task.return_value = self.task
        self.mocked_get_task_kwargs.return_value = self.task_kwargs
        self.task.status = 'FAILURE'
        result = get_report_result(self.task_id, self.user_id)
        assert result['status'] == ReportTaskState.failed
        assert result['reason'] == 'Task failed.'

    @mock_aws
    def test_task_has_no_result(self, ):
        boto3.resource('s3').Bucket(settings.AWS_STORAGE_BUCKET_NAME).create()
        self.task.result = ''
        self.mocked_get_task.return_value = self.task
        self.mocked_get_task_kwargs.return_value = self.task_kwargs
        self.task.status = 'SUCCESS'
        result = get_report_result(self.task_id, self.user_id)
        assert result['status'] == ReportTaskState.failed
        assert result['reason'] == 'Task result is empty.'

    @mock_aws
    def test_task_no_file(self, ):
        boto3.resource('s3').Bucket(settings.AWS_STORAGE_BUCKET_NAME).create()
        self.task.result = f'"{self.file_name}"'
        self.mocked_get_task.return_value = self.task
        self.mocked_get_task_kwargs.return_value = self.task_kwargs
        self.task.status = 'SUCCESS'
        result = get_report_result(self.task_id, self.user_id)
        assert result['status'] == ReportTaskState.failed
        assert result['reason'] == 'File not found.'


    @mock_aws
    def test_task_success(self, ):
        boto3.resource('s3').Bucket(settings.AWS_STORAGE_BUCKET_NAME).create()
        self.task.result = f'"{self.file_name}"'
        self.mocked_get_task.return_value = self.task
        self.mocked_get_task_kwargs.return_value = self.task_kwargs
        self.task.status = 'SUCCESS'
        ReportsStorage().save(self.file_name, io.BytesIO(b'Hello World!'))
        result = get_report_result(self.task_id, self.user_id)
        assert result['status'] == ReportTaskState.success
        assert result['id'] == self.task_id
        assert f'{slugify(self.channel_partner.name)}_{self.period_start}.zip' in result['download_url']

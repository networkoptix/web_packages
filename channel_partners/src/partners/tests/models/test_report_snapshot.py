from uuid import uuid4

import pytest
from django.core.exceptions import ValidationError
from django.db import IntegrityError

from partners.models import ReportSnapshot
from tools.helpers import get_today


class TestReportSnapshot:
    @pytest.fixture(autouse=True)
    def setup(self, channel_partner_factory, organization_factory, cp_service_factory):
        self.partner = channel_partner_factory()
        self.organization = organization_factory(channel_partner=self.partner)
        self.service = cp_service_factory(channel_partner=self.partner)

    @pytest.mark.parametrize("report_type", [ReportSnapshot.ReportType.system_regular_report,
                                             ReportSnapshot.ReportType.system_expiring_report])
    def test_unique_system_report(self, report_type):
        entity_id = uuid4()
        system_id = uuid4()
        period_start = get_today()
        report = ReportSnapshot.objects.create(
            entity_id=entity_id,
            organization=self.organization,
            service_id=self.service.id,
            report_type=report_type,
            start_date=period_start,
            report_data={"system_id": system_id},
        )
        with pytest.raises(IntegrityError):
            ReportSnapshot.objects.create(
                entity_id=entity_id,
                organization=self.organization,
                service_id=self.service.id,
                report_type=report_type,
                start_date=period_start,
                report_data={"system_id": system_id},
            )

    @pytest.mark.parametrize("report_type", [ReportSnapshot.ReportType.organization_expiring_service_report,
                                             ReportSnapshot.ReportType.organization_regular_service_report])
    def test_unique_service_report(self, report_type):
        entity_id = uuid4()
        system_id = uuid4()
        period_start = get_today()
        report = ReportSnapshot.objects.create(
            entity_id=entity_id,
            service_id=self.service.id,
            report_type=report_type,
            start_date=period_start,
            report_data={"system_id": system_id},
        )
        with pytest.raises(IntegrityError):
            ReportSnapshot.objects.create(
                entity_id=entity_id,
                service_id=self.service.id,
                report_type=report_type,
                start_date=period_start,
                report_data={"system_id": system_id},
            )

    @pytest.mark.parametrize("report_type", [ReportSnapshot.ReportType.organization_usage_report,
                                             ReportSnapshot.ReportType.channel_partner_usage_report])
    def test_unique_usage_report(self, report_type):
        entity_id = uuid4()
        system_id = uuid4()
        period_start = get_today()
        report = ReportSnapshot.objects.create(
            entity_id=entity_id,
            report_type=report_type,
            start_date=period_start,
            report_data={"system_id": system_id},
        )
        with pytest.raises(IntegrityError):
            ReportSnapshot.objects.create(
                entity_id=entity_id,
                report_type=report_type,
                start_date=period_start,
                report_data={"system_id": system_id},
            )

    def test_system_report_organization_validation(self):
        with pytest.raises(ValidationError) as ex:
            ReportSnapshot.objects.create(
                entity_id=uuid4(),
                organization=None,
                service_id=self.service.id,
                report_type=ReportSnapshot.ReportType.system_regular_report,
                start_date=get_today(),
                report_data={},
            )
            assert 'Organization is required for system reports.' in str(ex)


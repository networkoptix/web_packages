import random
from uuid import uuid4

import pytest
from celery.exceptions import Retry
from django.core.cache import caches
from django.db.models import Sum

from partners.models import (
    ChannelPartnerService,
    ChannelPartnerServiceRecord,
    CloudSystemId,
)
from partners.tasks.services import (
    NEGATION_LOCK_KEY,
    organization_systems_negation_task,
)


class TestOrganizationSystemsNegationTask:
    @pytest.fixture(autouse=True)
    def setup(self, organization_factory, system_factory, mocker, service_record_factory, cp_service_factory):
        self.organization = organization_factory()
        self.systems = [system_factory(organization=self.organization) for _ in range(100)]
        self.system_ids = [sys.id for sys in self.systems]
        self.services = [
            cp_service_factory(channel_partner=self.organization.channel_partner, service_type=typ)
            for typ in ChannelPartnerService.SERVICE_TYPE_TO_CODE_MAP.keys()
        ]
        self.service_records = []
        for system in self.systems:
            for service in self.services:
                for _ in range(3):
                    self.service_records.append(service_record_factory(
                        service=service,
                        organization=self.organization,
                        cloud_system=system,
                        quantity=random.randint(1,15)
                    ))

        mocker.patch("partners.tasks.services.NEGATION_MAX_RETRIES", return_value=2)
        mocker.patch("partners.tasks.services.NEGATION_RETRY_DELAY", return_value=1)

    def check_initial_data(self):
        assert CloudSystemId.objects.count() == len(self.system_ids)
        assert ChannelPartnerServiceRecord.objects.filter(
            organization=self.organization,
            cloud_system_id__in=self.system_ids
        ).count() == len(ChannelPartnerService.SERVICE_TYPES) * len(self.system_ids) * 3
        assert (ChannelPartnerServiceRecord.objects.count() ==
                len(ChannelPartnerService.SERVICE_TYPES) * len(self.system_ids) * 3)
        assert ChannelPartnerServiceRecord.objects.all().aggregate(Sum("quantity"))["quantity__sum"] > 0

    def test_initial_data(self):
        self.check_initial_data()

    def test_negation(self):
        negation_records = organization_systems_negation_task(self.organization.id, self.system_ids)
        assert len(negation_records) == len(ChannelPartnerService.SERVICE_TYPES) * len(self.system_ids)
        assert ChannelPartnerServiceRecord.objects.filter(
            organization=self.organization,
            cloud_system_id__in=self.system_ids
        ).count() == len(ChannelPartnerService.SERVICE_TYPES) * len(self.system_ids) * 4
        assert ChannelPartnerServiceRecord.objects.all().aggregate(Sum("quantity"))["quantity__sum"] == 0

    def test_non_existing_organization(self):
        negation_records = organization_systems_negation_task(f'{uuid4()}', self.system_ids)
        assert negation_records is None

    def test_non_existing_system(self, organization_factory):
        organization = organization_factory()
        negation_records = organization_systems_negation_task(organization.id, self.system_ids)
        assert len(negation_records) == 0

    def test_exception_handling(self, mocker):
        test_text = f'{uuid4()}'
        negate_service_mock = mocker.patch('partners.models.ChannelPartnerServiceRecord.negate_services',
                                           side_effect=ValueError(test_text))
        try:
            negation_records = organization_systems_negation_task(self.organization.id, self.system_ids)
        except Retry as ex:
            assert ex.message == (f"Exception occurred while negating service records"
                                  f" for organization {self.organization.id}")
        else:
            assert False, 'Expected Retry exception'

        assert caches['default'].get(NEGATION_LOCK_KEY.format(organization_id=self.organization.id)) is None



import uuid
from typing import (
    List,
    TypedDict,
    Union,
)

import pytest
from dateutil import parser
from django.db.models import QuerySet
from model_bakery import baker
from pytest_django.asserts import assertQuerysetEqual

from partners.models import ChannelPartnerServiceRecord
from partners.services.usage_reports_service import (
    CHANNEL_PARTNER,
    ORGANIZATION,
    BeginningOfPeriodDate,
    ChannelPartnerReportsService,
    ChannelPartnerServiceReport,
    ChannelPartnerServiceSummary,
    ChannelPartnerSubEntityServices,
    ChannelPartnerUsage,
    ChannelPartnerUsageReportRecord,
    OrganizationReportsService,
    OrganizationServiceReport,
    OrganizationServiceSummary,
    OrganizationUsage,
    RegularUsageCalculator,
    RegularUsageDetailRecord,
    SystemServiceSummary,
    SystemUsage,
    TotalUsageDate,
    build_aggregate_from_usages,
)


class RecordDict(TypedDict):
    date_time: str
    quantity: int


@pytest.fixture
def report_records_factory(default_org_system_generator, cp_service_factory):
    def report_records(records: List[RecordDict], save=False, as_queryset=False) -> Union[List[ChannelPartnerServiceRecord], QuerySet[ChannelPartnerServiceRecord]]:
        system = default_org_system_generator()
        service = cp_service_factory()
        record_instances = []
        if save:
            baker_function = baker.make
        else:
            baker_function = baker.prepare

        for record in records:
            created_ts = parser.parse(record.get('date_time'))
            quantity = record.get('quantity')
            record_instances.append(baker_function(
                ChannelPartnerServiceRecord, service=service, cloud_system=system, created_ts=created_ts,
                quantity=quantity, organization=system.organization
            ))
        if as_queryset:
            return ChannelPartnerServiceRecord.objects.filter(id__in=[instance.id for instance in record_instances])
        return record_instances
    return report_records


def test_build_aggregate_from_reports():
    reports = [
        SystemUsage(system_id='1', report=[
            RegularUsageDetailRecord(date=BeginningOfPeriodDate, channels=100, monthly_rate=100, daily_rate=0),
            RegularUsageDetailRecord(date=TotalUsageDate, channels=100, monthly_rate=100, daily_rate=0)
        ]),
        SystemUsage(system_id='2', report=[
            RegularUsageDetailRecord(date=BeginningOfPeriodDate, channels=100, monthly_rate=100, daily_rate=0),
            RegularUsageDetailRecord(date=parser.parse('01-21-2024'), channels=20, monthly_rate=0, daily_rate=200,
                                     transactions=1),
            RegularUsageDetailRecord(date=TotalUsageDate, channels=120, monthly_rate=100, daily_rate=200)
        ]),
        SystemUsage(system_id='3', report=[
            RegularUsageDetailRecord(date=BeginningOfPeriodDate, channels=100, monthly_rate=100, daily_rate=0),
            RegularUsageDetailRecord(date=parser.parse('01-21-2024'), channels=20, monthly_rate=0, daily_rate=200,
                                     transactions=1),
            RegularUsageDetailRecord(date=parser.parse('01-26-2024'), channels=20, monthly_rate=0, daily_rate=100,
                                     transactions=1),
            RegularUsageDetailRecord(date=TotalUsageDate, channels=140, monthly_rate=100, daily_rate=300)
        ]),
    ]

    assert build_aggregate_from_usages(reports) == [
        RegularUsageDetailRecord(date=BeginningOfPeriodDate, channels=300, monthly_rate=300, daily_rate=0),
        RegularUsageDetailRecord(date=parser.parse('01-21-2024'), channels=40, monthly_rate=0, daily_rate=400,
                                 transactions=2),
        RegularUsageDetailRecord(date=parser.parse('01-26-2024'), channels=20, monthly_rate=0, daily_rate=100,
                                 transactions=1),
        RegularUsageDetailRecord(date=TotalUsageDate, channels=360, monthly_rate=300, daily_rate=500),
    ]


class TestRegularUsageCalculator:
    def test_calculate_beginning_usage_row(
            self, channel_partner_factory, cp_service_factory, service_record_factory, default_org_system_generator):
        regular_service = cp_service_factory()
        system = default_org_system_generator()
        quantities = [(i+5)*10 for i in range(10)]
        record_ids = [service_record_factory(service=regular_service, cloud_system=system, organization=system.organization,
                                             quantity=qty).id for qty in quantities]
        records_qa = ChannelPartnerServiceRecord.objects.filter(id__in=record_ids)
        usage_row = RegularUsageCalculator.calculate_beginning_usage_row(records_qa)
        total_quantity = sum(quantities)
        assert usage_row['channels'] == total_quantity
        assert usage_row['monthly_rate'] == total_quantity
        assert usage_row['daily_rate'] == 0
        assert usage_row['date'] == BeginningOfPeriodDate

    @pytest.fixture()
    def usage_list_mocks(self, mocker):
        beginning_usage_mock = mocker.patch(
            'partners.services.usage_reports_service.RegularUsageCalculator.calculate_beginning_usage_row', return_value='beginning_mock')
        steps_mock = mocker.patch('partners.services.usage_reports_service.RegularUsageCalculator.calculate_steps_from_records',
                                  return_value='steps_mock')
        return beginning_usage_mock, steps_mock

    def test_generate_usage_list_first_month(self, usage_list_mocks, report_records_factory):
        records = [
            RecordDict(date_time='01-01-2024', quantity=50),
            RecordDict(date_time='01-15-2024', quantity=50),
            RecordDict(date_time='01-31-2024', quantity=50),
            RecordDict(date_time='01-31-2024 23:59:59', quantity=50),
        ]
        record_qs = report_records_factory(records, save=True, as_queryset=True)
        beginning_usage_mock, steps_mock = usage_list_mocks
        usage_list = RegularUsageCalculator.generate_usage_list(record_qs, start_date=parser.parse('01-01-2024'), end_date=parser.parse('02-01-2024'))
        assert usage_list == steps_mock.return_value
        records_start = beginning_usage_mock.call_args.kwargs['records']
        records_steps = steps_mock.call_args.kwargs['records']
        assertQuerysetEqual(records_start, [])
        assertQuerysetEqual(records_steps, record_qs.order_by('created_ts'))

    def test_generate_usage_list_with_other_months(self, usage_list_mocks, report_records_factory):
        records = [
            RecordDict(date_time='01-01-2024', quantity=50),
            RecordDict(date_time='01-15-2024', quantity=50),
            RecordDict(date_time='01-31-2024', quantity=50),
            RecordDict(date_time='01-31-2024 23:59:59', quantity=50),
            RecordDict(date_time='02-01-2024', quantity=50),
            RecordDict(date_time='02-05-2024', quantity=50),
            RecordDict(date_time='02-28-2024 23:59:59', quantity=50),
            RecordDict(date_time='03-01-2024', quantity=50),
            RecordDict(date_time='03-05-2024', quantity=50)
        ]
        record_qs = report_records_factory(records, save=True, as_queryset=True)
        record_list = list(record_qs.order_by('created_ts'))
        beginning_usage_mock, steps_mock = usage_list_mocks
        usage_list = RegularUsageCalculator.generate_usage_list(record_qs, start_date=parser.parse('02-01-2024'),
                                                                end_date=parser.parse('03-01-2024'))
        assert usage_list == steps_mock.return_value
        records_start = beginning_usage_mock.call_args.kwargs['records']
        records_steps = steps_mock.call_args.kwargs['records']
        assert set(records_start) == set(record_list[0:4])
        assert list(records_steps) == record_list[4:7]

    @pytest.fixture()
    def steps_calculator_generic(self, mocker, report_records_factory):
        def steps_calculator(beginning_usage, records):
            records_mock = mocker.MagicMock()
            records_instance = report_records_factory(records, save=False, as_queryset=False)
            records_mock.iterator.return_value = records_instance
            return RegularUsageCalculator.calculate_steps_from_records(records_mock, beginning_usage)
        return steps_calculator

    def test_calculate_steps_from_records_first_month(self, steps_calculator_generic):
        beginning_usage = RegularUsageDetailRecord(date=BeginningOfPeriodDate, channels=0, monthly_rate=0, daily_rate=0)
        records = [
            RecordDict(date_time='01-01-2024', quantity=50),
            RecordDict(date_time='01-15-2024', quantity=100),
            RecordDict(date_time='01-15-2024', quantity=60),
            RecordDict(date_time='01-15-2024 23:59:59', quantity=60),
            RecordDict(date_time='01-31-2024 23:59:59', quantity=-10),
        ]

        assert steps_calculator_generic(beginning_usage, records) == [
            beginning_usage,
            RegularUsageDetailRecord(date=parser.parse('01-01-2024').date(), channels=50, monthly_rate=0, daily_rate=1500, transactions=1),
            RegularUsageDetailRecord(date=parser.parse('01-15-2024').date(), channels=220, monthly_rate=0, daily_rate=3520,
                                     transactions=3),
            RegularUsageDetailRecord(date=parser.parse('01-31-2024').date(), channels=-10, monthly_rate=0, daily_rate=-0,
                                     transactions=1),
            RegularUsageDetailRecord(date=TotalUsageDate, channels=260, monthly_rate=0, daily_rate=5020)
        ]

    def test_calculate_steps_from_records_case_1(self, steps_calculator_generic):
        # https://networkoptix.atlassian.net/wiki/spaces/FS/pages/2996142086/SaaS+Reports#Important-Example-1-%E2%80%93-Remove-Services-without-Adding-in-the-Current-Period
        beginning_usage = RegularUsageDetailRecord(date=BeginningOfPeriodDate, channels=200, monthly_rate=200, daily_rate=0)
        records = [
            RecordDict(date_time='12-05-2023', quantity=-10),
        ]

        assert steps_calculator_generic(beginning_usage, records) == [
            beginning_usage,
            RegularUsageDetailRecord(date=parser.parse('12-05-2023').date(), channels=-10, monthly_rate=-10, daily_rate=50, transactions=1),
            RegularUsageDetailRecord(date=TotalUsageDate, channels=190, monthly_rate=190, daily_rate=50)
        ]

    def test_calculate_steps_from_records_case_2(self, steps_calculator_generic):
        # https://networkoptix.atlassian.net/wiki/spaces/FS/pages/2996142086/SaaS+Reports#Important-Example-2-%E2%80%93-Remove-&-Add
        beginning_usage = RegularUsageDetailRecord(date=BeginningOfPeriodDate, channels=200, monthly_rate=200, daily_rate=0)
        records = [
            RecordDict(date_time='12-05-2023', quantity=-10),
            RecordDict(date_time='12-10-2023', quantity=50),
        ]

        assert steps_calculator_generic(beginning_usage, records) == [
            beginning_usage,
            RegularUsageDetailRecord(date=parser.parse('12-05-2023').date(), channels=-10, monthly_rate=-10, daily_rate=50, transactions=1),
            RegularUsageDetailRecord(date=parser.parse('12-10-2023').date(), channels=50, monthly_rate=0, daily_rate=1050,
                                     transactions=1),
            RegularUsageDetailRecord(date=TotalUsageDate, channels=240, monthly_rate=190, daily_rate=1100)
        ]

    def test_calculate_steps_from_records_case_3(self, steps_calculator_generic):
        # https://networkoptix.atlassian.net/wiki/spaces/FS/pages/2996142086/SaaS+Reports#Important-Example-3-%E2%80%93-More-Removals-and-Additions
        beginning_usage = RegularUsageDetailRecord(date=BeginningOfPeriodDate, channels=200, monthly_rate=200, daily_rate=0)
        records = [
            RecordDict(date_time='12-05-2023', quantity=-10),
            RecordDict(date_time='12-10-2023', quantity=50),
            RecordDict(date_time='12-20-2023', quantity=-70),
        ]

        assert steps_calculator_generic(beginning_usage, records) == [
            beginning_usage,
            RegularUsageDetailRecord(date=parser.parse('12-05-2023').date(), channels=-10, monthly_rate=-10, daily_rate=50, transactions=1),
            RegularUsageDetailRecord(date=parser.parse('12-10-2023').date(), channels=50, monthly_rate=0, daily_rate=1050,
                                     transactions=1),
            RegularUsageDetailRecord(date=parser.parse('12-20-2023').date(), channels=-70, monthly_rate=-20, daily_rate=-150,
                                     transactions=1),
            RegularUsageDetailRecord(date=TotalUsageDate, channels=170, monthly_rate=170, daily_rate=950)
        ]

    def test_calculate_steps_from_records_multiple_same_day(self, steps_calculator_generic):
        beginning_usage = RegularUsageDetailRecord(date=BeginningOfPeriodDate, channels=200, monthly_rate=200,
                                                   daily_rate=0)
        records = [
            RecordDict(date_time='12-05-2023', quantity=10),
            RecordDict(date_time='12-05-2023', quantity=20),
            RecordDict(date_time='12-05-2023', quantity=50),

            RecordDict(date_time='12-10-2023', quantity=50),
            RecordDict(date_time='12-10-2023', quantity=-50),
            RecordDict(date_time='12-10-2023', quantity=50),
            RecordDict(date_time='12-10-2023', quantity=-50),

            RecordDict(date_time='12-15-2023', quantity=-50),
            RecordDict(date_time='12-15-2023', quantity=-50),

            RecordDict(date_time='12-20-2023', quantity=-50),
            RecordDict(date_time='12-20-2023', quantity=50),
        ]

        assert steps_calculator_generic(beginning_usage, records) == [
            beginning_usage,
            RegularUsageDetailRecord(date=parser.parse('12-05-2023').date(), channels=80, monthly_rate=0, daily_rate=2080,
                                     transactions=3),
            RegularUsageDetailRecord(date=parser.parse('12-10-2023').date(), channels=0, monthly_rate=0, daily_rate=0,
                                     transactions=4),
            RegularUsageDetailRecord(date=parser.parse('12-15-2023').date(), channels=-100, monthly_rate=-20, daily_rate=-980,
                                     transactions=2),
            RegularUsageDetailRecord(date=parser.parse('12-20-2023').date(), channels=0, monthly_rate=-50,
                                     daily_rate=1550,
                                     transactions=2),
            RegularUsageDetailRecord(date=TotalUsageDate, channels=180, monthly_rate=130, daily_rate=2650)
        ]


class TestOrganizationReportsService:
    def test_get_system_reports(self, mocker, system_factory):
        system_regular_report_mock = mocker.patch(
            'partners.services.usage_reports_service.CloudSystemReportsService.get_regular_report',
            side_effect=['report_1', 'report_2', 'report_3']
        )
        systems = [baker.prepare('partners.CloudSystemId', system_id=uuid.uuid4(), name=f'sys_{i}') for i in range(3)]
        organization = baker.prepare('partners.Organization')
        service = mocker.Mock()
        system_reports = OrganizationReportsService.get_system_reports(systems=systems, organization=organization, service=service, period_start=parser.parse('01-01-2024'))
        assert system_regular_report_mock.has_calls(
            [mocker.call(cloud_system=system.system_id, organization=organization, period_start=parser.parse('01-01-2024'), service=service) for system in systems]
        )
        assert system_reports == [
            {'system_id': systems[i].system_id, 'system_name': systems[i].name, 'report': f'report_{i+1}'} for i in range(3)
        ]

    def test_build_summary_from_reports(self):
        systems = [(uuid.uuid4(), f'sys_{i}') for i in range(1, 4)]
        reports = [
            SystemUsage(system_id=systems[0][0], system_name=systems[0][1], report=[
                RegularUsageDetailRecord(date=BeginningOfPeriodDate, channels=100, monthly_rate=100, daily_rate=0),
                RegularUsageDetailRecord(date=TotalUsageDate, channels=100, monthly_rate=100, daily_rate=0)
            ]),
            SystemUsage(system_id=systems[1][0], system_name=systems[1][1], report=[
                RegularUsageDetailRecord(date=BeginningOfPeriodDate, channels=100, monthly_rate=100, daily_rate=0),
                RegularUsageDetailRecord(date=parser.parse('01-21-2024'), channels=20, monthly_rate=0, daily_rate=200, transactions=1),
                RegularUsageDetailRecord(date=TotalUsageDate, channels=120, monthly_rate=100, daily_rate=200)
            ]),
            SystemUsage(system_id=systems[2][0], system_name=systems[2][1], report=[
                RegularUsageDetailRecord(date=BeginningOfPeriodDate, channels=100, monthly_rate=100, daily_rate=0),
                RegularUsageDetailRecord(date=parser.parse('01-21-2024'), channels=20, monthly_rate=0, daily_rate=200,
                                         transactions=1),
                RegularUsageDetailRecord(date=parser.parse('01-26-2024'), channels=20, monthly_rate=0, daily_rate=100,
                                         transactions=1),
                RegularUsageDetailRecord(date=TotalUsageDate, channels=140, monthly_rate=100, daily_rate=300)
            ]),
        ]

        assert OrganizationReportsService.build_service_summary_from_system_reports(reports) == OrganizationServiceReport(systems=[
            SystemServiceSummary(system_id=systems[0][0], system_name=systems[0][1], channels=100, monthly_rate=100, daily_rate=0, changes_count=0, last_changed=None),
            SystemServiceSummary(system_id=systems[1][0], system_name=systems[1][1], channels=120, monthly_rate=100, daily_rate=200, changes_count=1, last_changed=parser.parse('01-21-2024')),
            SystemServiceSummary(system_id=systems[2][0], system_name=systems[2][1], channels=140, monthly_rate=100, daily_rate=300, changes_count=2, last_changed=parser.parse('01-26-2024'))
        ],
        summary=OrganizationServiceSummary(channels=360, monthly_rate=300, daily_rate=500, systems=3)
    )


class TestChannelPartnerReportsService:
    def test_get_organization_usages(self, mocker):
        channel_partner = mocker.Mock()
        service = baker.prepare('partners.ChannelPartnerService')
        organizations = [baker.prepare('partners.Organization', name=f'org_{i}', id=uuid.uuid4()) for i in range(5)]
        channel_partner.organizations.all.return_value = organizations
        detail_table_mock = mocker.patch(
            'partners.services.usage_reports_service.OrganizationReportsService.get_regular_detail_table',
            side_effect=[f'detail_{i}' for i in range(5)]
        )

        assert ChannelPartnerReportsService.get_organization_usages(
            channel_partner, service=service, period_start=parser.parse('01-01-2024')
        ) == [OrganizationUsage(
            organization_id=organizations[i].id, organization_name=organizations[i].name, report=f'detail_{i}'
        ) for i in range(len(organizations))]

    def test_get_channel_partner_usages(self, mocker, cp_service_factory, default_channel_partner,
                                        channel_partner_factory, django_capture_on_commit_callbacks):
        with django_capture_on_commit_callbacks(execute=True) as callbacks:
            channel_partner = channel_partner_factory(parent_channel_partner=default_channel_partner)
            service = cp_service_factory(parent_service=None, channel_partner=channel_partner)

        with django_capture_on_commit_callbacks(execute=True) as callbacks:
            sub_channel_partners = [
                channel_partner_factory(parent_channel_partner=channel_partner)
                for _ in range(5)
            ]
        with django_capture_on_commit_callbacks(execute=True) as callbacks:
            sub_services = []
            for sub_channel in sub_channel_partners:
                sub_services.append(cp_service_factory(parent_service=service, channel_partner=sub_channel))

            detail_table_mock = mocker.patch(
                'partners.services.usage_reports_service.ChannelPartnerReportsService.get_regular_detail_table',
                return_value=[
                    RegularUsageDetailRecord(date=BeginningOfPeriodDate, channels=5, monthly_rate=5, daily_rate=0),
                    RegularUsageDetailRecord(date=parser.parse('01-15-2024'), channels=10, daily_rate=10,
                                             monthly_rate=0, transactions=1),
                    RegularUsageDetailRecord(date=TotalUsageDate, channels=15, monthly_rate=5, daily_rate=10,
                                             transactions=1)
                ]
            )
            channel_partner_usages = ChannelPartnerReportsService.get_channel_partner_usages(
                channel_partner=channel_partner, service=service, period_start=parser.parse('01-01-2024')
            )

        # One service is automatically created/inherited from parent, so total of two services for each sub channel
        assert detail_table_mock.call_count == 10

        assert channel_partner_usages == [ChannelPartnerUsage(
            channel_partner_id=channel_partner.id, channel_partner_name=channel_partner.name, report=[
                RegularUsageDetailRecord(date=BeginningOfPeriodDate, channels=10, monthly_rate=10, daily_rate=0),
                RegularUsageDetailRecord(date=parser.parse('01-15-2024'), channels=20, daily_rate=20,
                                         monthly_rate=0,
                                         transactions=2),
                RegularUsageDetailRecord(date=TotalUsageDate, channels=30, monthly_rate=10, daily_rate=20,
                                         transactions=2)
            ]) for channel_partner in sub_channel_partners]

    def test_build_service_summary_from_sub_entity_reports(self):
        org_usages = [
            OrganizationUsage(organization_id=uuid.uuid4(), organization_name='org_1', report=[
                RegularUsageDetailRecord(date=BeginningOfPeriodDate, channels=100, monthly_rate=100, daily_rate=0),
                RegularUsageDetailRecord(date=parser.parse('01-21-2024'), channels=20, monthly_rate=0, daily_rate=200,
                                         transactions=1),
                RegularUsageDetailRecord(date=TotalUsageDate, channels=120, monthly_rate=100, daily_rate=200)
            ]),
            OrganizationUsage(organization_id=uuid.uuid4(), organization_name='org_2', report=[
                RegularUsageDetailRecord(date=BeginningOfPeriodDate, channels=150, monthly_rate=100, daily_rate=0),
                RegularUsageDetailRecord(date=parser.parse('01-26-2024'), channels=20, monthly_rate=0, daily_rate=100,
                                         transactions=1),
                RegularUsageDetailRecord(date=TotalUsageDate, channels=170, monthly_rate=100, daily_rate=100)
            ]),
        ]
        cp_usages = [
            ChannelPartnerUsage(channel_partner_id=uuid.uuid4(), channel_partner_name='cp_1', report=[
                RegularUsageDetailRecord(date=BeginningOfPeriodDate, channels=100, monthly_rate=100, daily_rate=0),
                RegularUsageDetailRecord(date=parser.parse('01-21-2024'), channels=20, monthly_rate=0, daily_rate=200,
                                         transactions=1),
                RegularUsageDetailRecord(date=TotalUsageDate, channels=120, monthly_rate=100, daily_rate=200)
            ]),
            ChannelPartnerUsage(channel_partner_id=uuid.uuid4(), channel_partner_name='cp_2', report=[
                RegularUsageDetailRecord(date=BeginningOfPeriodDate, channels=200, monthly_rate=100, daily_rate=0),
                RegularUsageDetailRecord(date=parser.parse('01-21-2024'), channels=20, monthly_rate=0, daily_rate=200,
                                         transactions=1),
                RegularUsageDetailRecord(date=TotalUsageDate, channels=220, monthly_rate=100, daily_rate=200)
            ])
        ]

        service_summary = ChannelPartnerReportsService.build_service_summary_from_sub_entity_reports(
            organization_usages=org_usages, channel_partner_usages=cp_usages)
        assert service_summary == ChannelPartnerServiceReport(
            sub_entities=[
                ChannelPartnerSubEntityServices(
                    channels=120, monthly_rate=100, daily_rate=200, id=org_usages[0]['organization_id'],
                    name=org_usages[0]['organization_name'], changes_count=1, last_changed=parser.parse('01-21-2024'),
                    type=ORGANIZATION
                ),
                ChannelPartnerSubEntityServices(
                    channels=170, monthly_rate=100, daily_rate=100, id=org_usages[1]['organization_id'],
                    name=org_usages[1]['organization_name'], changes_count=1, last_changed=parser.parse('01-26-2024'),
                    type=ORGANIZATION
                ),
                ChannelPartnerSubEntityServices(
                    channels=120, monthly_rate=100, daily_rate=200, id=cp_usages[0]['channel_partner_id'],
                    name=cp_usages[0]['channel_partner_name'], changes_count=1, last_changed=parser.parse('01-21-2024'),
                    type=CHANNEL_PARTNER
                ),
                ChannelPartnerSubEntityServices(
                    channels=220, monthly_rate=100, daily_rate=200, id=cp_usages[1]['channel_partner_id'],
                    name=cp_usages[1]['channel_partner_name'], changes_count=1, last_changed=parser.parse('01-21-2024'),
                    type=CHANNEL_PARTNER
                ),
            ],
            summary=ChannelPartnerServiceSummary(channel_partners=2, organizations=2, channels=630, monthly_rate=400, daily_rate=700)
        )

    def test_get_reports_for_services(self, cp_service_factory, mocker):
        services = [cp_service_factory() for _ in range(5)]
        channel_partner = baker.prepare('partners.ChannelPartner')
        mock_reports = [f'report_{service.id}' for service in services]
        mocker.patch('partners.services.usage_reports_service.ChannelPartnerReportsService.get_regular_service_report', side_effect=mock_reports)
        report = ChannelPartnerReportsService.get_reports_for_services(channel_partner=channel_partner, period_start=parser.parse('01-01-2024'), services=services)

        assert report == {service.id: f'report_{service.id}' for service in services}

    def test_build_channel_partner_report_from_service_report(self, cp_service_factory):
        services = [cp_service_factory() for _ in range(5)]
        reports = {
            services[idx].id: ChannelPartnerServiceReport(
                sub_entities=[],  # Aren't used when generating this report
                summary=ChannelPartnerServiceSummary(channel_partners=idx + 1, organizations=2 * (idx + 1),
                                                     channels=100 * (idx + 1),
                                                     monthly_rate=50 * (idx + 1), daily_rate=200 * (idx + 1))
            ) for idx in range(len(services) - 1)
        }

        cp_report = ChannelPartnerReportsService.build_channel_partner_report_from_service_reports(service_reports=reports, services=services)
        assert cp_report == [
            ChannelPartnerUsageReportRecord(
                service_id=services[idx].id, service_name=services[idx].name, used_by_organizations=2 * (idx + 1),
                used_by_channel_partners=idx + 1, channels=100 * (idx + 1), daily_rate=200 * (idx + 1), expirations=[], monthly_rate=50 * (idx + 1)
            ) for idx in range(len(services) - 1)
        ]


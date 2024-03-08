import datetime
import itertools
import sys
import uuid
from calendar import monthrange
from typing import (
    Dict,
    List,
    Literal,
    Optional,
    TypedDict,
    Union,
)

from dateutil.relativedelta import relativedelta
from django.db.models import (
    QuerySet,
    Sum,
)

from partners.models import (
    ChannelPartner,
    ChannelPartnerService,
    ChannelPartnerServiceRecord,
    CloudSystemId,
    Organization,
)


MAX_SIZE = sys.maxsize

BeginningOfPeriodDateType = Literal['beginning']
BeginningOfPeriodDate: BeginningOfPeriodDateType = 'beginning'
TotalUsageDateType = Literal['total']
TotalUsageDate: TotalUsageDateType = 'total'


class RegularUsageDetailRecord(TypedDict):
    date: Union[datetime.date, BeginningOfPeriodDateType, TotalUsageDateType]
    channels: int
    monthly_rate: int
    daily_rate: int
    transactions: Optional[int]


class ExpiringUsageDetailRecord(TypedDict):
    channels: int
    expiration_date: datetime.date


UsageDetailViewType = Union[RegularUsageDetailRecord, ExpiringUsageDetailRecord]
RegularUsageDetailList = List[RegularUsageDetailRecord]


class SystemUsage(TypedDict):
    system_id: uuid.UUID
    system_name: str
    report: RegularUsageDetailList


SystemUsageList = List[SystemUsage]


class SystemServiceSummary(TypedDict):
    system_id: uuid.UUID
    system_name: str
    channels: int
    monthly_rate: int
    daily_rate: int
    changes_count: int
    last_changed: Optional[datetime.date]


OrganizationServiceSystems = List[SystemServiceSummary]


class OrganizationServiceSummary(TypedDict):
    channels: int
    monthly_rate: int
    daily_rate: int
    systems: int


class OrganizationServiceReport(TypedDict):
    systems: OrganizationServiceSystems
    summary: OrganizationServiceSummary


OrganizationServiceReports = Dict[Union[uuid.UUID, str], OrganizationServiceReport]


class OrganizationUsageReportRecord(TypedDict):
    service_id: uuid.UUID
    service_name: str
    used_by: int
    channels: int
    expirations: List
    monthly_rate: int
    daily_rate: int


OrganizationUsageReport = List[OrganizationUsageReportRecord]


class OrganizationUsage(TypedDict):
    organization_id: uuid.UUID
    organization_name: str
    report: RegularUsageDetailList


OrganizationUsageList = List[OrganizationUsage]


class ChannelPartnerUsage(TypedDict):
    channel_partner_id: uuid.UUID
    channel_partner_name: str
    report: RegularUsageDetailList


ChannelPartnerUsageList = List[ChannelPartnerUsage]


ORGANIZATION = 'organization'
CHANNEL_PARTNER = 'channel_partner'
CP_SUBTYPE = Literal['organization', 'channel_partner']


class ChannelPartnerSubEntityServices(TypedDict):
    id: uuid.UUID
    type: CP_SUBTYPE
    name: str
    channels: int
    monthly_rate: int
    daily_rate: int
    changes_count: int
    last_changed: Optional[datetime.date]


ChannelPartnerServiceEntities = List[ChannelPartnerSubEntityServices]


class ChannelPartnerServiceSummary(TypedDict):
    channels: int
    monthly_rate: int
    daily_rate: int
    organizations: int
    channel_partners: int


class ChannelPartnerServiceReport(TypedDict):
    sub_entities: ChannelPartnerServiceEntities
    summary: ChannelPartnerServiceSummary


ChannelPartnerServiceReports = Dict[Union[uuid.UUID, str], ChannelPartnerServiceReport]


class ChannelPartnerUsageReportRecord(TypedDict):
    service_id: uuid.UUID
    service_name: str
    used_by_organizations: int
    used_by_channel_partners: int
    channels: int
    expirations: List
    monthly_rate: int
    daily_rate: int


ChannelPartnerUsageReport = List[ChannelPartnerUsageReportRecord]


def usage_list_sort_key(row):
    if row['date'] == BeginningOfPeriodDate:
        return -1
    elif row['date'] == TotalUsageDate:
        return MAX_SIZE
    else:
        return row['date'].timestamp()


def build_aggregate_from_usages(usages: Union[SystemUsageList, OrganizationUsageList, ChannelPartnerUsageList]) -> RegularUsageDetailList:
    usage_list: RegularUsageDetailList = []
    last_date = None
    for usage_row in sorted(itertools.chain.from_iterable((report_dict['report'] for report_dict in usages)),
                            key=usage_list_sort_key):
        usage_row: RegularUsageDetailRecord
        transactions = usage_row.get('transactions')
        if usage_row['date'] == last_date:
            current_object = usage_list[-1]
            current_object['channels'] += usage_row['channels']
            current_object['monthly_rate'] += usage_row['monthly_rate']
            current_object['daily_rate'] += usage_row['daily_rate']
            if transactions is not None:
                current_object['transactions'] += usage_row['transactions']
        else:
            usage_list.append(RegularUsageDetailRecord(
                date=usage_row['date'], channels=usage_row['channels'], monthly_rate=usage_row['monthly_rate'],
                daily_rate=usage_row['daily_rate']
            ))
            if transactions is not None:
                usage_list[-1]['transactions'] = usage_row['transactions']
            last_date = usage_row['date']
    return usage_list


class RegularUsageCalculator:
    @staticmethod
    def calculate_beginning_usage_row(records: QuerySet[ChannelPartnerServiceRecord]):
        records_aggregate = records.aggregate(channels=Sum('quantity', default=0))
        return RegularUsageDetailRecord(
            date=BeginningOfPeriodDate, channels=records_aggregate['channels'],
            monthly_rate=records_aggregate['channels'], daily_rate=0
        )

    @staticmethod
    def calculate_steps_from_records(records: QuerySet[ChannelPartnerServiceRecord], beginning_usage: dict) -> RegularUsageDetailList:
        usage_list = [beginning_usage]
        total_usage = beginning_usage.copy()
        total_usage['date'] = TotalUsageDate
        last_date = None
        remaining_days = 0
        for record in records.iterator():
            date: datetime.date = record.created_ts.date()
            if date != last_date:
                remaining_days = monthrange(date.year, date.month)[1] - date.day

            channel_delta = record.quantity
            new_total_channel_count = total_usage['channels'] + channel_delta

            if channel_delta > 0:
                daily_delta = channel_delta * remaining_days
                monthly_delta = 0
            elif channel_delta < 0:
                monthly_delta = min(0, new_total_channel_count - total_usage['monthly_rate'])
                daily_delta_from_prorated_monthly_channels = -monthly_delta * date.day
                daily_delta = (max(channel_delta, -(total_usage['channels'] - total_usage['monthly_rate'])) * remaining_days) + daily_delta_from_prorated_monthly_channels
            else:
                continue

            if date == last_date:
                last_row = usage_list[-1]
                last_row['daily_rate'] += daily_delta
                last_row['monthly_rate'] += monthly_delta
                last_row['channels'] += channel_delta
                last_row['transactions'] += 1
            else:
                usage_list.append(RegularUsageDetailRecord(
                    date=date, channels=channel_delta, monthly_rate=monthly_delta, daily_rate=daily_delta, transactions=1
                ))

            total_usage['monthly_rate'] = total_usage['monthly_rate'] + monthly_delta
            total_usage['daily_rate'] = total_usage['daily_rate'] + daily_delta
            total_usage['channels'] = new_total_channel_count

            last_date = date

        usage_list.append(total_usage)
        return usage_list

    @classmethod
    def generate_usage_list(cls, records: QuerySet[ChannelPartnerServiceRecord], start_date: datetime.date, end_date: datetime.date) -> RegularUsageDetailList:
        records_start = records.filter(created_ts__lt=start_date)
        records_change = records.filter(created_ts__gte=start_date, created_ts__lt=end_date)

        beginning_usage = cls.calculate_beginning_usage_row(records=records_start)
        usage_list = cls.calculate_steps_from_records(
            records=records_change.order_by('created_ts'), beginning_usage=beginning_usage
        )
        return usage_list


# Not actual, waiting on updates from design
class ExpiringUsageCalculatorService:

    @staticmethod
    def calculate_rows_from_records(duration_delta: relativedelta,
                                    records: QuerySet[ChannelPartnerServiceRecord]) -> List[ExpiringUsageDetailRecord]:
        rows_dict = {}
        record: ChannelPartnerServiceRecord
        for record in records.order_by('created_ts').iterator():
            expiration_date = record.created_ts.date() + duration_delta
            expiration_date_str = expiration_date.isoformat()
            if expiration_date_str in rows_dict:
                rows_dict[expiration_date_str]['channels'] += record.quantity
            else:
                rows_dict[expiration_date_str] = ExpiringUsageDetailRecord(channels=record.quantity,
                                                                           expiration_date=expiration_date)

        return sorted(rows_dict.values(), key=lambda row: row['expiration_date'])

    @classmethod
    def generate_usage_list(cls, service: ChannelPartnerService, records: QuerySet[ChannelPartnerServiceRecord],
                            start_date: datetime.date, end_date: datetime.date) -> List[ExpiringUsageDetailRecord]:
        duration_delta = relativedelta(months=service.duration)
        created_lower_bound = start_date - duration_delta
        end_of_month_quantity = records.filter(created_ts__lt=end_date).aggregate(quantity_sum=Sum('quantity'))

        records = records.filter(created_ts__gt=created_lower_bound, created_ts__lt=end_date)
        return cls.calculate_rows_from_records(duration_delta=duration_delta, records=records)


class CloudSystemReportsService:
    @staticmethod
    def get_expiring_report(cloud_system: CloudSystemId, organization: Organization, service: ChannelPartnerService,
                   period_start: datetime.date) -> List[UsageDetailViewType]:
        period_start = period_start.replace(day=1)
        period_end = period_start + relativedelta(months=1)
        records = ChannelPartnerServiceRecord.objects.filter(cloud_system=cloud_system, organization=organization,
                                                             service=service)
        return ExpiringUsageCalculatorService.generate_usage_list(service=service, records=records,
                                                                  start_date=period_start, end_date=period_end)

    @staticmethod
    def get_regular_report(cloud_system: CloudSystemId, organization: Organization, service: ChannelPartnerService,
                   period_start: datetime.date) -> RegularUsageDetailList:
        # TODO: Check if report already exists in S3 or DB before generating
        period_start = period_start.replace(day=1)
        period_end = period_start + relativedelta(months=1)
        records = ChannelPartnerServiceRecord.objects.filter(cloud_system=cloud_system, organization=organization, service=service)
        # TODO: Save report in S3 or DB
        return RegularUsageCalculator.generate_usage_list(records=records, start_date=period_start, end_date=period_end)


class OrganizationReportsService:
    @classmethod
    def get_system_reports(cls, systems: QuerySet[CloudSystemId], organization: Organization, service: ChannelPartnerService, period_start) -> SystemUsageList:
        system_reports: SystemUsageList() = []
        for system in systems:
            system_reports.append(SystemUsage(
                system_id=system.system_id, system_name=system.name,
                report=CloudSystemReportsService.get_regular_report(cloud_system=system, organization=organization, period_start=period_start, service=service)
            ))
        return system_reports

    @classmethod
    def build_service_summary_from_system_reports(cls, reports: SystemUsageList) -> OrganizationServiceReport:
        systems: OrganizationServiceSystems = []
        summary = OrganizationServiceSummary(channels=0, monthly_rate=0, daily_rate=0, systems=0)
        for report_dict in reports:
            system_id = report_dict['system_id']
            report = report_dict['report']
            total_usage = report[-1]
            # Don't count beginning and total rows
            changes_count = len(report) - 2
            if changes_count >= 1:
                last_changed = report[-2]['date']
            else:
                last_changed = None

            system_service_dict = SystemServiceSummary(
                channels=total_usage['channels'], monthly_rate=total_usage['monthly_rate'],
                daily_rate=total_usage['daily_rate'], system_id=system_id, changes_count=changes_count, last_changed=last_changed,
                system_name=report_dict['system_name']
            )
            summary['channels'] += system_service_dict['channels']
            summary['monthly_rate'] += system_service_dict['monthly_rate']
            summary['daily_rate'] += system_service_dict['daily_rate']
            summary['systems'] += 1
            systems.append(system_service_dict)
        return OrganizationServiceReport(systems=systems, summary=summary)

    @classmethod
    def get_regular_service_report(cls, organization: Organization, service: ChannelPartnerService, period_start: datetime.date) -> OrganizationServiceReport:
        # TODO: Check if report already exists in S3 or DB before generating
        period_start = period_start.replace(day=1)
        period_end = period_start + relativedelta(months=1)
        # TODO: Report should only include systems that are bound and not shutdown during the period.
        system_reports = cls.get_system_reports(systems=organization.cloud_systems.filter(created_ts__lte=period_end), organization=organization, service=service, period_start=period_start)
        # TODO: Save report in S3 or DB
        return cls.build_service_summary_from_system_reports(reports=system_reports)

    @classmethod
    def get_regular_detail_table(cls, organization: Organization, service: ChannelPartnerService, period_start: datetime.date) -> RegularUsageDetailList:
        # TODO: Check if report already exists in S3 or DB before generating
        period_start = period_start.replace(day=1)
        period_end = period_start + relativedelta(months=1)
        # TODO: Report should only include systems that are bound and not shutdown during the period.
        system_usages = cls.get_system_reports(organization.cloud_systems.filter(created_ts__lte=period_end),
                                                organization=organization, service=service, period_start=period_start)
        # TODO: Save report in S3 or DB
        return build_aggregate_from_usages(usages=system_usages)

    @classmethod
    def get_reports_for_services(cls, organization: Organization, period_start: datetime.date, services: QuerySet[ChannelPartnerService]) -> OrganizationServiceReports:
        service_reports: OrganizationServiceReports = {}
        for service in services:
            service_reports[service.id] = cls.get_regular_service_report(organization=organization, service=service, period_start=period_start)
        return service_reports

    @classmethod
    def build_organization_report_from_service_reports(cls, service_reports: OrganizationServiceReports, services: QuerySet[ChannelPartnerService]) -> OrganizationUsageReport:
        organization_report: OrganizationUsageReport = []
        for service in services:
            report = service_reports.get(service.id)
            if report:
                summary = report.get('summary')
                organization_report.append(OrganizationUsageReportRecord(
                    service_id=service.id, service_name=service.name, used_by=summary['systems'],
                    channels=summary['channels'], monthly_rate=summary['monthly_rate'], daily_rate=summary['daily_rate'],
                    expirations=[]
                ))
        return organization_report

    @classmethod
    def get_organization_report(cls, organization: Organization, period_start: datetime.date) -> OrganizationUsageReport:
        # TODO: Check if report already exists in S3 or DB before generating
        period_start = period_start.replace(day=1)
        services = organization.channel_partner.services.all()
        reports = cls.get_reports_for_services(organization=organization, period_start=period_start, services=services)
        # TODO: Save report in S3 or DB
        return cls.build_organization_report_from_service_reports(service_reports=reports, services=services)


class ChannelPartnerReportsService:
    @classmethod
    def get_organization_usages(cls, channel_partner: ChannelPartner, service: ChannelPartnerService, period_start: datetime.date) -> OrganizationUsageList:
        organizations = channel_partner.organizations.all()
        organization_usages: OrganizationUsageList = []
        for organization in organizations:
            organization_usages.append(OrganizationUsage(
                organization_id=organization.id, organization_name=organization.name,
                report=OrganizationReportsService.get_regular_detail_table(organization=organization, period_start=period_start, service=service)
            ))
        return organization_usages

    @classmethod
    def get_channel_partner_usages(cls, channel_partner: ChannelPartner, service: ChannelPartnerService,
                                period_start: datetime.date) -> ChannelPartnerUsageList:
        channel_partners = channel_partner.channel_partners.all()
        channel_partner_usages: ChannelPartnerUsageList = []
        for sub_channel_partner in channel_partners:
            sub_channel_usages = []
            for sub_service in sub_channel_partner.services.filter(parent_service=service):
                sub_channel_usages.append(ChannelPartnerUsage(
                    channel_partner_id=sub_channel_partner.id, channel_partner_name=sub_channel_partner.name,
                    report=cls.get_regular_detail_table(channel_partner=sub_channel_partner,
                                                                               period_start=period_start, service=sub_service)
                ))

            sub_channel_aggregate = build_aggregate_from_usages(sub_channel_usages)
            channel_partner_usages.append(ChannelPartnerUsage(
                    channel_partner_id=sub_channel_partner.id, channel_partner_name=sub_channel_partner.name,
                    report=sub_channel_aggregate
                ))

        return channel_partner_usages

    @classmethod
    def get_regular_detail_table(cls, channel_partner: ChannelPartner, service: ChannelPartnerService,
                                 period_start: datetime.date) -> RegularUsageDetailList:
        # TODO: Check if report already exists in S3 or DB before generating
        period_start = period_start.replace(day=1)
        organization_usages = cls.get_organization_usages(channel_partner=channel_partner,
                                                           service=service, period_start=period_start)
        channel_partner_usages = cls.get_channel_partner_usages(channel_partner=channel_partner,
                                                                service=service, period_start=period_start)
        # TODO: Save report in S3 or DB
        return build_aggregate_from_usages(usages=organization_usages + channel_partner_usages)

    @classmethod
    def build_service_summary_from_sub_entity_reports(cls, organization_usages: OrganizationUsageList, channel_partner_usages: ChannelPartnerUsageList) -> ChannelPartnerServiceReport:
        sub_entities: ChannelPartnerServiceEntities = []
        summary = ChannelPartnerServiceSummary(channels=0, monthly_rate=0, daily_rate=0, channel_partners=0, organizations=0)
        for type, usages in (('organization', organization_usages), ('channel_partner', channel_partner_usages)):
            type: CP_SUBTYPE
            for usage_dict in usages:
                usage_dict: Union[OrganizationUsage, ChannelPartnerUsage]
                report = usage_dict['report']
                total_usage = report[-1]
                # Don't count beginning and total rows
                changes_count = len(report) - 2
                if changes_count >= 1:
                    last_changed = report[-2]['date']
                else:
                    last_changed = None
                if type == ORGANIZATION:
                    sub_entity_service_dict = ChannelPartnerSubEntityServices(
                        channels=total_usage['channels'], monthly_rate=total_usage['monthly_rate'],
                        daily_rate=total_usage['daily_rate'], id=usage_dict['organization_id'], changes_count=changes_count,
                        last_changed=last_changed, name=usage_dict['organization_name'], type=type
                    )
                    summary['organizations'] += 1
                else:
                    sub_entity_service_dict = ChannelPartnerSubEntityServices(
                        channels=total_usage['channels'], monthly_rate=total_usage['monthly_rate'],
                        daily_rate=total_usage['daily_rate'], id=usage_dict['channel_partner_id'], changes_count=changes_count,
                        last_changed=last_changed, name=usage_dict['channel_partner_name'], type=type
                    )
                    summary['channel_partners'] += 1

                summary['channels'] += sub_entity_service_dict['channels']
                summary['monthly_rate'] += sub_entity_service_dict['monthly_rate']
                summary['daily_rate'] += sub_entity_service_dict['daily_rate']
                sub_entities.append(sub_entity_service_dict)
        return ChannelPartnerServiceReport(sub_entities=sub_entities, summary=summary)

    @classmethod
    def get_regular_service_report(cls, channel_partner: ChannelPartner, service: ChannelPartnerService,
                                   period_start: datetime.date) -> ChannelPartnerServiceReport:
        # TODO: Check if report already exists in S3 or DB before generating
        period_start = period_start.replace(day=1)
        organization_usages = cls.get_organization_usages(channel_partner=channel_partner,
                                                           service=service, period_start=period_start)
        channel_partner_usages = cls.get_channel_partner_usages(channel_partner=channel_partner,
                                                                service=service, period_start=period_start)
        # TODO: Save report in S3 or DB
        return cls.build_service_summary_from_sub_entity_reports(organization_usages=organization_usages, channel_partner_usages=channel_partner_usages)

    @classmethod
    def get_reports_for_services(cls, channel_partner: ChannelPartner, period_start: datetime.date,
                                 services: QuerySet[ChannelPartnerService]) -> ChannelPartnerServiceReports:
        service_reports: ChannelPartnerServiceReports = {}
        for service in services:
            service_reports[service.id] = cls.get_regular_service_report(channel_partner=channel_partner, service=service,
                                                                         period_start=period_start)
        return service_reports

    @classmethod
    def build_channel_partner_report_from_service_reports(cls, service_reports: ChannelPartnerServiceReports,
                                                       services: QuerySet[
                                                           ChannelPartnerService]) -> ChannelPartnerUsageReport:
        channel_partner_report: ChannelPartnerUsageReport = []
        for service in services:
            report = service_reports.get(service.id)
            if report:
                summary = report.get('summary')
                channel_partner_report.append(ChannelPartnerUsageReportRecord(
                    service_id=service.id, service_name=service.name, channels=summary['channels'],
                    monthly_rate=summary['monthly_rate'], daily_rate=summary['daily_rate'], expirations=[],
                    used_by_organizations=summary['organizations'], used_by_channel_partners=summary['channel_partners']
                ))
        return channel_partner_report

    @classmethod
    def get_channel_partner_report(cls, channel_partner: ChannelPartner,
                                period_start: datetime.date) -> ChannelPartnerUsageReport:
        # TODO: Check if report already exists in S3 or DB before generating
        period_start = period_start.replace(day=1)
        services = channel_partner.services.filter(sub_type=ChannelPartnerService.REGULAR)
        reports = cls.get_reports_for_services(channel_partner=channel_partner, period_start=period_start, services=services)
        # TODO: Save report in S3 or DB
        return cls.build_channel_partner_report_from_service_reports(service_reports=reports, services=services)

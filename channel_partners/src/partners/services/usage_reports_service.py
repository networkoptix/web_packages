import datetime
import inspect
import itertools
import sys
import uuid
from calendar import monthrange
from functools import wraps
from typing import (
    Any,
    Callable,
    Dict,
    List,
    Literal,
    Optional,
    Tuple,
    TypedDict,
    Union,
)

import structlog
from dateutil import parser
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
    ReportSnapshot,
)
from tools.helpers import get_today


logger = structlog.getLogger(__name__)

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
    expiration_date: Optional[datetime.date] | TotalUsageDateType


RegularUsageDetailList = List[RegularUsageDetailRecord]
ExpiringUsageDetailList = List[ExpiringUsageDetailRecord]


class SystemRegularUsage(TypedDict):
    system_id: uuid.UUID
    system_name: str

    report: RegularUsageDetailList


SystemRegularUsages = List[SystemRegularUsage]


class SystemExpiringUsage(TypedDict):
    system_id: uuid.UUID
    system_name: str
    report: ExpiringUsageDetailList


SystemExpiringUsages = List[SystemExpiringUsage]


class SystemRegularServiceSummary(TypedDict):
    system_id: uuid.UUID
    system_name: str
    channels: int
    monthly_rate: int
    daily_rate: int
    changes_count: int
    last_changed: Optional[datetime.date]


OrganizationRegularServiceSystems = List[SystemRegularServiceSummary]


class OrganizationRegularServiceSummary(TypedDict):
    channels: int
    monthly_rate: int
    daily_rate: int
    systems: int


class OrganizationRegularServiceReport(TypedDict):
    systems: OrganizationRegularServiceSystems
    summary: OrganizationRegularServiceSummary


OrganizationRegularServiceReports = Dict[Union[uuid.UUID, str], OrganizationRegularServiceReport]


class SystemExpiringServiceSummary(TypedDict):
    system_id: uuid.UUID
    system_name: str
    channels: int
    expiration_date: Optional[datetime.date]


OrganizationExpiringServiceSystems = List[SystemExpiringServiceSummary]


class OrganizationExpiringServiceSummary(TypedDict):
    channels: int
    systems: int
    expirations: List[datetime.date]


class OrganizationExpiringServiceReport(TypedDict):
    systems: OrganizationExpiringServiceSystems
    summary: OrganizationExpiringServiceSummary


OrganizationExpiringServiceReports = Dict[Union[uuid.UUID, str], OrganizationExpiringServiceReport]


class OrganizationUsageReportRecord(TypedDict):
    service_id: uuid.UUID
    service_name: str
    service_sub_type: int
    used_by: int
    channels: int
    monthly_rate: int
    daily_rate: int


OrganizationUsageReport = List[OrganizationUsageReportRecord]


class OrganizationRegularUsage(TypedDict):
    organization_id: uuid.UUID
    organization_name: str
    report: RegularUsageDetailList


OrganizationRegularUsageList = List[OrganizationRegularUsage]


class ChannelPartnerRegularUsage(TypedDict):
    channel_partner_id: uuid.UUID
    channel_partner_name: str
    report: RegularUsageDetailList


ChannelPartnerRegularUsageList = List[ChannelPartnerRegularUsage]


class OrganizationExpiringUsage(TypedDict):
    organization_id: uuid.UUID
    organization_name: str
    report: ExpiringUsageDetailList


OrganizationExpiringUsageList = List[OrganizationExpiringUsage]


class ChannelPartnerExpiringUsage(TypedDict):
    channel_partner_id: uuid.UUID
    channel_partner_name: str
    report: ExpiringUsageDetailList


ChannelPartnerExpiringUsageList = List[ChannelPartnerExpiringUsage]


ORGANIZATION = 'organization'
CHANNEL_PARTNER = 'channel_partner'
CP_SUBTYPE = Literal['organization', 'channel_partner']


class ChannelPartnerRegularServiceEntity(TypedDict):
    id: uuid.UUID
    type: CP_SUBTYPE
    name: str
    channels: int
    monthly_rate: int
    daily_rate: int
    changes_count: int
    last_changed: Optional[datetime.date]


ChannelPartnerRegularServiceEntities = List[ChannelPartnerRegularServiceEntity]


class ChannelPartnerRegularServiceSummary(TypedDict):
    channels: int
    monthly_rate: int
    daily_rate: int
    organizations: int
    channel_partners: int



class ChannelPartnerRegularServiceReport(TypedDict):
    sub_entities: ChannelPartnerRegularServiceEntities
    summary: ChannelPartnerRegularServiceSummary


ChannelPartnerRegularServiceReports = Dict[Union[uuid.UUID, str], ChannelPartnerRegularServiceReport]


class ChannelPartnerExpiringServiceEntity(TypedDict):
    id: uuid.UUID
    type: CP_SUBTYPE
    name: str
    channels: int
    expirations: List[datetime.date]


ChannelPartnerExpiringServiceEntities = List[ChannelPartnerExpiringServiceEntity]


class ChannelPartnerExpiringServiceSummary(TypedDict):
    channels: int
    organizations: int
    channel_partners: int



class ChannelPartnerExpiringServiceReport(TypedDict):
    sub_entities: ChannelPartnerExpiringServiceEntities
    summary: ChannelPartnerExpiringServiceSummary


ChannelPartnerExpiringServiceReports = Dict[Union[uuid.UUID, str], ChannelPartnerExpiringServiceReport]


class ChannelPartnerUsageReportRecord(TypedDict):
    service_id: uuid.UUID
    service_name: str
    parent_service_id: uuid.UUID
    parent_service_name: str
    used_by_organizations: int
    used_by_channel_partners: int
    channels: int
    monthly_rate: int
    daily_rate: int
    sub_type: int


ChannelPartnerUsageReport = List[ChannelPartnerUsageReportRecord]

ReportsTypes = Union[
    RegularUsageDetailList,
    SystemRegularUsages,
    SystemExpiringUsages,
    OrganizationRegularServiceReport,
    OrganizationExpiringServiceReport,
    RegularUsageDetailList,
    ExpiringUsageDetailList,
    OrganizationUsageReport,
    OrganizationRegularUsageList,
    OrganizationExpiringUsageList,
    ChannelPartnerRegularUsageList,
    ChannelPartnerExpiringUsageList,
    ChannelPartnerRegularServiceReport,
    ChannelPartnerExpiringServiceReport,
    ChannelPartnerUsageReport,
]


class ReportSnapshotDoesNotExists(Exception):
    pass


class ReportSnapshotService:
    """
    Helper class to simplify fetching and saving report snapshots.
    """
    def __init__(
            self,
            entity_id: uuid.UUID,
            report_type: ReportSnapshot.ReportType,
            period_start: datetime.date,
            service_id: Optional[uuid.UUID] = None,
            organization_id: Optional[uuid.UUID] = None,
            generate: bool = False,
    ):
        """
        Params:
            entity_id (UUID, required): ID if entity to save
            report_type (ReportSnapshot.ReportType, required): report type
            period_start (datetime.date, required): start date of report
            service_id (UUID, optional): parent_service ID which report is generated for
            generate (bool, optional): either generate report or not. Defaults to False
        """
        self.entity_id = entity_id
        self.report_type = report_type
        period_start, period_end = get_period_boundaries(period_start)
        self.period_start = period_start
        if isinstance(self.period_start, datetime.datetime):
            self.period_start = self.period_start.date()
        self.next_period_start = period_end
        if isinstance(self.next_period_start, datetime.datetime):
            self.next_period_start = self.next_period_start.date()
        if report_type == ReportSnapshot.ReportType.system_regular_report:
            self.organization_id = organization_id
        else:
            self.organization_id = None
        self.service_id = service_id
        self.generate = generate
        self.snapshot = self.get_snapshot()

    def __str__(self):
        return f"entity {self.entity_id}, type {self.report_type.label}, start date {self.period_start}."

    @property
    def is_provisional(self) -> bool:
        """
        Checks if the requested period is provisional.
        It returns True if the next period starting date
        is greater than then current date.
        """
        return self.next_period_start > get_today()

    @property
    def lookup_kwargs(self) -> dict:
        """
        Keyword arguments to pass to DB lookup query
        """
        lookup_kwargs = {
            'entity_id': self.entity_id,
            'report_type': self.report_type,
            'start_date': self.period_start,
        }
        if self.report_type == ReportSnapshot.ReportType.system_regular_report:
            lookup_kwargs['organization_id'] = self.organization_id
        if self.service_id:
            lookup_kwargs['service_id'] = self.service_id
        else:
            lookup_kwargs['service_id__isnull'] = True
        return lookup_kwargs

    @property
    def store_kwargs(self) -> dict:
        """
        Keyword arguments to pass to DB save query
        """
        return {
            'provisional': self.is_provisional,
            **self.lookup_kwargs
        }

    def get_snapshot(self) -> Optional[ReportSnapshot]:
        """
        Returns a report snapshot if it exists, otherwise returns None
        """
        lookup_kwargs = {
            'entity_id': self.entity_id,
            'report_type': self.report_type,
            'start_date': self.period_start,
        }

        if self.service_id:
            lookup_kwargs['service_id'] = self.service_id
        else:
            lookup_kwargs['service_id__isnull'] = True
        try:
            return ReportSnapshot.objects.get(**lookup_kwargs)
        except ReportSnapshot.DoesNotExist:
            return None


    @property
    def needs_generation(self) -> bool:
        """
        Determines whether a report requires generation.

        Returns:
            bool: True if the report needs to be generated, False otherwise.

        Notes:
            A report needs to be generated if generate=True and either:
                - The snapshot does not exist (i.e., it has never been generated before).
                - The report is provisional and was last updated on a different day than today.

        """

        if not self.generate:
            return False
        if self.snapshot and not self.snapshot.provisional:
            # check if stored snapshot is still in provisional stated (until first day of a month)
            return False
        if self.snapshot and self.snapshot.updated_ts.date() == get_today():
            # check if snapshot has been updated today
            return False
        return True

    def save_snapshot(self, report: ReportsTypes) -> None:
        """
        Saves generated report to DB. If snapshot exists it will be updated with new data.
        """
        if self.snapshot:
            self.snapshot.report_data = report
            self.snapshot.save()
        else:
            ReportSnapshot.objects.create(
                entity_id=self.entity_id,
                report_type=self.report_type,
                start_date=self.period_start,
                service_id=self.service_id,
                report_data=report,
                organization_id=self.organization_id,
            )


def get_period_boundaries(period_start: datetime.date | datetime.datetime) -> Tuple[datetime.date, datetime.date]:
    if isinstance(period_start, datetime.datetime):
        period_start = period_start.date()

    period_start = period_start.replace(day=1)
    period_end = period_start + relativedelta(months=1)
    return period_start, period_end


def wrapped_report_func(
        func,
        entity_obj_name: str,
        entity_id_name: str,
        report_type: ReportSnapshot.ReportType,
        *args,
        **kwargs,
):
    """
    Report method wrapper that calls original report function when
    generation is requested and saved report does not exist. If
    provisional report is called with generate=True than report
    will be generated, when report is not provisional saved one will
    be returned.

        :param func :type Callable: original report method
        :param entity_obj_name :type str: name of report entity object
            as it declared in original method spec
        :param entity_id_name  :type str: name if ID attribute of an entity
        :param report_type  :type ReportSnapshot.ReportType: report type
        :param args: original report method arguments
        :param kwargs: original report method keyword arguments
        :returns: saved or generated report data
    """
    func_args = inspect.signature(func).bind(*args, **kwargs)
    func_args.apply_defaults()
    if not all([
        entity_obj_name in func_args.arguments,
        'period_start' in func_args.arguments,
    ]):
        raise ValueError(f'Cannot find required arguments {entity_obj_name},'
                         f' "period_start" in the function scope.')

    entity_obj = func_args.arguments.get(entity_obj_name, None)
    if not entity_obj:
        raise ValueError(f'Cannot find entity "{entity_obj_name}" object in passed arguments.')
    entity_id = getattr(entity_obj, entity_id_name, None)
    service_id = getattr(func_args.arguments.get('service', None), 'id', None)
    if report_type is ReportSnapshot.ReportType.system_regular_report:
        organization_id = getattr(func_args.arguments.get('organization', None), 'id', None)
    else:
        organization_id = None
    snapshot_service = ReportSnapshotService(
        entity_id=entity_id,
        report_type=report_type,
        period_start=func_args.arguments['period_start'],
        service_id=service_id,
        generate=func_args.arguments.get('generate', False),
        organization_id=organization_id,
    )
    if not snapshot_service.snapshot and not snapshot_service.generate:
        logger.debug(
            "ReportSnapshot does not exists for service",
            entity_id=entity_id,
            report_type=report_type,
            period_start=func_args.arguments['period_start'],
            service_id=service_id,)
        raise ReportSnapshotDoesNotExists(
            f"ReportSnapshot does not exists for: {snapshot_service}.")
    if not snapshot_service.needs_generation:
        return snapshot_service.snapshot.report_data
    report = func(*args, **kwargs)
    snapshot_service.save_snapshot(report)
    return report


def validate_service_sub_type(expiring: bool) -> Callable[[Callable], Callable[..., Any]]:
    def decorator(func) -> Callable[..., Any]:
        @wraps(func)
        def wrapper(*args, **kwargs) -> Any:
            func_args = inspect.signature(func).bind(*args, **kwargs)
            func_args.apply_defaults()
            service: ChannelPartnerService = func_args.arguments.get('service', None)
            if service and service.is_expiring != expiring:
                expected_type_str = 'expiring' if expiring else 'regular'
                raise ValueError(f'Function must be called with a {expected_type_str} service')
            return func(*args, **kwargs)
        return wrapper

    return decorator


def get_saved_or_generate(
        entity_obj_name: str,
        entity_id_name: str,
        report_type: ReportSnapshot.ReportType,
) -> Callable[[Callable], Callable[..., Any]]:
    """
    Decorator to wrap report method in function with using fetching
    and saving data to/from database.
    :param entity_obj_name: Report entity object name as it defined in report method spec
    :param entity_id_name: Entity ID attribute name
    :param report_type: Report type
    """
    def decorator(func) -> Callable[..., Any]:
        @wraps(func)
        def wrapper(*args, **kwargs) -> Any:
            return wrapped_report_func(
                func,
                entity_obj_name,
                entity_id_name,
                report_type,
                *args,
                **kwargs,
            )

        return wrapper

    return decorator


def usage_list_sort_key(row: RegularUsageDetailRecord | ExpiringUsageDetailRecord):
    key = next((key for key in ['date', 'expiration_date'] if key in row), 'date')
    if row[key] == BeginningOfPeriodDate or row[key] is None:
        return -1
    elif row[key] == TotalUsageDate:
        return MAX_SIZE
    elif isinstance(row[key], datetime.datetime):
        return row[key].timestamp()
    elif isinstance(row[key], datetime.date):
        date = row[key]
        return datetime.datetime(date.year, date.month, date.day).timestamp()
    return parser.parse(row[key]).timestamp()


def build_aggregate_from_regular_usages(
        usages: Union[SystemRegularUsages, OrganizationRegularUsageList, ChannelPartnerRegularUsageList]) -> RegularUsageDetailList:
    usage_details: RegularUsageDetailList = []
    last_date = None
    sorted_usage_records = sorted(itertools.chain.from_iterable((report_dict['report'] for report_dict in usages)),
                            key=usage_list_sort_key)

    for record in sorted_usage_records:
        record: RegularUsageDetailRecord
        transactions = record.get('transactions')
        if record['date'] == last_date:
            logger.debug(
                "Merging usage records",
                current_object=usage_details[-1],
                new_record=record)
            current_object = usage_details[-1]
            current_object['channels'] += record['channels']
            current_object['monthly_rate'] += record['monthly_rate']
            current_object['daily_rate'] += record['daily_rate']
            if transactions is not None:
                current_object['transactions'] = current_object.get('transactions', 0) + record['transactions']
        else:
            logger.debug(
                "Appending usage record",
                record=record)
            usage_details.append(RegularUsageDetailRecord(
                date=record['date'], channels=record['channels'], monthly_rate=record['monthly_rate'],
                daily_rate=record['daily_rate']
            ))
            if transactions is not None:
                usage_details[-1]['transactions'] = transactions
            last_date = record['date']

    if not usage_details:
        logger.debug("No usage details found, adding default records")
        usage_details: RegularUsageDetailList = [
            RegularUsageDetailRecord(date=BeginningOfPeriodDate, transactions=0, monthly_rate=0, daily_rate=0,
                                     channels=0),
            RegularUsageDetailRecord(date=TotalUsageDate, transactions=0, monthly_rate=0, daily_rate=0,
                                     channels=0)
        ]
    return usage_details


def build_aggregate_from_expiring_usages(
        usages: Union[
            SystemExpiringUsages,
            OrganizationExpiringUsageList,
            ChannelPartnerExpiringUsageList
        ]) -> ExpiringUsageDetailList:
    usage_details: ExpiringUsageDetailList = []
    last_expiration_date = None
    total_channels = 0

    # Process each usage record
    sorted_usage_records = sorted(
        itertools.chain.from_iterable(report['report'] for report in usages),
        key=usage_list_sort_key
    )

    record: ExpiringUsageDetailRecord
    for record in sorted_usage_records:
        expiration_date = record['expiration_date']
        channels = record['channels']

        if expiration_date:
            if expiration_date == last_expiration_date:
                # Aggregate channels if the expiration date matches the last one
                usage_details[-1]['channels'] += channels
            else:
                usage_details.append({
                    'expiration_date': expiration_date,
                    'channels': channels
                })
                last_expiration_date = expiration_date
            total_channels += channels
    logger.debug(
        "Built aggregate from expiring usages",
        total_channels=total_channels,
        usage_details_count=len(usage_details))
    # Handle edge case for empty usage details
    if not usage_details:
        usage_details.append({'expiration_date': TotalUsageDate, 'channels': 0})

    # Append total channels record
    if usage_details[-1]['expiration_date'] != TotalUsageDate:
        usage_details.append({
            'expiration_date': TotalUsageDate,
            'channels': total_channels
        })
        logger.debug(
            "Appended total channels record to usage details",
            total_channels=total_channels)
    return usage_details


class RegularUsageCalculator:
    @staticmethod
    def calculate_beginning_usage_row(records: QuerySet[ChannelPartnerServiceRecord]):
        records_aggregate = records.aggregate(channels=Sum('quantity', default=0))
        return RegularUsageDetailRecord(
            date=BeginningOfPeriodDate, channels=records_aggregate['channels'],
            monthly_rate=records_aggregate['channels'], daily_rate=0
        )

    @staticmethod
    def calculate_daily_delta(
            channel_delta: int,
            total_usage: dict,
            remaining_days: int,
            daily_delta_from_prorated_monthly_channels: int
    ) -> int:
        """
        Calculate the daily delta based on channel delta, total usage, remaining days, and daily delta from prorated monthly channels.

        Args:
            channel_delta (int): The change in channel count.
            total_usage (dict): A dictionary containing the total usage data.
            remaining_days (int): The remaining days in the month.
            daily_delta_from_prorated_monthly_channels (int): The daily delta calculated from prorated monthly channels.

        Returns:
            int: The calculated daily delta.
        """
        # Calculate the difference between total channels and monthly rate
        channel_monthly_diff = total_usage['channels'] - total_usage['monthly_rate']

        # Calculate the maximum value between channel_delta and the negative of channel_monthly_diff
        max_value = max(channel_delta, -channel_monthly_diff)

        # Multiply the max_value by remaining_days
        delta = max_value * remaining_days

        # Add the daily_delta_from_prorated_monthly_channels to get the final daily_delta
        daily_delta = delta + daily_delta_from_prorated_monthly_channels

        return daily_delta

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
                daily_delta = RegularUsageCalculator.calculate_daily_delta(
                    channel_delta=channel_delta,
                    total_usage=total_usage,
                    remaining_days=remaining_days,
                    daily_delta_from_prorated_monthly_channels=daily_delta_from_prorated_monthly_channels)
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
        logger.debug(
            "Calculated usage steps from records",
            record_count=records.count())
        return usage_list



    @classmethod
    def generate_usage_list(
            cls,
            records: QuerySet[ChannelPartnerServiceRecord],
            start_date: datetime.date,
            end_date: datetime.date
    ) -> RegularUsageDetailList:
        records_start = records.filter(created_ts__lt=start_date)
        records_change = records.filter(created_ts__gte=start_date, created_ts__lt=end_date)

        beginning_usage = cls.calculate_beginning_usage_row(records=records_start)
        usage_list = cls.calculate_steps_from_records(
            records=records_change.order_by('created_ts'),
            beginning_usage=beginning_usage)

        logger.debug("Generated usage list", usage_list_count=len(usage_list))
        return usage_list


# Not actual, waiting on updates from design
class ExpiringUsageCalculatorService:
    @classmethod
    def generate_usage_record(
            cls,
            records: QuerySet[ChannelPartnerServiceRecord],
            service: ChannelPartnerService,
            end_date: datetime.date
    ) -> ExpiringUsageDetailRecord:
        duration_delta = relativedelta(months=service.duration)
        first_usage = records.order_by('created_ts').first()
        if first_usage:
            expiration = first_usage.created_ts.date() + duration_delta
            records_sum = records.filter(created_ts__lt=end_date).aggregate(channels=Sum('quantity', default=0))
            return ExpiringUsageDetailRecord(channels=records_sum['channels'], expiration_date=expiration)
        logger.debug(
            "Generating expiring record for service",
            service=service.name,
            end_date=end_date,
            records_count=records.count(),
            first_usage=first_usage)
        return ExpiringUsageDetailRecord(channels=0, expiration_date=None)


class CloudSystemReportsService:
    @staticmethod
    @get_saved_or_generate(entity_obj_name='cloud_system',
                           entity_id_name='system_id',
                           report_type=ReportSnapshot.ReportType.system_expiring_report)
    @validate_service_sub_type(expiring=True)
    def get_expiring_report(
            cloud_system: CloudSystemId,
            organization: Organization,
            service: ChannelPartnerService,
            period_start: datetime.date,
            generate: bool = False
    ) -> ExpiringUsageDetailList:
        period_start, period_end = get_period_boundaries(period_start)
        records = ChannelPartnerServiceRecord.objects.filter(
            cloud_system=cloud_system,
            organization=organization,
            service=service)
        logger.debug(
            "Generating expiring report for cloud system of organization",
            cloud_system=cloud_system.system_id,
            organization=organization.name,
            period_start=period_start,
            service=service.name,
            records_count=records.count())
        return [ExpiringUsageCalculatorService.generate_usage_record(
            service=service,
            records=records,
            end_date=period_end
        )]

    @staticmethod
    @get_saved_or_generate(entity_obj_name='cloud_system',
                           entity_id_name='system_id',
                           report_type=ReportSnapshot.ReportType.system_regular_report)
    @validate_service_sub_type(expiring=False)
    def get_regular_report(
            cloud_system: CloudSystemId,
            organization: Organization,
            service: ChannelPartnerService,
            period_start: datetime.date,
            generate: bool = False,
    ) -> RegularUsageDetailList:
        period_start, period_end = get_period_boundaries(period_start)

        records = ChannelPartnerServiceRecord.objects.filter(
            cloud_system=cloud_system,
            organization=organization,
            service=service
        )
        report = RegularUsageCalculator.generate_usage_list(
            records=records,
            start_date=period_start,
            end_date=period_end
        )
        logger.debug(
            "Generated regular report for cloud system of organization",
            cloud_system=cloud_system.system_id,
            organization=organization.name,
            period_start=period_start,
            service=service.name)
        return report


class OrganizationReportsService:
    @classmethod
    @get_saved_or_generate(entity_obj_name='organization',
                           entity_id_name='id',
                           report_type=ReportSnapshot.ReportType.organization_regular_systems_reports)
    @validate_service_sub_type(expiring=False)
    def get_regular_system_reports(
            cls,
            organization: Organization,
            service: ChannelPartnerService,
            period_start: datetime.date,
            generate: bool = False,
    ) -> SystemRegularUsages:
        period_start, period_end = get_period_boundaries(period_start)
        system_reports: SystemRegularUsages = []
        # TODO: Report should only include systems that are bound and not shutdown during the period.

        systems = organization.cloud_systems.filter(created_ts__lte=period_end)
        for system in systems:
            system_reports.append(
                SystemRegularUsage(
                    system_id=system.system_id,
                    system_name=system.name,
                    report=CloudSystemReportsService.get_regular_report(
                                cloud_system=system,
                                organization=organization,
                                period_start=period_start,
                                service=service,
                                generate=generate)
            ))
        logger.debug(
            "Generated regular system reports for organization",
            organization=organization.name,
            period_start=period_start,
            service=service.name,
            systems=[system.name for system in systems])
        return system_reports

    @classmethod
    @get_saved_or_generate(entity_obj_name='organization',
                           entity_id_name='id',
                           report_type=ReportSnapshot.ReportType.organization_expiring_systems_reports)
    @validate_service_sub_type(expiring=True)
    def get_expiring_system_reports(
            cls,
            organization: Organization,
            service: ChannelPartnerService,
            period_start: datetime.date,
            generate: bool = False,
    ) -> SystemExpiringUsages:
        period_start, period_end = get_period_boundaries(period_start)
        system_reports: SystemExpiringUsages = []
        # TODO: Report should only include systems that are bound and not shutdown during the period.

        systems = organization.cloud_systems.filter(created_ts__lte=period_end)
        for system in systems:
            system_reports.append(
                SystemExpiringUsage(
                    system_id=system.system_id,
                    system_name=system.name,
                    report=CloudSystemReportsService.get_expiring_report(
                        cloud_system=system,
                        organization=organization,
                        period_start=period_start,
                        service=service,
                        generate=generate)
                ))
        logger.debug(
            "Generated expiring system reports for organization",
            organization=organization.name,
            period_start=period_start,
            service=service.name,
            systems=[system.name for system in systems])
        return system_reports

    @classmethod
    def build_regular_service_summary_from_system_reports(
            cls,
            reports: SystemRegularUsages
    ) -> OrganizationRegularServiceReport:
        systems: OrganizationRegularServiceSystems = []
        summary = OrganizationRegularServiceSummary(channels=0, monthly_rate=0, daily_rate=0, systems=0)
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

            system_service_dict = SystemRegularServiceSummary(
                channels=total_usage['channels'],
                monthly_rate=total_usage['monthly_rate'],
                daily_rate=total_usage['daily_rate'],
                system_id=system_id,
                changes_count=changes_count,
                last_changed=last_changed,
                system_name=report_dict['system_name']
            )
            summary['channels'] += system_service_dict['channels']
            summary['monthly_rate'] += system_service_dict['monthly_rate']
            summary['daily_rate'] += system_service_dict['daily_rate']
            summary['systems'] += 1
            systems.append(system_service_dict)
        logger.debug(
            "Generated regular service summary from system reports",
            systems=systems,
            summary=summary)
        return OrganizationRegularServiceReport(systems=systems, summary=summary)

    @classmethod
    def build_expiring_service_summary_from_system_reports(
            cls,
            reports: SystemExpiringUsages
    ) -> OrganizationExpiringServiceReport:
        systems: OrganizationExpiringServiceSystems = []
        summary = OrganizationExpiringServiceSummary(channels=0, systems=0, expirations=[])
        expirations = set()
        for report_dict in reports:
            system_id = report_dict['system_id']
            report = report_dict['report'][0]

            system_service_dict = SystemExpiringServiceSummary(
                channels=report['channels'],
                system_id=system_id,
                system_name=report_dict['system_name'],
                expiration_date=report['expiration_date']
            )
            summary['channels'] += system_service_dict['channels']
            summary['systems'] += 1
            if system_service_dict['expiration_date']:
                expirations.add(system_service_dict['expiration_date'])
            systems.append(system_service_dict)
        summary['expirations'] = list(expirations)
        logger.debug(
            "Generated expiring service summary from system reports",
            systems=systems,
            summary=summary)
        return OrganizationExpiringServiceReport(systems=systems, summary=summary)

    @classmethod
    @get_saved_or_generate(entity_obj_name='organization',
                           entity_id_name='id',
                           report_type=ReportSnapshot.ReportType.organization_regular_service_report)
    @validate_service_sub_type(expiring=False)
    def get_regular_service_report(
            cls,
            organization: Organization,
            service: ChannelPartnerService,
            period_start: datetime.date,
            generate: bool = False,
    ) -> OrganizationRegularServiceReport:
        period_start, period_end = get_period_boundaries(period_start)
        system_reports = cls.get_regular_system_reports(
            organization=organization,
            service=service,
            period_start=period_start,
            generate=generate)
        logger.debug(
            "Generated regular service report from system reports",
            organization=organization.name,
            service=service.name,
            system_reports=system_reports)
        return cls.build_regular_service_summary_from_system_reports(reports=system_reports)

    @classmethod
    @get_saved_or_generate(entity_obj_name='organization',
                           entity_id_name='id',
                           report_type=ReportSnapshot.ReportType.organization_regular_detail_table)
    @validate_service_sub_type(expiring=False)
    def get_regular_detail_table(
            cls,
            organization: Organization,
            service: ChannelPartnerService,
            period_start: datetime.date,
            generate: bool = False,
    ) -> RegularUsageDetailList:
        period_start, period_end = get_period_boundaries(period_start)
        system_usages = cls.get_regular_system_reports(
            organization=organization,
            service=service,
            period_start=period_start,
            generate=generate)
        logger.debug(
            "Generated regular detail table from system reports",
            organization=organization.name,
            service=service.name,
            system_usages=system_usages)
        return build_aggregate_from_regular_usages(usages=system_usages)

    @classmethod
    @get_saved_or_generate(entity_obj_name='organization',
                           entity_id_name='id',
                           report_type=ReportSnapshot.ReportType.organization_expiring_detail_table)
    @validate_service_sub_type(expiring=True)
    def get_expiring_detail_table(
            cls,
            organization: Organization,
            service: ChannelPartnerService,
            period_start: datetime.date,
            generate: bool = False,
    ) -> ExpiringUsageDetailList:
        period_start, period_end = get_period_boundaries(period_start)
        system_usages = cls.get_expiring_system_reports(
            organization=organization,
            service=service,
            period_start=period_start,
            generate=generate)
        logger.debug(
            "Generated expiring detail table from system reports",
            organization=organization.name,
            service=service.name,
            system_usages=system_usages)
        return build_aggregate_from_expiring_usages(usages=system_usages)

    @classmethod
    def get_regular_reports_for_services(
            cls,
            organization: Organization,
            period_start: datetime.date,
            services: QuerySet[ChannelPartnerService],
            generate: bool = False,
    ) -> OrganizationRegularServiceReports:
        service_reports: OrganizationRegularServiceReports = {}
        for service in services:
            report = cls.get_regular_service_report(
                organization=organization,
                service=service,
                period_start=period_start,
                generate=generate,
            )
            service_reports[service.id] = report
        logger.debug(
            "Generated regular reports for all services of organization",
            organization=organization.name,
            period_start=period_start,
            services=[service.name for service in services])
        return service_reports

    @classmethod
    def get_expiring_reports_for_services(
            cls,
            organization: Organization,
            period_start: datetime.date,
            services: QuerySet[ChannelPartnerService],
            generate: bool = False,
    ) -> OrganizationExpiringServiceReports:
        service_reports: OrganizationExpiringServiceReports = {}
        for service in services:
            report = cls.get_expiring_service_report(
                organization=organization,
                service=service,
                period_start=period_start,
                generate=generate,
            )
            service_reports[service.id] = report
        logger.debug(
            "Generated expiring reports for all services of organization",
            organization=organization.name,
            period_start=period_start,
            services=[service.name for service in services])
        return service_reports

    @classmethod
    @get_saved_or_generate(entity_obj_name='organization',
                           entity_id_name='id',
                           report_type=ReportSnapshot.ReportType.organization_expiring_service_report)
    @validate_service_sub_type(expiring=True)
    def get_expiring_service_report(
            cls,
            organization: Organization,
            service: ChannelPartnerService,
            period_start: datetime.date,
            generate: bool = False,
    ) -> OrganizationExpiringServiceReport:
        period_start, period_end = get_period_boundaries(period_start)
        system_reports = cls.get_expiring_system_reports(
            organization=organization,
            service=service,
            period_start=period_start,
            generate=generate,
        )
        logger.debug("Generated expiring service report from system reports")
        return cls.build_expiring_service_summary_from_system_reports(reports=system_reports)

    @classmethod
    def build_organization_report_from_service_reports(
            cls,
            regular_service_reports: OrganizationRegularServiceReports,
            expiring_service_reports: OrganizationExpiringServiceReports,
            services: QuerySet[ChannelPartnerService]
    ) -> OrganizationUsageReport:
        organization_report: OrganizationUsageReport = []
        reports = {**regular_service_reports, **expiring_service_reports}
        for service in services:
            report = reports.get(service.id)
            if report:
                summary = report.get('summary')
                organization_report.append(
                    OrganizationUsageReportRecord(
                        service_id=service.id,
                        service_name=service.name,
                        service_sub_type=service.sub_type,
                        used_by=summary['systems'],
                        channels=summary['channels'],
                        monthly_rate=summary.get('monthly_rate', 0),
                        daily_rate=summary.get('daily_rate', 0)
                    )
                )
        logger.debug("Generated organization report from service reports")
        return organization_report

    @classmethod
    @get_saved_or_generate(entity_obj_name='organization',
                           entity_id_name='id',
                           report_type=ReportSnapshot.ReportType.organization_usage_report)
    def get_organization_report(
            cls,
            organization: Organization,
            period_start: datetime.date,
            generate: bool = False,
    ) -> OrganizationUsageReport:
        period_start, period_end = get_period_boundaries(period_start)
        services = organization.channel_partner.services.all()

        logger.debug(
            "Generating regular reports for all services of organization",
            organization=organization.name,
            period_start=period_start,
            period_end=period_end,
            services=[service.name for service in services])
        regular_reports = cls.get_regular_reports_for_services(
            organization=organization,
            period_start=period_start,
            services=services.filter(sub_type=ChannelPartnerService.REGULAR),
            generate=generate)

        logger.debug(
            "Generating expiring reports for all services of organization",
            organization=organization.name,
            period_start=period_start,
            period_end=period_end,
            services=[service.name for service in services])
        expiring_reports = cls.get_expiring_reports_for_services(
            organization=organization,
            period_start=period_start,
            services=services.filter(sub_type__in=[ChannelPartnerService.DEMO, ChannelPartnerService.TRIAL]),
            generate=generate)

        return cls.build_organization_report_from_service_reports(
            regular_service_reports=regular_reports, expiring_service_reports=expiring_reports, services=services
        )


class ChannelPartnerReportsService:
    @classmethod
    @get_saved_or_generate(entity_obj_name='channel_partner',
                           entity_id_name='id',
                           report_type=ReportSnapshot.ReportType.channel_partner_organization_regular_usages)
    @validate_service_sub_type(expiring=False)
    def get_regular_organization_usages(
            cls,
            channel_partner: ChannelPartner,
            service: ChannelPartnerService,
            period_start: datetime.date,
            generate: bool = False,
    ) -> OrganizationRegularUsageList:
        organizations = channel_partner.organizations.all()
        organization_usages: OrganizationRegularUsageList = []
        for organization in organizations:
            logger.debug(
                "Generating regular report for organization",
                organization=organization.name,
                service=service.name,
                period_start=period_start,
                generate=generate)
            organization_usages.append(
                OrganizationRegularUsage(
                    organization_id=organization.id,
                    organization_name=organization.name,
                    report=OrganizationReportsService.get_regular_detail_table(
                                organization=organization,
                                period_start=period_start,
                                service=service,
                                generate=generate)
                )
            )
        logger.debug(
            "Generated regular report for all organizations",
            channel_partner=channel_partner.name,
            service=service.name,
            organization_usages=organization_usages,
        )
        return organization_usages

    @classmethod
    @get_saved_or_generate(entity_obj_name='channel_partner',
                           entity_id_name='id',
                           report_type=ReportSnapshot.ReportType.channel_partner_organization_expiring_usages)
    @validate_service_sub_type(expiring=True)
    def get_expiring_organization_usages(
            cls,
            channel_partner: ChannelPartner,
            service: ChannelPartnerService,
            period_start: datetime.date,
            generate: bool = False,
    ) -> OrganizationExpiringUsageList:
        organizations = channel_partner.organizations.all()
        organization_usages: OrganizationExpiringUsageList = []
        for organization in organizations:
            logger.debug(
                "Generating expiring report for organization",
                organization=organization.name,
                service=service.name,
                period_start=period_start,
                generate=generate)
            organization_usages.append(
                OrganizationExpiringUsage(
                    organization_id=organization.id,
                    organization_name=organization.name,
                    report=OrganizationReportsService.get_expiring_detail_table(
                        organization=organization,
                        period_start=period_start,
                        service=service,
                        generate=generate)
                )
            )
        return organization_usages

    @classmethod
    @get_saved_or_generate(entity_obj_name='channel_partner',
                           entity_id_name='id',
                           report_type=ReportSnapshot.ReportType.channel_partner_channel_partner_regular_usages)
    @validate_service_sub_type(expiring=False)
    def get_regular_channel_partner_usages(
            cls,
            channel_partner: ChannelPartner,
            service: ChannelPartnerService,
            period_start: datetime.date,
            generate: bool = False,
    ) -> ChannelPartnerRegularUsageList:
        channel_partners = channel_partner.channel_partners.all()
        channel_partner_usages: ChannelPartnerRegularUsageList = []
        for sub_channel_partner in channel_partners:
            logger.debug(
                "Generating regular report for channel partner",
                channel_partner=sub_channel_partner.name,
                service=service.name,
                period_start=period_start,
                generate=generate)
            channel_partner_usages.append(ChannelPartnerRegularUsage(
                channel_partner_id=sub_channel_partner.id,
                channel_partner_name=sub_channel_partner.name,
                report=cls.get_regular_detail_table(
                    channel_partner=sub_channel_partner,
                    period_start=period_start,
                    service=service,
                    generate=generate
                )
            ))

        return channel_partner_usages

    @classmethod
    @get_saved_or_generate(entity_obj_name='channel_partner',
                           entity_id_name='id',
                           report_type=ReportSnapshot.ReportType.channel_partner_channel_partner_expiring_usages)
    @validate_service_sub_type(expiring=True)
    def get_expiring_channel_partner_usages(
            cls,
            channel_partner: ChannelPartner,
            service: ChannelPartnerService,
            period_start: datetime.date,
            generate: bool = False,
    ) -> ChannelPartnerExpiringUsageList:
        channel_partners = channel_partner.channel_partners.all()
        channel_partner_usages: ChannelPartnerExpiringUsageList = []
        for sub_channel_partner in channel_partners:
            channel_partner_usages.append(ChannelPartnerExpiringUsage(
                channel_partner_id=sub_channel_partner.id,
                channel_partner_name=sub_channel_partner.name,
                report=cls.get_expiring_detail_table(
                    channel_partner=sub_channel_partner,
                    period_start=period_start,
                    service=service,
                    generate=generate
                )
            ))
        logger.debug(
            "Generated expiring report for usages for all sub channel partners of channel partner",
            channel_partner=channel_partner.name,
            sub_channel_partners=[sub_channel_partner.name for sub_channel_partner in channel_partners],
            service=service.name)
        return channel_partner_usages

    @classmethod
    @get_saved_or_generate(entity_obj_name='channel_partner',
                           entity_id_name='id',
                           report_type=ReportSnapshot.ReportType.channel_partner_regular_detail_table)
    @validate_service_sub_type(expiring=False)
    def get_regular_detail_table(
            cls,
            channel_partner: ChannelPartner,
            service: ChannelPartnerService,
            period_start: datetime.date,
            generate: bool = False,
    ) -> RegularUsageDetailList:
        period_start, period_end = get_period_boundaries(period_start)
        sub_channel_usages: List[ChannelPartnerRegularUsage] = []
        organization_usages: List[OrganizationRegularUsage] = []
        sub_services = channel_partner.services.filter(parent_service=service)

        for sub_service in sub_services:
            sub_channel_usages.extend(
                cls.get_regular_channel_partner_usages(
                    channel_partner=channel_partner,
                    period_start=period_start,
                    service=sub_service,
                    generate=generate)
            )

            organization_usages.extend(
                cls.get_regular_organization_usages(
                    channel_partner=channel_partner,
                    service=sub_service,
                    period_start=period_start,
                    generate=generate,
                )
            )
        logger.debug(
            "Generated regular detail table for all organizations and channel partners",
            channel_partner=channel_partner.name,
            service=service.name,
            sub_services=[sub_service.name for sub_service in sub_services])
        return build_aggregate_from_regular_usages(usages=organization_usages + sub_channel_usages)

    @classmethod
    @get_saved_or_generate(entity_obj_name='channel_partner',
                           entity_id_name='id',
                           report_type=ReportSnapshot.ReportType.channel_partner_expiring_detail_table)
    @validate_service_sub_type(expiring=True)
    def get_expiring_detail_table(
            cls,
            channel_partner: ChannelPartner,
            service: ChannelPartnerService,
            period_start: datetime.date,
            generate: bool = False,
    ) -> ExpiringUsageDetailList:
        period_start, period_end = get_period_boundaries(period_start)
        sub_channel_usages: List[ChannelPartnerExpiringUsage] = []
        organization_usages: List[OrganizationExpiringUsage] = []
        sub_services = channel_partner.services.filter(parent_service=service)

        for sub_service in sub_services:
            sub_channel_usages.extend(
                cls.get_expiring_channel_partner_usages(
                    channel_partner=channel_partner,
                    period_start=period_start,
                    service=sub_service,
                    generate=generate)
            )

            organization_usages.extend(
                cls.get_expiring_organization_usages(
                    channel_partner=channel_partner,
                    service=sub_service,
                    period_start=period_start,
                    generate=generate,
                )
            )
        logger.debug(
            "Generated expiring table for all organizations and channel partners",
            channel_partner=channel_partner.name,
            service=service.name,
            sub_services=[sub_service.name for sub_service in sub_services])
        return build_aggregate_from_expiring_usages(usages=organization_usages + sub_channel_usages)

    @classmethod
    def build_regular_service_summary_from_sub_entity_reports(
            cls,
            organization_usages: OrganizationRegularUsageList,
            channel_partner_usages: ChannelPartnerRegularUsageList
    ) -> ChannelPartnerRegularServiceReport:
        sub_entities: ChannelPartnerRegularServiceEntities = []
        summary = ChannelPartnerRegularServiceSummary(
            channels=0,
            monthly_rate=0,
            daily_rate=0,
            channel_partners=0,
            organizations=0)
        for type, usages in (('organization', organization_usages), ('channel_partner', channel_partner_usages)):
            type: CP_SUBTYPE
            for usage_dict in usages:
                usage_dict: Union[OrganizationRegularUsage, ChannelPartnerRegularUsage]
                report = usage_dict['report']
                # Report can be empty if there is no usages reported
                total_usage = report[-1]
                # Don't count beginning and total rows
                changes_count = len(report) - 2
                if changes_count >= 1:
                    last_changed = report[-2]['date']
                else:
                    last_changed = None
                if type == ORGANIZATION:
                    logger.debug(
                        "Building regular service summary for organization from sub entity report",
                        organization=usage_dict['organization_name'],
                        total_usage=total_usage)
                    sub_entity_service_dict = ChannelPartnerRegularServiceEntity(
                        channels=total_usage['channels'],
                        monthly_rate=total_usage['monthly_rate'],
                        daily_rate=total_usage['daily_rate'],
                        id=usage_dict['organization_id'],
                        changes_count=changes_count,
                        last_changed=last_changed,
                        name=usage_dict['organization_name'],
                        type=type
                    )
                    summary['organizations'] += 1
                else:
                    logger.debug(
                        "Building regular service summary for channel partner from sub entity report",
                        channel_partner=usage_dict['channel_partner_name'],
                        total_usage=total_usage)
                    sub_entity_service_dict = ChannelPartnerRegularServiceEntity(
                        channels=total_usage['channels'],
                        monthly_rate=total_usage['monthly_rate'],
                        daily_rate=total_usage['daily_rate'],
                        id=usage_dict['channel_partner_id'],
                        changes_count=changes_count,
                        last_changed=last_changed,
                        name=usage_dict['channel_partner_name'],
                        type=type)
                    summary['channel_partners'] += 1

                summary['channels'] += sub_entity_service_dict['channels']
                summary['monthly_rate'] += sub_entity_service_dict['monthly_rate']
                summary['daily_rate'] += sub_entity_service_dict['daily_rate']
                sub_entities.append(sub_entity_service_dict)
        return ChannelPartnerRegularServiceReport(sub_entities=sub_entities, summary=summary)

    @classmethod
    def build_expiring_service_summary_from_sub_entity_reports(
            cls,
            organization_usages: OrganizationExpiringUsageList,
            channel_partner_usages: ChannelPartnerExpiringUsageList
    ) -> ChannelPartnerExpiringServiceReport:
        sub_entities: ChannelPartnerExpiringServiceEntities = []
        summary = ChannelPartnerExpiringServiceSummary(
            channels=0,
            channel_partners=0,
            organizations=0)
        for type, usages in (('organization', organization_usages), ('channel_partner', channel_partner_usages)):
            type: CP_SUBTYPE
            for usage_dict in usages:
                usage_dict: Union[OrganizationExpiringUsage, ChannelPartnerExpiringUsage]
                report = usage_dict['report']
                total_usage = report[-1]

                if type == ORGANIZATION:
                    logger.debug(
                        "Building expiring service summary for organization from sub entity report",
                        organization=usage_dict['organization_name'],
                        total_usage=total_usage)
                    sub_entity_service_dict = ChannelPartnerExpiringServiceEntity(
                        channels=total_usage['channels'],
                        id=usage_dict['organization_id'],
                        name=usage_dict['organization_name'],
                        type=type,
                        expirations=[
                            usage_row['expiration_date']
                            for usage_row in report
                            if usage_row['expiration_date']
                               and usage_row['expiration_date'] != TotalUsageDate
                        ]
                    )
                    summary['organizations'] += 1
                else:
                    logger.debug(
                        "Building expiring service summary for channel partner from sub entity report",
                        channel_partner=usage_dict['channel_partner_name'],
                        total_usage=total_usage)
                    sub_entity_service_dict = ChannelPartnerExpiringServiceEntity(
                        channels=total_usage['channels'],
                        id=usage_dict['channel_partner_id'],
                        name=usage_dict['channel_partner_name'],
                        type=type,
                        expirations=[
                            usage_row['expiration_date']
                            for usage_row in report
                            if usage_row['expiration_date']
                               and usage_row['expiration_date'] != TotalUsageDate
                        ]
                    )
                    summary['channel_partners'] += 1
                summary['channels'] += sub_entity_service_dict['channels']
                sub_entities.append(sub_entity_service_dict)

        return ChannelPartnerExpiringServiceReport(sub_entities=sub_entities, summary=summary)

    @classmethod
    @get_saved_or_generate(entity_obj_name='channel_partner',
                           entity_id_name='id',
                           report_type=ReportSnapshot.ReportType.channel_partner_regular_service_report)
    @validate_service_sub_type(expiring=False)
    def get_regular_service_report(
            cls,
            channel_partner: ChannelPartner,
            service: ChannelPartnerService,
            period_start: datetime.date,
            generate: bool = False,
    ) -> ChannelPartnerRegularServiceReport:
        period_start, period_end = get_period_boundaries(period_start)
        organization_usages = cls.get_regular_organization_usages(
            channel_partner=channel_partner,
            service=service,
            period_start=period_start,
            generate=generate,
        )
        channel_partner_usages = cls.get_regular_channel_partner_usages(
            channel_partner=channel_partner,
            service=service,
            period_start=period_start,
            generate=generate,
        )
        return cls.build_regular_service_summary_from_sub_entity_reports(
                    organization_usages=organization_usages,
                    channel_partner_usages=channel_partner_usages)

    @classmethod
    @get_saved_or_generate(entity_obj_name='channel_partner',
                           entity_id_name='id',
                           report_type=ReportSnapshot.ReportType.channel_partner_expiring_service_report)
    @validate_service_sub_type(expiring=True)
    def get_expiring_service_report(
            cls,
            channel_partner: ChannelPartner,
            service: ChannelPartnerService,
            period_start: datetime.date,
            generate: bool = False,
    ) -> ChannelPartnerExpiringServiceReport:
        period_start, period_end = get_period_boundaries(period_start)
        logger.debug(
            "Generating expiring service report for channel partner",
            channel_partner=channel_partner.name,
            service_name=service.name,
            period_start=period_start,
            generate=generate)
        organization_usages = cls.get_expiring_organization_usages(
            channel_partner=channel_partner,
            service=service,
            period_start=period_start,
            generate=generate,
        )
        logger.debug(
            "Generated organization usages for channel partner",
            channel_partner=channel_partner.name,
            service_name=service.name,
            period_start=period_start,
            organization_usages_count=len(organization_usages))
        channel_partner_usages = cls.get_expiring_channel_partner_usages(
            channel_partner=channel_partner,
            service=service,
            period_start=period_start,
            generate=generate)
        return cls.build_expiring_service_summary_from_sub_entity_reports(
            organization_usages=organization_usages,
            channel_partner_usages=channel_partner_usages)

    @classmethod
    def get_regular_service_reports(
            cls,
            channel_partner: ChannelPartner,
            period_start: datetime.date,
            services: QuerySet[ChannelPartnerService],
            generate: bool = False,
    ) -> ChannelPartnerRegularServiceReports:
        service_reports: ChannelPartnerRegularServiceReports = {}
        for service in services:
            logger.debug(
                "Generating regular service report for channel partner",
                channel_partner=channel_partner.name,
                service_name=service.name,
                service_id=service.id,
                period_start=period_start,
                generate=generate)
            service_reports[service.id] = cls.get_regular_service_report(
                                                channel_partner=channel_partner,
                                                service=service,
                                                period_start=period_start,
                                                generate=generate)
        return service_reports

    @classmethod
    def get_expiring_service_reports(
            cls,
            channel_partner: ChannelPartner,
            period_start: datetime.date,
            services: QuerySet[ChannelPartnerService],
            generate: bool = False,
    ) -> ChannelPartnerExpiringServiceReports:
        service_reports: ChannelPartnerExpiringServiceReports = {}
        for service in services:
            logger.debug(
                "Generating expiring service report for channel partner",
                channel_partner=channel_partner.name,
                service_name=service.name,
                service_id=service.id,
                period_start=period_start,
                generate=generate)
            service_reports[service.id] = cls.get_expiring_service_report(
                channel_partner=channel_partner,
                service=service,
                period_start=period_start,
                generate=generate)
        return service_reports

    @classmethod
    def build_channel_partner_report_from_service_reports(
            cls,
            regular_service_reports: ChannelPartnerRegularServiceReports,
            expiring_service_reports: ChannelPartnerExpiringServiceReports,
            services: QuerySet[ChannelPartnerService]
    ) -> ChannelPartnerUsageReport:
        reports = {**regular_service_reports, **expiring_service_reports}
        channel_partner_report: ChannelPartnerUsageReport = []
        for service in services:
            logger.debug(
                "Building channel partner report from service reports",
                service=service.name,
                service_id=service.id)
            service: ChannelPartnerService
            report = reports.get(service.id)
            if report:
                logger.debug(
                    "Adding service report to channel partner report",
                    service=service.name,
                    service_id=service.id,
                    report=report)
                summary = report.get('summary')
                channel_partner_report.append(ChannelPartnerUsageReportRecord(
                    service_id=service.id,
                    service_name=service.name,
                    channels=summary['channels'],
                    monthly_rate=summary.get('monthly_rate', 0),
                    daily_rate=summary.get('daily_rate', 0),
                    used_by_organizations=summary['organizations'],
                    used_by_channel_partners=summary['channel_partners'],
                    sub_type=service.sub_type,
                    parent_service_id=service.parent_service.id if service.parent_service else None,
                    parent_service_name=service.parent_service.name if service.parent_service else ''
                ))
            else:
                logger.debug(
                    "Service report not found for channel partner",
                    service=service.name,
                    service_id=service.id)
        return channel_partner_report

    @classmethod
    @get_saved_or_generate(entity_obj_name='channel_partner',
                           entity_id_name='id',
                           report_type=ReportSnapshot.ReportType.channel_partner_usage_report)
    def get_channel_partner_report(
            cls,
            channel_partner: ChannelPartner,
            period_start: datetime.date,
            generate: bool = False,
    ) -> ChannelPartnerUsageReport:
        period_start, period_end = get_period_boundaries(period_start)
        services = channel_partner.services.all().select_related('parent_service')

        regular_services = services.filter(sub_type=ChannelPartnerService.REGULAR)
        logger.debug(
            "Generating regular channel partner report",
            channel_partner=channel_partner.name,
            period_start=period_start,
            services=[service.name for service in regular_services])
        regular_reports = cls.get_regular_service_reports(
            channel_partner=channel_partner,
            period_start=period_start,
            services=regular_services,
            generate=generate,
        )
        expiring_services = services.filter(sub_type__in=[ChannelPartnerService.DEMO, ChannelPartnerService.TRIAL])
        logger.debug(
            "Generating expiring channel partner report",
            channel_partner=channel_partner.name,
            period_start=period_start,
            services=[service.name for service in expiring_services])
        expiring_reports = cls.get_expiring_service_reports(
            channel_partner=channel_partner,
            period_start=period_start,
            services=expiring_services,
            generate=generate,
        )
        logger.debug(
            "Building channel partner report",
            channel_partner=channel_partner.name,
            period_start=period_start,
            services_count=services.count(),
            regular_reports_count=len(regular_reports),
            expiring_reports_count=len(expiring_reports))
        return cls.build_channel_partner_report_from_service_reports(
            regular_service_reports=regular_reports,
            expiring_service_reports=expiring_reports,
            services=services)

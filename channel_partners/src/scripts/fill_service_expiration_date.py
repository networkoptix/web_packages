from dateutil.relativedelta import relativedelta
from django.db.models import QuerySet

from partners.models import (
    ChannelPartner,
    ChannelPartnerService,
    ChannelPartnerServiceRecord,
    CloudSystemId,
    ServiceToSystemProperties,
)


def fill_properties(service_record: ChannelPartnerServiceRecord):
    ServiceToSystemProperties._set_service_expiration_date(
        service_id=service_record.service_id,
        cloud_system_id=service_record.cloud_system_id,
        expiration_date=service_record.created_ts + relativedelta(months=service_record.service.duration)
    )


def fill_system(system: CloudSystemId, services: QuerySet[ChannelPartnerService]):
    service_records = ChannelPartnerServiceRecord.objects.filter(
        service__in=services,
        cloud_system=system,
    ).order_by('service_id', 'created_ts').distinct('service_id')
    for service_record in service_records:
        fill_properties(service_record)


def fill_services_expiration_date():
    for channel_partner in ChannelPartner.objects.all():
        services = ChannelPartnerService.objects.filter(
            created_by_channel_partner=channel_partner,
            duration__gt=0
        ).exclude(
            sub_type=ChannelPartnerService.REGULAR
        )
        for system in CloudSystemId.objects.filter(organization__channel_partner=channel_partner):
            fill_system(system, services)


def run():
    fill_services_expiration_date()

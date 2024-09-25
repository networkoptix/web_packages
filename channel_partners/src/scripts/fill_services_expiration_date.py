from dateutil.relativedelta import relativedelta

from partners.models import (
    ChannelPartnerService,
    ChannelPartnerServiceRecord,
    Organization,
    ServiceToOrganizationProperties,
)


def fill_properties(service_record: ChannelPartnerService):
    ServiceToOrganizationProperties.add_service_expiration(
        service_id=service_record.service_id,
        organization_id=service_record.organization_id,
        expiring_at=service_record.created_ts + relativedelta(months=service_record.service.duration)
    )


def fill_organization(organization: Organization):
    services = ChannelPartnerService.objects.filter(
        created_by_channel_partner_id=organization.channel_partner_id,
        duration__gt=0
    ).exclude(
        sub_type=ChannelPartnerService.REGULAR
    )
    service_records = ChannelPartnerServiceRecord.objects.filter(
        service__in=services,
        organization_id=organization.id
    ).order_by('service_id', 'created_ts').distinct('service_id')
    for service_record in service_records:
        fill_properties(service_record)


def fill_services_expiration_date():
    for organization in Organization.objects.all():
        fill_organization(organization)


def run():
    fill_services_expiration_date()

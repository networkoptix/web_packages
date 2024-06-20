from partners.models import (
    ChannelPartner,
    ChannelPartnerEvent,
    ChannelPartnerService,
    ChannelPartnerServiceRecord,
    ServiceToOrganizationProperties,
    ServiceToSubChannelProperties,
    ServiceUsage,
)
from partners.tasks.services import new_channel_partner_service_created


def delete_duplicate(service, is_duplicated_branch=False):
    for partner in service.created_by_channel_partner.channel_partners.all():
        service_cnt = 0
        for child_service in ChannelPartnerService.objects.filter(parent_service=service, conversion_service__isnull=False, created_by_channel_partner=partner):
            delete_duplicate(child_service, True)
        for child_service in ChannelPartnerService.objects.filter(parent_service=service, conversion_service__isnull=True, created_by_channel_partner=partner):
            if not is_duplicated_branch and service_cnt == 0:
                delete_duplicate(child_service, False)
            else:
                delete_duplicate(child_service, True)
            service_cnt += 1
    if not is_duplicated_branch or service.parent_service is None:
        return
    try:
        from partners.models import SystemServiceCurrentQuantity
        SystemServiceCurrentQuantity.objects.filter(service=service).delete()
    except ImportError:
        pass
    try:
        from partners.models import ChannelPartnerPriceChange
        ChannelPartnerPriceChange.objects.filter(service_properties__service=service).delete()
    except ImportError:
        pass
    try:
        from partners.models import OrganizationPriceChange
        OrganizationPriceChange.objects.filter(service_properties__service=service).delete()
    except ImportError:
        pass
    try:
        from partners.models import ReportSnapshot
        ReportSnapshot.objects.filter(service=service).delete()
    except ImportError:
        pass
    ChannelPartnerEvent.objects.filter(service=service).delete()
    ServiceToOrganizationProperties.objects.filter(service=service).delete()
    ServiceToSubChannelProperties.objects.filter(service=service).delete()
    ServiceUsage.objects.filter(service=service).delete()
    ChannelPartnerServiceRecord.objects.filter(service=service, negation_record__isnull=False).delete()
    ChannelPartnerServiceRecord.objects.filter(service=service).delete()
    service.delete()


def run():
    root = ChannelPartner.objects.get(parent_channel_partner__isnull=True)
    converting_services = ChannelPartnerService.objects.filter(
        created_by_channel_partner=root, conversion_service__isnull=False)
    non_converting_services = ChannelPartnerService.objects.filter(
        created_by_channel_partner=root, conversion_service__isnull=True)

    for service in converting_services:
        delete_duplicate(service, False)
    for service in non_converting_services:
        delete_duplicate(service, False)
    print('Clean up done!')

    for service in ChannelPartnerService.objects.filter(parent_service__isnull=True, conversion_service__isnull=True):
        new_channel_partner_service_created(service.id)

    for service in ChannelPartnerService.objects.filter(parent_service__isnull=True, conversion_service__isnull=False):
        new_channel_partner_service_created(service.id)

    for channel_partner in ChannelPartner.objects.all():
        if channel_partner.services.count() != channel_partner.services.distinct('name').count():
            print(f"Error. {channel_partner}")
            print(f"All services: {channel_partner.services.count()}")
            print(f"Unique services: {channel_partner.services.distinct('name').count()}")



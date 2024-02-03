import logging

from django.db import transaction

from partners.models import (
    ChannelPartner,
    ChannelPartnerService,
)


logger = logging.getLogger(__name__)


def delete_nested_services(service: ChannelPartnerService):
    for sub_service in service.channelpartnerservice_set.all():
        delete_nested_services(sub_service)
    service.delete()


def run():
    with transaction.atomic():
        nx = ChannelPartner.objects.get(name='Network Optix')
        unique_services_by_name = nx.services.all().order_by('name', 'created_ts').distinct('name')
        for service in nx.services.all().exclude(id__in=unique_services_by_name).order_by('created_ts'):
            delete_nested_services(service)

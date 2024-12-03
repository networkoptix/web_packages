import sys

import structlog
from django.conf import settings
from django.db import transaction
from nx_ireg.registry import IReg

from partners.models import (
    ChannelPartner,
    ChannelPartnerService,
    CloudHost,
)


logger = structlog.getLogger(__name__)
NX_NAME = 'Network Optix'


def create_root_channel_partner(root_name, host_name):
    logger.info(f'Looking for root channel partner')
    root_channel_partner = (
        ChannelPartner.objects
        .filter(parent_channel_partner__isnull=True)
        .first()
    )
    if not root_channel_partner:
        logger.info('Creating root channel partner.', channel_partner_name=root_name, hostname=host_name)
        host = CloudHost.objects.get_or_create(hostname=host_name)[0]
        root_channel_partner = ChannelPartner.objects.create(name=root_name, cloud_host=host)
    else:
        if root_channel_partner.cloud_host.hostname.lower() != host_name:
            logger.info('Root channel partner host needs for update.',
                        channel_partner_name=root_channel_partner.name,
                        channel_partner_id=root_channel_partner.id,
                        current_host=root_channel_partner.cloud_host.hostname,
                        new_host=host_name)
            root_channel_partner.cloud_host.hostname = host_name
            root_channel_partner.cloud_host.save()
        else:
            logger.info('Channel partner host is already up to date.')

    if settings.INSTANCE_NAME != 'prod' and 'stage' not in settings.INSTANCE_NAME:
        regular_recording = ChannelPartnerService.objects.get_or_create(
            created_by_channel_partner=root_channel_partner, name='Core',
            type=ChannelPartnerService.LOCAL_RECORDING
        )[0]

        ChannelPartnerService.objects.get_or_create(
            created_by_channel_partner=root_channel_partner, name='Demo Core',
            type=ChannelPartnerService.LOCAL_RECORDING, sub_type=ChannelPartnerService.DEMO, duration=1,
        )

        ChannelPartnerService.objects.get_or_create(
            created_by_channel_partner=root_channel_partner, name='Credit Core',
            type=ChannelPartnerService.LOCAL_RECORDING, sub_type=ChannelPartnerService.CREDIT, duration=24,
            conversion_service=regular_recording
        )

        for mp in [0, 2, 5, 10]:
            ChannelPartnerService.objects.get_or_create(
                created_by_channel_partner=root_channel_partner, name=f'Cloud Storage - {mp} MP',
                type=ChannelPartnerService.CLOUD_STORAGE, parameters={
                    'days': 30,
                    'maxResolutionMp': mp
                }
            )

        ChannelPartnerService.objects.get_or_create(
            created_by_channel_partner=root_channel_partner, name='Nx Analytics Plugin',
            type=ChannelPartnerService.ANALYTICS,
            parameters={"integrationId": "nx.analytics.plugin"}
        )

        ChannelPartnerService.objects.get_or_create(
            created_by_channel_partner=root_channel_partner, name='Nx Stub Object Detection',
            type=ChannelPartnerService.ANALYTICS,
            parameters={"integrationId": "nx.stub.object_detection"}
        )
    return root_channel_partner


def create_customization(root_channel_partner, customization, host_name):
    logger.info('Customization: {customization}')
    channel_partner = (
        ChannelPartner.objects
        .filter(name=customization)
        .filter(parent_channel_partner=root_channel_partner)
        .first()
    )
    if not channel_partner:
        logger.info('Creating channel partner', channel_partner_name=customization, hostname=host_name)
        host = CloudHost.objects.get_or_create(hostname=host_name.lower())[0]
        channel_partner = ChannelPartner.objects.create(
            name=customization,
            cloud_host=host,
            parent_channel_partner=root_channel_partner
        )
    else:
        if channel_partner.cloud_host.hostname.lower() != host_name.lower():
            logger.info('Channel partner host needs for update.',
                        channel_partner_name=channel_partner.name,
                        channel_partner_id=channel_partner.id,
                        current_host=channel_partner.cloud_host.hostname,
                        new_host=host_name)
            channel_partner.cloud_host.hostname = host_name.lower()
            channel_partner.cloud_host.save()
        else:
            logger.info('Channel partner host is already up to date.',
                        channel_partner_name=channel_partner.name,
                        channel_partner_id=channel_partner.id,
                        current_host=channel_partner.cloud_host.hostname)


def create_partners_and_services(instance_name, root_name=None):
    if settings.IS_PRIVATE_CLOUD:
        if not root_name:
            logger.critical('Root channel partner name is required for private cloud.')
            sys.exit(1)
        customizations = []
        host_name = settings.DEFAULT_HOST_NAME.lower()
    else:
        try:
            ireg = IReg(instance_name)
            host_name = ireg.get_default_host()
            customizations = ireg.get_other_customizations()
        except Exception as ex:
            # If we can't get data from ireg, we should create a root channel partner with the default host name
            logger.critical("Cannot get data from ireg", error=str(ex), exc_info=True)
            customizations = []
            host_name = settings.DEFAULT_HOST_NAME.lower()

        host_name = host_name.lower()
        root_name = NX_NAME

    with transaction.atomic():
        root_channel_partner = create_root_channel_partner(root_name, host_name)
        for customization, host_name in customizations:
            create_customization(root_channel_partner, customization, host_name)

def run(instance_name, root_name=None):
    try:
        create_partners_and_services(instance_name, root_name)
    except Exception as ex:
        # do not start the server if we can't create channel partners
        logger.critical("Error creating channel partners", error=str(ex), exc_info=True)
        sys.exit(1)

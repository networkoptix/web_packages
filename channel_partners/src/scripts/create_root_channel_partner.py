import logging

from django.db import transaction
from nx_ireg.registry import IReg

from channel_partners import settings
from partners.models import (
    ChannelPartner,
    ChannelPartnerService,
    CloudHost,
)


logger = logging.getLogger(__name__)
NX_NAME = 'Network Optix'


def create_root_channel_partner(root_name, host_name):
    logger.info(f'Looking for root channel partner')
    root_channel_partner = (
        ChannelPartner.objects
        .filter(parent_channel_partner__isnull=True)
        .first()
    )
    if not root_channel_partner:
        logger.info(f'Creating root channel partner.')
        host = CloudHost.objects.get_or_create(hostname=host_name)[0]
        logger.info(f'Cloud Host: {host_name}.')
        root_channel_partner = ChannelPartner.objects.create(name=root_name, cloud_host=host)
    else:
        if root_channel_partner.cloud_host.hostname.lower() != host_name:
            logger.info(f'Root channel partner host needs for update.')
            logger.info(f'Current host: {root_channel_partner.cloud_host}')
            logger.info(f'New host: {host_name}')
            root_channel_partner.cloud_host.hostname = host_name
            root_channel_partner.cloud_host.save()
        else:
            logger.info(f'Channel partner host is already up to date.')

    regular_recording = ChannelPartnerService.objects.get_or_create(
        created_by_channel_partner=root_channel_partner, name='Local Recording',
        type=ChannelPartnerService.LOCAL_RECORDING
    )[0]

    ChannelPartnerService.objects.get_or_create(
        created_by_channel_partner=root_channel_partner, name='Local Recording Demo',
        type=ChannelPartnerService.LOCAL_RECORDING, sub_type=ChannelPartnerService.DEMO, duration=1
    )

    ChannelPartnerService.objects.get_or_create(
        created_by_channel_partner=root_channel_partner, name='Local Recording Trial',
        type=ChannelPartnerService.LOCAL_RECORDING, sub_type=ChannelPartnerService.TRIAL, duration=1,
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
    logger.info(f'Customization: {customization}')
    channel_partner = (
        ChannelPartner.objects
        .filter(name=customization)
        .filter(parent_channel_partner=root_channel_partner)
        .first()
    )
    if not channel_partner:
        logger.info(f'Creating channel partner: {customization}')
        host = CloudHost.objects.get_or_create(hostname=host_name.lower())[0]
        logger.info(f'Cloud Host: {host}')
        channel_partner = ChannelPartner.objects.create(
            name=customization,
            cloud_host=host,
            parent_channel_partner=root_channel_partner
        )
    else:
        if channel_partner.cloud_host.hostname.lower() != host_name.lower():
            logger.info(f'Channel partner host needs for update.')
            logger.info(f'Current host: {channel_partner.cloud_host}')
            logger.info(f'New host: {host_name}')
            channel_partner.cloud_host.hostname = host_name.lower()
            channel_partner.cloud_host.save()
        else:
            logger.info(f'Channel partner host {channel_partner.cloud_host} is already up to date.')


def run(instance_name, root_name=None):
    if settings.IS_PRIVATE_CLOUD:
        if not root_name:
            raise ValueError('Root channel partner name is required for private cloud.')
        customizations = []
        host_name = settings.DEFAULT_HOST_NAME.lower()
    else:
        try:
            ireg = IReg(instance_name)
            host_name = ireg.get_default_host()
            customizations = ireg.get_other_customizations()
        except Exception as ex:
            logger.critical("Cannot get data from ireg", exc_info=ex)
            customizations = []
            host_name = settings.DEFAULT_HOST_NAME.lower()
        if not host_name:
            raise ValueError(f'No default host found in ireg for instance {instance_name}')
        host_name = host_name.lower()
        root_name = NX_NAME
    with transaction.atomic():
        root_channel_partner = create_root_channel_partner(root_name, host_name)
        for customization, host_name in customizations:
            create_customization(root_channel_partner, customization, host_name)

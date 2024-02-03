import logging

from django.db import transaction
from nx_ireg.registry import IReg

from partners.models import (
    ChannelPartner,
    ChannelPartnerService,
    CloudHost,
)


logger = logging.getLogger(__name__)


def run(instance_name):
    with transaction.atomic():
        ireg = IReg(instance_name)
        host_name = ireg.get_default_host()
        if not host_name:
            raise ValueError(f'No default host found in ireg for instance {instance_name}')
        logger.info(f'Looking for root channel partner')
        nx_channel_partner = (
            ChannelPartner.objects
            .filter(name='Network Optix')
            .filter(parent_channel_partner__isnull=True)
            .first()
        )
        if not nx_channel_partner:
            logger.info(f'Creating root channel partner.')
            host = CloudHost.objects.get_or_create(hostname=host_name.lower())[0]
            logger.info(f'Cloud Host: {host_name}.')
            nx_channel_partner = ChannelPartner.objects.create(name='Network Optix', cloud_host=host)
        else:
            if nx_channel_partner.cloud_host.hostname.lower() != host_name.lower():
                logger.info(f'Root channel partner host needs for update.')
                logger.info(f'Current host: {nx_channel_partner.cloud_host}')
                logger.info(f'New host: {host_name}')
                nx_channel_partner.cloud_host.hostname = host_name.lower()
                nx_channel_partner.cloud_host.save()
            else:
                logger.info(f'Channel partner host is already up to date.')

        regular_recording = ChannelPartnerService.objects.get_or_create(
            created_by_channel_partner=nx_channel_partner, name='Local Recording',
            type=ChannelPartnerService.LOCAL_RECORDING
        )[0]

        ChannelPartnerService.objects.get_or_create(
            created_by_channel_partner=nx_channel_partner, name='Local Recording Demo',
            type=ChannelPartnerService.LOCAL_RECORDING, sub_type=ChannelPartnerService.DEMO, duration=1
        )

        ChannelPartnerService.objects.get_or_create(
            created_by_channel_partner=nx_channel_partner, name='Local Recording Trial',
            type=ChannelPartnerService.LOCAL_RECORDING, sub_type=ChannelPartnerService.TRIAL, duration=1,
            conversion_service=regular_recording
        )

        for mp in [0, 2, 5, 10]:
            ChannelPartnerService.objects.get_or_create(
                created_by_channel_partner=nx_channel_partner, name=f'Cloud Storage - {mp} MP',
                type=ChannelPartnerService.CLOUD_STORAGE, parameters={
                    'days': 30,
                    'maxResolutionMp': mp
                }
            )

        ChannelPartnerService.objects.get_or_create(
            created_by_channel_partner=nx_channel_partner, name='Nx Analytics Plugin',
            type=ChannelPartnerService.ANALYTICS,
            parameters={"integrationId": "nx.analytics.plugin"}
        )

        ChannelPartnerService.objects.get_or_create(
            created_by_channel_partner=nx_channel_partner, name='Nx Stub Object Detection',
            type=ChannelPartnerService.ANALYTICS,
            parameters={"integrationId": "nx.stub.object_detection"}
        )
        for customization, host_name in ireg.get_other_customizations():
            logger.info(f'Customization: {customization}')
            channel_partner = (
                ChannelPartner.objects
                .filter(name=customization)
                .filter(parent_channel_partner=nx_channel_partner)
                .first()
            )
            if not channel_partner:
                logger.info(f'Creating channel partner: {customization}')
                host = CloudHost.objects.get_or_create(hostname=host_name.lower())[0]
                logger.info(f'Cloud Host: {host}')
                channel_partner = ChannelPartner.objects.create(
                    name=customization,
                    cloud_host=host,
                    parent_channel_partner=nx_channel_partner
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

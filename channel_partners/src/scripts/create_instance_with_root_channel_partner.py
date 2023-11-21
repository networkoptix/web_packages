from partners.models import *
from django.db import transaction

users = [
    CloudUser.objects.get_or_create(email='rbarsegian@networkoptix.com')[0]
]


def add_users_or_channel_partner(channel_partner: ChannelPartner):
    for user in users:
        ChannelPartnerToUser.objects.get_or_create(
            user=user, channel_partner=channel_partner, roles=[ChannelPartnerRoles.ADMINISTRATOR])


def add_users_to_organization(organization: Organization):
    for user in users:
        OrganizationToUser.objects.get_or_create(user=user, organization=organization,
                                                 roles=[OrganizationRoles.ORGANIZATION_ADMINISTRATOR])


def run(instance_name, host_name):
    with transaction.atomic():
        instance = CloudInstance.objects.get_or_create(name=instance_name)[0]
        host = CloudHost.objects.get_or_create(hostname=host_name, instance=instance)[0]
        nx_channel_partner = ChannelPartner.objects.get_or_create(name='Network Optix', cloud_host=host)[0]

        ChannelPartnerService.objects.create(
            created_by_channel_partner=nx_channel_partner, name='Local Recording', type=ChannelPartnerService.LOCAL_RECORDING
        )

        for mp in [0, 2, 5, 10]:
            ChannelPartnerService.objects.create(
                created_by_channel_partner=nx_channel_partner, name=f'Cloud Storage - {mp} MP',
                type=ChannelPartnerService.CLOUD_STORAGE, parameters={
                    'days': 30,
                    'maxResolutionMp': mp
                }
            )

        ChannelPartnerService.objects.create(
            created_by_channel_partner=nx_channel_partner, name='Nx Analytics Plugin',
            type=ChannelPartnerService.ANALYTICS,
            parameters={"integrationId": "nx.analytics.plugin"}
        )

        ChannelPartnerService.objects.create(
            created_by_channel_partner=nx_channel_partner, name='Nx Stub Object Detection',
            type=ChannelPartnerService.ANALYTICS,
            parameters={"integrationId": "nx.stub.object_detection"}
        )

from partners.models import *
from django.db import transaction
import uuid
import random

users = [
    CloudUser.objects.get_or_create(email='jcox@networkoptix.com')[0],
    CloudUser.objects.get_or_create(email='yingfan@networkoptix.com')[0],
    CloudUser.objects.get_or_create(email='vyacheslav.ogai@clearscale.com')[0],
    CloudUser.objects.get_or_create(email='rbarsegian@networkoptix.com')[0],
    CloudUser.objects.get_or_create(email='kapanovich@networkoptix.com')[0],
]

many_users = [
    CloudUser.objects.get_or_create(email=f'{uuid.uuid4()}@networkoptix.com')[0] for _ in range(50)
]

many_users = [
    CloudUser.objects.get_or_create(email=f'{uuid.uuid4()}@networkoptix.com')[0] for _ in range(50)
]


def add_users_or_channel_partner(channel_partner: ChannelPartner):
    for user in users:
        ChannelPartnerToUser.objects.get_or_create(
            user=user, channel_partner=channel_partner, roles=[ChannelPartnerRoles.ADMINISTRATOR])


def add_users_to_organization(organization: Organization):
    for user in users:
        OrganizationToUser.objects.get_or_create(
            user=user, organization=organization, roles=[OrganizationRoles.ORGANIZATION_ADMINISTRATOR])


def add_random_users_to_organization(organization: Organization):
    roles = OrganizationRole.objects.all()[:]
    for user in many_users:
        OrganizationToUser.objects.get_or_create(user=user, organization=organization, roles=[random.choice(roles).name])


def run():
    with transaction.atomic():
        cloud_test_instance = CloudInstance.objects.get_or_create(name='cloud-test')[0]
        cloud_test_host = CloudHost.objects.get_or_create(hostname='cloud-test.hdw.mx')[0]
        nx_channel_partner_cloud_test = ChannelPartner.objects.get_or_create(name='Network Optix', cloud_host=cloud_test_host)[0]

        for i in range(25):
            print(f'Iteration #{i+1}')
            channel_partner = ChannelPartner.objects.create(name=f'Test CP {i+1}', parent_channel_partner=nx_channel_partner_cloud_test, cloud_host=cloud_test_host)
            add_users_or_channel_partner(channel_partner)
            services = [
                ChannelPartnerService.objects.create(name=uuid.uuid4(), type=st,
                                                     created_by_channel_partner=channel_partner)
                for st, _ in ChannelPartnerService.SERVICE_TYPES]
            for j in range(25):
                organization = Organization.objects.create(name=f'Test Org {j+1}', channel_partner=channel_partner)
                OrganizationExternalId.objects.create(custom_id=uuid.uuid4(), organization=organization, created_by=channel_partner)
                add_users_to_organization(organization)
                for k in range(25):
                    sys = CloudSystemId.objects.create(system_id=uuid.uuid4(), name=f'Test System {k+1}', organization=organization, cloud_host=cloud_test_host)
                    CloudSystemExternalId.objects.create(custom_id=uuid.uuid4(), cloud_system=sys, created_by=channel_partner)
                    for service in services:
                        ChannelPartnerServiceRecord(service=service, organization=organization, cloud_system=sys, quantity=random.randint(1, 10))
            if i % 5 == 0:
                sub_channel_partner = ChannelPartner.objects.create(name=f'Test CP {i + 1}',
                                                                parent_channel_partner=channel_partner,
                                                                cloud_host=cloud_test_host)
                add_users_or_channel_partner(sub_channel_partner)
                services = [
                    ChannelPartnerService.objects.create(name=uuid.uuid4(), type=st,
                                                         created_by_channel_partner=sub_channel_partner)
                    for st, _ in ChannelPartnerService.SERVICE_TYPES]
                for service in services:
                    ChannelPartnerServiceExternalId.objects.create(custom_id=uuid.uuid4(), channel_partner_service=service, created_by=channel_partner)
                for j in range(25):
                    organization = Organization.objects.create(name=f'Test Org {j + 1}',
                                                               channel_partner=sub_channel_partner)
                    OrganizationExternalId.objects.create(custom_id=uuid.uuid4(), organization=organization,
                                                          created_by=channel_partner)
                    add_users_to_organization(organization)
                    add_random_users_to_organization(organization)
                    for k in range(25):
                        sys = CloudSystemId.objects.create(system_id=uuid.uuid4(), name=f'Test System {k + 1}', organization=organization,
                                                              cloud_host=cloud_test_host)
                        CloudSystemExternalId.objects.create(custom_id=uuid.uuid4(), cloud_system=sys,
                                                             created_by=channel_partner)
                        for service in services:
                            ChannelPartnerServiceRecord(service=service, organization=organization, cloud_system=sys,
                                                        quantity=random.randint(1, 10))



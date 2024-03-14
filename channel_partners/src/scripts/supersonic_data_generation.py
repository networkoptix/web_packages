import random
import time
import uuid
from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from partners.models import (
    ChannelPartner,
    ChannelPartnerServiceExternalId,
    ChannelPartnerServiceRecord,
    CloudHost,
    CloudSystemExternalId,
    CloudSystemId,
    Organization,
    OrganizationExternalId,
    ServiceUsage,
    SystemGroup,
)
from scripts.create_root_channel_partner import run as create_root
from tools.helpers import get_path_from_parent


def run():
    ts = time.time()
    with transaction.atomic():
        generator = Generator()
        generator.generate()
    print(f"Generated: in {time.time() - ts:.06f}s")


class Generator:
    partner_depth = 3
    group_depth = 4
    org_dimension = 10
    system_dimension = 5
    batch_size = 200

    def __init__(self):
        if not (cloud_test_host := CloudHost.objects.filter(hostname='cloud-test.hdw.mx').first()):
            create_root('test')
            self.cloud_test_host = CloudHost.objects.filter(hostname='cloud-test.hdw.mx').first()
        else:
            self.cloud_test_host = cloud_test_host
        self.nx_channel_partner_cloud_test = ChannelPartner.objects.get_or_create(
            name='Network Optix', cloud_host=self.cloud_test_host)[0]
        self.partners = []
        self.organizations = []
        self.groups = []
        self.systems = []
        self.service_records = []
        self.service_usages = []
        self.sys_id_seq = 0
        self.system_ext_ids = []

    def generate(self):
        self.make_sub_channel_partners()
        self.make_organizations()
        self.make_groups()

    def make_sub_channel_partners(self):
        print("Generating sub channel partners...")
        partners = [self.nx_channel_partner_cloud_test]
        j = 0
        for i in range(self.partner_depth):
            j += 1
            new = []
            for parent in partners:
                path = get_path_from_parent(parent)
                partner = ChannelPartner.objects.get_or_create(
                    name=f'Partner {j} - cp lvl {len(path)}',
                    parent_channel_partner=parent,
                    cloud_host=self.cloud_test_host,
                )[0]
                new.append(partner)
            partners += new
        self.partners = partners[1:]
        service_ext_ids = []
        for partner in self.partners:
            for service in partner.services.all():
                service_ext_ids.append(ChannelPartnerServiceExternalId(
                    custom_id=uuid.uuid4(),
                    channel_partner_service=service,
                    created_by=partner
                ))
        ChannelPartnerServiceExternalId.objects.bulk_create(service_ext_ids, batch_size=self.batch_size)
        print(f"Generated: {len(self.partners)} partners")

    def make_organizations(self):
        print("Generating organization...")
        organization_ext_ids = []
        for partner in self.partners:
            path = get_path_from_parent(partner)
            for i in range(self.org_dimension):
                organization = Organization(
                    id=uuid.uuid4(),
                    name=f"Organization {i + 1} - cp lvl {len(path) - 1}",
                    channel_partner_id=partner.id,
                    path=path
                )
                ext_id = OrganizationExternalId(
                    custom_id=uuid.uuid4(),
                    organization_id=organization.id,
                    created_by=partner,
                )
                self.organizations.append(organization)
                organization_ext_ids.append(ext_id)
        Organization.objects.bulk_create(self.organizations, batch_size=100)
        print(f"Generated: {len(self.organizations)} organizations")
        OrganizationExternalId.objects.bulk_create(organization_ext_ids, batch_size=self.batch_size)
        print(f"Generated: {len(organization_ext_ids)} organization external ids")

    def make_groups(self):
        print("Generating system groups...")

        for organization in self.organizations:
            services = organization.channel_partner.services.all()
            groups = [(None, organization)]
            self.make_systems(organization, group=None, services=services)
            for i in range(self.group_depth):
                new_groups = []
                for gid, parent in groups:
                    path = get_path_from_parent(parent)
                    level = len(path) - len(organization.path) - 1
                    group = SystemGroup(
                        id=uuid.uuid4(),
                        name=f"Group {uuid.uuid4()} - group lvl {level}",
                        organization=organization,
                        path=path,
                        parent_id=gid,
                    )
                    new_groups.append((group.id, group))
                    self.groups.append(group)
                    self.make_systems(organization, group=group, services=services)
                groups += new_groups

        SystemGroup.objects.bulk_create(self.groups, batch_size=self.batch_size)
        print(f"Generated: {len(self.groups)} groups")
        CloudSystemId.objects.bulk_create(self.systems, batch_size=self.batch_size)
        print(f"Generated: {len(self.systems)} systems")
        ChannelPartnerServiceRecord.objects.bulk_create(self.service_records, batch_size=self.batch_size)
        print(f"Generated: {len(self.service_records)} service records")
        ServiceUsage.objects.bulk_create(self.service_usages, batch_size=self.batch_size)
        print(f"Generated: {len(self.service_usages)} service usage records")
        CloudSystemExternalId.objects.bulk_create(self.system_ext_ids, batch_size=self.batch_size)
        print(f"Generated: {len(self.system_ext_ids)} system external ids")

    def make_systems(self, organization, group, services):
        for i in range(self.system_dimension):
            if group:
                path = get_path_from_parent(group)
            else:
                path = get_path_from_parent(organization)
            self.sys_id_seq += 1
            system = CloudSystemId(
                id=self.sys_id_seq,
                system_id=uuid.uuid4(),
                organization_id=organization.id,
                system_group_id=group.id if group else None,
                path=path,
                cloud_host=self.cloud_test_host,
            )
            ext_id = CloudSystemExternalId(
                custom_id=uuid.uuid4(),
                cloud_system_id=self.sys_id_seq,
                created_by_id=organization.channel_partner_id
            )
            self.systems.append(system)
            self.system_ext_ids.append(ext_id)

            from_ts = timezone.now() - timedelta(days=20)
            to_ts = timezone.now() - timedelta(hours=3)
            for service in services:
                service_record = ChannelPartnerServiceRecord(
                    service=service,
                    cloud_system_id=system.id,
                    quantity=random.randint(10, 50),
                    created_ts=from_ts,
                    effective_ts=from_ts,
                    in_effect=True,
                )
                service_usage = ServiceUsage(
                    service=service,
                    cloud_system_id=system.id,
                    service_type=service.type,
                    usage=1,
                    from_ts=from_ts,
                    to_ts=to_ts
                )
                self.service_records.append(service_record)
                self.service_usages.append(service_usage)

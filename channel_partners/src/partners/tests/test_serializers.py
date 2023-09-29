import random

import pytest
from model_bakery import baker

from partners.models import ChannelPartnerServiceRecord
from partners.serializers import ChannelPartnerAggDataSerializer, OrganizationAggDataSerializer
from partners.views import ChannelPartnerViewSet


class TestChannelPartnerAggDataSerializer:

    @pytest.fixture(autouse=True)
    def setup(self):
        pass

    def test_data(self, default_channel_partner, channel_partner_factory, organization_factory,
                  system_factory, arf, mock_auth_with_user, default_cp_admin):
        gen_count = 3
        target_cp = channel_partner_factory(parent_channel_partner=default_channel_partner)
        other_cp = channel_partner_factory(parent_channel_partner=default_channel_partner)
        level_1 = [channel_partner_factory(parent_channel_partner=target_cp) for _ in range(gen_count)]
        level_2 = [channel_partner_factory(parent_channel_partner=level_1[int(i/gen_count)])
                   for i in range(gen_count ** 2)]
        level_3 = [channel_partner_factory(parent_channel_partner=level_2[int(i / gen_count)])
                   for i in range(int (gen_count ** 3))]
        target_partners = [target_cp] + level_1 + level_2 + level_3

        ser = ChannelPartnerAggDataSerializer(instance=target_cp)

        assert ser.data['channelPartners'] == gen_count + gen_count ** 2 + gen_count ** 3
        assert ser.data['organizations'] == 0
        assert ser.data['systems'] == 0
        assert ser.data['serviceUsageQuantity'] == 0

        organizations = [organization_factory(channel_partner=target_partners[int(i/gen_count)])
                         for i in range(len(target_partners) * gen_count)]

        ser = ChannelPartnerAggDataSerializer(instance=target_cp)

        assert ser.data['channelPartners'] == gen_count + gen_count ** 2 + gen_count ** 3
        assert ser.data['organizations'] == len(target_partners) * gen_count
        assert ser.data['systems'] == 0
        assert ser.data['serviceUsageQuantity'] == 0

        systems = [system_factory(organization=organizations[int(i/gen_count)])
                   for i in range(len(organizations) * gen_count)]

        ser = ChannelPartnerAggDataSerializer(instance=target_cp)

        assert ser.data['channelPartners'] == gen_count + gen_count ** 2 + gen_count ** 3
        assert ser.data['organizations'] == len(target_partners) * gen_count
        assert ser.data['systems'] == len(organizations) * gen_count
        assert ser.data['serviceUsageQuantity'] == 0

        services = [baker.make(ChannelPartnerServiceRecord, cloud_system=systems[i], quantity=gen_count)
                    for i in range(len(organizations))]

        ser = ChannelPartnerAggDataSerializer(instance=target_cp)

        assert ser.data['channelPartners'] == gen_count + gen_count ** 2 + gen_count ** 3
        assert ser.data['organizations'] == len(target_partners) * gen_count
        assert ser.data['systems'] == len(organizations) * gen_count
        assert ser.data['serviceUsageQuantity'] == gen_count * len(organizations)

        test_data = ser.data
        cp = level_2[0]

        ser = ChannelPartnerAggDataSerializer(instance=cp)

        assert ser.data['channelPartners'] == gen_count
        assert ser.data['organizations'] == (gen_count + 1) * gen_count
        assert ser.data['systems'] == (gen_count + 1) * gen_count * gen_count
        assert ser.data['serviceUsageQuantity'] < gen_count * len(organizations)

        for _ in range(2):
            cp = channel_partner_factory(parent_channel_partner=other_cp)
            for _ in range(2):
                org = organization_factory(channel_partner=cp)
                for _ in range(2):
                    sys = system_factory(organization=org)
                    for _ in range(2):
                        baker.make(ChannelPartnerServiceRecord, cloud_system=sys, quantity=1)


        ser = ChannelPartnerAggDataSerializer(instance=other_cp)

        assert ser.data['channelPartners'] == 2
        assert ser.data['organizations'] == 4
        assert ser.data['systems'] == 8
        assert ser.data['serviceUsageQuantity'] == 16

        ser = ChannelPartnerAggDataSerializer(instance=level_3[0])

        assert ser.data['channelPartners'] == 0


class TestOrganizationAggDataSerializer:

    def test_data(self, organization_factory, system_factory):
        org = organization_factory()
        ser = OrganizationAggDataSerializer(org)

        assert ser.data['systems'] == 0
        assert ser.data['serviceUsageQuantity'] == 0
        sys_cnt = random.randint(30, 60)
        systems = [system_factory(organization=org) for _ in range(sys_cnt)]

        ser = OrganizationAggDataSerializer(org)

        assert ser.data['systems'] == sys_cnt
        assert ser.data['serviceUsageQuantity'] == 0
        usage = 0
        for sys in systems:
            qty = random.randint(0, 10)
            baker.make(ChannelPartnerServiceRecord, cloud_system=sys, quantity=qty)
            usage += qty

        ser = OrganizationAggDataSerializer(org)

        assert ser.data['systems'] == sys_cnt
        assert ser.data['serviceUsageQuantity'] == usage

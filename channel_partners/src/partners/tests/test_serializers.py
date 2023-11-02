import random
from datetime import timedelta

import pytest
from dateutil import relativedelta
from django.core.cache import caches
from model_bakery import baker

from partners.models import ChannelPartnerServiceRecord, ChannelPartnerService, OrganizationRole, OrganizationToUser, \
    ChannelPartnerRole, ChannelPartnerToUser
from partners.serializers import ChannelPartnerSerializer, ChannelPartnerAggDataSerializer, \
    OrganizationAggDataSerializer, \
    SystemServiceQuantitySerializer, OrganizationSerializer
from partners.views import ChannelPartnerViewSet
from tools.helpers import get_period_start


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

        services = [baker.make(ChannelPartnerServiceRecord, cloud_system=systems[i], quantity=gen_count, organization=systems[i].organization)
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
                        baker.make(ChannelPartnerServiceRecord, cloud_system=sys, quantity=1, organization=sys.organization)


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
            baker.make(ChannelPartnerServiceRecord, cloud_system=sys, quantity=qty, organization=sys.organization)
            usage += qty

        ser = OrganizationAggDataSerializer(org)

        assert ser.data['systems'] == sys_cnt
        assert ser.data['serviceUsageQuantity'] == usage


class TestSystemServiceQuantitySerializer:

    def test_update(self, channel_partner_factory, organization_factory, system_factory,
                    cp_service_factory, service_record_factory, arf, cp_user_factory):
        root_cp = channel_partner_factory(parent_channel_partner=None)
        cp = channel_partner_factory(parent_channel_partner=root_cp)
        cp.monthly_additional_service_limit = 10
        cp.save()
        cp_orgs = [organization_factory(channel_partner=cp) for _ in range(3)]
        systems = []
        cp_services = [cp_service_factory(channel_partner=cp, service_type=tid)
                       for tid, tname in ChannelPartnerService.SERVICE_TYPES]
        cp_user = cp_user_factory(channel_partner=cp)
        for org in cp_orgs:
            sys = system_factory(organization=org)
            for service in cp_services:
                systems.append(sys)
                service_record_factory(service=service, cloud_system=sys, quantity=1)
                old_record = service_record_factory(service=service, cloud_system=sys, quantity=1)
                old_record.created_ts = old_record.created_ts - timedelta(days=40)
                old_record.save()
        # check monthly changes, must be 1 * len(cp_services), real usage is bigger because of old services
        changes = cp.calculate_monthly_changes(use_cache=False)
        for service_type, change in changes.items():
            assert change == len(cp_services)

        caches['default'].clear()
        request = arf.patch('/')
        request.user = cp_user.user
        data = {
            "services": {
                f"{service.id}": {"quantity": 6} for service in cp_services
            }
        }
        ser = SystemServiceQuantitySerializer(instance=systems[0], data=data)
        assert ser.is_valid(raise_exception=False)
        for service in cp_services:
            assert ser.validated_data['services'][service] == 4
        ser.save(user=cp_user.user)

        changes = cp.calculate_monthly_changes(use_cache=False)
        for service_type, change in changes.items():
            assert change == 7

        caches['default'].clear()
        data = {
            "services": {
                f"{service.id}": {"quantity": 11} for service in cp_services[1:]
            }
        }
        ser = SystemServiceQuantitySerializer(instance=systems[0], data=data)
        assert ser.is_valid(raise_exception=False) is False
        assert ChannelPartnerService.SERVICE_TYPES[0][1] not in ser.errors['services'][0].__str__()
        for typ, name in ChannelPartnerService.SERVICE_TYPES[1:]:
            assert name[1] in ser.errors['services'][0].__str__()

        # test limits for all cp above

        cp.monthly_additional_service_limit = None
        cp.save()

        root_cp.monthly_additional_service_limit = 10
        root_cp.save()

        caches['default'].clear()
        ser = SystemServiceQuantitySerializer(instance=systems[0], data=data)
        assert ser.is_valid(raise_exception=False) is False
        assert ChannelPartnerService.SERVICE_TYPES[0][1] not in ser.errors['services'][0].__str__()
        for typ, name in ChannelPartnerService.SERVICE_TYPES[1:]:
            assert name[1] in ser.errors['services'][0].__str__()

        cp.monthly_additional_service_limit = 200
        cp.save()

        root_cp.monthly_additional_service_limit = 10
        root_cp.save()

        caches['default'].clear()
        ser = SystemServiceQuantitySerializer(instance=systems[0], data=data)
        assert ser.is_valid(raise_exception=False) is False
        assert ChannelPartnerService.SERVICE_TYPES[0][1] not in ser.errors['services'][0].__str__()
        for typ, name in ChannelPartnerService.SERVICE_TYPES[1:]:
            assert name[1] in ser.errors['services'][0].__str__()


class TestChannelPartnerSerializer:

    def test_allow_changing_services(self, channel_partner_factory, cp_user_factory, arf):
        root = channel_partner_factory(parent_channel_partner=None)
        child = channel_partner_factory(parent_channel_partner=root)
        grandchild = channel_partner_factory(parent_channel_partner=child)
        root_user = cp_user_factory(channel_partner=root)
        request = arf.get('/')
        request.user = root_user.user
        context = {
            'request': request,
            'channel_partner_roles': None,
            'channel_partner_to_user': None,
        }
        # Test child when parent has disabled ACS
        ser = ChannelPartnerSerializer(instance=child, context=context)

        assert child.allow_changing_services is False
        assert ser.data['allowChangingServices'] is False

        ser = ChannelPartnerSerializer(instance=child, data={'allowChangingServices': True},
                                       partial=True, context=context)

        ser.is_valid(raise_exception=False)

        assert ser.errors
        assert ser.errors['allowChangingServices']
        assert 'Parent Channel Partner does not allow changing services.' in ser.errors['allowChangingServices']

        # Test root CP, ACS changes must be allowed
        ser = ChannelPartnerSerializer(instance=root, context=context)

        assert root.allow_changing_services is False
        assert ser.data['allowChangingServices'] is False

        ser = ChannelPartnerSerializer(instance=root, data={'allowChangingServices': True},
                                       partial=True, context=context)
        assert ser.is_valid()
        instance = ser.save()

        assert instance.id == root.id
        assert instance.allow_changing_services is True

        # Test child when parent has enabled ACS
        ser = ChannelPartnerSerializer(instance=child, context=context)

    def test_ownPermissions(self, channel_partner_factory, cp_user_factory, arf):
        cp = channel_partner_factory()
        roles = ChannelPartnerRole.objects.all()
        partners = []
        users = []
        for role in roles:
            partner = channel_partner_factory(parent_channel_partner=cp)
            partners.append(partner)
            user = cp_user_factory(channel_partner=partner, role=role.name)
            users.append(user)

        def context(cloud_user):
            context = {}
            context['channel_partner_roles'] = ChannelPartnerRole.objects.all().prefetch_related('permissions')
            context['channel_partner_to_user'] = ChannelPartnerToUser.objects.filter(user=cloud_user)
            context['request'] = arf.get('/')
            context['request'].user = cloud_user
            return context

        for role, partner, user in zip(roles, partners, users):
            serializer = ChannelPartnerSerializer(partners, many=True, context=context(user.user))
            for data in serializer.data:
                if str(partner.id) == data['id']:
                    assert data['ownPermissions'] == sorted([p.codename for p in role.permissions.all()])
                    assert data['ownRoles'] == user.roles
                else:
                    assert data['ownPermissions'] == []
                    assert data['ownRoles'] == []


class TestOrganizationSerializer:

    def test_ownPermissions(self, channel_partner_factory, organization_factory, org_user_factory, arf):
        cp = channel_partner_factory()
        roles = OrganizationRole.objects.all()
        orgs = []
        users = []
        for role in roles:
            org = organization_factory(channel_partner=cp)
            orgs.append(org)
            user = org_user_factory(organization=org, role=role.name)
            users.append(user)

        def context(cloud_user):
            context = {}
            context['organization_roles'] = OrganizationRole.objects.all().prefetch_related('permissions')
            context['organizations_to_user'] = OrganizationToUser.objects.filter(user=cloud_user)
            context['request'] = arf.get('/')
            context['request'].user = cloud_user
            return context

        for role, org, user in zip(roles, orgs, users):
            serializer = OrganizationSerializer(orgs, many=True, context=context(user.user))
            for data in serializer.data:
                if str(org.id) == data['id']:
                    assert data['ownPermissions'] == sorted([p.codename for p in role.permissions.all()])
                    assert data['ownRoles'] == user.roles
                else:
                    assert data['ownPermissions'] == []
                    assert data['ownRoles'] == []

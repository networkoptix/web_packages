import datetime
import json
import random
import uuid
from datetime import timedelta
from math import ceil

import pytest
from dateutil import relativedelta
from django.core.cache import caches
from django.db.models import Prefetch, Q
from django.utils import timezone
from model_bakery import baker

from partners.models import (
    ChannelPartnerServiceRecord, ChannelPartnerService, OrganizationRole, OrganizationToUser,
    ChannelPartnerRole, ChannelPartnerToUser, ChannelPartnerStates, OrganizationRoles, CloudUser, ServiceUsage
)
from partners.serializers import (
    ChannelPartnerSerializer, ChannelPartnerAggDataSerializer, OrganizationAggDataSerializer,
    SystemServiceQuantitySerializer, OrganizationSerializer, OrganizationUserSerializer,
    SystemGroupUserSerializer, ChannelPartnerRecordsParamSerializer, GroupSerializer
)
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

    def test_data(self, channel_partner_factory, organization_factory, system_factory,
                  cp_service_factory, service_record_factory, arf, cp_user_factory):
        root_cp = channel_partner_factory(parent_channel_partner=None)
        cp = channel_partner_factory(parent_channel_partner=root_cp)
        cp.monthly_additional_service_limit = 10
        cp.save()
        cp_orgs = [organization_factory(channel_partner=cp) for _ in range(3)]
        systems = []
        cp_services = [cp_service_factory(channel_partner=cp, service_type=tid)
                       for tid, tname in ChannelPartnerService.SERVICE_TYPES]
        for org in cp_orgs:
            sys = system_factory(organization=org)
            for service in cp_services:
                systems.append(sys)
                service_record_factory(service=service, cloud_system=sys, quantity=10)
                old_record = service_record_factory(service=service, cloud_system=sys, quantity=10)
                old_record.created_ts = old_record.created_ts - timedelta(days=40)
                old_record.save()

        serializer = SystemServiceQuantitySerializer(instance=systems[0])

        assert serializer.data
        for service in cp_services:
            assert serializer.data['services'][str(service.id)]['quantity'] == 20
            assert serializer.data['services'][str(service.id)]['used'] == 0

        from_ts = timezone.now() - timedelta(hours=2)
        to_ts = timezone.now() - timedelta(hours=1)
        for idx, service in enumerate(cp_services):
            ServiceUsage.objects.create(
                usage=idx, cloud_system=systems[0],
                service_id=service.id, from_ts=from_ts, to_ts=to_ts)

        serializer = SystemServiceQuantitySerializer(instance=systems[0])
        for idx, service in enumerate(cp_services):
            assert serializer.data['services'][str(service.id)]['quantity'] == 20
            assert serializer.data['services'][str(service.id)]['used'] == ceil(idx / ServiceUsage.CHECK_PERIOD)


class TestChannelPartnerSerializer:

    # def test_allow_changing_services(self, channel_partner_factory, cp_user_factory, arf):
    #     root = channel_partner_factory(parent_channel_partner=None)
    #     child = channel_partner_factory(parent_channel_partner=root)
    #     grandchild = channel_partner_factory(parent_channel_partner=child)
    #     root_user = cp_user_factory(channel_partner=root)
    #     request = arf.get('/')
    #     request.user = root_user.user
    #     context = {
    #         'request': request,
    #         'channel_partner_roles': None,
    #         'channel_partner_to_user': None,
    #     }
    #     # Test child when parent has disabled ACS
    #     ser = ChannelPartnerSerializer(instance=child, context=context)
    #
    #     assert child.allow_changing_services is False
    #     assert ser.data['allowChangingServices'] is False
    #
    #     ser = ChannelPartnerSerializer(instance=child, data={'allowChangingServices': True},
    #                                    partial=True, context=context)
    #
    #     ser.is_valid(raise_exception=False)
    #
    #     assert ser.errors
    #     assert ser.errors['allowChangingServices']
    #     assert 'Parent Channel Partner does not allow changing services.' in ser.errors['allowChangingServices']
    #
    #     # Test root CP, ACS changes must be allowed
    #     ser = ChannelPartnerSerializer(instance=root, context=context)
    #
    #     assert root.allow_changing_services is False
    #     assert ser.data['allowChangingServices'] is False
    #
    #     ser = ChannelPartnerSerializer(instance=root, data={'allowChangingServices': True},
    #                                    partial=True, context=context)
    #     assert ser.is_valid()
    #     instance = ser.save()
    #
    #     assert instance.id == root.id
    #     assert instance.allow_changing_services is True
    #
    #     # Test child when parent has enabled ACS
    #     ser = ChannelPartnerSerializer(instance=child, context=context)
    #
    #     assert root.allow_changing_services is True
    #     assert ser.data['allowChangingServices'] is False
    #
    #     ser = ChannelPartnerSerializer(instance=child, data={'allowChangingServices': True},
    #                                    partial=True, context=context)
    #
    #     assert ser.is_valid()
    #     instance = ser.save()
    #
    #     assert instance.id == child.id
    #     assert instance.allow_changing_services is True

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
            context['channel_partner_to_user'] = ChannelPartnerToUser.objects.filter(user=cloud_user)
            context['request'] = arf.get('/')
            context['request'].user = cloud_user
            return context

        for role, partner, user in zip(roles, partners, users):
            serializer = ChannelPartnerSerializer(partners, many=True, context=context(user.user))
            for data in serializer.data:
                if str(partner.id) == data['id']:
                    assert set(data['ownPermissions']) == set([p.codename for p in role.permissions.all()])
                    assert data['ownRoles'] == user.roles_name
                    assert data['ownRolesIds'] == user.roles
                else:
                    assert data['ownPermissions'] == []
                    assert data['ownRolesIds'] == []
                    assert data['ownRoles'] == []


class TestOrganizationSerializer:

    def test_current_services(self, default_channel_partner, organization_factory, system_factory,
                              cp_service_factory, org_service_factory, service_record_factory, arf,
                              default_cp_admin):
        request = arf.get('/')
        request.user = default_cp_admin.user
        org = organization_factory()
        systems = [system_factory(organization=org) for _ in range(5)]
        disabled_system = system_factory(organization=org)
        services = [cp_service_factory() for _ in range(3)]
        org_service_properties = [org_service_factory(organization=org, service=service, price=10-i) for i, service in enumerate(services)]
        service_records = []
        for i, service in enumerate(services):
            service_records += [service_record_factory(service, sys, quantity=1+i) for sys in systems[i:]]
            service_record_factory(service, disabled_system)
        disabled_system.state = ChannelPartnerStates.SHUTDOWN
        disabled_system.save()

        ser = OrganizationSerializer(org, context={'request': request})

        current_services = ser.data["currentServices"]

        assert set(current_services.keys()) == set([str(service.id) for service in services])
        for i, service in enumerate(services):
            assert current_services[str(service.id)]["price"] == 10 - i
            assert current_services[str(service.id)]["quantity"] == (1 + i) * (len(systems) - i)
            assert current_services[str(service.id)]["total"] == (1 + i) * (10 - i) * (len(systems) - i)

    def test_ownPermissions(self, channel_partner_factory, organization_factory,
                            cp_user_factory, org_user_factory, arf):
        cp = channel_partner_factory()
        cp_user = cp_user_factory(channel_partner=cp)
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
            context['organizations_to_user'] = OrganizationToUser.objects.filter(user=cloud_user)
            context['channel_partner_to_user'] = ChannelPartnerToUser.objects.filter(user=cloud_user)
            context['request'] = arf.get('/')
            context['request'].user = cloud_user
            return context

        for role, org, user in zip(roles, orgs, users):
            serializer = OrganizationSerializer(orgs, many=True, context=context(user.user))
            for data in serializer.data:
                if str(org.id) == data['id']:
                    assert set(data['ownPermissions']) == set([p.codename for p in role.permissions.all()])
                    assert data['ownRolesIds'] == user.roles
                    assert data['ownRoles'] == user.roles_name
                else:
                    assert data['ownPermissions'] == []
                    assert data['ownRolesIds'] == []
                    assert data['ownRoles'] == []

        organization = orgs[0]
        org_admin_role = roles.get(id=OrganizationRoles.ORGANIZATION_ADMINISTRATOR)
        organization.channel_partner_access_level = org_admin_role
        organization.save()
        serializer = OrganizationSerializer(organization, context=context(cp_user.user))
        assert set(serializer.data['ownPermissions']) == set([p.codename for p in org_admin_role.permissions.all()])
        assert serializer.data['ownRolesIds'] == [org_admin_role.id]


class TestChannelPartnerRecordsParamSerializer:

    def setup_method(self):
        self.ts = datetime.date(2023, 8, 31)

    def test_no_end_ts(self):
         params = {"startTs": self.ts}
         ser = ChannelPartnerRecordsParamSerializer(data=params)
         assert ser.is_valid()
         assert ser.validated_data["endTs"] == self.ts + relativedelta.relativedelta(months=1)
         assert ser.validated_data["startTs"] == self.ts

    def test_no_start_ts(self):
         params = {"endTs": self.ts}
         ser = ChannelPartnerRecordsParamSerializer(data=params)
         assert ser.is_valid()
         assert ser.validated_data["startTs"] == (self.ts - relativedelta.relativedelta(months=1))
         assert ser.validated_data["endTs"] == self.ts

    def test_no_params(self):
        today = datetime.date.today()
        params = {}
        ser = ChannelPartnerRecordsParamSerializer(data=params)
        assert ser.is_valid()
        assert ser.validated_data["startTs"] == (today - relativedelta.relativedelta(months=1))
        assert ser.validated_data["endTs"] == today

    def test_invalid_period(self):
        params = {"endTs": self.ts, "startTs": datetime.date.today()}
        ser = ChannelPartnerRecordsParamSerializer(data=params)
        assert ser.is_valid() is False
        assert ser.errors["endTs"][0] == '"startTs" cannot be greater than "endTs".'
        assert ser.errors["startTs"][0] == '"startTs" cannot be greater than "endTs".'



class TestGroupSerializer:
    @pytest.fixture(autouse=True)
    def setup(self, organization_factory, system_group_factory):
        self.organization = organization_factory()
        self.groups = []
        parent_group = None
        for _ in range(5):
            parent_group = system_group_factory(organization=self.organization, parent=parent_group)
            self.groups.append(parent_group)
        self.other_org = organization_factory()
        self.other_group = system_group_factory(organization=self.other_org)

    def test_validate_parentId(self):
        common_data = {
            "name": f'{uuid.uuid4()}',
            "organizationId": self.organization.id
        }

        # test different organizations
        serializer = GroupSerializer(
            self.groups[-1], data={"parentId": self.other_group.id, **common_data}
        )
        assert serializer.is_valid() is False
        assert serializer.errors["parentId"][0] == 'Parent group must be from the same organization'

        # test cycle
        serializer = GroupSerializer(
            self.groups[2], data={"parentId": self.groups[-1].id, **common_data}
        )
        assert serializer.is_valid() is False
        assert 'Groups tree for group ' in serializer.errors["parentId"][0]

        # test valid
        serializer = GroupSerializer(
            self.groups[-1], data={"parentId": self.groups[2].id, **common_data}
        )
        assert serializer.is_valid() is True


class TestOrganizationUserSerializer:

    @pytest.fixture(autouse=True)
    def setup(self, channel_partner_factory, organization_factory,
              cloud_user_factory, org_user_factory, system_group_factory):
        self.cp = channel_partner_factory()
        self.org = organization_factory(channel_partner=self.cp)
        self.groups = [system_group_factory(organization=self.org) for _ in range(4)]
        self.user = cloud_user_factory(email='test@networkoptix.com')
        self.other_org = organization_factory(channel_partner=self.cp)
        self.other_group = system_group_factory(organization=self.other_org)
        self.org_adm_name = 'Organization Administrator'
        self.org_power_user_name = 'Power User'

    def test_create_valid(self, sys_group_user_factory, arf, org_user_factory, mock_account_status,
                          mock_get_customization_request, mock_post_notification, httpx_mock):

        data = {
            'email': self.user.email,
            'role': self.org_adm_name
        }
        org_admin = org_user_factory(organization=self.org)
        request = arf.post('/')
        request.user = org_admin.user
        mock_account_status(email=self.user.email, active=False)
        mock_get_customization_request()
        notification_send_url = mock_post_notification()
        serializer = OrganizationUserSerializer(data=data,
                                                context={'organization': self.org, 'request': request})

        serializer.is_valid()
        assert not serializer.errors

        serializer.save()

        assert serializer.data['roles'] == [self.org_adm_name]
        notification_send_request = httpx_mock.get_request(url=notification_send_url)
        notification_data = json.loads(notification_send_request.content)
        assert notification_data['type'] == 'cps_organization_invite'
        assert notification_data['user_email'] == self.user.email
        assert notification_data['message']['organization_name'] == self.org.name
        assert notification_data['message']['sharer_name'] == org_admin.user.full_name

        relations = OrganizationToUser.objects.filter(organization=self.org, user=self.user)
        assert relations.count() == 1
        assert relations.first().system_group is None
        assert relations.first().roles == [OrganizationRoles.ORGANIZATION_ADMINISTRATOR]

        user = (
            CloudUser.objects.all().
            prefetch_related(
                Prefetch(
                    'organizationtouser_set',
                    queryset=OrganizationToUser.objects.all(),
                    to_attr='organization_relations'
                )
            ).distinct().get(email=self.user.email))

        serializer = OrganizationUserSerializer(instance=user)

        assert serializer.data['email'] == self.user.email
        assert len(serializer.data['groupRoles']) == 0
        assert serializer.data['roles'] == [self.org_adm_name]

        group_user = sys_group_user_factory(organization=self.org)
        user = (
            CloudUser.objects.all().
            prefetch_related(
                Prefetch(
                    'organizationtouser_set',
                    queryset=OrganizationToUser.objects.all(),
                    to_attr='organization_relations'
                )
            ).distinct().get(email=group_user.user.email))
        serializer = OrganizationUserSerializer(instance=user)
        assert serializer.data['email'] == group_user.user.email
        assert serializer.data['groupRoles'][0] == {
            'groupId': str(group_user.system_group_id), 'roles': [self.org_adm_name],
            'rolesIds': [str(OrganizationRoles.ORGANIZATION_ADMINISTRATOR)]
        }
        assert serializer.data['roles'] == []

        user = group_user.user
        data = {
            'email': user.email,
            'role': self.org_adm_name
        }
        serializer = OrganizationUserSerializer(data=data, context={'organization': self.org, 'request': request})

        serializer.is_valid()
        serializer.save()
        assert not serializer.errors
        assert serializer.data['email'] == user.email
        assert serializer.data['fullName'] == user.full_name
        assert len(serializer.data['groupRoles']) == 0
        assert serializer.data['roles'] == [self.org_adm_name]
        assert not OrganizationToUser.objects.filter(user=user, organization=self.org, system_group__isnull=False).exists()

    def test_create_invalid_system_group(self):
        data = {
            'email': self.user.email,
            'role': 'invalid'
        }
        serializer = OrganizationUserSerializer(data=data, context={'organization': self.org})

        serializer.is_valid()
        assert serializer.errors
        assert serializer.errors['role'][0]


class TestSystemGroupUserSerializer:

    @pytest.fixture(autouse=True)
    def setup(self, channel_partner_factory, organization_factory, sys_group_user_factory,
                     cloud_user_factory, org_user_factory, system_group_factory, arf,
                     mock_account_status, mock_get_customization_request,
                     mock_post_notification, httpx_mock):
        self.cp = channel_partner_factory()
        self.org = organization_factory(channel_partner=self.cp)
        self.group = system_group_factory(organization=self.org)
        self.org_admin = org_user_factory(organization=self.org)
        self.org_user = org_user_factory(email='test@networkoptix.com')
        self.users = [sys_group_user_factory(organization=self.org, group=self.group) for _ in range(5)]
        self.other_org = organization_factory(channel_partner=self.cp)
        self.other_group = system_group_factory(organization=self.other_org)
        self.org_adm_name = 'Organization Administrator'
        self.org_power_user_name = 'Power User'
        self.request = arf.post('/')
        self.request.user = self.org_admin.user
        mock_account_status(email=self.org_user.user.email, active=False)
        mock_get_customization_request()
        self.notification_send_url = mock_post_notification()

    def test_data(self):
        serializer = SystemGroupUserSerializer(instance=self.users[0])

        assert serializer.data
        assert serializer.data['email'] == self.users[0].user.email
        assert serializer.data['fullName'] == self.users[0].user.full_name
        assert serializer.data['roles'] == self.users[0].roles_name

        serializer = SystemGroupUserSerializer(instance=self.users, many=True)

        assert serializer.data
        for i, data in enumerate(serializer.data):
            assert data['email'] == self.users[i].user.email
            assert data['fullName'] == self.users[i].user.full_name
            assert data['roles'] == self.users[i].roles_name

    def test_create(self):
        user = self.org_user.user
        data = {
            'email': self.org_user.user.email,
            'role': 'Administrator'
        }

        serializer = SystemGroupUserSerializer(data=data, context={'group': self.group, 'request': self.request})
        assert serializer.is_valid()

        group_rel = serializer.save()
        assert group_rel.roles == [OrganizationRoles.ADMINISTRATOR]
        assert group_rel.user == user
        user_rels = OrganizationToUser.objects.filter(organization=self.org, user=user)
        assert user_rels.count() == 1

    def test_groups_overlap(self, sys_group_user_factory, system_group_factory):
        child_group = system_group_factory(organization=self.org, parent=self.group)
        child_group_rel = sys_group_user_factory(organization=self.org, group=child_group, cloud_user=self.org_user.user)
        user = self.org_user.user
        data = {
            'email': self.org_user.user.email,
            'role': 'Administrator'
        }

        serializer = SystemGroupUserSerializer(data=data, context={'group': self.group})
        assert serializer.is_valid() is False
        assert 'overlap' in serializer.errors['email'][0]

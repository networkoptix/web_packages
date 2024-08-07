import datetime
import json
import random
import re
import uuid
from datetime import timedelta
from uuid import uuid4

import pytest
import pytz
from dateutil import relativedelta
from django.core.cache import caches
from django.db.models import Prefetch
from django.utils import timezone

from partners.models import (
    ActionConfirmation,
    ChannelPartner,
    ChannelPartnerRole,
    ChannelPartnerRoles,
    ChannelPartnerService,
    ChannelPartnerStates,
    ChannelPartnerToUser,
    CloudUser,
    NotificationTypes,
    OrganizationRole,
    OrganizationRoles,
    OrganizationToUser,
    ServiceUsage,
    SystemServiceCurrentQuantity,
)
from partners.serializers.v2.serializers import (
    ChannelPartnerAggDataSerializer,
    ChannelPartnerRecordsParamSerializer,
    ChannelPartnerSerializer,
    ChannelPartnerStateChangeSerializer,
    ChannelPartnerStateConfirmationSerializer,
    CloudStorageUsageReportSerializer,
    CloudSystemSerializer,
    GroupSerializer,
    OrganizationAggDataSerializer,
    OrganizationSerializer,
    OrganizationStateChangeSerializer,
    OrganizationStateConfirmationSerializer,
    OrganizationUserSerializer,
    SupportInformationSerializer,
    SystemGroupUserSerializer,
    SystemServiceQuantitySerializer,
    SystemUsageReportSerializer,
)
from tools.serializers import VALUE_REPLACEMENT


class TestChannelPartnerAggDataSerializer:

    @pytest.fixture(autouse=True)
    def setup(self):
        pass

    def test_data(self, default_channel_partner, channel_partner_factory, organization_factory,
                  system_factory, arf, mock_auth_with_user, default_cp_admin, service_record_factory,
                  cp_service_factory):
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
        services = [
            service_record_factory(
                service=cp_service_factory(channel_partner=systems[i].organization.channel_partner),
                cloud_system=systems[i], quantity=gen_count,
                organization=systems[i].organization
            ) for i in range(len(organizations))]

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
                        service_record_factory(
                            service=cp_service_factory(channel_partner=sys.organization.channel_partner),
                            cloud_system=sys, quantity=1, organization=sys.organization
                        )


        ser = ChannelPartnerAggDataSerializer(instance=other_cp)

        assert ser.data['channelPartners'] == 2
        assert ser.data['organizations'] == 4
        assert ser.data['systems'] == 8
        assert ser.data['serviceUsageQuantity'] == 16

        ser = ChannelPartnerAggDataSerializer(instance=level_3[0])

        assert ser.data['channelPartners'] == 0


class TestOrganizationAggDataSerializer:

    def test_data(self, organization_factory, system_factory, cp_service_factory, service_record_factory):
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
            service_record_factory(
                service=cp_service_factory(channel_partner=sys.organization.channel_partner),
                cloud_system=sys, quantity=qty, organization=sys.organization
            )
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
        cp_services = [cp_service_factory(channel_partner=cp)
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
            SystemServiceCurrentQuantity.objects.create(
                cloud_system=systems[0],
                organization=systems[0].organization,
                service=service,
                quantity=1 + idx,
            )

        serializer = SystemServiceQuantitySerializer(instance=systems[0])
        for idx, service in enumerate(cp_services):
            assert serializer.data['services'][str(service.id)]['quantity'] == 20
            assert serializer.data['services'][str(service.id)]['used'] == 1 + idx

    def test_expired_services(self,
                              channel_partner_factory,
                              organization_factory,
                              system_factory,
                              service_record_factory,
                              cp_service_factory,
                              arf):

        cp = channel_partner_factory()
        org = organization_factory(channel_partner=cp)
        sys = system_factory(
            organization=org,
            # created_ts=timezone.now() - timedelta(days=40),
        )
        service_add_date = timezone.now() - timedelta(days=35)
        regular_service = cp_service_factory(channel_partner=cp)
        expired_service = cp_service_factory(
            channel_partner=cp,
            sub_type=ChannelPartnerService.DEMO,
            duration=1
        )
        not_expired_service = cp_service_factory(
            channel_partner=cp,
            sub_type=ChannelPartnerService.DEMO,
            duration=2
        )
        not_used_service = cp_service_factory(
            channel_partner=cp,
            sub_type=ChannelPartnerService.DEMO,
            duration=1
        )
        service_record_factory(
            service=regular_service,
            cloud_system=sys,
            quantity=1,
            created_ts=service_add_date
        )
        service_record_factory(
            service=expired_service,
            cloud_system=sys,
            quantity=1,
            created_ts=service_add_date
        )
        service_record_factory(
            service=not_expired_service,
            cloud_system=sys,
            quantity=1,
            created_ts=service_add_date
        )
        data = {
            "services": {
                f"{service.id}": {"quantity": 11}
                for service in
                [regular_service, expired_service, not_expired_service, not_used_service]
            }
        }
        serializer = SystemServiceQuantitySerializer(instance=sys, data=data)
        assert serializer.is_valid() is False
        assert serializer.errors['services'][str(expired_service.id)] == 'Service has expired'
        assert list(serializer.errors['services'].keys()) == [str(expired_service.id)]


class TestChannelPartnerSerializer:

    def test_partner_count_and_organization_count(self, channel_partner_factory, organization_factory,
                                                  mocker, cp_user_factory, arf):
        def context(cloud_user):
            context = {}
            context['channel_partner_to_user'] = ChannelPartnerToUser.objects.filter(user=cloud_user)
            context['request'] = arf.get('/')
            context['request'].user = cloud_user
            return context
        partner_count_spy = mocker.spy(ChannelPartner, 'partner_count')
        organization_count_spy = mocker.spy(ChannelPartner, 'organization_count')

        parent = channel_partner_factory()
        role = ChannelPartnerRole.objects.all().first()
        user = cp_user_factory(channel_partner=parent, role=role.name)
        # Create some children for the parent
        child1 = channel_partner_factory(parent_channel_partner=parent)
        child2 = channel_partner_factory(parent_channel_partner=parent)
        child3 = channel_partner_factory(parent_channel_partner=parent)

        serializer = ChannelPartnerSerializer(parent, context=context(user.user))
        data = serializer.data

        assert data['partnerCount'] == 3
        assert data['organizationCount'] == 0
        assert partner_count_spy.call_count == 1
        assert organization_count_spy.call_count == 1

    def test_partner_count_and_organization_count_for_listing(self, channel_partner_factory, organization_factory,
                                                  cp_user_factory, arf, mocker):
        def context(cloud_user):
            context = {}
            context['channel_partner_to_user'] = ChannelPartnerToUser.objects.filter(user=cloud_user)
            context['request'] = arf.get('/')
            context['request'].user = cloud_user
            return context

        partner_count_spy = mocker.spy(ChannelPartner, 'partner_count')
        organization_count_spy = mocker.spy(ChannelPartner, 'organization_count')

        parents = [channel_partner_factory() for _ in range(3)]
        for parent in parents:
            role = ChannelPartnerRole.objects.all().first()
            user = cp_user_factory(channel_partner=parent, role=role.name)
            # Create some children for the parent
            child1 = channel_partner_factory(parent_channel_partner=parent)
            child2 = channel_partner_factory(parent_channel_partner=parent)
            child3 = channel_partner_factory(parent_channel_partner=parent)
            organization_factory(channel_partner=parent)

        serializer = ChannelPartnerSerializer(parents, context=context(user.user), many=True)
        data = serializer.data

        assert partner_count_spy.call_count == 3
        assert organization_count_spy.call_count == 3

        parents += [channel_partner_factory() for _ in range(2)]
        serializer = ChannelPartnerSerializer(parents, context=context(user.user), many=True)
        data = serializer.data

        assert partner_count_spy.call_count == 5
        assert organization_count_spy.call_count == 5

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
                    assert data['created']
                    assert data['lastModified']
                else:
                    assert data['ownPermissions'] == []
                    assert data['ownRolesIds'] == []
                    assert data['ownRoles'] == []


class TestOrganizationSerializer:

    @pytest.fixture(autouse=True)
    def setup(self, arf):
        def context(cloud_user):
            context = {}
            context['organizations_to_user'] = OrganizationToUser.objects.filter(user=cloud_user)
            context['channel_partner_to_user'] = ChannelPartnerToUser.objects.filter(user=cloud_user)
            context['request'] = arf.get('/')
            context['request'].user = cloud_user
            return context

        self.context = context

    @pytest.mark.django_db
    def test_fields_existence(self, arf, default_cp_admin, organization_factory):
        """
        Test that all expected fields exist in the serialized data of an Organization object.
        """
        # Build out Request
        request = arf.get('/')
        request.user = default_cp_admin.user

        # Build out Organizational instance
        organization = organization_factory(channel_partner=default_cp_admin.channel_partner)

        # Serialize with request for context and Organization
        serializer = OrganizationSerializer(organization, context={'request': request})
        data = serializer.data

        expected_fields = [
            "id",
            "state",
            "created",
            "lastModified",
            "effectiveState",
            "channelPartner",
            "channelPartnerAccessLevel",
            "attributes",
            "currentServices",
            "ownPermissions",
            "ownRolesIds",
            "ownRoles",
            "name",
            'systemCount'
        ]
        # Test for all fields
        for field in expected_fields:
            assert field in data, f"Expected field {field} not found in serialized data."

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
        data = ser.data

        current_services = data["currentServices"]
        assert data['systemCount'] == 6
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

        for role, org, user in zip(roles, orgs, users):
            serializer = OrganizationSerializer(orgs, many=True, context=self.context(user.user))
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
        serializer = OrganizationSerializer(organization, context=self.context(cp_user.user))
        assert set(serializer.data['ownPermissions']) == set([p.codename for p in org_admin_role.permissions.all()])
        assert serializer.data['ownRolesIds'] == [org_admin_role.id]
        # Check if CPAN is not applied for Reports Viewer
        reports_viewer = cp_user_factory(channel_partner=cp, role=ChannelPartnerRoles.REPORTS_VIEWER)
        organization.channel_partner_access_level_id = OrganizationRoles.ORGANIZATION_ADMINISTRATOR
        organization.save()
        serializer = OrganizationSerializer(organization, context=self.context(reports_viewer.user))
        assert serializer.data['ownPermissions'] == []
        assert serializer.data['ownRolesIds'] == []

    def test_channelPartnerAccessLevel(self, channel_partner_factory, organization_factory,
                                       org_user_factory, arf):
        cp = channel_partner_factory()
        org = organization_factory(channel_partner=cp)
        org_user = org_user_factory(organization=org)

        serializer = OrganizationSerializer(instance=org, context=self.context(org_user.user))
        assert serializer.data['channelPartnerAccessLevel'] == OrganizationRoles.ORGANIZATION_ADMINISTRATOR
        org.channel_partner_access_level = None
        org.save()

        serializer = OrganizationSerializer(instance=org, context=self.context(org_user.user))
        assert serializer.data['channelPartnerAccessLevel'] is None

        data = {'channelPartnerAccessLevel': None}
        serializer = OrganizationSerializer(instance=org, data=data, context=self.context(org_user.user), partial=True)
        assert serializer.is_valid()
        assert serializer.validated_data['channel_partner_access_level_id'] is None

        data = {'channelPartnerAccessLevel': OrganizationRoles.SYSTEM_HEALTH_VIEWER}
        serializer = OrganizationSerializer(instance=org, data=data, context=self.context(org_user.user), partial=True)
        assert serializer.is_valid()
        assert serializer.validated_data['channel_partner_access_level_id'] == OrganizationRoles.SYSTEM_HEALTH_VIEWER

        data = {'channelPartnerAccessLevel': OrganizationRoles.POWER_USER}
        serializer = OrganizationSerializer(instance=org, data=data, context=self.context(org_user.user), partial=True)
        assert serializer.is_valid() is False

        data = {'name': 'new name'}
        serializer = OrganizationSerializer(instance=org, data=data, context=self.context(org_user.user), partial=True)
        assert serializer.is_valid()
        assert 'channel_partner_access_level_id' not in serializer.validated_data

    def test_channelPartnerAccessLevel_administrator_validation(
            self, channel_partner_factory, organization_factory, cp_user_factory, arf):
        err_message = ('There should be at least one user in the organization'
                       ' with Organization Administrator permissions')
        cp = channel_partner_factory()
        user = cp_user_factory(channel_partner=cp)
        org = organization_factory(channel_partner=cp)
        assert org.channel_partner_access_level_id == OrganizationRoles.ORGANIZATION_ADMINISTRATOR
        data = {'channelPartnerAccessLevel': OrganizationRoles.SYSTEM_HEALTH_VIEWER}
        serializer = OrganizationSerializer(instance=org, data=data, context=self.context(user.user), partial=True)
        assert serializer.is_valid() is False
        assert serializer.errors['channelPartnerAccessLevel'][0] == err_message

        data = {'channelPartnerAccessLevel': None}
        serializer = OrganizationSerializer(instance=org, data=data, context=self.context(user.user), partial=True)
        assert serializer.is_valid() is False
        assert serializer.errors['channelPartnerAccessLevel'][0] == err_message

        data = {'channelPartnerAccessLevel': OrganizationRoles.ORGANIZATION_ADMINISTRATOR}
        serializer = OrganizationSerializer(instance=org, data=data, context=self.context(user.user), partial=True)
        assert serializer.is_valid()



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
        tomorrow = datetime.date.today() + relativedelta.relativedelta(days=1)
        params = {}
        ser = ChannelPartnerRecordsParamSerializer(data=params)
        assert ser.is_valid()
        assert ser.validated_data["startTs"] == (tomorrow - relativedelta.relativedelta(months=1))
        assert ser.validated_data["endTs"] == ser.validated_data["startTs"] + relativedelta.relativedelta(months=1)

    def test_invalid_period(self):
        params = {"endTs": self.ts, "startTs": datetime.date.today()}
        ser = ChannelPartnerRecordsParamSerializer(data=params)
        assert ser.is_valid() is False
        assert ser.errors["endTs"][0] == '"startTs" cannot be greater than "endTs".'
        assert ser.errors["startTs"][0] == '"startTs" cannot be greater than "endTs".'

    def test_too_large_period(self):
        params = {
            "endTs": datetime.date.today(),
            "startTs": datetime.date.today() - relativedelta.relativedelta(months=13)
        }
        ser = ChannelPartnerRecordsParamSerializer(data=params)
        assert ser.is_valid() is False
        assert ser.errors["endTs"][0] == "Look up range cannot be more than 1 year."
        assert ser.errors["startTs"][0] == "Look up range cannot be more than 1 year."



class TestGroupSerializer:
    @pytest.fixture(autouse=True)
    def setup(self, organization_factory, system_group_factory, system_factory, arf,
              org_user_factory):
        self.organization = organization_factory()
        self.org_user = org_user_factory(organization=self.organization)
        self.groups = []
        parent_group = None
        for _ in range(5):
            parent_group = system_group_factory(organization=self.organization, parent=parent_group)
            self.groups.append(parent_group)
            system = system_factory(organization=self.organization, system_group=parent_group)
        self.other_org = organization_factory()
        self.other_group = system_group_factory(organization=self.other_org)
        self.request = arf.get('/')
        self.request.cloud_host = self.organization.channel_partner.cloud_host
        self.request.user = self.org_user.user
        self.context = {'request': self.request}

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

    def test_path_read_only(self):
        data = {
            "name": f'{uuid.uuid4()}',
            "organizationId": self.organization.id,
            "parentId": self.groups[2].id,
            "path": [str(uuid.uuid4()), str(uuid.uuid4()), str(uuid.uuid4())]
        }
        serializer = GroupSerializer(instance=self.groups[-1], data=data)
        assert serializer.is_valid() is True
        assert 'path' not in serializer.validated_data

    def test_systemCount(self):
        serializer = GroupSerializer(instance=self.other_group, context=self.context)
        assert serializer.data["systemCount"] == 0
        for i in range(5):
            serializer = GroupSerializer(instance=self.groups[i], context=self.context)
            assert serializer.data["systemCount"] == 5 - i

    def test_cloudSystems(self):
        serializer = GroupSerializer(instance=self.groups[0], context=self.context)
        assert serializer.data["systemCount"] == 5
        assert len(serializer.data["cloudSystems"]) == 1
        assert len(serializer.data["systems"]) == 1
        assert len(serializer.data["children"]) == 1
        assert serializer.data["cloudSystems"][0]["name"]
        assert serializer.data["cloudSystems"][0]["state"]
        assert serializer.data["cloudSystems"][0]["effectiveState"]


class TestOrganizationUserSerializer:

    @pytest.fixture(autouse=True)
    def setup(self, channel_partner_factory, organization_factory,
              cloud_user_factory, org_user_factory, system_group_factory):
        self.cp = channel_partner_factory()
        self.org = organization_factory(channel_partner=self.cp)
        self.groups = [system_group_factory(organization=self.org) for _ in range(4)]
        self.user = cloud_user_factory(email='test@networkoptix.com')
        # create another user relation to test prefetched data
        org_user_factory(organization=organization_factory(), email=self.user.email,
                         role=OrganizationRoles.SYSTEM_HEALTH_VIEWER)
        self.other_org = organization_factory(channel_partner=self.cp)
        self.other_group = system_group_factory(organization=self.other_org)
        self.org_adm_name = 'Organization Administrator'
        self.adm_name = 'Systems Administrator'
        self.org_power_user_name = 'Power User'

    @pytest.mark.no_tasks_autofix
    def test_create_valid(self, sys_group_user_factory, arf, org_user_factory, mock_account_status,
                          mock_get_customization_request, mock_post_notification, httpx_mock, mocker):
        data = {
            'email': self.user.email,
            'role': self.org_adm_name
        }
        org_admin = org_user_factory(organization=self.org)
        request = arf.post('/')
        request.user = org_admin.user
        mock_account_status(email=self.user.email, active=False)
        mock_account_status(email=org_admin.user.email, active=False)
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
        # Checking against Email since, by default full_name is None
        assert notification_data['message']['sharer_name'] == org_admin.user.email

        relations = OrganizationToUser.objects.filter(organization=self.org, user=self.user)
        assert relations.count() == 1
        assert relations.first().system_group is None
        assert relations.first().roles == [OrganizationRoles.ORGANIZATION_ADMINISTRATOR]

        user = (
            CloudUser.objects.all().
            prefetch_related(
                Prefetch(
                    'organizationtouser_set',
                    queryset=OrganizationToUser.objects.filter(organization=self.org),
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
                    queryset=OrganizationToUser.objects.filter(organization=self.org),
                    to_attr='organization_relations'
                )
            ).distinct().get(email=group_user.user.email))
        serializer = OrganizationUserSerializer(instance=user)
        assert serializer.data['email'] == group_user.user.email
        assert serializer.data['groupRoles'][0]['roles'] == [self.adm_name]
        assert serializer.data['groupRoles'][0]['rolesIds'] == [str(OrganizationRoles.SYSTEMS_ADMINISTRATOR)]
        assert serializer.data['groupRoles'][0]['groupId'] == str(group_user.system_group_id)
        assert serializer.data['groupRoles'][0]['created']
        assert serializer.data['groupRoles'][0]['lastModified']

        httpx_mock.reset(False)
        notification_send_url = mock_post_notification()
        user = group_user.user
        data = {
            'email': user.email,
            'role': self.org_adm_name
        }
        mock_account_status(email=self.user.email, active=False)
        mock_account_status(email=group_user.user.email, active=False)
        serializer = OrganizationUserSerializer(data=data, context={'organization': self.org, 'request': request})

        serializer.is_valid()
        serializer.save()
        assert not serializer.errors
        assert serializer.data['email'] == user.email
        assert serializer.data['fullName'] == user.full_name
        assert len(serializer.data['groupRoles']) == 0
        assert serializer.data['roles'] == [self.org_adm_name]
        # Group role deleted
        assert not (OrganizationToUser.objects
                    .filter(user=user, organization=self.org, system_group__isnull=False)
                    .exists())
        # Notification is not sent
        assert httpx_mock.get_request(url=notification_send_url) is None

    def test_create_invalid_system_group(self):
        data = {
            'email': self.user.email,
            'role': 'invalid'
        }
        serializer = OrganizationUserSerializer(data=data, context={'organization': self.org})

        serializer.is_valid()
        assert serializer.errors
        assert serializer.errors['role'][0]

    def test_changing_the_only_admin(self, mock_new_org_user_role_notification, org_user_factory):
        user= org_user_factory(organization=self.org)
        data = {
            'email': user.user.email,
            'roleId': OrganizationRoles.POWER_USER
        }
        serializer = OrganizationUserSerializer(data=data, context={'organization': self.org})

        assert serializer.is_valid() is False
        assert serializer.errors['roleId'][0] == 'It is impossible to change role for the only administrator.'

    def test_changing_the_second_admin(self, mock_new_org_user_role_notification, org_user_factory):
        user = org_user_factory(organization=self.org)
        other_user = org_user_factory(organization=self.org)
        data = {
            'email': user.user.email,
            'roleId': OrganizationRoles.POWER_USER
        }
        serializer = OrganizationUserSerializer(data=data, context={'organization': self.org})

        assert serializer.is_valid() is True

    def test_changing_the_only_admin_2_users(self, mock_new_org_user_role_notification, org_user_factory):
        user = org_user_factory(organization=self.org)
        other_user = org_user_factory(organization=self.org, role=OrganizationRoles.POWER_USER)
        data = {
            'email': user.user.email,
            'roleId': OrganizationRoles.POWER_USER
        }
        serializer = OrganizationUserSerializer(data=data, context={'organization': self.org})

        assert serializer.is_valid() is False
        assert serializer.errors['roleId'][0] == 'It is impossible to change role for the only administrator.'


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
        self.other_org_user = org_user_factory(email='test@networkoptix.com')
        self.users = [sys_group_user_factory(organization=self.org, group=self.group) for _ in range(5)]
        self.other_org = organization_factory(channel_partner=self.cp)
        self.other_group = system_group_factory(organization=self.other_org)
        self.sub_group = system_group_factory(organization=self.org, parent=self.group)
        self.sub_group_admin = sys_group_user_factory(organization=self.org, group=self.sub_group)
        self.org_adm_name = 'Organization Administrator'
        self.org_power_user_name = 'Power User'
        self.request = arf.post('/')
        self.request.user = self.org_admin.user
        mock_account_status(email=self.other_org_user.user.email, active=False)
        mock_get_customization_request()
        self.notification_send_url = mock_post_notification()

    def test_data(self):
        serializer = SystemGroupUserSerializer(instance=self.users[0])
        assert serializer.data
        assert serializer.data['email'] == self.users[0].user.email
        assert serializer.data['fullName'] == self.users[0].user.full_name
        assert serializer.data['roles'] == self.users[0].roles_name
        assert serializer.data['hasAccessTo']['id'] == str(self.group.id)
        assert (serializer.data['hasAccessTo']['groupsPath'] ==
                [str(group_id) for group_id in self.group.groups_path])
        assert serializer.data['created']
        assert serializer.data['lastModified']
        serializer = SystemGroupUserSerializer(instance=self.sub_group_admin)
        assert serializer.data
        assert serializer.data['email'] == self.sub_group_admin.user.email
        assert serializer.data['fullName'] == self.sub_group_admin.user.full_name
        assert serializer.data['roles'] == self.sub_group_admin.roles_name
        assert serializer.data['hasAccessTo']['id'] == str(self.sub_group.id)
        assert (serializer.data['hasAccessTo']['groupsPath'] ==
                [str(group_id) for group_id in self.sub_group.groups_path])

        serializer = SystemGroupUserSerializer(instance=self.org_admin)
        assert serializer.data
        assert serializer.data['email'] == self.org_admin.user.email
        assert serializer.data['fullName'] == self.org_admin.user.full_name
        assert serializer.data['roles'] == self.org_admin.roles_name
        assert serializer.data['hasAccessTo']['id'] == str(self.org.id)
        assert serializer.data['hasAccessTo']['groupsPath'] == None


        serializer = SystemGroupUserSerializer(instance=self.users, many=True)

        assert serializer.data
        for i, data in enumerate(serializer.data):
            assert data['email'] == self.users[i].user.email
            assert data['fullName'] == self.users[i].user.full_name
            assert data['roles'] == self.users[i].roles_name

    def test_create(self):
        user = self.other_org_user.user
        data = {
            'email': self.other_org_user.user.email,
            'role': 'Systems Administrator'
        }

        serializer = SystemGroupUserSerializer(data=data, context={'group': self.group, 'request': self.request})
        assert serializer.is_valid()

        group_rel = serializer.save()
        assert group_rel.roles == [OrganizationRoles.SYSTEMS_ADMINISTRATOR]
        assert group_rel.user == user
        user_rels = OrganizationToUser.objects.filter(organization=self.org, user=user, system_group=self.group)
        assert user_rels.count() == 1

    def test_groups_overlap_org_user(self, org_user_factory):
        org_user = org_user_factory(organization=self.org)
        data = {
            'email': org_user.user.email,
            'role': 'Systems Administrator'
        }

        serializer = SystemGroupUserSerializer(data=data, context={'group': self.group, 'request': self.request})
        assert serializer.is_valid() is False
        assert 'cannot be added to group' in serializer.errors['email'][0]

    def test_groups_overlap_group_user(self, sys_group_user_factory):
        child_group_rel = sys_group_user_factory(organization=self.org, group=self.sub_group)
        user = child_group_rel.user
        data = {
            'email': child_group_rel.user.email,
            'role': 'Systems Administrator'
        }

        serializer = SystemGroupUserSerializer(data=data, context={'group': self.group, 'request': self.request})
        assert serializer.is_valid() is True
        serializer.save()
        new_rel = OrganizationToUser.objects.get(organization=self.org, user=user)
        assert new_rel.system_group_id == self.group.id
        assert new_rel.roles == [OrganizationRoles.SYSTEMS_ADMINISTRATOR]

    def test_groups_overlap_cp_user(self, cp_user_factory):
        cp_user_rel = cp_user_factory(channel_partner=self.org.channel_partner)
        user = cp_user_rel.user
        data = {
            'email': cp_user_rel.user.email,
            'role': 'Systems Administrator'
        }

        serializer = SystemGroupUserSerializer(data=data, context={'group': self.group, 'request': self.request})
        assert serializer.is_valid() is False
        assert 'cannot be added to group' in serializer.errors['email'][0]


class TestOrganizationStateChangeSerializer:

    @pytest.fixture(autouse=True)
    def setUp(self, channel_partner_factory, organization_factory, cp_user_factory, arf,
              httpx_mock, mock_get_customization_request):
        self.cp = channel_partner_factory()
        self.org_user = cp_user_factory(channel_partner=self.cp)
        self.org = organization_factory(channel_partner=self.cp)
        self.request = arf.post('/')
        self.request.user = self.org_user.user
        self.context = {'request': self.request}
        self.notification_url = f'https://{self.cp.cloud_host.hostname}/notifications/send'
        httpx_mock.add_response(url=self.notification_url, status_code=200, json={})
        mock_get_customization_request('default')

    def test_update(self, httpx_mock):
        data = {
            "targetState": "shutdown"
        }
        assert self.org.state == ChannelPartnerStates.ACTIVE

        serializer = OrganizationStateChangeSerializer(instance=self.org, data=data, context=self.context)
        serializer.is_valid()
        instance = serializer.save()
        self.org.refresh_from_db()
        assert self.org.state == ChannelPartnerStates.ACTIVE
        assert instance.targetState == ChannelPartnerStates.SHUTDOWN

        confirmation = ActionConfirmation.objects.get(pk=instance.changeId)
        assert confirmation.state == int(ActionConfirmation.ConfirmationState.PENDING)
        assert confirmation.action == ActionConfirmation.ConfirmationActionType.ORGANIZATION_STATE_CHANGE
        assert confirmation.target_id == instance.id
        assert confirmation.created_by == self.org_user.user.email
        assert confirmation.changes == {'targetState': ChannelPartnerStates.SHUTDOWN}
        assert re.match(r'^[A-Z0-9]{6}$', confirmation.code)

        notification_request = httpx_mock.get_request(url=self.notification_url)
        assert notification_request
        notification_data = json.loads(notification_request.content)
        assert notification_data['customization'] == 'default'
        assert notification_data['type'] == NotificationTypes.cps_organization_state_confirmation
        assert notification_data['user_email'] == self.org_user.user.email
        assert notification_data['message']['code'] == confirmation.code
        assert notification_data['message']['status_name'] == 'Shutdown'
        assert notification_data['message']['organization_name'] == self.org.name


    def test_data(self):
        data = {
            "targetState": "shutdown"
        }
        assert self.org.state == ChannelPartnerStates.ACTIVE

        serializer = OrganizationStateChangeSerializer(instance=self.org, data=data, context=self.context)
        serializer.is_valid()
        instance = serializer.save()
        changeId = instance.changeId
        assert serializer.data['id'] == str(self.org.id)
        assert serializer.data['changeId'] == str(changeId)
        assert serializer.data['targetState'] == data['targetState']
        assert re.match(r'^[A-Z0-9]{6}$', serializer.data['code'])


class TestOrganizationStateConfirmationSerializer:

    @pytest.fixture(autouse=True)
    def setUp(self, channel_partner_factory, organization_factory, cp_user_factory,
              arf, httpx_mock, mock_get_customization_request):
        self.cp = channel_partner_factory()
        self.org_user = cp_user_factory(channel_partner=self.cp)
        self.org = organization_factory(channel_partner=self.cp)
        self.request = arf.post('/')
        self.request.user = self.org_user.user
        self.context = {'request': self.request}
        self.notification_url = f'https://{self.cp.cloud_host.hostname}/notifications/send'
        httpx_mock.add_response(url=self.notification_url, status_code=200, json={})
        mock_get_customization_request('default')

    def test_update(self):
        request_data = {
            "targetState": "shutdown"
        }
        assert self.org.state == ChannelPartnerStates.ACTIVE

        serializer = OrganizationStateChangeSerializer(instance=self.org, data=request_data, context=self.context)
        serializer.is_valid()
        instance = serializer.save()

        request_data = {
            "changeId": instance.changeId,
            "code": ActionConfirmation.objects.get(pk=instance.changeId).code
        }

        serializer = OrganizationStateConfirmationSerializer(instance=self.org, data=request_data, context=self.context)
        serializer.is_valid()
        assert serializer.validated_data['state'] == ChannelPartnerStates.SHUTDOWN
        instance = serializer.save()
        data = serializer.data
        assert data['id'] == str(self.org.id)
        assert data['state'] == 'shutdown'
        assert len(data) == 2
        self.org.refresh_from_db()
        assert self.org.state == ChannelPartnerStates.SHUTDOWN

    def test_expired_code(self):
        data = {
            "targetState": "shutdown"
        }
        assert self.org.state == ChannelPartnerStates.ACTIVE

        serializer = OrganizationStateChangeSerializer(instance=self.org, data=data, context=self.context)
        serializer.is_valid()
        instance = serializer.save()
        confirmation = ActionConfirmation.objects.get(pk=instance.changeId)
        confirmation.created_ts = timezone.now() - timedelta(days=1)
        confirmation.save()

        request_data = {
            "changeId": instance.changeId,
            "code": confirmation.code
        }

        serializer = OrganizationStateConfirmationSerializer(instance=self.org, data=request_data, context=self.context)
        assert serializer.is_valid() is False
        assert serializer.errors['code'][0] == "Provided confirmation code is expired."

    def test_invalid_code(self):
        data = {
            "targetState": "shutdown"
        }
        assert self.org.state == ChannelPartnerStates.ACTIVE

        serializer = OrganizationStateChangeSerializer(instance=self.org, data=data, context=self.context)
        serializer.is_valid()
        instance = serializer.save()

        request_data = {
            "changeId": instance.changeId,
            "code": '000000'
        }

        serializer = OrganizationStateConfirmationSerializer(instance=self.org, data=request_data, context=self.context)
        assert serializer.is_valid() is False
        assert serializer.errors['code'][0] == "Provided confirmation code is invalid."

    def test_different_user(self, cp_user_factory):
        data = {
            "targetState": "shutdown"
        }
        assert self.org.state == ChannelPartnerStates.ACTIVE

        serializer = OrganizationStateChangeSerializer(instance=self.org, data=data, context=self.context)
        serializer.is_valid()
        instance = serializer.save()

        request_data = {
            "changeId": instance.changeId,
            "code": instance.confirmation.code
        }
        user = cp_user_factory(channel_partner=self.cp)
        self.request.user = user.user
        serializer = OrganizationStateConfirmationSerializer(instance=self.org, data=request_data, context=self.context)
        assert serializer.is_valid() is False
        assert serializer.errors['code'][0] == "Provided confirmation code is invalid."
        
        
class TestChannelPartnerStateChangeSerializer:

    @pytest.fixture(autouse=True)
    def setUp(self, channel_partner_factory, organization_factory, cp_user_factory,
              arf, httpx_mock, mock_get_customization_request):
        self.cp = channel_partner_factory()
        self.cp_user = cp_user_factory(channel_partner=self.cp)
        self.sub_cp = channel_partner_factory(parent_channel_partner=self.cp)
        self.request = arf.post('/')
        self.request.user = self.cp_user.user
        self.context = {'request': self.request}
        self.notification_url = f'https://{self.cp.cloud_host.hostname}/notifications/send'
        httpx_mock.add_response(url=self.notification_url, status_code=200, json={})
        mock_get_customization_request('default')

    def test_update(self, httpx_mock):
        data = {
            "targetState": "shutdown"
        }
        assert self.sub_cp.state == ChannelPartnerStates.ACTIVE

        serializer = ChannelPartnerStateChangeSerializer(instance=self.sub_cp, data=data, context=self.context)
        serializer.is_valid()
        instance = serializer.save()
        self.sub_cp.refresh_from_db()
        assert self.sub_cp.state == ChannelPartnerStates.ACTIVE
        assert instance.targetState == ChannelPartnerStates.SHUTDOWN

        confirmation = ActionConfirmation.objects.get(pk=instance.changeId)
        assert confirmation.state == int(ActionConfirmation.ConfirmationState.PENDING)
        assert confirmation.action == ActionConfirmation.ConfirmationActionType.PARTNER_STATE_CHANGE
        assert confirmation.target_id == instance.id
        assert confirmation.changes == {'targetState': ChannelPartnerStates.SHUTDOWN}
        assert confirmation.created_by == self.cp_user.user.email
        assert re.match(r'^[A-Z0-9]{6}$', confirmation.code)
        notification_request = httpx_mock.get_request(url=self.notification_url)
        assert notification_request
        notification_data = json.loads(notification_request.content)
        assert notification_data['customization'] == 'default'
        assert notification_data['type'] == NotificationTypes.cps_partner_state_confirmation
        assert notification_data['user_email'] == self.cp_user.user.email
        assert notification_data['message']['code'] == confirmation.code
        assert notification_data['message']['status_name'] == 'Shutdown'
        assert notification_data['message']['partner_name'] == self.sub_cp.name

    def test_data(self):
        data = {
            "targetState": "shutdown"
        }
        assert self.sub_cp.state == ChannelPartnerStates.ACTIVE

        serializer = ChannelPartnerStateChangeSerializer(instance=self.sub_cp, data=data, context=self.context)
        serializer.is_valid()
        instance = serializer.save()
        changeId = instance.changeId
        assert serializer.data['id'] == str(self.sub_cp.id)
        assert serializer.data['changeId'] == str(changeId)
        assert serializer.data['targetState'] == data['targetState']
        assert re.match(r'^[A-Z0-9]{6}$', serializer.data['code'])


class TestChannelPartnerStateConfirmationSerializer:

    @pytest.fixture(autouse=True)
    def setUp(self, channel_partner_factory, organization_factory, cp_user_factory,
              arf, httpx_mock, mock_get_customization_request):
        self.cp = channel_partner_factory()
        self.cp_user = cp_user_factory(channel_partner=self.cp)
        self.sub_cp = channel_partner_factory(parent_channel_partner=self.cp)
        self.request = arf.post('/')
        self.request.user = self.cp_user.user
        self.context = {'request': self.request}
        self.notification_url = f'https://{self.cp.cloud_host.hostname}/notifications/send'
        httpx_mock.add_response(url=self.notification_url, status_code=200, json={})
        mock_get_customization_request('default')

    def test_update(self, httpx_mock):
        request_data = {
            "targetState": "shutdown"
        }
        assert self.sub_cp.state == ChannelPartnerStates.ACTIVE

        serializer = ChannelPartnerStateChangeSerializer(instance=self.sub_cp, data=request_data, context=self.context)
        serializer.is_valid()
        instance = serializer.save()

        request_data = {
            "changeId": instance.changeId,
            "code": instance.confirmation.code
        }

        serializer = ChannelPartnerStateConfirmationSerializer(instance=self.sub_cp, data=request_data,
                                                               context=self.context)
        serializer.is_valid()
        assert serializer.validated_data['state'] == ChannelPartnerStates.SHUTDOWN
        instance = serializer.save()
        data = serializer.data
        assert data['id'] == str(self.sub_cp.id)
        assert data['state'] == 'shutdown'
        assert len(data) == 2
        self.sub_cp.refresh_from_db()
        assert self.sub_cp.state == ChannelPartnerStates.SHUTDOWN

    def test_data(self):
        data = {
            "targetState": "shutdown"
        }
        assert self.sub_cp.state == ChannelPartnerStates.ACTIVE

        serializer = ChannelPartnerStateChangeSerializer(instance=self.sub_cp, data=data, context=self.context)
        serializer.is_valid()
        instance = serializer.save()
        changeId = instance.changeId
        assert serializer.data['id'] == str(self.sub_cp.id)
        assert serializer.data['changeId'] == str(changeId)
        assert serializer.data['targetState'] == data['targetState']
        assert re.match(r'^[A-Z0-9]{6}$', serializer.data['code'])

    def test_expired_code(self):
        data = {
            "targetState": "shutdown"
        }
        assert self.sub_cp.state == ChannelPartnerStates.ACTIVE

        serializer = ChannelPartnerStateChangeSerializer(
            instance=self.sub_cp, data=data, context=self.context)
        serializer.is_valid()
        instance = serializer.save()
        confirmation = ActionConfirmation.objects.get(pk=instance.changeId)
        confirmation.created_ts = timezone.now() - timedelta(days=1)
        confirmation.save()

        request_data = {
            "changeId": instance.changeId,
            "code": confirmation.code
        }

        serializer = ChannelPartnerStateConfirmationSerializer(
            instance=self.sub_cp, data=request_data, context=self.context)
        assert serializer.is_valid() is False
        assert serializer.errors['code'][0] == "Provided confirmation code is expired."

    def test_invalid_code(self):
        data = {
            "targetState": "shutdown"
        }
        assert self.sub_cp.state == ChannelPartnerStates.ACTIVE

        serializer = ChannelPartnerStateChangeSerializer(instance=self.sub_cp, data=data, context=self.context)
        serializer.is_valid()
        instance = serializer.save()

        request_data = {
            "changeId": instance.changeId,
            "code": '000000'
        }

        serializer = ChannelPartnerStateConfirmationSerializer(
            instance=self.sub_cp, data=request_data, context=self.context)
        assert serializer.is_valid() is False
        assert serializer.errors['code'][0] == "Provided confirmation code is invalid."

    def test_different_user(self, cp_user_factory):
        data = {
            "targetState": "shutdown"
        }
        assert self.sub_cp.state == ChannelPartnerStates.ACTIVE

        serializer = ChannelPartnerStateChangeSerializer(
            instance=self.sub_cp, data=data, context=self.context)
        serializer.is_valid()
        instance = serializer.save()

        request_data = {
            "changeId": instance.changeId,
            "code": ActionConfirmation.objects.get(pk=instance.changeId).code
        }
        user = cp_user_factory(channel_partner=self.cp)
        self.request.user = user.user
        serializer = ChannelPartnerStateConfirmationSerializer(
            instance=self.sub_cp, data=request_data, context=self.context)
        assert serializer.is_valid() is False
        assert serializer.errors['code'][0] == "Provided confirmation code is invalid."


class TestSupportInformationSerializer:

    def test_serializer_valid_data(self):
        valid_data = {
            "sites": [{"value": "123", "description": ""}],
            "phones": [{"value": "123", "description": "123"}],
            "emails": [{"value": "123", "description": "123"}],
            "custom": [{"label": "abc", "value": "123"}]
        }
        serializer = SupportInformationSerializer(data=valid_data)
        assert serializer.is_valid()

    def test_serializer_invalid_data(self):
        invalid_data = {
            'sites': ['not a url'],
            'phones': [{'phone': '1234', 'description': 'for customer'}],
            'emails': [{'email': 'not an email', 'description': 'for customer'}],
            'custom': [{'label': 'field1', 'value': 'value1'}]
        }
        serializer = SupportInformationSerializer(data=invalid_data)
        assert not serializer.is_valid()

class TestCloudSystemSerializer:
    @pytest.fixture(autouse=True)
    def setup(self, channel_partner_factory, organization_factory, cp_user_factory,
              org_user_factory, system_factory, arf):
        self.cp = channel_partner_factory()
        self.sub_cp = channel_partner_factory(parent_channel_partner=self.cp)
        self.organization = organization_factory(channel_partner=self.sub_cp)
        self.system = system_factory(organization=self.organization)
        self.cp_user = cp_user_factory(channel_partner=self.cp)
        self.sub_cp_user = cp_user_factory(channel_partner=self.sub_cp)
        self.org_user = org_user_factory(organization=self.organization)
        self.request = arf.get('/')
        self.request.user = self.sub_cp_user.user
        self.context = {'request': self.request}

    def test_organizationName(self):
        # Test organization parent partner user
        serializer = CloudSystemSerializer(instance=self.system, context=self.context)
        assert serializer.data['organizationName'] == self.organization.name
        # Test organization user
        self.request.user = self.org_user.user
        serializer = CloudSystemSerializer(instance=self.system, context=self.context)
        assert serializer.data['organizationName'] == self.organization.name
        # Test organization top partner user
        self.request.user = self.cp_user.user
        serializer = CloudSystemSerializer(instance=self.system, context=self.context)
        assert serializer.data['organizationName'] == VALUE_REPLACEMENT


    def test_effectiveState(self):
        state_code = dict(ChannelPartnerStates.STATE_CHOICES)[self.system.effective_state].lower()
        # Test organization parent partner user
        serializer = CloudSystemSerializer(instance=self.system, context=self.context)
        assert serializer.data['effectiveState'] == state_code
        # Test organization user
        self.request.user = self.org_user.user
        serializer = CloudSystemSerializer(instance=self.system, context=self.context)
        assert serializer.data['effectiveState'] == state_code
        # Test organization top partner user
        self.request.user = self.cp_user.user
        serializer = CloudSystemSerializer(instance=self.system, context=self.context)
        assert serializer.data['effectiveState'] == state_code


class TestSystemUsageReportSerializer:

    @pytest.fixture(autouse=True)
    def setup(self, channel_partner_factory, cp_service_factory, organization_factory, system_factory,
              service_record_factory):
        self.cp = channel_partner_factory()
        self.organization = organization_factory(channel_partner=self.cp)
        self.system = system_factory(organization=self.organization)
        self.service_quantity = 10
        self.fromTs = datetime.datetime(year=2024, month=1, day=10, hour=0, tzinfo=pytz.UTC)
        self.toTs = self.fromTs + timedelta(days=1)
        self.local_recording_service = cp_service_factory(
            channel_partner=self.cp, service_type=ChannelPartnerService.LOCAL_RECORDING)
        self.local_recording_service_record = service_record_factory(self.local_recording_service,
                                                                     cloud_system=self.system,
                                                                     organization=self.organization,
                                                                     quantity=self.service_quantity,
                                                                     created_ts=self.fromTs - timedelta(days=1))
        self.cloud_storage_service = cp_service_factory(
            channel_partner=self.cp, service_type=ChannelPartnerService.CLOUD_STORAGE)
        self.cloud_storage_service_record = service_record_factory(self.cloud_storage_service,
                                                                   cloud_system=self.system,
                                                                   organization=self.organization,
                                                                   quantity=self.service_quantity,
                                                                   created_ts=self.fromTs - timedelta(days=1))
        self.analytics_service = cp_service_factory(
            channel_partner=self.cp, service_type=ChannelPartnerService.ANALYTICS)
        self.analytics_service_record = service_record_factory(self.analytics_service,
                                                               cloud_system=self.system,
                                                               organization=self.organization,
                                                               quantity=self.service_quantity,
                                                               created_ts=self.fromTs - timedelta(days=1))
        self.services = [
            self.local_recording_service,
            self.analytics_service
        ]

        self.usage_data_base = {
            "from": self.fromTs.isoformat(),
            "to": self.toTs.isoformat(),
            "usages": []
        }
        self.service_types = {v: k for k, v in ChannelPartnerService.SERVICE_TYPE_CODES}

    def get_service_usages(self,
                           service_id: str | uuid.UUID,
                           usage_quantity: int) -> dict:
        service = str(service_id) if service_id else None
        data = {
            "service": service,
            "devices": [
                {
                    "id": f"{uuid4()}",
                    "usage": usage_quantity
                },
                {
                    "id": f"{uuid4()}",
                    "usage": usage_quantity
                },
            ]
        }
        return data

    def get_services(self, usage_quantity: int):
        return [self.get_service_usages(service.id, usage_quantity) for service in self.services]

    def test_valid_data(self):
        usage_quantity = ServiceUsage.get_usage_from_quantity(ChannelPartnerService.LOCAL_RECORDING, 5)
        data = {
            **self.usage_data_base,
            "usages": self.get_services(usage_quantity)
        }
        serializer = SystemUsageReportSerializer(data=data)
        serializer.is_valid()
        assert not serializer.errors
        assert serializer.validated_data['usages'][0]['service'] == self.local_recording_service
        assert serializer.validated_data['usages'][1]['service'] == self.analytics_service

        data = {
            **self.usage_data_base,
            "usages": [self.get_service_usages(self.local_recording_service.id,
                                               usage_quantity=usage_quantity)]
        }
        serializer = SystemUsageReportSerializer(data=data)
        serializer.is_valid()
        assert not serializer.errors
        assert serializer.validated_data['usages'][0]['service'] == self.local_recording_service

        data = {
            **self.usage_data_base,
            "usages": [self.get_service_usages(service_id=self.analytics_service.id,
                                               usage_quantity=usage_quantity),
                       self.get_service_usages(service_id=self.cloud_storage_service.id,
                                               usage_quantity=usage_quantity)
                       ]
        }
        serializer = SystemUsageReportSerializer(data=data)
        serializer.is_valid()
        assert not serializer.errors
        assert len(serializer.validated_data['usages']) == 1
        assert serializer.validated_data['usages'][0]['service'] == self.analytics_service

    def test_invalid_data(self):
        usage_quantity = ServiceUsage.get_usage_from_quantity(ChannelPartnerService.LOCAL_RECORDING, 5)

        data = {
            **self.usage_data_base,
            "usages": [self.get_service_usages(service_id=uuid4(), usage_quantity=usage_quantity)]
        }
        serializer = SystemUsageReportSerializer(data=data)
        assert not serializer.is_valid()
        assert serializer.errors['usages'][0]['service']

        data = {
            **self.usage_data_base,
            "usages": [self.get_service_usages(service_id=None, usage_quantity=usage_quantity)]
        }
        serializer = SystemUsageReportSerializer(data=data)
        assert not serializer.is_valid()
        assert serializer.errors['usages'][0]['service']

    def test_save_single_service(self):
        usage_quantity = ServiceUsage.get_usage_from_quantity(ChannelPartnerService.LOCAL_RECORDING, 5)
        data = {
            **self.usage_data_base,
            "usages": [self.get_service_usages(self.local_recording_service.id,
                                               usage_quantity=usage_quantity)]
        }
        serializer = SystemUsageReportSerializer(data=data)
        serializer.is_valid()
        serializer.save_security_metrics(self.system)
        assert ServiceUsage.objects.all().count() == 1
        service_usage = ServiceUsage.objects.first()
        assert service_usage.service == self.local_recording_service
        assert service_usage.usage == usage_quantity * 2

    def test_save_service_with_overUse(self):
        usage_quantity = ServiceUsage.get_usage_from_quantity(ChannelPartnerService.LOCAL_RECORDING, 50)
        data = {
            **self.usage_data_base,
            "usages": [self.get_service_usages(self.local_recording_service.id,
                                               usage_quantity=usage_quantity)]
        }
        ServiceUsage.check_excess(self.system)
        self.system.refresh_from_db()
        assert self.system.security_statuses['types']['local_recording']['status'] == 'ok'
        serializer = SystemUsageReportSerializer(data=data)
        serializer.is_valid()
        serializer.save_security_metrics(self.system)
        assert ServiceUsage.objects.all().count() == 1
        service_usage = ServiceUsage.objects.first()
        assert service_usage.service == self.local_recording_service
        assert service_usage.usage == usage_quantity * 2
        self.system.refresh_from_db()
        assert self.system.security_statuses['types']['local_recording']['status'] == 'overUse'
        assert self.system.security_statuses['services'][str(self.local_recording_service.id)]['status'] == 'overUse'

    def test_save_single_service_two_entries(self):
        usage_quantity = ServiceUsage.get_usage_from_quantity(ChannelPartnerService.LOCAL_RECORDING, 5)
        data = {
            **self.usage_data_base,
            "usages": [
                self.get_service_usages(self.local_recording_service.id,
                                        usage_quantity=usage_quantity),
                self.get_service_usages(self.local_recording_service.id,
                                        usage_quantity=usage_quantity),
            ]
        }
        serializer = SystemUsageReportSerializer(data=data)
        serializer.is_valid()
        serializer.save_security_metrics(self.system)
        assert ServiceUsage.objects.all().count() == 1
        service_usage = ServiceUsage.objects.first()
        assert service_usage.service == self.local_recording_service
        assert service_usage.usage == usage_quantity * 4

    def test_two_services(self):
        usage_quantity = ServiceUsage.get_usage_from_quantity(ChannelPartnerService.LOCAL_RECORDING, 5)
        data = {
            **self.usage_data_base,
            "usages": [
                self.get_service_usages(self.local_recording_service.id,
                                        usage_quantity=usage_quantity),
                self.get_service_usages(self.analytics_service.id,
                                        usage_quantity=usage_quantity),
            ]
        }
        serializer = SystemUsageReportSerializer(data=data)
        serializer.is_valid()
        serializer.save_security_metrics(self.system)
        assert ServiceUsage.objects.all().count() == 2
        service_usage = ServiceUsage.objects.get(service__type=ChannelPartnerService.LOCAL_RECORDING)
        assert service_usage.service == self.local_recording_service
        assert service_usage.usage == usage_quantity * 2
        service_usage = ServiceUsage.objects.get(service__type=ChannelPartnerService.ANALYTICS)
        assert service_usage.service == self.analytics_service
        assert service_usage.usage == usage_quantity * 2

    def test_two_services_and_unallocated(self):
        usage_quantity = ServiceUsage.get_usage_from_quantity(ChannelPartnerService.LOCAL_RECORDING, 5)
        data = {
            **self.usage_data_base,
            "usages": [
                self.get_service_usages(self.local_recording_service.id,
                                        usage_quantity=usage_quantity),
                self.get_service_usages(self.analytics_service.id,
                                        usage_quantity=usage_quantity),
                self.get_service_usages(service_id=ServiceUsage.UNALLOCATED_SERVICE,
                                        usage_quantity=usage_quantity),
            ]
        }
        serializer = SystemUsageReportSerializer(data=data)
        serializer.is_valid()
        serializer.save_security_metrics(self.system)
        assert ServiceUsage.objects.all().count() == 2
        service_usage = ServiceUsage.objects.get(service__type=ChannelPartnerService.LOCAL_RECORDING)
        assert service_usage.service == self.local_recording_service
        assert service_usage.usage == usage_quantity * 2
        service_usage = ServiceUsage.objects.get(service__type=ChannelPartnerService.ANALYTICS,
                                                 service_id=self.analytics_service.id)
        assert service_usage.service == self.analytics_service
        assert service_usage.usage == usage_quantity * 2


class TestCloudStorageUsageReportSerializer:

    @pytest.fixture(autouse=True)
    def setup(self, channel_partner_factory, cp_service_factory, organization_factory, system_factory,
              service_record_factory):
        self.cp = channel_partner_factory()
        self.organization = organization_factory(channel_partner=self.cp)
        self.system = system_factory(organization=self.organization)
        self.service_quantity = 10
        self.local_recording_service = cp_service_factory(
            channel_partner=self.cp, service_type=ChannelPartnerService.LOCAL_RECORDING)
        self.local_recording_service_record = service_record_factory(self.local_recording_service,
                                                                     cloud_system=self.system,
                                                                     organization=self.organization,
                                                                     quantity=self.service_quantity)
        self.cloud_storage_service = cp_service_factory(
            channel_partner=self.cp, service_type=ChannelPartnerService.CLOUD_STORAGE)
        self.cloud_storage_service_record = service_record_factory(self.cloud_storage_service,
                                                                   cloud_system=self.system,
                                                                   organization=self.organization,
                                                                   quantity=self.service_quantity)
        self.cloud_storage_service_2 = cp_service_factory(
            channel_partner=self.cp, service_type=ChannelPartnerService.CLOUD_STORAGE)
        self.cloud_storage_service_record_2 = service_record_factory(self.cloud_storage_service_2,
                                                                   cloud_system=self.system,
                                                                   organization=self.organization,
                                                                   quantity=self.service_quantity)
        self.non_system_service = cp_service_factory(
            channel_partner=self.cp, service_type=ChannelPartnerService.CLOUD_STORAGE)
        self.service_types = {v: k for k, v in ChannelPartnerService.SERVICE_TYPE_CODES}

    def device_data(self, service_id):
        service = str(service_id) if service_id else None
        return {
            'id': f'{uuid4()}',
            'serviceId': service_id,
        }

    def test_valid_data(self):
        data = {
            "usedDevices": {
                "cloudSystemId": str(self.system.system_id),
                "devices": [self.device_data(self.cloud_storage_service.id)]
            }
        }
        serializer = CloudStorageUsageReportSerializer(data=data)
        serializer.is_valid()
        assert not serializer.errors
        assert serializer.validated_data["usedDevices"]['devices'][0]['service'] == self.cloud_storage_service
        assert serializer.validated_data["usedDevices"]['cloud_system'] == self.system

        data = {
            "usedDevices": {
                "cloudSystemId": str(self.system.system_id),
                "devices": [self.device_data(ServiceUsage.UNALLOCATED_SERVICE)]
            }
        }
        serializer = CloudStorageUsageReportSerializer(data=data)
        serializer.is_valid()
        assert not serializer.errors
        assert serializer.validated_data["usedDevices"]['devices'] == []
        assert serializer.validated_data["usedDevices"]['cloud_system'] == self.system

        data = {
            "usedDevices": {
                "cloudSystemId": str(self.system.system_id),
                "devices": [self.device_data(self.non_system_service.id)]
            }
        }
        serializer = CloudStorageUsageReportSerializer(data=data)
        serializer.is_valid()
        assert not serializer.errors
        assert serializer.validated_data["usedDevices"]['devices'][0]['service'] == self.non_system_service
        assert serializer.validated_data["usedDevices"]['cloud_system'] == self.system

        data = {
            "usedDevices": {
                "cloudSystemId": str(self.system.system_id),
                "devices": []
            }
        }
        serializer = CloudStorageUsageReportSerializer(data=data)
        serializer.is_valid()
        assert not serializer.errors
        assert serializer.validated_data["usedDevices"]['devices'] == []

    def test_invalid_data(self):
        data = {
            "usedDevices": {
                "cloudSystemId": str(uuid4()),
                "devices": [self.device_data(self.non_system_service.id)]
            }
        }
        serializer = CloudStorageUsageReportSerializer(data=data)
        assert not serializer.is_valid()
        assert serializer.errors["usedDevices"]["cloudSystemId"]

        data = {
            "usedDevices": {
                "cloudSystemId": str(self.system.system_id),
                "devices": [self.device_data(self.local_recording_service.id)]
            }
        }
        serializer = CloudStorageUsageReportSerializer(data=data)
        assert not serializer.is_valid()
        assert serializer.errors["usedDevices"]["devices"][0]["serviceId"]

    def test_save_single_device(self):
        data = {
            "usedDevices": {
                "cloudSystemId": str(self.system.system_id),
                "devices": [self.device_data(self.cloud_storage_service.id)]
            }
        }
        serializer = CloudStorageUsageReportSerializer(data=data)
        serializer.is_valid()
        serializer.save_security_metrics()
        assert ServiceUsage.objects.all().count() == 1
        service_usage = ServiceUsage.objects.first()
        assert service_usage.service == self.cloud_storage_service
        assert service_usage.usage == 1

    def test_save_multiple_devices_single_service(self):
        data = {
            "usedDevices": {
                "cloudSystemId": str(self.system.system_id),
                "devices": [
                    self.device_data(self.cloud_storage_service.id),
                    self.device_data(self.cloud_storage_service.id),
                    self.device_data(self.cloud_storage_service.id),
                ]
            }
        }
        serializer = CloudStorageUsageReportSerializer(data=data)
        serializer.is_valid()
        serializer.save_security_metrics()
        assert ServiceUsage.objects.all().count() == 1
        service_usage = ServiceUsage.objects.first()
        assert service_usage.service == self.cloud_storage_service
        assert service_usage.usage == 3

    def test_save_multiple_devices_multiple_services(self):
        data = {
            "usedDevices": {
                "cloudSystemId": str(self.system.system_id),
                "devices": [
                    self.device_data(self.cloud_storage_service.id),
                    self.device_data(self.cloud_storage_service.id),
                    self.device_data(self.cloud_storage_service_2.id),
                ]
            }
        }
        serializer = CloudStorageUsageReportSerializer(data=data)
        serializer.is_valid()
        serializer.save_security_metrics()
        assert ServiceUsage.objects.all().count() == 2
        service_usage = ServiceUsage.objects.get(service=self.cloud_storage_service)
        assert service_usage.service == self.cloud_storage_service
        assert service_usage.usage == 2
        service_usage = ServiceUsage.objects.get(service=self.cloud_storage_service_2)
        assert service_usage.service == self.cloud_storage_service_2
        assert service_usage.usage == 1

    def test_unallocated_services(self):
        data = {
            "usedDevices": {
                "cloudSystemId": str(self.system.system_id),
                "devices": [
                    self.device_data(self.non_system_service.id),
                    self.device_data(ServiceUsage.UNALLOCATED_SERVICE),
                    self.device_data(ServiceUsage.UNALLOCATED_SERVICE),
                ]
            }
        }
        serializer = CloudStorageUsageReportSerializer(data=data)
        serializer.is_valid()
        serializer.save_security_metrics()
        assert ServiceUsage.objects.all().count() == 1
        service_usage = ServiceUsage.objects.first()
        assert service_usage.usage == 1
        assert service_usage.service == self.non_system_service

import json
import random
from uuid import uuid4

import httpx
import pytest
from dateutil.relativedelta import relativedelta
from django.conf import settings
from django.core.cache import caches
from django.db import transaction
from django.http import HttpResponseNotFound, HttpResponseForbidden
from django.test import Client
from django.test import override_settings, RequestFactory
from django.utils import timezone
from mock.mock import MagicMock
from model_bakery import baker

from partners.models import (
    CloudSystemId, OrganizationRole, OrganizationToUser, ChannelPartnerToUser,
    ChannelPartnerServiceRecord, ChannelPartnerRole, ChannelPartnerStates,
    OrganizationRoles, SystemGroup, Organization, OrganizationPermissions,
    CloudSystemStates
)
from partners.views import (
    CloudSystemViewSet, OrganizationUserViewSet, ChannelPartnerUserViewSet,
    ChannelPartnerViewSet, ChannelPartnerNestedViewSet, OrganizationViewSet,
    SystemGroupUserViewSet, system_user, system_users, user_systems, SystemGroupViewSet, organization_roles,
    grant_access
)
from tools.serializers import VALUE_REPLACEMENT


class TestCloudSystemViewSet:

    def test_create_403(self, default_cp_user, default_org_user, mock_auth_with_user, arf, httpx_mock):
        sys_id = f'{uuid4()}'
        system_url = f'https://cloud-test.hdw.mx/cdb/systems/{sys_id}'
        httpx_mock.add_response(url=system_url, json={"accessRole": "owner"})
        data = {
          "cloudSystemId": sys_id,
          "organization": str(default_org_user.organization.id)
        }
        # Channel partner user
        mock_auth_with_user(default_cp_user)
        request = arf.post('/', data=data, format='json')
        view = CloudSystemViewSet.as_view({'post': 'create'})
        with transaction.atomic():
            response = view(request)
        assert response.status_code == 403
        assert response.data['detail']
        # Org admin
        mock_auth_with_user(default_org_user)
        request = arf.post('/', data=data, format='json')
        view = CloudSystemViewSet.as_view({'post': 'create'})
        with transaction.atomic():
            response = view(request)
        assert response.status_code == 403
        assert response.data['detail']

    def test_service_quantity(self, channel_partner_factory, cp_user_factory, organization_factory, org_user_factory,
                              arf, system_factory, mock_auth_with_user, cp_service_factory, service_record_factory):
        root = channel_partner_factory(parent_channel_partner=None)
        child = channel_partner_factory(parent_channel_partner=root)
        root_user = cp_user_factory(channel_partner=root)
        child_user = cp_user_factory(channel_partner=child)
        root_org = organization_factory(channel_partner=root)
        root_org_user = org_user_factory(organization=root_org)
        system = system_factory(organization=root_org)
        service = cp_service_factory(channel_partner=root)
        service_record = service_record_factory(service, system, quantity=10.5)
        req = arf.get(f'/partners/cloud_systems/{system.system_id}/service_quantity/')
        CloudSystemViewSet.detail = True
        view = CloudSystemViewSet.as_view({'get': 'service_quantity'}, detail=True)

        mock_auth_with_user(child_user)
        req.user = child_user.user
        with transaction.atomic():
            response = view(req, id=str(system.system_id))

        assert response.status_code == 403

        mock_auth_with_user(root_user)
        req.user = root_user.user
        with transaction.atomic():
            response = view(req, id=str(system.system_id))
        assert response.status_code == 200


    def test_service_quantity_patch(selfself, channel_partner_factory, organization_factory, cp_user_factory,
                                    service_record_factory, cp_service_factory, system_factory,
                                    mock_auth_with_user, arf, mocker):
        assert ChannelPartnerRole.objects.all().count() > 0
        cp = channel_partner_factory()
        cp_user = cp_user_factory(channel_partner=cp)
        org = organization_factory(channel_partner=cp)
        system = system_factory(organization=org)
        services = [cp_service_factory(channel_partner=cp) for _ in range(2)]
        service_records = [service_record_factory(service=service, cloud_system=system,
                                                  quantity=10, organization=system.organization)
                           for service in services]
        mock_auth_with_user(cp_user)
        view = CloudSystemViewSet.as_view(actions={'patch': 'service_quantity'}, detail=True)
        # test successful request
        request = arf.patch('/', data={"services": {str(services[0].id): {"quantity": 15}}}, format='json')
        with transaction.atomic():
            response = view(request, id=str(system.system_id))
        assert response.status_code == 200
        assert response.data['services'][str(services[0].id)]['quantity'] == 15
        assert response.data['services'][str(services[1].id)]['quantity'] == 10

        # test failure request because of busy lock
        mocker.patch('django.core.cache.backends.redis.RedisCache.add', return_value=False)
        caches['default'].set(CloudSystemViewSet.get_service_quantity_lock(system), 1)
        request = arf.patch('/', data={"services": {str(services[1].id): {"quantity": 15}}}, format='json')
        with transaction.atomic():
            response = view(request, id=str(system.system_id))
        assert response.status_code == 429
        assert response.headers['Retry-After'] == '2'

        # test success request with freeing lock during waiting. it cannot be tested properly,
        # but we can catch side effect
        mocker.patch('django.core.cache.backends.redis.RedisCache.add', return_value=False)
        cache_get_mock = mocker.patch('django.core.cache.backends.redis.RedisCache.get', return_value=None)
        caches['default'].set(CloudSystemViewSet.get_service_quantity_lock(system), 1)
        request = arf.patch('/', data={"services": {str(services[1].id): {"quantity": 15}}}, format='json')
        raised_error = None
        try:
            response = view(request, id=str(system.system_id))
        except Exception as ex:
            raised_error = ex.__class__
        cache_get_mock.assert_called()
        assert raised_error == RecursionError

        # test successful request and second service value
        mocker.patch('django.core.cache.backends.redis.RedisCache.add', return_value=True)
        request = arf.patch('/', data={"services": {str(services[0].id): {"quantity": 15}}}, format='json')
        with transaction.atomic():
            response = view(request, id=str(system.system_id))
        assert response.status_code == 200
        assert response.data['services'][str(services[0].id)]['quantity'] == 15
        assert response.data['services'][str(services[1].id)]['quantity'] == 10


    def test_service_quantity_patch_shutdown(selfself, channel_partner_factory, organization_factory, cp_user_factory,
                                    service_record_factory, cp_service_factory, system_factory,
                                    mock_auth_with_user, arf, mocker):
        assert ChannelPartnerRole.objects.all().count() > 0
        cp = channel_partner_factory()
        cp_user = cp_user_factory(channel_partner=cp)
        org = organization_factory(channel_partner=cp)
        system = system_factory(organization=org, state=ChannelPartnerStates.SHUTDOWN)
        services = [cp_service_factory(channel_partner=cp) for _ in range(2)]
        service_records = [service_record_factory(service=service, cloud_system=system,
                                                  quantity=10, organization=system.organization)
                           for service in services]
        mock_auth_with_user(cp_user)
        view = CloudSystemViewSet.as_view(actions={'patch': 'service_quantity'}, detail=True)

        # test shutdown system change
        mocker.patch('django.core.cache.backends.redis.RedisCache.add', return_value=True)
        request = arf.patch('/', data={"services": {str(services[0].id): {"quantity": 15}}}, format='json')

        response = view(request, id=str(system.system_id))
        assert response.status_code == 400
        assert "Services quantity cannot be changed." in response.data['services'][0]

    def test_saas_report(self, channel_partner_factory, organization_factory, system_factory,
                      mock_auth_with_system, arf_basic_auth):
        cp = channel_partner_factory()
        org = organization_factory(channel_partner=cp)
        system = system_factory(organization=org)
        system.system_state = CloudSystemStates.NOT_ACTIVATED
        system.save()
        view = CloudSystemViewSet.as_view(actions={'get': 'saas_report'}, detail=True)
        request = arf_basic_auth.get('/')
        mock_auth_with_system(system)
        response = view(request, id=system.system_id)
        assert response.status_code == 200
        assert system.system_state == CloudSystemStates.ACTIVATED

        request = arf_basic_auth.get('/')
        mock_auth_with_system(system, authenticated=False, status=CloudSystemStates.DELETED)
        response = view(request, id=system.system_id)
        assert response.status_code == 401
        assert system.system_state == CloudSystemStates.DELETED


class TestOrganizationUserViewSet:

    def test_create_200(self, organization_factory, org_user_factory, system_factory,
                        mock_auth_with_user, arf, random_email, mock_account_status,
                        mock_get_customization_request, mock_post_notification, httpx_mock):
        gen_count = 10
        org = organization_factory()
        admin_user = org_user_factory(organization=org)
        systems = [system_factory(organization=org) for _ in range(gen_count)]
        role = OrganizationRole.objects.get(name="Power User")
        new_user_data = {
            "email": random_email,
            "role": role.name
        }
        request = arf.post('/', data=new_user_data, format='json')
        mock_account_status(email=random_email, active=False)
        mock_get_customization_request()
        notification_send_url = mock_post_notification()
        mock_auth_with_user(admin_user)
        view = OrganizationUserViewSet.as_view(actions={'post': 'create'}, detail=True)
        response = view(request, parent_lookup_organization=org.id)

        assert response.status_code == 200
        assert OrganizationToUser.objects\
            .filter(user__email=new_user_data["email"], organization=org, roles__contains=[role.id]).exists()
        assert response.data["email"] == new_user_data["email"]
        assert response.data['fullName'] == 'John Smith'
        assert response.data["roles"] == [role.name]


    def test_update_200(self, organization_factory, org_user_factory, system_factory,
                        mock_auth_with_user, arf, random_email, mock_account_status,
                        mock_get_customization_request, mock_post_notification, httpx_mock):
        gen_count = 10
        org = organization_factory()
        admin_user = org_user_factory(organization=org)
        systems = [system_factory(organization=org) for _ in range(gen_count)]
        role = OrganizationRole.objects.get(name="Power User")
        user_data = {
            "email": random_email,
            "role": role.name
        }
        user = org_user_factory(email=user_data['email'], organization=org)
        request = arf.post('/', data=user_data, format='json')
        mock_account_status(email=random_email, active=False)
        mock_get_customization_request()
        notification_send_url = mock_post_notification()
        mock_auth_with_user(admin_user)
        view = OrganizationUserViewSet.as_view(actions={'post': 'create'}, detail=True)
        response = view(request, parent_lookup_organization=org.id)
        assert OrganizationToUser.objects\
            .filter(user__email=user_data["email"], organization=org).count() == 1
        assert response.status_code == 200
        assert response.data["email"] == user_data["email"]
        assert response.data['fullName'] == 'John Smith'
        user_data["title"] = f"{uuid4()}"
        request = arf.post('/', data=user_data, format='json')
        response = view(request, parent_lookup_organization=org.id)
        assert OrganizationToUser.objects\
            .filter(user__email=user_data["email"], organization=org).count() == 1
        assert response.status_code == 200
        assert response.data["title"] == user_data["title"]

    def test_destroy_204(self, organization_factory, org_user_factory, system_factory,
                         mock_auth_with_user, arf, httpx_mock, mocker):
        gen_count = 10
        org = organization_factory()
        admin_user = org_user_factory(organization=org)
        systems = [system_factory(organization=org) for _ in range(gen_count)]
        role = OrganizationRole.objects.get(name="Power User")
        user = org_user_factory(organization=org, role=role.name)
        request = arf.delete('/')
        mock_auth_with_user(admin_user)
        view = OrganizationUserViewSet.as_view({'delete': 'destroy'})
        response = view(request, parent_lookup_organization=org.id, email=user.user.email)
        assert not OrganizationToUser.objects.filter(user__email=user.user.email).exists()
        assert response.status_code == 204

    def test_destroy_last_admin(self, organization_factory, org_user_factory, system_factory,
                                mock_auth_with_user, arf, httpx_mock, default_cp_admin):
        gen_count = 10
        org = organization_factory()
        systems = [system_factory(organization=org) for _ in range(gen_count)]
        role = OrganizationRole.objects.get(name="Organization Administrator")
        user = org_user_factory(organization=org)
        user_2 = org_user_factory(organization=org)
        request = arf.delete('/')
        mock_auth_with_user(default_cp_admin)
        view = OrganizationUserViewSet.as_view({'delete': 'destroy'})
        with transaction.atomic():
            response = view(request, parent_lookup_organization=org.id, email=user.user.email)
        assert response.status_code == 204
        assert not OrganizationToUser.objects.filter(user__email=user.user.email).exists()

        with transaction.atomic():
            response = view(request, parent_lookup_organization=org.id, email=user_2.user.email)
        assert OrganizationToUser.objects.filter(user__email=user_2.user.email).exists()
        assert response.status_code == 409
        assert response.data['detail']
        assert "is the only Administrator and may not be demoted or removed" in response.data['detail']

    def test_bulk_delete_403(self, channel_partner_factory, organization_factory, org_user_factory,
                             mock_auth_with_user, arf):
        cp = channel_partner_factory()
        org = organization_factory(channel_partner=cp)
        other_org = organization_factory(channel_partner=cp)
        users = [org_user_factory(organization=org, role=OrganizationRoles.SYSTEM_HEALTH_VIEWER) for _ in range(3)]
        emails = [u.user.email for u in users]
        other_user = org_user_factory(organization=other_org)
        # test other organization user deletion
        data = emails + [other_user.user.email]
        request = arf.post('/', json=data)
        mock_auth_with_user(other_user)
        view = OrganizationUserViewSet.as_view({'post': 'bulk_delete'})
        response = view(request, parent_lookup_organization=org.id)
        assert response.status_code == 403

    def test_bulk_delete_400(self, channel_partner_factory, organization_factory, org_user_factory,
                         mock_auth_with_user, arf):
        cp = channel_partner_factory()
        org = organization_factory(channel_partner=cp)
        other_org = organization_factory(channel_partner=cp)
        users = [org_user_factory(organization=org, role=OrganizationRoles.SYSTEM_HEALTH_VIEWER) for _ in range(3)]
        emails = [u.user.email for u in users]
        admin = org_user_factory(organization=org)
        other_user = org_user_factory(organization=other_org)
        view = OrganizationUserViewSet.as_view({'post': 'bulk_delete'})
        # test other organization user deletion
        data = emails + ['invalid_email']
        request = arf.post('/', data=data, format='json')
        mock_auth_with_user(admin)
        response = view(request, parent_lookup_organization=org.id)
        assert response.status_code == 400

    def test_bulk_delete_409(self, channel_partner_factory, organization_factory, org_user_factory,
                         mock_auth_with_user, arf):
        cp = channel_partner_factory()
        org = organization_factory(channel_partner=cp)
        other_org = organization_factory(channel_partner=cp)
        users = [org_user_factory(organization=org, role=OrganizationRoles.SYSTEM_HEALTH_VIEWER) for _ in range(3)]
        emails = [u.user.email for u in users]
        admin = org_user_factory(organization=org)
        other_user = org_user_factory(organization=other_org)
        view = OrganizationUserViewSet.as_view({'post': 'bulk_delete'})
        # test all admins
        data = emails + [admin.user.email]
        request = arf.post('/', data=data, format='json')
        mock_auth_with_user(admin)
        response = view(request, parent_lookup_organization=org.id)
        assert response.status_code == 409

    def test_bulk_delete(self, channel_partner_factory, organization_factory, org_user_factory,
                         mock_auth_with_user, arf):
        cp = channel_partner_factory()
        org = organization_factory(channel_partner=cp)
        other_org = organization_factory(channel_partner=cp)
        users = [org_user_factory(organization=org, role=OrganizationRoles.SYSTEM_HEALTH_VIEWER) for _ in range(3)]
        emails = [u.user.email for u in users]
        admin = org_user_factory(organization=org)
        other_user = org_user_factory(organization=other_org)
        view = OrganizationUserViewSet.as_view({'post': 'bulk_delete'})
        # test all admins
        data = emails
        request = arf.post('/', data=data, format='json')
        mock_auth_with_user(admin)
        response = view(request, parent_lookup_organization=org.id)
        assert response.status_code == 204

    def test_remove_groups(self, channel_partner_factory, organization_factory, org_user_factory,
                           sys_group_user_factory, arf, mock_auth_with_user, cloud_user_factory):
        cloud_user = cloud_user_factory()
        cp = channel_partner_factory()
        org = organization_factory(channel_partner=cp)
        org_admin = org_user_factory(organization=org)
        other_org = organization_factory(channel_partner=cp)
        groups_users = [sys_group_user_factory(organization=org, cloud_user=cloud_user) for _ in range(5)]
        other_group = sys_group_user_factory(organization=other_org)
        view = OrganizationUserViewSet.as_view({'post': 'remove_groups'})
        mock_auth_with_user(org_admin)
        data = [str(u.system_group_id) for u in groups_users[:-1]]
        request = arf.post('/', data=data, format='json')
        response = view(request, parent_lookup_organization=org.id, email=cloud_user.email)
        assert response.status_code == 204

    def test_user_validation(self, channel_partner_factory, cp_user_factory, organization_factory,
                             mock_auth_with_user, arf, org_user_factory):
        cp = channel_partner_factory()
        cp_admin = cp_user_factory(channel_partner=cp)
        data = {
            'email': cp_admin.user.email,
            'role': 'Administrator',
            'title': 'cp user'
        }
        view = OrganizationUserViewSet.as_view(actions={'post': 'create'})
        mock_auth_with_user(cp_admin)

        organization = organization_factory(channel_partner=cp)
        request = arf.post('/', data=data, format='json')
        response = view(request, parent_lookup_organization=organization.id)
        assert response.status_code == 400
        assert (f"User {cp_admin.user.email} has a role in the organization parent channel partner"
                in response.data['email'][0])

class TestChannelPartnerUserViewSet:

    def test_destroy_last_admin(self, channel_partner_factory, cp_user_factory, default_channel_partner,
                                mock_auth_with_user, arf, default_cp_admin):
        # https://networkoptix.atlassian.net/wiki/spaces/FS/pages/2844524545/Channel+Partners+Orgs+access+matrix#Users
        cp = channel_partner_factory(parent_channel_partner=default_channel_partner)
        user = cp_user_factory(channel_partner=cp)
        user_2 = cp_user_factory(channel_partner=cp)
        request = arf.delete('/')
        mock_auth_with_user(default_cp_admin)
        view = ChannelPartnerUserViewSet.as_view({'delete': 'destroy'})
        with transaction.atomic():
            response = view(request, parent_lookup_channel_partner=cp.id, email=user.user.email)
        assert response.status_code == 403

        mock_auth_with_user(user)
        with transaction.atomic():
            response = view(request, parent_lookup_channel_partner=cp.id, email=user_2.user.email)
        assert not ChannelPartnerToUser.objects.filter(user__email=user_2.user.email).exists()
        assert response.status_code == 204

        with transaction.atomic():
            response = view(request, parent_lookup_channel_partner=cp.id, email=user.user.email)
        assert ChannelPartnerToUser.objects.filter(user__email=user.user.email).exists()
        assert response.status_code == 409
        assert response.data['detail']
        assert "is the only Administrator and may not be demoted or removed" in response.data['detail']

    def test_create(self, channel_partner_factory, cp_user_factory, mock_auth_with_user, arf, random_email,
                    mock_account_status, mock_get_customization_request, mock_post_notification, httpx_mock):
        email = random_email
        cp = channel_partner_factory()
        cp_admin = cp_user_factory(channel_partner=cp)
        data = {
            'email': email,
            'role': 'Administrator',
            'title': 'cp user'
        }
        view = ChannelPartnerUserViewSet.as_view(actions={'post': 'create'})
        request = arf.post('/', data=data, format='json')
        mock_account_status(email=email, active=False)
        mock_get_customization_request()
        notification_send_url = mock_post_notification()
        mock_auth_with_user(cp_admin)
        response = view(request, parent_lookup_channel_partner=cp.id)
        assert response.status_code == 200
        notification_send_request = httpx_mock.get_request(url=notification_send_url)
        notification_data = json.loads(notification_send_request.content)
        assert notification_data['type'] == 'cps_partner_invite'
        assert notification_data['user_email'] == email
        assert notification_data['message']['partner_name'] == cp.name
        assert notification_data['message']['sharer_name'] == cp_admin.user.full_name

    def test_user_validation(self, channel_partner_factory, cp_user_factory, organization_factory,
                             mock_auth_with_user, arf, org_user_factory, random_email):
        email = random_email
        cp = channel_partner_factory()
        cp_admin = cp_user_factory(channel_partner=cp)
        data = {
            'email': email,
            'role': 'Administrator',
            'title': 'cp user'
        }
        view = ChannelPartnerUserViewSet.as_view(actions={'post': 'create'})
        mock_auth_with_user(cp_admin)

        organization = organization_factory(channel_partner=cp)
        org_user = org_user_factory(email=email, organization=organization)
        request = arf.post('/', data=data, format='json')
        response = view(request, parent_lookup_channel_partner=cp.id)
        assert response.status_code == 400
        assert f"User {email} has a role in the channel partner child organization" in response.data['email'][0]



class TestChannelPartnerNestedViewSet:

    def test_get_queryset(self, default_channel_partner, channel_partner_factory,
                          cloud_test_host, cloud_host_factory, mock_auth_with_user,
                          default_cp_admin, cp_user_factory, arf):
        gen_count = 3
        host = cloud_host_factory(hostname=f'{uuid4()}')
        other_host = cloud_host_factory(hostname=f'{uuid4()}')
        root_cp = channel_partner_factory(name=f'{uuid4()}', parent_channel_partner=None,
                                          cloud_host=host)
        root_cp_user = cp_user_factory(channel_partner=root_cp)
        other_root_cp = channel_partner_factory(name=f'{uuid4()}', parent_channel_partner=None,
                                                cloud_host=other_host)
        default_subs = [channel_partner_factory(parent_channel_partner=root_cp, cloud_host=host) for _ in range(gen_count)]
        default_subs += [channel_partner_factory(parent_channel_partner=root_cp, cloud_host=cloud_host_factory(f'{uuid4()}')) for _ in range(gen_count)]
        other_subs = [channel_partner_factory(parent_channel_partner=other_root_cp) for _ in range(gen_count)]
        for sub in default_subs + other_subs:
            channel_partner_factory(parent_channel_partner=sub, cloud_host=host)
            channel_partner_factory(parent_channel_partner=sub, cloud_host=cloud_test_host)
        # Test root channel partner's subs
        view = ChannelPartnerNestedViewSet(kwargs={'parent_lookup_parent_channel_partner': str(root_cp.id)})
        view.request = MagicMock()
        view.request.cloud_host = host
        view.request.user = root_cp_user.user
        qs = view.get_queryset()
        assert qs.count() == len(default_subs)

        # test second level partner's subs (has two children with different hosts)
        view = ChannelPartnerNestedViewSet(kwargs={'parent_lookup_parent_channel_partner': str(default_subs[0].id)})
        view.request = MagicMock()
        view.request.cloud_host = host
        view.request.user = root_cp_user.user
        qs = view.get_queryset()
        assert qs.count() == 2


class TestChannelPartnerViewSet:

    def test_get_queryset(self, default_channel_partner, channel_partner_factory,
                          cloud_test_host, cloud_host_factory, mock_auth_with_user,
                          default_cp_admin, arf, cp_user_factory, organization_factory,
                          org_user_factory):
        gen_count = 3
        host = cloud_host_factory(hostname=f'{uuid4()}')
        other_host = cloud_host_factory(hostname=f'{uuid4()}')
        root_cp = channel_partner_factory(name=f'{uuid4()}', parent_channel_partner=None,
                                          cloud_host=host)
        root_cp_user = cp_user_factory(channel_partner=root_cp)
        other_root_cp = channel_partner_factory(name=f'{uuid4()}', parent_channel_partner=None,
                                                cloud_host=other_host)
        default_host_subs = [channel_partner_factory(parent_channel_partner=root_cp,
                                                     cloud_host=host) for _ in range(gen_count)]
        other_host_subs = [
            channel_partner_factory(parent_channel_partner=root_cp, cloud_host=cloud_host_factory(f'{uuid4()}')) for _
            in range(gen_count)]
        other_subs = [channel_partner_factory(parent_channel_partner=other_root_cp) for _ in range(gen_count)]

        # Test root channel partner's users request for a different host sub channel partner
        mock_auth_with_user(root_cp_user)
        sub_cp = other_host_subs[-1]
        view = ChannelPartnerViewSet.as_view(actions={'get': 'retrieve'}, detail=True)
        request = arf.get('/')
        request.user = root_cp_user.user
        request.cloud_host = host
        response = view(request, pk=str(sub_cp.id))
        assert response.status_code == 200
        assert response.data['id'] == str(sub_cp.id)
        assert response.data['parentChannelPartner'] == root_cp.id

        # Test root channel partner's users request for a list
        view = ChannelPartnerViewSet.as_view(actions={'get': 'list'})
        request = arf.get('/')
        request.user = root_cp_user.user
        request.cloud_host = host
        response = view(request)
        assert response.status_code == 200
        # must contain only root_cp
        assert set([cp['id'] for cp in response.data['results']]) == {str(root_cp.id)}

        # Test organization user retrieve parent channel partner
        org = organization_factory(channel_partner=sub_cp)
        org_user = org_user_factory(organization=org)
        mock_auth_with_user(org_user)
        view = ChannelPartnerViewSet.as_view(actions={'get': 'retrieve'}, detail=True)
        request.user = org_user.user
        request.cloud_host = host
        response = view(request, pk=str(sub_cp.id))
        assert response.status_code == 200
        assert response.data['id'] == str(sub_cp.id)
        # Organizations users have no access to their parent's parent cp id
        assert response.data['parentChannelPartner'] == VALUE_REPLACEMENT

    def test_aggregate(self, default_channel_partner, channel_partner_factory, organization_factory,
                       system_factory, arf, mock_auth_with_user, cp_user_factory):
        gen_count = 3
        target_cp = channel_partner_factory(parent_channel_partner=default_channel_partner)
        other_cp = channel_partner_factory(parent_channel_partner=default_channel_partner)
        level_1 = [channel_partner_factory(parent_channel_partner=target_cp) for _ in range(gen_count)]
        level_2 = [channel_partner_factory(parent_channel_partner=level_1[int(i/gen_count)])
                   for i in range(gen_count ** 2)]
        level_3 = [channel_partner_factory(parent_channel_partner=level_2[int(i / gen_count)])
                   for i in range(int (gen_count ** 3))]
        target_partners = [target_cp] + level_1 + level_2 + level_3
        organizations = [organization_factory(channel_partner=target_partners[int(i/gen_count)])
                         for i in range(len(target_partners) * gen_count)]
        systems = [system_factory(organization=organizations[int(i/gen_count)])
                   for i in range(len(organizations) * gen_count)]
        services = [baker.make(ChannelPartnerServiceRecord, cloud_system=systems[i], quantity=gen_count)
                    for i in range(len(organizations))]

        view = ChannelPartnerViewSet.as_view(actions={'get': 'aggregate'}, detail=True)
        cp_user = cp_user_factory(channel_partner=target_cp)
        mock_auth_with_user(cp_user)
        response = view(arf.get(f'/partners/channel_partners/{target_cp.id}/aggregate/'), pk=target_cp.id)
        assert response.status_code == 200
        assert response.data['channelPartners'] == len(target_partners) - 1
        assert response.data['organizations'] == len(organizations)
        assert response.data['systems'] == len(systems)
        assert response.data['serviceUsageQuantity'] == len(organizations) * gen_count

    def test_service_changes_history(self, channel_partner_factory, organization_factory, cp_user_factory,
                                     cp_service_factory, system_factory, service_record_factory,
                                     mock_auth_with_user, arf):
        start_ts = (timezone.now() - relativedelta(days=7)).date()
        cp = channel_partner_factory()
        cp_user = cp_user_factory(channel_partner=cp)
        org = organization_factory(channel_partner=cp)
        system = system_factory(organization=org)
        services = [cp_service_factory(channel_partner=cp) for _ in range(5)]
        records = [service_record_factory(service, system) for service in services]
        view = ChannelPartnerViewSet.as_view(actions={'get': 'service_changes_history'}, detail=True)
        request = arf.get(f'/partners/channel_partners/{cp.id}/service_changes_history/?startTs={start_ts.isoformat()}')
        mock_auth_with_user(cp_user)
        response = view(request, pk=cp.id)
        assert response.status_code == 200
        assert isinstance(response.data, dict)
        assert 'count' in response.data
        assert 'next' in response.data
        assert 'previous' in response.data
        assert len(response.data['results']) == len(services)
        assert 'channelPartnerId' in response.data['results'][0]

    def test_service_changes_summary(self, channel_partner_factory, organization_factory, cp_user_factory,
                                     cp_service_factory, system_factory, service_record_factory,
                                     mock_auth_with_user, arf):
        cp = channel_partner_factory()
        cp_user = cp_user_factory(channel_partner=cp)
        org = organization_factory(channel_partner=cp)
        system = system_factory(organization=org)
        services = [cp_service_factory(channel_partner=cp) for _ in range(5)]
        records = [service_record_factory(service, system) for service in services]
        view = ChannelPartnerViewSet.as_view(actions={'get': 'service_changes_summary'}, detail=True)
        request = arf.get(f'/partners/channel_partners/{cp.id}/service_changes_summary/')
        mock_auth_with_user(cp_user)
        response = view(request, pk=cp.id)
        assert response.status_code == 200
        assert isinstance(response.data, dict)
        assert 'count' in response.data
        assert 'next' in response.data
        assert 'previous' in response.data
        assert len(response.data['results']) == len(services)

    def test_ownPermissions(self, channel_partner_factory, cp_user_factory, arf, mock_auth_with_user):
        cp = channel_partner_factory()
        roles = ChannelPartnerRole.objects.all()
        partners = []
        users = []
        for role in roles:
            partner = channel_partner_factory(parent_channel_partner=cp)
            partners.append(partner)
            user = cp_user_factory(channel_partner=partner, role=role.name)
            users.append(user)

        view = ChannelPartnerViewSet.as_view(actions={'get': 'list'})

        for role, partner, user in zip(roles, partners, users):
            request = arf.get(f'/partners/channel_partners/')
            request.user = user.user
            mock_auth_with_user(user)

            response = view(request)
            for data in response.data['results']:
                if str(partner.id) == data['id']:
                    assert set(data['ownPermissions']) == set([p.codename for p in role.permissions.all()])
                    assert data['ownRolesIds'] == user.roles
                    assert data['ownRoles'] == user.roles_name
                else:
                    assert data['ownPermissions'] == []
                    assert data['ownRolesIds'] == []
                    assert data['ownRoles'] == []

    def test_partial_update(self, channel_partner_factory, cp_user_factory, arf, mock_auth_with_user):
        root = channel_partner_factory()
        cp = channel_partner_factory(parent_channel_partner=root)
        cp_user = cp_user_factory(channel_partner=cp)
        view = ChannelPartnerViewSet.as_view(actions={'patch': 'partial_update'}, detail=True)
        data = {'name': f'{uuid4()}'}
        request = arf.patch('/', data=data, format='json')
        mock_auth_with_user(cp_user)
        response = view(request, pk=cp.id)
        assert response.status_code == 200
        cp.refresh_from_db()
        assert cp.name == data['name']


class TestOrganizationViewSet:

    def test_aggregate(self, organization_factory, system_factory, arf, default_cp_admin, mock_auth_with_user):
        org = organization_factory()
        view = OrganizationViewSet.as_view(actions={'get': 'aggregate'}, detail=True)
        mock_auth_with_user(default_cp_admin)
        response = view(arf.get('/'), pk=org.id)
        assert response.status_code == 200
        assert response.data['systems'] == 0
        assert response.data['serviceUsageQuantity'] == 0
        sys_cnt = random.randint(30, 60)
        systems = [system_factory(organization=org) for _ in range(sys_cnt)]

        response = view(arf.get('/'), pk=org.id)

        assert response.data['systems'] == sys_cnt
        assert response.data['serviceUsageQuantity'] == 0

        usage = 0
        for sys in systems:
            qty = random.randint(0, 10)
            baker.make(ChannelPartnerServiceRecord, cloud_system=sys, quantity=qty)
            usage += qty

        response = view(arf.get('/'), pk=org.id)

        assert response.data['systems'] == sys_cnt
        assert response.data['serviceUsageQuantity'] == usage

    def test_service_changes_history(self, channel_partner_factory, organization_factory, cp_user_factory,
                                     cp_service_factory, system_factory, service_record_factory,
                                     mock_auth_with_user, arf):
        start_ts = (timezone.now() - relativedelta(days=7)).date()
        cp = channel_partner_factory()
        cp_user = cp_user_factory(channel_partner=cp)
        org = organization_factory(channel_partner=cp)
        system = system_factory(organization=org)
        services = [cp_service_factory(channel_partner=cp) for _ in range(5)]
        records = [service_record_factory(service, system) for service in services]
        view = OrganizationViewSet.as_view(actions={'get': 'service_changes_history'}, detail=True)
        request = arf.get(f'/partners/channel_partners/{org.id}/service_changes_history/?startTs={start_ts.isoformat()}')
        mock_auth_with_user(cp_user)
        response = view(request, pk=org.id)
        assert response.status_code == 200
        assert isinstance(response.data, dict)
        assert 'count' in response.data
        assert 'next' in response.data
        assert 'previous' in response.data
        assert len(response.data['results']) == len(services)

    def test_service_changes_summary(self, channel_partner_factory, organization_factory, cp_user_factory,
                                     cp_service_factory, system_factory, service_record_factory,
                                     mock_auth_with_user, arf):
        start_ts = (timezone.now() - relativedelta(days=7)).date()
        cp = channel_partner_factory()
        cp_user = cp_user_factory(channel_partner=cp)
        org = organization_factory(channel_partner=cp)
        system = system_factory(organization=org)
        services = [cp_service_factory(channel_partner=cp) for _ in range(5)]
        records = [service_record_factory(service, system) for service in services]
        view = OrganizationViewSet.as_view(actions={'get': 'service_changes_summary'}, detail=True)
        request = arf.get(f'/partners/channel_partners/{org.id}/service_changes_summary/?startTs={start_ts.isoformat()}')
        mock_auth_with_user(cp_user)
        response = view(request, pk=org.id)
        assert response.status_code == 200
        assert isinstance(response.data, dict)
        assert 'count' in response.data
        assert 'next' in response.data
        assert 'previous' in response.data
        assert len(response.data['results']) == len(services)

    def test_ownPermissions(self, channel_partner_factory, organization_factory,
                              org_user_factory, arf, mock_auth_with_user):
        cp = channel_partner_factory()
        roles = OrganizationRole.objects.all()
        orgs = []
        users = []
        for role in roles:
            org = organization_factory(channel_partner=cp)
            orgs.append(org)
            user = org_user_factory(organization=org, role=role.name)
            users.append(user)

        view = OrganizationViewSet.as_view(actions={'get': 'list'})

        for role, org, user in zip(roles, orgs, users):
            request = arf.get(f'/partners/channel_partners/')
            request.user = user.user
            mock_auth_with_user(user)
            response = view(request)
            for data in response.data['results']:
                if str(org.id) == data['id']:
                    assert set(data['ownPermissions']) == set([p.codename for p in role.permissions.all()])
                    assert data['ownRolesIds']
                    assert data['ownRolesIds'] == user.roles
                    assert data['ownRoles'] == user.roles_name
                else:
                    assert data['ownPermissions'] == []
                    assert data['ownRolesIds'] == []
                    assert data['ownRoles'] == []

    def test_groups_structure(self, channel_partner_factory, cp_user_factory, organization_factory,
                              org_user_factory, system_group_factory, sys_group_user_factory,
                              system_factory, arf, mock_auth_with_user):
        root = channel_partner_factory()
        cp = channel_partner_factory(parent_channel_partner=root)
        cp_user = cp_user_factory(channel_partner=cp)
        org = organization_factory(channel_partner=cp)
        view = OrganizationViewSet.as_view(actions={'get': 'groups_structure'}, detail=True)

        def create_groups(organization, degree=3):
            groups = [[system_group_factory(organization=organization) for _ in range(degree)]]
            for level in range(degree):
                siblings = []
                for group in groups[level]:
                    for _ in range(degree):
                        siblings.append(system_group_factory(organization=organization, parent=group))
                groups.append(siblings)
            return groups

        org_groups = create_groups(organization=org)

        single_group_user = sys_group_user_factory(organization=org, group=org_groups[-1][-1])
        request = arf.get('/')
        mock_auth_with_user(single_group_user)
        response = view(request, pk=org.id)

        assert len(response.data) == 1
        assert response.data[0]['id'] == str(org_groups[-1][-1].id)

        one_sublevel_user = sys_group_user_factory(organization=org, group=org_groups[-2][-1])
        request = arf.get('/')
        mock_auth_with_user(one_sublevel_user)
        response = view(request, pk=org.id)
        assert len(response.data) == 1
        assert response.data[0]['id'] == str(org_groups[-2][-1].id)
        assert len(response.data[0]['children']) == 3

    def test_partial_update(self, channel_partner_factory, cp_user_factory, organization_factory,
                            org_user_factory, arf, mock_auth_with_user):
        root = channel_partner_factory()
        cp = channel_partner_factory(parent_channel_partner=root)
        org = organization_factory(channel_partner=cp)
        org_user = org_user_factory(organization=org)
        view = OrganizationViewSet.as_view(actions={'patch': 'partial_update'}, detail=True)
        data = {'name': f'{uuid4()}'}
        request = arf.patch('/', data=data, format='json')
        mock_auth_with_user(org_user)
        response = view(request, pk=org.id)
        assert response.status_code == 200
        org.refresh_from_db()
        assert org.name == data['name']

    def test_list(self, channel_partner_factory, organization_factory, cp_user_factory, org_user_factory,
                  arf, mock_auth_with_user):
        root = channel_partner_factory()
        cp = channel_partner_factory(parent_channel_partner=root)
        other_cp = channel_partner_factory(parent_channel_partner=root)
        other_org = organization_factory(channel_partner=other_cp)
        org = organization_factory(channel_partner=cp)
        org_user = org_user_factory(organization=org)
        other_cp_user = cp_user_factory(channel_partner=other_cp, email=org_user.user.email)
        cp_user = cp_user_factory(channel_partner=cp)
        root_user = cp_user_factory(channel_partner=root)
        mock_auth_with_user(org_user)
        view = OrganizationViewSet.as_view(actions={'get': 'list'})
        request = arf.get('/?includeChildOrgs=true')
        response = view(request)
        assert response.status_code == 200
        assert len(response.data['results']) == 2
        assert response.data['results'][0]['id'] in [str(org.id), str(other_org.id)]

        request = arf.get('/?')
        response = view(request)
        assert response.status_code == 200
        assert len(response.data['results']) == 1
        assert response.data['results'][0]['id'] == str(org.id)

        mock_auth_with_user(cp_user)
        request = arf.get('/?includeChildOrgs=true')
        response = view(request)
        assert response.status_code == 200
        assert len(response.data['results']) == 1
        assert response.data['results'][0]['id'] == str(org.id)

        request = arf.get('/?includeChildOrgs=false')
        response = view(request)
        assert response.status_code == 200
        assert len(response.data['results']) == 0

        request = arf.get('/?')
        response = view(request)
        assert response.status_code == 200
        assert len(response.data['results']) == 0

        mock_auth_with_user(root_user)
        request = arf.get('/?includeChildOrgs=true')
        response = view(request)
        assert response.status_code == 200
        assert len(response.data['results']) == 0


class TestSystemGroupUserViewSet:

    @pytest.fixture(autouse=True)
    def setup(self, channel_partner_factory, organization_factory, sys_group_user_factory,
              cloud_user_factory, org_user_factory, system_group_factory):
        self.cp = channel_partner_factory()
        self.org = organization_factory(channel_partner=self.cp)
        self.org_user = org_user_factory(email=f'{uuid4()}@networkoptix.com', organization=self.org)
        self.other_user = org_user_factory(email=f'{uuid4()}@networkoptix.com')
        self.group = system_group_factory(organization=self.org)
        self.users = [sys_group_user_factory(organization=self.org, group=self.group) for _ in range(5)]
        self.other_org = organization_factory(channel_partner=self.cp)
        self.other_group = system_group_factory(organization=self.other_org)
        self.org_adm_name = 'Organization Administrator'
        self.org_power_user_name = 'Power User'

    def test_list_403(self, mock_auth_with_user, arf):
        view = SystemGroupUserViewSet.as_view(actions={'get': 'list'})
        request = arf.get('/')
        mock_auth_with_user(self.other_user)
        response = view(request, parent_lookup_system_group=str(self.group.id))
        assert response.status_code == 403

    def test_list_200(self, mock_auth_with_user, arf):
        view = SystemGroupUserViewSet.as_view(actions={'get': 'list'})
        request = arf.get('/')

        mock_auth_with_user(self.org_user)
        response = view(request, parent_lookup_system_group=str(self.group.id))
        assert response.status_code == 200
        assert len(response.data) == len(self.users)
        for i, data in enumerate(response.data):
            assert data['email'] == self.users[i].user.email
            assert data['fullName'] == self.users[i].user.full_name
            assert data['roles'] == self.users[i].roles_name

    def test_retrieve_403(self, mock_auth_with_user, arf):
        view = SystemGroupUserViewSet.as_view(actions={'get': 'retrieve'})
        request = arf.get('/')
        mock_auth_with_user(self.other_user)
        response = view(request, parent_lookup_system_group=str(self.group.id), email=self.users[0].user.email)
        assert response.status_code == 403

    def test_retrieve_200(self, mock_auth_with_user, arf):
        view = SystemGroupUserViewSet.as_view(actions={'get': 'retrieve'})
        request = arf.get('/')

        mock_auth_with_user(self.org_user)
        response = view(request, parent_lookup_system_group=str(self.group.id), email=self.users[0].user.email)
        assert response.status_code == 200
        assert response.data['email'] == self.users[0].user.email
        assert response.data['fullName'] == self.users[0].user.full_name
        assert response.data['roles'] == self.users[0].roles_name\

    def test_create_403(self, mock_auth_with_user, arf, org_user_factory):
        view = SystemGroupUserViewSet.as_view(actions={'post': 'create'})
        user_rel = org_user_factory(organization=self.org)
        user = user_rel.user
        data = {
            'email': user.email,
            'role': 'Power User'
        }
        request = arf.post('/', data=data)
        mock_auth_with_user(self.other_user)

        response = view(request, parent_lookup_system_group=str(self.group.id), email=self.users[0].user.email)
        assert response.status_code == 403

    def test_create_201(self, mock_auth_with_user, arf, org_user_factory,
                        mock_account_status, mock_get_customization_request,
                        mock_post_notification, httpx_mock):
        view = SystemGroupUserViewSet.as_view(actions={'post': 'create'})
        user_rel = org_user_factory(organization=self.org)
        user = user_rel.user
        data = {
            'email': user.email,
            'role': 'Power User'
        }
        request = arf.post('/', data=data)
        mock_auth_with_user(self.org_user)
        mock_account_status(email=user.email, active=True)
        mock_get_customization_request()
        notification_send_url = mock_post_notification()
        response = view(request, parent_lookup_system_group=str(self.group.id), email=self.users[0].user.email)
        assert response.status_code == 201
        assert response.data['email'] == user.email
        assert response.data['fullName'] == user.full_name
        assert response.data['roles'] == ['Power User']
        notification_data = json.loads(httpx_mock.get_request(url=notification_send_url).content)
        assert notification_data['type'] == 'cps_organization_share'
        assert not OrganizationToUser.objects.filter(
            organization=self.org, user=user, system_group__isnull=True
        ).exists()


    def test_bulk_delete_403(self, channel_partner_factory, organization_factory, org_user_factory,
                             mock_auth_with_user, arf):
        emails = [u.user.email for u in self.users]
        # test other organization user deletion
        data = emails + [self.other_user.user.email]
        request = arf.post('/', json=data)
        mock_auth_with_user(self.other_user)
        view = SystemGroupUserViewSet.as_view({'post': 'bulk_delete'})
        response = view(request, parent_lookup_system_group=self.group.id)
        assert response.status_code == 403

    def test_bulk_delete_400(self, channel_partner_factory, organization_factory, org_user_factory,
                         mock_auth_with_user, arf):
        emails = [u.user.email for u in self.users]
        view = SystemGroupUserViewSet.as_view({'post': 'bulk_delete'})
        # test other organization user deletion
        data = emails + ['invalid_email']
        request = arf.post('/', data=data, format='json')
        mock_auth_with_user(self.org_user)
        response = view(request, parent_lookup_system_group=self.group.id)
        assert response.status_code == 400

    def test_bulk_delete(self, channel_partner_factory, organization_factory, org_user_factory,
                         mock_auth_with_user, arf):
        emails = [u.user.email for u in self.users]
        view = SystemGroupUserViewSet.as_view({'post': 'bulk_delete'})
        # test all admins
        data = emails
        request = arf.post('/', data=data, format='json')
        mock_auth_with_user(self.org_user)
        response = view(request, parent_lookup_system_group=self.group.id)
        assert response.status_code == 204

    def test_can_access(self, system_group_factory, sys_group_user_factory, arf, mock_auth_with_user):
        caches['default'].clear()
        self.group_1 = system_group_factory(organization=self.org, parent=self.group)
        self.group_2 = system_group_factory(organization=self.org, parent=self.group_1)
        self.group_3 = system_group_factory(organization=self.org, parent=self.group_2)

        users = [sys_group_user_factory(organization=self.org, group=g)
                 for g in [self.group_1, self.group_2, self.group_3]]

        view = SystemGroupUserViewSet.as_view({'get': 'can_access'})
        request = arf.get('/')
        mock_auth_with_user(self.org_user)

        response = view(request, parent_lookup_system_group=self.group.id)
        assert response.status_code == 200
        assert len(response.data) == len(self.users + [self.org_user])
        for data in response.data:
            assert data['hasAccessTo']
            instance_id = data['hasAccessTo']['id']
            instance = SystemGroup.objects.filter(id=instance_id).first() or Organization.objects.get(id=instance_id)
            assert data['hasAccessTo']['name'] == instance.name
            assert data['hasAccessTo']['membershipType'] == instance._meta.model_name

        response = view(request, parent_lookup_system_group=self.group_2.id)

        assert response.status_code == 200
        assert len(response.data) == len(self.users + [self.org_user]) + 2
        for data in response.data:
            assert data['hasAccessTo']
            instance_id = data['hasAccessTo']['id']
            instance = SystemGroup.objects.filter(id=instance_id).first() or Organization.objects.get(id=instance_id)
            assert data['hasAccessTo']['name'] == instance.name
            assert data['hasAccessTo']['membershipType'] == instance._meta.model_name


def test_system_user(channel_partner_factory, cp_user_factory, organization_factory,
                     org_user_factory, system_group_factory, system_factory,
                     sys_group_user_factory, cloud_user_factory, arf, mock_internal_token_auth):
        cp = channel_partner_factory()
        org = organization_factory(channel_partner=cp)
        org.channel_partner_access_level_id = OrganizationRoles.POWER_USER
        org.save()
        org_sys = system_factory(organization=org)
        group = system_group_factory(organization=org)
        group_sys = system_factory(organization=org, system_group=group)
        cp_admin = cp_user_factory(channel_partner=cp)
        org_admin = org_user_factory(organization=org)
        group_user = sys_group_user_factory(organization=org, group=group,
                                            role_id=OrganizationRoles.SYSTEM_HEALTH_VIEWER)

        request = arf.get('/')
        mock_internal_token_auth()

        response = system_user(request, str(group_sys.system_id), email=cp_admin.user.email)
        assert response.status_code == 200
        assert response.data['vmsRoles'][0] == OrganizationRole.objects.get(pk=org.channel_partner_access_level_id).system_role_uuid

        response = system_user(request, str(group_sys.system_id), email=group_user.user.email)
        assert response.status_code == 200
        assert response.data['vmsRoles'][0] == OrganizationRole.objects.get(pk=group_user.roles[0]).system_role_uuid


def test_system_users(channel_partner_factory, cp_user_factory, organization_factory,
                     org_user_factory, system_group_factory, system_factory,
                     sys_group_user_factory, cloud_user_factory, arf, mock_internal_token_auth):
    cp = channel_partner_factory()
    org = organization_factory(channel_partner=cp)
    org.channel_partner_access_level_id = OrganizationRoles.POWER_USER
    org.save()
    org_sys = system_factory(organization=org)
    group = system_group_factory(organization=org)
    group_sys = system_factory(organization=org, system_group=group)
    cp_admin = cp_user_factory(channel_partner=cp)
    org_admin = org_user_factory(organization=org)
    group_user = sys_group_user_factory(organization=org, group=group,
                                        role_id=OrganizationRoles.SYSTEM_HEALTH_VIEWER)

    request = arf.get('/')
    mock_internal_token_auth()

    response = system_users(request, str(group_sys.system_id))
    assert response.status_code == 200
    assert len(response.data) == 3

def test_user_systems(channel_partner_factory, cp_user_factory, organization_factory,
                      org_user_factory, system_group_factory, system_factory,
                      sys_group_user_factory, cloud_user_factory, arf, mock_internal_token_auth):
    cp = channel_partner_factory()
    org = organization_factory(channel_partner=cp)
    org.channel_partner_access_level_id = OrganizationRoles.POWER_USER
    org.save()
    org_sys = system_factory(organization=org)
    group = system_group_factory(organization=org)
    group_sys = system_factory(organization=org, system_group=group)
    cp_admin = cp_user_factory(channel_partner=cp)
    org_admin = org_user_factory(organization=org)
    group_user = sys_group_user_factory(organization=org, group=group,
                                        role_id=OrganizationRoles.SYSTEM_HEALTH_VIEWER)

    request = arf.get('/')
    mock_internal_token_auth()

    response = user_systems(request, cp_admin.user.email)
    assert response.status_code == 200
    assert len(response.data) == 2

    response = user_systems(request, org_admin.user.email)
    assert response.status_code == 200
    assert len(response.data) == 2

    response = user_systems(request, group_user.user.email)
    assert response.status_code == 200
    assert len(response.data) == 1



class TestSystemGroupViewSet:
    @pytest.fixture(autouse=True)
    def setup_method_fixture(self, channel_partner_factory, cp_user_factory, organization_factory, org_user_factory,
                             system_group_factory, sys_group_user_factory, system_factory, arf, mock_auth_with_user):
        self.root = channel_partner_factory()
        self.root_user = cp_user_factory(channel_partner=self.root)
        self.cp = channel_partner_factory(parent_channel_partner=self.root)
        self.other_cp = channel_partner_factory(parent_channel_partner=self.root)
        self.cp_user = cp_user_factory(channel_partner=self.cp)
        self.other_cp_user = cp_user_factory(channel_partner=self.other_cp)
        self.org_1 = organization_factory(channel_partner=self.cp)
        self.org_user = org_user_factory(organization=self.org_1)
        self.org_2 = organization_factory(channel_partner=self.cp)
        self.other_org = organization_factory(channel_partner=self.other_cp)
        self.group = system_group_factory(organization=self.org_1)
        self.group_user = sys_group_user_factory(organization=self.org_1, group=self.group)
        self.group2 = system_group_factory(organization=self.org_2)
        self.other_group = system_group_factory(organization=self.other_org)
        for _ in range(3):
            system_group_factory(organization=self.org_1, parent=self.group)
            system_group_factory(organization=self.org_2, parent=self.group2)
            system_group_factory(organization=self.other_org, parent=self.other_group)

    def test_retrieve(self, arf, mock_auth_with_user):
        view = SystemGroupViewSet.as_view(actions={'get': 'retrieve'}, detail=True)
        request = arf.get('/')
        mock_auth_with_user(self.org_user)
        response = view(request, pk=self.group.id)
        assert response.status_code == 200
        assert response.data['id'] == str(self.group.id)

        sub_group = SystemGroup.objects.filter(parent=self.group).first()

        response = view(request, pk=sub_group.id)
        assert response.status_code == 200
        assert response.data['id'] == str(sub_group.id)

        mock_auth_with_user(self.cp_user)
        response = view(request, pk=self.group.id)
        assert response.status_code == 200
        assert response.data['id'] == str(self.group.id)

        sub_group = SystemGroup.objects.filter(parent=self.group).first()

        response = view(request, pk=sub_group.id)
        assert response.status_code == 200
        assert response.data['id'] == str(sub_group.id)

        mock_auth_with_user(self.other_cp_user)
        response = view(request, pk=self.group.id)
        assert response.status_code == 404


class TestOrganizationRole:
    def test_organization_roles_has_all_fields(self, channel_partner_factory, cp_user_factory, arf):
        cp = channel_partner_factory()
        cp_admin = cp_user_factory(channel_partner=cp)

        request = arf.get('/partners/organization_roles')
        response = organization_roles(request)
        actual_records = response.data

        required_fields = ['id', 'permissions', 'systemRole', 'name', 'system_role_uuid', 'systemRoleId']
        results = []
        for record in actual_records:
            results.append(not (set(required_fields) - record.keys()))

        assert all(results)


class TestSystemUser:
    def test_system_user_has_all_fields(self,channel_partner_factory, cp_user_factory, arf):
        cp = channel_partner_factory()
        email = "my-test@aol.com"
        cp_admin = cp_user_factory(email=email, channel_partner=cp)

        request = arf.get(f'/internal/partners/users/{email}/systems')
        response = user_systems(request, email=email)
        actual_records = response.data

        required_fields = ['system_id', 'systemId', 'vmsRoles', 'membership_type', 'membershipType']
        results = []
        for record in actual_records:
            results.append(not (set(required_fields) - record.keys()))

        assert all(results)


class TestGrantAccessView:
    @pytest.fixture(autouse=True)
    def setUp(self,mock_auth_with_user,
              system_factory, cp_service_factory,
              service_record_factory, cp_user_factory,
              organization_factory, channel_partner_factory, org_user_factory):
        root = channel_partner_factory(parent_channel_partner=None)
        child = channel_partner_factory(parent_channel_partner=root)
        root_user = cp_user_factory(channel_partner=root)
        child_user = cp_user_factory(channel_partner=child)
        root_org = organization_factory(channel_partner=root)
        root_org_user = org_user_factory(organization=root_org)
        system = system_factory(organization=root_org)
        service = cp_service_factory(channel_partner=root)
        self.factory = RequestFactory()
        self.url = '/internal/grant_access.html'
        self.client = Client()

    @override_settings(DEBUG=False)
    def test_grant_access_debug_false_call_by_url(self):
        response = self.client.get(self.url)
        assert type(response) == HttpResponseNotFound
        assert response.status_code == 404

    @override_settings(DEBUG=False)
    def test_grant_access_debug_false_call_by_method(self):
        request = self.factory.get(self.url)
        response = grant_access(request)
        assert type(response) == HttpResponseForbidden
        assert response.status_code == 403

    @override_settings(DEBUG=True)
    def test_grant_access_debug_true_valid_email(self):
        data = {'email': 'test@networkoptix.com'}
        request = self.factory.post(self.url, data=data)
        request.cloud_host = 'cloud-test.hdw.mx'
        response = grant_access(request)


        expected_data = [
            'test+nxadmin@networkoptix.com',
            'test+cpadmin@networkoptix.com',
            'test+orgadmin@networkoptix.com'
        ]

        for i, row in enumerate(response.content.decode().split('<tr')[2:-1]):
            cols = [col.strip() for col in row.split('<td style="padding: 8px;">')[1:-1]]
            user_email = [col.split('</td>')[0] for col in cols][0]

            assert user_email == expected_data[i]
        assert response.status_code == 200


class TestCloudSystemViewSetDelete:
    @pytest.fixture(autouse=True)
    def setUp(self, channel_partner_factory, organization_factory, cp_user_factory,
              org_user_factory, system_factory, mock_auth_with_user, arf, httpx_mock, arf_basic_auth):
        httpx_mock.reset(False)
        self.cp = channel_partner_factory()
        self.cp_user = cp_user_factory(channel_partner=self.cp)
        self.org = organization_factory(channel_partner=self.cp)
        self.org_user = org_user_factory(organization=self.org)
        self.system = system_factory(organization=self.org)
        self.url = f'https://{settings.INSTANCE_CONFIG.default_host}/cdb/systems/{self.system.system_id}'
        self.view = CloudSystemViewSet.as_view(actions={'delete': 'destroy'}, detail=True)
        self.request = arf.delete('/')
        self.token = 'HERE_MIGHT_BE_TOKEN'
        mock_auth_with_user(self.org_user, token=self.token)
        self.data = {'check': str(uuid4())}

    def test_error(self, httpx_mock):
        httpx_mock.add_response(url=self.url, status_code=401, json=self.data)
        response = self.view(self.request, id=self.system.system_id)
        assert response.status_code == 401
        assert response.data == self.data
        request = httpx_mock.get_request(url=self.url)
        assert request.headers.get('Authorization') == f'Bearer {self.token}'

    def test_success(self, httpx_mock):
        httpx_mock.add_response(url=self.url, status_code=200, json=self.data)
        response = self.view(self.request, id=self.system.system_id)
        assert response.status_code == 204
        request = httpx_mock.get_request(url=self.url)
        assert request.headers.get('Authorization') == f'Bearer {self.token}'

    def test_empty_json(self, httpx_mock):
        httpx_mock.add_response(url=self.url, status_code=401)
        response = self.view(self.request, id=self.system.system_id, json='')
        assert response.status_code == 401
        assert response.data == {'detail': 'A server error occurred.'}
        request = httpx_mock.get_request(url=self.url)
        assert request.headers.get('Authorization') == f'Bearer {self.token}'

    def test_destroy_perms(self, system_factory, org_user_factory, arf, mock_auth_with_user, httpx_mock):
        for role in OrganizationRole.objects.filter(permissions__codename=OrganizationPermissions.manage_systems):
            sys = system_factory(organization=self.org)
            url = f'https://{settings.INSTANCE_CONFIG.default_host}/cdb/systems/{sys.system_id}'
            httpx_mock.add_response(url=url, status_code=200)
            user = org_user_factory(organization=self.org, role=role.id)
            request = arf.delete('/')
            mock_auth_with_user(user)
            response = self.view(request, id=sys.system_id)
            assert response.status_code == 204
            sys.refresh_from_db()
            assert sys.system_state == CloudSystemStates.DELETED

        role = OrganizationRole.objects.exclude(permissions__codename=OrganizationPermissions.manage_systems).first()
        sys = system_factory(organization=self.org)
        url = f'https://{settings.INSTANCE_CONFIG.default_host}/cdb/systems/{sys.system_id}'
        httpx_mock.add_response(url=url, status_code=200)
        user = org_user_factory(organization=self.org, role=role.id)
        request = arf.delete('/')
        mock_auth_with_user(user)
        response = self.view(request, id=sys.system_id)
        assert response.status_code == 403

    def test_destroy_cpal_success(self, channel_partner_factory, organization_factory, system_factory,
                                  cp_user_factory, arf, mock_auth_with_user, httpx_mock):
        httpx_mock.add_response(url=self.url, status_code=200)
        mock_auth_with_user(self.cp_user, token=self.token)
        response = self.view(self.request, id=self.system.system_id)
        assert self.org.channel_partner_access_level_id
        assert response.status_code == 204
        request = httpx_mock.get_request(url=self.url)
        assert request.headers.get('Authorization') == f'Bearer {self.token}'

    def test_destroy_cpal_forbidden(self, channel_partner_factory, organization_factory, system_factory,
                                   cp_user_factory, arf, mock_auth_with_user, httpx_mock):
        httpx_mock.add_response(url=self.url, status_code=200)
        self.org.channel_partner_access_level = None
        self.org.save()
        mock_auth_with_user(self.cp_user, token=self.token)
        response = self.view(self.request, id=self.system.system_id)
        assert response.status_code == 403


class TestSystemTransferOffer:

    @pytest.fixture(autouse=True)
    def setUp(self, channel_partner_factory, organization_factory, org_user_factory, arf):
        self.cp = channel_partner_factory()
        self.org = organization_factory(channel_partner=self.cp)
        self.other_org = organization_factory(channel_partner=self.cp)
        self.org_admin = org_user_factory(organization=self.org)
        self.org_viewer = org_user_factory(organization=self.org, role=OrganizationRoles.VIEWER)
        self.comment = f'{uuid4()}'
        self.sys_id = f'{uuid4()}'
        self.valid_request = arf.post('/', data={'organizationId': self.org.id, 'comment': self.comment}, format='json')
        self.invalid_request = arf.post('/', data={'organizationId': self.comment, 'comment': self.comment}, format='json')
        self.other_org_request = arf.post('/', data={'organizationId': self.other_org.id, 'comment': self.comment}, format='json')
        self.view = CloudSystemViewSet.as_view(actions={'post': 'transfer_offer'}, detail=True)
        self.offer_url = f'https://{settings.INSTANCE_CONFIG.default_host}/cdb/v0/systems/{self.sys_id}/offer'
        self.accept_url = (f'https://{settings.INSTANCE_CONFIG.default_host}/cdb/v0'
                           f'/organizations/{self.org.id}/system-offers/{self.sys_id}/accept')
        self.offer_response = {
            "fromAccount": self.org_admin.user.email,
            "organizationId": f"{self.org.id}",
            "systemId": self.sys_id,
            "systemName": "string",
            "comment": self.comment,
            "status": "offered"
        }
        self.accept_response = {
            "errorClass": "noError",
            "errorDetail": "0",
            "errorText": "",
            "resultCode": "ok"
        }

    def test_invalid_organization_id(self, mock_auth_with_user):
        mock_auth_with_user(self.org_admin)
        response = self.view(self.invalid_request, id=uuid4())
        assert response.status_code == 400

    def test_other_organization_id(self, mock_auth_with_user):
        mock_auth_with_user(self.org_admin)
        response = self.view(self.other_org_request, id=uuid4())
        assert response.status_code == 403

    def test_failed_offer_request(self, mock_auth_with_user, httpx_mock):
        offer_error = {
            "errorClass": "unauthorized",
            "errorDetail": "101",
            "errorText": "forbidden",
            "resultCode": "forbidden"
        }
        httpx_mock.add_response(url=self.offer_url, status_code=403, json=offer_error)
        httpx_mock.add_response(url=self.accept_url, status_code=400)
        mock_auth_with_user(self.org_admin)
        response = self.view(self.valid_request, id=self.sys_id)
        assert response.status_code == 403
        assert response.data == offer_error
        accept_request = httpx_mock.get_request(url=self.accept_url)
        assert accept_request is None

    def test_failed_accept_request(self, mock_auth_with_user, httpx_mock):
        accept_error = {
            "errorClass": "badRequest",
            "errorDetail": "112",
            "errorText": "Offer not in valid state",
            "resultCode": "badRequest"
        }
        httpx_mock.add_response(url=self.offer_url, status_code=200, json=self.offer_response)
        httpx_mock.add_response(url=self.accept_url, status_code=400, json=accept_error)
        token = f'{uuid4()}'
        mock_auth_with_user(self.org_admin, token=token)
        response = self.view(self.valid_request, id=self.sys_id)
        assert response.status_code == 400
        assert response.data == accept_error
        offer_request = httpx_mock.get_request(url=self.offer_url)
        assert offer_request.headers.get('Authorization') == f'Bearer {token}'
        assert json.loads(offer_request.content) == {
            'comment': self.comment,
            'organizationId': f'{self.org.id}'
        }
        accept_request = httpx_mock.get_request(url=self.accept_url)
        assert accept_request.headers.get('Authorization') == f'Bearer {token}'

    def test_success_request(self, mock_auth_with_user, httpx_mock):
        httpx_mock.add_response(url=self.offer_url, status_code=200, json=self.offer_response)
        httpx_mock.add_response(url=self.accept_url, status_code=200, json=self.accept_response)
        token = f'{uuid4()}'
        mock_auth_with_user(self.org_admin, token=token)
        response = self.view(self.valid_request, id=self.sys_id)
        assert response.status_code == 200
        assert response.data['systemId'] == self.sys_id
        assert response.data['organization'] == self.org.id

        offer_request = httpx_mock.get_request(url=self.offer_url)
        assert offer_request.headers.get('Authorization') == f'Bearer {token}'
        assert json.loads(offer_request.content) == {
            'comment': self.comment,
            'organizationId': f'{self.org.id}'
        }

        accept_request = httpx_mock.get_request(url=self.accept_url)
        assert accept_request.headers.get('Authorization') == f'Bearer {token}'

        assert CloudSystemId.objects.filter(system_id=self.sys_id, organization=self.org).exists()

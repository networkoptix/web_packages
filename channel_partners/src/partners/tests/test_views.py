import json
import random
from uuid import uuid4

from dateutil.relativedelta import relativedelta
from django.core.cache import caches
from django.db import transaction

import pytest
from django.utils import timezone
from model_bakery import baker
from mock.mock import MagicMock


from partners.models import CloudSystemId, OrganizationRole, OrganizationToUser, ChannelPartnerToUser, \
    ChannelPartnerServiceRecord, ChannelPartnerRole, ChannelPartnerStates
from partners.views import CloudSystemViewSet, OrganizationUserViewSet, ChannelPartnerUserViewSet, \
    ChannelPartnerViewSet, ChannelPartnerNestedViewSet, OrganizationViewSet


class TestCloudSystemViewSet:
    @pytest.fixture(autouse=True)
    def setup(self, default_cp_admin, default_org_admin, db):
        self.batch_url = 'https://cloud-test.hdw.mx/cdb/systems/users/batch'

    def test_create_200(self, default_cp_admin, default_org_admin, mock_auth_with_user, arf, httpx_mock):
        sys_id = f'{uuid4()}'
        system_url = f'https://cloud-test.hdw.mx/cdb/systems/{sys_id}'
        httpx_mock.add_response(url=system_url, json={"accessRole": "owner"})
        httpx_mock.add_response(url=self.batch_url, json={'batchId': f'{uuid4()}'})
        data = {
          "cloudSystemId": sys_id,
          "organization": str(default_org_admin.organization.id)
        }
        # Channel partner admin
        mock_auth_with_user(default_cp_admin)
        request = arf.post('/', data=data, format='json')
        view = CloudSystemViewSet.as_view({'post': 'bind_existing'})
        response = view(request)
        assert CloudSystemId.objects.filter(system_id=sys_id).exists()
        assert response.status_code == 200
        assert response.data['systemId']
        batch_request = httpx_mock.get_request(url=self.batch_url)
        batch_data = json.loads(batch_request.content)
        assert batch_data["items"][0]["systems"] == [sys_id]
        assert batch_data["items"][0]["users"] == [default_org_admin.user.email]
        httpx_mock.reset(False)
        # Org admin
        httpx_mock.add_response(url=system_url, json={"accessRole": "owner"})
        httpx_mock.add_response(url=self.batch_url, json={'batchId': f'{uuid4()}'})

        mock_auth_with_user(default_org_admin)
        request = arf.post('/', data=data, format='json')
        view = CloudSystemViewSet.as_view({'post': 'bind_existing'})
        response = view(request)
        assert response.status_code == 200
        assert response.data['systemId'] == sys_id
        batch_request = httpx_mock.get_request(url=self.batch_url)
        batch_data = json.loads(batch_request.content)
        assert batch_data["items"][0]["systems"] == [sys_id]
        assert batch_data["items"][0]["users"] == [default_org_admin.user.email]
        assert batch_request

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
            response = view(req, system_id=str(system.system_id))

        assert response.status_code == 403

        mock_auth_with_user(root_user)
        req.user = root_user.user
        with transaction.atomic():
            response = view(req, system_id=str(system.system_id))
        assert response.status_code == 200

        root.allow_changing_services = True
        root.save()
        req.user = root_user.user
        with transaction.atomic():
            response = view(req, system_id=str(system.system_id))
        assert response.status_code == 200

    def test_service_quantity_patch(selfself, channel_partner_factory, organization_factory, cp_user_factory,
                                    service_record_factory, cp_service_factory, system_factory,
                                    mock_auth_with_user, arf, mocker):
        assert ChannelPartnerRole.objects.all().count() > 0
        cp = channel_partner_factory(acs=True)
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
            response = view(request, system_id=str(system.system_id))
        assert response.status_code == 200
        assert response.data['services'][str(services[0].id)]['quantity'] == 15
        assert response.data['services'][str(services[1].id)]['quantity'] == 10

        # test failure request because of busy lock
        mocker.patch('django.core.cache.backends.redis.RedisCache.add', return_value=False)
        caches['default'].set(CloudSystemViewSet.get_service_quantity_lock(system), 1)
        request = arf.patch('/', data={"services": {str(services[1].id): {"quantity": 15}}}, format='json')
        with transaction.atomic():
            response = view(request, system_id=str(system.system_id))
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
            response = view(request, system_id=str(system.system_id))
        except Exception as ex:
            raised_error = ex.__class__
        cache_get_mock.assert_called()
        assert raised_error == RecursionError

        # test successful request and second service value
        mocker.patch('django.core.cache.backends.redis.RedisCache.add', return_value=True)
        request = arf.patch('/', data={"services": {str(services[0].id): {"quantity": 15}}}, format='json')
        with transaction.atomic():
            response = view(request, system_id=str(system.system_id))
        assert response.status_code == 200
        assert response.data['services'][str(services[0].id)]['quantity'] == 15
        assert response.data['services'][str(services[1].id)]['quantity'] == 10

        # test disabled acs
        cp.allow_changing_services = False
        cp.save()
        mocker.patch('django.core.cache.backends.redis.RedisCache.add', return_value=True)
        request = arf.patch('/', data={"services": {str(services[0].id): {"quantity": 15}}}, format='json')
        with transaction.atomic():
            response = view(request, system_id=str(system.system_id))
        assert response.status_code == 403

    def test_service_quantity_patch_shutdown(selfself, channel_partner_factory, organization_factory, cp_user_factory,
                                    service_record_factory, cp_service_factory, system_factory,
                                    mock_auth_with_user, arf, mocker):
        assert ChannelPartnerRole.objects.all().count() > 0
        cp = channel_partner_factory(acs=True)
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

        response = view(request, system_id=str(system.system_id))
        assert response.status_code == 400
        assert "Services quantity cannot be changed." in response.data['services'][0]


class TestOrganizationUserViewSet:

    @pytest.fixture(autouse=True)
    def setup(self, db):
        self.batch_url = 'https://cloud-test.hdw.mx/cdb/systems/users/batch'

    def test_create_200(self, organization_factory, org_user_factory, system_factory,
                    mock_auth_with_user, arf, httpx_mock, mocker):
        gen_count = 10
        org = organization_factory()
        admin_user = org_user_factory(organization=org)
        systems = [system_factory(organization=org) for _ in range(gen_count)]
        role = OrganizationRole.objects.get(name="Power User")
        new_user_data = {
            "email": f"{uuid4()}",
            "role": role.name
        }
        request = arf.post('/', data=new_user_data, format='json')
        httpx_mock.add_response(url=self.batch_url, json={'batchId': f'{uuid4()}'})
        mock_auth_with_user(admin_user)
        view = OrganizationUserViewSet.as_view({'post': 'create'})
        response = view(request, parent_lookup_organization=org.id)
        batch_request = httpx_mock.get_request(url=self.batch_url)
        batch_data = json.loads(batch_request.content)
        assert response.status_code == 200
        assert OrganizationToUser.objects\
            .filter(user__email=new_user_data["email"], organization=org, roles=[role.name]).exists()
        assert response.data["email"] == new_user_data["email"]
        assert batch_data["items"].__len__() == 1
        assert batch_data["items"][0]["users"] == [new_user_data["email"]]
        assert batch_data["items"][0]["accessRole"] == role.system_role
        assert set(batch_data["items"][0]["systems"]) == {str(s.system_id) for s in systems}

    def test_update_200(self, organization_factory, org_user_factory, system_factory,
                    mock_auth_with_user, arf, httpx_mock, mocker):
        gen_count = 10
        org = organization_factory()
        admin_user = org_user_factory(organization=org)
        systems = [system_factory(organization=org) for _ in range(gen_count)]
        role = OrganizationRole.objects.get(name="Power User")
        user_data = {
            "email": f"{uuid4()}",
            "role": role.name
        }
        user = org_user_factory(email=user_data['email'], organization=org)
        request = arf.post('/', data=user_data, format='json')
        httpx_mock.add_response(url=self.batch_url, json={'batchId': f'{uuid4()}'})
        mock_auth_with_user(admin_user)
        view = OrganizationUserViewSet.as_view({'post': 'create'})
        response = view(request, parent_lookup_organization=org.id)
        batch_request = httpx_mock.get_request(url=self.batch_url)
        batch_data = json.loads(batch_request.content)
        assert OrganizationToUser.objects\
            .filter(user__email=user_data["email"], organization=org).count() == 1
        assert response.status_code == 200
        assert response.data["email"] == user_data["email"]
        assert batch_data["items"].__len__() == 1
        assert batch_data["items"][0]["users"] == [user_data["email"]]
        assert batch_data["items"][0]["accessRole"] == role.system_role
        assert set(batch_data["items"][0]["systems"]) == {str(s.system_id) for s in systems}

        httpx_mock.reset(assert_all_responses_were_requested=False)
        httpx_mock.add_response(url=self.batch_url, json={'batchId': f'{uuid4()}'})
        user_data["title"] = f"{uuid4()}"
        request = arf.post('/', data=user_data, format='json')
        response = view(request, parent_lookup_organization=org.id)
        batch_request = httpx_mock.get_request(url=self.batch_url)
        assert OrganizationToUser.objects\
            .filter(user__email=user_data["email"], organization=org).count() == 1
        assert response.status_code == 200
        assert response.data["title"] == user_data["title"]
        assert batch_request is None

    def test_destroy_204(self, organization_factory, org_user_factory, system_factory,
                         mock_auth_with_user, arf, httpx_mock, mocker):
        gen_count = 10
        org = organization_factory()
        admin_user = org_user_factory(organization=org)
        systems = [system_factory(organization=org) for _ in range(gen_count)]
        role = OrganizationRole.objects.get(name="Power User")
        user = org_user_factory(organization=org, role=role.name)
        request = arf.delete('/')
        httpx_mock.add_response(url=self.batch_url, json={'batchId': f'{uuid4()}'})
        mock_auth_with_user(admin_user)
        view = OrganizationUserViewSet.as_view({'delete': 'destroy'})
        response = view(request, parent_lookup_organization=org.id, email=user.user.email)
        batch_request = httpx_mock.get_request(url=self.batch_url)
        batch_data = json.loads(batch_request.content)
        assert not OrganizationToUser.objects.filter(user__email=user.user.email).exists()
        assert response.status_code == 204
        assert batch_data["items"].__len__() == 1
        assert batch_data["items"][0]["users"] == [user.user.email]
        assert batch_data["items"][0]["accessRole"] == 'none'
        assert set(batch_data["items"][0]["systems"]) == {str(s.system_id) for s in systems}

    def test_destroy_last_admin(self, organization_factory, org_user_factory, system_factory,
                                mock_auth_with_user, arf, httpx_mock, default_cp_admin):
        gen_count = 10
        org = organization_factory()
        systems = [system_factory(organization=org) for _ in range(gen_count)]
        role = OrganizationRole.objects.get(name="Organization Administrator")
        user = org_user_factory(organization=org)
        user_2 = org_user_factory(organization=org)
        request = arf.delete('/')
        httpx_mock.add_response(url=self.batch_url, json={'batchId': f'{uuid4()}'})
        mock_auth_with_user(default_cp_admin)
        view = OrganizationUserViewSet.as_view({'delete': 'destroy'})
        with transaction.atomic():
            response = view(request, parent_lookup_organization=org.id, email=user.user.email)
        batch_request = httpx_mock.get_request(url=self.batch_url)
        assert response.status_code == 204
        assert not OrganizationToUser.objects.filter(user__email=user.user.email).exists()

        with transaction.atomic():
            response = view(request, parent_lookup_organization=org.id, email=user_2.user.email)
        assert OrganizationToUser.objects.filter(user__email=user_2.user.email).exists()
        assert response.status_code == 409
        assert response.data['detail']
        assert "is the only Administrator and may not be demoted or removed" in response.data['detail']



class TestChannelPartnerUserViewSet:

    def test_destroy_last_admin(self, channel_partner_factory, cp_user_factory, default_channel_partner,
                                mock_auth_with_user, arf, httpx_mock, default_cp_admin):
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
        # must contain 'default_host_subs + root_cp'
        assert set([cp['id'] for cp in response.data['results']]) == set([str(cp.id) for cp in [root_cp] + default_host_subs])

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
        assert response.data['parentChannelPartner'] == root_cp.id

    def test_aggregate(self, default_channel_partner, channel_partner_factory, organization_factory,
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
        organizations = [organization_factory(channel_partner=target_partners[int(i/gen_count)])
                         for i in range(len(target_partners) * gen_count)]
        systems = [system_factory(organization=organizations[int(i/gen_count)])
                   for i in range(len(organizations) * gen_count)]
        services = [baker.make(ChannelPartnerServiceRecord, cloud_system=systems[i], quantity=gen_count)
                    for i in range(len(organizations))]

        view = ChannelPartnerViewSet.as_view(actions={'get': 'aggregate'}, detail=True)
        mock_auth_with_user(default_cp_admin)
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
                    assert data['ownPermissions'] == sorted([p.codename for p in role.permissions.all()])
                    assert data['ownRoles'] == user.roles
                else:
                    assert data['ownPermissions'] == []
                    assert data['ownRoles'] == []


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
                    assert data['ownPermissions'] == sorted([p.codename for p in role.permissions.all()])
                    assert data['ownRoles'] == user.roles
                else:
                    assert data['ownPermissions'] == []
                    assert data['ownRoles'] == []

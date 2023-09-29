import json
import random
from uuid import uuid4

import pytest
from model_bakery import baker

from partners.models import CloudSystemId, OrganizationRole, OrganizationToUser, ChannelPartnerToUser, \
    ChannelPartnerServiceRecord
from partners.views import CloudSystemViewSet, OrganizationUserViewSet, ChannelPartnerUserViewSet, \
    ChannelPartnerViewSet, OrganizationViewSet


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
        view = CloudSystemViewSet.as_view({'post': 'create'})
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
        view = CloudSystemViewSet.as_view({'post': 'create'})
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
        response = view(request)
        assert response.status_code == 403
        assert response.data['detail']
        # Org admin
        mock_auth_with_user(default_org_user)
        request = arf.post('/', data=data, format='json')
        view = CloudSystemViewSet.as_view({'post': 'create'})
        response = view(request)
        assert response.status_code == 403
        assert response.data['detail']

    def test_destroy_200(self, mock_auth_with_user, organization_factory, org_user_factory,
                         httpx_mock, arf, cloud_test_host, system_factory):
        sys_id = f'{uuid4()}'
        view = CloudSystemViewSet.as_view({'delete': 'destroy'})
        org = organization_factory()
        system = system_factory(organization=org, system_id=sys_id)
        users = [org_user_factory(organization=org) for _ in range(5)]
        user = users[0]
        mock_auth_with_user(user)
        httpx_mock.add_response(url=self.batch_url, json={'batchId': f'{uuid4()}'})
        request = arf.delete(f'/partners/cloud_systems/{sys_id}/')
        response = view(request, system_id=sys_id)
        assert response.status_code == 204
        batch_request = httpx_mock.get_request(url=self.batch_url)
        batch_data = json.loads(batch_request.content)
        assert not CloudSystemId.objects.filter(system_id=sys_id).exists()
        assert batch_data
        assert batch_data['items'].__len__() == 1
        assert batch_data['items'][0]['systems'] == [sys_id]
        assert batch_data['items'][0]['accessRole'] == 'none'
        assert batch_data['items'][0]['users'].__len__() == len(users) - 1
        for user in users[1:]:
            assert user.user.email in batch_data['items'][0]['users']

    def test_destroy_404(self, default_org_admin, mock_auth_with_user, arf, httpx_mock, mocker,
                         default_organization, cloud_test_host, default_cp_user, system_factory):
        sys_id = f'{uuid4()}'
        view = CloudSystemViewSet.as_view({'delete': 'destroy'})
        mock_auth_with_user(default_org_admin)
        mocked_batch_request_data = mocker.patch('partners.models.CloudSystemId.remove_system_users_data')
        httpx_mock.add_response(url=self.batch_url, json={'batchId': f'{uuid4()}'})
        request = arf.delete(f'/partners/cloud_systems/{sys_id}/')
        response = view(request, system_id=sys_id)
        batch_request = httpx_mock.get_request(url=self.batch_url)
        assert response.status_code == 404
        mocked_batch_request_data.assert_not_called()
        assert batch_request is None
        system = baker.make(CloudSystemId, system_id=sys_id,
                            organization=default_organization,
                            cloud_host=cloud_test_host)

        # check with channel partner user without permissions
        mock_auth_with_user(default_cp_user)
        response = view(request, system_id=sys_id)
        batch_request = httpx_mock.get_request(url=self.batch_url)
        assert response.status_code == 404
        mocked_batch_request_data.assert_not_called()
        assert batch_request is None


    def test_destroy_403(self, default_org_user, mock_auth_with_user, default_cp_user,
                         arf, httpx_mock, mocker, cloud_test_host, default_organization):
        sys_id = f'{uuid4()}'
        system = baker.make(CloudSystemId, system_id=sys_id,
                            organization=default_organization,
                            cloud_host=cloud_test_host)
        view = CloudSystemViewSet.as_view({'delete': 'destroy'})
        mock_auth_with_user(default_org_user)
        mocked_batch_request_data = mocker.patch('partners.models.CloudSystemId.remove_system_users_data')
        httpx_mock.add_response(url=self.batch_url, json={'batchId': f'{uuid4()}'})
        request = arf.delete(f'/partners/cloud_systems/{sys_id}/')
        response = view(request, system_id=sys_id)
        batch_request = httpx_mock.get_request(url=self.batch_url)
        assert response.status_code == 403
        mocked_batch_request_data.assert_not_called()


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
        response = view(request, parent_lookup_organization=org.id, email=user.user.email)
        batch_request = httpx_mock.get_request(url=self.batch_url)
        assert response.status_code == 204
        assert not OrganizationToUser.objects.filter(user__email=user.user.email).exists()

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
        response = view(request, parent_lookup_channel_partner=cp.id, email=user.user.email)
        assert response.status_code == 403

        mock_auth_with_user(user)
        response = view(request, parent_lookup_channel_partner=cp.id, email=user_2.user.email)
        assert not ChannelPartnerToUser.objects.filter(user__email=user_2.user.email).exists()
        assert response.status_code == 204


        response = view(request, parent_lookup_channel_partner=cp.id, email=user.user.email)
        assert ChannelPartnerToUser.objects.filter(user__email=user.user.email).exists()
        assert response.status_code == 409
        assert response.data['detail']
        assert "is the only Administrator and may not be demoted or removed" in response.data['detail']


class TestChannelPartnerViewSet:

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
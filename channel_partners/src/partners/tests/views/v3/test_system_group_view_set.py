from uuid import uuid4

import pytest
from django.db import transaction

from conftest import auto_execute_on_commit_callbacks
from partners.models import (
    OrganizationRoles,
    SystemGroup,
)
from partners.views.v2.views import SystemGroupViewSet


class TestSystemGroupViewSet:
    @pytest.fixture(autouse=True)
    def setup_method(self, channel_partner_factory, cp_user_factory, organization_factory, org_user_factory,
                     system_group_factory, sys_group_user_factory, system_factory, v3arf, mock_auth_with_user):
        with auto_execute_on_commit_callbacks():
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
            self.sub_group = system_group_factory(organization=self.org_1, parent=self.group)
            self.group2 = system_group_factory(organization=self.org_2)
            self.other_group = system_group_factory(organization=self.other_org)
            for _ in range(3):
                system_group_factory(organization=self.org_1, parent=self.group)
                system_group_factory(organization=self.org_2, parent=self.group2)
                system_group_factory(organization=self.other_org, parent=self.other_group)

    def test_retrieve(self, v3arf, mock_auth_with_user):
        view = SystemGroupViewSet.as_view(actions={'get': 'retrieve'}, detail=True)
        request = v3arf.get('/')
        mock_auth_with_user(self.org_user)
        with auto_execute_on_commit_callbacks():
            response = view(request, pk=self.group.id)
        assert response.status_code == 200
        assert response.data['id'] == str(self.group.id)

        sub_group = SystemGroup.objects.filter(parent=self.group).first()
        with auto_execute_on_commit_callbacks():
            response = view(request, pk=sub_group.id)
        assert response.status_code == 200
        assert response.data['id'] == str(sub_group.id)

        mock_auth_with_user(self.cp_user)
        with auto_execute_on_commit_callbacks():
            response = view(request, pk=self.group.id)
        assert response.status_code == 200
        assert response.data['id'] == str(self.group.id)

        sub_group = SystemGroup.objects.filter(parent=self.group).first()
        with auto_execute_on_commit_callbacks():
            response = view(request, pk=sub_group.id)
        assert response.status_code == 200
        assert response.data['id'] == str(sub_group.id)

        mock_auth_with_user(self.other_cp_user)
        with auto_execute_on_commit_callbacks():
            response = view(request, pk=self.group.id)
        assert response.status_code == 403

    def test_destroy_403_permission(self, mock_auth_with_user, v3arf):
        view = SystemGroupViewSet.as_view(actions={'delete': 'destroy'}, detail=True)
        with auto_execute_on_commit_callbacks():
            request = v3arf.delete('/')
            mock_auth_with_user(self.other_cp_user)
            response = view(request, pk=self.group.id)
        assert response.status_code == 403

    def test_destroy_ok(self, mock_auth_with_user, v3arf):
        with auto_execute_on_commit_callbacks():
            view = SystemGroupViewSet.as_view(actions={'delete': 'destroy'}, detail=True)
            request = v3arf.delete('/')
            mock_auth_with_user(self.org_user)
            group_id = self.group.id
            response = view(request, pk=self.group.id)
        assert response.status_code == 204
        assert SystemGroup.objects.filter(pk=group_id).exists() is False
        self.sub_group.refresh_from_db()
        assert self.sub_group.parent is None
        assert self.sub_group.path[0] == self.org_1.id


class TestSystemGroupViewSetRetrieve:
    @pytest.fixture(autouse=True)
    def setup_method(self, channel_partner_factory, cp_user_factory, organization_factory, org_user_factory,
                     system_group_factory, sys_group_user_factory, system_factory, v3arf):
        with auto_execute_on_commit_callbacks():
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
            self.sub_group = system_group_factory(organization=self.org_1, parent=self.group)
            self.group2 = system_group_factory(organization=self.org_2)
            self.other_group = system_group_factory(organization=self.other_org)
            for _ in range(3):
                system_factory(organization=self.org_1, system_group=self.group)
                system_group_factory(organization=self.org_1, parent=self.group)
                system_group_factory(organization=self.org_2, parent=self.group2)
                system_group_factory(organization=self.other_org, parent=self.other_group)
            self.view = SystemGroupViewSet.as_view(actions={'get': 'retrieve'}, detail=True)
            self.request = v3arf.get('/')

    def test_2xx_group_user(self, mock_auth_with_user):
        with auto_execute_on_commit_callbacks():
            mock_auth_with_user(self.group_user)
            response = self.view(self.request, pk=self.group.id)
        assert response.status_code == 200
        assert len(response.data['cloudSystems']) == 3
        assert response.data['cloudSystems'][0]['id']
        assert response.data['cloudSystems'][0]['name']
        with auto_execute_on_commit_callbacks():
            response = self.view(self.request, pk=self.sub_group.id)
        assert response.status_code == 200

    def test_2xx_org_user(self, mock_auth_with_user):
        with auto_execute_on_commit_callbacks():
            mock_auth_with_user(self.org_user)
            response = self.view(self.request, pk=self.group.id)
        assert response.status_code == 200
        with auto_execute_on_commit_callbacks():
            response = self.view(self.request, pk=self.sub_group.id)
        assert response.status_code == 200

    def test_2xx_cp_user(self, mock_auth_with_user):
        with auto_execute_on_commit_callbacks():
            mock_auth_with_user(self.cp_user)
            response = self.view(self.request, pk=self.group.id)
        assert response.status_code == 200
        with auto_execute_on_commit_callbacks():
            response = self.view(self.request, pk=self.sub_group.id)
        assert response.status_code == 200

    def test_403_cp_user(self, mock_auth_with_user):
        with auto_execute_on_commit_callbacks():
            mock_auth_with_user(self.cp_user)
            response = self.view(self.request, pk=self.other_group.id)
        assert response.status_code == 403

    def test_403_org_user(self, mock_auth_with_user):
        mock_auth_with_user(self.org_user)
        with transaction.atomic():
            with auto_execute_on_commit_callbacks():
                response = self.view(self.request, pk=self.other_group.id)
        assert response.status_code == 403
        with transaction.atomic():
            with auto_execute_on_commit_callbacks():
                response = self.view(self.request, pk=self.group2.id)
        assert response.status_code == 403

    def test_403_group_user(self, mock_auth_with_user):
        mock_auth_with_user(self.cp_user)
        with transaction.atomic():
            with auto_execute_on_commit_callbacks():
                response = self.view(self.request, pk=self.other_group.id)
        assert response.status_code == 403


class TestSystemGroupViewSetRetrieve2:
    @pytest.fixture(autouse=True)
    def setup_method(self, channel_partner_factory, cp_user_factory, organization_factory, org_user_factory,
                     system_group_factory, sys_group_user_factory, system_factory, v3arf):
        with auto_execute_on_commit_callbacks():
            self.root = channel_partner_factory()
            self.root_user = cp_user_factory(channel_partner=self.root)
            self.cp = channel_partner_factory(parent_channel_partner=self.root)
            self.other_cp = channel_partner_factory(parent_channel_partner=self.root)
            self.cp_user = cp_user_factory(channel_partner=self.cp)
            self.other_cp_user = cp_user_factory(channel_partner=self.other_cp)
            self.org_1 = organization_factory(channel_partner=self.cp)
            self.org_admin = org_user_factory(organization=self.org_1)
            self.org_power_user = org_user_factory(organization=self.org_1, role=OrganizationRoles.POWER_USER)
            self.org_2 = organization_factory(channel_partner=self.cp)
            self.other_org = organization_factory(channel_partner=self.other_cp)
            self.group = system_group_factory(organization=self.org_1)
            self.group_user = sys_group_user_factory(organization=self.org_1, group=self.group)
            self.sub_group = system_group_factory(organization=self.org_1, parent=self.group)
            self.group2 = system_group_factory(organization=self.org_2)
            self.other_group = system_group_factory(organization=self.other_org)
            for _ in range(3):
                system_factory(organization=self.org_1, system_group=self.group)
                system_group_factory(organization=self.org_1, parent=self.group)
                system_group_factory(organization=self.org_2, parent=self.group2)
                system_group_factory(organization=self.other_org, parent=self.other_group)
            self.view = SystemGroupViewSet.as_view(actions={'delete': 'destroy'}, detail=True)
            self.request = v3arf.delete('/')

    def test_403_group_user(self, mock_auth_with_user):
        mock_auth_with_user(self.group_user)
        with transaction.atomic():
            with auto_execute_on_commit_callbacks():
                response = self.view(self.request, pk=self.sub_group.id)
        assert response.status_code == 403
        with transaction.atomic():
            with auto_execute_on_commit_callbacks():
                response = self.view(self.request, pk=self.group.id)
        assert response.status_code == 403

    def test_2xx_org_admin(self, mock_auth_with_user):
        mock_auth_with_user(self.org_admin)
        with auto_execute_on_commit_callbacks():
            response = self.view(self.request, pk=self.group.id)
        assert response.status_code == 204
        with auto_execute_on_commit_callbacks():
            response = self.view(self.request, pk=self.sub_group.id)
        assert response.status_code == 204

    def test_2xx_cp_user_cpal_org_admin(self, mock_auth_with_user):
        mock_auth_with_user(self.cp_user)
        with auto_execute_on_commit_callbacks():
            response = self.view(self.request, pk=self.sub_group.id)
        assert response.status_code == 204
        with auto_execute_on_commit_callbacks():
            response = self.view(self.request, pk=self.group.id)
        assert response.status_code == 204

    def test_403_cp_user_cpal_health_viewer(self, mock_auth_with_user):
        with auto_execute_on_commit_callbacks():
            self.org_1.channel_partner_access_level_id = OrganizationRoles.SYSTEM_HEALTH_VIEWER
            self.org_1.save()
        mock_auth_with_user(self.cp_user)
        with transaction.atomic():
            with auto_execute_on_commit_callbacks():
                response = self.view(self.request, pk=self.sub_group.id)
        assert response.status_code == 403

        with transaction.atomic():
            with auto_execute_on_commit_callbacks():
                response = self.view(self.request, pk=self.group.id)
        assert response.status_code == 403

    def test_403_cp_user_no_cpal(self, mock_auth_with_user):
        with auto_execute_on_commit_callbacks():
            self.org_1.channel_partner_access_level_id = None
            self.org_1.save()
        mock_auth_with_user(self.cp_user)
        with transaction.atomic():
            with auto_execute_on_commit_callbacks():
                response = self.view(self.request, pk=self.sub_group.id)
        assert response.status_code == 403
        with transaction.atomic():
            with auto_execute_on_commit_callbacks():
                response = self.view(self.request, pk=self.group.id)
        assert response.status_code == 403

    def test_403_cp_user(self, mock_auth_with_user):
        mock_auth_with_user(self.cp_user)
        with auto_execute_on_commit_callbacks():
            response = self.view(self.request, pk=self.other_group.id)
        assert response.status_code == 403

    def test_403_org_power_user(self, mock_auth_with_user):
        mock_auth_with_user(self.org_power_user)
        with transaction.atomic():
            with auto_execute_on_commit_callbacks():
                response = self.view(self.request, pk=self.other_group.id)
        assert response.status_code == 403
        with transaction.atomic():
            with auto_execute_on_commit_callbacks():
                response = self.view(self.request, pk=self.group2.id)
        assert response.status_code == 403


class TestSystemGroupViewSetCreate:
    @pytest.fixture(autouse=True)
    def setup_method(self, channel_partner_factory, cp_user_factory, organization_factory, org_user_factory,
                     system_group_factory, sys_group_user_factory, system_factory, v3arf):
        with auto_execute_on_commit_callbacks():
            self.root = channel_partner_factory()
            self.root_user = cp_user_factory(channel_partner=self.root)
            self.cp = channel_partner_factory(parent_channel_partner=self.root)
            self.other_cp = channel_partner_factory(parent_channel_partner=self.root)
            self.cp_user = cp_user_factory(channel_partner=self.cp)
            self.other_cp_user = cp_user_factory(channel_partner=self.other_cp)
            self.org_1 = organization_factory(channel_partner=self.cp)
            self.org_admin = org_user_factory(organization=self.org_1)
            self.org_power_user = org_user_factory(organization=self.org_1, role=OrganizationRoles.POWER_USER)
            self.org_2 = organization_factory(channel_partner=self.cp)
            self.other_org = organization_factory(channel_partner=self.other_cp)
            self.group = system_group_factory(organization=self.org_1)
            self.group_user = sys_group_user_factory(organization=self.org_1, group=self.group)
            self.sub_group = system_group_factory(organization=self.org_1, parent=self.group)
            self.create_view = SystemGroupViewSet.as_view(actions={'post': 'create'}, detail=True)
            self.partial_update_view = SystemGroupViewSet.as_view(actions={'patch': 'partial_update'}, detail=True)
            self.update_view = SystemGroupViewSet.as_view(actions={'patch': 'update'}, detail=True)

    def test_403_group_user(self, mock_auth_with_user, v3arf):
        data = {
            'organizationId': self.org_1.id,
            'parentId': None,
            'name': f'{uuid4()}'
        }
        mock_auth_with_user(self.group_user)
        request = v3arf.post('/', data=data, format='json')
        with transaction.atomic():
            with auto_execute_on_commit_callbacks():
                response = self.create_view(request)
        assert response.status_code == 403

        data['parentId'] = self.group.id
        request = v3arf.post('/', data=data, format='json')
        with transaction.atomic():
            with auto_execute_on_commit_callbacks():
                response = self.create_view(request)
        assert response.status_code == 403

    def test_2xx_org_admin(self, mock_auth_with_user, v3arf):
        mock_auth_with_user(self.org_admin)
        data = {
            'organizationId': self.org_1.id,
            'parentId': None,
            'name': f'{uuid4()}'
        }
        request = v3arf.post('/', data=data, format='json')
        with transaction.atomic():
            with auto_execute_on_commit_callbacks():
                response = self.create_view(request)
        assert response.status_code == 200

        data['parentId'] = self.group.id
        request = v3arf.post('/', data=data, format='json')
        with transaction.atomic():
            with auto_execute_on_commit_callbacks():
                response = self.create_view(request)
        assert response.status_code == 200

    def test_2xx_cp_user_cpal_org_admin(self, mock_auth_with_user, v3arf):
        mock_auth_with_user(self.cp_user)
        data = {
            'organizationId': self.org_1.id,
            'parentId': None,
            'name': f'{uuid4()}'
        }
        request = v3arf.post('/', data=data, format='json')
        with transaction.atomic():
            with auto_execute_on_commit_callbacks():
                response = self.create_view(request)
        assert response.status_code == 200

        data['parentId'] = self.group.id
        request = v3arf.post('/', data=data, format='json')
        with transaction.atomic():
            with auto_execute_on_commit_callbacks():
                response = self.create_view(request)
        assert response.status_code == 200

    def test_403_cp_user_cpal_health_viewer(self, mock_auth_with_user, v3arf):
        with auto_execute_on_commit_callbacks():
            self.org_1.channel_partner_access_level_id = OrganizationRoles.SYSTEM_HEALTH_VIEWER
            self.org_1.save()
        mock_auth_with_user(self.cp_user)
        data = {
            'organizationId': self.org_1.id,
            'parentId': None,
            'name': f'{uuid4()}'
        }
        request = v3arf.post('/', data=data, format='json')
        with transaction.atomic():
            with auto_execute_on_commit_callbacks():
                response = self.create_view(request)
        assert response.status_code == 403

        data['parentId'] = self.group.id
        request = v3arf.post('/', data=data, format='json')
        with transaction.atomic():
            with auto_execute_on_commit_callbacks():
                response = self.create_view(request)
        assert response.status_code == 403

    def test_403_cp_user_no_cpal(self, mock_auth_with_user, v3arf):
        with auto_execute_on_commit_callbacks():
            self.org_1.channel_partner_access_level_id = None
            self.org_1.save()
        mock_auth_with_user(self.cp_user)
        data = {
            'organizationId': self.org_1.id,
            'parentId': None,
            'name': f'{uuid4()}'
        }
        request = v3arf.post('/', data=data, format='json')
        with transaction.atomic():
            with auto_execute_on_commit_callbacks():
                response = self.create_view(request)
        assert response.status_code == 403

        data['parentId'] = self.group.id
        request = v3arf.post('/', data=data, format='json')
        with transaction.atomic():
            with auto_execute_on_commit_callbacks():
                response = self.create_view(request)
        assert response.status_code == 403

    def test_403_org_power_user(self, mock_auth_with_user, v3arf):
        mock_auth_with_user(self.org_power_user)
        data = {
            'organizationId': self.org_1.id,
            'parentId': None,
            'name': f'{uuid4()}'
        }
        request = v3arf.post('/', data=data, format='json')
        with transaction.atomic():
            with auto_execute_on_commit_callbacks():
                response = self.create_view(request)
        assert response.status_code == 403

        data['parentId'] = self.group.id
        request = v3arf.post('/', data=data, format='json')
        with transaction.atomic():
            with auto_execute_on_commit_callbacks():
                response = self.create_view(request)
        assert response.status_code == 403

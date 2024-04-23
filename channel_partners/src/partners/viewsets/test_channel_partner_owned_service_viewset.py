from uuid import uuid4

import pytest
from django.db import transaction
from rest_framework.reverse import reverse
from rest_framework.test import APIClient

from partners.models import ChannelPartnerService
from tools.helpers import cast_uuid


class TestChannelPartnerOwnedServiceViewset:
    @pytest.fixture(autouse=True)
    def setup_method(self, channel_partner_factory, organization_factory, cp_service_factory,
                     cp_user_factory, org_user_factory, django_capture_on_commit_callbacks,
                     cloud_test_host):
        self.parent_partner = channel_partner_factory()
        for typ, _ in ChannelPartnerService.SERVICE_TYPES:
            cp_service_factory(channel_partner=self.parent_partner,
                               service_type=typ)
        self.demo_recording = cp_service_factory(channel_partner=self.parent_partner,
                                                 service_type=ChannelPartnerService.LOCAL_RECORDING,
                                                 sub_type=ChannelPartnerService.DEMO,
                                                 duration=10)
        with django_capture_on_commit_callbacks(execute=True):
            self.channel_partner = channel_partner_factory(parent_channel_partner=self.parent_partner)
            self.sub_partner = channel_partner_factory(parent_channel_partner=self.channel_partner)
        self.parent_organization = organization_factory(channel_partner=self.parent_partner)
        self.organization = organization_factory(channel_partner=self.channel_partner)
        self.sub_organization = organization_factory(channel_partner=self.sub_partner)
        self.parent_partner_admin = cp_user_factory(channel_partner=self.parent_partner)
        self.channel_partner_admin = cp_user_factory(channel_partner=self.channel_partner)
        self.sub_partner_admin = cp_user_factory(channel_partner=self.sub_partner)
        self.parent_organization_admin = org_user_factory(organization=self.parent_organization)
        self.organization_admin = org_user_factory(organization=self.organization)
        self.sub_organization_admin = org_user_factory(organization=self.sub_organization)
        self.list_view_name = 'channelpartners-owned-service-list'
        self.detail_view_name = 'channelpartners-owned-service-detail'
        self.client = APIClient(SERVER_NAME=cloud_test_host.hostname)


    def test_initial_data(self):
        for partner in [self.parent_partner, self.channel_partner, self.sub_partner]:
            assert partner.services.count() == 4

    def get_path(self, partner_id, service_id=None):
        if service_id:
            kwargs = {
                'parent_lookup_created_by_channel_partner': self.channel_partner.id,
                'pk': service_id
            }
            return reverse(self.detail_view_name, kwargs=kwargs)
        kwargs = {
            'parent_lookup_created_by_channel_partner': self.channel_partner.id,
        }
        return reverse(self.list_view_name, kwargs=kwargs)

    def test_list_data(self, mock_auth_with_user):
        auth_header = f'Bearer {uuid4()}'
        self.client.credentials(HTTP_AUTHORIZATION=auth_header)
        path = self.get_path(partner_id=self.channel_partner.id)
        mock_auth_with_user(self.channel_partner_admin)
        response = self.client.get(path)
        assert response.status_code == 200
        for service in response.data:
            assert cast_uuid(service['id']) in self.channel_partner.services.all().values_list('id', flat=True)
        assert len(response.data) == 4

    def test_detail_data(self, mock_auth_with_user):
        auth_header = f'Bearer {uuid4()}'
        self.client.credentials(HTTP_AUTHORIZATION=auth_header)
        mock_auth_with_user(self.channel_partner_admin)

        parent_analytics = self.parent_partner.services.filter(type=ChannelPartnerService.ANALYTICS).first()
        analytics = self.channel_partner.services.filter(type=ChannelPartnerService.ANALYTICS).first()

        parent_demo = self.parent_partner.services.filter(sub_type=ChannelPartnerService.DEMO).first()
        demo = self.channel_partner.services.filter(sub_type=ChannelPartnerService.DEMO).first()

        path = self.get_path(partner_id=self.channel_partner.id, service_id=analytics.id)
        response = self.client.get(path)
        assert response.status_code == 200
        assert cast_uuid(response.data['id']) == analytics.id
        assert cast_uuid(response.data['createdByChannelPartner']) == self.channel_partner.id
        assert cast_uuid(response.data['parentServiceId']) == parent_analytics.id
        assert response.data['type'] == 'analytics'
        assert response.data['subType'] == 'regular'
        assert response.data['duration'] == 0

        path = self.get_path(partner_id=self.channel_partner.id, service_id=demo.id)
        response = self.client.get(path)
        assert response.status_code == 200
        assert cast_uuid(response.data['id']) == demo.id
        assert cast_uuid(response.data['createdByChannelPartner']) == self.channel_partner.id
        assert cast_uuid(response.data['parentServiceId']) == parent_demo.id
        assert response.data['type'] == 'local_recording'
        assert response.data['subType'] == 'demo'
        assert response.data['duration'] == demo.duration

    def test_detail_permissions(self, mock_auth_with_user):
        analytics = self.channel_partner.services.filter(type=ChannelPartnerService.ANALYTICS).first()
        path = self.get_path(partner_id=self.channel_partner, service_id=analytics.id)

        auth_header = f'Bearer {uuid4()}'
        self.client.credentials(HTTP_AUTHORIZATION=auth_header)
        mock_auth_with_user(self.channel_partner_admin)

        with transaction.atomic():
            response = self.client.get(path)

        assert response.status_code == 200

        auth_header = f'Bearer {uuid4()}'
        self.client.credentials(HTTP_AUTHORIZATION=auth_header)
        mock_auth_with_user(self.parent_partner_admin)

        with transaction.atomic():
            response = self.client.get(path)

        assert response.status_code == 200

        for user in [self.parent_organization_admin, self.organization_admin,
                     self.sub_organization_admin, self.sub_partner_admin]:

            auth_header = f'Bearer {uuid4()}'
            self.client.credentials(HTTP_AUTHORIZATION=auth_header)
            mock_auth_with_user(user)

            with transaction.atomic():
                response = self.client.get(path)

            assert response.status_code == 403

    def test_list_permissions(self, mock_auth_with_user):
        path = self.get_path(partner_id=self.channel_partner)

        auth_header = f'Bearer {uuid4()}'
        self.client.credentials(HTTP_AUTHORIZATION=auth_header)
        mock_auth_with_user(self.channel_partner_admin)

        with transaction.atomic():
            response = self.client.get(path)

        assert response.status_code == 200

        auth_header = f'Bearer {uuid4()}'
        self.client.credentials(HTTP_AUTHORIZATION=auth_header)
        mock_auth_with_user(self.parent_partner_admin)

        with transaction.atomic():
            response = self.client.get(path)

        assert response.status_code == 200

        for user in [self.parent_organization_admin, self.organization_admin,
                     self.sub_organization_admin, self.sub_partner_admin]:
            auth_header = f'Bearer {uuid4()}'
            self.client.credentials(HTTP_AUTHORIZATION=auth_header)
            mock_auth_with_user(user)

            with transaction.atomic():
                response = self.client.get(path)

            assert response.status_code == 403



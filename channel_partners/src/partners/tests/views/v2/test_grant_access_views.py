from uuid import uuid4

import pytest
from django.http import (
    HttpResponseForbidden,
    HttpResponseNotFound,
)
from django.test import (
    Client,
    RequestFactory,
    override_settings,
)
from rest_framework.reverse import reverse

from partners.views.v2.grant_access_views import grant_access


class TestGrantAccessView:
    @pytest.fixture(autouse=True)
    def setUp(self):
        self.ireg_customizations = [
            ('default', 'cloud-test.hdw.mx'),
            ('customization_1', 'host-2.test.hdw.mx'),
            ('customization_2', 'host-3.test.hdw.mx'),
        ]
        self.factory = RequestFactory()
        self.url = '/internal/grant_access.html'
        self.client = Client()

    @override_settings(DEBUG=False)
    def test_grant_access_debug_false_call_by_url(self, db):
        response = self.client.get(self.url)
        assert type(response) == HttpResponseNotFound
        assert response.status_code == 404

    @override_settings(DEBUG=False)
    def test_grant_access_debug_false_call_by_method(self, db):
        request = self.factory.get(self.url)
        response = grant_access(request)
        assert type(response) == HttpResponseForbidden
        assert response.status_code == 403

    @override_settings(DEBUG=True)
    def test_grant_access_not_cp(self, db):
        request = self.factory.get(self.url)
        response = grant_access(request)
        assert response.status_code == 200
        assert b'<h2 class="title">No Customizations Available</h2>' in response.content
        assert b'No Channel Partners Available' in response.content

    @override_settings(DEBUG=True)
    def test_grant_access_no_customization(self, root_nx_channel_partner):
        request = self.factory.get(self.url)
        response = grant_access(request)
        assert response.status_code == 200
        assert b'<h2 class="title">No Customizations Available</h2>' in response.content
        assert b'No Channel Partners Available' not in response.content

    @override_settings(DEBUG=True)
    def test_grant_access_ok(self, root_nx_channel_partner, mocker):
        mocked_get_customizations = mocker.patch(
            'nx_ireg.helpers.get_customizations_s3', return_value=self.ireg_customizations)

        request = self.factory.post(self.url, data={'email': 'kapanovich@networkoptix.com'})
        response = grant_access(request)
        assert response.status_code == 200
        assert b'Network Optix' in response.content
        assert b'Default Channel Partner' in response.content
        assert b'Default Organization' in response.content
        assert b'defaultadmin@networkoptix.com' in response.content
        assert b'defaultcpadmin@networkoptix.com' in response.content
        assert b'defaultorgadmin@networkoptix.com' in response.content
        assert str(root_nx_channel_partner.id).encode() in response.content



class TestGrantAccessApiView:
    @pytest.fixture(autouse=True)
    def setUp(self):
        self.ireg_customizations = [
            ('default', 'cloud-test.hdw.mx'),
            ('customization_1', 'host-2.test.hdw.mx'),
            ('customization_2', 'host-3.test.hdw.mx'),
        ]
        self.factory = RequestFactory()
        self.url = reverse('v2:grant_access_api')
        self.client = Client()

    def test_grant_access_debug_false_call_by_url(self, db, mock_debug_false):
        response = self.client.post(self.url)
        assert response.status_code == 404

    @override_settings(DEBUG=True)
    def test_no_root_partner(self, db, mocker, mock_debug_true):
        response = self.client.post(self.url)
        assert response.status_code == 400
        assert response.data == ['There is no root partner or customizations']

    def test_no_customizations(self, root_nx_channel_partner, mocker, mock_debug_true):
        mocked_get_customizations = mocker.patch(
            'nx_ireg.helpers.get_customizations_s3', return_value=[])
        response = self.client.post(self.url)
        assert response.status_code == 400
        assert response.data == ['There is no root partner or customizations']
        mocked_get_customizations.assert_called_once()

    def test_grant_access_ok(self, root_nx_channel_partner, mocker,
                             channel_partner_factory, mock_debug_true):
        for customization, host in self.ireg_customizations[1:]:
            channel_partner_factory(name=customization, parent_channel_partner=root_nx_channel_partner)
        mocked_get_customizations = mocker.patch(
            'nx_ireg.helpers.get_customizations_s3', return_value=self.ireg_customizations)
        email_base = f'{uuid4()}'
        response = self.client.post(self.url, data={'email': f'{email_base}@networkoptix.com'})
        assert response.status_code == 200
        assert len(response.data) == len(self.ireg_customizations)
        for customization in response.data:
            customization_name = customization['customization']
            users = customization['users']
            for user in users:
                assert email_base in user['email']
                assert customization_name in user['email']
                assert user.get('organizationName') or user.get('channelPartnerName')
                assert user.get('organizationId') or user.get('channelPartnerId')
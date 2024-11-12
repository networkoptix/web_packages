import json
from uuid import uuid4

import pytest

from partners.auth.cache import TokenCache
from partners.auth.introspect import CdbTokenIntrospect
from partners.models import VmsRoles


class TestCdbTokenIntrospect:
    @pytest.fixture(autouse=True)
    def setup(self, system_factory, cloud_user_factory):
        self.user = cloud_user_factory()
        self.system_1 = system_factory()
        self.system_2 = system_factory()

    def test_not_authorized(self, httpx_mock, cdb_introspect_url, cloud_test_host):
        data = {
            "errorClass": "unauthorized",
            "errorDetail": "111",
            "errorText": "badUsername",
            "resultCode": "badUsername"
        }
        token = f'{uuid4()}'
        httpx_mock.add_response(url=cdb_introspect_url, json=data, status_code=200)
        introspection = CdbTokenIntrospect.introspect_with_system(
            token=token,
            cloud_host_name=cloud_test_host.hostname,
            system_id=self.system_1.system_id)
        assert not introspection.email
        assert introspection.introspected_systems_roles == {}

        request = httpx_mock.get_request(url=cdb_introspect_url)
        request_data = json.loads(request.read())
        assert request_data['token'] == token
        assert request_data['system_ids'] == [str(self.system_1.system_id)]
        assert request_data['skip_non_shared'] is True

        data = {
            "errorClass": "unauthorized",
            "errorDetail": "111",
            "errorText": "badUsername",
            "resultCode": "badUsername"
        }
        httpx_mock.add_response(url=cdb_introspect_url, json=data, status_code=401)
        introspection = CdbTokenIntrospect.introspect_with_system(
            token=token,
            cloud_host_name=cloud_test_host.hostname,
            system_id=self.system_1.system_id)
        assert not introspection.email
        assert introspection.introspected_systems_roles == {}

    def test_no_system(self, mock_cdb_token_introspect, cloud_test_host, httpx_mock, cdb_introspect_url):
        mock_cdb_token_introspect(user=self.user)
        token = f'{uuid4()}'
        introspection = CdbTokenIntrospect.introspect_with_system(
            token=token,
            cloud_host_name=cloud_test_host.hostname,
            system_id=self.system_1.system_id)
        assert introspection.email == self.user.email
        assert introspection.introspected_systems_roles == {}
        assert not introspection.has_roles_in_system(email=self.user.email,
                                                     system_id=self.system_1.system_id,
                                                     expected_roles=VmsRoles.ALL_ROLES)
        request = httpx_mock.get_request(url=cdb_introspect_url)
        request_data = json.loads(request.read())
        assert request_data['token'] == token
        assert request_data['system_ids'] == [str(self.system_1.system_id)]
        assert request_data['skip_non_shared'] is True

    def test_no_role(self, mock_cdb_token_introspect, cloud_test_host):
        mock_cdb_token_introspect(user=self.user, system=self.system_1, system_role=None)
        introspection = CdbTokenIntrospect.introspect_with_system(
            token=f'{uuid4()}',
            cloud_host_name=cloud_test_host.hostname,
            system_id=self.system_1.system_id)
        assert introspection.email == self.user.email
        assert introspection.introspected_systems_roles == {self.system_1.system_id: set()}
        assert not introspection.has_roles_in_system(email=self.user.email,
                                                     system_id=self.system_1.system_id,
                                                     expected_roles=VmsRoles.ALL_ROLES)
        assert introspection.has_roles_in_system(email=self.user.email,
                                                 system_id=self.system_1.system_id,
                                                 expected_roles=VmsRoles.ANY_ROLE)


    def test_roles_not_authorized(self, mock_cdb_token_introspect, cloud_test_host):
        mock_cdb_token_introspect(user=self.user, system=self.system_1, system_role=VmsRoles.VIEWER)
        introspection = CdbTokenIntrospect.introspect_with_system(
            token=f'{uuid4()}',
            cloud_host_name=cloud_test_host.hostname,
            system_id=self.system_1.system_id)
        assert introspection.email == self.user.email
        assert introspection.introspected_systems_roles == {self.system_1.system_id: {VmsRoles.VIEWER}}
        assert not introspection.has_roles_in_system(email=self.user.email,
                                                     system_id=self.system_1.system_id,
                                                     expected_roles=[VmsRoles.ADMINISTRATOR])
        assert not introspection.has_roles_in_system(email=self.user.email,
                                                     system_id=self.system_2.system_id,
                                                     expected_roles=[VmsRoles.VIEWER])
        assert not introspection.has_roles_in_system(email='self.user.email',
                                                     system_id=self.system_1.system_id,
                                                     expected_roles=[VmsRoles.VIEWER])
        assert not introspection.has_roles_in_system(email='',
                                                     system_id=self.system_1.system_id,
                                                     expected_roles=[VmsRoles.VIEWER])

    def test_roles_authorized(self, mock_cdb_token_introspect, cloud_test_host):
        mock_cdb_token_introspect(user=self.user, system=self.system_1, system_role=VmsRoles.VIEWER)
        introspection = CdbTokenIntrospect.introspect_with_system(
            token=f'{uuid4()}',
            cloud_host_name=cloud_test_host.hostname,
            system_id=self.system_1.system_id)
        assert introspection.email == self.user.email
        assert introspection.introspected_systems_roles == {self.system_1.system_id: {VmsRoles.VIEWER}}
        assert introspection.has_roles_in_system(email=self.user.email,
                                                 system_id=self.system_1.system_id,
                                                 expected_roles=[VmsRoles.VIEWER])

    def test_cache(self, mock_cdb_token_introspect, cloud_test_host):
        token = f'{uuid4()}'
        mock_cdb_token_introspect(user=self.user, system=self.system_1, system_role=VmsRoles.VIEWER)
        introspection = CdbTokenIntrospect.introspect_with_system(
            token=token,
            cloud_host_name=cloud_test_host.hostname,
            system_id=self.system_1.system_id)
        cached = TokenCache.get_system_introspection(token, system_id=self.system_1.system_id)
        assert cached == introspection

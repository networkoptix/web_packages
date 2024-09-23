"""
NOTES:
    - Will only be testing GET requests
"""
import uuid
from urllib.parse import (
    parse_qs,
    urlparse,
)

import pytest
import structlog

from partners.tests.services.caching.conftest import BaseTest


"""
# Inputs
-------------
Keys:
    name (str): The name of the test case.
    path (str): The endpoint path with placeholders for dynamic segments.
    auth (str): The user authentication segment. Possible values:
        - cp_user
        - sub_cp_user
        - org_admin
        - cp_org_admin
        - other_org_admin
        - group_admin
        - other_group_admin
    
    assert_cache_hit (dict): A dictionary of assertions corresponding to sections of the test.
        - possible keys:
            - initial
            - host
            - cp
            - sub_cp
            - cp_organization
            - organization
            - other_org
            - group
            - other_group
            - cp_user
            - sub_cp_user
            - cp_org_admin
            - org_admin
            - other_org_admin
            - group_admin
            - other_group_admin
            - cp_org_system
            - org_system
            - group_system
            - cp_enabled_service
            - enabled_service
            - enabled_service_record
            - disabled_service
            - disabled_service_record
            - cp_expiring_service
            - cp_expiring_service_record
            - expiring_service
            - expiring_service_record
            - external_id
        - possible values:
            - [True]: cache hit
            - [False]: cache miss
            
# Example Usage
---------------
test_cases = [
        {
        "name": "test_internal_systems_users_with_org_admin",
        "path": "/internal/systems/{org_system.system_id}/users/",
        "auth": "org_admin",
        "assert_cache_hit": {
            "initial": [False, True],
            "cp": [False, True],
            "sub_cp": [False, True],
            "organization": [False, True],
            "other_org": [True, True],
            "group": [True, True],
            "other_group": [True, True],
            "cp_user": [False, True],
            "sub_cp_user": [False, True],
            "org_admin": [False, True],
            "other_org_admin": [True, True],
            "group_admin": [False, True],
            "other_group_admin": [False, True],
            "org_system": [False, True],
            "group_system": [True, True],
            "enabled_service": [False, True],
            "disabled_service": [False, True],
            "external_id": [True, True]
        },
    }
]
"""

logger = structlog.getLogger()

test_cases_channel_partner_available_service_viewset = []
test_cases_channel_partner_external_id_viewset = []
test_cases_channel_partner_nested_viewset = []
test_cases_channel_partner_owned_service_viewset = []
test_cases_channel_partner_service_external_id_viewset = []
test_cases_channel_partner_service_report_viewset = []
test_cases_channel_partner_user_viewset = []
test_cases_channel_partner_viewset = []
test_cases_channel_structure_viewset = []
test_cases_organization_viewset = []
test_cases_organization_nested_viewset = []
test_cases_organization_service_viewset = []
test_cases_organization_user_viewset = []
test_cases_organization_service_record_viewset = []
test_cases_internal_endpoints = []

test_cases = []

test_cases.extend([
    *test_cases_organization_viewset,
    *test_cases_organization_nested_viewset,
    *test_cases_organization_service_viewset,
    *test_cases_organization_user_viewset,
    *test_cases_organization_service_record_viewset,
    *test_cases_internal_endpoints,
    *test_cases_channel_partner_available_service_viewset,
    *test_cases_channel_partner_external_id_viewset,
    *test_cases_channel_partner_nested_viewset,
    *test_cases_channel_partner_owned_service_viewset,
    *test_cases_channel_partner_service_external_id_viewset,
    *test_cases_channel_partner_user_viewset,
    *test_cases_channel_partner_service_report_viewset,
    *test_cases_channel_partner_viewset,
    *test_cases_channel_structure_viewset,
])


class TestEndpointsUsingParameterizedTests(BaseTest):

    def assign_attributes(self, test_case):
        url = test_case["path"]
        parsed_url = urlparse(url)

        def extract_attr_path(segment):
            if segment.startswith('{') and segment.endswith('}'):
                return segment[1:-1]
            return None

        path_segments = parsed_url.path.split('/')
        query_params = parse_qs(parsed_url.query)

        attributes = {}
        for segment in path_segments:
            attr_path = extract_attr_path(segment)
            if attr_path:
                attributes[attr_path] = self.get_nested_attribute(attr_path)

        for key, value in query_params.items():
            attr_path = extract_attr_path(value[0])
            if attr_path:
                attributes[attr_path] = self.get_nested_attribute(attr_path)

        return attributes

    def get_nested_attribute(self, attr_path):
        parts = attr_path.split('.')
        attr = self
        for part in parts:
            attr = getattr(attr, part)
        return attr

    def replace_path_and_query_params(self, url, attributes):
        parsed_url = urlparse(url)
        path_segments = parsed_url.path.split('/')
        query_params = parse_qs(parsed_url.query)

        new_path_segments = [
            str(attributes.get(segment[1:-1], segment)) if segment.startswith('{') and segment.endswith(
                '}') else segment
            for segment in path_segments
        ]

        new_query_params = {
            key: [str(attributes.get(value[0][1:-1], value[0]))]
            if value[0].startswith('{') and value[0].endswith('}')
            else value
            for key, value in query_params.items()
        }

        new_path = '/'.join(new_path_segments)
        new_query = '&'.join(f"{key}={value[0]}" for key, value in new_query_params.items())

        return f"{new_path}{'?' if new_query else ''}{new_query}"

    def get_user(self, test_case):
        auth_segment = test_case["auth"]
        if '.' in auth_segment:
            parts = auth_segment.split('.')
            user = self
            for part in parts:
                user = getattr(user, part)
        else:
            user = getattr(self, auth_segment)
        return user

    def _make_request_with_assertions(self, user, path, assertions, path_params=None) -> None:
        assert len(assertions) == 2
        for assertion in assertions:
            with self.capture_on_commit(execute=True):
                response = self._make_request_get_response(user, path, path_params=path_params)
            if assertion is not None:
                self._asserts(response, cache_was_hit=assertion)
                logger.debug("----- Assertion Successful -----")
            else:
                logger.debug("------- Warm-up Request --------")

    @pytest.mark.parametrize("test_case", test_cases, ids=[tc["name"] for tc in test_cases])
    def test_endpoint(self, test_case):
        original_path = test_case["path"]
        user = self.get_user(test_case)
        attributes = self.assign_attributes(test_case)
        path = self.replace_path_and_query_params(original_path, attributes)
        cache_hit_asserts = test_case["assert_cache_hit"]

        # TODO: Refactor this to be more dynamic and to use a mapping of the model names and fields ot change
        # Assertions that assert_cache_hit are utilized for
        if "initial" in cache_hit_asserts:
            logger.debug("======= Initial =======")
            self.update_cache()
            assertions = cache_hit_asserts["initial"]
            self._make_request_with_assertions(user, path, assertions)

        if "cp" in cache_hit_asserts:
            logger.debug("======= CP =======")
            with self.capture_on_commit(execute=True):
                self.cp.name = "New Name"
                self.cp.save()
            self.update_cache()
            assertions = cache_hit_asserts["cp"]
            self._make_request_with_assertions(user, path, assertions)

        if "sub_cp" in cache_hit_asserts:
            logger.debug("======= Sub CP =======")
            with self.capture_on_commit(execute=True):
                self.sub_cp.name = "New Name"
                self.sub_cp.save()
            self.update_cache()
            assertions = cache_hit_asserts["sub_cp"]
            self._make_request_with_assertions(user, path, assertions)

        if "organization" in cache_hit_asserts:
            logger.debug("======= Organization =======")
            with self.capture_on_commit(execute=True):
                self.organization.name = "New Name"
                self.organization.save()
            self.update_cache()
            assertions = cache_hit_asserts["organization"]
            self._make_request_with_assertions(user, path, assertions)

        if "other_org" in cache_hit_asserts:
            logger.debug("======= Other Organization =======")
            with self.capture_on_commit(execute=True):
                self.other_org.name = "New Name"
                self.other_org.save()
            self.update_cache()
            assertions = cache_hit_asserts["other_org"]
            self._make_request_with_assertions(user, path, assertions)

        if "group" in cache_hit_asserts:
            logger.debug("======= Group =======")
            with self.capture_on_commit(execute=True):
                self.group.name = "New Name"
                self.group.save()
            self.update_cache()
            assertions = cache_hit_asserts["group"]
            self._make_request_with_assertions(user, path, assertions)

        if "other_group" in cache_hit_asserts:
            logger.debug("======= Other Group =======")
            with self.capture_on_commit(execute=True):
                self.other_group.name = "New Name"
                self.other_group.save()
            self.update_cache()
            assertions = cache_hit_asserts["other_group"]
            self._make_request_with_assertions(user, path, assertions)

        if "cp_user" in cache_hit_asserts:
            logger.debug("======= CP User =======")
            with self.capture_on_commit(execute=True):
                self.cp_user.full_name = "New Name"
                self.cp_user.save()
            self.update_cache()
            assertions = cache_hit_asserts["cp_user"]
            self._make_request_with_assertions(user, path, assertions)

        if "sub_cp_user" in cache_hit_asserts:
            logger.debug("======= Sub CP User =======")
            with self.capture_on_commit(execute=True):
                self.sub_cp_user.full_name = "New Name"
                self.sub_cp_user.save()
            self.update_cache()
            assertions = cache_hit_asserts["sub_cp_user"]
            self._make_request_with_assertions(user, path, assertions)

        if "org_admin" in cache_hit_asserts:
            logger.debug("======= Org Admin =======")
            with self.capture_on_commit(execute=True):
                self.org_admin.full_name = "New Name"
                self.org_admin.save()
            self.update_cache()
            assertions = cache_hit_asserts["org_admin"]
            self._make_request_with_assertions(user, path, assertions)

        if "other_org_admin" in cache_hit_asserts:
            logger.debug("======= Other Org Admin =======")
            with self.capture_on_commit(execute=True):
                self.other_org_admin.full_name = "New Name"
                self.other_org_admin.save()
            self.update_cache()
            assertions = cache_hit_asserts["other_org_admin"]
            self._make_request_with_assertions(user, path, assertions)

        if "group_admin" in cache_hit_asserts:
            logger.debug("======= Group Admin =======")
            with self.capture_on_commit(execute=True):
                self.group_admin.full_name = "New Name"
                self.group_admin.save()
            self.update_cache()
            assertions = cache_hit_asserts["group_admin"]
            self._make_request_with_assertions(user, path, assertions)

        if "other_group_admin" in cache_hit_asserts:
            logger.debug("======= Other Group Admin =======")
            with self.capture_on_commit(execute=True):
                self.other_group_admin.full_name = "New Name"
                self.other_group_admin.save()
            self.update_cache()
            assertions = cache_hit_asserts["other_group_admin"]
            self._make_request_with_assertions(user, path, assertions)

        if "org_system" in cache_hit_asserts:
            logger.debug("======= Org System =======")
            with self.capture_on_commit(execute=True):
                self.org_system.name = "New Name"
                self.org_system.save()
            self.update_cache()
            assertions = cache_hit_asserts["org_system"]
            self._make_request_with_assertions(user, path, assertions)

        if "group_system" in cache_hit_asserts:
            logger.debug("======= Group System =======")
            with self.capture_on_commit(execute=True):
                self.group_system.name = "New Name"
                self.group_system.save()
            self.update_cache()
            assertions = cache_hit_asserts["group_system"]
            self._make_request_with_assertions(user, path, assertions)

        if "enabled_service" in cache_hit_asserts:
            logger.debug("======= Enabled Service =======")
            with self.capture_on_commit(execute=True):
                self.enabled_service.name = "New Name"
                self.enabled_service.save()
            self.update_cache()
            assertions = cache_hit_asserts["enabled_service"]
            self._make_request_with_assertions(user, path, assertions)

        if "disabled_service" in cache_hit_asserts:
            logger.debug("======= Disabled Service =======")
            with self.capture_on_commit(execute=True):
                self.disabled_service.name = "New Name"
                self.disabled_service.save()
            self.update_cache()
            assertions = cache_hit_asserts["disabled_service"]
            self._make_request_with_assertions(user, path, assertions)

        if "cp_expiring_service" in cache_hit_asserts:
            logger.debug("======= CP Expiring Service =======")
            with self.capture_on_commit(execute=True):
                self.cp_expiring_service.name = "New Name"
                self.cp_expiring_service.save()
            self.update_cache()
            assertions = cache_hit_asserts["cp_expiring_service"]
            self._make_request_with_assertions(user, path, assertions)

        if "cp_expiring_service_record" in cache_hit_asserts:
            logger.debug("======= CP Expiring Service Record =======")
            with self.capture_on_commit(execute=True):
                self.cp_expiring_service_record.quantity += 1
                self.cp_expiring_service_record.save()
            self.update_cache()
            assertions = cache_hit_asserts["cp_expiring_service_record"]
            self._make_request_with_assertions(user, path, assertions)

        if "expiring_service" in cache_hit_asserts:
            logger.debug("======= Expiring Service =======")
            with self.capture_on_commit(execute=True):
                self.expiring_service.name = "New Name"
                self.expiring_service.save()
            self.update_cache()
            assertions = cache_hit_asserts["expiring_service"]
            self._make_request_with_assertions(user, path, assertions)

        if "expiring_service_record" in cache_hit_asserts:
            logger.debug("======= Expiring Service Record =======")
            with self.capture_on_commit(execute=True):
                self.expiring_service_record.quantity += 1
                self.expiring_service_record.save()
            self.update_cache()
            assertions = cache_hit_asserts["expiring_service_record"]
            self._make_request_with_assertions(user, path, assertions)

        if "external_id" in cache_hit_asserts:
            logger.debug("======= External ID =======")
            with self.capture_on_commit(execute=True):
                self.external_id.custom_id = f"{uuid.uuid4()}"
                self.external_id.save()
            self.update_cache()
            assertions = cache_hit_asserts["external_id"]
            self._make_request_with_assertions(user, path, assertions)

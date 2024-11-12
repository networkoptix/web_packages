import datetime
from unittest import mock

import pytest
from dateutil.relativedelta import relativedelta
from rest_framework.test import APIClient
from waffle import get_waffle_switch_model

from partners.models import (
    ChannelPartnerExternalId,
    ChannelPartnerService,
    CloudUser,
)
from partners.tasks.usage_reports import calculate_all_reports
from partners.tests.services.caching.test_dependent_cache import update_cache
from tools.helpers import get_today


class BaseTest:
    @pytest.fixture(autouse=True)
    def setup(
            self,
            # Needed for functionality
            mock_auth_with_user,
            mock_internal_token_auth,
            cache_hit_asserter_context,
            cache_miss_asserter_context,
            django_capture_on_commit_callbacks,

            # Needed for structure
            cloud_test_host,
            channel_partner_factory,
            organization_factory,
            cp_user_factory,
            org_user_factory,
            cp_service_factory,
            system_factory,
            system_group_factory,
            sys_group_user_factory,
            service_record_factory

    ) -> None:
        self.mock_auth = mock_auth_with_user
        self.mock_internal_token_auth = mock_internal_token_auth
        self.assert_cache_hit = cache_hit_asserter_context
        self.assert_cache_miss = cache_miss_asserter_context
        self.capture_on_commit = django_capture_on_commit_callbacks

        with django_capture_on_commit_callbacks(execute=True):
            from django.conf import settings
            switch_name = settings.WAFFLE_SWITCH_VIEW_CACHE_KEY
            switch_model = get_waffle_switch_model()
            switch, created = switch_model.objects.get_or_create(name=switch_name)
            switch.active = True
            switch.save()
        with django_capture_on_commit_callbacks(execute=True):
            # Set up date
            self.requested_date = get_today() - relativedelta(days=1)
            self.requested_date = self.requested_date.replace(day=10)
            self.period_query_param = f"?periodStartDate={self.requested_date}"

            # Set host
            self.host = cloud_test_host

            # Create channel partners
            self.cp = channel_partner_factory(name="cp")  # Main channel partner
            self.sub_cp = channel_partner_factory(parent_channel_partner=self.cp, name="sub_cp")

            # Create organization
            self.cp_organization = organization_factory(channel_partner=self.cp, name="cp_organization")
            self.organization = organization_factory(channel_partner=self.sub_cp, name="organization")
            self.other_org = organization_factory(channel_partner=self.sub_cp, name="other_org")

            # Create system groups
            self.group = system_group_factory(organization=self.organization, name="group")
            self.other_group = system_group_factory(organization=self.organization, name="other_group")

            # Create users

            ## User for main channel partner
            self.cp_user = cp_user_factory(channel_partner=self.cp, email="cp_user@example.com").user

            ## User for sub channel partner
            self.sub_cp_user = cp_user_factory(channel_partner=self.sub_cp, email="sub_cp_user@example.com").user

            ## Admin for main CP Organization
            self.cp_org_admin = org_user_factory(
                organization=self.cp_organization,
                email="cp_org_admin@example.com").user

            ## Admin for main organization
            self.org_admin = org_user_factory(organization=self.organization, email="org_admin@example.com").user

            #  # Admin for other organization
            self.other_org_admin = org_user_factory(
                organization=self.other_org,
                email="other_org_admin@example.com").user

            ## Admin for main system group
            self.group_admin = sys_group_user_factory(
                organization=self.organization,
                group=self.group,
                email="group_admin@example.com").user

            ## Admin for other system group
            self.other_group_admin = sys_group_user_factory(
                organization=self.organization,
                group=self.other_group,
                email="other_group_admin@example.com").user

            # Create systems

            ## System for main CP Organization
            self.cp_org_system = system_factory(organization=self.cp_organization, name="cp_org_system")

            ## System for main organization
            self.org_system = system_factory(organization=self.organization, name="org_system")

            ## System for main system group
            self.group_system = system_factory(
                organization=self.organization,
                system_group=self.group,
                name="group_system")

            # Creating Services & Service Records
            self.cp_enabled_service = cp_service_factory(
                channel_partner=self.cp,
                service_type=ChannelPartnerService.ANALYTICS,
                is_enabled=True,
                name="cp_enabled_service")

            ## Enabled Service & Records
            self.enabled_service = cp_service_factory(
                channel_partner=self.sub_cp,
                service_type=ChannelPartnerService.ANALYTICS,
                is_enabled=True,
                name="sub_cp_enabled_service")

            self.enabled_service_record = service_record_factory(
                service=self.enabled_service,
                cloud_system=self.org_system,
                quantity=1,
                created_ts=self.requested_date.replace(day=1),
                effective_ts=self.requested_date.replace(day=1))

            ## Disabled Service & Records
            self.disabled_service = cp_service_factory(
                channel_partner=self.sub_cp,
                service_type=ChannelPartnerService.ANALYTICS,
                is_enabled=False,
                name="sub_cp_disabled_service")

            self.disabled_service_record = service_record_factory(
                service=self.disabled_service,
                cloud_system=self.org_system,
                quantity=1,
                created_ts=self.requested_date.replace(day=1),
                effective_ts=self.requested_date.replace(day=1))

            ## Expiring Service & Records
            self.cp_expiring_service = cp_service_factory(
                channel_partner=self.cp,
                sub_type=ChannelPartnerService.DEMO,
                duration=30)

            self.cp_expiring_service_record = service_record_factory(
                service=self.cp_expiring_service,
                cloud_system=self.org_system,
                quantity=1,
                created_ts=datetime.datetime.now(),
                effective_ts=self.requested_date.replace(day=1))

            self.expiring_service = cp_service_factory(
                channel_partner=self.sub_cp,
                sub_type=ChannelPartnerService.DEMO,
                duration=30)

            self.expiring_service_record = service_record_factory(
                service=self.expiring_service,
                cloud_system=self.org_system,
                quantity=1,
                created_ts=datetime.datetime.now(),
                effective_ts=self.requested_date.replace(day=1),
            )

            # Generate External IDs
            self.external_id = ChannelPartnerExternalId.objects.create(
                channel_partner=channel_partner_factory(parent_channel_partner=self.cp),
                custom_id="my_custom_external_id_key",
                created_by=self.cp,
            )

            self.update_cache()
            calculate_all_reports()

    def update_cache(self):
        # Update cache
        items_to_update = [
            self.cp, self.sub_cp,
            self.organization, self.other_org,
            self.group, self.other_group,
            self.cp_user, self.sub_cp_user,
            self.org_admin, self.other_org_admin,
            self.group_admin, self.other_group_admin,
            self.org_system, self.group_system,
            self.enabled_service, self.disabled_service,
            self.external_id
        ]

        update_cache(items_to_update)

    def _make_request_get_response_cache_enabled(
            self,
            user: CloudUser,
            endpoint: str,
            path_params: dict = None,
            query_params: dict = None,
    ):
        # Set up client
        client = APIClient(SERVER_NAME=self.host.hostname)
        self.mock_auth(user)
        # Endpoint(s) should start with `/{version number}/...` example: `/v2/...` | `/v3/...`
        endpoint = "/partners/api" + endpoint
        headers = {
            'X-Original-Host': self.host.hostname,
            'Accept': 'application/json'
        }
        # Format endpoint with path parameters
        if path_params:
            endpoint = endpoint.format(**path_params)

        # Make request
        with mock.patch('rest_framework.views.APIView.check_throttles', return_value=None):
            with mock.patch('partners.services.caching.dependent_view_cache.should_skip_processing_request', return_value=False):
                response = client.get(endpoint, query_params, headers=headers)
        return response

    def _asserts(self, response, cache_was_hit=True, status_code=200):
        assert response.status_code == status_code
        # assert response.headers._store.get("'x-cps-cache-status'", None) != None

        if cache_was_hit:
            assert response.headers["X-CPS-Cache-Status"] == "hit"
        else:
            assert response.headers["X-CPS-Cache-Status"] == "miss"

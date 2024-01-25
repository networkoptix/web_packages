import logging

import httpx
import pytest

from partners.services.cloud_system_service import CloudSystemService


class TestCloudSystemService:
    @pytest.fixture(autouse=True)
    def setUp(self, organization_factory, system_factory):
        self.organization = organization_factory()
        self.cloud_system = system_factory(organization=self.organization)


    def test_notify_service_change(self, httpx_mock, caplog):
        caplog.set_level(logging.INFO)

        # Mock the response
        httpx_mock.add_response(
            url=f"https://{self.cloud_system.system_id}.relay.relay.cloud.hdw.mx/rest/v3/system/cloud/sync",
            json={"success": True}, status_code=200)

        # Call the method
        ret = CloudSystemService.notify_service_change(self.cloud_system)

        # Filter logs for function only
        logs = list(filter(lambda log: log.funcName == "notify_service_change", caplog.records))

        # Test assertions
        assert len(logs) == 1
        assert "Successfully sent notification" in logs[0].message
        assert ret is True

    def test_notify_service_change_failure_response(self, httpx_mock, caplog):
        caplog.set_level(logging.INFO)

        # Mock the response
        httpx_mock.add_response(
            url=f"https://{self.cloud_system.system_id}.relay.relay.cloud.hdw.mx/rest/v3/system/cloud/sync",
            json={"error": "Bad Request"}, status_code=400)

        # Call the method
        ret = CloudSystemService.notify_service_change(self.cloud_system)

        # Filter logs for function only
        logs = list(filter(lambda log: log.funcName == "notify_service_change", caplog.records))

        # Test assertions
        assert len(logs) == 1
        assert "An issue occurred while sending notification" in logs[0].message
        assert ret is False

    def test_connection_error_handling(self, httpx_mock):
        error_text = 'TEST Connection Error'
        httpx_mock.add_exception(
            url=f"https://{self.cloud_system.system_id}.relay.relay.cloud.hdw.mx/rest/v3/system/cloud/sync",
            exception=httpx.ConnectError(error_text))

        # Call the method
        assert not CloudSystemService.notify_service_change(self.cloud_system)

        httpx_mock.add_exception(
            url=f"https://{self.cloud_system.system_id}.relay.relay.cloud.hdw.mx/rest/v3/system/cloud/sync",
            exception=ValueError(error_text))

        # Call the method
        assert not CloudSystemService.notify_service_change(self.cloud_system)


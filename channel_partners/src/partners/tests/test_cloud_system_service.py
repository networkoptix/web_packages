import logging
import uuid
from unittest.mock import Mock

import pytest
from django.test import override_settings

from partners.models import CloudSystemId
from partners.services.cloud_system_service import CloudSystemService


class TestCloudSystemService:
    @pytest.fixture(autouse=True)
    @override_settings(ENV_NAME='local')
    def setUp(self):
        self.cloud_system = Mock(spec=CloudSystemId)
        self.cloud_system.activated = True
        self.cloud_system.system_id = uuid.uuid4()
        self.cloud_system.pk = 1

    def test_notify_service_change(self, httpx_mock, caplog):
        caplog.set_level(logging.INFO)

        # Mock the response
        httpx_mock.add_response(
            url=f"https://{self.cloud_system.system_id}.relay.relay.cloud.hdw.mx/rest/v3/system/cloud/sync",
            json={"success": True}, status_code=200)

        # Call the method
        CloudSystemService.notify_service_change(self.cloud_system)

        # Filter logs for function only
        logs = list(filter(lambda log: log.funcName == "notify_service_change", caplog.records))

        # Test assertions
        assert len(logs) == 1
        assert "Successfully sent notification" in logs[0].message

    def test_notify_service_change_failure_response(self, httpx_mock, caplog):
        caplog.set_level(logging.INFO)

        # Mock the response
        httpx_mock.add_response(
            url=f"https://{self.cloud_system.system_id}.relay.relay.cloud.hdw.mx/rest/v3/system/cloud/sync",
            json={"error": "Bad Request"}, status_code=400)

        # Call the method
        CloudSystemService.notify_service_change(self.cloud_system)

        # Filter logs for function only
        logs = list(filter(lambda log: log.funcName == "notify_service_change", caplog.records))

        # Test assertions
        assert len(logs) == 1
        assert "An issue occurred while sending notification" in logs[0].message

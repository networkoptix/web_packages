import io
import sys
from typing import Literal

import pytest
from django.conf import settings
from django.test import (
    Client,
    override_settings,
)

from channel_partners.configuration.logging_config import configure_logging


def setup_test_logging(env: Literal["local", "ci", "prod"], min_level: int):
    configure_logging(env, min_level)


class TestStructuredLogging:
    @override_settings(ENV_NAME='local')
    @pytest.mark.django_db
    def test_structured_logging_404_local(self, caplog):
        min_level = settings.MIN_LOGGING_LEVEL
        caplog.set_level(min_level)
        capturedOutput = io.StringIO()
        sys.stdout = capturedOutput

        setup_test_logging("local", min_level)

        client = Client()
        response = client.get('/DOES-NOT-EXIST')

        # Check the status code of the response
        assert response.status_code == 404
        logs = caplog.records
        # Check if the request started and finished logs are present
        assert any("request_started" in log.message for log in logs)
        assert any("request_finished" in log.message for log in logs)

        # Check if the IP address is logged
        assert any("ip" in log.message for log in logs)

    @override_settings(ENV_NAME='prod')
    @pytest.mark.django_db
    def test_structured_logging_404_prod_or_ci(self, caplog):
        min_level = settings.MIN_LOGGING_LEVEL
        caplog.set_level(min_level)
        capturedOutput = io.StringIO()
        sys.stdout = capturedOutput

        setup_test_logging("prod", min_level)

        client = Client()
        response = client.get('/DOES-NOT-EXIST')

        # Check the status code of the response
        assert response.status_code == 404
        logs = caplog.records
        # Check if the request started and finished logs are present
        assert any("request_started" in log.message for log in logs)
        assert any("request_finished" in log.message for log in logs)

        # Check if the IP address is logged
        assert any("ip" in log.message for log in logs)

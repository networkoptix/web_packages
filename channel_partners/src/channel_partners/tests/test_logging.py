import io
import logging
import sys
from typing import Literal

import pytest
from django.test import Client
from django.test import override_settings

from channel_partners.configuration.logging_config import configure_logging


def setup_test_logging(env: Literal["local", "ci", "prod"]):
    configure_logging(env)


class TestStructuredLogging:
    @override_settings(ENV_NAME='local')
    @pytest.mark.django_db
    def test_structured_logging_404_local(self, caplog):
        caplog.set_level(logging.INFO)
        capturedOutput = io.StringIO()
        sys.stdout = capturedOutput

        setup_test_logging("local")

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

        sys.stdout = sys.__stdout__

        actual = capturedOutput.getvalue()
        expected = ["Directory created at logs\n", "Directory already exists at logs\n"]

        assert actual in expected

    @override_settings(ENV_NAME='prod')
    @pytest.mark.django_db
    def test_structured_logging_404_prod_or_ci(self, caplog):
        caplog.set_level(logging.INFO)
        capturedOutput = io.StringIO()
        sys.stdout = capturedOutput

        setup_test_logging("prod")

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

        sys.stdout = sys.__stdout__

        actual = capturedOutput.getvalue()
        expected = ""

        assert actual is expected

import io
import sys
from typing import Literal

import pytest
from django.test import Client, TestCase, override_settings

from channel_partners.configuration.logging_config import configure_logging


def setup_test_logging(env: Literal["local", "ci", "prod"]):
    configure_logging(env)


class TestStructuredLogging(TestCase):
    @override_settings(ENV_NAME='local')
    @pytest.mark.django_db
    def test_structured_logging_404_local(self):
        capturedOutput = io.StringIO()
        sys.stdout = capturedOutput

        with self.assertLogs("django_structlog", level="INFO") as logs:
            setup_test_logging("local")

            client = Client()
            response = client.get('/DOES-NOT-EXIST')

            # Check the status code of the response
            assert response.status_code == 404

            # Check if the request started and finished logs are present
            self.assertTrue(any("request_started" in log for log in logs.output))
            self.assertTrue(any("request_finished" in log for log in logs.output))

            # Check if the IP address is logged
            self.assertTrue(any("ip" in log for log in logs.output))

        sys.stdout = sys.__stdout__

        actual = capturedOutput.getvalue()
        expected = ["Directory created at logs\n", "Directory already exists at logs\n"]

        assert actual in expected

    @override_settings(ENV_NAME='prod')
    @pytest.mark.django_db
    def test_structured_logging_404_prod_or_ci(self):
        capturedOutput = io.StringIO()
        sys.stdout = capturedOutput

        with self.assertLogs("django_structlog", level="INFO") as logs:
            setup_test_logging("prod")

            client = Client()
            response = client.get('/DOES-NOT-EXIST')

            # Check the status code of the response
            assert response.status_code == 404

            # Check if the request started and finished logs are present
            self.assertTrue(any("request_started" in log for log in logs.output))
            self.assertTrue(any("request_finished" in log for log in logs.output))

            # Check if the IP address is logged
            self.assertTrue(any("ip" in log for log in logs.output))

        sys.stdout = sys.__stdout__

        actual = capturedOutput.getvalue()
        expected = ""

        assert actual is expected

import io
import sys
from typing import Literal
from unittest.mock import (
    MagicMock,
    patch,
)

import pytest
from django.conf import settings
from django.core.cache import caches
from django.http import HttpRequest
from django.test import (
    Client,
    override_settings,
)

from channel_partners.configuration.logging_config import configure_logging
from channel_partners.logging.logging_signals import (
    bind_additional_request_metadata,
)
from channel_partners.utils import standardize_path


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
        assert any("request_finished" in log.message for log in logs)

        # Check if the IP address is logged
        assert any("ip" in log.message for log in logs)


@pytest.mark.django_db
class TestBindAdditionalRequestMetadata:
    @patch('channel_partners.logging.logging_signals.structlog.contextvars.bind_contextvars')
    def test_bind_additional_request_metadata(self, mock_bind_contextvars):
        # Set cache
        caches['local'].set_many({"/test/path": "test-path"})

        # Mock HttpRequest
        request = MagicMock(spec=HttpRequest)
        request.path = '/test/path'
        request.method = 'GET'

        # Expected normalized path
        expected_normalized_path = standardize_path(request.path)

        # Call the signal receiver function
        bind_additional_request_metadata(request, logger=None)

        # Assert that bind_contextvars was called with expected arguments
        mock_bind_contextvars.assert_called_once_with(
            path='/test/path',
            normalized_path=expected_normalized_path,
            method='GET'
        )

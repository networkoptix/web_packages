import io
import sys
from datetime import datetime
from typing import Literal
from unittest.mock import (
    MagicMock,
    patch,
)

import pytest
from django.core.cache import caches
from django.db import connection
from django.http import HttpRequest
from django.test import (
    Client,
    override_settings,
)
from django.test.utils import CaptureQueriesContext
from waffle.models import Switch

from channel_partners import settings
from channel_partners.configuration.logging_config import (
    LOGGER_ROOT_NAME,
    configure_logging,
)
from channel_partners.logging.logging_signals import (
    bind_additional_request_metadata,
)
from channel_partners.logging.middleware import DebugLevelFilter
from channel_partners.utils import standardize_path


mock_cache = MagicMock()
mock_cache.get.return_value = None

import logging


def setup_test_logging(env: Literal["local", "ci", "prod"], min_level: int):
    configure_logging(env, min_level)


@pytest.fixture()
def root_logger():
    return logging.getLogger(LOGGER_ROOT_NAME)


@patch.dict('django.core.cache.caches', {'waffle-local': mock_cache, 'waffle-redis': mock_cache})
@pytest.mark.django_db
def test_logging_level_default_from_environment(root_logger):
    client = Client()
    # setup_test_logging("local", settings.MIN_LOGGING_LEVEL)

    response = client.get('/DOES-NOT-EXIST')
    actual = next(
        filter
        for filter in logging.getLogger(LOGGER_ROOT_NAME).filters
        if isinstance(filter, DebugLevelFilter)
    ).level

    expected = logging.DEBUG
    assert actual == expected


@patch.dict('django.core.cache.caches', {'waffle-local': mock_cache, 'waffle-redis': mock_cache})
@patch('channel_partners.settings.REDIS_WAFFLE_TIMEOUT', 0)
@pytest.mark.django_db
def test_logging_level_updated_when_switch_active( root_logger):
    client = Client()
    # setup_test_logging("local", settings.MIN_LOGGING_LEVEL)

    switch = Switch.objects.get(name="logging_debug_active")
    switch.active = True
    switch.save()



    response = client.get('/DOES-NOT-EXIST')

    actual = next(
        filter for filter in logging.getLogger(LOGGER_ROOT_NAME).filters if isinstance(filter, DebugLevelFilter)
    ).level

    expected = logging.DEBUG


class TestStructuredLogging:
    @patch.dict('django.core.cache.caches', {'waffle-local': mock_cache, 'waffle-redis': mock_cache})
    @patch('waffle.switch_is_active', return_value=True, clear=True)  # Debug
    @override_settings(ENV_NAME='local')
    @pytest.mark.django_db
    def test_structured_logging_404_local(self, mock_switch_is_active, caplog):
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

    @patch.dict('django.core.cache.caches', {'waffle-local': mock_cache, 'waffle-redis': mock_cache})
    @patch('waffle.switch_is_active', return_value=True, clear=True)  # Info
    @override_settings(ENV_NAME='prod')
    @pytest.mark.django_db
    def test_structured_logging_404_prod_or_ci(self, mock_switch_is_active, caplog):
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


@pytest.mark.django_db
class TestRequestFinishedLogs:
    @override_settings(ENV_NAME='local')
    @pytest.mark.django_db
    def test_request_finished_logs_404(self, caplog):
        min_level = settings.MIN_LOGGING_LEVEL
        caplog.set_level(min_level)
        capturedOutput = io.StringIO()
        sys.stdout = capturedOutput

        setup_test_logging("local", min_level)

        client = Client()
        response = client.get('/')

        # Check the status code of the response
        assert response.status_code == 404
        logs = caplog.records

        # Ensure at least one log record exists
        assert len(logs) > 0

        # Find the 'request_finished' log entry
        request_finished_log = next((log for log in logs if "request_finished" in log.message), None)
        assert request_finished_log is not None

        # Assuming log.msg contains the dictionary directly
        log_data = request_finished_log.msg

        # Assert each key-value pair
        assert log_data.get('code') == 404
        assert log_data.get('request') == 'GET /'
        assert log_data.get('event') == 'request_finished'
        assert log_data.get('cloud_host') is not None
        assert log_data.get('path') == '/'
        assert log_data.get('user_id') is None
        assert log_data.get('method') == 'GET'
        assert log_data.get('ip') is not None
        assert log_data.get('db_queries') == 0
        assert log_data.get('request_duration_ms') > 0
        assert log_data.get('cps_cache') is None
        assert log_data.get('request_id') is not None
        assert log_data.get('normalized_path') == '/'
        assert log_data.get('logger') == 'django_structlog.middlewares.request'
        assert log_data.get('level') in ['debug', 'info']

        timestamp = log_data.get('timestamp')
        try:
            parsed_timestamp = datetime.fromisoformat(timestamp.rstrip("Z"))
            assert True  # Parsing succeeded
        except ValueError:
            assert False, f"Timestamp {timestamp} is not parsable."

    @override_settings(ENV_NAME='local')
    def test_request_finished_logs_200(
            self,
            caplog,
            django_capture_on_commit_callbacks
    ) -> None:

        # Test setup
        min_level = settings.MIN_LOGGING_LEVEL
        caplog.set_level(min_level)
        capturedOutput = io.StringIO()
        sys.stdout = capturedOutput

        setup_test_logging("local", min_level)

        # Capture database queries
        with CaptureQueriesContext(connection) as queries:
            # Make request to openapi documentation
            client = Client()
            response = client.get("/partners/#/")

        logs = caplog.records

        # Check the status code of the response
        assert response.status_code == 200

        request_finished_log = next((log for log in logs if "request_finished" in log.message), None)
        assert request_finished_log is not None

        log_data = request_finished_log.msg
        assert log_data.get('db_queries') == 3

    @override_settings(ENV_NAME='local')
    def test_request_to_view_with_db_queries(
            self,
            caplog,
            django_capture_on_commit_callbacks,
            channel_partner_factory,
            cp_user_factory
    ) -> None:

        # Test setup
        min_level = settings.MIN_LOGGING_LEVEL
        caplog.set_level(min_level)
        capturedOutput = io.StringIO()
        sys.stdout = capturedOutput

        setup_test_logging("local", min_level)

        # Capture database queries
        with django_capture_on_commit_callbacks(execute=True) as callbacks:
            cp = channel_partner_factory()
            cp_admin = cp_user_factory(channel_partner=cp)

        with CaptureQueriesContext(connection) as queries:
            client = Client()
            response = client.get("/partners/api/v2/organization_roles")

        logs = caplog.records

        # Check the status code of the response
        assert response.status_code == 200

        request_finished_log = next((log for log in logs if "request_finished" in log.message), None)
        assert request_finished_log is not None

        log_data = request_finished_log.msg
        assert log_data.get('db_queries') == 5


@pytest.mark.django_db
class TestBindAdditionalRequestMetadata:
    @patch('channel_partners.logging.logging_signals.structlog.contextvars.bind_contextvars')
    @patch.dict('django.core.cache.caches', {'waffle-local': mock_cache, 'waffle-redis': mock_cache})
    def test_bind_additional_request_metadata(self, mock_bind_contextvars):
        # Set cache
        caches['waffle-local'].set_many({"/test/path": "test-path"})

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

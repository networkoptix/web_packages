import io
import sys
from datetime import datetime
from typing import Literal
from unittest.mock import (
    MagicMock,
    patch,
)

import pytest
import structlog
from django.core.cache import caches
from django.db import connection
from django.http import HttpRequest
from django.test import (
    Client,
    override_settings,
)
from django.test.utils import CaptureQueriesContext
from django.urls import path
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.decorators import action
from rest_framework.mixins import (
    ListModelMixin,
    RetrieveModelMixin,
)
from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import GenericViewSet
from waffle.models import Switch

from channel_partners import settings
from channel_partners.configuration.logging_config import configure_logging
from channel_partners.logging.logging_signals import (
    bind_additional_request_metadata,
)
from channel_partners.logging.middleware import DebugLevelFilter
from channel_partners.utils import standardize_path
from partners.authentication import NxCloudOauthTokenAuthentication
from partners.filters import CreatedTsAndIdAndNameFilter
from partners.models import CloudUser
from partners.tests.services.caching.test_dependent_view_cache import (
    CloudUserSerializer,
)
from partners.views.v2.views import DefaultPagination


mock_cache = MagicMock()
mock_cache.get.return_value = None

import logging


logger = structlog.get_logger()


def function_that_fails():
    try:
        raise ValueError("This is an intentional error for testing purposes")
    except ValueError as e:
        logger.error(
            "An error occurred in function_that_fails",
            error=str(e),
            exc_info=True
        )
        raise


def setup_test_logging(env: Literal["local", "ci", "prod"], min_level: int):
    configure_logging(env, min_level)


@pytest.fixture()
def root_logger():
    return logging.getLogger("")


def setup_test_logging(env: Literal["local", "ci", "prod"], min_level: int):
    configure_logging(env, min_level)


class DemoViewSet(ListModelMixin, RetrieveModelMixin, GenericViewSet):
    authentication_classes = (NxCloudOauthTokenAuthentication,)
    http_method_names = ['get']
    serializer_class = CloudUserSerializer
    permission_classes = (IsAuthenticated,)
    queryset = CloudUser.objects.all()
    pagination_class = DefaultPagination
    filter_backends = [DjangoFilterBackend]
    filterset_class = CreatedTsAndIdAndNameFilter

    @action(detail=False, methods=['get'])
    def trigger_error(self, request, *args, **kwargs):
        raise Exception("This is a test exception to trigger a 500 error")


urlpatterns = [
    path('partners/test/trigger_error/', DemoViewSet.as_view({'get': 'trigger_error'}), name='test-trigger-error'),
]


@pytest.fixture
def cache_cleared():
    caches['default'].clear()
    caches['local'].clear()
    caches['dependent_cache'].clear()


@pytest.fixture
def temporary_urlconf():
    from django.conf import settings
    original_urlconf = settings.ROOT_URLCONF
    settings.ROOT_URLCONF = __name__
    yield
    settings.ROOT_URLCONF = original_urlconf


class TestStructuredLogging500:
    def test_structured_logging_500(
            self,
            cloud_user_factory,
            cloud_test_host,
            mock_auth_with_user,
            temporary_urlconf,
            caplog):
        """
        Test that a request generating a 500 status logs a request_failed event.
        """
        user = cloud_user_factory(email="asdsadsadas@aol.com")
        mock_auth_with_user(user)
        id: int = 1
        headers = {
            'X-Original-Host': cloud_test_host.hostname,
            'Accept': 'application/json'
        }
        min_level = settings.MIN_LOGGING_LEVEL
        caplog.set_level(min_level)
        capturedOutput = io.StringIO()
        sys.stdout = capturedOutput

        setup_test_logging("local", min_level)

        client = Client()
        try:
            response = client.get('/partners/test/trigger_error/', headers=headers)
        except Exception as e:
            logging.error("request_failed", exc_info=e)
            response = None

        logs = caplog.records

        # Ensure at least one log record exists
        assert len(logs) > 0

        # Find the 'request_failed' log entry
        request_failed_log = next((log for log in logs if "request_failed" in log.message), None)
        assert request_failed_log is not None

        # Assuming log.msg contains the dictionary directly
        log_data = request_failed_log.msg

        # Assert each key-value pair
        assert log_data.get('event') == 'request_failed'
        assert log_data.get('db_queries', None) is not None
        assert log_data.get('request_duration_ms') > 0


@patch.dict('django.core.cache.caches', {'waffle-local': mock_cache, 'waffle-redis': mock_cache})
@pytest.mark.django_db
def test_logging_level_default_from_environment(root_logger):
    actual = next(
        filter
        for filter in logging.getLogger("").filters
        if isinstance(filter, DebugLevelFilter)
    ).level

    # Even though we have it set to DEBUG in the settings,
    # the value we have in waffle is set to False, so it should be INFO, which overrides the settings value
    expected = logging.INFO
    assert actual == expected


@patch.dict('django.core.cache.caches', {'waffle-local': mock_cache, 'waffle-redis': mock_cache})
@patch('channel_partners.settings.REDIS_WAFFLE_TIMEOUT', 0)
@pytest.mark.django_db
def test_logging_level_updated_when_switch_active(root_logger):
    client = Client()
    # setup_test_logging("local", settings.MIN_LOGGING_LEVEL)

    switch = Switch.objects.get(name="logging_debug_active")
    switch.active = True
    switch.save()

    response = client.get('/DOES-NOT-EXIST')

    actual = next(
        filter for filter in logging.getLogger("").filters if isinstance(filter, DebugLevelFilter)
    ).level

    expected = logging.DEBUG


def test_function_that_fails_logs_exception(caplog):
    with pytest.raises(ValueError, match="This is an intentional error for testing purposes"):
        function_that_fails()

    # Ensure that at least one log record was created
    assert len(caplog.records) > 0

    # Iterate through captured records to find the relevant one
    for record in caplog.records:
        if record.levelname == "ERROR" and "An error occurred in function_that_fails" in record.message:
            log_record = record
            break
    else:
        pytest.fail("Expected log record not found")

    # Verify the details of the log record
    assert log_record.levelname == "ERROR"
    assert "An error occurred in function_that_fails" in log_record.message
    assert "This is an intentional error for testing purposes" in log_record.message

    # Ensure traceback is included in the log text
    assert "Traceback (most recent call last)" in caplog.text


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

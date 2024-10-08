import pytest
from itertools import chain, zip_longest
from uuid import uuid4
from unittest.mock import call

from api.management.commands.healthcheck import *


def plan_in_progress():
    start = 0
    for in_progress in range(start, MINUTES):
        yield [migration for migration in range(in_progress + 1)]


import pytest
from itertools import chain, zip_longest
from uuid import uuid4
from unittest.mock import call

from api.management.commands.healthcheck import *


class TestHealthCheck:
    def test_handle(self, mocker):
        deployment_cache = caches['deployment']
        mocker.patch.object(time, 'sleep')
        mock_migration_executor = mocker.patch.object(
            executor, 'MigrationExecutor')
        mock_exit = mocker.patch.object(
            sys, 'exit')
        mock_log_info = mocker.patch.object(
            logger, 'info')
        mock_log_error = mocker.patch.object(
            logger, 'error')
        instance = Command()
        deployment_cache.set(
            DEPLOYMENT_READY, True)

        # Test fails if pending migrations after 10 minutes
        plan_states = plan_in_progress()
        expected_log_iteration = [
            call('health_check_iteration', iteration=minute, total_iterations=MINUTES, pending_migrations=minute + 1)
            for minute in range(MINUTES)]
        expected_log_info = [
            call('health_check_start'),
            *expected_log_iteration
        ]
        mock_migration_executor.return_value.migration_plan = lambda _: next(
            plan_states)

        instance.handle()
        assert deployment_cache.get(DEPLOYMENT_READY)
        mock_log_info.assert_has_calls(expected_log_info)
        mock_log_error.assert_called_once_with(
            'migration_error', error='Something went wrong with migrations')
        mock_exit.assert_called_once_with(1)

        # Test successful health check
        mock_migration_executor.return_value.migration_plan = lambda _: []

        instance.handle()
        mock_log_info.assert_has_calls([
            call('health_check_start'),
            call('health_check_iteration', iteration=0, total_iterations=MINUTES, pending_migrations=0),
            call('health_check_complete', iteration=0, total_iterations=MINUTES)
        ])
        mock_exit.assert_called_with(0)

import pytest
from itertools import chain, zip_longest
from uuid import uuid4
from unittest.mock import call

from api.management.commands.healthcheck import *


def plan_in_progress():
    start = 1
    for in_progress in range(start, MINUTES + start):
        yield [migration for migration in range(in_progress)]


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
            f'Iteration: {minute} of {MINUTES}'
            for minute in range(MINUTES)]
        expected_log_pending = [
            f"Pending migrations: {minute + 1}"
            for minute in range(MINUTES)]
        expected_log_info = [
            message for message in chain.from_iterable(
                zip_longest(['Begin health check'], expected_log_iteration, expected_log_pending))
                if message]
        mock_migration_executor.return_value.migration_plan = lambda _: next(
            plan_states)

        instance.handle()
        assert deployment_cache.get(DEPLOYMENT_READY)
        expected_calls = [call(message)
            for message in expected_log_info]
        mock_log_info.assert_has_calls(expected_calls)
        mock_log_error.assert_called_once_with(
            'Something went wrong with migrations. Please notify the web team')
        mock_exit.assert_called_once_with(1)

        # Test successful health check
        mock_migration_executor.return_value.migration_plan = lambda _: []

        instance.handle()
        mock_log_info.assert_has_calls([
            call('Health check complete'),
            call(f"Iteration: 0 of {MINUTES}")
        ])
        mock_exit.assert_called_with(0)

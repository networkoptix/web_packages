import pytest
from uuid import uuid4
from unittest.mock import call

from api.management.commands.cleanaccesslog import *


class TestCleanAccessLog:
    def test_handle(self, mocker):
        instance = Command()
        current_time = datetime.now()
        days = settings.CLEAR_HISTORY_RECORDS_OLDER_THAN_X_DAYS
        expected_cutoff = current_time - timedelta(days)
        mocker.patch(
            'api.management.commands.cleanaccesslog.current_time', return_value=current_time)
        mock_filter = mocker.patch.object(
            AccountLoginHistory.objects, 'filter')
        mock_write_std_out = mocker.patch.object(
            instance.stdout, 'write')

        instance.handle()
        mock_filter.assert_called_once_with(
            date__lt=expected_cutoff)
        mock_filter.return_value.delete.assert_called_once_with()
        mock_write_std_out.assert_called_once_with(
            instance.style.SUCCESS(
                f'Successfully deleted task results and messages older than {days} days'))

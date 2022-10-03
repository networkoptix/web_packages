import pytest

from notifications.management.commands.cleanoldemails import *
from model_bakery import baker

class TestCleanOldEmails:

    def test_properties(self):
        assert Command.help == f'Cleans out django tasks results and messages older than {settings.CLEAR_HISTORY_RECORDS_OLDER_THAN_X_DAYS} days'

    def test_handle(self, db, mocker):
        instance = Command()
        mock_write_std_out = mocker.patch.object(instance.stdout, 'write')
        cutoff_plus_one = datetime.now() - timedelta(days=(settings.CLEAR_HISTORY_RECORDS_OLDER_THAN_X_DAYS + 1))
        # These models won't get deleted
        baker.make(TaskResult)
        baker.make(Message)
        # mock the auto_now added time in TaskResult's date_done field
        mocker.patch('django.utils.timezone.now', return_value=cutoff_plus_one)
        deleted_task = baker.make(TaskResult)
        deleted_message = baker.make(Message, send_date=cutoff_plus_one)
        instance.handle()
        all_task_results = TaskResult.objects.all()
        all_messages = Message.objects.all()

        mock_write_std_out.assert_called_once_with(instance.style.SUCCESS( 
            f'Successfully deleted task results and messages older than { settings.CLEAR_HISTORY_RECORDS_OLDER_THAN_X_DAYS} days'))
        # Assert the created models were deleted for being too old
        assert all_task_results.count() == 1
        assert all_messages.count() == 1
        assert deleted_task not in all_task_results
        assert deleted_message not in all_messages
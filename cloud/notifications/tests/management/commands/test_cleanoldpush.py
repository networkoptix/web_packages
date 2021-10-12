from django.db.models.query import QuerySet
import pytest
from uuid import uuid4

from notifications.management.commands.cleanoldpush import *
from model_bakery import baker

class TestCleanOldPush:

    def test_properties(self):
        assert Command.help == f'Cleans out push notifications sent more than {settings.CLEAR_HISTORY_RECORDS_OLDER_THAN_X_DAYS} days ago' \
           f' or created more than {settings.CLEAR_HISTORY_RECORDS_CREATED_OLDER_THAN_X_DAYS} days ago.'

    def test_handle(self, db, mocker):
        instance = Command()
        mock_write_std_out = mocker.patch.object(instance.stdout, 'write')
        cutoff_send_plus_one = datetime.now() - timedelta(days=(settings.CLEAR_HISTORY_RECORDS_OLDER_THAN_X_DAYS + 1))
        cutoff_created_plus_one =  datetime.now() - timedelta(days=(settings.CLEAR_HISTORY_RECORDS_CREATED_OLDER_THAN_X_DAYS + 1))
        baker.make(PushNotification, raw_system_id=str(uuid4()), raw_targets=str(uuid4()))
        # mock auto_now added time in PushNotification's created_date field
        mocker.patch('django.utils.timezone.now', return_value=cutoff_created_plus_one)
        deleted_notification_one = baker.make(PushNotification, raw_system_id=str(uuid4()), raw_targets=str(uuid4()))
        deleted_notification_two = baker.make(PushNotification, send_date=cutoff_send_plus_one, raw_system_id=str(uuid4()), raw_targets=str(uuid4()))
        instance.handle()
        push_notifications = PushNotification.objects.all()

        # Test that both send_date and created_date being too old properly deletes PushNotifications
        assert push_notifications.count() == 1
        assert deleted_notification_one not in push_notifications
        assert deleted_notification_two not in push_notifications
        mock_write_std_out.assert_called_once_with(instance.style.SUCCESS(
            f'Successfully deleted push notifications sent more than {settings.CLEAR_HISTORY_RECORDS_OLDER_THAN_X_DAYS}'
            f' days ago or created more than {settings.CLEAR_HISTORY_RECORDS_CREATED_OLDER_THAN_X_DAYS} days ago.'
        ))

        # Test that chunked_queryset is called and deletes chunks
        mock_chunked_queryset = mocker.patch('notifications.management.commands.cleanoldpush.chunked_queryset', return_value=[PushNotification.objects.all()])
        instance.handle()
        args, kwargs = mock_chunked_queryset.call_args_list[0]
        assert isinstance(args[0], QuerySet)
        assert args[1] == 30000
        assert PushNotification.objects.all().count() == 0

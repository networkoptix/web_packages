from django.core.management.base import BaseCommand

from ...models import *
from datetime import datetime, timedelta


class Command(BaseCommand):
    help = f'Cleans out push notifications sent more than {settings.CLEAR_HISTORY_RECORDS_OLDER_THAN_X_DAYS} days ago' \
           f' or created more than {settings.CLEAR_HISTORY_RECORDS_CREATED_OLDER_THAN_X_DAYS} days ago.'

    def handle(self, *args, **options):
        cutoff_date = datetime.now() - timedelta(days=settings.CLEAR_HISTORY_RECORDS_OLDER_THAN_X_DAYS)
        cutoff_date_created = datetime.now() - timedelta(days=settings.CLEAR_HISTORY_RECORDS_CREATED_OLDER_THAN_X_DAYS)
        PushNotification.objects.filter(send_date__lt=cutoff_date).delete()
        PushNotification.objects.filter(created_date__lt=cutoff_date_created).delete()
        self.stdout.write(self.style.SUCCESS(
            f'Successfully deleted push notifications sent more than {settings.CLEAR_HISTORY_RECORDS_OLDER_THAN_X_DAYS}'
            f' days ago or created more than {settings.CLEAR_HISTORY_RECORDS_CREATED_OLDER_THAN_X_DAYS} days ago.'
        ))

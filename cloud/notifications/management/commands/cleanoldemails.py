from datetime import datetime, timedelta

from django.conf import settings
from django.core.management.base import BaseCommand
from django_celery_results.models import TaskResult

from ...models import Message


class Command(BaseCommand):
    help = f'Cleans out django tasks results and messages older than {settings.CLEAR_HISTORY_RECORDS_OLDER_THAN_X_DAYS} days'

    def handle(self, *args, **options):
        cutoff_date = datetime.now() - timedelta(days=settings.CLEAR_HISTORY_RECORDS_OLDER_THAN_X_DAYS)
        TaskResult.objects.filter(date_done__lt=cutoff_date).delete()
        Message.objects.filter(send_date__lt=cutoff_date).delete()
        self.stdout.write(self.style.SUCCESS(
            f'Successfully deleted task results and messages older than {settings.CLEAR_HISTORY_RECORDS_OLDER_THAN_X_DAYS} days'))

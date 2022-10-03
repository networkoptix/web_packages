from datetime import datetime, timedelta

from django.conf import settings
from django.core.management.base import BaseCommand

from api.models import AccountLoginHistory


def current_time():
    return datetime.now()


class Command(BaseCommand):
    days = settings.CLEAR_HISTORY_RECORDS_OLDER_THAN_X_DAYS
    help = f'Cleans out access log older than {days} days'

    def handle(self, *args, **options):
        cutoff_date = current_time() - timedelta(days=self.days)
        AccountLoginHistory.objects.filter(date__lt=cutoff_date).delete()
        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully deleted task results and messages older than {self.days} days'))

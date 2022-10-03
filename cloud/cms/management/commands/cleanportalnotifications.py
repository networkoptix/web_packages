from datetime import datetime, timedelta
from django.core.management.base import BaseCommand
from django.db.models import Q
from django.conf import settings

from cms.models import PortalNotification


class Command(BaseCommand):
    help = 'Cleans portal notifications over two weeks old or targeting old build version'

    def handle(self, *args, **options):
        current_build = settings.VERSION
        two_weeks = datetime.now() - timedelta(weeks=2)
        self.stdout.write(
            f'Cleaning old portal notifications for build: {current_build}')
        old_notifications = PortalNotification.objects.filter(
            Q(build_raw__lt=PortalNotification.calc_build(current_build), build_raw__isnull=False) | Q(max_ts__lt=two_weeks, max_ts__isnull=False))
        for notification in old_notifications:
            build = f" - Build: {build}" if (build := notification.build) else ''
            max_ts = f" - Max TS: {max_ts}" if (max_ts := notification.max_ts) else ''
            self.stdout.write(f'Deleting: {notification.title}{build}{max_ts}')
        
        count, _ = old_notifications.delete()

        self.stdout.write(self.style.SUCCESS(
            f'Cleaned {count} portal notifications'))

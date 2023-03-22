import os
import sys
from datetime import datetime

from django.core.management.base import BaseCommand

from notifications.models import Message


class Command(BaseCommand):
    help = f'Checks if we have unsent emails. ' \
           f'If we do log the number of unset emails. ' \
           f'If that time is over a certain threshold exit 1 to restart the module via infra'

    def handle(self, *args, **options):
        EMAIL_WAIT_TIME_THRESHOLD = int(os.getenv('EMAIL_WAIT_TIME_THRESHOLD', '60'))
        exit_code = 0
        now = datetime.now()

        unsent_emails_for_today = Message.objects.filter(created_date=now.date(), send_date=None)
        unsent_emails_for_today_count = unsent_emails_for_today.count()

        if unsent_emails_for_today_count > 0:
            if last_sent_email := Message.objects.filter(send_date__isnull=False).order_by('send_date').last():
                time_for_last_email = int((now - last_sent_email.send_date).total_seconds())
                exit_code = EMAIL_WAIT_TIME_THRESHOLD < time_for_last_email
            else:
                oldest_waiting_email = unsent_emails_for_today.order_by('created_date').first()
                waiting_time_for_oldest_email = int((now - oldest_waiting_email.first().create_date).total_seconds())
                exit_code = EMAIL_WAIT_TIME_THRESHOLD < waiting_time_for_oldest_email
            msg = f"Emails are in queue and are {'not ' if exit_code else ''}being sent. " \
                  f"The queue currently has {unsent_emails_for_today_count} unsent emails."
            log_message = self.style.WARNING(msg) if not exit_code else self.style.ERROR(msg)
        else:
            log_message = self.style.SUCCESS('No emails in queue!')

        self.stdout.write(log_message)
        sys.exit(exit_code)

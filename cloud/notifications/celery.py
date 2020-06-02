import os
import logging

from celery import Celery
from celery.schedules import crontab
from django.conf import settings  # noqa
from django.core.management import call_command

# set the default Django settings module for the 'celery' program.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cloud.settings')

logger = logging.getLogger(__name__)

app = Celery('notifications')

# Using a string here means the worker will not have to
# pickle the object when using Windows.
app.config_from_object('django.conf:settings')
app.autodiscover_tasks(lambda: settings.INSTALLED_APPS)


@app.on_after_finalize.connect
def setup_periodic_tasks(sender, **kwargs):
    logger.info("Setting up periodic tasks")
    sender.add_periodic_task(crontab(hour=0, minute=0, day_of_month='1'),
                             clean_logs.s(), name="clean logs", queue='broadcast-notifications')


@app.task(bind=True)
def debug_task(self):
    print(f'Request: {repr(self.request)}')


@app.task
def clean_logs():
    logger.warning("About to clean stuff")
    logger.info('Cleaning sessions from last month')
    call_command('clearsessions')
    logger.info('Cleaning emails from last month')
    call_command('cleanoldemails')
    logger.info('Cleaning access logs from last month')
    call_command('cleanaccesslog')

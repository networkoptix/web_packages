import os
import logging

from celery import Celery, signals
from celery.schedules import crontab
from django.conf import settings  # noqa
from django.core.management import call_command

# set the default Django settings module for the 'celery' program.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cloud.settings')

logger = logging.getLogger(__name__)

app = Celery('notifications')

# Using a string here means the worker will not have to
# pickle the object when using Windows.
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks(lambda: settings.INSTALLED_APPS)


@app.on_after_finalize.connect
def setup_periodic_tasks(sender, **kwargs):
    logger.info("Setting up periodic tasks")
    sender.add_periodic_task(crontab(hour=0, minute=0, day_of_month='1'),
                             clean_logs.s(), name="clean logs", queue='broadcast-notifications')
    sender.add_periodic_task(crontab(hour=0, minute=0, day_of_week='tue'),
                             clean_push_logs.s(), name="clean push logs", queue='broadcast-notifications')
    sender.add_periodic_task(crontab(hour=0, minute=0, day_of_week='wed'),
                             clean_old_portal_notifications.s(), name="clean push logs", queue='portal-notifications')


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


@app.task
def clean_push_logs():
    logger.info('Cleaning push notifications from last month')
    call_command('cleanoldpush')


@app.task
def clean_old_portal_notifications():
    logger.info(
        'Cleaning portal notifications over two weeks old or targeting old build version')
    call_command('cleanportalnotifications')


@signals.after_setup_logger.connect
def setup_logger(logger, format, *args, **kwargs):
    sh = logger.handlers[0]
    formatter = logging.Formatter(
        '[%(levelname)s] %(processName)s %(asctime)s %(module)s %(process)d %(thread)d %(message)s')
    sh.setFormatter(formatter)

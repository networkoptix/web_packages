import os
import logging
from logging.config import dictConfig

from celery import Celery, shared_task
from celery.schedules import crontab
from celery.signals import setup_logging
from django.conf import settings  # noqa
from django.core.management import call_command
from django_structlog.celery.steps import DjangoStructLogInitStep

# set the default Django settings module for the 'celery' program.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cloud.settings')

logger = logging.getLogger(__name__)

app = Celery('notifications')

# Using a string here means the worker will not have to
# pickle the object when using Windows.
app.config_from_object('django.conf:settings', namespace='CELERY')
app.steps["worker"].add(DjangoStructLogInitStep)
app.autodiscover_tasks(lambda: settings.INSTALLED_APPS)

@setup_logging.connect
def receiver_setup_logging(loglevel, logfile, format, colorize, **kwargs):
    dictConfig(settings.LOGGING)

@app.on_after_finalize.connect
def setup_periodic_tasks(sender, **kwargs):
    import structlog
    logger = structlog.getLogger(__name__)
    logger.info('periodic_tasks_setup', processes=[
        "clean_logs",
        "clean_push_logs",
        "clean_old_portal_notifications",
        "update_ipvd"
    ])
    sender.add_periodic_task(crontab(hour=0, minute=0, day_of_month='1'),
                             clean_logs.s(), name="clean logs", queue='celery')
    sender.add_periodic_task(crontab(hour=0, minute=0, day_of_week='tue'),
                             clean_push_logs.s(), name="clean push logs", queue='celery')
    sender.add_periodic_task(crontab(hour=0, minute=0, day_of_week='wed'),
                             clean_old_portal_notifications.s(), name="clean old portal notifications", queue='celery')
    sender.add_periodic_task(crontab(hour='*/6', minute=0), update_ipvd.s(),
                             name="update ipvd", queue='celery',
                             kwargs={'force': False})


@app.task(bind=True)
def debug_task(self):
    print(f'Request: {repr(self.request)}')


@app.task
def clean_logs():
    import structlog
    logger = structlog.getLogger(__name__)
    logger.warning("cleaning_start")
    logger.info('cleaning_sessions')
    call_command('clearsessions', period='last month')
    logger.info('cleaning_emails')
    call_command('cleanoldemails')
    logger.info('cleaning_access_logs')
    call_command('cleanaccesslog')


@app.task
def clean_push_logs():
    import structlog
    logger = structlog.getLogger(__name__)
    logger.info("cleaning_push_notifications")
    call_command('cleanoldpush')


@app.task
def clean_old_portal_notifications():
    import structlog
    logger = structlog.getLogger(__name__)
    logger.info('cleaning_portal_notifications')
    call_command('cleanportalnotifications')


@shared_task
def update_ipvd(force=True, ignore_errors=True):
    import structlog
    logger = structlog.getLogger(__name__)
    from util.ipvd_storage import IPVDS3Upload
    logger.info("updating_ipvd")
    storage = IPVDS3Upload()
    try:
        filename = storage.update_ipvd_data(force=False)
    except Exception as e:
        if ignore_errors:
            # Skip update on error
            logger.warning("ipvd_update_error", error=str(e), exc_info=True)
            return
        raise e
    return filename

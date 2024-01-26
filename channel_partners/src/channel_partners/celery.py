import logging
import os

import structlog
from celery import Celery
from celery.schedules import crontab
from celery.signals import setup_logging
from django.conf import settings
from django_structlog.celery.steps import DjangoStructLogInitStep


# set the default Django settings module for the 'celery' program.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'channel_partners.settings')

app = Celery('channel_partners')
# Using a string here means the worker will not have to
# pickle the object when using Windows.
app.config_from_object('django.conf:settings', namespace='CELERY')
app.steps["worker"].add(DjangoStructLogInitStep)
app.autodiscover_tasks(lambda: settings.INSTALLED_APPS)


@setup_logging.connect
def receiver_setup_logging(loglevel, logfile, format, colorize, **kwargs):
    logging.config.dictConfig(settings.LOGGING)


logger = structlog.getLogger(__name__)


@app.on_after_finalize.connect
def setup_periodic_tasks(sender, **kwargs):
    logger.info("Setting up periodic tasks")
    sender.add_periodic_task(
        crontab(minute='*/10'),
        heartbeat.s('heartbeat task'),
        name="celery heart beat", queue='celery'
    )


@app.task
def heartbeat(task_name):
    logger.info(f"Heartbeat {task_name}")

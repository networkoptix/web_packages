import logging
import os

from celery import Celery
from celery.schedules import crontab
from django.conf import settings


logger = logging.getLogger(__name__)

# set the default Django settings module for the 'celery' program.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'channel_partners.settings')

app = Celery('channel_partners')

# Using a string here means the worker will not have to
# pickle the object when using Windows.
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks(lambda: settings.INSTALLED_APPS)


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

from celery.schedules import crontab


CELERY_CRON_CONFIG = {
    "partners.tasks.services.check_expired_services_task": {
        "task": "partners.tasks.services.check_expired_services_task",
        "schedule": crontab(minute='5', hour="*/12"),
    },
    "partners.tasks.cloud_user_full_name.update_cloud_users_full_name": {
        "task": "partners.tasks.cloud_user_full_name.update_cloud_users_full_name",
        "schedule": crontab(minute='10', hour="*/3")
    }
}
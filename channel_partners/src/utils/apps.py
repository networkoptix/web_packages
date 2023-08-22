from django.apps import AppConfig
from django.conf import settings


class UtilsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'utils'

    def ready(self):
        from channel_partners.tools.check_imports import check
        check()

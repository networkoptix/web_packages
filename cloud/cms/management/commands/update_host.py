import logging

from django.conf import settings
from django.core.management.base import BaseCommand

from cms.models import Customization
from util.config import get_config

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    def handle(self, *args, **options):
        current_customization = Customization.objects.filter(name=settings.CUSTOMIZATION).first()
        if current_customization:
            conf = get_config()
            host = conf["cloud_portal"]["url"].lstrip('https://').lstrip('http://')
            if current_customization.host != host:
                current_customization.host = host
                current_customization.save()
                self.stdout.write(self.style.SUCCESS(f'Host for {settings.CUSTOMIZATION} updated to {host}'))
            else:
                self.stdout.write(self.style.SUCCESS(f'Host for {settings.CUSTOMIZATION} already correct as {host}'))
        else:
            self.stdout.write(self.style.ERROR(f'Customization object for {settings.CUSTOMIZATION} not found'))

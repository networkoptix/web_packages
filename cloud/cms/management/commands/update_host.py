import logging

from django.conf import settings
from django.core.management.base import BaseCommand

from cms.models import Customization
from util import config

logger = logging.getLogger(__name__)


def get_customization():
    return settings.CUSTOMIZATION


class Command(BaseCommand):
    def handle(self, *args, **options):
        customization = get_customization()
        current_customization = Customization.objects.filter(
            name=customization).first()
        if current_customization:
            conf = config.get_config()
            host = conf["cloud_portal"]["url"].lstrip(
                'https://').lstrip('http://')
            if current_customization.host != host:
                current_customization.host = host
                current_customization.save()
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Host for {customization} updated to {host}'))
            else:
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Host for {customization} already correct as {host}'))
        else:
            self.stdout.write(
                self.style.ERROR(
                    f'Customization object for {customization} not found'))

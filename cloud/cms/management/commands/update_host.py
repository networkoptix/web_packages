import logging

from django.conf import settings
from django.core.management.base import BaseCommand

from cms.models import Customization
from util import config


logger = logging.getLogger(__name__)


class Command(BaseCommand):
    def add_arguments(self, parser):
        parser.add_argument(
            '--customization', nargs='?', default='default', type=str)

    def handle(self, *args, **options):
        customization = options['customization']
        current_customization = Customization.objects.filter(
            name=customization).first()
        if current_customization:
            conf = config.get_config()
            host = conf["cloud_portal"]["url"]
            if host.startswith('http://'):
                host = host[7:]
            elif host.startswith('https://'):
                host = host[8:]

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

import logging

from django.conf import settings
from django.core.management.base import BaseCommand

from cms.controllers import structure
from cms.models import Customization, Language
from util import config


logger = logging.getLogger(__name__)


class Command(BaseCommand):
    def add_arguments(self, parser):
        parser.add_argument(
            '--customization', nargs='?', type=str)
        parser.add_argument(
            '--host', nargs='?', type=str)

    def handle(self, *args, **options):
        customization = options['customization']
        conf = config.get_config()
        host = conf["cloud_portal"]["url"]
        host = options.get('host', host)
        current_customization = Customization.objects.filter(
            name=customization).first()

        if not current_customization:
            en_us = Language.objects.get(code="en_US")
            current_customization = Customization(
                name=customization, default_language=en_us)
            current_customization.save()
            current_customization.languages.add(en_us)
            current_customization.save()

            structure.find_or_add_asset_with_single_customization(
                'Cloud Portal', current_customization, 'cloud_portal', '')

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

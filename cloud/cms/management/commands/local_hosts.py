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
        if not settings.LOCAL_ENVIRONMENT:
            self.stdout.write(self.style.SUCCESS(f"Command 'local_hosts' can be used localy only."))
            return
        self.stdout.write(self.style.SUCCESS(f"Setting hosts for customization {options['customization']}"))
        customization = Customization.objects.get(name=options['customization'])
        customization.host = 'localhost' if options['customization'] == 'default' else f'{customization.name}.localhost'
        customization.additional_hosts = [f'second-{customization.name}.localhost']
        customization.save()

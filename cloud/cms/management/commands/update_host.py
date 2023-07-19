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
        self.stdout.write(self.style.SUCCESS(f"Not needed anymore"))

import logging
import os

from django.conf import settings
from django.core.management.base import BaseCommand

from cms.controllers import filldata
from cms import models

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    _id_file = "version.id"

    def add_arguments(self, parser):
        # removed default value, command can be run with a specified customization name
        # parser.add_argument(
        #     '--customization', nargs='?', default=get_customization(), type=str)

        parser.add_argument(
            '--customization', nargs='?', type=str)

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS(f"Not needed anymore"))


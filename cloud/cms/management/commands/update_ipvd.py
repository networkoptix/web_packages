import logging
import os
import traceback

from django.conf import settings
from django.core.management.base import BaseCommand

from cms.controllers import filldata
from cms import models
from util.ipvd_storage import IPVDS3Upload

logger = logging.getLogger(__name__)


class Command(BaseCommand):

    def add_arguments(self, parser):
        parser.add_argument(
            '--ignore-errors', nargs='?', type=bool, default=False)
        parser.add_argument(
            '--force', nargs='?', type=bool, default=True)

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS(f"Updating ipvd."))
        storage = IPVDS3Upload()
        try:
            storage.update_ipvd_data(options.get('force', True))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Cannot update ipvd. {e}'))
            if options.get('ignore-errors', False):
                self.stdout.write(self.style.ERROR(traceback.format_exc()))
                return
            raise e
        self.stdout.write(self.style.SUCCESS(f"IPVD data is latest version."))



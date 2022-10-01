import logging
import os

from django.conf import settings
from django.core.management.base import BaseCommand

from cms.controllers import filldata
from cms import models
from util.helpers import get_customization
logger = logging.getLogger(__name__)


class Command(BaseCommand):
    _id_file = "version.id"

    def add_arguments(self, parser):
        parser.add_argument(
            '--customization', nargs='?', default=get_customization(), type=str)

    def handle(self, *args, **options):
        local_version = self.read_id()
        customization = options.get('customization', get_customization())
        update, current_version = models.check_update_cache(customization, local_version)
        logger.info(f"Local version: {local_version}\tUpdate: {update}\tCurrent Version: {current_version}")

        # Memory is initializing
        if not local_version:
            logger.info(current_version or 0)
            self.write_id(current_version or 0)
            self.stdout.write(self.style.SUCCESS("Initialized version.id file."))
            return

        if update:
            self.initialize_static_content(current_version, customization)
        else:
            self.stdout.write(self.style.SUCCESS("No change was detected"))

    def initialize_static_content(self, current_version, customization):
        self.write_id(current_version)
        asset = models.get_cloud_portal_asset(customization=customization)
        logger.info("Need to update content.")

        logger.info(f"Init skin: {asset}\t Preview: False")
        filldata.init_skin(asset, False, workers=1)

        logger.info(f"Init skin: {asset}\t Preview: True")
        filldata.init_skin(asset, True, workers=1)

        logger.info("Content has been updated.")
        self.stdout.write(self.style.SUCCESS(f"Successfully initiated static content for {asset.__str__()}"))

    def read_id(self):
        local_version = 0
        if os.path.exists(self._id_file):
            with open(self._id_file, "r") as f:
                try:
                    local_version = int(f.read())
                except ValueError:
                    pass
        return local_version

    def write_id(self, version):
        try:
            with open(self._id_file, "w+") as f:
                f.write(str(version))
        except ValueError as e:
            os.remove(self._id_file)
            self.stdout.write(self.style.ERROR(f"Could not save the value because {e}"))

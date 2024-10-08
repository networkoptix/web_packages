import logging
import time

from django.core.management.base import BaseCommand
from django.conf import settings

from cloud.customization_context import customization_ctx
from cloud.debug import timer
from cms.controllers import filldata, structure
from cms.models import Customization, Language

import structlog

logger = structlog.getLogger(__name__)


class Command(BaseCommand):
    help = 'Fills initial data from CMS database to static files'

    def add_arguments(self, parser):
        # Customization name must be required for this argument.
        parser.add_argument(
            '--customization', default=None, nargs='?', type=str)
        parser.add_argument(
            '--preview', nargs='?', default=False, type=bool)

    @timer
    def handle(self, *args, **options):
        if not (customization_option := options.get('customization')):
            logger.warning("missing_customization", error="Customization not passed")
            return

        if (preview := options.get('preview', None)) is None:
            raise ValueError('preview is required')

        customization = Customization.objects.filter(
            name=customization_option).first()
        if not customization_ctx.get():
            customization_ctx.set(customization_option)

        if not customization:
            logger.warning("auto_generated_customization", customization=customization_option, error=settings.CONFIG_ERROR)
            en_us = Language.objects.get(code="en_US")
            customization = Customization(
                name=customization_option, default_language=en_us)
            customization.save()
            customization.languages.add(en_us)
            customization.save()

        asset = structure.find_or_add_asset_with_single_customization(
            'Cloud Portal', customization, 'cloud_portal', '')

        for _ in range(settings.FILLDATA_TRIES):
            if filldata.init_skin(asset, preview, workers=1, management=True):
                break

            warning_msg = f"Retrying in {settings.FILLDATA_TIMEOUT} seconds"
            logger.warning("filldata_failed", error=warning_msg)
            self.stdout.write(self.style.WARNING("Filldata Failed. " + warning_msg))
            time.sleep(settings.FILLDATA_TIMEOUT)

        else:
            error_msg = f"Run forceupdate for {asset} to fix the problem."
            logger.critical("filldata_failed", attempts=settings.FILLDATA_TRIES, asset=asset, error=error_msg)
            self.stdout.write(self.style.ERROR(f"Filldata failed after running {settings.FILLDATA_TRIES} time(s). "  + error_msg))
            return

        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully initiated static content for {asset}"))

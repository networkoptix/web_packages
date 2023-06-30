import logging
import time

from django.core.management.base import BaseCommand
from django.conf import settings

from cloud.customization_context import customization_ctx
from cloud.debug import timer
from cms.controllers import filldata, structure
from cms.controllers.static_files import convert_structures_in_customization
from cms.models import Customization, Language

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Converts static to s3'

    def add_arguments(self, parser):
        # Customization name must be required for this argument.
        parser.add_argument(
            '--customization', default=None, nargs='?', type=str)

    @timer
    def handle(self, *args, **options):
        if not (customization_option := options.get('customization')):
            logger.warning("WARNING!!! Customization has not been passed. It may "
                           "cause errors on customization depended containers.")
            return

        customization = Customization.objects.filter(
            name=customization_option).first()
        if not customization_ctx.get():
            customization_ctx.set(customization_option)

        if not customization:
            logger.warning(f'Customization {customization_option} was automatically generated.'
                           f'{settings.CONFIG_ERROR} To configure cloud for {customization_option}.')
            en_us = Language.objects.get(code="en_US")
            customization = Customization(
                name=customization_option, default_language=en_us)
            customization.save()
            customization.languages.add(en_us)
            customization.save()

        asset = structure.find_or_add_asset_with_single_customization(
            'Cloud Portal', customization, 'cloud_portal', '')

        convert_structures_in_customization(customization_name=customization.name)

        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully initiated static content for {asset}"))

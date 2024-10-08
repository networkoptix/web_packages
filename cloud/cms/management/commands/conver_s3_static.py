import structlog
from django.conf import settings
from django.core.management.base import BaseCommand

from cloud.customization_context import customization_ctx
from cloud.debug import timer
from cms.controllers import structure
from cms.controllers.static_files import convert_structures_in_customization
from cms.models import Customization, Language

logger = structlog.getLogger(__name__)

class Command(BaseCommand):
    help = 'Converts static to s3'

    def add_arguments(self, parser):
        # Customization name must be required for this argument.
        parser.add_argument(
            '--customization', default=None, nargs='?', type=str)

    @timer
    def handle(self, *args, **options):
        if not (customization_option := options.get('customization')):
            logger.warning("missing_customization", error="Customization not passed")
            return

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

        convert_structures_in_customization(customization_name=customization.name)

        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully initiated static content for {asset}"))

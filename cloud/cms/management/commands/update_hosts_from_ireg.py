import os
import structlog
import sys
import traceback
from django.core.management.base import BaseCommand

from cms.models import Customization, Language
from nx_ireg.helpers import get_customizations

logger = structlog.getLogger(__name__)


class Command(BaseCommand):
    def add_arguments(self, parser):
        parser.add_argument(
            '--ignore_missing', nargs='?', type=str, default=False)

    def handle(self, *args, **options):
        instance_name = os.getenv('INSTANCE_NAME', None)
        try:
            customizations = get_customizations(instance_name)
        except Exception as e:
            logger.error("failed_to_get_cloud_hosts", error=str(e), exc_info=True)
            if options.get('ignore_missing'):
                return
            sys.exit(1)
        en_us = Language.objects.get(code="en_US")
        for customization_name, hostname in customizations:
            customization, created = Customization.objects.get_or_create(
                name=customization_name, defaults={'host': hostname, 'default_language': en_us}
            )
            if created:
                logger.info("customization_created", customization=customization_name, host=hostname)
                continue
            if customization.host == hostname:
                logger.info("customization_unchanged", customization=customization_name, host=hostname)
                continue
            customization.host = hostname
            customization.save()
            logger.info("customization_updated", customization=customization_name, host=hostname)


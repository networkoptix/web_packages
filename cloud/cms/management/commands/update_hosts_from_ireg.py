import os
import sys
import logging
import traceback
from nx_ireg.helpers import get_customizations
from django.core.management.base import BaseCommand

from cms.models import Customization, Language

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    def add_arguments(self, parser):
        parser.add_argument(
            '--ignore_missing', nargs='?', type=str, default=False)

    def handle(self, *args, **options):
        instance_name = os.getenv('INSTANCE_NAME', None)
        try:
            customizations = get_customizations(instance_name)
        except Exception as e:
            logger.error(f"Failed to get cloud hosts: {e}")
            logger.error(traceback.format_exc())
            if options.get('ignore_missing'):
                return
            sys.exit(1)
        en_us = Language.objects.get(code="en_US")
        for customization_name, hostname in customizations:
            customization, created = Customization.objects.get_or_create(
                name=customization_name, defaults={'host': hostname, 'default_language': en_us}
            )
            if created:
                logger.info(f"Created customization: {customization_name}. Host: {hostname}.")
                continue
            if customization.host == hostname:
                logger.info(f"Customization: {customization_name}. Host: {hostname}. Does not require updating.")
                continue
            customization.host = hostname
            customization.save()
            logger.info(f"Updated customization: {customization_name}. Host: {hostname}.")


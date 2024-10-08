import logging
import structlog
import sys
from django.conf import settings
from django.core.cache import caches
from django.core.management.base import BaseCommand

from cloud.customization_context import customization_ctx
from cloud.debug import timer
from cms.models import cloud_portal_customization_cache, cloud_portal_customization_cache_key

logger = structlog.getLogger(__name__)


class Command(BaseCommand):
    help = 'Fills initial data from CMS database to static files'

    def add_arguments(self, parser):
        # Customization name must be required for this argument.
        parser.add_argument(
            '--customization', default='default', nargs='?', type=str)

    @timer
    def handle(self, *args, **options):
        if not (customization := options.get('customization')):
            raise ValueError('customization is required')
        if caches['customization'].get(cloud_portal_customization_cache_key(customization)):
            logger.info("cache_already_set", customization=customization, version=settings.VERSION)
            return
        # just fill empty cache update is not needed in deployment
        customization_ctx.set(customization)
        lock_key = f'deploy_lock_{customization}_{settings.VERSION}'
        if caches['customization'].add(lock_key, 'updating'):
            try:
                cloud_portal_customization_cache(customization_name=customization, force=False)
            except Exception as ex:
                caches['customization'].delete(lock_key)
                logger.warning("cache_update_error", error=str(ex), exc_info=True)
                sys.exit(1)
            caches['customization'].delete(lock_key)
            logger.info("cache_update_success", customization=customization, version=settings.VERSION)
            return
        logger.info("cache_update_in_progress", customization=customization, version=settings.VERSION)


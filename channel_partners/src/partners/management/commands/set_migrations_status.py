
import structlog
from django.conf import settings
from django.core.cache import cache
from django.core.management.base import BaseCommand


logger = structlog.getLogger(__name__)


class Command(BaseCommand):
    help = 'Setting migrations status value. 1 - Ready, 0 - Not Ready'
    
    def add_arguments(self, parser):
        parser.add_argument('--is_ready', type=int, help='Migrations are ready.', required=True)

    def handle(self, *args, **options):
        if options['is_ready'] != 0:
            logger.info("Setting deployment status as ready.")
            cache.set(settings.MIGRATION_STATUS_CACHE_KEY, True)
        else:
            logger.info("Setting deployment status as not ready.")
            cache.set(settings.MIGRATION_STATUS_CACHE_KEY, False)


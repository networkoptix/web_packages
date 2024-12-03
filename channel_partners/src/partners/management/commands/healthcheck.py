import sys
import time

import structlog
from django.conf import settings
from django.core.cache import cache
from django.core.management.base import BaseCommand
from django.db import (
    DEFAULT_DB_ALIAS,
    connections,
)
from django.db.migrations import executor
from django.db.utils import OperationalError


logger = structlog.getLogger(__name__)
MINUTES = 10


def migration_interval(minutes):
    for minute in range(minutes):
        yield minute
        time.sleep(60)


class Command(BaseCommand):
    help = 'Check if migrations are done.'

    def handle(self, *args, **options):
        logger.info("health_check_start")
        for minute in migration_interval(MINUTES):
            try:
                instance = executor.MigrationExecutor(
                    connections[DEFAULT_DB_ALIAS])
                plan = instance.migration_plan(instance.loader.graph.leaf_nodes())
                logger.info("health_check_iteration", iteration=minute, total_iterations=MINUTES, pending_migrations=len(plan))

                if not plan and cache.get(settings.MIGRATION_STATUS_CACHE_KEY):
                    logger.info("health_check_complete", iteration=minute, total_iterations=MINUTES)
                    return sys.exit(0)
            except OperationalError as e:
                logger.error("health_check_error", error=str(e), exc_info=True)
        else:
            logger.error("migration_error", error="Something went wrong with migrations")
            sys.exit(1)

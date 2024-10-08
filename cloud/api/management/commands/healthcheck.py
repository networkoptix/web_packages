import structlog
import sys
import time
from django.core.cache import caches
from django.core.management.base import BaseCommand
from django.db import DEFAULT_DB_ALIAS, connections
from django.db.migrations import executor
from django.db.utils import OperationalError

from cloud.settings import DEPLOYMENT_READY

logger = structlog.getLogger(__name__)
MINUTES = 10


def migration_interval(minutes):
    for minute in range(minutes):
        yield minute
        time.sleep(60)


class Command(BaseCommand):
    help = 'Check if migrations are done.'

    def handle(self, *args, **options):
        deployment_cache = caches['deployment']
        logger.info("health_check_start")
        for minute in migration_interval(MINUTES):
            try:
                instance = executor.MigrationExecutor(
                    connections[DEFAULT_DB_ALIAS])
                plan = instance.migration_plan(instance.loader.graph.leaf_nodes())
                logger.info("health_check_iteration", iteration=minute, total_iterations=MINUTES, pending_migrations=len(plan))

                if not plan and deployment_cache.get(DEPLOYMENT_READY):
                    logger.info("health_check_complete", iteration=minute, total_iterations=MINUTES)
                    return sys.exit(0)
            except OperationalError as e:
                logger.error("health_check_error", error=str(e), exc_info=True)
        else:
            logger.error("migration_error", error="Something went wrong with migrations")
            deployment_cache.set(DEPLOYMENT_READY, True)
            sys.exit(1)

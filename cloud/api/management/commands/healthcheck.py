import time
import sys
import logging

from django.core.management.base import BaseCommand
from django.core.cache import caches
from django.db import DEFAULT_DB_ALIAS, connections
from django.db.migrations import executor
from django.db.utils import OperationalError

from cloud.settings import DEPLOYMENT_READY

logger = logging.getLogger(__name__)
MINUTES = 10


def migration_interval(minutes):
    for minute in range(minutes):
        yield minute
        time.sleep(60)


class Command(BaseCommand):
    help = 'Check if migrations are done.'

    def handle(self, *args, **options):
        deployment_cache = caches['deployment']
        logger.info('Begin health check')
        for minute in migration_interval(MINUTES):
            try:
                instance = executor.MigrationExecutor(
                    connections[DEFAULT_DB_ALIAS])
                plan = instance.migration_plan(instance.loader.graph.leaf_nodes())
                logger.info(f'Iteration: {minute} of {MINUTES}')
                logger.info(f'Pending migrations: {len(plan)}')

                if not plan and deployment_cache.get(DEPLOYMENT_READY):
                    logger.info('Health check complete')
                    logger.info(f'Iteration: {minute} of {MINUTES}')
                    return sys.exit(0)
            except OperationalError as e:
                logger.error(e, exc_info=True)
        else:
            logger.error(
                'Something went wrong with migrations. Please notify the web team')
            deployment_cache.set(DEPLOYMENT_READY, True)
            sys.exit(1)

import time
import sys
import logging

from django.core.management.base import BaseCommand
from django.core.cache import caches
from django.db import DEFAULT_DB_ALIAS, connections
from django.db.migrations.executor import MigrationExecutor

from cloud.settings import DEPLOYMENT_READY

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Check if migrations are done."

    def handle(self, *args, **options):
        deployment_cache = caches['deployment']
        sleepTime = 60 * 10  # 10 minutes
        logger.info("Begin health check")
        for x in iter(range(sleepTime)):
            executor = MigrationExecutor(connections[DEFAULT_DB_ALIAS])
            plan = executor.migration_plan(executor.loader.graph.leaf_nodes())
            if x % 60 == 0:
                logger.info(f"Iteration: {x} of {sleepTime}")
                logger.info(f"Pending migrations: {len(plan)}")

            if len(plan) == 0 and deployment_cache.get(DEPLOYMENT_READY):
                logger.info("Health check complete")
                logger.info(f"Iteration: {x} of {sleepTime}")
                return sys.exit(0)
            time.sleep(1)
        else:
            logger.error(f"Something went wrong with migrations. Please notify the web team")
            deployment_cache.set(DEPLOYMENT_READY, True)
            sys.exit(1)

import time
import sys
from django.core.management.base import BaseCommand
from django.db import DEFAULT_DB_ALIAS, connections
from django.db.migrations.executor import MigrationExecutor

from cms.models import DeploymentStatus

import logging
logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Check if migrations are done."

    def handle(self, *args, **options):
        ready = False
        locked = True
        sleepTime = 60 * 30  # 30 minutes
        logger.info("Begin health check")
        for x in iter(range(sleepTime)):
            executor = MigrationExecutor(connections[DEFAULT_DB_ALIAS])
            plan = executor.migration_plan(executor.loader.graph.leaf_nodes())
            read_structure_lock = DeploymentStatus.objects.filter(name="ReadStructureLock").first()
            read_structure_finished = DeploymentStatus.objects.filter(name="ReadStructureFinished").first()

            if read_structure_lock:
                locked = read_structure_lock.ready

            if read_structure_finished:
                ready = read_structure_finished.ready

            if x % 60 == 0:
                logger.info(f"Iteration: {x} of {sleepTime}")
                logger.info(f"Pending migrations: {len(plan)}")
                logger.info(f"Read Structure Locked: {locked} - finished: {ready}")

            if len(plan) == 0 and ready and not locked:
                logger.info("Health check complete")
                logger.info(f"Iteration: {x} of {sleepTime}")
                logger.info(f"Read Structure Locked: {locked} - finished: {ready}")
                return sys.exit(0)

            time.sleep(1)
        else:
            logger.error(f"Read structure took too long. Please notify the web team")
            # In the event that it fails reset the lock so that if can hopefully fix itself when the container resets
            read_structure_lock = DeploymentStatus.objects.get(name="ReadStructureLock")
            read_structure_lock.ready = False
            read_structure_lock.save()
            sys.exit(1)

import sys
from django.core.management.base import BaseCommand

from django.db import DEFAULT_DB_ALIAS, connections
from django.db.migrations.executor import MigrationExecutor

from cms.models import DeploymentStatus


class Command(BaseCommand):
    help = "Check if migrations are done."

    def handle(self, *args, **options):
        executor = MigrationExecutor(connections[DEFAULT_DB_ALIAS])
        plan = executor.migration_plan(executor.loader.graph.leaf_nodes())
        deploymentStatus = DeploymentStatus.objects.first()
        ready = deploymentStatus.ready if deploymentStatus else False
        sys.exit(0 if len(plan) > 0 or not ready else 1)

import logging

from django.db import connections, DEFAULT_DB_ALIAS
from django.db.migrations.executor import MigrationExecutor
from django.http import JsonResponse
from django.core.cache import caches
from django.shortcuts import render
from django.views import View

logger = logging.getLogger(__name__)


class HealthCheckView(View):

    def get(self, request):
        has_errors = any([
            self.check_migrations(),
            self.check_redis()
        ])
        text, code = ('failure', 503) if has_errors else ('ok', 200)
        return JsonResponse({'status': text}, status=code)

    @staticmethod
    def check_migrations():
        executor = MigrationExecutor(connections[DEFAULT_DB_ALIAS])
        plan = executor.migration_plan(executor.loader.graph.leaf_nodes())
        return bool(plan)

    @staticmethod
    def check_redis():
        errors = False
        try:
            info = caches['default']._cache.get_client().info()
        except Exception as ex:
            logger.error(f"Cannot retrieve cache server info. Exception: {ex}")
            errors = True
        return errors
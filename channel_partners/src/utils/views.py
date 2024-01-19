import httpx
import structlog
from django.core.cache import caches
from django.db import (
    DEFAULT_DB_ALIAS,
    connections,
)
from django.db.migrations.executor import MigrationExecutor
from django.http import JsonResponse
from django.views import View
from nx_drf.drf_async import AsyncAPIView


logger = structlog.get_logger(__name__)


def simple_health_check(request):
    return JsonResponse(data={'alive': True}, status=200)


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
            logger.error(
                "Cannot retrieve cache server info.",
                exception=ex)
            errors = True
        return errors


class HealthCheckAsyncImports(AsyncAPIView):
    async def get(self, request):
        async with httpx.AsyncClient() as client:
            resp = await client.get('https://1.1.1.1/')

        return JsonResponse({'is_ok': not resp.is_error}, status=resp.status_code)


class HealthCheckCelery(View):

    def get(self, request):
        from channel_partners.celery import app as celery_app
        resp = celery_app.control.inspect().stats()
        if not resp:
            return JsonResponse(data={"status": "failed"}, status=500)
        else:
            return JsonResponse(data={"status": "ok"}, status=200)

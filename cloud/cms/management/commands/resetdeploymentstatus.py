from django.core.management.base import BaseCommand
from django.core.cache import caches

from cloud.settings import DEPLOYMENT_READY


class Command(BaseCommand):
    help = "Remove ready from the deployment cache before anything else runs."

    def handle(self, *args, **options):
        deployment_cache = caches['deployment']
        deployment_cache.delete(DEPLOYMENT_READY)

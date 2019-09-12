from django.core.management.base import BaseCommand
from cms.models import DeploymentStatus


class Command(BaseCommand):
    help = "Set deployment ready status for False. Used to make sure filldata runs after readstructure."

    def handle(self, *args, **options):
        deploymentStatus, created = DeploymentStatus.objects.get_or_create(id=1)
        deploymentStatus.ready = False
        deploymentStatus.save()

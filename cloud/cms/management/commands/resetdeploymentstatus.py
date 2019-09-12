from django.core.management.base import BaseCommand
from cms.models import DeploymentStatus


class Command(BaseCommand):
    help = "Set deployment ready status for False. Used to make sure filldata runs after readstructure."

    def handle(self, *args, **options):
        read_structure_lock, created = DeploymentStatus.objects.get_or_create(name='ReadStructureLock')
        read_structure_lock.ready = False
        read_structure_lock.save()

import logging

from django.conf import settings
from django.core.management.base import BaseCommand

from cms.models import DataStructure, Language

logger = logging.getLogger(__name__)


def check_if_debug():
    return settings.DEBUG


class Command(BaseCommand):
    def handle(self, *args, **options):
        if not check_if_debug():
            self.stdout.write(self.style.ERROR('Command not allowed if DEBUG=False'))
            return
        self.stdout.write('Cleaning unused CMS records(no version, not latest)')
        cleaned_count = 0
        for data_structure in DataStructure.objects.all():
            if data_structure.translatable:
                for language in Language.objects.all():
                    for record in data_structure.datarecord_set.filter(version=None, language=language).order_by('-pk')[1:]:
                        record.delete()
                        cleaned_count += 1
            for record in data_structure.datarecord_set.filter(version=None, language=None).order_by('-pk')[1:]:
                record.delete()
                cleaned_count += 1
        self.stdout.write(self.style.SUCCESS(f'Cleaned {cleaned_count} records'))


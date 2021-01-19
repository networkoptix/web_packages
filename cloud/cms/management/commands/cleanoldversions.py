from django.conf import settings
from django.core.management.base import BaseCommand

from cms.models import Customization, Language, Asset, ContentVersion, DataStructure

from concurrent.futures import ThreadPoolExecutor, as_completed


class Command(BaseCommand):
    def handle(self, *args, **options):
        if not settings.DEBUG:
            self.stdout.write(self.style.ERROR(f'Command not allowed if DEBUG=False'))
            return
        self.stdout.write('Cleaning unused CMS versions')
        cleaned_count = 0
        asset_count = 0
        all_languages = Language.objects.all()
        all_customizations = Customization.objects.all()
        with ThreadPoolExecutor(max_workers=3) as executor:
            futures = []
            for asset in Asset.objects.all().prefetch_related('asset_type__context_set__datastructure_set'):
                futures.append(executor.submit(self.process_asset, asset, all_languages, all_customizations))

            for future in as_completed(futures):
                cleaned_count += future.result()
                asset_count += 1

        self.stdout.write(self.style.SUCCESS(f'Cleaned {cleaned_count} records for {asset_count} assets'))

    def process_asset(self, asset, all_languages, all_customizations):
        cleaned_count = 0
        used_versions = set()
        dss = set()
        for context in asset.asset_type.context_set.all():
            dss.update(context.datastructure_set.all())
        translatable_dss = {ds for ds in dss if ds.translatable}
        non_translatable_dss = dss - translatable_dss
        with ThreadPoolExecutor(max_workers=3) as executor:
            futures = []
            for language in all_languages:
                futures.append(executor.submit(
                    self.find_used_versions, translatable_dss, asset, language,
                    all_customizations=all_customizations
                ))
            futures.append(executor.submit(
                self.find_used_versions, non_translatable_dss, asset, language=None,
                all_customizations=all_customizations
            ))
            for future in as_completed(futures):
                used_versions.update(future.result())

        for version in ContentVersion.objects.filter(asset=asset).exclude(id__in=used_versions):
            version.delete()
            cleaned_count += 1
        return cleaned_count

    @staticmethod
    def find_used_versions(data_structures, asset, language, all_customizations):
        versions = set()
        if asset.is_single_customization:
            customizations = [cust for cust in asset.customizations.all() if cust]
        else:
            customizations = all_customizations
        for customization in customizations:
            accepted_records = DataStructure.find_actual_values(
                data_structures, asset, language=language, customization_name=customization.name, as_records=True
            )
            review_records = DataStructure.find_actual_values(
                data_structures, asset, language=language, customization_name=customization.name, as_records=True,
                only_review=True
            )
            for record in list(accepted_records.values()) + list(review_records.values()):
                if record:
                    versions.add(record.version_id)
        return versions

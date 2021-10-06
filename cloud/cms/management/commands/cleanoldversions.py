from django.conf import settings
from django.core.management.base import BaseCommand

from cms.models import Customization, Language, Asset, ContentVersion, DataStructure

from concurrent import futures


def check_if_debug():
    return settings.DEBUG


class Command(BaseCommand):
    def handle(self, *args, **options):
        if not check_if_debug():
            self.stdout.write(self.style.ERROR(
                'Command not allowed if DEBUG=False'))
            return
        self.stdout.write('Cleaning unused CMS versions')
        cleaned_count = 0
        asset_count = 0
        all_languages = list(Language.objects.all())
        all_customizations = list(Customization.objects.all())
        with futures.ThreadPoolExecutor(max_workers=3) as executor:
            instantiated_futures = [
                executor.submit(
                    self.process_asset, asset, all_languages, all_customizations
                )
                for asset in Asset.objects.all().prefetch_related(
                    'asset_type__context_set__datastructure_set'
                )
            ]

            for future in futures.as_completed(instantiated_futures):
                cleaned_count += future.result()
                asset_count += 1

        self.stdout.write(self.style.SUCCESS(
            f'Cleaned {cleaned_count} records for {asset_count} assets'))

    def process_asset(self, asset, all_languages, all_customizations):
        cleaned_count = 0
        used_versions = set()
        translatable_dss, non_translatable_dss = self.get_dss(asset)

        with futures.ThreadPoolExecutor(max_workers=3) as executor:
            instantiated_futures = [executor.submit(
                self.find_used_versions, translatable_dss, asset, language,
                all_customizations=all_customizations
            ) for language in all_languages]

            instantiated_futures.append(executor.submit(
                self.find_used_versions, non_translatable_dss, asset, language=None,
                all_customizations=all_customizations
            ))

            for future in futures.as_completed(instantiated_futures):
                used_versions.update(future.result())

        for version in ContentVersion.objects.filter(asset=asset).exclude(id__in=used_versions):
            version.delete()
            cleaned_count += 1
        return cleaned_count

    def get_dss(self, asset):
        dss = {
            ds
            for ds_list in (
                context.datastructure_set.all()
                for context in asset.asset_type.context_set.all())
            for ds in ds_list
        }

        translatable_dss = {ds for ds in dss if ds.translatable}
        non_translatable_dss = dss - translatable_dss
        return translatable_dss, non_translatable_dss

    @staticmethod
    def find_used_versions(data_structures, asset, language, all_customizations):
        versions = set()
        if asset.is_single_customization:
            customizations = [
                customization
                for customization in asset.customizations.all()
                if customization]
        else:
            customizations = all_customizations
        for customization in customizations:
            args = data_structures, asset
            kwargs = {
                'language': language,
                'customization_name': customization.name,
                'as_records': True
            }
            accepted_records = DataStructure.find_actual_values(
                *args, **kwargs)
            review_records = DataStructure.find_actual_values(
                *args, **kwargs, only_review=True)
            for record in list(accepted_records.values()) + list(review_records.values()):
                if record:
                    versions.add(record.version_id)
        return versions

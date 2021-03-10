from django.test import TestCase
from cms.models import *


class FindActualValuesTestCase(TestCase):
    def against_find_actual_value(self, **kwargs):
        """Test that find_actual_value and find_actual_values produce the same result"""

        def compare_records(data_structures, **kwargs):
            values_dict = DataStructure.find_actual_values(data_structures=data_structures, **kwargs)
            value_dict = {}
            for ds in data_structures:
                value_dict[ds] = ds.find_actual_value(**kwargs)
            version_id = kwargs.get('version_id', None)

            for ds in value_dict:
                error_info = f'Asset ID: {asset.id}, Asset Name: {asset.name}, DS: {ds.name}, Version: {version_id}, ' \
                             f'Language: {lang.name if lang else None}'
                self.assertIn(ds, values_dict, f'{error_info}\nMissing {ds}')
                self.assertEqual(value_dict[ds], values_dict[ds],
                                 f'{error_info}\n{value_dict[ds]} != {values_dict[ds]}')

        assets = Asset.objects.filter(asset_type__type=2)

        for asset in assets:
            data_structures = [d for con in asset.asset_type.context_set.all() for d in con.datastructure_set.all()]
            for cust in (*asset.customizations.all(), None):
                customization_name = cust.name if cust else None
                for lang in (*Language.objects.all(), None):
                    if kwargs.pop('with_version', False):
                        for content_version in asset.contentversion_set.all():
                            compare_records(
                                asset=asset, data_structures=data_structures, version_id=content_version.id,
                                language=lang, customization_name=customization_name, **kwargs
                            )
                    else:
                        compare_records(
                            asset=asset, data_structures=data_structures, language=lang,
                            customization_name=customization_name, **kwargs
                        )

    def test_draft_without_version(self):
        self.against_find_actual_value(draft=True, with_version=False)

    def test_draft_with_version(self):
        self.against_find_actual_value(draft=True, with_version=True)

    def test_no_draft_without_version(self):
        self.against_find_actual_value(draft=False, with_version=False)

    def test_no_draft_with_version(self):
        self.against_find_actual_value(draft=False, with_version=True)

from django.test.runner import DiscoverRunner

from cms.controllers.structure import read_structure_json


class NxRunner(DiscoverRunner):
    def setup_databases(self, **kwargs):
        result = super().setup_databases(**kwargs)
        # read_structure_json()
        return result

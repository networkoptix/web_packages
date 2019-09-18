from cms.models import get_cloud_portal_asset, Asset, AssetCustomizationReview


class SpecialStructures:
    """ Only use this with assets that are single customization.\n
        Calculates special DataStructures without making DataRecords.\n
        Currently supports the following:\n
        - %CUSTOMIZATION_NAME%
        - %LANGUAGES%
    """
    def __init__(self):
        self.function_dict = {}
        self.add_function("%CUSTOMIZATION_NAME%", self.calc_customization)
        self.add_function("%LANGUAGES%", self.calc_lang_codes)
        self.add_function("%NUM_EULA_VERSIONS%", self.calc_num_eula_versions)

    def add_function(self, tag: str, function):
        self.function_dict[tag] = function

    def calc(self, tag: str, asset: Asset):
        if tag in self.function_dict:
            return self.function_dict[tag](asset)
        return ""

    @staticmethod
    def calc_cloud_portal(asset: Asset):
        customization = asset.customizations.first()
        return get_cloud_portal_asset(customization.name).name if customization else ""

    @staticmethod
    def calc_customization(asset: Asset):
        customization = asset.customizations.first()
        if customization:
            return customization.name
        return ""

    @staticmethod
    def calc_lang_codes(asset: Asset):
        return asset.languages_list

    @staticmethod
    def calc_num_eula_versions(asset: Asset):
        accepted = AssetCustomizationReview.REVIEW_STATES.accepted
        data_records = asset.datarecord_set.\
            filter(data_structure__name="%CONTENT%",
                   data_structure__context__name="license.html",
                   version__assetcustomizationreview__state=accepted)
        return len(data_records)

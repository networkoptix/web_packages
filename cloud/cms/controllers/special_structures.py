import json
from cms.models import get_cloud_portal_asset, Asset
from util.config import get_config


class SpecialStructures:
    """ Only use this with assets that are single customization.\n
        Calculates special DataStructures without making DataRecords.\n
        Currently supports the following:\n
        - %CUSTOMIZATION_NAME%
        - %LANGUAGES%
    """
    def __init__(self):
        self.function_dict = {}
        # Footer links must be first in this list. Used for webadmin footer.
        self.add_function("%FOOTER_LINKS%", self.calc_menu)
        self.add_function("%PRIVACY_LINK%", self.calc_privacy_link)
        self.add_function("%SUPPORT_LINK%", self.calc_support_link)
        self.add_function("%CUSTOMIZATION_NAME%", self.calc_customization)
        self.add_function("%LANGUAGES%", self.calc_lang_codes)
        self.add_function("%CLOUD_LINK%", self.calc_cloud_link)

    def add_function(self, tag: str, function):
        self.function_dict[tag] = function

    def calc(self, tag: str, asset: Asset):
        if tag in self.function_dict:
            return self.function_dict[tag](asset)
        return ""

    @staticmethod
    def get_global_value(asset: Asset, key: str):
        customization = asset.customizations.first()
        return get_cloud_portal_asset(customization.name).read_global_value(key)

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
    def calc_cloud_link(asset: Asset):
        customization = asset.customizations.first()
        if not customization:
            return ""
        conf = get_config(customization.name)
        return conf["cloud_portal"]["url"].replace("http:", "https:")

    @staticmethod
    def calc_privacy_link(asset: Asset):
        return SpecialStructures.get_global_value(asset, "%PRIVACY_LINK%")

    @staticmethod
    def calc_support_link(asset: Asset):
        return SpecialStructures.get_global_value(asset, "%SUPPORT_LINK%")

    @staticmethod
    def calc_menu(asset: Asset):
        links = {
            "%INTEGRATION_STORE_ENABLED%": SpecialStructures.get_global_value(asset, "%INTEGRATION_STORE_ENABLED%"),
            "%IPVD_ENABLED%": SpecialStructures.get_global_value(asset, "%IPVD_ENABLED%"),
            "%PRIVACY_LINK%": SpecialStructures.get_global_value(asset, "%PRIVACY_LINK%"),
            "%SUPPORT_LINK%": SpecialStructures.get_global_value(asset, "%SUPPORT_LINK%")
        }

        footer_items = SpecialStructures.get_global_value(asset, "%FOOTER_ITEMS%")
        if footer_items == "":
            footer_items = []

        if footer_items:
            footer_items_str = json.dumps(footer_items)
            for key, value in links.items():
                if type(value) is not str:
                    value = json.dumps(value)
                footer_items_str = footer_items_str.replace(key, value)
            footer_items = json.loads(footer_items_str)
        return footer_items

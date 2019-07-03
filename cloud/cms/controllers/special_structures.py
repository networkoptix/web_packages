from cms.models import get_cloud_portal_product, Product


def calc_cloud_portal(product: Product):
    customization = product.customizations.first()
    if customization:
        cloud_portal = get_cloud_portal_product(customization.name)
        if cloud_portal:
            return cloud_portal[0].name
    return ""


def calc_customization(product: Product):
    customization = product.customizations.first()
    if customization:
        return customization.name
    return ""


def calc_lang_codes(product: Product):
    return product.languages_list


class SpecialStructures:
    """ Only use this with products that are single customization.\n
        Calculates special DataStructures without making DataRecords.\n
        Currently supports the following:\n
        - %CUSTOMIZATION_NAME%
        - %LANGUAGES%
    """
    def __init__(self):
        self.function_dict = {}
        self.add_function("%CUSTOMIZATION_NAME%", calc_customization)
        self.add_function("%LANGUAGES%", calc_lang_codes)

    def add_function(self, tag: str, function):
        self.function_dict[tag] = function

    def calc(self, tag: str, product: Product):
        if tag in self.function_dict:
            return self.function_dict[tag](product)
        return ""

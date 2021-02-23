from cms.models import get_cloud_portal_asset, Asset, LicenseType, AssetType, DataStructure, get_vms_asset, SpecialStructure
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
        self.add_function("%SUPPORT_LINK%", self.calc_support_link)
        self.add_function("%CUSTOMIZATION_NAME%", self.calc_customization)
        self.add_function("%LANGUAGES%", self.calc_lang_codes)
        self.add_function("%CLOUD_LINK%", self.calc_cloud_link)
        self.add_function("%CLOUD_HOST%", self.calc_cloud_host)
        self.add_function("%licenseTypes%", self.calc_license_type)
        self.add_function("%VMS_WIN_PATH", self.calc_vms_win_path)
        self.add_function("%VMS_LIN_PATH", self.calc_vms_win_path)
        self.add_function("%VMS_LIN_SERVICE_NAME%", self.calc_vms_lin_service_name)
        self.add_function("%VMS_COMPANY_ID%", self.calc_vms_company_id)

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
    def calc_cloud_host(asset: Asset):
        customization = asset.customizations.first()
        if not customization:
            return ""
        conf = get_config(customization.name)
        return conf["cloud_portal"]["url"].lstrip('https://').lstrip('http://')

    @staticmethod
    def calc_cloud_link(asset: Asset):
        customization = asset.customizations.first()
        if not customization:
            return ""
        conf = get_config(customization.name)
        return conf["cloud_portal"]["url"].replace("http:", "https:")

    @staticmethod
    def calc_support_link(asset: Asset):
        return SpecialStructures.get_global_value(asset, "%SUPPORT_LINK%")

    @staticmethod
    def calc_license_type(asset: Asset):
        return LicenseType.get_license_types()

    @staticmethod
    def get_vms_and_config(asset: Asset, ds_name):
        vms_asset = get_vms_asset(asset.customizations.first().name)
        struct = SpecialStructure.objects.filter(name=ds_name).first()
        if vms_asset and struct:
            vms_dss = DataStructure.objects.filter(context__asset_type=vms_asset.asset_type)
            config = struct.config
            return vms_asset, vms_dss, config

        return None

    @staticmethod
    def calc_vms_win_path(asset: Asset):
        path_prefix = 'C:\\Program Files\\'
        win_path = ''
        struct_data = SpecialStructures.get_vms_and_config(asset, ds_name='%VMS_WIN_PATH%')
        if struct_data:
            vms_asset, vms_dss, config = struct_data
            advanced_path_ds = vms_dss.filter(name=config['advanced_ds']).first()
            if advanced_path_ds:
                win_path = advanced_path_ds.find_actual_value(asset=vms_asset)
            if not win_path:
                company_name_ds = vms_dss.filter(name=config['default_ds']).first()
                if company_name_ds:
                    win_path = company_name_ds.find_actual_value(asset=vms_asset)

            if win_path:
                vms_name_ds = vms_dss.filter(name=config['vms_name_ds']).first()
                if vms_name_ds:
                    vms_name = vms_name_ds.find_actual_value(asset=vms_asset)
                    if vms_name:
                        return f'{path_prefix}{win_path}\\{vms_name}'

        return path_prefix + '{vms_path}'

    @staticmethod
    def calc_vms_lin_path(asset: Asset):
        struct_data = SpecialStructures.get_vms_and_config(asset, ds_name='%VMS_LIN_PATH%')
        if struct_data:
            vms_asset, vms_dss, config = struct_data
            company_id_ds = vms_dss.filter(name=config['default_ds']).first()
            if company_id_ds:
                lin_path = company_id_ds.find_actual_value(asset=vms_asset)
                if lin_path:
                    return f'/opt/{lin_path}/mediaserver'

        return '/opt/{vmsName}/mediaserver'

    @staticmethod
    def calc_vms_company_id(asset: Asset):
        struct_data = SpecialStructures.get_vms_and_config(asset, ds_name='%VMS_COMPANY_ID%')
        if struct_data:
            vms_asset, vms_dss, config = struct_data
            default_ds = vms_dss.filter(name=config['ds']).first()
            if default_ds:
                return default_ds.find_actual_value(asset=vms_asset)

        return '{companyId}'

    @staticmethod
    def calc_vms_lin_service_name(asset: Asset):
        struct_data = SpecialStructures.get_vms_and_config(asset, ds_name='%VMS_LIN_SERVICE_NAME%')
        if struct_data:
            vms_asset, vms_dss, config = struct_data
            default_ds = vms_dss.filter(name=config['ds']).first()
            if default_ds:
                company_id = default_ds.find_actual_value(asset=vms_asset)
                if company_id:
                    return f'{company_id}-mediaserver'

        return '{companyId}-mediaserver'

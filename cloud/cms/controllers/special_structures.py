from cms.models import get_cloud_portal_asset, Asset, LicenseType, AssetType, DataStructure, get_vms_asset, SpecialStructure
from util.config import get_config

# Special Structures constants

VMS_WIN_PATH = '%VMS_WIN_PATH%'
VMS_LIN_PATH = '%VMS_LIN_PATH%'
VMS_COMPANY_ID = '%VMS_COMPANY_ID%'
VMS_LIN_SERVICE_NAME = '%VMS_LIN_SERVICE_NAME%'
VMS_MAC_COMPANY_ID ='%VMS_MAC_COMPANY_ID%'
VMS_WIN_EXECUTABLE = '%VMS_WIN_EXECUTABLE%'


class SpecialStructures:
    """ Only use this with assets that are single customization.\n
        Calculates special DataStructures without making DataRecords.\n
        Currently supports the following:\n
        - %CUSTOMIZATION_NAME%
        - %LANGUAGES%
    """

    # Constants removed from methods to be usable in unit test
    WIN_PATH_PREFIX = 'C:\\Program Files\\'
    VMS_PATH = '{vms_path}'
    LIN_PATH = '/opt/{vmsName}'
    COMPANY_ID = '{companyId}'
    LIN_SERVICE_NAME = '{companyId}-mediaserver'
    VMS_MAC_COMPANY_ID = '{macCompanyId}'
    VMS_WIN_EXECUTABLE = '{win_executable}.exe'
    VMS_ID = '{vmsId}'

    def __init__(self):
        self.function_dict = {}
        self.add_function("%CUSTOMIZATION_NAME%", self.calc_customization, 'Customization Name', 'Name of the current customization')
        self.add_function("%LANGUAGES%", self.calc_lang_codes, hidden=True)
        self.add_function("%CLOUD_LINK%", self.calc_cloud_link, 'Cloud Link', 'Link to the cloud portal with protocol', shortcut=True)
        self.add_function("%CLOUD_HOST%", self.calc_cloud_host, 'Cloud Host', 'Hostname of the cloud portal without protocol')
        self.add_function("%licenseTypes%", self.calc_license_type, hidden=True)
        self.add_function("%VMS_WIN_PATH%", self.calc_vms_win_path, 'VMS Windows Path', 'Path to the vms directory on Windows')
        self.add_function("%VMS_LIN_PATH%", self.calc_vms_lin_path, 'VMS Linux Path', 'Path to the vms directory on Linux')
        self.add_function("%VMS_LIN_SERVICE_NAME%", self.calc_vms_lin_service_name, 'Mediaserver Service', 'Mediaserver service name on Linux')
        self.add_function("%VMS_COMPANY_ID%", self.calc_vms_company_id, 'VMS Company Id', 'Company ID used by VMS')
        self.add_function('%VMS_MAC_COMPANY_ID%', self.calc_vms_mac_company_id, 'VMS Mac Company Id', 'Company ID used by VMS on Mac OS')
        self.add_function('%VMS_WIN_EXECUTABLE%', self.calc_vms_win_executable, 'VMS Windows Executable', 'VMS executable name on windows')
        self.add_function('%VMS_ID%', self.calc_vms_id, 'VMS Id', 'VMS Id from vms pack')
        self.add_function('%MOBILE_DISPLAY_NAME%', self.calc_mobile_display_name, 'Mobile Client Display Name', 'The name used when referring to the mobile client throughout cloud portal. Does not affect the actual iOS or Android application name', shortcut=True)
        self.add_function('%ABV%', self.calc_abbreviation, 'VMS Abbreviation', 'VMS abbreviation if applicable, otherwise uses %VMS_NAME%')

    def add_function(self, tag: str, function, label='', description='', hidden=False, shortcut=False):
        self.function_dict[tag] = {
            'function': function,
            'label': label or tag,
            'description': description,
            'hidden': hidden,
            'shortcut': shortcut
        }

    def calc(self, tag: str, asset: Asset):
        if tag in self.function_dict:
            return self.function_dict[tag]['function'](asset)
        return ""

    @staticmethod
    def get_global_value(asset: Asset, key: str):
        customization = asset.customizations.first()
        return get_cloud_portal_asset(customization=customization.name).read_global_value(key)

    @staticmethod
    def calc_cloud_portal(asset: Asset):
        customization = asset.customizations.first()
        return get_cloud_portal_asset(customization=customization.name).name if customization else ""

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
        if not customization or not get_cloud_portal_asset(customization=customization.name, no_create=True):
            return ""
        conf = get_config(customization.name)
        return conf["cloud_portal"]["url"].lstrip('https://').lstrip('http://')

    @staticmethod
    def calc_cloud_link(asset: Asset):
        customization = asset.customizations.first()
        if not customization or not get_cloud_portal_asset(customization=customization.name, no_create=True):
            return ""
        conf = get_config(customization.name)
        return conf["cloud_portal"]["url"].replace("http:", "https:")

    @staticmethod
    def calc_license_type(asset: Asset):
        return LicenseType.get_license_types()

    @staticmethod
    def get_vms_and_config(asset: Asset, ds_name):
        customization = asset.customizations.first()
        if not customization:
            return None
        vms_asset = get_vms_asset(customization=customization.name)
        struct = SpecialStructure.objects.filter(name=ds_name).first()
        if vms_asset and struct:
            vms_dss = DataStructure.objects.filter(context__asset_type=vms_asset.asset_type)
            config = struct.config
            return vms_asset, vms_dss, config

        return None

    @staticmethod
    def filter_ds(ds, config, name):
        return ds.filter(name=config[name]).first()

    @staticmethod
    def find_value(ds, asset):
        return ds.find_actual_value(asset=asset)

    @staticmethod
    def get_vms_default_ds_value(asset, ds_name):
        struct_data = SpecialStructures.get_vms_and_config(asset, ds_name=ds_name)
        if struct_data:
            vms_asset, vms_dss, config = struct_data
            default_ds = SpecialStructures.filter_ds(vms_dss, config, 'ds')
            if default_ds:
                ds_val = SpecialStructures.find_value(default_ds, vms_asset)
                if ds_val:
                    return ds_val

    @staticmethod
    def calc_vms_win_path(asset: Asset):
        win_path = ''
        struct_data = SpecialStructures.get_vms_and_config(asset, VMS_WIN_PATH)
        if struct_data:
            vms_asset, vms_dss, config = struct_data
            advanced_path_ds = SpecialStructures.filter_ds(vms_dss, config, 'advanced_ds')
            if advanced_path_ds:
                win_path = SpecialStructures.find_value(advanced_path_ds, asset)
            if not win_path:
                company_name_ds = SpecialStructures.filter_ds(vms_dss, config, 'default_ds')
                if company_name_ds:
                    win_path = SpecialStructures.find_value(company_name_ds, vms_asset)

            if win_path:
                vms_name_ds = SpecialStructures.filter_ds(vms_dss, config, 'vms_name_ds')
                if vms_name_ds:
                    vms_name = SpecialStructures.find_value(vms_name_ds, vms_asset)
                    if vms_name:
                        return f'{SpecialStructures.WIN_PATH_PREFIX}{win_path}\\{vms_name}'

        return SpecialStructures.WIN_PATH_PREFIX + SpecialStructures.VMS_PATH

    @staticmethod
    def calc_vms_lin_path(asset: Asset):
        lin_path = SpecialStructures.get_vms_default_ds_value(asset, VMS_LIN_PATH)
        if lin_path:
            return f'/opt/{lin_path}'
        return SpecialStructures.LIN_PATH

    @staticmethod
    def calc_vms_company_id(asset: Asset):
        company_id = SpecialStructures.get_vms_default_ds_value(asset, VMS_COMPANY_ID)
        if company_id:
            return company_id
        return SpecialStructures.COMPANY_ID

    @staticmethod
    def calc_vms_lin_service_name(asset: Asset):
        company_id = SpecialStructures.get_vms_default_ds_value(asset, VMS_LIN_SERVICE_NAME)
        if company_id:
            return f'{company_id}-mediaserver'
        return SpecialStructures.LIN_SERVICE_NAME

    @staticmethod
    def calc_vms_mac_company_id(asset: Asset):
        mac_company_id = SpecialStructures.get_vms_default_ds_value(asset, VMS_MAC_COMPANY_ID)
        if mac_company_id:
            return mac_company_id.lower().replace(' ', '-')
        return SpecialStructures.VMS_MAC_COMPANY_ID

    @staticmethod
    def calc_vms_win_executable(asset: Asset):
        win_executable = SpecialStructures.get_vms_default_ds_value(asset, VMS_WIN_EXECUTABLE)
        if win_executable:
            return f'{win_executable}.exe'
        return SpecialStructures.VMS_WIN_EXECUTABLE

    @staticmethod
    def calc_vms_id(asset: Asset):
        return SpecialStructures.get_vms_default_ds_value(asset, '%VMS_ID%') or SpecialStructures.VMS_ID

    @staticmethod
    def calc_mobile_display_name(asset):
        customization = asset.customizations.first()
        if customization:
            return get_cloud_portal_asset(customization=customization.name).read_global_value('%MOBILE_DISPLAY_NAME%')
        return 'the mobile client'

    @staticmethod
    def calc_abbreviation(asset):
        customization = asset.customizations.first()
        if not customization:
            return ''
        if customization.name in ['default', 'default_cn', 'default_zh_CN', 'metavms']:
            return 'Nx'
        else:
            vms_name_ds: DataStructure = DataStructure.objects.filter(name='%VMS_NAME%', context__asset_type__type=AssetType.ASSET_TYPES.cloud_portal).first()
            return vms_name_ds.find_actual_value(asset)

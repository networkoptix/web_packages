from uuid import uuid4

import pytest
from model_bakery import baker

from cms.models import AssetType, DataStructure, LicenseType, SpecialStructure
from cms.controllers.special_structures import SpecialStructures, VMS_LIN_PATH, VMS_WIN_PATH


class TestSpecialStructures:
    CLOUD_HOST = 'cloud-test.hdw.mx'
    CLOUD_LINK = 'https://cloud-test.hdw.mx'
    DS_TEST_NAME = '%TEST%'
    DS_TEST_CONFIG = {'ds': 'Test Config'}

    @pytest.fixture(autouse=True)
    def setup(self, account_factory, asset_factory, mocker, db, default_customization):
        self.superuser = account_factory()
        self.cloud_portal_asset = next(asset_factory(
            asset_type=AssetType.ASSET_TYPES.cloud_portal, account=self.superuser))
        self.vms_asset = next(asset_factory(
            asset_type=AssetType.ASSET_TYPES.vms, account=self.superuser))
        self.special_structure = SpecialStructures()
        existing_ds = SpecialStructure.objects.filter(name=self.DS_TEST_NAME).first()
        default_customization.host = self.CLOUD_HOST
        default_customization.save()
        if existing_ds:
            existing_ds.config = self.DS_TEST_CONFIG
            existing_ds.save()

        self.ds = existing_ds or baker.make(
            SpecialStructure, name=self.DS_TEST_NAME, config=self.DS_TEST_CONFIG)

    @pytest.fixture()
    def mock_actual_values(self, mocker):
        ds, ds_value, config  = [str(uuid4()) for _ in range(3)]
        struct_data = [self.vms_asset, ds_value, config]

        self.mock_filter_ds = mocker.patch('cms.controllers.special_structures.SpecialStructures.filter_ds', return_value=ds)
        self.mock_find_value = mocker.patch('cms.controllers.special_structures.SpecialStructures.find_value', return_value=ds_value)
        self.mock_get_vms_and_config = mocker.patch(
            'cms.controllers.special_structures.SpecialStructures.get_vms_and_config', return_value=struct_data)


        def assert_actual_values_used():
            self.mock_filter_ds.assert_called_once_with(ds_value, config, 'ds')
            self.mock_find_value.assert_called_once_with(ds, self.vms_asset)

        return ds_value, assert_actual_values_used, ds, struct_data


    def test_add_function(self):
        tag = 'Test Tag'
        test_func = 'Test Function'
        label = 'Test Label'
        description = 'Test Description'
        shortcut = True
        self.special_structure.add_function(tag, test_func, label=label, description=description, shortcut=shortcut)

        added = self.special_structure.function_dict[tag]

        assert added
        assert added['function'] == test_func
        assert added['label'] == label
        assert added['description'] == description
        assert not added['hidden']
        assert added['shortcut']

    def test_calc(self):
        customization = self.special_structure.calc("%CUSTOMIZATION_NAME%", self.cloud_portal_asset)

        assert customization == self.cloud_portal_asset.customizations.first().name

    def test_calc_lang_codes(self):
        lang_codes = self.special_structure.calc_lang_codes(self.cloud_portal_asset)

        assert lang_codes == self.cloud_portal_asset.languages_list

    def test_calc_cloud_host(self):
        cloud_host = self.special_structure.calc_cloud_host(self.cloud_portal_asset)

        assert cloud_host == self.CLOUD_HOST

    def test_calc_cloud_link(self):
        cloud_link = self.special_structure.calc_cloud_link(self.cloud_portal_asset)

        assert cloud_link == self.CLOUD_LINK

    def test_calc_license_type(self):
        license_types = self.special_structure.calc_license_type(self.cloud_portal_asset)

        assert license_types == LicenseType.get_license_types()

    def test_get_vms_and_config(self, mock_actual_values):
        expected_vms_asset, expected_vms_dss, expected_config = mock_actual_values[-1]
        vms_asset, vms_dss, config = self.special_structure.get_vms_and_config(self.cloud_portal_asset, self.DS_TEST_NAME)

        assert vms_asset == self.vms_asset
        assert vms_dss == expected_vms_dss
        assert config == expected_config
        assert vms_asset == expected_vms_asset

    def test_get_vms_default_ds_value(self, mock_actual_values):
        expected_value, assert_actual_values_used, *_ = mock_actual_values

        ds_val = self.special_structure.get_vms_default_ds_value(self.cloud_portal_asset, self.DS_TEST_NAME)

        assert_actual_values_used()
        assert ds_val == expected_value

    def test_calc_vms_win_path(self, mock_actual_values):
        expected_value, _, ds, struct_data = mock_actual_values
        vms_asset, vms_dss, config = struct_data

        vms_win_path = self.special_structure.calc_vms_win_path(self.cloud_portal_asset)

        self.mock_filter_ds.assert_called_with(vms_dss, config, 'vms_name_ds')
        self.mock_find_value.assert_called_with(ds, vms_asset)
        self.mock_get_vms_and_config.assert_called_once_with(self.cloud_portal_asset, VMS_WIN_PATH)
        assert vms_win_path == f'{SpecialStructures.WIN_PATH_PREFIX}{expected_value}\\{expected_value}'

    def test_calc_vms_lin_path(self, mock_actual_values):
        expected_value, assert_actual_values_used, *_ = mock_actual_values

        lin_path = self.special_structure.calc_vms_lin_path(self.cloud_portal_asset)

        assert_actual_values_used()
        assert lin_path == SpecialStructures.LIN_PATH.replace('{vmsName}', expected_value)

    def test_calc_vms_company_id(self, mock_actual_values):
        expected_value, assert_actual_values_used, *_ = mock_actual_values

        company_id = self.special_structure.calc_vms_company_id(self.cloud_portal_asset)

        assert_actual_values_used()
        assert company_id == SpecialStructures.COMPANY_ID.replace('{companyId}', expected_value)

    def test_calc_vms_lin_service_name(self, mock_actual_values):
        expected_value, assert_actual_values_used, *_ = mock_actual_values
        service_name = self.special_structure.calc_vms_lin_service_name(self.cloud_portal_asset)

        assert_actual_values_used()
        assert service_name == SpecialStructures.LIN_SERVICE_NAME.replace('{companyId}', expected_value)

    def test_calc_vms_mac_company_id(self, mock_actual_values):
        expected_value, assert_actual_values_used, *_ = mock_actual_values

        mac_company_id = self.special_structure.calc_vms_mac_company_id(self.cloud_portal_asset)

        assert_actual_values_used()
        assert mac_company_id == SpecialStructures.VMS_MAC_COMPANY_ID.replace('{macCompanyId}', expected_value)

    def test_calc_vms_win_executable(self, mock_actual_values):
        expected_value, assert_actual_values_used, *_ = mock_actual_values

        win_executable = self.special_structure.calc_vms_win_executable(self.cloud_portal_asset)

        assert_actual_values_used()
        assert win_executable == SpecialStructures.VMS_WIN_EXECUTABLE.replace('{win_executable}', expected_value)

    def test_calc_vms_id(self, mock_actual_values):
        expected_value, assert_actual_values_used, *_ = mock_actual_values

        vms_id = self.special_structure.calc_vms_id(self.cloud_portal_asset)

        assert_actual_values_used()
        assert vms_id == SpecialStructures.VMS_ID.replace('{vmsId}', expected_value)

    def test_calc_abbreviation_nx(self, mocker, default_portal):
        assert self.special_structure.calc_abbreviation(default_portal) == 'Nx'

    def test_calc_abbreviation_non_nx(self, mocker, other_portal):
        mocker.patch('cms.models.DataStructure.find_actual_value', return_value='Great VMS')
        assert self.special_structure.calc_abbreviation(other_portal) == 'Great VMS'


import pytest
from cms.models import Customization
from cms.management.commands.update_hosts_from_ireg import Command
from nx_ireg.helpers import HDW_IREG_URL

HDW_DATA = [
    {
        "name": "dev4",
        "domain": "dev4.cloud.hdw.mx",
        "description": "dev4 instance",
        "group": "cloud-backend-team",
        "instance_customizations":
        [
            {
                "cloud_customization": "default",
                "domain": "dev4.cloud.hdw.mx"
            },
            {
                "cloud_customization": "digitalwatchdog",
                "domain": "digitalwatchdog.dev4.cloud.hdw.mx"
            }
        ]
    },
    {
        "name": "test",
        "domain": "test.cloud.hdw.mx",
        "description": "test",
        "group": "dev",
        "instance_customizations":
        [
            {
                "cloud_customization": "default",
                "domain": "test.cloud.hdw.mx"
            }
        ]
    },
]

S3_DATA = {
    "version": "1",
    "groups": {
        "demo": {
            "default": "demo.cloud.hdw.mx",
            "metavms": "metavms.demo.cloud.hdw.mx"
        },
        "test": {
            "default": "cloud-test.hdw.mx",
            "digitalwatchdog": "digitalwatchdog.cloud-test.hdw.mx",
            "vmsdemoblue": "vmsdemoblue.cloud-test.hdw.mx",
            "hanwha": "hanwha.cloud-test.hdw.mx",
            "metavms": "metavms.cloud-test.hdw.mx",
            "t11": "t11-cloud-test.hdw.mx"
        },
    }
}

class TestUpdateHostsFromIreg:

    @pytest.fixture(autouse=True)
    def setup(self, mocker):
        self.mocked_get_ireg = mocker.patch(
            "nx_ireg.helpers.get_ireg", return_value=HDW_DATA)
        self.mocked_get_env = mocker.patch(
            "nx_ireg.helpers.os.getenv", return_value='dev4')
    def test_handle_missing_env(self, mocker, db, default_customization):
        self.mocked_get_env.return_value = None
        instance = Command()
        try:
            instance.handle()
        except SystemExit as e:
            assert True
        else:
            assert False, "Should have raised SystemExit"
        self.mocked_get_ireg.assert_not_called()
        options = {'ignore_missing': 'True'}
        instance.handle(**options)
        self.mocked_get_ireg.assert_not_called()

    def test_handle_missing_data(self, mocker, db, default_customization):
        self.mocked_get_ireg.return_value = None
        instance = Command()
        try:
            instance.handle()
        except SystemExit as e:
            assert True
        else:
            assert False, "Should have raised SystemExit"
        self.mocked_get_ireg.assert_called_once_with(HDW_IREG_URL)
        self.mocked_get_ireg.reset_mock()
        self.mocked_get_ireg.return_value = []
        options = {'ignore_missing': 'True'}
        instance.handle(**options)
        self.mocked_get_ireg.assert_called_once_with(HDW_IREG_URL)

    def test_handle_missing_customizations(self, mocker, db, default_customization):
        self.mocked_get_ireg.return_value = [{"name": "dev4"}]
        instance = Command()
        try:
            instance.handle()
        except SystemExit as e:
            assert True
        else:
            assert False, "Should have raised SystemExit"
        self.mocked_get_ireg.assert_called_once_with(HDW_IREG_URL)
        self.mocked_get_ireg.reset_mock()
        self.mocked_get_ireg.return_value = [{"name": "dev4", "instance_customizations": []}]
        options = {'ignore_missing': 'True'}
        instance.handle(**options)
        self.mocked_get_ireg.assert_called_once_with(HDW_IREG_URL)


    def test_handle(self, mocker, db, default_customization):
        assert default_customization.host != "dev4.cloud.hdw.mx"
        instance = Command()
        instance.handle()
        self.mocked_get_ireg.assert_called_once_with(HDW_IREG_URL)
        default_customization.refresh_from_db()
        digitalwatchdog = Customization.objects.get(name="digitalwatchdog", host="digitalwatchdog.dev4.cloud.hdw.mx")
        assert digitalwatchdog.default_language.code == "en_US"
        assert default_customization.host == "dev4.cloud.hdw.mx"

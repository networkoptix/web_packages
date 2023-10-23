import os

from NoptixLibrary.suite import Suite, Mediaserver, CloudAccount
from login import LoginDialog
from resource_import import get_chrome
from system_admin import SystemAdmin
from variables import ENV


def advanced_system_settings_availability(server: Mediaserver, user: CloudAccount):
    """
    [Tags]    C76633    advanced settings
    """
    with get_chrome() as driver:
        driver.get(ENV + f"/systems/{server.id}")
        LoginDialog(driver).basic_cloud_login(user.email, user.password)
        driver.get(ENV + f"/systems/{server.id}/?advanced")
        advanced_settings = SystemAdmin(driver).get_advanced_settings_block()
        advanced_settings.get_hide_advanced_settings_button().wait_until_visible()
        advanced_settings.get_hide_advanced_settings_icon().wait_until_visible()
        advanced_settings.get_advanced_settings_alert_icon().wait_until_visible()
        expected_alert_label = "Settings displayed below are advanced."
        assert advanced_settings.get_advanced_settings_alert().get_text() == expected_alert_label
        expected_warning = "Changing them may cause server to work incorrectly."
        assert advanced_settings.get_advanced_settings_warning().get_text() == expected_warning
        print("pass")


def advanced_system_settings_inaccessibility(server: Mediaserver, user: CloudAccount):
    """
    [Tags]    C76633    advanced settings
    """
    with get_chrome() as driver:
        driver.get(ENV + f"/systems/{server.id}")
        LoginDialog(driver).basic_cloud_login(user.email, user.password)
        driver.get(ENV + f"/systems/{server.id}/?advanced")
        system_admin = SystemAdmin(driver)
        advanced_settings = system_admin.get_advanced_settings_block()
        system_admin.disconnect_from_account_button().wait_until_visible()
        advanced_settings.get_hide_advanced_settings_button().wait_until_not_visible()
        assert driver.current_url == ENV + f"/systems/{server.id}"
        print("pass")


if __name__ == "__main__":
    suite_name = os.path.basename(__file__)
    suite_name = suite_name.replace("test_", "").replace(".py", "")
    with Suite() as suite:
        cloud_owner = suite.create_cloud_account()
        cloud_users = suite.create_cloud_accounts()
        cloud_server = suite.create_cloud_server(
            cloud_owner,
            f"{suite_name}_1_",
            cloud_users=cloud_users,
            )
        advanced_system_settings_availability(cloud_server, cloud_owner)
        advanced_system_settings_availability(cloud_server, cloud_server.get_cloud_admin())
        advanced_system_settings_inaccessibility(cloud_server, cloud_server.get_cloud_viewer())
        advanced_system_settings_inaccessibility(cloud_server, cloud_server.get_cloud_live_viewer())
        advanced_system_settings_inaccessibility(
            cloud_server,
            cloud_server.get_cloud_advanced_viewer(),
            )
        advanced_system_settings_inaccessibility(cloud_server, cloud_server.get_cloud_custom_user())

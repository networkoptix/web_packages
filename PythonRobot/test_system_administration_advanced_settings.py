import os

from NoptixLibrary.suite import Suite, Mediaserver, CloudAccount
from nx_modal import SettingsSavedModalWindow
from pages.login import LoginDialog
from pages.system_admin import SystemAdmin
from resource_import import get_chrome
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


def advanced_system_settings_for_offline_system(server: Mediaserver):
    """
    [Tags]    C76634
    """
    # Is now blocked by CLOUD-11655
    with get_chrome() as driver:
        owner = server.get_cloud_owner()
        server.stop()
        driver.get(ENV + f"/systems/{server.id}")
        LoginDialog(driver).basic_cloud_login(owner.email, owner.password)
        driver.get(ENV + f"/systems/{server.id}/?advanced")
        system_admin = SystemAdmin(driver)
        system_admin.system_offline_text().wait_until_visible()
        advanced_settings = system_admin.get_advanced_settings_block()
        advanced_settings.get_advanced_settings_alert().wait_until_visible()
        advanced_settings.get_advanced_settings_element_block_one().wait_until_elements_not_seen()
        server.start(wait_for_started=True)
        driver.refresh()
        advanced_settings.get_advanced_settings_element_block_one().wait_until_elements_loaded()


def hide_advanced_settings_button_functionality(server: Mediaserver):
    """
    [Tags]    C76635    advanced settings
    """
    with get_chrome() as driver:
        owner = server.get_cloud_owner()
        driver.get(ENV + f"/systems/{server.id}")
        LoginDialog(driver).basic_cloud_login(owner.email, owner.password)
        driver.get(ENV + f"/systems/{server.id}/?advanced")
        system_admin = SystemAdmin(driver)
        advanced_settings = system_admin.get_advanced_settings_block()
        advanced_settings.get_advanced_settings_element_block_one().wait_until_elements_loaded()
        advanced_settings.get_hide_advanced_settings_button().click()
        advanced_settings.get_advanced_settings_element_block_one().wait_until_elements_not_seen()
        print("pass")


def audit_trail_backup_and_statistics_section(server: Mediaserver):
    """
    [Tags]    C78244    advanced settings
    """
    # TODO: Add checkboxes check. NxCheckbox is not easy to click on and test is not of the highest priority so no need to spend a lot of time to fix it yet.
    backup_settings_value = {
        'backupNewCameras': True,
        'id': '00000000-1111-0000-0000-000000000000',
        'quality': 'CameraBackupBoth',
        }
    settings = {
        "additionalLocalFsTypes": None,
        "arecontRtspEnabled": False,
        "auditTrailPeriodDays": 183,
        "autoDiscoveryResponseEnabled": True,
        "autoUpdateThumbnails": True,
        "backupSettings": backup_settings_value,
        "clientStatisticsSettingsUrl": None,
        }
    server.api.set_system_settings(settings)
    owner = server.get_cloud_owner()
    with get_chrome() as driver:
        driver.get(ENV + f"/systems/{server.id}")
        LoginDialog(driver).basic_cloud_login(owner.email, owner.password)
        system_admin = SystemAdmin(driver)
        driver.get(ENV + f"/systems/{server.id}/?advanced")
        advanced_settings = system_admin.get_advanced_settings_block()
        block_one = advanced_settings.get_advanced_settings_element_block_one()
        advanced_settings.get_hide_advanced_settings_button().wait_until_visible()
        block_one.get_additional_local_fs_types_input().input_text('test Settings changed')
        system_admin.get_save_button().click()
        success_dialog = SettingsSavedModalWindow(driver)
        success_dialog.wait_until_visible()
        assert 'Success' == success_dialog.get_header_text()
        assert 'Settings saved.' == success_dialog.get_body_text()
        success_dialog.close()
        actual_api_result = server.api.get_system_settings_from_server()['additionalLocalFsTypes']
        assert actual_api_result == 'test Settings changed'
        block_one.get_audit_trail_period_days_input().input_text('150')
        system_admin.get_save_button().click()
        success_dialog.wait_until_visible()
        success_dialog.close()
        actual_api_result = server.api.get_system_settings_from_server()['auditTrailPeriodDays']
        assert actual_api_result == 150
        block_one.get_client_statistics_relative_url_input().input_text('https://www.google.com')
        system_admin.get_save_button().click()
        success_dialog.wait_until_visible()
        success_dialog.close()
        actual_api_result = server.api.get_system_settings_from_server()[
            'clientStatisticsSettingsUrl']
        assert actual_api_result == 'https://www.google.com'
        print("pass")


def connection_and_email(server: Mediaserver):
    """
    [Tags]    C78260    advanced settings
    """
    settings = {
        "cloudConnectRelayingEnabled": True,
        "cloudConnectUdpHolePunchingEnabled": True,
        "crossdomainEnabled": False,
        "defaultExportVideoCodec": 'mpeg4',
        "defaultVideoCodec": 'h263p',
        }
    server.api.set_system_settings(settings)
    owner = server.get_cloud_owner()
    with get_chrome() as driver:
        driver.get(ENV + f"/systems/{server.id}")
        LoginDialog(driver).basic_cloud_login(owner.email, owner.password)
        system_admin = SystemAdmin(driver)
        driver.get(ENV + f"/systems/{server.id}/?advanced")
        advanced_settings = system_admin.get_advanced_settings_block()
        advanced_settings.get_connection_alive_update_interval_input().wait_until_visible()
        advanced_settings.get_connection_alive_update_interval_input().input_text('62')
        system_admin.get_save_button().click()
        success_dialog = SettingsSavedModalWindow(driver)
        success_dialog.wait_until_visible()
        success_dialog.close()
        actual_api_result = server.api.get_system_settings_from_server()[
            'ec2AliveUpdateIntervalSec']
        assert actual_api_result == 62
        advanced_settings.get_email_from_input().input_text('networkoptixtesting123@gmail.com')
        system_admin.get_save_button().click()
        success_dialog.wait_until_visible()
        success_dialog.close()
        actual_api_result = server.api.get_system_settings_from_server()['emailFrom']
        assert actual_api_result == 'networkoptixtesting123@gmail.com'
        advanced_settings.get_email_signature_input().input_text('Testing')
        system_admin.get_save_button().click()
        success_dialog.wait_until_visible()
        success_dialog.close()
        actual_api_result = server.api.get_system_settings_from_server()['emailSignature']
        assert actual_api_result == 'Testing'
        advanced_settings.get_support_email_input().input_text(
            'http://support.networkoptix.testing.com')
        system_admin.get_save_button().click()
        success_dialog.wait_until_visible()
        success_dialog.close()
        actual_api_result = server.api.get_system_settings_from_server()['emailSupportEmail']
        assert actual_api_result == 'http://support.networkoptix.testing.com'
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
        advanced_system_settings_for_offline_system(cloud_server)
        hide_advanced_settings_button_functionality(cloud_server)
        audit_trail_backup_and_statistics_section(cloud_server)
        connection_and_email(cloud_server)

import os

from NoptixLibrary.suite import Mediaserver
from NoptixLibrary.suite import Suite
from RobotVariables import RobotVariables
from browsers.chrome import get_chrome
from nx_modal import ApplyChangesModalDialog
from pages.header import HeaderNav
from pages.landing_page import LandingPage
from pages.login import LoginDialog
from pages.system_admin import SystemAdmin
from variables import ENV

rb = RobotVariables("en_US")


def system_settings_and_security_settings_should_match_settings_on_server(server: Mediaserver):
    """
    [tags]    system    cloud    webadmin    system settings    C69736    C65697
    """
    with get_chrome() as driver:
        server.api.restore_default_general_settings()
        url = ENV + f'/systems/{server.id}'
        driver.get(url)
        owner = server.get_cloud_owner()
        LoginDialog(driver).basic_cloud_login(owner.email, owner.password)
        settings = SystemAdmin(driver).get_tab_settings().get_general_section()
        assert not settings.is_ok_button_visible()
        assert not settings.is_cancel_button_visible()
        # System settings block.
        assert settings.get_autodiscovery_option_text() == rb.ENABLE_AUTO_DISCOVERY_TEXT
        assert settings.get_autodiscovery_description() == rb.ENABLE_AUTO_DISCOVERY_DESCRIPTION_TEXT
        assert settings.get_statistics_allowed_option_text() == rb.SEND_ANONYMOUS_USAGE_TEXT
        assert settings.get_statistics_allowed_description() == rb.SEND_ANONYMOUS_USAGE_DESCRIPTION_TEXT
        assert settings.get_optimize_camera_settings_option_text() == rb.ALLOW_SYSTEM_OPTIMIZE_TEXT
        # Security block.
        assert settings.get_audit_trail_option_text() == rb.ENABLE_AUDIT_TRAIL_TEXT
        assert settings.get_audit_trail_description() == rb.ENABLE_AUDIT_TRAIL_DESCRIPTION_TEXT
        assert settings.get_force_encrypted_connections_option_text() == rb.ALLOW_ONLY_SECURE_TEXT
        assert settings.get_video_traffic_encryption_option_text() == rb.ENCRYPT_VIDEO_TRAFFIC_TEXT
        assert settings.video_traffic_encryption_description() == rb.ENCRYPT_VIDEO_TRAFFIC_DESCRIPTION_TEXT
        assert settings.get_limit_session_duration_option_text() == rb.LIMIT_SESSION_DURATION_TEXT

        server_settings = server.api.get_system_settings_from_server()
        assert settings.autodiscovery_option().is_checked() == server_settings['autoDiscoveryEnabled']
        assert settings.statistics_allowed_option().is_checked() == server_settings['statisticsAllowed']
        assert settings.optimize_camera_settings_option().is_checked() == server_settings['cameraSettingsOptimization']
        assert settings.audit_trail_option().is_checked() == server_settings['auditTrailEnabled']
        assert settings.force_encrypted_connections_option().is_checked() == server_settings['trafficEncryptionForced']
        assert settings.video_traffic_encryption_option().is_checked() == server_settings['videoTrafficEncryptionForced']
        session_limit_minutes = server_settings['sessionLimitMinutes']
        assert session_limit_minutes == 0
        assert not settings.limit_session_duration_option().is_checked()

        # https://networkoptix.testrail.net/index.php?/cases/view/69736
        # https://networkoptix.testrail.net/index.php?/cases/view/65697
        assert settings.autodiscovery_option().is_checked()
        assert settings.statistics_allowed_option().is_checked()
        assert settings.optimize_camera_settings_option().is_checked()
        assert settings.audit_trail_option().is_checked()
        assert not settings.force_encrypted_connections_option().is_checked()
        assert not settings.video_traffic_encryption_option().is_checked()
        assert not settings.limit_session_duration_option().is_checked()

        administrator = server.get_cloud_admin()
        HeaderNav(driver).log_out()
        LandingPage(driver)
        HeaderNav(driver).log_in_button().click()
        LoginDialog(driver).basic_cloud_login(administrator.email, administrator.password)
        settings = SystemAdmin(driver).get_tab_settings().get_general_section()
        assert settings.autodiscovery_option().is_checked()
        assert settings.statistics_allowed_option().is_checked()
        assert settings.optimize_camera_settings_option().is_checked()
        assert settings.audit_trail_option().is_checked()
        assert not settings.force_encrypted_connections_option().is_checked()
        assert not settings.video_traffic_encryption_option().is_checked()
        assert not settings.limit_session_duration_option().is_checked()


def test_changing_settings_changes_it_on_server(server: Mediaserver):
    """
    [tags]    system    cloud    webadmin    system settings    C65722    C65724
    """
    with get_chrome() as driver:
        server.api.restore_default_general_settings()
        url = ENV + f'/systems/{server.id}'
        driver.get(url)
        owner = server.get_cloud_owner()
        LoginDialog(driver).basic_cloud_login(owner.email, owner.password)

        settings = SystemAdmin(driver).get_tab_settings().get_general_section()
        settings.autodiscovery_option().unselect()
        settings.save()
        server.api.wait_until_server_setting_to_be('autoDiscoveryEnabled', False)
        settings.statistics_allowed_option().unselect()
        settings.save()
        server.api.wait_until_server_setting_to_be('statisticsAllowed', False)
        settings.optimize_camera_settings_option().unselect()
        settings.save()
        server.api.wait_until_server_setting_to_be('cameraSettingsOptimization', False)

        # https://networkoptix.testrail.net/index.php?/cases/view/65724
        settings.audit_trail_option().unselect()
        settings.get_unsaved_changes_label().wait_until_not_visible()
        assert settings.is_ok_button_visible()
        assert settings.is_cancel_button_visible()
        settings.cancel()
        settings.get_unsaved_changes_label().wait_until_visible()
        assert settings.audit_trail_option().is_checked()
        settings.force_encrypted_connections_option().select()
        settings.video_traffic_encryption_option().select()
        # The limit session checkbox may be not in view. Scroll page to avoid this.
        # TODO: Find a more accurate method to scroll the page to an element.
        driver.scroll_to_bottom()
        settings.limit_session_duration_option().select()
        warning_message = settings.get_warning_message().get_text()
        expected_warning_message = 'Encrypting video traffic may significantly increase CPU usage.'
        assert warning_message == expected_warning_message
        settings.get_unsaved_changes_label().wait_until_not_visible()
        assert settings.is_ok_button_visible()
        assert settings.is_cancel_button_visible()
        settings.cancel()
        assert settings.audit_trail_option().is_checked()
        assert not settings.force_encrypted_connections_option().is_checked()
        assert not settings.video_traffic_encryption_option().is_checked()
        assert not settings.limit_session_duration_option().is_checked()

        settings.audit_trail_option().unselect()
        settings.save()
        server.api.wait_until_server_setting_to_be('auditTrailEnabled', False)
        settings.force_encrypted_connections_option().select()
        settings.save()
        server.api.wait_until_server_setting_to_be('trafficEncryptionForced', True)
        settings.video_traffic_encryption_option().select()
        settings.save()
        server.api.wait_until_server_setting_to_be('videoTrafficEncryptionForced', True)
        settings.limit_session_duration_option().select()
        new_session_limit_value_days = 1
        settings.set_session_duration_limit(new_session_limit_value_days)
        settings.save()
        server.api.wait_until_server_setting_to_be(
            'sessionLimitMinutes',
            new_session_limit_value_days * 24 * 60,
            )
        settings.limit_session_duration_option().unselect()
        settings.save()
        server.api.wait_until_server_setting_to_be('sessionLimitMinutes', 0)


def changing_several_random_checkboxes_works(server: Mediaserver):
    """
    [tags]    system    cloud    webadmin    system settings
    """
    with get_chrome() as driver:
        server.api.restore_default_general_settings()
        url = ENV + f'/systems/{server.id}'
        driver.get(url)
        owner = server.get_cloud_owner()
        LoginDialog(driver).basic_cloud_login(owner.email, owner.password)

        settings = SystemAdmin(driver).get_tab_settings().get_general_section()
        server_settings = server.api.get_system_settings_from_server()
        settings.autodiscovery_option().click()
        settings.statistics_allowed_option().click()
        settings.optimize_camera_settings_option().click()
        settings.get_unsaved_changes_label().wait_until_not_visible(1)
        settings.save()
        server.api.wait_until_server_setting_to_be(
            'autoDiscoveryEnabled',
            not server_settings['autoDiscoveryEnabled'],
            )
        server.api.wait_until_server_setting_to_be(
            'statisticsAllowed',
            not server_settings['statisticsAllowed'],
            )
        server.api.wait_until_server_setting_to_be(
            'cameraSettingsOptimization',
            not server_settings['cameraSettingsOptimization'],
            )

        server_settings = server.api.get_system_settings_from_server()
        # https://networkoptix.testrail.net/index.php?/cases/view/69738
        settings.autodiscovery_option().click()
        settings.statistics_allowed_option().click()
        settings.optimize_camera_settings_option().click()
        settings.get_unsaved_changes_label().wait_until_not_visible(1)
        settings.cancel()
        settings.get_unsaved_changes_label().wait_until_visible(1)
        auto_discovery_enabled = server_settings['autoDiscoveryEnabled']
        statistics_allowed = server_settings['statisticsAllowed']
        camera_settings_optimized = server_settings['cameraSettingsOptimization']
        assert settings.autodiscovery_option().is_checked() == auto_discovery_enabled
        assert settings.statistics_allowed_option().is_checked() == statistics_allowed
        assert settings.optimize_camera_settings_option().is_checked() == camera_settings_optimized
        server.api.wait_until_server_setting_to_be('autoDiscoveryEnabled', auto_discovery_enabled)
        server.api.wait_until_server_setting_to_be('statisticsAllowed', statistics_allowed)
        server.api.wait_until_server_setting_to_be(
            'cameraSettingsOptimization',
            camera_settings_optimized,
            )


def system_and_security_settings_block_is_not_available_for_other_users(server: Mediaserver):
    """
    [tags]    system    cloud    webadmin    system settings    C69737    C65698
    """
    with get_chrome() as driver:
        server.api.restore_default_general_settings()
        url = ENV + f'/systems/{server.id}'
        driver.get(url)
        viewer = server.get_cloud_viewer()
        LoginDialog(driver).basic_cloud_login(viewer.email, viewer.password)
        settings = SystemAdmin(driver).get_tab_settings().get_general_section()
        assert settings.get_system_name() == server.name
        disconnect_button = settings.get_disconnect_from_account_button()
        assert disconnect_button.get_text() == rb.DISCONNECT_FROM_MY_ACCOUNT_TEXT
        settings.get_system_settings_form().wait_until_not_visible()
        settings.get_security_settings_form().wait_until_not_visible()
        HeaderNav(driver).log_out()

        HeaderNav(driver).log_in_button().click()
        advanced_viewer = server.get_cloud_advanced_viewer()
        LoginDialog(driver).basic_cloud_login(advanced_viewer.email, advanced_viewer.password)
        settings = SystemAdmin(driver).get_tab_settings().get_general_section()
        assert settings.get_system_name() == server.name
        disconnect_button = settings.get_disconnect_from_account_button()
        assert disconnect_button.get_text() == rb.DISCONNECT_FROM_MY_ACCOUNT_TEXT
        settings.get_system_settings_form().wait_until_not_visible()
        settings.get_security_settings_form().wait_until_not_visible()
        HeaderNav(driver).log_out()

        HeaderNav(driver).log_in_button().click()
        live_viewer = server.get_cloud_live_viewer()
        LoginDialog(driver).basic_cloud_login(live_viewer.email, live_viewer.password)
        settings = SystemAdmin(driver).get_tab_settings().get_general_section()
        assert settings.get_system_name() == server.name
        disconnect_button = settings.get_disconnect_from_account_button()
        assert disconnect_button.get_text() == rb.DISCONNECT_FROM_MY_ACCOUNT_TEXT
        settings.get_system_settings_form().wait_until_not_visible()
        settings.get_security_settings_form().wait_until_not_visible()
        HeaderNav(driver).log_out()

        HeaderNav(driver).log_in_button().click()
        custom_user = server.get_cloud_custom_user()
        LoginDialog(driver).basic_cloud_login(custom_user.email, custom_user.password)
        settings = SystemAdmin(driver).get_tab_settings().get_general_section()
        assert settings.get_system_name() == server.name
        disconnect_button = settings.get_disconnect_from_account_button()
        assert disconnect_button.get_text() == rb.DISCONNECT_FROM_MY_ACCOUNT_TEXT
        settings.get_system_settings_form().wait_until_not_visible()
        settings.get_security_settings_form().wait_until_not_visible()


def changing_page_without_saving_changes(server: Mediaserver):
    """
    [tags]    system    cloud    webadmin    system settings    C69739
    """
    with get_chrome() as driver:
        server.api.restore_default_general_settings()
        url = ENV + f'/systems/{server.id}'
        driver.get(url)
        owner = server.get_cloud_owner()
        LoginDialog(driver).basic_cloud_login(owner.email, owner.password)
        settings = SystemAdmin(driver).get_tab_settings().get_general_section()
        settings.autodiscovery_option().unselect()
        settings.statistics_allowed_option().unselect()
        settings.optimize_camera_settings_option().unselect()
        settings.get_unsaved_changes_label().wait_until_not_visible(1)
        assert settings.is_ok_button_visible()
        assert settings.is_cancel_button_visible()
        SystemAdmin(driver).get_information_tab().click()
        modal_window = ApplyChangesModalDialog(driver)
        modal_window.wait_until_visible()
        modal_window.discard()
        assert SystemAdmin(driver).get_information_tab().no_alerts()

        HeaderNav(driver).click_tab_by_name('Settings')
        settings = SystemAdmin(driver).get_tab_settings().get_general_section()
        settings.autodiscovery_option().unselect()
        settings.statistics_allowed_option().unselect()
        settings.optimize_camera_settings_option().unselect()
        assert settings.is_ok_button_visible()
        assert settings.is_cancel_button_visible()
        SystemAdmin(driver).get_information_tab().click()
        modal_window.wait_until_visible()
        modal_window.cancel()
        assert settings.is_ok_button_visible()
        assert settings.is_cancel_button_visible()
        assert not settings.autodiscovery_option().is_checked()
        assert not settings.statistics_allowed_option().is_checked()
        assert not settings.optimize_camera_settings_option().is_checked()

        SystemAdmin(driver).get_information_tab().click()
        modal_window.wait_until_visible()
        modal_window.close()
        assert settings.is_ok_button_visible()
        assert settings.is_cancel_button_visible()

        driver.refresh()
        settings = SystemAdmin(driver).get_tab_settings().get_general_section()
        assert not settings.is_ok_button_visible()
        assert not settings.is_cancel_button_visible()
        assert settings.autodiscovery_option().is_checked()
        assert settings.statistics_allowed_option().is_checked()
        assert settings.optimize_camera_settings_option().is_checked()


def changes_made_in_the_thick_client_are_displayed_in_system_settings(server: Mediaserver):
    """
    [tags]    system    cloud    webadmin    system settings    C69741    C65723
    """
    with get_chrome() as driver:
        server.api.restore_default_general_settings()
        url = ENV + f'/systems/{server.id}'
        driver.get(url)
        owner = server.get_cloud_owner()
        LoginDialog(driver).basic_cloud_login(owner.email, owner.password)
        SystemAdmin(driver).get_tab_settings().get_general_section()

        server.api.set_system_settings({'autoDiscoveryEnabled': False})
        driver.refresh()
        settings = SystemAdmin(driver).get_tab_settings().get_general_section()
        assert not settings.autodiscovery_option().is_checked()

        server.api.set_system_settings({'autoDiscoveryEnabled': True})
        driver.refresh()
        settings = SystemAdmin(driver).get_tab_settings().get_general_section()
        assert settings.autodiscovery_option().is_checked()

        server.api.set_system_settings({'statisticsAllowed': False})
        driver.refresh()
        settings = SystemAdmin(driver).get_tab_settings().get_general_section()
        assert not settings.statistics_allowed_option().is_checked()

        server.api.set_system_settings({'statisticsAllowed': True})
        driver.refresh()
        settings = SystemAdmin(driver).get_tab_settings().get_general_section()
        assert settings.statistics_allowed_option().is_checked()

        server.api.set_system_settings({'cameraSettingsOptimization': False})
        driver.refresh()
        settings = SystemAdmin(driver).get_tab_settings().get_general_section()
        assert not settings.optimize_camera_settings_option().is_checked()

        server.api.set_system_settings({'cameraSettingsOptimization': True})
        driver.refresh()
        settings = SystemAdmin(driver).get_tab_settings().get_general_section()
        assert settings.optimize_camera_settings_option().is_checked()

        server.api.set_system_settings({
            'autoDiscoveryEnabled': False,
            'statisticsAllowed': False,
            'cameraSettingsOptimization': False,
            })
        driver.refresh()
        settings = SystemAdmin(driver).get_tab_settings().get_general_section()
        assert not settings.autodiscovery_option().is_checked()
        assert not settings.statistics_allowed_option().is_checked()
        assert not settings.optimize_camera_settings_option().is_checked()

        server.api.set_system_settings({
            'autoDiscoveryEnabled': True,
            'statisticsAllowed': True,
            'cameraSettingsOptimization': True,
            })
        driver.refresh()
        settings = SystemAdmin(driver).get_tab_settings().get_general_section()
        assert settings.autodiscovery_option().is_checked()
        assert settings.statistics_allowed_option().is_checked()
        assert settings.optimize_camera_settings_option().is_checked()

        # https://networkoptix.testrail.net/index.php?/cases/view/65723
        server.api.set_system_settings({'auditTrailEnabled': False})
        driver.refresh()
        settings = SystemAdmin(driver).get_tab_settings().get_general_section()
        assert not settings.audit_trail_option().is_checked()

        server.api.set_system_settings({'auditTrailEnabled': True})
        driver.refresh()
        settings = SystemAdmin(driver).get_tab_settings().get_general_section()
        assert settings.audit_trail_option().is_checked()

        server.api.set_system_settings({'trafficEncryptionForced': False})
        driver.refresh()
        settings = SystemAdmin(driver).get_tab_settings().get_general_section()
        assert not settings.force_encrypted_connections_option().is_checked()

        server.api.set_system_settings({'trafficEncryptionForced': True})
        driver.refresh()
        settings = SystemAdmin(driver).get_tab_settings().get_general_section()
        assert settings.force_encrypted_connections_option().is_checked()

        server.api.set_system_settings({'videoTrafficEncryptionForced': False})
        driver.refresh()
        settings = SystemAdmin(driver).get_tab_settings().get_general_section()
        assert not settings.video_traffic_encryption_option().is_checked()

        server.api.set_system_settings({'videoTrafficEncryptionForced': True})
        driver.refresh()
        settings = SystemAdmin(driver).get_tab_settings().get_general_section()
        assert settings.video_traffic_encryption_option().is_checked()

        server.api.set_system_settings({'sessionLimitMinutes': 0})
        driver.refresh()
        settings = SystemAdmin(driver).get_tab_settings().get_general_section()
        assert not settings.limit_session_duration_option().is_checked()

        new_session_limit_days = 1
        server.api.set_system_settings({'sessionLimitMinutes': new_session_limit_days * 24 * 60})
        driver.refresh()
        settings = SystemAdmin(driver).get_tab_settings().get_general_section()
        assert settings.limit_session_duration_option().is_checked()
        assert settings.get_session_duration_limit() == new_session_limit_days


def checking_the_dependency_of_system_settings_checkboxes(server: Mediaserver):
    """
    [tags]    system    cloud    webadmin    system settings    C69742
    """
    with get_chrome() as driver:
        server.api.restore_default_general_settings()
        url = ENV + f'/systems/{server.id}'
        driver.get(url)
        owner = server.get_cloud_owner()
        LoginDialog(driver).basic_cloud_login(owner.email, owner.password)
        settings = SystemAdmin(driver).get_tab_settings().get_general_section()

        settings.autodiscovery_option().unselect()
        assert not settings.autodiscovery_option().is_checked()
        assert settings.is_ok_button_visible()
        assert settings.is_cancel_button_visible()
        settings.statistics_allowed_option().unselect()
        assert not settings.statistics_allowed_option().is_checked()
        assert settings.is_ok_button_visible()
        assert settings.is_cancel_button_visible()
        settings.optimize_camera_settings_option().unselect()
        assert not settings.optimize_camera_settings_option().is_checked()
        assert settings.is_ok_button_visible()
        assert settings.is_cancel_button_visible()

        driver.refresh()
        settings = SystemAdmin(driver).get_tab_settings().get_general_section()
        assert settings.autodiscovery_option().is_checked()
        assert settings.statistics_allowed_option().is_checked()
        assert settings.optimize_camera_settings_option().is_checked()


def system_settings_block_is_not_available_when_the_system_is_offline(server: Mediaserver):
    """
    [tags]    system    cloud    webadmin    system settings    C69744
    """
    with get_chrome() as driver:
        server.api.restore_default_general_settings()
        url = ENV + f'/systems/{server.id}'
        driver.get(url)
        owner = server.get_cloud_owner()
        server.stop()
        LoginDialog(driver).basic_cloud_login(owner.email, owner.password)
        # Known issue: https://networkoptix.atlassian.net/browse/CLOUD-11629
        sys_admin = SystemAdmin(driver)
        sys_admin.disconnect_from_cloud_button().wait_until_visible()
        sys_admin.merge_with_another_system_button().wait_until_visible()
        sys_admin.get_placeholder_icon().wait_until_visible()
        # TODO: Check text is displayed: "Not able to load system settings."
    server.start()


if __name__ == '__main__':
    suite_name = os.path.basename(__file__)
    suite_name = suite_name.replace("test_", "").replace(".py", "")
    with Suite() as suite:
        cloud_owner_first = suite.create_cloud_account()
        users = suite.create_cloud_accounts()
        cloud_server_first = suite.create_cloud_server(
            cloud_owner_first,
            f"{suite_name}_1_",
            cloud_users=users,
            )
        system_settings_and_security_settings_should_match_settings_on_server(cloud_server_first)
        test_changing_settings_changes_it_on_server(cloud_server_first)
        changing_several_random_checkboxes_works(cloud_server_first)
        system_and_security_settings_block_is_not_available_for_other_users(cloud_server_first)
        changing_page_without_saving_changes(cloud_server_first)
        changes_made_in_the_thick_client_are_displayed_in_system_settings(cloud_server_first)
        checking_the_dependency_of_system_settings_checkboxes(cloud_server_first)
        # cloud_owner_2 = suite.create_cloud_account()
        # cloud_server_2 = suite.create_cloud_server(cloud_owner_2, f"{suite_name}_1_",)
        # system_settings_block_is_not_available_when_the_system_is_offline(cloud_server_2)

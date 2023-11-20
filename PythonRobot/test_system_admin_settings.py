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
        url = ENV + f'/systems/{server.id}'
        driver.get(url)
        owner = server.get_cloud_owner()
        LoginDialog(driver).basic_cloud_login(owner.email, owner.password)
        settings = SystemAdmin(driver).get_tab_settings().get_general_section()
        assert not settings.is_save_button_visible()
        assert not settings.is_cancel_button_visible()
        # System settings block.
        autodiscovery_option = settings.autodiscovery_option()
        assert autodiscovery_option.label_text() == rb.ENABLE_AUTO_DISCOVERY_TEXT
        assert autodiscovery_option.description_text() == rb.ENABLE_AUTO_DISCOVERY_DESCRIPTION_TEXT
        statistics_allowed_option = settings.statistics_allowed_option()
        assert statistics_allowed_option.label_text() == rb.SEND_ANONYMOUS_USAGE_TEXT
        assert statistics_allowed_option.description_text() == rb.SEND_ANONYMOUS_USAGE_DESCRIPTION_TEXT
        optimize_camera_settings_option = settings.optimize_camera_settings_option()
        assert optimize_camera_settings_option.label_text() == rb.ALLOW_SYSTEM_OPTIMIZE_TEXT
        # Security block.
        audit_trail_option = settings.audit_trail_option()
        assert audit_trail_option.label_text() == rb.ENABLE_AUDIT_TRAIL_TEXT
        assert audit_trail_option.description_text() == rb.ENABLE_AUDIT_TRAIL_DESCRIPTION_TEXT
        force_encrypted_connections_option = settings.force_encrypted_connections_option()
        assert force_encrypted_connections_option.label_text() == rb.ALLOW_ONLY_SECURE_TEXT
        video_traffic_encryption_option = settings.video_traffic_encryption_option()
        assert video_traffic_encryption_option.label_text() == rb.ENCRYPT_VIDEO_TRAFFIC_TEXT
        assert video_traffic_encryption_option.description_text() == rb.ENCRYPT_VIDEO_TRAFFIC_DESCRIPTION_TEXT
        limit_session_duration_option = settings.limit_session_duration_option()
        assert limit_session_duration_option.label_text() == rb.LIMIT_SESSION_DURATION_TEXT

        server_settings = server.get_settings()
        assert autodiscovery_option.is_enabled() == server_settings['autoDiscoveryEnabled']
        assert statistics_allowed_option.is_enabled() == server_settings['statisticsAllowed']
        assert optimize_camera_settings_option.is_enabled() == server_settings['cameraSettingsOptimization']
        assert audit_trail_option.is_enabled() == server_settings['auditTrailEnabled']
        assert force_encrypted_connections_option.is_enabled() == server_settings['trafficEncryptionForced']
        assert video_traffic_encryption_option.is_enabled() == server_settings['videoTrafficEncryptionForced']
        assert server_settings['sessionLimitMinutes'] == 43200
        assert limit_session_duration_option.is_enabled()

        # https://networkoptix.testrail.net/index.php?/cases/view/69736
        # https://networkoptix.testrail.net/index.php?/cases/view/65697
        assert autodiscovery_option.is_enabled()
        assert not statistics_allowed_option.is_enabled()
        assert optimize_camera_settings_option.is_enabled()
        assert audit_trail_option.is_enabled()
        assert not force_encrypted_connections_option.is_enabled()
        assert not video_traffic_encryption_option.is_enabled()
        assert limit_session_duration_option.is_enabled()

        administrator = server.get_cloud_admin()
        HeaderNav(driver).log_out()
        LandingPage(driver)
        HeaderNav(driver).log_in_button().click()
        LoginDialog(driver).basic_cloud_login(administrator.email, administrator.password)
        SystemAdmin(driver).get_tab_settings().get_general_section()
        assert autodiscovery_option.is_enabled()
        assert not statistics_allowed_option.is_enabled()
        assert optimize_camera_settings_option.is_enabled()
        assert audit_trail_option.is_enabled()
        assert not force_encrypted_connections_option.is_enabled()
        assert not video_traffic_encryption_option.is_enabled()
        assert limit_session_duration_option.is_enabled()


def test_changing_settings_changes_it_on_server(server: Mediaserver):
    """
    [tags]    system    cloud    webadmin    system settings    C65722    C65724    C69740
    """
    with get_chrome() as driver:
        url = ENV + f'/systems/{server.id}'
        driver.get(url)
        owner = server.get_cloud_owner()
        LoginDialog(driver).basic_cloud_login(owner.email, owner.password)

        settings = SystemAdmin(driver).get_tab_settings().get_general_section()
        settings.autodiscovery_option().disable()
        settings.save()
        server.wait_until_setting_is('autoDiscoveryEnabled', False)
        settings.statistics_allowed_option().enable()
        settings.save()
        server.wait_until_setting_is('statisticsAllowed', True)
        settings.optimize_camera_settings_option().disable()
        settings.save()
        server.wait_until_setting_is('cameraSettingsOptimization', False)

        # https://networkoptix.testrail.net/index.php?/cases/view/65724
        audit_trail_option = settings.audit_trail_option()
        audit_trail_option.disable()
        settings.get_unsaved_changes_label().wait_until_not_visible()
        assert settings.is_save_button_visible()
        assert settings.is_cancel_button_visible()
        settings.cancel()
        settings.get_unsaved_changes_label().wait_until_visible()
        assert audit_trail_option.is_enabled()
        force_encrypted_connections_option = settings.force_encrypted_connections_option()
        force_encrypted_connections_option.enable()
        video_traffic_encryption_option = settings.video_traffic_encryption_option()
        video_traffic_encryption_option.enable()
        # The limit session checkbox may be not in view. Scroll page to avoid this.
        # TODO: Find a more accurate method to scroll the page to an element.
        driver.scroll_to_bottom()
        limit_session_duration_option = settings.limit_session_duration_option()
        limit_session_duration_option.enable()
        expected_warning_message = 'Encrypting video traffic may significantly increase CPU usage.'
        assert settings.get_warning_message().get_text() == expected_warning_message
        settings.get_unsaved_changes_label().wait_until_not_visible()
        assert settings.is_save_button_visible()
        assert settings.is_cancel_button_visible()
        settings.cancel()
        assert audit_trail_option.is_enabled()
        assert not force_encrypted_connections_option.is_enabled()
        assert not video_traffic_encryption_option.is_enabled()
        assert limit_session_duration_option.is_enabled()

        audit_trail_option.disable()
        settings.save()
        server.wait_until_setting_is('auditTrailEnabled', False)
        force_encrypted_connections_option.enable()
        settings.save()
        server.wait_until_setting_is('trafficEncryptionForced', True)
        video_traffic_encryption_option.enable()
        settings.save()
        server.wait_until_setting_is('videoTrafficEncryptionForced', True)
        limit_session_duration_option.disable()
        settings.save()
        server.wait_until_setting_is('sessionLimitMinutes', 0)
        limit_session_duration_option.enable()
        new_session_limit_value_days = 1
        limit_session_duration_option.set_duration_limit(new_session_limit_value_days)
        settings.save()
        server.wait_until_setting_is(
            'sessionLimitMinutes',
            new_session_limit_value_days * 24 * 60,
            )


def changing_several_random_checkboxes_works(server: Mediaserver):
    """
    [tags]    system    cloud    webadmin    system settings
    """
    with get_chrome() as driver:
        url = ENV + f'/systems/{server.id}'
        driver.get(url)
        owner = server.get_cloud_owner()
        LoginDialog(driver).basic_cloud_login(owner.email, owner.password)

        settings = SystemAdmin(driver).get_tab_settings().get_general_section()
        server_settings = server.get_settings()
        autodiscovery_option = settings.autodiscovery_option()
        autodiscovery_option.click()
        statistics_allowed_option = settings.statistics_allowed_option()
        statistics_allowed_option.click()
        optimize_camera_settings_option = settings.optimize_camera_settings_option()
        optimize_camera_settings_option.click()
        settings.get_unsaved_changes_label().wait_until_not_visible(1)
        settings.save()
        server.wait_until_setting_is(
            'autoDiscoveryEnabled',
            not server_settings['autoDiscoveryEnabled'],
            )
        server.wait_until_setting_is(
            'statisticsAllowed',
            not server_settings['statisticsAllowed'],
            )
        server.wait_until_setting_is(
            'cameraSettingsOptimization',
            not server_settings['cameraSettingsOptimization'],
            )

        server_settings = server.get_settings()
        # https://networkoptix.testrail.net/index.php?/cases/view/69738
        autodiscovery_option.click()
        statistics_allowed_option.click()
        optimize_camera_settings_option.click()
        settings.get_unsaved_changes_label().wait_until_not_visible(1)
        settings.cancel()
        settings.get_unsaved_changes_label().wait_until_visible(1)
        auto_discovery_enabled = server_settings['autoDiscoveryEnabled']
        statistics_allowed = server_settings['statisticsAllowed']
        camera_settings_optimized = server_settings['cameraSettingsOptimization']
        assert autodiscovery_option.is_enabled() == auto_discovery_enabled
        assert statistics_allowed_option.is_enabled() == statistics_allowed
        assert optimize_camera_settings_option.is_enabled() == camera_settings_optimized
        server.wait_until_setting_is('autoDiscoveryEnabled', auto_discovery_enabled)
        server.wait_until_setting_is('statisticsAllowed', statistics_allowed)
        server.wait_until_setting_is(
            'cameraSettingsOptimization',
            camera_settings_optimized,
            )


def system_and_security_settings_block_is_not_available_for_other_users(server: Mediaserver):
    """
    [tags]    system    cloud    webadmin    system settings    C69737    C65698
    """
    with get_chrome() as driver:
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
        url = ENV + f'/systems/{server.id}'
        driver.get(url)
        owner = server.get_cloud_owner()
        LoginDialog(driver).basic_cloud_login(owner.email, owner.password)
        settings = SystemAdmin(driver).get_tab_settings().get_general_section()
        autodiscovery_option = settings.autodiscovery_option()
        autodiscovery_option.disable()
        statistics_allowed_option = settings.statistics_allowed_option()
        statistics_allowed_option.enable()
        optimize_camera_settings_option = settings.optimize_camera_settings_option()
        optimize_camera_settings_option.disable()
        settings.get_unsaved_changes_label().wait_until_not_visible(1)
        assert settings.is_save_button_visible()
        assert settings.is_cancel_button_visible()
        SystemAdmin(driver).get_information_tab().click()
        modal_window = ApplyChangesModalDialog(driver)
        modal_window.wait_until_visible()
        modal_window.discard()
        assert SystemAdmin(driver).get_information_tab().no_alerts()

        HeaderNav(driver).click_tab_by_name('Settings')
        settings = SystemAdmin(driver).get_tab_settings().get_general_section()
        autodiscovery_option.disable()
        statistics_allowed_option.enable()
        optimize_camera_settings_option.disable()
        assert settings.is_save_button_visible()
        assert settings.is_cancel_button_visible()
        SystemAdmin(driver).get_information_tab().click()
        modal_window.wait_until_visible()
        modal_window.cancel()
        assert settings.is_save_button_visible()
        assert settings.is_cancel_button_visible()
        assert not autodiscovery_option.is_enabled()
        assert statistics_allowed_option.is_enabled()
        assert not optimize_camera_settings_option.is_enabled()

        SystemAdmin(driver).get_information_tab().click()
        modal_window.wait_until_visible()
        modal_window.close()
        assert settings.is_save_button_visible()
        assert settings.is_cancel_button_visible()

        driver.refresh()
        settings = SystemAdmin(driver).get_tab_settings().get_general_section()
        assert not settings.is_save_button_visible()
        assert not settings.is_cancel_button_visible()
        assert autodiscovery_option.is_enabled()
        assert not statistics_allowed_option.is_enabled()
        assert optimize_camera_settings_option.is_enabled()


def changes_made_in_the_thick_client_are_displayed_in_system_settings(server: Mediaserver):
    """
    [tags]    system    cloud    webadmin    system settings    C69741    C65723
    """
    with get_chrome() as driver:
        url = ENV + f'/systems/{server.id}'
        driver.get(url)
        owner = server.get_cloud_owner()
        LoginDialog(driver).basic_cloud_login(owner.email, owner.password)
        SystemAdmin(driver).get_tab_settings().get_general_section()

        server.api.set_system_settings({'autoDiscoveryEnabled': False})
        driver.refresh()
        settings = SystemAdmin(driver).get_tab_settings().get_general_section()
        autodiscovery_option = settings.autodiscovery_option()
        assert not autodiscovery_option.is_enabled()

        server.api.set_system_settings({'autoDiscoveryEnabled': True})
        driver.refresh()
        SystemAdmin(driver).get_tab_settings().get_general_section()
        assert autodiscovery_option.is_enabled()

        server.api.set_system_settings({'statisticsAllowed': False})
        driver.refresh()
        SystemAdmin(driver).get_tab_settings().get_general_section()
        statistics_allowed_option = settings.statistics_allowed_option()
        assert not statistics_allowed_option.is_enabled()

        server.api.set_system_settings({'statisticsAllowed': True})
        driver.refresh()
        SystemAdmin(driver).get_tab_settings().get_general_section()
        assert statistics_allowed_option.is_enabled()

        server.api.set_system_settings({'cameraSettingsOptimization': False})
        driver.refresh()
        settings = SystemAdmin(driver).get_tab_settings().get_general_section()
        optimize_camera_settings_option = settings.optimize_camera_settings_option()
        assert not optimize_camera_settings_option.is_enabled()

        server.api.set_system_settings({'cameraSettingsOptimization': True})
        driver.refresh()
        SystemAdmin(driver).get_tab_settings().get_general_section()
        assert optimize_camera_settings_option.is_enabled()

        server.api.set_system_settings({
            'autoDiscoveryEnabled': False,
            'statisticsAllowed': False,
            'cameraSettingsOptimization': False,
            })
        driver.refresh()
        SystemAdmin(driver).get_tab_settings().get_general_section()
        assert not autodiscovery_option.is_enabled()
        assert not statistics_allowed_option.is_enabled()
        assert not optimize_camera_settings_option.is_enabled()

        server.api.set_system_settings({
            'autoDiscoveryEnabled': True,
            'statisticsAllowed': True,
            'cameraSettingsOptimization': True,
            })
        driver.refresh()
        SystemAdmin(driver).get_tab_settings().get_general_section()
        assert autodiscovery_option.is_enabled()
        assert statistics_allowed_option.is_enabled()
        assert optimize_camera_settings_option.is_enabled()

        # https://networkoptix.testrail.net/index.php?/cases/view/65723
        server.api.set_system_settings({'auditTrailEnabled': False})
        driver.refresh()
        settings = SystemAdmin(driver).get_tab_settings().get_general_section()
        audit_trail_option = settings.audit_trail_option()
        assert not audit_trail_option.is_enabled()

        server.api.set_system_settings({'auditTrailEnabled': True})
        driver.refresh()
        SystemAdmin(driver).get_tab_settings().get_general_section()
        assert audit_trail_option.is_enabled()

        server.api.set_system_settings({'trafficEncryptionForced': False})
        driver.refresh()
        settings = SystemAdmin(driver).get_tab_settings().get_general_section()
        force_encrypted_connections_option = settings.force_encrypted_connections_option()
        assert not force_encrypted_connections_option.is_enabled()

        server.api.set_system_settings({'trafficEncryptionForced': True})
        driver.refresh()
        SystemAdmin(driver).get_tab_settings().get_general_section()
        assert force_encrypted_connections_option.is_enabled()

        server.api.set_system_settings({'videoTrafficEncryptionForced': False})
        driver.refresh()
        settings = SystemAdmin(driver).get_tab_settings().get_general_section()
        video_traffic_encryption_option = settings.video_traffic_encryption_option()
        assert not video_traffic_encryption_option.is_enabled()

        server.api.set_system_settings({'videoTrafficEncryptionForced': True})
        driver.refresh()
        SystemAdmin(driver).get_tab_settings().get_general_section()
        assert video_traffic_encryption_option.is_enabled()

        server.api.set_system_settings({'sessionLimitMinutes': 0})
        driver.refresh()
        settings = SystemAdmin(driver).get_tab_settings().get_general_section()
        limit_session_duration_option = settings.limit_session_duration_option()
        assert not limit_session_duration_option.is_enabled()

        new_session_limit_minutes = 24 * 60
        server.api.set_system_settings({'sessionLimitMinutes': new_session_limit_minutes})
        driver.refresh()
        SystemAdmin(driver).get_tab_settings().get_general_section()
        assert limit_session_duration_option.is_enabled()
        assert limit_session_duration_option.get_duration_limit_minutes() == new_session_limit_minutes


def checking_the_dependency_of_system_settings_checkboxes(server: Mediaserver):
    """
    [tags]    system    cloud    webadmin    system settings    C69742
    """
    with get_chrome() as driver:
        url = ENV + f'/systems/{server.id}'
        driver.get(url)
        owner = server.get_cloud_owner()
        LoginDialog(driver).basic_cloud_login(owner.email, owner.password)
        settings = SystemAdmin(driver).get_tab_settings().get_general_section()

        autodiscovery_option = settings.autodiscovery_option()
        autodiscovery_option.disable()
        assert not autodiscovery_option.is_enabled()
        assert settings.is_save_button_visible()
        assert settings.is_cancel_button_visible()
        statistics_allowed_option = settings.statistics_allowed_option()
        statistics_allowed_option.enable()
        assert statistics_allowed_option.is_enabled()
        assert settings.is_save_button_visible()
        assert settings.is_cancel_button_visible()
        optimize_camera_settings_option = settings.optimize_camera_settings_option()
        optimize_camera_settings_option.disable()
        assert not optimize_camera_settings_option.is_enabled()
        assert settings.is_save_button_visible()
        assert settings.is_cancel_button_visible()

        driver.refresh()
        SystemAdmin(driver).get_tab_settings().get_general_section()
        assert autodiscovery_option.is_enabled()
        assert not statistics_allowed_option.is_enabled()
        assert optimize_camera_settings_option.is_enabled()


def system_settings_block_is_not_available_when_the_system_is_offline(server: Mediaserver):
    """
    [tags]    system    cloud    webadmin    system settings    C69744
    """
    with get_chrome() as driver:
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


def check_limit_session_duration(server: Mediaserver):
    """
    [tags]    C65703
    """
    with get_chrome() as driver:
        url = ENV + f'/systems/{server.id}'
        driver.get(url)
        owner = server.get_cloud_owner()
        LoginDialog(driver).basic_cloud_login(owner.email, owner.password)
        settings = SystemAdmin(driver).get_tab_settings().get_general_section()

        limit_session_option = settings.limit_session_duration_option()
        assert limit_session_option.is_enabled()
        default_session_limit_minutes = 30 * 24 * 60
        assert limit_session_option.get_duration_limit_minutes() == default_session_limit_minutes
        assert limit_session_option.get_unit_of_time() == 'days'

        limit_session_option.disable()
        limit_session_option.get_spin_box().wait_until_not_clickable()
        limit_session_option.get_drop_down().wait_until_not_clickable()
        expected_warning = 'Unlimited user session lifetime threatens overall system security'
        assert limit_session_option.get_warning_message().get_text() == expected_warning
        assert settings.is_save_button_visible()
        assert settings.is_cancel_button_visible()

        limit_session_option.enable()
        settings.get_unsaved_changes_label().wait_until_visible()
        assert not settings.is_save_button_visible()
        assert not settings.is_cancel_button_visible()
        limit_session_option.get_warning_message().wait_until_not_visible()
        limit_session_option.get_spin_box().wait_until_clickable()
        limit_session_option.get_drop_down().wait_until_clickable()

        limit_session_option.set_unit_of_time('minutes')
        limit_session_option.set_duration_limit(0)
        minimum_session_limit_minutes = 1
        assert limit_session_option.get_duration_limit_minutes() == minimum_session_limit_minutes

        limit_session_option.get_spin_box().input_value('hjkl')
        assert limit_session_option.get_duration_limit_minutes() == minimum_session_limit_minutes
        limit_session_option.get_spin_box().input_value('&*(')
        assert limit_session_option.get_duration_limit_minutes() == minimum_session_limit_minutes

        new_session_limit_minutes = 654
        limit_session_option.set_duration_limit(new_session_limit_minutes)
        settings.save()
        assert limit_session_option.get_duration_limit_minutes() == new_session_limit_minutes

        limit_session_option.set_duration_limit(minimum_session_limit_minutes)
        settings.save()
        assert limit_session_option.get_duration_limit_minutes() == minimum_session_limit_minutes

        limit_session_option.set_unit_of_time('days')
        new_session_limit_days = 600
        limit_session_option.set_duration_limit(new_session_limit_days)
        expected_warning_2 = 'The recommended maximum user session lifetime is 30 days.'
        assert limit_session_option.get_warning_message().get_text() == expected_warning_2

        limit_session_option.set_unit_of_time('hours')
        new_session_limit_hours = 600
        limit_session_option.set_duration_limit(new_session_limit_hours)
        settings.save()
        assert limit_session_option.get_unit_of_time() == 'days'
        assert limit_session_option.get_duration_limit_minutes() == new_session_limit_hours * 60


if __name__ == '__main__':
    with Suite() as suite:
        cloud_owner = suite.create_cloud_account()
        users = suite.create_cloud_accounts()
        cloud_server = suite.create_cloud_server(
            cloud_owner,
            cloud_users=users,
            )
        cloud_server.reset_settings()
        system_settings_and_security_settings_should_match_settings_on_server(cloud_server)
        cloud_server.reset_settings()
        test_changing_settings_changes_it_on_server(cloud_server)
        cloud_server.reset_settings()
        changing_several_random_checkboxes_works(cloud_server)
        cloud_server.reset_settings()
        system_and_security_settings_block_is_not_available_for_other_users(cloud_server)
        cloud_server.reset_settings()
        changing_page_without_saving_changes(cloud_server)
        cloud_server.reset_settings()
        changes_made_in_the_thick_client_are_displayed_in_system_settings(cloud_server)
        cloud_server.reset_settings()
        checking_the_dependency_of_system_settings_checkboxes(cloud_server)
        # cloud_owner_2 = suite.create_cloud_account()
        # cloud_server_2 = suite.create_cloud_server(cloud_owner_2, f"{suite_name}_1_",)
        # system_settings_block_is_not_available_when_the_system_is_offline(cloud_server_2)
        cloud_server.reset_settings()
        check_limit_session_duration(cloud_server)

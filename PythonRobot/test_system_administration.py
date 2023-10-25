import os
import time

from NoptixLibrary.cloud_portal_api import CloudPortalAPI
from NoptixLibrary.suite import CloudAccount
from NoptixLibrary.suite import Mediaserver
from NoptixLibrary.suite import Suite
from pages.header import HeaderNav
from pages.information_page import InformationPage
from pages.login import LoginDialog
from resource_import import cloud_login
from resource_import import get_chrome
from resource_import import get_random_email
from resource_import import register_and_activate_account
from pages.system_admin import FailedToAccessSystemPage
from pages.system_admin import SystemAdmin
from pages.system_left_menu import SystemLeftMenu
from pages.systems_page import SystemsPage
from variables import ENV
from pages.view_page import ViewPage

password = "qweasd 123"

CLOUD_API = CloudPortalAPI()
viewer_permissions = 'GlobalViewArchivePermission|GlobalExportPermission|GlobalViewBookmarksPermission|GlobalAccessAllMediaPermission'


def can_log_in_to_system_from_direct_link(server: Mediaserver):
    """smoke    ci    C30825"""
    with get_chrome() as driver:
        url = ENV + f"/systems/{server.id}"
        driver.get(url)
        LoginDialog(driver).basic_cloud_login(server.get_cloud_owner().email, password)
        HeaderNav(driver).account_dropdown()
        SystemAdmin(driver)
        print("pass")


def owner_can_disconnect_system_from_cloud(server: Mediaserver):
    """C41883   C47020    webadmin    smoke    ci    C69845"""
    with get_chrome() as driver:
        url = ENV + f"/systems/{server.id}"
        driver.get(url)
        owner = server.get_cloud_owner()
        LoginDialog(driver).basic_cloud_login(owner.email, password)
        HeaderNav(driver).account_dropdown()

        sys_admin = SystemAdmin(driver)
        sys_admin.disconnect_from_cloud_button().click()
        sys_admin.disconnect_modal_close_button().click()
        sys_admin.merge_with_another_system_button().wait_until_visible()
        sys_admin.disconnect_from_cloud_button().click()
        sys_admin.disconnect_modal_cancel_button().click()
        sys_admin.merge_with_another_system_button().wait_until_visible()
        sys_admin.disconnect_from_cloud_button().click()
        sys_admin.disconnect_system_modal_button().click()
        message = sys_admin.disconnect_from_cloud_toast_notification().get_message()
        message.wait_until_visible()
        message.wait_until_not_visible(10)
        assert (len(CLOUD_API.get_account_systems(owner.email, password))) == 0, "Number of systems owned " \
                                                                                              "was not 0"
        print("pass")


def non_owner_can_disconnect_account_from_system(server: Mediaserver):
    with get_chrome() as driver:
        email = get_random_email()
        register_and_activate_account(driver, "Mark", "Hamill", email, password)
        owner = server.get_cloud_owner()
        cloud_auth = (owner.email, owner.password)
        CLOUD_API.share(cloud_auth, server.id, "viewer", email, viewer_permissions)
        url = ENV + f"/systems/{server.id}"
        driver.get(url)
        LoginDialog(driver).basic_cloud_login(email, password)
        sys_admin = SystemAdmin(driver)
        time.sleep(2)
        sys_admin.disconnect_from_account_button().click()
        time.sleep(1)
        sys_admin.disconnect_from_account_cancel_button().click()
        sys_admin.disconnect_from_account_button().click()
        sys_admin.disconnect_from_account_confirm_button().click()
        message = sys_admin.disconnect_from_account_toast_notification(server.name).get_message()
        message.wait_until_visible()
        message.wait_until_not_visible(10)
        SystemsPage(driver).no_systems().wait_until_visible()
        header = HeaderNav(driver)
        header.log_out()
        url1 = ENV + f"/systems/{server.id}"
        driver.get(url1)
        LoginDialog(driver).basic_cloud_login(owner.email, password)
        left_menu = SystemLeftMenu(driver)
        left_menu.users_button().click()
        left_menu.update_users_list()
        for user in left_menu.users:
            if user == email:
                raise RuntimeError("User was still in the users list.")
        print("pass")


def user_without_permissions_cannot_see_system_admin_page(server: Mediaserver):
    with get_chrome() as driver:
        viewer_user = server.get_cloud_viewer()
        driver.get(ENV + f"/systems/{server.id}")
        LoginDialog(driver).basic_cloud_login(viewer_user.email, viewer_user.password)
        assert FailedToAccessSystemPage(driver).is_shown()
        print("pass")


# User can rename System: change in web -> check server
def owner_can_rename_system_via_cloud_portal(server: Mediaserver):
    with get_chrome() as driver:
        driver.get(ENV + f"/systems/{server.id}")
        cloud_owner = server.get_cloud_owner()
        LoginDialog(driver).basic_cloud_login(cloud_owner.email, password)
        CLOUD_API.set_user_theme(cloud_owner.email, password, 'light')
        sys_admin = SystemAdmin(driver)
        sys_admin.get_system_name_edit_field().set_text("Name Changed via Cloud Portal")
        cancel_button = sys_admin.get_cancel_button()
        cancel_button.click()
        sys_admin.wait_for_unsaved_changes_messages()
        sys_admin.get_cancel_button().wait_until_not_visible()
        assert sys_admin.get_system_name_edit_field().get_text() == server.name
        sys_admin.get_system_name_edit_field().clear_text()
        started_at = time.monotonic()
        timeout_sec = 3
        while True:
            if sys_admin.get_system_name_edit_field().has_empty_field_error():
                break
            if time.monotonic() - started_at > 3:
                raise RuntimeError(f"Empty field error did not appear after {timeout_sec} seconds")
            time.sleep(0.1)
        save_button = sys_admin.get_save_button()
        assert save_button is not None
        save_button.click()
        assert sys_admin.get_system_name_edit_field().get_text() == server.name
        sys_admin.get_system_name_edit_field().set_text("Name Changed via Cloud Portal")
        sys_admin.get_save_button().click()
        assert sys_admin.get_system_name_edit_field().get_text() == "Name Changed via Cloud Portal"
        sys_admin.refresh()
        header_system_name = HeaderNav(driver).get_system_name()
        assert header_system_name == "Name Changed via Cloud Portal"
        server.api.restart_server()
        assert server.api.get_system_name() == "Name Changed via Cloud Portal"
        cloud_auth = [cloud_owner.email, cloud_owner.password]
        cloud_system_settings = CLOUD_API.get_cloud_system_settings(
            cloud_auth, server.id)
        assert cloud_system_settings['name'] == "Name Changed via Cloud Portal"
        print("pass")


# User can rename System: change on server side -> check in web
def system_name_change_is_shown_in_cloud_portal(server: Mediaserver):
    server.api.set_system_name("Name Changed via API")
    with get_chrome() as driver:
        driver.get(ENV + f"/systems/{server.id}")
        LoginDialog(driver).basic_cloud_login(server.get_cloud_owner().email, password)
        sys_admin = SystemAdmin(driver)
        sys_admin.get_system_name_edit_field().wait_until_name_is("Name Changed via API")
        assert HeaderNav(driver).get_system_name() == "Name Changed via API"
        print("pass")


def should_confirm_if_not_owner_deletes_system(server: Mediaserver):
    with get_chrome() as driver:
        viewer_user = server.get_cloud_viewer()
        driver.get(ENV)
        cloud_login(driver, viewer_user.email, viewer_user.password)
        driver.get(ENV + f"/systems/{server.id}")
        sys_admin = SystemAdmin(driver)
        sys_admin.disconnect_from_account_button().click()
        sys_admin.disconnect_modal_warning().click()
        sys_admin.disconnect_from_account_cancel_button().click()
        sys_admin.disconnect_from_account_cancel_button().wait_until_does_not_exist()
        print("pass")


def correct_items_are_shown_for_owner(server: Mediaserver):
    """
    [Tags]    C41560    C81760    webadmin    CB-1596
    """
    with get_chrome() as driver:
        owner = server.get_cloud_owner()
        driver.get(ENV + f"/systems/{server.id}")
        LoginDialog(driver).basic_cloud_login(owner.email, password)
        system_page = SystemAdmin(driver)
        HeaderNav(driver).account_dropdown()
        header = HeaderNav(driver)
        header.systems_link().wait_until_visible()
        system_page.get_system_name_edit_field().wait_until_visible()
        system_page.disconnect_from_cloud_button().wait_until_visible()
        assert system_page.get_system_name_edit_field().get_text() == server.name
        system_page.merge_with_another_system_button().wait_until_visible()
        left_menu = system_page.get_left_menu()
        left_menu.get_node_by_name_within_timeout('Licenses')
        left_menu.get_node_by_name_within_timeout('Cameras')
        users_node = left_menu.get_node_by_name_within_timeout('Users')
        left_menu.get_node_by_name_within_timeout('Servers')
        system_page.wait_for_security_form()
        assert header.get_system_name() == server.name
        users_node.click()
        left_menu.add_users_button().wait_until_visible()
        left_menu.get_user_with_email(owner.email).wait_until_visible()
        print("pass")


def correct_items_are_shown_for_admin(server: Mediaserver):
    """
    [Tags]    C41561    C81760    webadmin
    """
    with get_chrome() as driver:
        cloud_admin = server.get_cloud_admin()
        owner = server.get_cloud_owner()
        driver.get(ENV + f"/systems/{server.id}")
        LoginDialog(driver).basic_cloud_login(cloud_admin.email, cloud_admin.password)
        system_page = SystemAdmin(driver)
        HeaderNav(driver).account_dropdown()
        header = HeaderNav(driver)
        header.systems_link().wait_until_visible()
        system_page.disconnect_from_account_button().wait_until_visible()
        expected_owner_label = f"Owner – Mark Hamill ({owner.email})"
        actual_owner_label = system_page.get_owner_label().get_text()
        assert actual_owner_label == expected_owner_label
        assert system_page.get_system_name_edit_field().get_text() == server.name
        actual_access_text = system_page.get_your_access_level_label().get_text()
        assert actual_access_text == "Your access level – Administrator"
        left_menu = system_page.get_left_menu()
        left_menu.get_node_by_name_within_timeout('Licenses')
        left_menu.get_node_by_name_within_timeout('Cameras')
        users_node = left_menu.get_node_by_name_within_timeout('Users')
        left_menu.get_node_by_name_within_timeout('Servers')
        system_page.wait_for_security_form()
        assert header.get_system_name() == server.name
        users_node.click()
        left_menu.add_users_button().wait_until_visible()
        left_menu.get_user_with_email(owner.email).wait_until_visible()
        print("pass")


def correct_items_are_shown_for_user(server: Mediaserver, user: CloudAccount, role_name: str):
    """
    [Tags]    C41562    C81760    webadmin
    """
    with get_chrome() as driver:
        owner = server.get_cloud_owner()
        driver.get(ENV + f"/systems/{server.id}")
        LoginDialog(driver).basic_cloud_login(user.email, user.password)
        system_page = SystemAdmin(driver)
        HeaderNav(driver).account_dropdown()
        header = HeaderNav(driver)
        header.systems_link().wait_until_visible()
        assert header.get_system_name() == server.name
        system_page.disconnect_from_account_button().wait_until_visible()
        expected_owner_label = f"Owner – Mark Hamill ({owner.email})"
        actual_owner_label = system_page.get_owner_label().get_text()
        assert actual_owner_label == expected_owner_label
        assert system_page.get_system_name_edit_field().get_text() == server.name
        actual_access_text = system_page.get_your_access_level_label().get_text()
        assert actual_access_text == f"Your access level – {role_name}"
        left_menu = system_page.get_left_menu()
        assert not left_menu.has_node_with_name('Licenses')
        assert not left_menu.has_node_with_name('Cameras')
        assert not left_menu.has_node_with_name('Users')
        assert not left_menu.has_node_with_name('Servers')
        left_menu.get_search_field().wait_until_does_not_exist()
        system_page.merge_with_another_system_button().wait_until_does_not_exist()
        print("pass")


def left_menu_search_position_and_style(server: Mediaserver):
    """
    [Tags]    C81759    webadmin    search
    """
    with get_chrome() as driver:
        owner = server.get_cloud_owner()
        driver.get(ENV + f"/systems/{server.id}")
        LoginDialog(driver).basic_cloud_login(owner.email, password)
        system_page = SystemAdmin(driver)
        left_menu = system_page.get_left_menu()
        search_input = left_menu.get_search_field()
        search_input.click()
        assert search_input.is_focused()
        left_menu.get_node_by_name_within_timeout('Cameras').click()
        search_input.wait_for_loupe_icon()
        assert search_input.get_placeholder_text() == "Search"
        left_menu.get_node_by_name_within_timeout('Users').click()
        search_input.wait_for_loupe_icon()
        assert search_input.get_placeholder_text() == "Search"
        left_menu.get_node_by_name_within_timeout('Servers').click()
        search_input.wait_for_loupe_icon()
        assert search_input.get_placeholder_text() == "Search"
        print("pass")


def left_menu_search_search_menu_for_offline_system(server: Mediaserver):
    """
    [Tags]    C81761    webadmin    CB-1596
    """
    with get_chrome() as driver:
        owner = server.get_cloud_owner()
        server.stop()
        base_system_url = ENV + f"/systems/{server.id}"
        driver.get(base_system_url)
        LoginDialog(driver).basic_cloud_login(owner.email, password)
        system_page = SystemAdmin(driver)
        left_menu = system_page.get_left_menu()
        search_input = left_menu.get_search_field()
        search_input.click()
        assert search_input.is_focused()
        left_menu.get_node_by_name_within_timeout('Licenses').click()
        assert driver.current_url == base_system_url + "/licenses"
        search_input.wait_for_loupe_icon()
        assert search_input.get_placeholder_text() == "Search"
        left_menu.get_node_by_name_within_timeout('Cameras').click()
        assert driver.current_url == base_system_url + "/cameras"
        search_input.wait_for_loupe_icon()
        assert search_input.get_placeholder_text() == "Search"
        left_menu.get_node_by_name_within_timeout('Users').click()
        search_input.wait_for_loupe_icon()
        assert search_input.get_placeholder_text() == "Search"
        left_menu.get_node_by_name_within_timeout('Servers').click()
        search_input.wait_for_loupe_icon()
        assert search_input.get_placeholder_text() == "Search"
        header = HeaderNav(driver)
        header.click_tab_by_name('View')
        ViewPage(driver).wait_for_system_offline_placeholder()
        assert driver.current_url == base_system_url + "/view"
        header.click_tab_by_name('Information')
        InformationPage(driver).wait_for_system_offline_placeholder()
        assert driver.current_url == base_system_url + "/health/alerts"
        server.start()
        print("pass")


if __name__ == "__main__":
    suite_name = os.path.basename(__file__)
    suite_name = suite_name.replace("test_", "").replace(".py", "")
    with Suite() as suite:
        cloud_owner_first = suite.create_cloud_account()
        cloud_users = suite.create_cloud_accounts()
        cloud_server_first = suite.create_cloud_server(
            cloud_owner_first,
            f"{suite_name}_1_",
            cloud_users=cloud_users,
            )
        # cloud_owner_second = suite.create_cloud_account()
        # cloud_server_second = suite.create_cloud_server(cloud_owner_second)
        # can_log_in_to_system_from_direct_link(cloud_server_first)
        # owner_can_disconnect_system_from_cloud(cloud_server_second)
        non_owner_can_disconnect_account_from_system(cloud_server_first)
        user_without_permissions_cannot_see_system_admin_page(cloud_server_first)
        owner_can_rename_system_via_cloud_portal(cloud_server_first)
        system_name_change_is_shown_in_cloud_portal(cloud_server_first)
        should_confirm_if_not_owner_deletes_system(cloud_server_first)
        correct_items_are_shown_for_owner(cloud_server_first)
        correct_items_are_shown_for_admin(cloud_server_first)
        correct_items_are_shown_for_user(
            cloud_server_first,
            cloud_server_first.get_cloud_advanced_viewer(),
            'Advanced Viewer',
            )
        correct_items_are_shown_for_user(
            cloud_server_first,
            cloud_server_first.get_cloud_viewer(),
            'Viewer',
            )
        correct_items_are_shown_for_user(
            cloud_server_first,
            cloud_server_first.get_cloud_live_viewer(),
            'Live Viewer',
            )
        correct_items_are_shown_for_user(
            cloud_server_first,
            cloud_server_first.get_cloud_custom_user(),
            'Custom',
            )
        left_menu_search_position_and_style(cloud_server_first)
        left_menu_search_search_menu_for_offline_system(cloud_server_first)

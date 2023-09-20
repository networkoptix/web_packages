import os
import time

from NoptixLibrary.cloud_portal_api import CloudPortalAPI
from NoptixLibrary.suite import CloudServer
from NoptixLibrary.suite import Suite
from header import HeaderNav
from login import LoginDialog
from resource_import import get_headless_chrome
from resource_import import get_random_email
from resource_import import register_and_activate_account
from system_admin import SystemAdmin
from system_left_menu import SystemLeftMenu
from systems_page import SystemsPage
from variables import ENV

password = "qweasd 123"

CLOUD_API = CloudPortalAPI()
viewer_permissions = 'GlobalViewArchivePermission|GlobalExportPermission|GlobalViewBookmarksPermission|GlobalAccessAllMediaPermission'


def can_log_in_to_system_from_direct_link(server: CloudServer):
    """smoke    ci    C30825"""
    driver = get_headless_chrome()
    url = ENV + f"/systems/{server.id}"
    driver.get(url)
    LoginDialog(driver).basic_cloud_login(server.cloud_owner.email, password)
    HeaderNav(driver).account_dropdown()
    SystemAdmin(driver)

    driver.quit()
    print("pass")


def owner_can_disconnect_system_from_cloud(server: CloudServer):
    """C41883   C47020    webadmin    smoke    ci    C69845"""
    driver = get_headless_chrome()
    url = ENV + f"/systems/{server.id}"
    driver.get(url)
    LoginDialog(driver).basic_cloud_login(server.cloud_owner.email, password)
    HeaderNav(driver).account_dropdown()

    sys_admin = SystemAdmin(driver)
    sys_admin.disconnect_from_cloud_button().click()
    sys_admin.disconnect_modal_disconnect_button().click()
    assert sys_admin.disconnect_from_cloud_toast_notification().message().in_dom
    assert (len(CLOUD_API.get_account_systems(server.cloud_owner.email, password))) == 1, "Number of systems owned " \
                                                                                          "was not 1"

    driver.quit()
    print("pass")


def non_owner_can_disconnect_account_from_system(server: CloudServer):
    driver = get_headless_chrome()
    email = get_random_email()
    register_and_activate_account(driver, "Mark", "Hamill", email, password)
    cloud_auth = (server.cloud_owner.email, server.cloud_owner.password)
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
    assert sys_admin.disconnect_from_account_toast_notification(server.name).message().in_dom
    SystemsPage(driver).no_systems()
    header = HeaderNav(driver)
    header.log_out()
    url1 = ENV + f"/systems/{server.id}"
    driver.get(url1)
    LoginDialog(driver).basic_cloud_login(server.cloud_owner.email, password)
    left_menu = SystemLeftMenu(driver)
    left_menu.users_button().click()
    left_menu.update_users_list()
    for user in left_menu.users:
        if user == email:
            raise RuntimeError("User was still in the users list.")

    driver.quit()
    print("pass")


def user_without_permissions_cannot_see_system_admin_page():
    driver = get_headless_chrome()
    email = get_random_email()
    register_and_activate_account(driver, "Mark", "Hamill", email, password)
    driver.get(ENV + f"/systems/{SERVERS[0]['id']}")
    LoginDialog(driver).basic_cloud_login(email, password)
    sys_admin = SystemAdmin(driver)
    assert sys_admin.has_no_access_message()
    driver.close()


# User can rename System: change in web -> check server
def owner_can_rename_system_via_cloud_portal():
    driver = get_headless_chrome()
    driver.get(ENV + f"/systems/{SERVERS[0]['id']}")
    LoginDialog(driver).basic_cloud_login(SERVERS[0]['cloudOwner'], password)
    CLOUD_API.set_user_theme(SERVERS[0]['cloudOwner'], password, 'light')
    sys_admin = SystemAdmin(driver)
    sys_admin.get_system_name_edit_field().set_text("Name Changed via Cloud Portal")
    cancel_button = sys_admin.get_cancel_button()
    assert cancel_button is not None
    assert cancel_button.is_visible()
    cancel_button.click()
    started_at = time.monotonic()
    timeout_sec = 3
    while True:
        if sys_admin.has_no_unsaved_changes_message():
            break
        if time.monotonic() - started_at > 3:
            raise RuntimeError(
                f"No unsaved changes message did not appear after {timeout_sec} seconds")
        time.sleep(0.1)
    assert sys_admin.get_cancel_button() is None
    assert sys_admin.get_system_name_edit_field().get_text() == SERVERS[0]['name']
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
    assert sys_admin.get_system_name_edit_field().get_text() == SERVERS[0]['name']
    sys_admin.get_system_name_edit_field().set_text("Name Changed via Cloud Portal")
    sys_admin.get_save_button().click()
    assert sys_admin.get_system_name_edit_field().get_text() == "Name Changed via Cloud Portal"
    sys_admin.refresh()
    header_system_name = HeaderNav(driver).get_system_name()
    assert header_system_name == "Name Changed via Cloud Portal"
    SERVERS[0]['api'].restart_server()
    assert SERVERS[0]['api'].get_system_name() == "Name Changed via Cloud Portal"
    cloud_system_settings = CLOUD_API.get_cloud_system_settings(
        SERVERS[0]['cloudAuth'], SERVERS[0]['id'])
    assert cloud_system_settings['name'] == "Name Changed via Cloud Portal"
    driver.close()


# User can rename System: change on server side -> check in web
def system_name_change_is_shown_in_cloud_portal():
    SERVERS[0]['api'].set_system_name("Name Changed via API")
    driver = get_headless_chrome()
    driver.get(ENV + f"/systems/{SERVERS[0]['id']}")
    LoginDialog(driver).basic_cloud_login(SERVERS[0]['cloudOwner'], password)
    sys_admin = SystemAdmin(driver)
    assert sys_admin.get_system_name_edit_field().get_text() == "Name Changed via API"
    assert HeaderNav(driver).get_system_name() == "Name Changed via API"


if __name__ == "__main__":
    suite_name = os.path.basename(__file__)
    suite_name = suite_name.replace("test_","").replace(".py","")
    with Suite() as suite:
        cloud_owner_first = suite.create_cloud_account()
        cloud_server_first = suite.create_cloud_server(cloud_owner_first, f"{suite_name}_1_")
        # cloud_owner_second = suite.create_cloud_account()
        # cloud_server_second = suite.create_cloud_server(cloud_owner_second)
        # can_log_in_to_system_from_direct_link(cloud_server_first)
        # owner_can_disconnect_system_from_cloud(cloud_server_second)
        non_owner_can_disconnect_account_from_system(cloud_server_first)
        user_without_permissions_cannot_see_system_admin_page()
        owner_can_rename_system_via_cloud_portal()
        system_name_change_is_shown_in_cloud_portal()

import os
import time

import robot_keywords
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
    driver = get_headless_chrome()
    url = ENV + f"/systems/{server.id}"
    driver.get(url)
    LoginDialog(driver).basic_cloud_login(server.cloud_owner.email, password)
    HeaderNav(driver).account_dropdown()
    SystemAdmin(driver)

    robot_keywords.close_browser(driver)
    print("pass")


def owner_can_disconnect_system_from_cloud(server: CloudServer):
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

    robot_keywords.close_browser(driver)
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

    robot_keywords.close_browser(driver)
    print("pass")


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

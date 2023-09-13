import sys
import time
import os
from selenium import webdriver

from resource_import import get_headless_chrome, register_and_activate_account, get_random_email
from NoptixLibrary.CloudPortalAPI import CloudPortalAPI
from variables import ENV
import robot_keywords
from RobotVariables import RobotVariables
from login import LoginDialog
from header import HeaderNav
from systems_page import SystemsPage

from system_admin import SystemAdmin
from system_left_menu import SystemLeftMenu

from NoptixLibrary.generic_keywords import GenericKeywords
from RobotVariables import RobotVariables

password = "qweasd 123"

keywords = GenericKeywords()
SERVERS = keywords.create_systems(os.path.basename(__file__))
CLOUD_API = CloudPortalAPI()
viewer_permissions = 'GlobalViewArchivePermission|GlobalExportPermission|GlobalViewBookmarksPermission|GlobalAccessAllMediaPermission'


def can_log_in_to_system_from_direct_link():
    driver = get_headless_chrome()
    robot_keywords.go_to_url(driver, ENV + f"/systems/{SERVERS[0]['id']}")
    LoginDialog(driver).basic_cloud_login(SERVERS[0]['cloudOwner'], password)
    HeaderNav(driver).account_dropdown()
    SystemAdmin(driver)

    robot_keywords.close_browser(driver)
    print("pass")


def owner_can_disconnect_system_from_cloud():
    driver = get_headless_chrome()
    robot_keywords.go_to_url(driver, ENV + f"/systems/{SERVERS[1]['id']}")
    LoginDialog(driver).basic_cloud_login(SERVERS[1]['cloudOwner'], password)
    HeaderNav(driver).account_dropdown()

    sys_admin = SystemAdmin(driver)
    sys_admin.disconnect_from_cloud_button().click()
    sys_admin.disconnect_modal_disconnect_button().click()
    assert sys_admin.disconnect_from_cloud_toast_notification().message().in_dom
    assert (len(CLOUD_API.get_account_systems(SERVERS[1]['cloudOwner'], password))) == 1, "Number of systems owned " \
                                                                                          "was not 1"

    robot_keywords.close_browser(driver)
    print("pass")

def non_owner_can_disconnect_account_from_system():
    driver = get_headless_chrome()
    email = get_random_email()
    register_and_activate_account(driver, "Mark", "Hamill", email, password)
    CLOUD_API.share(SERVERS[0]['cloudAuth'], SERVERS[0]['id'], "viewer", email, viewer_permissions)
    robot_keywords.go_to_url(driver, ENV + f"/systems/{SERVERS[0]['id']}")
    LoginDialog(driver).basic_cloud_login(email, password)
    sys_admin = SystemAdmin(driver)
    time.sleep(2)
    sys_admin.disconnect_from_account_button().click()
    time.sleep(1)
    sys_admin.disconnect_from_account_cancel_button().click()
    sys_admin.disconnect_from_account_button().click()
    sys_admin.disconnect_from_account_confirm_button().click()
    assert sys_admin.disconnect_from_account_toast_notification(SERVERS[0]["name"]).message().in_dom
    SystemsPage(driver).no_systems()
    header = HeaderNav(driver)
    header.log_out()
    robot_keywords.go_to_url(driver, ENV + f"/systems/{SERVERS[0]['id']}")
    LoginDialog(driver).basic_cloud_login(SERVERS[0]["cloudOwner"], password)
    left_menu = SystemLeftMenu(driver)
    left_menu.users_button().click()
    left_menu.update_users_list()
    for user in left_menu.users:
        if user == email:
            raise RuntimeError("User was still in the users list.")

    robot_keywords.close_browser(driver)
    print("pass")



if __name__ == "__main__":
    # can_log_in_to_system_from_direct_link()
    # owner_can_disconnect_system_from_cloud()
    non_owner_can_disconnect_account_from_system()

    keywords.teardown_servers(SERVERS)

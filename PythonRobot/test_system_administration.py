import time
from selenium import webdriver

from resource_import import get_headless_chrome, register_and_activate_account, get_random_email
from NoptixLibrary.CloudPortalAPI import CloudPortalAPI
from variables import ENV
import robot_keywords
from RobotVariables import RobotVariables
from login import LoginDialog
from header import HeaderNav

from system_admin import SystemAdmin

from NoptixLibrary.GenericKeywords import GenericKeywords
from RobotVariables import RobotVariables

password = "qweasd 123"

keywords = GenericKeywords()
SERVERS = keywords.create_systems()
CLOUD_API = CloudPortalAPI()


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
    sys_admin.disconnect_button().click()
    sys_admin.disconnect_modal_disconnect_button().click()
    assert sys_admin.disconnect_toast_notification().message().in_dom
    assert (len(CLOUD_API.get_account_systems(SERVERS[1]['cloudOwner'], password))) == 1, "Number of systems owned " \
                                                                                          "was not 1"

    robot_keywords.close_browser(driver)
    print("pass")


if __name__ == "__main__":
    # can_log_in_to_system_from_direct_link()
    owner_can_disconnect_system_from_cloud()

    keywords.teardown_servers(SERVERS)

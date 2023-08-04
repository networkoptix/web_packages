import time

from selenium import webdriver

from resource_import import get_headless_chrome, register_and_activate_account, get_random_email
from NoptixLibrary.CloudPortalAPI import CloudPortalAPI
from variables import ENV
import robot_keywords
from RobotVariables import RobotVariables
from login import LoginDialog
from header import HeaderNav
from change_pass_form import ChangePassForm
from landing_page import LandingPage
from selenium.webdriver.common.keys import Keys
from systems_page import SystemsPage

from NoptixLibrary.GenericKeywords import GenericKeywords
password = "qweasd 123"

keywords = GenericKeywords()
SERVERS = keywords.create_systems()
CLOUD_API = CloudPortalAPI()
viewer_permissions = 'GlobalViewArchivePermission|GlobalExportPermission|GlobalViewBookmarksPermission|GlobalAccessAllMediaPermission'


def system_tiles_represent_actual_information():
    driver = get_headless_chrome()
    CLOUD_API.share([SERVERS[1]['cloudOwner'], password],
                    SERVERS[1]['id'],
                    "viewer",
                    SERVERS[0]['cloudOwner'],
                    viewer_permissions)

    robot_keywords.go_to_url(driver, ENV + "/systems")
    LoginDialog(driver).basic_cloud_login(SERVERS[0]['cloudOwner'], password)
    header = HeaderNav(driver)
    header.account_dropdown()
    rb = RobotVariables("en_US")
    sys_page = SystemsPage(driver)
    mark_present = False
    your_system_present = False
    for tile in sys_page.tiles:
        if tile.get_owner() != rb.YOUR_SYSTEM_TEXT and tile.get_owner() != "mark hamill":
            raise RuntimeError("Owner was not 'Your System' or 'mark hamill'.")
        if tile.get_owner() == "mark hamill":
            mark_present = True
        elif tile.get_owner() == rb.YOUR_SYSTEM_TEXT:
            your_system_present = True
    if not mark_present and your_system_present:
        raise RuntimeError("'mark hamill' and/or 'Your System' were not present ")
    if len(sys_page.tiles) < 9:
        raise RuntimeError("Not enough tiles present on page.")
    robot_keywords.close_browser(driver)
    print("pass")


def no_systems_connected():
    driver = get_headless_chrome()
    email = get_random_email()
    register_and_activate_account(driver, "Mark", "Hamill", email, password)
    robot_keywords.go_to_url(driver, ENV)
    HeaderNav(driver).log_in_button().click()
    LoginDialog(driver).basic_cloud_login(email, password)
    systems_page = SystemsPage(driver)
    systems_page.no_systems()

    robot_keywords.close_browser(driver)
    print("pass")

if __name__ == "__main__":
    system_tiles_represent_actual_information()
    no_systems_connected()
    keywords.teardown_servers(SERVERS)
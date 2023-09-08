import time
from selenium import webdriver
import os

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
from system_admin import SystemAdmin

from NoptixLibrary.GenericKeywords import GenericKeywords

password = "qweasd 123"

keywords = GenericKeywords()
SERVERS = keywords.create_systems(os.path.basename(__file__))
CLOUD_API = CloudPortalAPI()
viewer_permissions = 'GlobalViewArchivePermission|GlobalExportPermission|GlobalViewBookmarksPermission|GlobalAccessAllMediaPermission'
CLOUD_API.share([SERVERS[1]['cloudOwner'], password],
                SERVERS[1]['id'],
                "viewer",
                SERVERS[0]['cloudOwner'],
                viewer_permissions)


def should_open_systems_page_from_anonymous_state():
    driver = get_headless_chrome()

    robot_keywords.go_to_url(driver, ENV + "/systems")
    LoginDialog(driver).basic_cloud_login(SERVERS[0]['cloudOwner'], password)
    HeaderNav(driver).account_dropdown()

    SystemsPage(driver)


def system_tiles_represent_actual_information():
    driver = get_headless_chrome()

    robot_keywords.go_to_url(driver, ENV + "/systems")
    LoginDialog(driver).basic_cloud_login(SERVERS[0]['cloudOwner'], password)
    HeaderNav(driver).account_dropdown()
    sys_page = SystemsPage(driver)
    rb = RobotVariables("en_US")
    for tile in sys_page.tiles:
        if tile.owner().text != rb.YOUR_SYSTEM_TEXT and tile.owner().text != "mark hamill":
            raise RuntimeError("Owner was not 'Your System' or 'mark hamill'.")
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


def one_system_directs_you_to_system_admin():
    driver = get_headless_chrome()

    robot_keywords.go_to_url(driver, ENV + "/systems")
    LoginDialog(driver).basic_cloud_login(SERVERS[1]['cloudOwner'], password)
    HeaderNav(driver).account_dropdown()

    SystemAdmin(driver)

    robot_keywords.close_browser(driver)
    print("pass")


def opens_system_admin_when_tile_is_clicked():
    driver = get_headless_chrome()

    robot_keywords.go_to_url(driver, ENV + "/systems")
    LoginDialog(driver).basic_cloud_login(SERVERS[0]['cloudOwner'], password)
    HeaderNav(driver).account_dropdown()

    systems_page = SystemsPage(driver)
    systems_page.tiles[0].click()
    SystemAdmin(driver)

    robot_keywords.close_browser(driver)
    print("pass")


def search_highlights_system_name():
    driver = get_headless_chrome()

    robot_keywords.go_to_url(driver, ENV + "/systems")
    LoginDialog(driver).basic_cloud_login(SERVERS[0]['cloudOwner'], password)
    HeaderNav(driver).account_dropdown()

    sys_page = SystemsPage(driver)
    sys_page.search_bar().input_text(SERVERS[0]['name'])
    assert sys_page.systems_found(1).in_dom, \
        "System tiles not found or incorrect number of tiles."

    sys_page.update_system_tiles()
    assert "highlighted" in sys_page.tiles[0].title().find_element_by_xpath("./span").get_attribute("class")

    robot_keywords.close_browser(driver)
    print("pass")


def search_highlights_owner_name():
    driver = get_headless_chrome()

    robot_keywords.go_to_url(driver, ENV + "/systems")
    LoginDialog(driver).basic_cloud_login(SERVERS[0]['cloudOwner'], password)
    HeaderNav(driver).account_dropdown()

    sys_page = SystemsPage(driver)
    sys_page.search_bar().input_text("mark hamill")
    time.sleep(1)
    assert sys_page.systems_found(1).in_dom, \
        "System tiles not found or incorrect number of tiles."

    sys_page.update_system_tiles()
    assert "highlighted" in sys_page.tiles[0].owner().find_element_by_xpath(
        ".//nx-search-highlight/span").get_attribute("class")

    robot_keywords.close_browser(driver)
    print("pass")


def search_is_cleared_by_x_button():
    driver = get_headless_chrome()

    robot_keywords.go_to_url(driver, ENV + "/systems")
    LoginDialog(driver).basic_cloud_login(SERVERS[0]['cloudOwner'], password)
    HeaderNav(driver).account_dropdown()

    sys_page = SystemsPage(driver)
    sys_page.search_bar().input_text(SERVERS[0]['name'])
    assert sys_page.systems_found(1).in_dom, \
        "System tiles not found or incorrect number of tiles."
    sys_page.search_x_button().click()
    time.sleep(1)
    sys_page.update_system_tiles()
    assert len(sys_page.tiles) == 9, \
        "9 tiles were not present."

    robot_keywords.close_browser(driver)
    print("pass")


def should_update_owner_name():
    CLOUD_API.set_account_name(SERVERS[1]['cloudOwner'], password, "carrie", "fisher")
    driver = get_headless_chrome()

    robot_keywords.go_to_url(driver, ENV + "/systems")
    LoginDialog(driver).basic_cloud_login(SERVERS[0]['cloudOwner'], password)
    HeaderNav(driver).account_dropdown()

    sys_page = SystemsPage(driver)
    for tile in sys_page.tiles:
        if tile.owner().text == "carrie fisher":
            break
        else:
            raise RuntimeError("carrie fisher was not the owner on any tiles")

    robot_keywords.close_browser(driver)
    print("pass")


def search_only_visible_with_more_than_eight_systems():
    CLOUD_API.disconnect_server_via_api([SERVERS[1]['cloudOwner'], password], SERVERS[1]['id'], password,
                                        SERVERS[1]['cloudOwner'])
    driver = get_headless_chrome()
    robot_keywords.go_to_url(driver, ENV + "/systems")
    LoginDialog(driver).basic_cloud_login(SERVERS[0]['cloudOwner'], password)
    HeaderNav(driver).account_dropdown()

    sys_page = SystemsPage(driver)
    assert len(sys_page.tiles) == 8, f"Number of tiles was: {len(sys_page.tiles)}.  Expected 8."
    assert not sys_page.search_bar().in_dom, "Search bar was still visible."

    robot_keywords.close_browser(driver)
    print("pass")


if __name__ == "__main__":
    system_tiles_represent_actual_information()
    no_systems_connected()
    one_system_directs_you_to_system_admin()
    opens_system_admin_when_tile_is_clicked()
    search_highlights_system_name()
    search_highlights_owner_name()
    search_is_cleared_by_x_button()
    should_update_owner_name()
    search_only_visible_with_more_than_eight_systems()
    keywords.teardown_servers(SERVERS)

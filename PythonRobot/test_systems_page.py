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
CLOUD_API.share([SERVERS[1]['cloudOwner'], password],
                SERVERS[1]['id'],
                "viewer",
                SERVERS[0]['cloudOwner'],
                viewer_permissions)


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
    # Todo need system admin class to test this
    pass


# . Should show the system page instead of all systems when user only has one
#   [Tags]    C41878    threaded
#   Log In    ${extra system}[cloudOwner]    ${base password}   api=${False}
#   Wait until Location Is    ${ENV}/systems/${extra system}[cloud id]
#   Validate Header Button Text    ${extra system}[name]    systems=False

def opens_system_admin_when_tile_is_clicked():
    # Todo need system admin class to test this
    pass
    # 4. Should open system page when clicked on system
    # [Tags]    C41893    threaded
    # Log In    ${system}[cloudOwner]    ${base password}    api=${False}
    # Validate on Systems Page
    # Click Element    //h2[contains(text(), "${system}[name]")]
    # Verify In System    ${system}[name]
    # Validate Header Button Text    ${system}[name]    systems=False


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
    assert "highlighted" in sys_page.tiles[0].owner().find_element_by_xpath(".//nx-search-highlight/span").get_attribute("class")

    print("pass")


if __name__ == "__main__":
    system_tiles_represent_actual_information()
    no_systems_connected()
    search_highlights_system_name()
    search_highlights_owner_name()
    keywords.teardown_servers(SERVERS)

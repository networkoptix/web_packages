import time

from NoptixLibrary.cloud_portal_api import CloudPortalAPI
from NoptixLibrary.suite import Mediaserver
from NoptixLibrary.suite import Suite
from RobotVariables import RobotVariables
from email_access import get_random_email
from pages.header import HeaderNav
from pages.login import LoginDialog
from resource_import import get_chrome
from resource_import import register_and_activate_account
from pages.system_admin import SystemAdmin
from pages.systems_page import SystemsPage
from variables import ENV

password = "qweasd 123"


def should_open_systems_page_from_anonymous_state(server: Mediaserver):
    with get_chrome() as driver:

        url = ENV + "/systems"
        driver.get(url)
        LoginDialog(driver).basic_cloud_login(server.get_cloud_owner().email, password)
        HeaderNav(driver).account_dropdown()

        SystemsPage(driver)


def system_tiles_represent_actual_information(server: Mediaserver):
    with get_chrome() as driver:
        url = ENV + "/systems"
        driver.get(url)
        LoginDialog(driver).basic_cloud_login(server.get_cloud_owner().email, password)
        HeaderNav(driver).account_dropdown()
        sys_page = SystemsPage(driver)
        rb = RobotVariables("en_US")
        for tile in sys_page.tiles:
            if tile.owner().text not in [rb.YOUR_SYSTEM_TEXT, "Mark Hamill"]:
                raise RuntimeError("Owner was not 'Your System' or 'mark hamill'.")
        if len(sys_page.tiles) < 9:
            raise RuntimeError("Not enough tiles present on page.")
        print("pass")


def no_systems_connected():
    with get_chrome() as driver:
        email = get_random_email()
        register_and_activate_account(driver, "Mark", "Hamill", email, password)
        driver.get(ENV)
        HeaderNav(driver).log_in_button().click()
        LoginDialog(driver).basic_cloud_login(email, password)
        systems_page = SystemsPage(driver)
        systems_page.no_systems().wait_until_visible()
        print("pass")


def one_system_directs_you_to_system_admin(server: Mediaserver):
    with get_chrome() as driver:
        url = ENV + "/systems"
        driver.get(url)
        LoginDialog(driver).basic_cloud_login(server.get_cloud_owner().email, password)
        HeaderNav(driver).account_dropdown()
        SystemAdmin(driver)
        print("pass")


def opens_system_admin_when_tile_is_clicked(server: Mediaserver):
    with get_chrome() as driver:
        url = ENV + "/systems"
        driver.get(url)
        LoginDialog(driver).basic_cloud_login(server.get_cloud_owner().email, password)
        HeaderNav(driver).account_dropdown()

        systems_page = SystemsPage(driver)
        systems_page.tiles[0].click()
        SystemAdmin(driver)
        print("pass")


def search_highlights_system_name(server: Mediaserver):
    """C41891"""
    with get_chrome() as driver:
        url = ENV + "/systems"
        driver.get(url)
        LoginDialog(driver).basic_cloud_login(server.get_cloud_owner().email, password)
        HeaderNav(driver).account_dropdown()

        sys_page = SystemsPage(driver)
        sys_page.search_bar().input_text(server.name)
        assert sys_page.systems_found(1).is_visible(), \
            "System tiles not found or incorrect number of tiles."

        sys_page.update_system_tiles()
        assert "highlighted" in sys_page.tiles[0].title().find_element_by_xpath("./span").get_attribute("class")
        print("pass")


def search_highlights_owner_name(server: Mediaserver):
    """C41891"""
    with get_chrome() as driver:
        url = ENV + "/systems"
        driver.get(url)
        LoginDialog(driver).basic_cloud_login(server.get_cloud_owner().email, password)
        HeaderNav(driver).account_dropdown()

        sys_page = SystemsPage(driver)
        sys_page.search_bar().input_text("mark hamill")
        time.sleep(1)
        assert sys_page.systems_found(1).is_visible(), \
            "System tiles not found or incorrect number of tiles."

        sys_page.update_system_tiles()
        assert "highlighted" in sys_page.tiles[0].owner().find_element_by_xpath(
            ".//nx-search-highlight/span").get_attribute("class")
        print("pass")


def search_is_cleared_by_x_button(server: Mediaserver):
    """C41891"""
    with get_chrome() as driver:
        url = ENV + "/systems"
        driver.get(url)
        LoginDialog(driver).basic_cloud_login(server.get_cloud_owner().email, password)
        HeaderNav(driver).account_dropdown()

        sys_page = SystemsPage(driver)
        sys_page.search_bar().input_text(server.name)
        assert sys_page.systems_found(1).is_visible(), \
            "System tiles not found or incorrect number of tiles."
        sys_page.search_x_button().click()
        time.sleep(1)
        sys_page.update_system_tiles()
        assert len(sys_page.tiles) == 9, \
            "9 tiles were not present."
        print("pass")


def should_update_owner_name(
        server_first: Mediaserver,
        server_second: Mediaserver,
        api: CloudPortalAPI,
        ):
    api.set_account_name(server_second.get_cloud_owner().email, password, "carrie", "fisher")
    with get_chrome() as driver:
        url = ENV + "/systems"
        driver.get(url)
        LoginDialog(driver).basic_cloud_login(server_first.get_cloud_owner().email, password)
        HeaderNav(driver).account_dropdown()

        sys_page = SystemsPage(driver)
        for tile in sys_page.tiles:
            if tile.owner().text == "carrie fisher":
                break
            else:
                raise RuntimeError("carrie fisher was not the owner on any tiles")
        print("pass")


def search_only_visible_with_more_than_eight_systems(
        server_first: Mediaserver,
        server_second: Mediaserver,
        api: CloudPortalAPI,
        ):
    """C41890"""
    owner_second = server_second.get_cloud_owner()
    api.disconnect_server_via_api(
        [owner_second.email, password],
        server_second.id,
        password,
        owner_second.email)
    with get_chrome() as driver:
        url = ENV + "/systems"
        driver.get(url)
        LoginDialog(driver).basic_cloud_login(server_first.get_cloud_owner().email, password)
        HeaderNav(driver).account_dropdown()

        sys_page = SystemsPage(driver)
        assert len(sys_page.tiles) == 8, f"Number of tiles was: {len(sys_page.tiles)}.  Expected 8."
        assert not sys_page.search_bar().is_visible(), "Search bar was still visible."
        print("pass")


if __name__ == "__main__":
    with Suite() as suite:
        cloud_owner_first = suite.create_cloud_account()
        [cloud_server_first, *_] = [suite.create_cloud_server(cloud_owner_first) for _ in range(8)]
        cloud_owner_second = suite.create_cloud_account()
        cloud_server_second = suite.create_cloud_server(cloud_owner_second)
        cloud_api = CloudPortalAPI()
        permissions = [
            'GlobalViewArchivePermission',
            'GlobalExportPermission',
            'GlobalViewBookmarksPermission',
            'GlobalAccessAllMediaPermission',
            ]
        viewer_permissions = '|'.join(permissions)
        cloud_api.share(
            [cloud_server_second.get_cloud_owner().email, password],
            cloud_server_second.id,
            "viewer",
            cloud_server_first.get_cloud_owner().email,
            viewer_permissions,
            )
        system_tiles_represent_actual_information(cloud_server_first)
        no_systems_connected()
        one_system_directs_you_to_system_admin(cloud_server_second)
        opens_system_admin_when_tile_is_clicked(cloud_server_first)
        search_highlights_system_name(cloud_server_first)
        search_highlights_owner_name(cloud_server_first)
        search_is_cleared_by_x_button(cloud_server_first)
        should_update_owner_name(cloud_server_first, cloud_server_second, cloud_api)
        search_only_visible_with_more_than_eight_systems(
            cloud_server_first,
            cloud_server_second,
            cloud_api,
            )

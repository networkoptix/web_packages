from pathlib import Path

from NoptixLibrary.suite import CloudAccount
from NoptixLibrary.suite import Mediaserver
from NoptixLibrary.suite import Suite
from browsers.chrome import get_chrome
from pages.login import LoginDialog
from pages.system_admin import FailedToAccessSystemPage
from pages.system_admin import SystemAdmin
from pages.system_left_menu import SystemLeftMenu
from pages.systems_page import SystemsPage
from variables import ENV


def page_is_opened_and_shows_the_user_list_to_owner(server: Mediaserver):
    """[Tags]    C41881    cloud."""
    with get_chrome() as driver:
        owner = server.get_cloud_owner()
        url = ENV + f"/systems/{server.id}"
        driver.get(url)
        LoginDialog(driver).basic_cloud_login(owner.email, owner.password)
        # Falls down because of CLOUD-11715 and CLOUD-11629
        SystemAdmin(driver).system_offline_text().wait_until_visible(timeout=65)
        users_dropdown = SystemLeftMenu(driver).users_dropdown()
        users_dropdown.wait_for_user_with_email(server.get_cloud_viewer().email)
        # TODO: Add check on CLOUD-6615 when blocking bugs are fixed and test is ready


def offline_system_opens_system_page_by_link_to_user_without_permission(
        server: Mediaserver,
        user: CloudAccount,
        ):
    """[Tags]    C41572    cloud."""
    with get_chrome() as driver:
        url = ENV + f"/systems/{server.id}"
        driver.get(url)
        LoginDialog(driver).basic_cloud_login(user.email, user.password)
        failed_to_access_system_page = FailedToAccessSystemPage(driver)
        assert failed_to_access_system_page.is_shown()
        failed_to_access_system_page.wait_for_broken_link_text()
        failed_to_access_system_page.get_go_to_main_page_button().click()
        # Falls down because of CLOUD-11656
        SystemsPage(driver).no_systems().wait_until_visible()


def system_changes_state_to_offline_if_all_its_servers_goes_offline(
        master_merged_server: Mediaserver,
        slave_merged_server: Mediaserver,
        ):
    """[Tags]    C41894    C30826    cloud."""
    owner = master_merged_server.get_cloud_owner()
    with get_chrome() as driver:
        url = ENV + "/systems/"
        driver.get(url)
        LoginDialog(driver).basic_cloud_login(owner.email, owner.password)
        systems_page = SystemsPage(driver)
        systems_page.wait_for_tiles_count(2)
        tile = systems_page.get_tile_by_name(master_merged_server.name)
        assert tile.online()
        master_merged_server.stop()
        slave_merged_server.stop()
        tile.wait_until_is_offline()
        tile.click()
        # Falls down because of CLOUD-11715 and CLOUD-11629
        SystemAdmin(driver).system_offline_text().wait_until_visible(timeout=65)
        master_merged_server.start(wait_for_started=True)
        driver.get(url)
        tile = SystemsPage(driver).get_tile_by_name(master_merged_server.name)
        tile.wait_until_is_online()


if __name__ == "__main__":
    suite_name = Path(__file__).stem
    suite_name = suite_name.removeprefix("test_")
    with Suite() as suite:
        cloud_owner = suite.create_cloud_account()
        cloud_users = suite.create_cloud_accounts()
        cloud_server = suite.create_cloud_server(cloud_owner, suite_name, cloud_users)
        cloud_server.stop()
        page_is_opened_and_shows_the_user_list_to_owner(cloud_server)
        dummy_account = suite.create_cloud_account()
        offline_system_opens_system_page_by_link_to_user_without_permission(
            cloud_server,
            dummy_account,
            )
        second_server = suite.create_cloud_server(cloud_owner, suite_name)
        cloud_server.start(wait_for_started=True)
        cloud_server.cloud_merge(second_server)
        third_server = suite.create_cloud_server(cloud_owner, suite_name)
        system_changes_state_to_offline_if_all_its_servers_goes_offline(cloud_server, second_server)

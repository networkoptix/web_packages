from pathlib import Path

from NoptixLibrary.suite import Mediaserver
from NoptixLibrary.suite import Suite
from pages.login import LoginDialog
from browsers.chrome import get_chrome
from pages.merge_dialog import MergeDialog
from pages.system_admin import SystemAdmin
from pages.system_left_menu import SystemLeftMenu
from variables import ENV


def merge_from_primary_system(first_server: Mediaserver, second_server: Mediaserver):
    with get_chrome() as driver:
        url = ENV + f"/systems/{first_server.id}"
        driver.get(url)
        first_server_owner = first_server.get_cloud_owner()
        LoginDialog(driver).basic_cloud_login(first_server_owner.email, first_server_owner.password)
        sys_admin = SystemAdmin(driver)
        sys_admin.merge_with_another_system_button().click()
        merge_dialog = MergeDialog(driver)
        merge_dialog.ensure_system_online(second_server.name, timeout=20)
        merge_dialog.primary_first_system().wait_until_visible()
        merge_dialog.primary_second_system().wait_until_visible()
        merge_dialog.get_next_button().click()
        merge_dialog.merge_systems_button().click()
        sys_admin.system_is_being_merged().wait_until_visible()
        message = sys_admin.systems_merged_success_toast_notification(first_server.name, second_server.name)
        message.wait_until_visible(90)
        message.wait_until_not_visible(10)
        driver.refresh()
        left_menu = SystemLeftMenu(driver)
        left_menu.servers_button().click()
        assert left_menu.servers_count() == 2, f"Len was {left_menu.servers_count()}"

def test_cloud_merge_X_button(first_server: Mediaserver):
    with get_chrome() as driver:
        url = ENV + f"/systems/{first_server.id}"
        driver.get(url)
        first_server_owner = first_server.get_cloud_owner()
        LoginDialog(driver).basic_cloud_login(first_server_owner.email, first_server_owner.password)
        sys_admin = SystemAdmin(driver)
        sys_admin.merge_with_another_system_button().click()
        merge_dialog = MergeDialog(driver)
        merge_dialog.get_close_button().click()
        merge_dialog.wait_until_not_visible()
        sys_admin.merge_with_another_system_button().click()
        merge_dialog = MergeDialog(driver)
        merge_dialog.get_next_button().click()
        merge_dialog.get_close_button().click()
        merge_dialog.wait_until_not_visible()
        sys_admin.merge_with_another_system_button().click()
        merge_dialog = MergeDialog(driver)
        merge_dialog.get_next_button().click()
        merge_dialog.primary_first_system().wait_until_visible()
        merge_dialog.get_next_button().click()
        merge_dialog.get_close_button().click()
        merge_dialog.wait_until_not_visible()


if __name__ == "__main__":
    suite_name = Path(__file__).stem
    suite_name = suite_name.removeprefix("test_")
    with Suite() as suite:
        cloud_owner_1 = suite.create_cloud_account()
        server_1 = suite.create_cloud_server(cloud_owner_1, f'{suite_name}_1_')
        server_2 = suite.create_cloud_server(cloud_owner_1, f'{suite_name}_2_')
        merge_from_primary_system(server_1, server_2)

        cloud_owner_2 = suite.create_cloud_account()
        server_3 = suite.create_cloud_server(cloud_owner_2, f'{suite_name}_3_')
        server_4 = suite.create_cloud_server(cloud_owner_2, f'{suite_name}_4_')
        test_cloud_merge_X_button(server_3)
        
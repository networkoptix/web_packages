from pathlib import Path

from NoptixLibrary.suite import Mediaserver
from NoptixLibrary.suite import Suite
from login import LoginDialog
from resource_import import get_headless_chrome
from system_admin import SystemAdmin
from system_left_menu import SystemLeftMenu
from variables import ENV


def merge_from_primary_system(first_server: Mediaserver, second_server: Mediaserver):
    driver = get_headless_chrome()
    url = ENV + f"/systems/{first_server.id}"
    driver.get(url)
    first_server_owner = first_server.get_cloud_owner()
    LoginDialog(driver).basic_cloud_login(first_server_owner.email, first_server_owner.password)
    sys_admin = SystemAdmin(driver)
    sys_admin.merge_with_another_system_button().click()
    sys_admin.ensure_system_online(second_server.name, timeout=20)
    sys_admin.primary_first_system()
    sys_admin.primary_second_system()
    sys_admin.merge_next_button().click()
    sys_admin.merge_systems_button().click()
    sys_admin.system_is_being_merged()
    sys_admin.systems_merged_success_toast_notification(first_server.name, second_server.name).message()
    driver.refresh()
    left_menu = SystemLeftMenu(driver)
    left_menu.servers_button().click()
    left_menu.update_servers_list()
    assert len(left_menu.servers) == 2, f"Len was {len(left_menu.servers)}"
    driver.quit()


if __name__ == "__main__":
    suite_name = Path(__file__).stem
    suite_name = suite_name.removeprefix("test_")
    with Suite() as suite:
        cloud_owner = suite.create_cloud_account()
        first_server = suite.create_cloud_server(cloud_owner, f'{suite_name}_1_')
        second_server = suite.create_cloud_server(cloud_owner, f'{suite_name}_2_')
        merge_from_primary_system(first_server, second_server)

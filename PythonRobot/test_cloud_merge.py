import os

import robot_keywords
from NoptixLibrary.cloud_portal_api import CloudPortalAPI
from NoptixLibrary.generic_keywords import GenericKeywords
from login import LoginDialog
from resource_import import get_headless_chrome
from system_admin import SystemAdmin
from system_left_menu import SystemLeftMenu
from variables import ENV

password = "qweasd 123"

keywords = GenericKeywords()
CLOUD_API = CloudPortalAPI()
viewer_permissions = 'GlobalViewArchivePermission|GlobalExportPermission|GlobalViewBookmarksPermission|GlobalAccessAllMediaPermission'


def merge_from_primary_system():
    servers = keywords.create_systems(os.path.basename(__file__))
    driver = get_headless_chrome()
    robot_keywords.go_to_url(driver, ENV + f"/systems/{servers[0]['id']}")
    LoginDialog(driver).basic_cloud_login(servers[0]['cloudOwner'], password)
    sys_admin = SystemAdmin(driver)
    sys_admin.merge_with_another_system_button().click()

    sys_admin.merge_next_button().click()
    sys_admin.primary_first_system()
    sys_admin.primary_second_system()

    sys_admin.merge_next_button().click()

    sys_admin.merge_systems_button().click()
    sys_admin.system_is_being_merged()
    sys_admin.systems_merged_success_toast_notification(servers[0]['name'], servers[1]['name']).message()

    driver.refresh()
    left_menu = SystemLeftMenu(driver)
    left_menu.servers_button().click()
    left_menu.update_servers_list()

    assert len(left_menu.servers) == 2, f"Len was {len(left_menu.servers)}"
    robot_keywords.close_browser(driver)
    print("pass")


if __name__ == "__main__":
    merge_from_primary_system()

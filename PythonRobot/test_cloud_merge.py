from pathlib import Path

from NoptixLibrary.suite import Mediaserver
from NoptixLibrary.suite import Suite
from RobotVariables import RobotVariables
from pages.login import LoginDialog
from browsers.chrome import get_chrome
from pages.merge_dialog import MergeDialog
from pages.system_admin import SystemAdmin
from pages.system_left_menu import SystemLeftMenu
from variables import ENV

rb = RobotVariables("en_US")

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
        sys_admin.system_is_being_merged_header().wait_until_visible()
        message = sys_admin.systems_merged_success_toast_notification(first_server.name, second_server.name)
        message.wait_until_visible(90)
        message.wait_until_not_visible(10)
        driver.refresh()
        left_menu = SystemLeftMenu(driver)
        left_menu.servers_button().click()
        assert left_menu.servers_count() == 2, f"Len was {left_menu.servers_count()}"

def merge_from_secondary_system(first_server: Mediaserver, second_server: Mediaserver):
    '''
    9. Positive scenario with selected cloud system (selected system is primary)

    [Tags]    C70931    pos    must
    '''
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
        merge_dialog.get_second_server_radio_select().click()
        merge_dialog.get_next_button().click()
        merge_dialog.merge_systems_button().click()
        sys_admin.system_is_being_merged_page().wait_until_visible()
        message = sys_admin.systems_merged_success_toast_notification(second_server.name, first_server.name)
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

def test_cloud_merge_back_button(
        first_server: Mediaserver,
        second_server: Mediaserver,
        third_server: Mediaserver,
        ):
    with get_chrome() as driver:
        url = ENV + f"/systems/{first_server.id}"
        driver.get(url)
        first_server_owner = first_server.get_cloud_owner()
        LoginDialog(driver).basic_cloud_login(first_server_owner.email, first_server_owner.password)
        sys_admin = SystemAdmin(driver)
        sys_admin.merge_with_another_system_button().click()
        merge_dialog = MergeDialog(driver)
        system_dropdown = merge_dialog.get_system_select_dropdown()
        system_dropdown.wait_until_visible()
        system_dropdown.get_dropdown_button(second_server.name).wait_until_visible(timeout=20)
        system_dropdown.get_dropdown_button(second_server.name).click()
        system_dropdown.select_server(second_server.name)
        merge_dialog.ensure_system_online(second_server.name)
        merge_dialog.get_back_button().click()
        system_dropdown.get_dropdown_button(second_server.name).click()
        system_dropdown.select_server(third_server.name)
        merge_dialog.ensure_system_online(third_server.name)
        second_option = merge_dialog.get_second_server_radio_select().get_text()
        assert second_option == third_server.name
        merge_dialog.get_next_button().click()
        dialog_text = merge_dialog.get_about_to_merge_text().get_text()
        expected_text_1 = rb.YOU_ARE_ABOUT_TO_MERGE_TEXT.replace("%SYSTEM1%", first_server.name)
        expected_text_1 = expected_text_1.replace("%SYSTEM2%", third_server.name)
        expected_text_2 = rb.SETTINGS_WILL_BE_TAKEN_TEXT.replace("%SYSTEM%", first_server.name)
        assert dialog_text == expected_text_1+"\n"+expected_text_2


if __name__ == "__main__":
    suite_name = Path(__file__).stem
    suite_name = suite_name.removeprefix("test_")
    with Suite() as suite:
        cloud_owner_1 = suite.create_cloud_account()
        server_1 = suite.create_cloud_server(cloud_owner_1, f'{suite_name}_1_')
        server_2 = suite.create_cloud_server(cloud_owner_1, f'{suite_name}_2_')
        merge_from_primary_system(server_1, server_2)
        print("PASS")

        cloud_owner_2 = suite.create_cloud_account()
        server_3 = suite.create_cloud_server(cloud_owner_2, f'{suite_name}_3_')
        server_4 = suite.create_cloud_server(cloud_owner_2, f'{suite_name}_4_')
        test_cloud_merge_X_button(server_3)
        print("PASS")

        cloud_owner_3 = suite.create_cloud_account()
        server_5 = suite.create_cloud_server(cloud_owner_3, f'{suite_name}_5_')
        server_6 = suite.create_cloud_server(cloud_owner_3, f'{suite_name}_6_')
        merge_from_secondary_system(server_5, server_6)

        cloud_owner_4 = suite.create_cloud_account()
        server_7 = suite.create_cloud_server(cloud_owner_4, f'{suite_name}_7_')
        server_8 = suite.create_cloud_server(cloud_owner_4, f'{suite_name}_8_')
        server_9 = suite.create_cloud_server(cloud_owner_4, f'{suite_name}_9_')
        test_cloud_merge_back_button(server_7, server_8, server_9)
        print("PASS")

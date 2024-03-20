import time
from pathlib import Path

from NoptixLibrary.suite import CloudAccount
from NoptixLibrary.suite import Mediaserver
from NoptixLibrary.suite import Suite
from RobotVariables import RobotVariables
from browsers.chrome import get_chrome
from pages.login import LoginDialog
from pages.merge_dialog import MergeDialog
from pages.system_admin import SystemAdmin
from pages.system_left_menu import SystemLeftMenu
from pages.system_left_menu import UsersDropdown
from variables import ENV

rb = RobotVariables("en_US")


def merge_from_primary_system(driver, first_server: Mediaserver, second_server: Mediaserver):
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
    # Commenting out below step because merge can complete so fast that this header msg never shows up.
    # sys_admin.system_is_being_merged_header().wait_until_visible()
    message = sys_admin.systems_merged_success_toast_notification(first_server.name, second_server.name)
    message.wait_until_visible(90)
    message.wait_until_not_visible(10)
    driver.refresh()
    sys_admin_servers = SystemAdmin(driver).get_tab_settings()
    left_menu = SystemLeftMenu(driver)
    left_menu.servers_button().click()
    sys_admin_servers.get_servers_section().get_default_server_page().wait_until_visible_owner_elements()
    assert left_menu.servers_count() == 2, f"Len was {left_menu.servers_count()}"


def merge_from_secondary_system(first_server: Mediaserver, second_server: Mediaserver):
    """
    9. Positive scenario with selected cloud system (selected system is primary).

    [Tags]    C70931    pos    must
    """
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
        merge_dialog.get_back_button().wait_until_visible(timeout=20)
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
        assert dialog_text == expected_text_1 + "\n" + expected_text_2


def test_different_users_in_systems(
        first_server: Mediaserver,
        second_server: Mediaserver,
        third_server: Mediaserver,
        user_in_all: CloudAccount,
        server_2_adv_viewer: CloudAccount,
        server_3_custom: CloudAccount,
        ):
    """
    15. Different types of users in both Systems.

    [Tags]    C76326    pos
    """
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
        left_menu.users_dropdown().click()
        users = first_server.get_users()
        user_emails = [user.email for user in users]
        assert user_in_all.email in user_emails
        assert server_2_adv_viewer.email in user_emails
        users_dropdown = UsersDropdown(driver)
        assert user_in_all.email in users_dropdown.visible_users()
        assert server_2_adv_viewer.email in users_dropdown.visible_users()
        for user in users:
            if user.email == user_in_all.email:
                if user.permissions != CloudAccount.PERMISSIONS["cloudAdmin"]:
                    raise RuntimeError("User exists but with incorrect permissions")
            elif user.email == server_2_adv_viewer.email:
                if user.permissions != CloudAccount.PERMISSIONS["advancedViewer"]:
                    raise RuntimeError("User exists but with incorrect permissions")
        sys_admin = SystemAdmin(driver)
        left_menu = SystemLeftMenu(driver)
        left_menu.system_administration_button().click()
        sys_admin.merge_with_another_system_button().wait_until_visible()
        sys_admin.merge_with_another_system_button().click()
        merge_dialog = MergeDialog(driver)
        merge_dialog.ensure_system_online(third_server.name, timeout=20)
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
        left_menu.users_dropdown().click()
        users = first_server.get_users()
        user_emails = [user.email for user in users]
        assert user_in_all.email in user_emails
        assert server_3_custom.email in user_emails
        users_dropdown = UsersDropdown(driver)
        assert user_in_all.email in users_dropdown.visible_users()
        assert server_3_custom.email in users_dropdown.visible_users()
        for user in users:
            if user.email == user_in_all.email:
                if user.permissions != CloudAccount.PERMISSIONS["cloudAdmin"]:
                    raise RuntimeError("User exists but with incorrect permissions")
            elif user.email == server_3_custom.email:
                if user.permissions != CloudAccount.PERMISSIONS["custom"]:
                    raise RuntimeError("User exists but with incorrect permissions")


if __name__ == "__main__":
    suite_name = Path(__file__).stem
    suite_name = suite_name.removeprefix("test_")
    with Suite() as suite:
        cloud_owner_1 = suite.create_cloud_account()
        server_1 = suite.create_cloud_server(cloud_owner_1, f'{suite_name}_1_')
        server_2 = suite.create_cloud_server(cloud_owner_1, f'{suite_name}_2_')
        merge_from_primary_system(server_1, server_2)
        print("PASS\n")

        cloud_owner_2 = suite.create_cloud_account()
        server_3 = suite.create_cloud_server(cloud_owner_2, f'{suite_name}_3_')
        server_4 = suite.create_cloud_server(cloud_owner_2, f'{suite_name}_4_')
        test_cloud_merge_X_button(server_3)
        print("PASS\n")

        cloud_owner_3 = suite.create_cloud_account()
        server_5 = suite.create_cloud_server(cloud_owner_3, f'{suite_name}_5_')
        server_6 = suite.create_cloud_server(cloud_owner_3, f'{suite_name}_6_')
        merge_from_secondary_system(server_5, server_6)
        print("PASS\n")

        cloud_owner_4 = suite.create_cloud_account()
        server_7 = suite.create_cloud_server(cloud_owner_4, f'{suite_name}_7_')
        server_8 = suite.create_cloud_server(cloud_owner_4, f'{suite_name}_8_')
        server_9 = suite.create_cloud_server(cloud_owner_4, f'{suite_name}_9_')
        test_cloud_merge_back_button(server_7, server_8, server_9)
        print("PASS\n")

        cloud_owner_5 = suite.create_cloud_account()
        server_10 = suite.create_cloud_server(cloud_owner_5, f'{suite_name}_10_')
        server_10_admin_user = suite.create_cloud_account()
        server_10.share_with_user(server_10_admin_user, "cloudAdmin")
        server_11 = suite.create_cloud_server(cloud_owner_5, f'{suite_name}_11_')
        server_11_adv_user = suite.create_cloud_account()
        server_11.share_with_user(server_11_adv_user, "advancedViewer")
        server_12 = suite.create_cloud_server(cloud_owner_5, f'{suite_name}_12_')
        server_12_custom_user = suite.create_cloud_account()
        server_12.share_with_user(server_12_custom_user, "custom")
        user_in_all = suite.create_cloud_account()
        for permission, server in zip(["cloudAdmin", "advancedViewer", "custom"], [server_10, server_11, server_12]):
            server.share_with_user(user_in_all, permission)
        test_different_users_in_systems(
            server_10,
            server_11,
            server_12,
            user_in_all,
            server_11_adv_user,
            server_12_custom_user,
            )
        print("PASS\n")

import logging
import time
from pathlib import Path
from typing import Sequence

from NoptixLibrary.suite import Mediaserver
from NoptixLibrary.suite import Suite
from RobotVariables import RobotVariables
from browsers.chrome import get_chrome
from colorama import Fore
from generic_elements import ElementNotVisible
from pages.header import HeaderNav
from pages.login import LoginDialog
from pages.merge_dialog import MergeDialog
from pages.system_admin import SystemAdmin


def test_dropdown_has_three_sections(servers: Sequence[Mediaserver], rb: RobotVariables):
    """
    2. Merge Dialog - Dropdown has three sections.

    [Tags]    C70979    merge_dialog    should
    """
    [first_server, second_server, last_server] = servers
    second_server.stop()
    with get_chrome() as driver:
        driver.get(rb.ENV)
        owner = first_server.get_cloud_owner()
        HeaderNav(driver).log_in_button().click()
        LoginDialog(driver).basic_cloud_login(owner.email, owner.password)
        LoginDialog(driver).wait_until_login_finished()
        url = rb.ENV + f"/systems/{first_server.id}"
        driver.get(url)
        system_admin_page = SystemAdmin(driver, rb.language)
        # The 'Merge...' button is disabled by default and only becomes active after switching to another tab and then back
        system_admin_page.get_information_tab().click()
        system_admin_page.get_tab_settings().click()
        merge_button = system_admin_page.merge_with_another_system_button()
        merge_button.wait_until_clickable(10)
        merge_button.click()
        merge_dialog = MergeDialog(driver)
        merge_dialog.verify()
        merge_dialog.wait_until_system_is_accessible(last_server.name)
        select_button = merge_dialog.get_system_select_button()
        select_button.wait_until_clickable()
        select_button.click()
        available_systems = merge_dialog.get_available_systems()
        assert available_systems[0].state == ''
        assert available_systems[1].state == 'incompatible'
        assert available_systems[2].state == 'offline'


def test_dropdown_has_one_section(servers: Sequence[Mediaserver], rb: RobotVariables):
    """
    3. Merge Dialog - Dropdown has two sections(no cloud systems).

    [Tags]    C70980    merge_dialog    should
    """
    [first_server, second_server] = servers
    with get_chrome() as driver:
        driver.get(rb.ENV)
        owner = first_server[0].get_cloud_owner()
        HeaderNav(driver).log_in_button().click()
        LoginDialog(driver).basic_cloud_login(owner.email, owner.password)
        LoginDialog(driver).wait_until_login_finished()
        url = rb.ENV + f"/systems/{first_server.id}"
        driver.get(url)
        system_admin_page = SystemAdmin(driver, rb.language)
        # The 'Merge...' button is disabled by default and only becomes active after switching to another tab and then back
        system_admin_page.get_information_tab().click()
        system_admin_page.get_tab_settings().click()
        merge_button = system_admin_page.merge_with_another_system_button()
        merge_button.wait_until_clickable(10)
        merge_button.click()
        merge_dialog = MergeDialog(driver)
        merge_dialog.verify()
        merge_dialog.wait_until_system_is_accessible(second_server.name)
        select_button = merge_dialog.get_system_select_button()
        select_button.wait_until_clickable()
        select_button.click()
        available_systems = merge_dialog.get_available_systems()
        assert available_systems[0].state == ''


def test_dropdown_has_no_valid_systems(servers: Sequence[Mediaserver], rb: RobotVariables):
    """
    5. Merge Dialog - Dropdown has no valid systems.

    [Tags]    C76420    merge_dialog
    """
    with get_chrome() as driver:
        driver.get(rb.ENV)
        owner = servers[0].get_cloud_owner()
        HeaderNav(driver).log_in_button().click()
        LoginDialog(driver).basic_cloud_login(owner.email, owner.password)
        LoginDialog(driver).wait_until_login_finished()
        url = rb.ENV + f"/systems/{servers[0].id}"
        driver.get(url)
        system_admin_page = SystemAdmin(driver, rb.language)
        # The 'Merge...' button is disabled by default and only becomes active after switching to another tab and then back
        system_admin_page.get_information_tab().click()
        system_admin_page.get_tab_settings().click()
        merge_button = system_admin_page.merge_with_another_system_button()
        merge_button.wait_until_clickable(10)
        merge_button.click()
        merge_dialog = MergeDialog(driver)
        # merge_dialog.verify()
        merge_dialog.wait_until_system_is_accessible(servers[-1].name)
        select_button = merge_dialog.get_system_select_button()
        select_button.wait_until_clickable()
        select_button.click()
        available_systems = merge_dialog.get_available_systems()
        assert available_systems[0].state == 'incompatible'


def test_online_and_offline_state_in_merge_dialog(servers: Sequence[Mediaserver], rb: RobotVariables):
    """
    16. Checking state for selected Cloud system - System offline / back online.

    [Tags]    C70983    C70987    state_cloud    neg    should
    """
    with get_chrome() as driver:
        url = rb.ENV + f"/systems/{servers[0].id}"
        driver.get(url)
        first_server_owner = servers[0].get_cloud_owner()
        LoginDialog(driver).basic_cloud_login(first_server_owner.email, first_server_owner.password)
        sys_admin = SystemAdmin(driver)
        sys_admin.merge_with_another_system_button().click()
        merge_dialog = MergeDialog(driver)
        merge_dialog.wait_until_system_is_accessible(servers[1].name)
        merge_dialog.get_system_offline_message(servers[1].name).wait_until_visible()
        servers[1].start()
        system_dropdown = merge_dialog.get_system_select_dropdown()
        system_dropdown.get_dropdown_button(servers[1].name).wait_until_visible(timeout=20)
        system_dropdown.get_dropdown_button(servers[1].name).click()
        started_at = time.monotonic()
        timeout_sec = 20
        while True:
            try:
                merge_dialog.get_first_server_radio_select().wait_until_visible(timeout=5)
                break
            except ElementNotVisible:
                logging.log(1, "System not online yet...")
            if time.monotonic() - started_at > timeout_sec:
                raise TimeoutError(f"Server did not come online in {timeout_sec} seconds...")
            if merge_dialog.check_button().is_visible():
                merge_dialog.check_button().click()


if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)
    suite_name = Path(__file__).stem
    if 'test_' == suite_name[:5]:
        suite_name = suite_name.replace('test_', '', 1)
    variables = RobotVariables("en_US")
    with Suite() as suite:
        cloud_owner_1 = suite.create_cloud_account()
        servers_1 = [
            suite.create_cloud_server(cloud_owner_1, f"{suite_name}", vms_version='5.0'),
            suite.create_cloud_server(cloud_owner_1, f"{suite_name}", vms_version='5.0'),
            suite.create_cloud_server(cloud_owner_1, f"{suite_name}", vms_version='5.1'),
            suite.create_cloud_server(cloud_owner_1, f"{suite_name}", vms_version='5.0'),
            ]
        test_dropdown_has_three_sections(servers_1, variables)

        cloud_owner_2 = suite.create_cloud_account()
        servers_2 = [
            suite.create_cloud_server(cloud_owner_2, f"{suite_name}", vms_version='5.1'),
            suite.create_cloud_server(cloud_owner_2, f"{suite_name}", vms_version='5.1'),
            ]
        test_dropdown_has_one_section(servers_2, variables)

        cloud_owner_3 = suite.create_cloud_account()
        servers_3 = [
            suite.create_cloud_server(cloud_owner_3, f"{suite_name}", vms_version='5.1'),
            suite.create_cloud_server(cloud_owner_3, f"{suite_name}", vms_version='5.0'),
            ]
        test_dropdown_has_no_valid_systems(servers_3, variables)

        cloud_owner_4 = suite.create_cloud_account()
        servers_4 = [
            suite.create_cloud_server(cloud_owner_4, f"{suite_name}", vms_version='5.1'),
            suite.create_cloud_server(cloud_owner_4, f"{suite_name}", vms_version='5.1'),
            ]
        servers_4[1].stop()
        test_online_and_offline_state_in_merge_dialog(servers_4, variables)

        print(f'{Fore.WHITE}{test_dropdown_has_three_sections.__doc__.strip()}\t\t\t{Fore.GREEN}| PASS |')

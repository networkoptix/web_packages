import logging
import time
from pathlib import Path
from typing import Sequence

from colorama import Fore

from NoptixLibrary.suite import Mediaserver
from NoptixLibrary.suite import Suite
from RobotVariables import RobotVariables
from browsers.chrome import get_chrome
from pages.header import HeaderNav
from pages.login import LoginDialog
from pages.merge_dialog import MergeDialog
from pages.system_admin import SystemAdmin


def test_dropdown_has_three_sections(servers: Sequence[Mediaserver], rb: RobotVariables):
    """
    2. Merge Dialog - Dropdown has three sections
    [Tags]    C70979    merge_dialog    should
    """
    servers[1].stop()
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
        merge_dialog.verify()
        merge_dialog.wait_until_system_is_accessible(servers[-1].name)
        select_button = merge_dialog.get_system_select_button()
        select_button.wait_until_clickable()
        select_button.click()
        available_systems = merge_dialog.get_available_systems()
        assert available_systems[0].state == ''
        assert available_systems[1].state == 'incompatible'
        assert available_systems[2].state == 'offline'
    servers[1].start()


if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)
    suite_name = Path(__file__).stem
    if 'test_' == suite_name[:5]:
        suite_name = suite_name.replace('test_', '', 1)
    variables = RobotVariables("en_US")
    with Suite() as suite:
        cloud_owner = suite.create_cloud_account()
        servers = [
            suite.create_cloud_server(cloud_owner, f"{suite_name}", vms_version='5.0'),
            suite.create_cloud_server(cloud_owner, f"{suite_name}", vms_version='5.0'),
            suite.create_cloud_server(cloud_owner, f"{suite_name}", vms_version='5.1'),
            suite.create_cloud_server(cloud_owner, f"{suite_name}", vms_version='5.0'),
        ]
        test_dropdown_has_three_sections(servers, variables)
        print(f'{Fore.WHITE}{test_dropdown_has_three_sections.__doc__.strip()}\t\t\t{Fore.GREEN}| PASS |')


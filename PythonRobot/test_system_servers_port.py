"""robot_tests/test-cases/system-servers.robot"""
import time
from pathlib import Path

from colorama import Fore

from NoptixLibrary.suite import CloudAccount
from NoptixLibrary.suite import Mediaserver
from NoptixLibrary.suite import Suite
from RobotVariables import RobotVariables
from header import HeaderNav
from login import LoginDialog
from resource_import import get_chrome
from system_admin import SystemAdmin


def test_change_port_only_for_owner(server: Mediaserver, rb: RobotVariables, cloud_account: CloudAccount):
    """
    7. Change port is only available for owner
    [Tags]    C70927    cloud    webadmin
    """
    with get_chrome() as driver:
        driver.get(rb.ENV)
        HeaderNav(driver).log_in_button().click()
        LoginDialog(driver).basic_cloud_login(cloud_account.email, cloud_account.password)
        driver.get(rb.ENV + f"/systems/{server.id}")
        system = SystemAdmin(driver, rb.language)
        tab_settings = system.get_tab_settings()
        tab_settings.click()
        servers_section = tab_settings.get_servers_section()
        servers_section.click()
        server_page = servers_section.get_server_page(server.get_server_name())
        server_page.click()
        server_page.wait_until_visible_common_elements()
        server_page.wait_until_visible_owner_elements()
        assert not server_page.get_port_field().is_enabled()


if __name__ == '__main__':
    suite_name = Path(__file__).stem
    if 'test_' == suite_name[:5]:
        suite_name = suite_name.replace('test_', '', 1)
    variables = RobotVariables("en_US")
    with Suite() as suite:
        cloud_owner = suite.create_cloud_account()
        cloud_admin = suite.create_cloud_account()
        cloud_server = suite.create_cloud_server(cloud_owner, f"{suite_name}", {'cloudAdmin': cloud_admin})
        test_change_port_only_for_owner(cloud_server, variables, cloud_admin)
        print(f'{Fore.WHITE}{test_change_port_only_for_owner.__doc__.strip()}\t\t\t{Fore.GREEN}| PASS |')

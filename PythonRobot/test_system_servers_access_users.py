import logging
from pathlib import Path

from colorama import Fore

from NoptixLibrary.suite import Mediaserver
from NoptixLibrary.suite import Suite
from RobotVariables import RobotVariables
from header import HeaderNav
from login import LoginDialog
from resource_import import get_chrome
from system_admin import SystemAdmin


def test_access_owner(server: Mediaserver, rb: RobotVariables):
    """
    17. Owner/Admin has Access
    [Tags]    C70957    cloud    webadmin
    """
    with get_chrome() as driver:
        driver.get(rb.ENV)
        owner = server.get_cloud_owner()
        HeaderNav(driver).log_in_button().click()
        LoginDialog(driver).basic_cloud_login(owner.email, owner.password)
        driver.get(rb.ENV + f"/systems/{server.id}")
        system_admin_page = SystemAdmin(driver, rb.language)
        tab_settings = system_admin_page.get_tab_settings()
        tab_settings.click()
        servers_section = tab_settings.get_servers_section()
        servers_section.click()
        server_page = servers_section.get_default_server_page()
        server_page.wait_until_visible_common_elements()
        server_page.wait_until_visible_owner_elements()


if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)
    suite_name = Path(__file__).stem
    if 'test_' == suite_name[:5]:
        suite_name = suite_name.replace('test_', '', 1)
    variables = RobotVariables("en_US")
    with Suite() as suite:
        cloud_owner = suite.create_cloud_account()
        cloud_admin = suite.create_cloud_account()
        server = suite.create_cloud_server(cloud_owner, f"{suite_name}", {'cloudAdmin': cloud_admin})
        test_access_owner(server, variables)
        print(f'{Fore.WHITE}{test_access_owner.__doc__.strip()}\t\t\t{Fore.GREEN}| PASS |')

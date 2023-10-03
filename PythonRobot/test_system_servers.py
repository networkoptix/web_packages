"""robot_tests/test-cases/system-servers.robot"""
from pathlib import Path

from colorama import Fore

from NoptixLibrary.suite import Mediaserver
from NoptixLibrary.suite import Suite
from RobotVariables import RobotVariables
from resource_import import cloud_login
from resource_import import get_chrome
from system_admin import SystemAdmin


def test_verify_server_buttons(server: Mediaserver, rb: RobotVariables):
    """
    0.1 Verify server buttons are enabled
    [Tags]    CLOUD-10255   cloud   webadmin
    """
    with get_chrome() as driver:
        driver.get(rb.ENV)
        owner = server.get_cloud_owner()
        cloud_login(driver, owner.email, owner.password)
        driver.get(rb.ENV + f"/systems/{server.id}")
        system = SystemAdmin(driver, rb.language)
        tab_settings = system.get_tab_settings()
        tab_settings.click()
        servers_section = tab_settings.get_servers_section()
        servers_section.click()
        servers_section.get_default_server_page().wait_until_visible_common_elements()
        server_page = servers_section.get_server_page(server.get_server_name())
        server_page.click()
        server_page.wait_until_visible_common_elements()
        server_page.wait_until_visible_owner_elements()


if __name__ == '__main__':
    suite_name = Path(__file__).stem
    if 'test_' == suite_name[:5]:
        suite_name = suite_name.replace('test_', '', 1)
    variables = RobotVariables("en_US")
    with Suite() as suite:
        cloud_owner = suite.create_cloud_account()
        cloud_server = suite.create_cloud_server(cloud_owner, f"{suite_name}")
        test_verify_server_buttons(cloud_server, variables)
        print(f'{Fore.WHITE}{test_verify_server_buttons.__doc__.strip()}\t\t\t{Fore.GREEN}| PASS |')

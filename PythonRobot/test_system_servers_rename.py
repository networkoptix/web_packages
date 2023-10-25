"""robot_tests/test-cases/system-servers.robot"""
from pathlib import Path

from colorama import Fore

from NoptixLibrary.suite import Mediaserver
from NoptixLibrary.suite import Suite
from RobotVariables import RobotVariables
from resource_import import cloud_login
from resource_import import get_chrome
from pages.system_admin import SystemAdmin


def test_server_name_can_be_changed(server: Mediaserver, rb: RobotVariables):
    """
    1. Server name can be changed
    [Tags]    C71000    cloud    webadmin
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
        server_page.set_server_name('server 1 name changed')
        system.wait_for_unsaved_changes_messages()
        driver.refresh()
        servers_section.get_server_page('server 1 name changed')


def test_server_name_can_be_changed_via_api(server: Mediaserver, rb: RobotVariables):
    """
    1. Server name changed via API
    [Tags]    C71000    cloud    webadmin
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
        server.api.set_server_name('server 1 name changed')
        driver.refresh()
        servers_section.get_server_page('server 1 name changed')


if __name__ == '__main__':
    suite_name = Path(__file__).stem
    if 'test_' == suite_name[:5]:
        suite_name = suite_name.replace('test_', '', 1)
    variables = RobotVariables("en_US")
    with Suite() as suite:
        cloud_owner = suite.create_cloud_account()
        cloud_server = suite.create_cloud_server(cloud_owner, f"{suite_name}")
        test_server_name_can_be_changed(cloud_server, variables)
        print(f'{Fore.WHITE}{test_server_name_can_be_changed.__doc__.strip()}\t\t\t{Fore.GREEN}| PASS |')
        test_server_name_can_be_changed_via_api(cloud_server, variables)
        print(f'{Fore.WHITE}{test_server_name_can_be_changed_via_api.__doc__.strip()}\t\t\t{Fore.GREEN}| PASS |')

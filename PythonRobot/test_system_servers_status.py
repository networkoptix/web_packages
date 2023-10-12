from pathlib import Path

from colorama import Fore

from NoptixLibrary.cloud_portal_api import CloudPortalAPI
from NoptixLibrary.suite import Mediaserver
from NoptixLibrary.suite import Suite
from RobotVariables import RobotVariables
from header import HeaderNav
from login import LoginDialog
from resource_import import get_chrome
from system_admin import SystemAdmin


def test_check_status(server1: Mediaserver, server2: Mediaserver, rb: RobotVariables):
    """
    11. Check status
    [Tags]    C70957    cloud    webadmin
    """
    server_name = server2.get_server_name()
    server2.stop()
    with get_chrome() as driver:
        driver.get(rb.ENV)
        owner = server1.get_cloud_owner()
        HeaderNav(driver).log_in_button().click()
        LoginDialog(driver).basic_cloud_login(owner.email, owner.password)
        driver.get(rb.ENV + f"/systems/{server1.id}")
        system_admin_page = SystemAdmin(driver, rb.language)
        tab_settings = system_admin_page.get_tab_settings()
        tab_settings.click()
        servers_section = tab_settings.get_servers_section()
        servers_section.click()
        server_page = servers_section.get_server_page(server_name)
        server_page.click()
        server_page.wait_until_offline_status(30)
        server_page.get_check_status_button().click()
        server_page.wait_until_checking_banner()
        server_page.wait_until_checking_banner_is_not_visible()
        server_page.wait_until_offline_status()
        server2.start(True)
        server_page.get_check_status_button().click()
        server_page.wait_until_checking_banner()
        server_page.wait_until_checking_banner_is_not_visible()
        server_page.get_check_status_button().wait_until_not_visible(10)
        restart_button = server_page.get_restart_button()
        assert restart_button.is_enabled()
        server_page.wait_until_offline_status_not_visible()


def test_detailed_info_with_1_server(server1: Mediaserver, server2: Mediaserver, rb: RobotVariables):
    """
    12. Detailed info 1 server
    [Tags]    C70957    cloud    webadmin
    """
    server2.stop()
    with (get_chrome() as driver):
        driver.get(rb.ENV)
        owner = server1.get_cloud_owner()
        HeaderNav(driver).log_in_button().click()
        LoginDialog(driver).basic_cloud_login(owner.email, owner.password)
        driver.get(rb.ENV + f"/systems/{server1.id}")
        system_admin_page = SystemAdmin(driver, rb.language)
        tab_settings = system_admin_page.get_tab_settings()
        tab_settings.click()
        servers_section = tab_settings.get_servers_section()
        servers_section.click()
        driver.refresh()
        server_page = servers_section.get_default_server_page()
        server_page.click()
        server_page.get_detailed_info_button().click()
        tab_info = system_admin_page.get_information_tab()
        tab_info.check_links()
    server2.start(True)


if __name__ == '__main__':
    suite_name = Path(__file__).stem
    if 'test_' == suite_name[:5]:
        suite_name = suite_name.replace('test_', '', 1)
    variables = RobotVariables("en_US")
    cloud_api = CloudPortalAPI()
    with Suite() as suite:
        cloud_owner = suite.create_cloud_account()
        server1 = suite.create_cloud_server(cloud_owner, f"{suite_name}")
        server2 = suite.create_cloud_server(cloud_owner, f"{suite_name}")
        server1.cloud_merge(server2)
        test_check_status(server1, server2, variables)
        print(f'{Fore.WHITE}{test_check_status.__doc__.strip()}\t\t\t{Fore.GREEN}| PASS |')
        test_detailed_info_with_1_server(server1, server2, variables)
        print(f'{Fore.WHITE}{test_detailed_info_with_1_server.__doc__.strip()}\t\t\t{Fore.GREEN}| PASS |')

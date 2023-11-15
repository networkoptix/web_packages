import logging
import time
from pathlib import Path

from colorama import Fore

from NoptixLibrary.cloud_portal_api import CloudPortalAPI
from NoptixLibrary.suite import Mediaserver
from NoptixLibrary.suite import Suite
from RobotVariables import RobotVariables
from pages.header import HeaderNav
from pages.login import LoginDialog
from browsers.chrome import get_chrome
from pages.system_admin import SystemAdmin


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
        driver.refresh()
        server_page = servers_section.get_default_server_page()
        server_page.click()
        server_page.get_detailed_info_button().click()
        tab_info = system_admin_page.get_information_tab()
        tab_info.check_links()
    server2.start(True)


def test_detailed_info_with_2_servers(server: Mediaserver, rb: RobotVariables):
    """
    13. Detailed info 2 servers
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
        server_page.click()
        server_page.get_detailed_info_button().click()
        tab_info = system_admin_page.get_information_tab()
        tab_info.get_servers_section().wait_until_visible()


def test_offline_system_1_server(server1: Mediaserver, server2: Mediaserver, rb: RobotVariables):
    """
    14. Offline system 1 server settings
    [Tags]    C70950    cloud
    """
    with get_chrome() as driver:
        driver.get(rb.ENV)
        owner = server1.get_cloud_owner()
        HeaderNav(driver).log_in_button().click()
        LoginDialog(driver).basic_cloud_login(owner.email, owner.password)
        driver.get(rb.ENV + f"/systems/{server1.id}")
        system_admin_page = SystemAdmin(driver, rb.language)
        tab_settings = system_admin_page.get_tab_settings()
        tab_settings.click()
        server1.stop()
        server2.stop()
        time.sleep(10)  # Waiting for the server status to update on the portal
        servers_section = tab_settings.get_servers_section()
        servers_section.click()
        server_page = servers_section.get_default_server_page()
        server_page.click()
        server_page.ensure_server_is_offline()
    server1.start(True)
    server2.start(True)


def test_online_2_servers(server: Mediaserver, rb: RobotVariables):
    """
    15. Online two servers
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
        server_page = servers_section.get_server_page(server.get_server_name())
        server_page.click()
        server_page.wait_until_visible_common_elements()


def test_1_online_1_offline(server1: Mediaserver, server2: Mediaserver, rb: RobotVariables):
    """
    16. Server1 is online, Server2 is offline
    [Tags]    C70955    cloud   webadmin
    """
    server2_name = server2.get_server_name()
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
        time.sleep(20)  # Waiting for the server status to update on the portal
        servers_section = tab_settings.get_servers_section()
        servers_section.click()
        server_page = servers_section.get_server_page(server1.get_server_name())
        server_page.click()
        server_page.wait_until_visible_common_elements()
        server_page = servers_section.get_server_page(server2_name)
        server_page.click()
        server_page.wait_until_offline_status()
        assert server_page.get_check_status_button().is_visible()
        assert not server_page.get_restart_button().is_enabled()
        assert server_page.get_detailed_info_button().is_visible()
        assert not server_page.get_port_field().is_enabled()
    server2.start(True)


if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)
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
        test_detailed_info_with_2_servers(server2, variables)
        print(f'{Fore.WHITE}{test_detailed_info_with_2_servers.__doc__.strip()}\t\t\t{Fore.GREEN}| PASS |')
        test_offline_system_1_server(server1, server2, variables)
        print(f'{Fore.WHITE}{test_offline_system_1_server.__doc__.strip()}\t\t\t{Fore.GREEN}| PASS |')
        test_online_2_servers(server1, variables)
        print(f'{Fore.WHITE}{test_online_2_servers.__doc__.strip()}\t\t\t{Fore.GREEN}| PASS |')
        test_1_online_1_offline(server1, server2, variables)
        print(f'{Fore.WHITE}{test_1_online_1_offline.__doc__.strip()}\t\t\t{Fore.GREEN}| PASS |')

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


def test_restart_close_cancel_button(server: Mediaserver, rb: RobotVariables):
    """
    3-4. Restart close/cancel button works
    [Tags]    C70968    cloud    webadmin
    """
    with get_chrome() as driver:
        driver.get(rb.ENV)
        HeaderNav(driver).log_in_button().click()
        owner = server.get_cloud_owner()
        LoginDialog(driver).basic_cloud_login(owner.email, owner.password)
        driver.get(rb.ENV + f"/systems/{server.id}")
        system = SystemAdmin(driver, rb.language)
        tab_settings = system.get_tab_settings()
        tab_settings.click()
        time.sleep(5)   # TODO: Remove after fix. See: https://networkoptix.atlassian.net/browse/CLOUD-11509
        driver.refresh()  #
        servers_section = tab_settings.get_servers_section()
        servers_section.click()
        server_page = servers_section.get_server_page(server.get_server_name())
        server_page.click()
        server_page.wait_until_visible_common_elements()
        server_page.wait_until_visible_owner_elements()
        restart_dialog = server_page.open_restart_dialog()
        restart_dialog.wait_until_visible()
        restart_dialog.get_button_close().click()
        restart_dialog.wait_until_not_visible()
        restart_dialog = server_page.open_restart_dialog()
        restart_dialog.wait_until_visible()
        restart_dialog.get_button_cancel().click()
        restart_dialog.wait_until_not_visible()


def test_restart(server: Mediaserver, rb: RobotVariables, cloud_account: CloudAccount):
    """
    5-6. Restart server as owner/admin
    [Tags]    C70968    webadmin    # cloud
    """
    with get_chrome() as driver:
        driver.get(rb.ENV)
        HeaderNav(driver).log_in_button().click()
        LoginDialog(driver).basic_cloud_login(cloud_account.email, cloud_account.password)
        driver.get(rb.ENV + f"/systems/{server.id}")
        system = SystemAdmin(driver, rb.language)
        tab_settings = system.get_tab_settings()
        tab_settings.click()
        time.sleep(5)   # TODO: Remove after fix. See: https://networkoptix.atlassian.net/browse/CLOUD-11509
        driver.refresh()  #
        servers_section = tab_settings.get_servers_section()
        servers_section.click()
        server_page = servers_section.get_server_page(server.get_server_name())
        server_page.click()
        server_page.wait_until_visible_common_elements()
        server_page.wait_until_visible_owner_elements()
        restart_dialog = server_page.open_restart_dialog()
        restart_dialog.wait_until_visible()
        button_restart = restart_dialog.get_button_restart()
        button_restart.click()
        restart_dialog.wait_until_not_visible()
        server_page.wait_until_restarting_banner()
        server_page.wait_until_restarting_alert_visible()


if __name__ == '__main__':
    suite_name = Path(__file__).stem
    if 'test_' == suite_name[:5]:
        suite_name = suite_name.replace('test_', '', 1)
    variables = RobotVariables("en_US")
    with Suite() as suite:
        cloud_owner = suite.create_cloud_account()
        cloud_admin = suite.create_cloud_account()
        cloud_server = suite.create_cloud_server(cloud_owner, f"{suite_name}", {'cloudAdmin': cloud_admin})
        test_restart_close_cancel_button(cloud_server, variables)
        print(f'{Fore.WHITE}{test_restart_close_cancel_button.__doc__.strip()}\t\t\t{Fore.GREEN}| PASS |')
        test_restart(cloud_server, variables, cloud_owner)
        print(f'{Fore.WHITE}{test_restart.__doc__.strip()} Owner \t\t\t{Fore.GREEN}| PASS |')
        test_restart(cloud_server, variables, cloud_admin)
        print(f'{Fore.WHITE}{test_restart.__doc__.strip()} Administrator \t\t\t{Fore.GREEN}| PASS |')

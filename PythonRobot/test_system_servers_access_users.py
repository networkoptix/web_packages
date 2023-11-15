import logging
from pathlib import Path

from colorama import Fore

from NoptixLibrary.suite import CloudAccount
from NoptixLibrary.suite import Mediaserver
from NoptixLibrary.suite import Suite
from RobotVariables import RobotVariables
from generic_elements import ElementNotVisible
from pages.header import HeaderNav
from pages.login import LoginDialog
from browsers.chrome import get_chrome
from pages.system_admin import SystemAdmin


def test_access_owner(server: Mediaserver, rb: RobotVariables):
    """
    17. Owner/admin has access
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


def test_access_administrator(server: Mediaserver, rb: RobotVariables):
    """
    18. Administrator has access
    [Tags]    C70957    cloud    webadmin
    """
    with get_chrome() as driver:
        driver.get(rb.ENV)
        user = server.get_cloud_admin()
        HeaderNav(driver).log_in_button().click()
        LoginDialog(driver).basic_cloud_login(user.email, user.password)
        driver.get(rb.ENV + f"/systems/{server.id}")
        system_admin_page = SystemAdmin(driver, rb.language)
        tab_settings = system_admin_page.get_tab_settings()
        tab_settings.click()
        servers_section = tab_settings.get_servers_section()
        servers_section.click()
        server_page = servers_section.get_default_server_page()
        server_page.wait_until_visible_common_elements()
        assert not server_page.get_port_field().is_enabled()


def test_access_user(server: Mediaserver, user: CloudAccount, rb: RobotVariables):
    """
    19-22. Users don't have access
    [Tags]    C69853    cloud    webadmin
    """
    with get_chrome() as driver:
        driver.get(rb.ENV)
        HeaderNav(driver).log_in_button().click()
        LoginDialog(driver).basic_cloud_login(user.email, user.password)
        driver.get(rb.ENV + f"/systems/{server.id}")
        system_admin_page = SystemAdmin(driver, rb.language)
        try:
            system_admin_page.get_tab_settings()
        except ElementNotVisible:
            pass
        else:
            raise RuntimeError(f'User {user.email} should not have access to this tab')


if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)
    suite_name = Path(__file__).stem
    if 'test_' == suite_name[:5]:
        suite_name = suite_name.replace('test_', '', 1)
    variables = RobotVariables("en_US")
    with Suite() as suite:
        cloud_owner = suite.create_cloud_account()
        users = suite.create_cloud_accounts()
        server = suite.create_cloud_server(cloud_owner, f"{suite_name}", users)
        test_access_owner(server, variables)
        print(f'{Fore.WHITE}{test_access_owner.__doc__.strip()}\t\t\t{Fore.GREEN}| PASS |')
        test_access_administrator(server, variables)
        print(f'{Fore.WHITE}{test_access_administrator.__doc__.strip()}\t\t\t{Fore.GREEN}| PASS |')
        test_access_user(server, users['viewer'], variables)
        print(f'{Fore.WHITE}{test_access_user.__doc__.strip()} \t\t{Fore.CYAN}viewer \t{Fore.GREEN}| PASS |')
        test_access_user(server, users['liveViewer'], variables)
        print(f'{Fore.WHITE}{test_access_user.__doc__.strip()} \t\t{Fore.CYAN}liveViewer \t{Fore.GREEN}| PASS |')
        test_access_user(server, users['advancedViewer'], variables)
        print(f'{Fore.WHITE}{test_access_user.__doc__.strip()} \t\t{Fore.CYAN}advancedViewer \t{Fore.GREEN}| PASS |')
        test_access_user(server, users['custom'], variables)
        print(f'{Fore.WHITE}{test_access_user.__doc__.strip()} \t\t{Fore.CYAN}custom user \t{Fore.GREEN}| PASS |')

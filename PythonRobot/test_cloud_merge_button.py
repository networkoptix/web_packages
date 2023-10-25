import logging
from pathlib import Path

from colorama import Fore

from NoptixLibrary.suite import CloudAccount
from NoptixLibrary.suite import Mediaserver
from NoptixLibrary.suite import Suite
from RobotVariables import RobotVariables
from pages.header import HeaderNav
from pages.login import LoginDialog
from resource_import import get_chrome
from pages.system_admin import SystemAdmin


def test_merge_button_available_for_owner(server: Mediaserver, rb: RobotVariables):
    """
    1a. Merge button availability for owner
    [Tags]    C70976    C70977    should
    """
    with get_chrome() as driver:
        driver.get(rb.ENV)
        owner = server.get_cloud_owner()
        HeaderNav(driver).log_in_button().click()
        LoginDialog(driver).basic_cloud_login(owner.email, owner.password)
        driver.get(rb.ENV + f"/systems/{server.id}")
        system_admin_page = SystemAdmin(driver, rb.language)
        system_admin_page.merge_with_another_system_button().wait_until_visible()


def test_merge_button_unavailable_for_user(server: Mediaserver, user: CloudAccount, rb: RobotVariables):
    """
    1b. Merge button availability for user
    [Tags]    C70976
    """
    with get_chrome() as driver:
        driver.get(rb.ENV)
        HeaderNav(driver).log_in_button().click()
        LoginDialog(driver).basic_cloud_login(user.email, user.password)
        driver.get(rb.ENV + f"/systems/{server.id}")
        system_admin_page = SystemAdmin(driver, rb.language)
        system_admin_page.merge_with_another_system_button().wait_until_not_visible()


def test_merge_button_unavailable_when_offline(server: Mediaserver, rb: RobotVariables):
    """
    1c. Merge button unavailable when system is offline
    [Tags]    C70977
    """
    with get_chrome() as driver:
        driver.get(rb.ENV)
        owner = server.get_cloud_owner()
        HeaderNav(driver).log_in_button().click()
        LoginDialog(driver).basic_cloud_login(owner.email, owner.password)
        driver.get(rb.ENV + f"/systems/{server.id}")
        server.stop()
        system_admin_page = SystemAdmin(driver, rb.language)
        system_admin_page.merge_with_another_system_button().wait_until_not_clickable(30)
    server.start()


if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)
    suite_name = Path(__file__).stem
    if 'test_' == suite_name[:5]:
        suite_name = suite_name.replace('test_', '', 1)
    variables = RobotVariables("en_US")
    with Suite() as suite:
        cloud_owner = suite.create_cloud_account()
        users = suite.create_cloud_accounts()
        server = suite.create_cloud_server(cloud_owner, f"{suite_name}", cloud_users=users)
        test_merge_button_available_for_owner(server, variables)
        print(f'{Fore.WHITE}{test_merge_button_available_for_owner.__doc__.strip()}\t\t\t{Fore.GREEN}| PASS |')
        test_merge_button_unavailable_for_user(server, users['cloudAdmin'], variables)
        print(f'{Fore.WHITE}{test_merge_button_unavailable_for_user.__doc__.strip()}\t{Fore.CYAN}admin\t\t{Fore.GREEN}| PASS |')
        test_merge_button_unavailable_for_user(server, users['viewer'], variables)
        print(f'{Fore.WHITE}{test_merge_button_unavailable_for_user.__doc__.strip()}\t{Fore.CYAN}viewer\t\t{Fore.GREEN}| PASS |')
        test_merge_button_unavailable_for_user(server, users['liveViewer'], variables)
        print(f'{Fore.WHITE}{test_merge_button_unavailable_for_user.__doc__.strip()}\t{Fore.CYAN}live viewer\t\t{Fore.GREEN}| PASS |')
        test_merge_button_unavailable_for_user(server, users['advancedViewer'], variables)
        print(f'{Fore.WHITE}{test_merge_button_unavailable_for_user.__doc__.strip()}\t{Fore.CYAN}advanced viewer\t\t{Fore.GREEN}| PASS |')
        test_merge_button_unavailable_for_user(server, users['custom'], variables)
        print(f'{Fore.WHITE}{test_merge_button_unavailable_for_user.__doc__.strip()}\t{Fore.CYAN}custom user\t\t{Fore.GREEN}| PASS |')
        test_merge_button_unavailable_when_offline(server, variables)
        print(f'{Fore.WHITE}{test_merge_button_unavailable_when_offline.__doc__.strip()}\t\t\t{Fore.GREEN}| PASS |')

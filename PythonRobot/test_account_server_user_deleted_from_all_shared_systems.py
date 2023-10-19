from pathlib import Path

from colorama import Fore

from NoptixLibrary.suite import CloudAccount
from NoptixLibrary.suite import Mediaserver
from NoptixLibrary.suite import Suite
from pages.account_page import AccountPage
from pages.header import HeaderNav
from pages.landing_page import LandingPage
from pages.login import LoginDialog
from pages.system_left_menu import SystemLeftMenu
from pages.systems_page import SystemsPage
from resource_import import get_chrome
from variables import ENV


def user_deleted_from_all_shared_systems(
        cloud_account: CloudAccount,
        base_url: str,
        *servers: Mediaserver,
        ):
    """
    2. After account deletion user is deleted from all systems that were shared with this user
    [Tags] C69862 delete_account
    """
    [server_1, server_2, server_3] = servers
    with get_chrome() as driver:
        driver.get(base_url)
        HeaderNav(driver).log_in_button().click()
        LoginDialog(driver).basic_cloud_login(cloud_account.email, cloud_account.password)
        SystemsPage(driver).wait_until_visible()
        driver.get(base_url + '/account')
        account_page = AccountPage(driver)
        account_page.wait_until_loaded()
        dialog = account_page.delete_account_dialog()
        dialog.wait_until_loaded()
        dialog.delete_account(cloud_account.password)
        LandingPage(driver).wait_until_loaded()
        driver.get(base_url)
        HeaderNav(driver).log_in_button().click()
        owner = cloud_server_1.get_cloud_owner()
        LoginDialog(driver).basic_cloud_login(owner.email, owner.password)
        SystemsPage(driver).wait_until_visible()
        driver.get(base_url + f'/systems/{server_1.id}')
        left_menu = SystemLeftMenu(driver)
        left_menu.open_users_dropdown()
        assert not left_menu.has_user_with_email(cloud_account.email)
        driver.get(base_url + f'/systems/{server_2.id}')
        left_menu = SystemLeftMenu(driver)
        left_menu.open_users_dropdown()
        assert not left_menu.has_user_with_email(cloud_account.email)
        driver.get(base_url + f'/systems/{server_3.id}')
        left_menu = SystemLeftMenu(driver)
        left_menu.open_users_dropdown()
        assert not left_menu.has_user_with_email(cloud_account.email)


if __name__ == '__main__':
    suite_name = Path(__file__).stem
    with Suite() as suite:
        cloud_owner = suite.create_cloud_account()
        user = suite.create_cloud_account()
        cloud_server_1 = suite.create_cloud_server(
            cloud_owner=cloud_owner, suite_name=suite_name, cloud_users={'cloudAdmin': user})
        cloud_server_2 = suite.create_cloud_server(
            cloud_owner=cloud_owner, suite_name=suite_name, cloud_users={'viewer': user})
        cloud_server_3 = suite.create_cloud_server(
            cloud_owner=cloud_owner, suite_name=suite_name, cloud_users={'custom': user})
        user_deleted_from_all_shared_systems(
            user, ENV, cloud_server_1, cloud_server_2, cloud_server_3)
        print(
            f"{Fore.WHITE}{user_deleted_from_all_shared_systems.__doc__.strip()}\t\t\t"
            f"{Fore.GREEN}| PASS |")

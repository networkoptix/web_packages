from contextlib import ExitStack
from pathlib import Path

from colorama import Fore

from NoptixLibrary.suite import CloudAccount
from NoptixLibrary.suite import Mediaserver
from NoptixLibrary.suite import Suite
from email_access import get_random_email
from pages.account_page import AccountPage
from pages.account_page import SuccessToast
from pages.header import HeaderNav
from pages.landing_page import LandingPage
from pages.login import LoginDialog
from pages.system_admin import SystemAdmin
from pages.system_users import SystemUsers
from pages.systems_page import SystemsPage
from resource_import import get_chrome
from variables import ENV


def name_change_shown_in_system(
        base_url: str,
        server: Mediaserver,
        ):
    """
    4. Change first and last name shows in system
    [Tags] C41573 C30655 CLOUD-10176
    """
    # TODO: C30655 was copied from robot test but it involves Desktop Client and seems unrelated
    owner = server.get_cloud_owner()
    with get_chrome() as driver:
        driver.get(base_url)
        HeaderNav(driver).log_in_button().click()
        LoginDialog(driver).basic_cloud_login(owner.email, owner.password)
        SystemsPage(driver).wait_until_visible()
        driver.get(base_url + '/account')
        account_page = AccountPage(driver)
        account_page.wait_until_loaded()
        assert account_page.first_name().get_text() == owner.first_name
        assert account_page.last_name().get_text() == owner.last_name
        account_page.first_name().delete_all_text()
        account_page.save_button().wait_until_not_clickable(1)
        account_page.cancel_button().wait_until_clickable(1)
        account_page.last_name().click()  # Move focus from first_name
        assert account_page.first_name().get_outline_color() == 'rgb(240, 44, 44)'  # Red
        account_page.first_name().input_text("    ")
        account_page.save_button().wait_until_not_clickable(1)
        account_page.cancel_button().wait_until_clickable(1)
        new_first_name = "NewFirstName"
        account_page.first_name().input_text(new_first_name)
        account_page.last_name().delete_all_text()
        account_page.save_button().wait_until_not_clickable(1)
        account_page.cancel_button().wait_until_clickable(1)
        account_page.first_name().click()  # Move focus from last_name
        assert account_page.last_name().get_outline_color() == 'rgb(240, 44, 44)'
        account_page.last_name().input_text("    ")
        account_page.save_button().wait_until_not_clickable(1)
        account_page.cancel_button().wait_until_clickable(1)
        new_last_name = "NewLastName"
        account_page.last_name().input_text(new_last_name)
        account_page.save_button().wait_until_clickable()
        account_page.save_button().click()
        assert account_page.first_name().get_text() == new_first_name
        assert account_page.last_name().get_text() == new_last_name
        success_toast = SuccessToast(driver)
        success_toast.wait_until_visible()
        # TODO: Only works for English localization
        assert success_toast.get_text() == "Your account is successfully saved"
        driver.get(base_url + f'/systems/{server.id}')
        left_menu = SystemAdmin(driver).get_left_menu()
        left_menu.open_users_dropdown()
        owner_menu_option = left_menu.get_user_with_email(owner.email)
        owner_menu_option.click()
        system_user = SystemUsers(driver)
        assert system_user.user_header_text().get_text() == owner.email
        assert system_user.user_name_text().get_text() == f"{new_first_name} {new_last_name}"


def owner_can_not_delete_themselves(
        base_url: str,
        server: Mediaserver,
        ):
    """
    5. User who owns a system cannot remove themselves
    [Tags] C69855 delete_account
    """
    owner = server.get_cloud_owner()
    with get_chrome() as driver:
        driver.get(base_url)
        HeaderNav(driver).log_in_button().click()
        LoginDialog(driver).basic_cloud_login(owner.email, owner.password)
        SystemsPage(driver).wait_until_visible()
        driver.get(base_url + '/account')
        account_page = AccountPage(driver)
        account_page.wait_until_loaded()
        delete_button = account_page.delete_account_button()
        delete_button.wait_until_not_clickable()
        account_page.get_can_not_delete_account_tooltip().wait_until_visible()


def delete_account_button_is_enabled(
        base_url: str,
        user_with_shared_systems: CloudAccount,
        ):
    """
    6. Delete account button is enabled
    [Tags] C69854 delete account
    """
    with ExitStack() as stack:
        user_without_shared_systems = stack.enter_context(CloudAccount(get_random_email()))
        user_without_shared_systems.activate()
        driver = stack.enter_context(get_chrome())
        driver.get(base_url)
        nav = HeaderNav(driver)
        nav.log_in_button().click()
        LoginDialog(driver).basic_cloud_login(
            user_without_shared_systems.email, user_without_shared_systems.password)
        SystemsPage(driver).wait_until_visible()
        driver.get(base_url + '/account')
        account_page = AccountPage(driver)
        account_page.wait_until_loaded()
        account_page.delete_account_button().wait_until_clickable()
        nav.log_out()
        driver.get(base_url)
        nav.log_in_button().click()
        LoginDialog(driver).basic_cloud_login(
            user_with_shared_systems.email, user_with_shared_systems.password)
        SystemsPage(driver).wait_until_visible()
        driver.get(base_url + '/account')
        account_page = AccountPage(driver)
        account_page.wait_until_loaded()
        account_page.delete_account_button().wait_until_clickable()


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
        left_menu = SystemAdmin(driver).get_left_menu()
        left_menu.open_users_dropdown()
        assert not left_menu.has_user_with_email(cloud_account.email)
        driver.get(base_url + f'/systems/{server_2.id}')
        left_menu = SystemAdmin(driver).get_left_menu()
        left_menu.open_users_dropdown()
        assert not left_menu.has_user_with_email(cloud_account.email)
        driver.get(base_url + f'/systems/{server_3.id}')
        left_menu = SystemAdmin(driver).get_left_menu()
        left_menu.open_users_dropdown()
        assert not left_menu.has_user_with_email(cloud_account.email)


if __name__ == '__main__':
    suite_name = Path(__file__).stem
    with Suite() as suite:
        cloud_owner = suite.create_cloud_account()
        user = suite.create_cloud_account()
        cloud_server_1 = suite.create_cloud_server(
            cloud_owner=cloud_owner, suite_name=suite_name, cloud_users={'cloudAdmin': user})
        name_change_shown_in_system(ENV, cloud_server_1)
        print(
            f"{Fore.WHITE}{name_change_shown_in_system.__doc__.strip()}\t\t\t"
            f"{Fore.GREEN}| PASS |")
        owner_can_not_delete_themselves(ENV, cloud_server_1)
        print(
            f"{Fore.WHITE}{owner_can_not_delete_themselves.__doc__.strip()}\t\t\t"
            f"{Fore.GREEN}| PASS |")
        cloud_server_2 = suite.create_cloud_server(
            cloud_owner=cloud_owner, suite_name=suite_name, cloud_users={'viewer': user})
        delete_account_button_is_enabled(ENV, user)
        print(
            f"{Fore.WHITE}{delete_account_button_is_enabled.__doc__.strip()}\t\t\t"
            f"{Fore.GREEN}| PASS |")
        cloud_server_3 = suite.create_cloud_server(
            cloud_owner=cloud_owner, suite_name=suite_name, cloud_users={'custom': user})
        user_deleted_from_all_shared_systems(
            user, ENV, cloud_server_1, cloud_server_2, cloud_server_3)
        print(
            f"{Fore.WHITE}{user_deleted_from_all_shared_systems.__doc__.strip()}\t\t\t"
            f"{Fore.GREEN}| PASS |")

"""robot_tests/test-cases/account-server.robot"""
from pathlib import Path

from colorama import Fore

from NoptixLibrary.cloud_portal_api import CloudPortalAPI
from NoptixLibrary.suite import Mediaserver
from NoptixLibrary.suite import Suite
from pages.account_page import AccountPage
from resource_import import cloud_login
from resource_import import get_chrome
from variables import ENV


def delete_account_button_becomes_enabled(
        base_url: str,
        server_1: Mediaserver,
        server_2: Mediaserver,
        ):
    """
    1. Delete account button becomes enabled
    [Tags] C69856 delete_account
    """
    with get_chrome() as driver:
        cloud_owner = server_1.get_cloud_owner()
        driver.get(base_url)
        cloud_login(driver, cloud_owner.email, cloud_owner.password)
        driver.get(base_url + '/account')
        account_page = AccountPage(driver)
        account_page.wait_until_loaded()
        delete_account_button = account_page.delete_account_button()
        delete_account_button.wait_until_not_clickable()
        can_not_delete_account_tooltip = account_page.get_can_not_delete_account_tooltip()
        can_not_delete_account_tooltip.wait_until_visible()
        actual_tooltip_text = can_not_delete_account_tooltip.text()
        cloud_api = CloudPortalAPI(
            env=base_url,
            password=cloud_owner.password,
            email=cloud_owner.email,
            )
        expected_tooltip_text = (
            f"Disconnect all the systems you are the owner of from the "
            f"{cloud_api.get_cloud_settings().get('cloudName')} portal and disable "
            f"two factor authentication to delete your account.")
        assert actual_tooltip_text == expected_tooltip_text, (
            f"Actual: {actual_tooltip_text}; Expected: {expected_tooltip_text}")
        server_2.disconnect_from_cloud()
        driver.refresh()
        can_not_delete_account_tooltip = account_page.get_can_not_delete_account_tooltip()
        can_not_delete_account_tooltip.wait_until_visible()
        actual_tooltip_text = can_not_delete_account_tooltip.text()
        assert actual_tooltip_text == expected_tooltip_text, (
            f"Actual: {actual_tooltip_text}; Expected: {expected_tooltip_text}")
        server_1.disconnect_from_cloud()
        driver.refresh()
        delete_account_button.wait_until_clickable(timeout=30)


if __name__ == '__main__':
    suite_name = Path(__file__).stem
    with Suite() as suite:
        cloud_owner = suite.create_cloud_account()
        cloud_server_1 = suite.create_cloud_server(cloud_owner=cloud_owner, suite_name=suite_name)
        cloud_server_2 = suite.create_cloud_server(cloud_owner=cloud_owner, suite_name=suite_name)
        delete_account_button_becomes_enabled(ENV, cloud_server_1, cloud_server_2)
        print(
            f"{Fore.WHITE}{delete_account_button_becomes_enabled.__doc__.strip()}\t\t\t"
            f"{Fore.GREEN}| PASS |")

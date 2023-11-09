from pathlib import Path

from NoptixLibrary.suite import Mediaserver
from NoptixLibrary.suite import Suite
from pages.login import LoginDialog
from pages.system_admin import SystemAdmin
from pages.system_left_menu import SystemLeftMenu
from resource_import import get_chrome
from variables import ENV


def page_is_opened_and_shows_the_user_list_to_owner(server: Mediaserver):
    """
    [Tags]    C41881    cloud
    """
    with get_chrome() as driver:
        owner = server.get_cloud_owner()
        url = ENV + f"/systems/{server.id}"
        driver.get(url)
        LoginDialog(driver).basic_cloud_login(owner.email, owner.password)
        # Falls down because of CLOUD-11715 and CLOUD-11629
        SystemAdmin(driver).system_offline_text().wait_until_visible(timeout=65)
        SystemLeftMenu(driver).wait_for_user_with_email(server.get_cloud_viewer().email)
        # TODO: Add check on CLOUD-6615 when blocking bugs are fixed and test is ready


if __name__ == "__main__":
    suite_name = Path(__file__).stem
    suite_name = suite_name.removeprefix("test_")
    with Suite() as suite:
        cloud_owner = suite.create_cloud_account()
        cloud_users = suite.create_cloud_accounts()
        cloud_server = suite.create_cloud_server(cloud_owner, suite_name, cloud_users)
        cloud_server.stop()
        page_is_opened_and_shows_the_user_list_to_owner(cloud_server)

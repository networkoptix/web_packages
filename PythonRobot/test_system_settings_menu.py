from pathlib import Path

from NoptixLibrary.suite import Mediaserver
from NoptixLibrary.suite import Suite
from RobotVariables import RobotVariables
from login import LoginDialog
from resource_import import get_chrome
from system_admin import SystemAdmin
from variables import ENV

password = "qweasd 123"


def should_login_as_viewer_and_should_have_no_ability_to_search_in_left_menu(server: Mediaserver):
    """
        1. Should login as "viewer" and should have no ability to "search" in left menu
        [Tags]    email    C41903    webadmin    cloud    smoke    ci    C30726
        """
    with get_chrome() as driver:
        url = ENV + f"/systems/{server.id}"
        driver.get(url)
        cloud_viewer = server.get_cloud_viewer()
        LoginDialog(driver).basic_cloud_login(cloud_viewer.email, cloud_viewer.password)
        left_menu = SystemAdmin(driver).get_left_menu()
        left_menu.get_search_field().wait_until_does_not_exist()
        print("Pass")


if __name__ == '__main__':
    suite_name = Path(__file__).stem
    if suite_name.startswith('test_'):
        suite_name = suite_name[len('test_'):]
    variables = RobotVariables("en_US")
    with Suite() as suite:
        cloud_owner = suite.create_cloud_account()
        cloud_users = suite.create_cloud_users(['viewer'])
        cloud_server = suite.create_cloud_server(cloud_owner, cloud_users=cloud_users)
        should_login_as_viewer_and_should_have_no_ability_to_search_in_left_menu(cloud_server)

from pathlib import Path

from NoptixLibrary.suite import Mediaserver
from NoptixLibrary.suite import Suite
from RobotVariables import RobotVariables
from login import LoginDialog
from resource_import import get_chrome
from system_admin import SystemAdmin
from system_left_menu import SystemLeftMenu
from system_users import SystemUsers
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


def selected_node_has_different_color(server: Mediaserver):
    with get_chrome() as driver:
        owner = server.get_cloud_owner()
        url = ENV + f"/systems/{server.id}"
        driver.get(url)
        LoginDialog(driver).basic_cloud_login(owner.email, owner.password)
        SystemAdmin(driver)
        left_menu = SystemLeftMenu(driver)
        users_node = left_menu.get_node_by_name_within_timeout("Users")
        assert users_node.value_of_css_property('background-color') == variables.COLOR_TRANSPARENT_RGB
        users_node.click()
        assert users_node.value_of_css_property('background-color') == variables.COLOR_LIGHT5_RGB
        print("Pass")


def users_are_seen_when_main_node_is_selected(server: Mediaserver):
    with get_chrome() as driver:
        owner = server.get_cloud_owner()
        url = ENV + f"/systems/{server.id}"
        driver.get(url)
        LoginDialog(driver).basic_cloud_login(owner.email, owner.password)
        SystemAdmin(driver)
        left_menu = SystemLeftMenu(driver)
        left_menu.get_node_by_name_within_timeout("Users").click()
        left_menu = SystemLeftMenu(driver)
        assert left_menu.get_node_by_name_within_timeout(owner.email)
        assert left_menu.get_node_by_name_within_timeout(server.get_cloud_viewer().email)
        print("Pass")


def check_search_input(server: Mediaserver):
    """
    [Tags]    C81762    webadmin    search
    """
    with get_chrome() as driver:
        owner = server.get_cloud_owner()
        viewer = server.get_cloud_viewer()
        url = ENV + f"/systems/{server.id}"
        driver.get(url)
        LoginDialog(driver).basic_cloud_login(owner.email, owner.password)
        SystemAdmin(driver)
        left_menu = SystemLeftMenu(driver)
        search_field = left_menu.get_search_field()
        search_field.wait_until_visible()
        search_field.input_text('velociraptor')
        assert not left_menu.has_node_with_name('Users')
        assert not left_menu.has_node_with_name('System Administration')
        assert not left_menu.has_node_with_name('Licenses')
        assert not left_menu.has_node_with_name('Cameras')
        assert not left_menu.has_node_with_name('Servers')
        assert left_menu.has_nothing_found_text()
        search_field.input_text('noptix')
        assert left_menu.has_node_with_name('Users')
        assert left_menu.has_node_with_name(owner.email)
        assert left_menu.has_node_with_name(viewer.email)
        assert not left_menu.has_node_with_name('System Administration')
        assert not left_menu.has_node_with_name('Licenses')
        assert not left_menu.has_node_with_name('Cameras')
        assert not left_menu.has_node_with_name('Servers')
        left_menu.get_node_by_name_within_timeout(viewer.email).click()
        users_page = SystemUsers(driver)
        assert viewer.email == users_page.user_header_text().get_text()
        search_field.get_cross_button().click()
        assert search_field.get_text() == ''
        assert left_menu.has_node_with_name('Users')
        assert left_menu.has_node_with_name('System Administration')
        assert left_menu.has_node_with_name('Cameras')
        assert left_menu.has_node_with_name('Servers')
        print("Pass")


def should_perform_search_with_and_and_or_criteria(server: Mediaserver):
    with get_chrome() as driver:
        owner = server.get_cloud_owner()
        url = ENV + f"/systems/{server.id}"
        driver.get(url)
        LoginDialog(driver).basic_cloud_login(owner.email, owner.password)
        SystemAdmin(driver)
        left_menu = SystemLeftMenu(driver)
        search_field = left_menu.get_search_field()
        search_field.wait_until_visible()
        search_field.input_text('noptix @')
        assert left_menu.has_node_with_name('Users')
        assert left_menu.has_node_with_name(owner.email)
        assert not left_menu.has_node_with_name('System Administration')
        assert not left_menu.has_node_with_name('Licenses')
        assert not left_menu.has_node_with_name('Cameras')
        assert not left_menu.has_node_with_name('Servers')
        search_field.input_text('noptix velociraptor')
        assert left_menu.has_nothing_found_text()
        search_field.input_text(f'noptix | Server')
        assert left_menu.has_node_with_name('Users')
        assert left_menu.has_node_with_name(owner.email)
        assert left_menu.has_node_with_name('Servers')
        assert left_menu.has_node_with_name(server.get_server_name())
        assert not left_menu.has_node_with_name('System Administration')
        assert not left_menu.has_node_with_name('Licenses')
        assert not left_menu.has_node_with_name('Cameras')
        print("Pass")


if __name__ == '__main__':
    suite_name = Path(__file__).stem
    if suite_name.startswith('test_'):
        suite_name = suite_name[len('test_'):]
    variables = RobotVariables("en_US")
    with Suite() as suite:
        cloud_owner = suite.create_cloud_account()
        cloud_users = suite.create_cloud_accounts(['viewer'])
        cloud_server = suite.create_cloud_server(cloud_owner, cloud_users=cloud_users)
        should_login_as_viewer_and_should_have_no_ability_to_search_in_left_menu(cloud_server)
        selected_node_has_different_color(cloud_server)
        users_are_seen_when_main_node_is_selected(cloud_server)
        check_search_input(cloud_server)
        should_perform_search_with_and_and_or_criteria(cloud_server)

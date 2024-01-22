import logging

from pathlib import Path
from NoptixLibrary.suite import CloudAccount
from NoptixLibrary.suite import Mediaserver
from NoptixLibrary.suite import Suite
from RobotVariables import RobotVariables
from pages.login import LoginDialog
from browsers.chrome import get_chrome
from pages.system_admin import SystemAdmin
from pages.system_left_menu import SystemLeftMenu
from pages.system_users import SystemUsers
from variables import ENV

_logger = logging.getLogger(__name__)

rb = RobotVariables("en_US")
permissions = CloudAccount.PERMISSIONS
role_names = {
    "cloudAdmin": rb.ADMIN_TEXT,
    "viewer": rb.VIEWER_TEXT,
    "liveViewer": rb.LIVE_VIEWER_TEXT,
    "advancedViewer": rb.ADV_VIEWER_TEXT,
    "custom": rb.CUSTOM_TEXT,
    }

def cloud_owner_can_change_local_user_full_name(server: Mediaserver):
    """
    26. Cloud Owner Can Change Local User Full Name
    [Tags]    local_user    C76244    webadmin    cloud    debug
    """
    _reset_local_users(server)
    owner = server.get_cloud_owner()
    url = ENV + f"/systems/{server.id}"
    with get_chrome() as driver:
        driver.get(url)
        LoginDialog(driver).basic_cloud_login(owner.email, owner.password)
        system_admin = SystemAdmin(driver)
        system_left_menu = SystemLeftMenu(driver)
        # Stopped by bug https://networkoptix.atlassian.net/browse/CLOUD-11809


def local_user_deleted_on_server_gone_from_ui(server: Mediaserver):
    """32. Local User Removed on Server is Removed From UI"""
    _reset_local_users(server)
    owner = server.get_cloud_owner()
    sys_admin_url = ENV + f"/systems/{server.id}"
    deleted_user = server.get_local_users()['viewer']
    server.api.remove_user(deleted_user['id'])
    with get_chrome() as driver:
        try:
            driver.get(sys_admin_url)
            LoginDialog(driver).basic_cloud_login(owner.email, owner.password)
            SystemAdmin(driver)
            users_menu = SystemLeftMenu(driver).users_dropdown()
            assert not users_menu.has_user_in_menu_with_id(deleted_user['id'])
        except Exception:
            print("FAIL")
            driver.save_screenshot('error.png')
            raise
        else:
            print("PASS")


def local_user_deleted_in_ui_deleted_from_server(server: Mediaserver, cloud_admin: CloudAccount):
    """
    33. Verify Local Users Deleted On Server.

    41. Cloud Administrator Can Delete Local User(positive).
    [Tags]    local_user    C76242    C76524    webadmin    cloud
    """
    _reset_local_users(server)
    url = ENV + f"/systems/{server.id}"
    deleted_user = server.get_local_users()['viewer']
    with get_chrome() as driver:
        try:
            driver.get(url)
            LoginDialog(driver).basic_cloud_login(cloud_admin.email, cloud_admin.password)
            SystemAdmin(driver)
            users_menu = SystemLeftMenu(driver).users_dropdown()
            users_menu.get_user_link_by_id(deleted_user['id']).click()
            user_screen = SystemUsers(driver)
            user_screen.local_user_delete_button().click()
            user_screen.local_user_delete_confirm_button().click()
            driver.get(url)
            SystemAdmin(driver)
            for user in server.api.get_users():
                assert not user.id == deleted_user['id']
        except Exception:
            print("FAIL")
            driver.save_screenshot('error.png')
            raise
        else:
            print("PASS")


def new_local_user_appears_in_cloud_portal(server: Mediaserver):
    """
    34. Adding New Local User Appears on Cloud Portal
    [Tags]    C76237    local_user    webadmin    cloud
    """
    _reset_local_users(server)
    owner = server.get_cloud_owner()
    url = ENV + f"/systems/{server.id}"
    new_local_user = server.create_new_local_user("viewer")
    with get_chrome() as driver:
        try:
            driver.get(url)
            LoginDialog(driver).basic_cloud_login(owner.email, owner.password)
            SystemAdmin(driver)
            users_menu = SystemLeftMenu(driver).users_dropdown()
            users_menu.get_user_link_by_id(new_local_user['id']).click()
        except Exception:
            print("FAIL")
            driver.save_screenshot('error.png')
            raise
        else:
            print("PASS")


def owner_and_admin_see_local_users(server: Mediaserver, user: CloudAccount):
    """
    39. User list is available for owner and administrator
    [Tags]    C76233    local_user    webadmin    cloud
    """
    _reset_local_users(server)
    url = ENV + f"/systems/{server.id}"
    with get_chrome() as driver:
        try:
            driver.get(url)
            LoginDialog(driver).basic_cloud_login(user.email, user.password)
            SystemAdmin(driver)
            users_menu = SystemLeftMenu(driver).users_dropdown()
            for permission in permissions:
                assert users_menu.has_user_in_menu_with_id(
                    server.get_local_users()[permission]['id']), f"{user.email} is not able to see local {permission}"
        except Exception:
            print("FAIL")
            driver.save_screenshot('error.png')
            raise
    print("PASS")

def non_admins_cant_see_local_users(server: Mediaserver, user: CloudAccount):
    """
    40. User list is not available for advanced viewer & lower
    [Tags]    C76462    webadmin    cloud
    """
    _reset_local_users(server)
    url = ENV + f"/systems/{server.id}"
    with get_chrome() as driver:
        try:
            driver.get(url)
            LoginDialog(driver).basic_cloud_login(user.email, user.password)
            SystemAdmin(driver)
            assert not SystemLeftMenu(driver).users_dropdown().is_visible(), \
            f"{user.email} is able to see users"
        except Exception:
            print("FAIL")
            driver.save_screenshot('error.png')
            raise
    print("PASS")

def cloud_admins_can_disable_local_viewers(server: Mediaserver, admin_user: CloudAccount, local_viewer):
    """
    43. Cloud administrator can enable/disable any viewer local user (positive).

    [Tags]    C76527    local_user    webadmin    cloud
    """
    _reset_local_users(server)
    url = ENV + f"/systems/{server.id}"
    with get_chrome() as driver:
        try:
            driver.get(url)
            LoginDialog(driver).basic_cloud_login(admin_user.email, admin_user.password)
            SystemAdmin(driver)
            system_left_menu = SystemLeftMenu(driver)
            users_dropdown = system_left_menu.users_dropdown()
            users_dropdown.get_user_link_by_id(local_viewer['id']).click()
            system_user = SystemUsers(driver)
            system_user.user_switch().turn_off()
            system_user.save_button().click()
            system_user.no_unsaved_changes_text().wait_until_visible()
            assert system_user.user_disabled_message().get_text() == rb.USER_DISABLED_TEXT
            assert not server.api.get_user_by_id(local_viewer.id).is_enabled
            system_user.user_switch().turn_on()
            system_user.save_button().click()
            # Fails for vms 5.1 due to https://networkoptix.atlassian.net/browse/CLOUD-11901
            system_user.no_unsaved_changes_text().wait_until_visible()
            assert not system_user.user_disabled_message().is_visible()
            assert server.api.get_user_by_id(local_viewer.id).is_enabled
        except Exception:
            print("FAIL")
            driver.save_screenshot('error.png')
            raise
    print("PASS")


def _reset_local_users(server: Mediaserver, local_user='ocal+'):
    """
    In order to correspond with our naming conventions for user permissions, camel case is used in the user names
    of local users such as liveViewer. Originally when this test was written, and to this day, when cloud portal
    submits an edit to any of the user's info, the name is overwritten to be in all small caps. Thus, Local+liveViewer
    is saved as local+liveviewer even if you changed some other bit of info and did not touch the user name. That's
    why this method looks for the 'ocal+' string to identify local users. When the users are reset via api, they are
    saved again with camel case.
    """
    locals_list = []
    users = server.api.get_users()
    for user in users:
        local_state = True
        if user.get("isCloud"):
            local_state = False
        elif user.type == "cloud":
            local_state = False
        if local_state and local_user in user.name:
            locals_list.append(user)
            _logger.debug(f"{user.name} added to locals_list")
    if len(locals_list) == 5:
        _reset_local_users_api(locals_list, server)
    else:
        server.update_local_users(
            _create_new_local_users(len(locals_list), server, locals_list))



def _reset_local_users_api(locals, server):
    """
    Any local user that was modified on cloud portal would have had its username overwritten to be in small caps.
    During this reset, we save it again in CamelCase.
    """
    for user in locals:
        name = user['name'].replace("_changed", "")
        user_type = name[6:]
        if user_type == 'cloudadmin':
            user_type = 'cloudAdmin'
        elif user_type == 'liveviewer':
            user_type = 'liveViewer'
        elif user_type == 'advancedviewer':
            user_type = 'advancedViewer'
        server.api.modify_local_user(
            f"Local+{user_type}",
            permissions[user_type],
            f"noptixautoqa+local_{user_type}@gmail.com",
            "qweasd 123",
            user['id'],
            )


def _create_new_local_users(count, server: Mediaserver, locals_list):
    if count != 0:
        _delete_all_local_users_via_api(server, locals_list)
    return server.create_local_users()


def _delete_all_local_users_via_api(server, locals_list):
    for user in locals_list:
        server.api.remove_user(user['id'])


if __name__ == "__main__":
    suite_name = Path(__file__).stem
    suite_name = suite_name.removeprefix("test_")
    with Suite() as suite:
        cloud_owner = suite.create_cloud_account()
        cloud_users = suite.create_cloud_accounts()
        cloud_server = suite.create_cloud_server(cloud_owner, suite_name, cloud_users)
        local_user_deleted_on_server_gone_from_ui(cloud_server)
        local_user_deleted_in_ui_deleted_from_server(cloud_server, cloud_owner)
        # The below fails due to https://networkoptix.atlassian.net/browse/CLOUD-12165
        # local_user_deleted_in_ui_deleted_from_server(cloud_server, cloud_server.get_cloud_admin())
        new_local_user_appears_in_cloud_portal(cloud_server)
        owner_and_admin_see_local_users(cloud_server, cloud_server.get_cloud_owner())
        # The below fails due to https://networkoptix.atlassian.net/browse/CLOUD-12165
        # owner_and_admin_see_local_users(cloud_server, cloud_server.get_cloud_admin())
        non_admins_cant_see_local_users(cloud_server, cloud_server.get_cloud_viewer())
        non_admins_cant_see_local_users(cloud_server, cloud_server.get_cloud_live_viewer())
        non_admins_cant_see_local_users(cloud_server, cloud_server.get_cloud_advanced_viewer())
        non_admins_cant_see_local_users(cloud_server, cloud_server.get_cloud_custom_user())
        cloud_admins_can_disable_local_viewers(
            cloud_server,
            cloud_server.get_cloud_owner(),
            cloud_server.get_local_users()['advancedViewer']
        )
        cloud_admins_can_disable_local_viewers(
            cloud_server,
            cloud_server.get_cloud_owner(),
            cloud_server.get_local_users()['viewer']
        )
        cloud_admins_can_disable_local_viewers(
            cloud_server,
            cloud_server.get_cloud_owner(),
            cloud_server.get_local_users()['liveViewer']
        )

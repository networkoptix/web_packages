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
from variables import ENV

_logger = logging.getLogger(__name__)

password = "qweasd 123"
rb = RobotVariables("en_US")
permissions = CloudAccount.PERMISSIONS
role_names = {
    "cloudAdmin": rb.ADMIN_TEXT,
    "viewer": rb.VIEWER_TEXT,
    "liveViewer": rb.LIVE_VIEWER_TEXT,
    "advancedViewer": rb.ADV_VIEWER_TEXT,
    "custom": rb.CUSTOM_TEXT}

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
    deleted_user = "Local+viewer"
    deleted_user_id = server.api.get_user_id_by_name(deleted_user)
    server.api.remove_user(deleted_user_id)
    with get_chrome() as driver:
        try:
            driver.get(sys_admin_url)
            LoginDialog(driver).basic_cloud_login(owner.email, owner.password)
            SystemAdmin(driver)
            users_menu = SystemLeftMenu(driver).users_dropdown()
            users_menu.open()
            assert not users_menu.has_local_user_with_username(deleted_user)
        except Exception:
            print("FAIL")
            driver.save_screenshot('error.png')
            raise
        else:
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
    local_users = list(role_names.keys())
    users = server.api.get_users()
    for user in users:
        local_state = True
        if user.get("isCloud"):
            local_state = False
        elif user.get("type") == "cloud":
            local_state = False
        if local_state and local_user in user['name']:
            locals_list.append(user)
            _logger.debug(f"{user['name']} added to locals_list")
    if len(locals_list) == 5:
        _reset_local_users_api(locals_list, server)
    else:
        _create_new_local_users(len(locals_list), server, locals_list)
    return local_users


def _reset_local_users_api(locals, server):
    """
    Any local user that was modified on cloud portal would have had its username overwritten to be in small caps.
    During this reset, we save it again in CamelCase.
    """
    for user in locals:
        name = user['name'].replace("_changed", "")
        if 'cloudadmin' in name:
            user_type = 'cloudAdmin'
        elif 'liveviewer' in name:
            user_type = 'liveViewer'
        elif 'advancedviewer' in name:
            user_type = 'advancedViewer'
        else:
            raise RuntimeError(f"Unknown role for user with name {name}")
        server.api.save_user(
            f"Local+{user_type}",
            permissions[user_type],
            f"noptixautoqa+local_{user_type}@gmail.com",
            "Local User",
            password,
            user_id=user['id'],
            is_cloud=False,
            patch=True
        )


def _create_new_local_users(count, server: Mediaserver, locals_list):
    if count == 0:
        server.create_local_users()
    else:
        _delete_all_local_users_via_api(server, locals_list)
        server.create_local_users()


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

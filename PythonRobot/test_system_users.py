import time
from pathlib import Path
import robot_keywords
from NoptixLibrary.cloud_portal_api import CloudPortalAPI
from NoptixLibrary.suite import Mediaserver
from NoptixLibrary.suite import Suite
from RobotVariables import RobotVariables
from email_access import Email
from header import HeaderNav
from landing_page import LandingPage
from login import LoginDialog
from register_form import RegisterForm
from resource_import import get_chrome
from resource_import import register_and_activate_account
from resource_import import get_random_email
from system_admin import SystemAdmin
from system_left_menu import SystemLeftMenu
from system_users import SystemUsers
from systems_page import SystemsPage
from variables import ENV

password = "qweasd 123"

CLOUD_API = CloudPortalAPI()
rb = RobotVariables("en_US")
permissions = keywords.permissions
viewer_permissions = permissions['viewer']
admin_permissions = permissions['cloudAdmin']

def owner_can_remove_user(server: Mediaserver):
    """
    15. Delete user works
    [Tags]    email    C41903    webadmin    cloud    smoke    ci    C30726
    """
    with get_chrome() as driver:
        owner = server.get_cloud_owner()
        cloud_auth = (owner.email, owner.password)
        email = get_random_email()
        register_and_activate_account(driver, "Mark", "Hamill", email, password)
        CLOUD_API.share(cloud_auth, server.id, 'viewer', email, viewer_permissions)
        url = ENV + f"/systems/{server.id}"
        try:
            driver.get(url)
            LoginDialog(driver).basic_cloud_login(owner.email, owner.password)
            header = HeaderNav(driver)
            header.account_dropdown()
            SystemAdmin(driver)
            left_menu = SystemLeftMenu(driver)
            time.sleep(1)
            left_menu.users_button().click()
            left_menu.get_user_with_email(email).click()
            users_page = SystemUsers(driver)
            users_page.remove_user_button().click()
            users_page.remove_user_modal_button().click()
            time.sleep(1)
            header.log_out()
            LandingPage(driver)
            header.log_in_button().click()
            LoginDialog(driver).basic_cloud_login(email, password)
            header.account_dropdown()
            SystemsPage(driver).no_systems()
        except:
            driver.save_screenshot('error.png')
            raise RuntimeError("FAIL")
        else:
            print("pass owner")

def cloud_admin_can_remove_user(server: Mediaserver):
    """
    15. Delete user works
    [Tags]    email    C41903    webadmin    cloud    smoke    ci    C30726
    """
    with get_chrome() as driver:
        owner = server.get_cloud_owner()
        cloud_auth = (owner.email, owner.password)
        email = get_random_email()
        register_and_activate_account(driver, "Mark", "Hamill", email, password)
        CLOUD_API.share(cloud_auth, server.id, 'viewer', email, viewer_permissions)
        url = ENV + f"/systems/{server.id}"
        try:
            driver.get(url)
            cloud_admin = server.get_cloud_admin()
            LoginDialog(driver).basic_cloud_login(cloud_admin.email, cloud_admin.password)
            header = HeaderNav(driver)
            header.account_dropdown()
            SystemAdmin(driver)
            left_menu = SystemLeftMenu(driver)
            time.sleep(1)
            left_menu.users_button().click()
            left_menu.get_user_with_email(email).click()
            users_page = SystemUsers(driver)
            users_page.remove_user_button().click()
            users_page.remove_user_modal_button().click()
            time.sleep(1)
            header.log_out()
            LandingPage(driver)
            header.log_in_button().click()
            LoginDialog(driver).basic_cloud_login(email, password)
            header.account_dropdown()
            SystemsPage(driver).no_systems()
        except:
            driver.save_screenshot('error.png')
            raise RuntimeError("FAIL")
        else:
            print("pass admin")


def share_with_registered_user_sends_notification(server: Mediaserver):
    """email    C41888    cloud    smoke    ci    C30446"""
    with get_chrome() as driver:
        email = get_random_email(sendemail=True)
        register_and_activate_account(driver, "Mark", "Hamill", email, password)
    owner = server.get_cloud_owner()
    cloud_auth = (owner.email, owner.password)
    CLOUD_API.share(cloud_auth, server.id, 'viewer', email, viewer_permissions)
    time.sleep(30)
    rb = RobotVariables("en_US")
    email_subject = rb.__getattr__("INVITED_TO_SYSTEM_EMAIL_SUBJECT").replace("{{message.system_name}}", server.name)
    mail_box = Email()
    assert mail_box.check_email_subject(None, email_subject), f"Did not find an email with the subject: {email_subject}."
    print("pass")


def share_with_unregistered_user_sends_notification(server: Mediaserver):
    """email    C41889    cloud    CLOUD-8643    smoke    ci    	C30445"""
    email = get_random_email(sendemail=True)
    owner = server.get_cloud_owner()
    cloud_auth = (owner.email, owner.password)
    CLOUD_API.share(cloud_auth, server.id, 'viewer', email, viewer_permissions)
    rb = RobotVariables("en_US")

    email_con = Email()
    email_id = email_con.wait_for_email(email)

    body = email_con.get_body(email_id)
    email_con.check_email_button(body, rb.ENV, rb.THEME_COLOR)
    email_con.check_email_cloud_name(body, rb.PRODUCT_NAME)
    subject = rb.INVITED_TO_SYSTEM_EMAIL_SUBJECT_UNREGISTERED.replace("{{message.sharer_name}}", "Mark Hamill")
    subject = rb.replace_nested_variables(subject)
    print(subject)
    assert email_con.check_email_subject(email_id, subject), "Email subject was not correct."

    expected_links = [
        f'mailto:{owner.email}',
        rb.SUPPORT_URL,
        rb.WEBSITE_URL,
        rb.ENV,
        f'{rb.ENV}/authorize/activate',
    ]
    email_con.find_links_in_email(body, expected_links)
    email_con.delete_email(email_id)

    print("pass")


def email_is_locked_when_unregistered_user_is_invited(server: Mediaserver):
    """email    C41889    cloud    CLOUD-8643    smoke    ci"""
    with get_chrome() as driver:
        email_con = Email()
        email = email_con.get_random_email(sendemail=True)
        owner = server.get_cloud_owner()
        cloud_auth = (owner.email, owner.password)
        CLOUD_API.share(cloud_auth, server.id, 'viewer', email, viewer_permissions)
        email_id = email_con.wait_for_email(email)
        body = email_con.get_body(email_id)
        links = email_con.get_nx_links_from_email(body)
        driver.get(links)
        try:
            RegisterForm(driver).email_input_locked()
        except:
            driver.save_screenshot('error.png')
            raise RuntimeError("FAIL")
        else:
            print("pass")


def share_with_registered_user_works(server: Mediaserver):
    """email    C41888    cloud    smoke    ci    C30446"""
    with get_chrome() as driver:
        email = get_random_email()
        register_and_activate_account(driver, "Mark", "Hamill", email, password)
        owner = server.get_cloud_owner()
        cloud_auth = (owner.email, owner.password)
        CLOUD_API.share(cloud_auth, server.id, "viewer", email, viewer_permissions)
        url = ENV + f"/systems/{server.id}"
        try:
            driver.get(url)
            LoginDialog(driver).basic_cloud_login(owner.email, password)
            header = HeaderNav(driver)
            header.account_dropdown()
            SystemAdmin(driver)
            left_menu = SystemLeftMenu(driver)
            left_menu.users_button().click()
            assert left_menu.get_user_with_email(email)
        except:
            driver.save_screenshot('error.png')
            raise RuntimeError("FAIL")
        else:
            print("pass")

def cancel_disconnect(server: Mediaserver):
    """
    1. Cancel should cancel disconnection and disconnect should remove it when not owner
    [Tags]    C41884    cloud
    """
    with get_chrome() as driver:
        email = get_random_email()
        register_and_activate_account(driver, "Mark", "Hamill", email, password)
        owner = server.get_cloud_owner()
        cloud_auth = (owner.email, owner.password)
        CLOUD_API.share(cloud_auth, server.id, "viewer", email, viewer_permissions)
        url = ENV + f"/systems/{server.id}"
        try:
            driver.get(url)
            LoginDialog(driver).basic_cloud_login(email, password)
            system_admin = SystemAdmin(driver)
            system_admin.disconnect_from_account_button().click()
            system_admin.disconnect_modal_warning().wait_until_visible()
            system_admin.disconnect_from_account_cancel_button().click()
            system_admin.disconnect_modal_warning().wait_until_not_visible()
            system_admin.modal().wait_until_not_visible()
        except:
            driver.save_screenshot('error.png')
            raise RuntimeError("FAIL")
        else:
            print("PASS")

def disconnect_should_remove_system(server: Mediaserver):
    """
    1. Cancel should cancel disconnection and disconnect should remove it when not owner
    [Tags]    C41884    cloud
    """
    with get_chrome() as driver:
        email = get_random_email()
        register_and_activate_account(driver, "Mark", "Hamill", email, password)
        owner = server.get_cloud_owner()
        cloud_auth = (owner.email, owner.password)
        CLOUD_API.share(cloud_auth, server.id, "viewer", email, viewer_permissions)
        url = ENV + f"/systems/{server.id}"
        try:
            driver.get(url)
            login_dialog = LoginDialog(driver)
            login_dialog.basic_cloud_login(email, password)
            system_admin = SystemAdmin(driver)
            system_admin.disconnect_from_account_button().click()
            system_admin.disconnect_modal_warning().wait_until_visible()
            system_admin.disconnect_modal_disconnect_button().click()
            message = system_admin.disconnect_from_account_toast_notification(server.name).get_message()
            message.wait_until_visible()
            message.wait_until_not_visible(10)
            SystemsPage(driver).no_systems().wait_until_visible(30)
            HeaderNav(driver).log_out()
            driver.get(url)
            login_dialog.basic_cloud_login(owner.email, owner.password)
            system_left_menu = SystemLeftMenu(driver)
            system_left_menu.users_button().click()
            system_left_menu.add_users_button().wait_until_visible()
            system_left_menu.update_users_list()
            assert email not in system_left_menu.users
        except:
            driver.save_screenshot('error.png')
            raise RuntimeError("FAIL")
        else:
            print("PASS")

def owner_cannot_edit_users_via_share(server: Mediaserver):
    """
    10. Admin and owner cannot edit self and other users via share
    [Tags]    webadmin    cloud    C41904
    """
    with get_chrome() as driver:
        owner = server.get_cloud_owner()
        admin = server.get_cloud_admin()
        viewer = server.get_cloud_viewer()
        advanced_viewer = server.get_cloud_advanced_viewer()
        live_viewer = server.get_cloud_live_viewer()
        custom = server.get_cloud_custom_user()
        url = ENV + f"/systems/{server.id}"
        try:
            driver.get(url)
            LoginDialog(driver).basic_cloud_login(owner.email, owner.password)
            system_left_menu = SystemLeftMenu(driver)
            system_left_menu.users_button().click()
            system_left_menu.add_users_button().wait_until_visible()
            system_left_menu.get_user_with_email(owner.email).click()
            system_user = SystemUsers(driver)
            # --- this part tests that the owner can't remove himself or change his permissions
            # The sleep and refresh are to bypass bug CLOUD-11525
            time.sleep(5)
            driver.refresh()
            system_user.remove_user_button().wait_until_not_visible(timeout=10)
            system_user.access_level_dropdown().wait_until_not_visible(timeout=10)
            assert system_user.user_header_text().get_text() == owner.email
            # ---
            # Each registered user is tested to make sure you can't share the system with them
            # hacking the string. Ideally should call rb.EMAIL_IS_ALREADY_REGISTERED_TEXT, but thats broken
            error_msg = f"This email has already been registered in the {server.name} system"
            system_left_menu.share_system_with_user(owner.email, rb.CUSTOM_TEXT)
            system_left_menu.add_user_modal_error(error_msg).wait_until_visible()
            system_left_menu.add_user_modal_close_button().click()
            system_left_menu.share_system_with_user(admin.email, rb.LIVE_VIEWER_TEXT)
            system_left_menu.add_user_modal_error(error_msg).wait_until_visible()
            system_left_menu.add_user_modal_close_button().click()
            system_left_menu.share_system_with_user(viewer.email, rb.ADV_VIEWER_TEXT)
            system_left_menu.add_user_modal_error(error_msg).wait_until_visible()
            system_left_menu.add_user_modal_close_button().click()
            system_left_menu.share_system_with_user(advanced_viewer.email, rb.CUSTOM_TEXT)
            system_left_menu.add_user_modal_error(error_msg).wait_until_visible()
            system_left_menu.add_user_modal_close_button().click()
            system_left_menu.share_system_with_user(live_viewer.email, rb.CUSTOM_TEXT)
            system_left_menu.add_user_modal_error(error_msg).wait_until_visible()
            system_left_menu.add_user_modal_close_button().click()
            system_left_menu.share_system_with_user(custom.email, rb.VIEWER_TEXT)
            system_left_menu.add_user_modal_error(error_msg).wait_until_visible()
            system_left_menu.add_user_modal_close_button().click()
        except:
            driver.save_screenshot('error.png')
            raise RuntimeError("FAIL")
        else:
            print("PASS")

def cloud_admin_cannot_edit_users_via_share(server: Mediaserver):
    """
    10. Admin and owner cannot edit self and other users via share
    [Tags]    webadmin    cloud    C41904
    """
    with get_chrome() as driver:
        owner = server.get_cloud_owner()
        admin = server.get_cloud_admin()
        viewer = server.get_cloud_viewer()
        advanced_viewer = server.get_cloud_advanced_viewer()
        live_viewer = server.get_cloud_live_viewer()
        custom = server.get_cloud_custom_user()
        url = ENV + f"/systems/{server.id}"
        try:
            driver.get(url)
            LoginDialog(driver).basic_cloud_login(admin.email, admin.password)
            system_left_menu = SystemLeftMenu(driver)
            system_left_menu.users_button().click()
            system_left_menu.add_users_button().wait_until_visible()
            system_left_menu.get_user_with_email(admin.email).click()
            system_user = SystemUsers(driver)
            assert system_user.user_header_text().get_text() == admin.email
            # Each registered user is tested to make sure you can't share the system with them
            # hacking the string. Ideally should call rb.EMAIL_IS_ALREADY_REGISTERED_TEXT, but thats broken
            error_msg = f"This email has already been registered in the {server.name} system"
            system_left_menu.share_system_with_user(owner.email, rb.CUSTOM_TEXT)
            system_left_menu.add_user_modal_error(error_msg).wait_until_visible()
            system_left_menu.add_user_modal_close_button().click()
            system_left_menu.share_system_with_user(admin.email, rb.LIVE_VIEWER_TEXT)
            system_left_menu.add_user_modal_error(error_msg).wait_until_visible()
            system_left_menu.add_user_modal_close_button().click()
            system_left_menu.share_system_with_user(viewer.email, rb.ADV_VIEWER_TEXT)
            system_left_menu.add_user_modal_error(error_msg).wait_until_visible()
            system_left_menu.add_user_modal_close_button().click()
            system_left_menu.share_system_with_user(advanced_viewer.email, rb.CUSTOM_TEXT)
            system_left_menu.add_user_modal_error(error_msg).wait_until_visible()
            system_left_menu.add_user_modal_close_button().click()
            system_left_menu.share_system_with_user(live_viewer.email, rb.CUSTOM_TEXT)
            system_left_menu.add_user_modal_error(error_msg).wait_until_visible()
            system_left_menu.add_user_modal_close_button().click()
            system_left_menu.share_system_with_user(custom.email, rb.VIEWER_TEXT)
            system_left_menu.add_user_modal_error(error_msg).wait_until_visible()
            system_left_menu.add_user_modal_close_button().click()
        except:
            driver.save_screenshot('error.png')
            raise RuntimeError("FAIL")
        else:
            print("PASS")

def cloud_admin_cannot_delete_or_edit_self(server: Mediaserver):
    """
    9. Cloud Admin/administrator cannot delete or edit self
    [Tags]    C41904    webadmin    cloud
    """
    with get_chrome() as driver:
        admin = server.get_cloud_admin()
        url = ENV + f"/systems/{server.id}"
        try:
            driver.get(url)
            LoginDialog(driver).basic_cloud_login(admin.email, admin.password)
            system_left_menu = SystemLeftMenu(driver)
            system_left_menu.users_button().click()
            system_left_menu.add_users_button().wait_until_visible()
            system_left_menu.get_user_with_email(admin.email).click()
            system_user = SystemUsers(driver)
            system_user.remove_user_button().wait_until_not_visible()
            system_user.access_level_dropdown().wait_until_not_visible()
            assert system_user.user_header_text().get_text() == admin.email
        except:
            driver.save_screenshot('error.png')
            raise RuntimeError("FAIL")
        else:
            print("PASS")

def cloud_admin_cannot_delete_admins_or_owner(server: Mediaserver):
    """
    11. Admin cannot delete or edit other admins or owner
    [Tags]    C41905    webadmin    cloud
    """
    with get_chrome() as driver:
        email = get_random_email()
        register_and_activate_account(driver, "Mark", "Hamill", email, password)
        owner = server.get_cloud_owner()
        cloud_auth = (owner.email, owner.password)
        CLOUD_API.share(cloud_auth, server.id, 'cloudAdmin', email, admin_permissions)
        admin = server.get_cloud_admin()
        local_users = server.get_local_users()
        local_admin = local_users['cloudAdmin']
        url = ENV + f"/systems/{server.id}"
        try:
            driver.get(url)
            LoginDialog(driver).basic_cloud_login(admin.email, admin.password)
            system_left_menu = SystemLeftMenu(driver)
            system_left_menu.users_button().click()
            system_left_menu.add_users_button().wait_until_visible()
            # Verify can't edit/delete new admin
            system_left_menu.get_user_with_email(email).click()
            system_user = SystemUsers(driver)
            system_user.remove_user_button().wait_until_not_visible()
            system_user.access_level_dropdown().wait_until_not_visible()
            assert system_user.user_header_text().get_text() == email
            # Verify can't edit/delete owner
            system_left_menu.get_user_with_email(owner.email).click()
            system_user.remove_user_button().wait_until_not_visible()
            system_user.access_level_dropdown().wait_until_not_visible()
            assert system_user.user_header_text().get_text() == owner.email
            # Verify can't edit/delete local cloud admin
            system_left_menu.get_user_with_email(local_admin['login']).click()
            system_user.remove_user_button().wait_until_not_visible()
            system_user.access_level_dropdown().wait_until_not_visible()
            assert system_user.user_header_text().get_text() == local_admin['login']
        except:
            driver.save_screenshot('error.png')
            raise RuntimeError("FAIL")
        else:
            print("PASS")

if __name__ == "__main__":
    suite_name = Path(__file__).stem
    suite_name = suite_name.removeprefix("test_")
    with Suite() as suite:
        cloud_owner = suite.create_cloud_account()
        cloud_users = suite.create_cloud_users()
        cloud_server = suite.create_cloud_server(cloud_owner, suite_name, cloud_users)
        # owner_can_remove_user(cloud_server)
        # cloud_admin_can_remove_user(cloud_server)
        # share_with_registered_user_works(cloud_server)
        # share_with_registered_user_sends_notification(cloud_server)
        # share_with_unregistered_user_sends_notification(cloud_server)
        # email_is_locked_when_unregistered_user_is_invited(cloud_server)
        # cancel_disconnect(cloud_server)
        # disconnect_should_remove_system(cloud_server)
        # owner_cannot_edit_users_via_share(cloud_server)
        # cloud_admin_cannot_edit_users_via_share(cloud_server)
        # cloud_admin_cannot_delete_or_edit_self(cloud_server)
        cloud_admin_cannot_delete_admins_or_owner(cloud_server)
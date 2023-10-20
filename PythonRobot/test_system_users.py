import time
from pathlib import Path

from NoptixLibrary.cloud_portal_api import CloudPortalAPI
from NoptixLibrary.suite import CloudAccount
from NoptixLibrary.suite import Mediaserver
from NoptixLibrary.suite import Suite
from RobotVariables import RobotVariables
from email_access import Email
from header import HeaderNav
from landing_page import LandingPage
from login import LoginDialog
from register_form import RegisterForm
from resource_import import get_chrome
from resource_import import get_random_email
from resource_import import register_and_activate_account
from system_admin import SystemAdmin
from system_left_menu import SystemLeftMenu
from system_users import SystemUsers
from systems_page import SystemsPage
from variables import ENV

password = "qweasd 123"

CLOUD_API = CloudPortalAPI()
rb = RobotVariables("en_US")
permissions = CloudAccount().PERMISSIONS
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
            left_menu.users_button().click()
            left_menu.get_user_with_email(email).click()
            users_page = SystemUsers(driver)
            users_page.remove_user_button().click()
            users_page.remove_user_modal_button().click()
            header.log_out()
            LandingPage(driver)
            header.log_in_button().click()
            LoginDialog(driver).basic_cloud_login(email, password)
            header.account_dropdown()
            SystemsPage(driver).no_systems()
        except Exception:
            print("FAIL")
            driver.save_screenshot('error.png')
            CLOUD_API.delete_account(email, password)
            raise
        else:
            print("PASS")
            CLOUD_API.delete_account(email, password)

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
            left_menu.users_button().click()
            left_menu.get_user_with_email(email).click()
            users_page = SystemUsers(driver)
            users_page.remove_user_button().click()
            users_page.remove_user_modal_button().click()
            header.log_out()
            LandingPage(driver)
            header.log_in_button().click()
            LoginDialog(driver).basic_cloud_login(email, password)
            header.account_dropdown()
            SystemsPage(driver).no_systems()
        except Exception:
            print("FAIL")
            driver.save_screenshot('error.png')
            CLOUD_API.delete_account(email, password)
            raise
        else:
            print("PASS")
            CLOUD_API.delete_account(email, password)

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
    CLOUD_API.delete_account(email, password)

def share_with_unregistered_user_sends_notification(server: Mediaserver):
    """email    C41889    cloud    CLOUD-8643    smoke    ci    	C30445"""
    email = get_random_email(sendemail=True)
    owner = server.get_cloud_owner()
    cloud_auth = (owner.email, owner.password)
    CLOUD_API.share(cloud_auth, server.id, 'viewer', email, viewer_permissions)
    rb = RobotVariables("en_US")
    email_con = Email()
    subject = rb.INVITED_TO_SYSTEM_EMAIL_SUBJECT_UNREGISTERED.replace("{{message.sharer_name}}", "Mark Hamill")
    subject = rb.replace_nested_variables(subject)
    email_id = email_con.wait_for_email(email, subject)
    if not email_id:
        raise RuntimeError(f"No email with recipient: {email}\n and subject: {subject} \nwas found")
    body = email_con.get_body(email_id)
    email_con.check_email_button(body, rb.ENV, rb.THEME_COLOR)
    email_con.check_email_cloud_name(body, rb.PRODUCT_NAME)
    expected_links = [
        f'mailto:{owner.email}',
        rb.SUPPORT_URL,
        rb.WEBSITE_URL,
        rb.ENV,
        f'{rb.ENV}/authorize/register',
    ]
    email_con.find_links_in_email(body, expected_links)
    email_con.delete_email(email_id)
    print("PASS")
    CLOUD_API.delete_account(email, password)

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
        except Exception:
            print("FAIL")
            driver.save_screenshot('error.png')
            CLOUD_API.delete_account(email, password)
            raise
        else:
            print("PASS")
            CLOUD_API.delete_account(email, password)

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
        except Exception:
            print("FAIL")
            driver.save_screenshot('error.png')
            CLOUD_API.delete_account(email, password)
            raise
        else:
            print("PASS")
            CLOUD_API.delete_account(email, password)

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
        except Exception:
            print("FAIL")
            driver.save_screenshot('error.png')
            CLOUD_API.delete_account(email, password)
            raise
        else:
            print("PASS")
            CLOUD_API.delete_account(email, password)

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
        except Exception:
            print("FAIL")
            driver.save_screenshot('error.png')
            CLOUD_API.delete_account(email, password)
            raise
        else:
            print("PASS")
            CLOUD_API.delete_account(email, password)

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
        except Exception:
            print("FAIL")
            driver.save_screenshot('error.png')
            raise
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
        except Exception:
            print("FAIL")
            driver.save_screenshot('error.png')
            raise
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
        except Exception:
            print("FAIL")
            driver.save_screenshot('error.png')
            raise
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
        except Exception:
            print("FAIL")
            driver.save_screenshot('error.png')
            CLOUD_API.delete_account(email, password)
            raise
        else:
            print("PASS")
            CLOUD_API.delete_account(email, password)

def cloud_admin_cannot_invite_admin(server: Mediaserver):
    """
    12. Administrator cannot invite another administrator
    [Tags]    C41905    webadmin    cloud
    """
    with get_chrome() as driver:
        admin = server.get_cloud_admin()
        url = ENV + f"/systems/{server.id}"
        try:
            driver.get(url)
            LoginDialog(driver).basic_cloud_login(admin.email, admin.password)
            system_left_menu = SystemLeftMenu(driver)
            system_left_menu.users_button().click()
            system_left_menu.add_users_button().click()
            system_left_menu.add_user_permissions_dropdown().click()
            system_left_menu.permissions_dropdown_option(rb.VIEWER_TEXT).wait_until_visible()
            system_left_menu.permissions_dropdown_unavailable(rb.ADMIN_TEXT)
        except Exception:
            print("FAIL")
            driver.save_screenshot('error.png')
            raise
        else:
            print("PASS")   

def user_data_should_match_registration(server: Mediaserver):
    """
    3. Should display same user data as user provided during registration
    [Tags]    email    cloud
    """
    combo_text = "Кенг☿☂⊗⅓您都可以`~!@#$%계정이 이"
    with get_chrome() as driver:
        owner = server.get_cloud_owner()
        cloud_auth = (owner.email, owner.password)
        email = get_random_email()
        register_and_activate_account(driver, combo_text, combo_text, email, password)
        CLOUD_API.share(cloud_auth, server.id, 'cloudAdmin', email, admin_permissions)
        url = ENV + f"/systems/{server.id}"
        try:
            driver.get(url)
            LoginDialog(driver).basic_cloud_login(email, password)
            system_left_menu = SystemLeftMenu(driver)
            system_left_menu.users_button().click()
            system_left_menu.add_users_button().wait_until_visible()
            system_left_menu.get_user_with_email(email).click()
            assert f"{combo_text} {combo_text}" in SystemUsers(driver).user_name_text().get_text()
        except Exception:
            print("FAIL")
            driver.save_screenshot('error.png')
            CLOUD_API.delete_account(email, password)
            raise
        else:
            print("PASS")
            CLOUD_API.delete_account(email, password)

def owner_can_unlink_offline_system_from_cloud(server: Mediaserver):
    """
    2. Owner / Admin can unlink offline System from Cloud / Account
    [Tags]    C41897    cloud
    """
    with get_chrome() as driver:
        owner = server.get_cloud_owner()
        cloud_auth = (owner.email, owner.password)
        email = get_random_email()
        register_and_activate_account(driver, "Mark", "Hamill", email, password)
        CLOUD_API.share(cloud_auth, server.id, 'viewer', email, viewer_permissions)
        server.stop()
        url = ENV + f"/systems/{server.id}"
        try:
            driver.get(url)
            LoginDialog(driver).basic_cloud_login(owner.email, owner.password)
            system_admin = SystemAdmin(driver)
            system_admin.system_offline_text().wait_until_visible(timeout=65)
            system_admin.disconnect_from_cloud_button().click()
            system_admin.disconnect_system_modal_button().click()
            system_admin.disconnect_from_cloud_toast_notification()
            HeaderNav(driver).log_out()
            driver.get(f"{ENV}/systems")
            LoginDialog(driver).basic_cloud_login(email, password)
            SystemsPage(driver).no_systems().wait_until_visible()
        except Exception:
            print("FAIL")
            driver.save_screenshot('error.png')
            CLOUD_API.delete_account(email, password)
            server.start()
            time.sleep(10)
            server.connect_to_cloud(owner)
            raise
        else:
            print("PASS")
            server.start()
            time.sleep(10)
            server.connect_to_cloud(owner)
            CLOUD_API.delete_account(email, password)

def viewer_can_remove_offline_system_from_account(server: Mediaserver):
    """
    2. Owner / Admin can unlink offline System from Cloud / Account
    [Tags]    C41898    cloud
    """
    with get_chrome() as driver:
        owner = server.get_cloud_owner()
        cloud_auth = (owner.email, owner.password)
        email = get_random_email()
        register_and_activate_account(driver, "Mark", "Hamill", email, password)
        CLOUD_API.share(cloud_auth, server.id, 'viewer', email, viewer_permissions)
        server.stop()
        url = ENV + f"/systems/{server.id}"
        try:
            driver.get(url)
            LoginDialog(driver).basic_cloud_login(email, password)
            system_admin = SystemAdmin(driver)
            system_admin.disconnect_from_account_button().click()
            system_admin.disconnect_modal_warning().wait_until_visible()
            system_admin.disconnect_modal_disconnect_button().click()
            system_admin.disconnect_from_account_toast_notification(server.name).message()
            SystemsPage(driver).no_systems().wait_until_visible(60)
            HeaderNav(driver).log_out()
            driver.get(url)
            LoginDialog(driver).basic_cloud_login(owner.email, owner.password)
            system_left_menu = SystemLeftMenu(driver)
            system_left_menu.users_button().click()
            system_left_menu.add_users_button().wait_until_visible()
            system_left_menu.update_users_list()
            assert email not in system_left_menu.users
        except Exception:
            print("FAIL")
            driver.save_screenshot('error.png')
            CLOUD_API.delete_account(email, password)
            server.start()
            raise
        else:
            print("PASS")
            server.start()
            CLOUD_API.delete_account(email, password)

def add_user_button_opens_cancellable_modal(server: Mediaserver):
    """
    5. Share button - opens dialog
    [Tags]    C41888    webadmin    cloud
    6. Check Add User Cancel and 'X' buttons
    [Tags]    C78228    webadmin    cloud
    """
    with get_chrome() as driver:
        owner = server.get_cloud_owner()
        url = ENV + f"/systems/{server.id}"
        try:
            driver.get(url)
            LoginDialog(driver).basic_cloud_login(owner.email, owner.password)
            system_left_menu = SystemLeftMenu(driver)
            system_left_menu.users_button().click()
            system_left_menu.add_users_button().click()
            system_left_menu.add_user_modal().wait_until_visible()
            system_left_menu.add_user_modal_close_button().click()
            system_left_menu.add_user_modal().wait_until_not_visible()
            system_left_menu.add_users_button().click()
            system_left_menu.add_user_modal().wait_until_visible()
            system_left_menu.add_user_modal_cancel_button().click()
            system_left_menu.add_user_modal().wait_until_not_visible()
        except Exception:
            print("FAIL")
            driver.save_screenshot('error.png')
            raise
        else:
            print("PASS")   


if __name__ == "__main__":
    suite_name = Path(__file__).stem
    suite_name = suite_name.removeprefix("test_")
    with Suite() as suite:
        cloud_owner = suite.create_cloud_account()
        cloud_users = suite.create_cloud_accounts()
        cloud_server = suite.create_cloud_server(cloud_owner, suite_name, cloud_users)
        cloud_owner_2 = suite.create_cloud_account()
        cloud_server_2 = suite.create_cloud_server(cloud_owner_2, suite_name)
        owner_can_remove_user(cloud_server)
        cloud_admin_can_remove_user(cloud_server)
        share_with_registered_user_works(cloud_server)
        share_with_registered_user_sends_notification(cloud_server)
        share_with_unregistered_user_sends_notification(cloud_server)
        email_is_locked_when_unregistered_user_is_invited(cloud_server)
        cancel_disconnect(cloud_server)
        disconnect_should_remove_system(cloud_server)
        owner_cannot_edit_users_via_share(cloud_server)
        cloud_admin_cannot_edit_users_via_share(cloud_server)
        cloud_admin_cannot_delete_or_edit_self(cloud_server)
        cloud_admin_cannot_delete_admins_or_owner(cloud_server)
        cloud_admin_cannot_invite_admin(cloud_server)
        user_data_should_match_registration(cloud_server)
        owner_can_unlink_offline_system_from_cloud(cloud_server_2)
        viewer_can_remove_offline_system_from_account(cloud_server_2)
        add_user_button_opens_cancellable_modal(cloud_server)
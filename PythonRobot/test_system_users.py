import time
from pathlib import Path
import robot_keywords
from NoptixLibrary.cloud_portal_api import CloudPortalAPI
from NoptixLibrary.generic_keywords import GenericKeywords
from NoptixLibrary.suite import CloudServer
from NoptixLibrary.suite import Suite
from RobotVariables import RobotVariables
from email_access import Email
from header import HeaderNav
from landing_page import LandingPage
from login import LoginDialog
from register_form import RegisterForm
from resource_import import get_headless_chrome
from resource_import import register_and_activate_account
from resource_import import get_random_email
from system_admin import SystemAdmin
from system_left_menu import SystemLeftMenu
from system_users import SystemUsers
from systems_page import SystemsPage
from variables import ENV

password = "qweasd 123"

keywords = GenericKeywords()
CLOUD_API = CloudPortalAPI()
viewer_permissions = 'GlobalViewArchivePermission|GlobalExportPermission|GlobalViewBookmarksPermission|GlobalAccessAllMediaPermission'


def owner_can_remove_user(server: CloudServer):
    """
    15. Delete user works
    [Tags]    email    C41903    webadmin    cloud    smoke    ci    C30726
    """
    driver = get_headless_chrome()
    # TODO: local admin and owner need to also be tested to match robot test case
    cloud_auth = (server.cloud_owner.email, server.cloud_owner.password)
    email = get_random_email()
    register_and_activate_account(driver, "Mark", "Hamill", email, password)
    CLOUD_API.share(cloud_auth, server.id, 'viewer', email, viewer_permissions)
    url = ENV + f"/systems/{server.id}"
    driver.get(url)
    LoginDialog(driver).basic_cloud_login(server.cloud_owner.email, server.cloud_owner.password)
    header = HeaderNav(driver)
    header.account_dropdown()
    SystemAdmin(driver)
    left_menu = SystemLeftMenu(driver)
    time.sleep(1)
    left_menu.users_button().click()
    left_menu.update_users_list()
    left_menu.users[1].click()
    for user in left_menu.users:
        if user.text == email:
            user.click()
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
    driver.quit()
    print("pass owner")

def cloud_admin_can_remove_user(server: CloudServer):
    """
    15. Delete user works
    [Tags]    email    C41903    webadmin    cloud    smoke    ci    C30726
    """
    driver = get_headless_chrome()
    # TODO: local admin and owner need to also be tested to match robot test case
    cloud_auth = (server.cloud_owner.email, server.cloud_owner.password)
    email = get_random_email()
    register_and_activate_account(driver, "Mark", "Hamill", email, password)
    CLOUD_API.share(cloud_auth, server.id, 'viewer', email, viewer_permissions)
    url = ENV + f"/systems/{server.id}"
    driver.get(url)
    LoginDialog(driver).basic_cloud_login(server.cloud_admin.email, server.cloud_admin.password)
    header = HeaderNav(driver)
    header.account_dropdown()
    SystemAdmin(driver)
    left_menu = SystemLeftMenu(driver)
    time.sleep(1)
    left_menu.users_button().click()
    left_menu.update_users_list()
    left_menu.users[1].click()
    for user in left_menu.users:
        if user.text == email:
            user.click()
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
    driver.quit()
    print("pass admin")


def share_with_registered_user_sends_notification(server: CloudServer):
    """email    C41888    cloud    smoke    ci    C30446"""
    driver = get_headless_chrome()
    email = get_random_email(sendemail=True)
    register_and_activate_account(driver, "Mark", "Hamill", email, password)
    cloud_auth = (server.cloud_owner.email, server.cloud_owner.password)
    CLOUD_API.share(cloud_auth, server.id, 'viewer', email, viewer_permissions)
    time.sleep(30)
    rb = RobotVariables("en_US")
    email_subject = rb.__getattr__("INVITED_TO_SYSTEM_EMAIL_SUBJECT").replace("{{message.system_name}}", server.name)
    mail_box = Email()
    assert mail_box.check_email_subject(None, email_subject), f"Did not find an email with the subject: {email_subject}."

    driver.quit()
    print("pass")


def share_with_unregistered_user_sends_notification(server: CloudServer):
    """email    C41889    cloud    CLOUD-8643    smoke    ci    	C30445"""
    email = get_random_email(sendemail=True)
    cloud_auth = (server.cloud_owner.email, server.cloud_owner.password)
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
    print()
    assert email_con.check_email_subject(email_id, subject), "Email subject was not correct."

    links = email_con.get_links_from_email(body)
    expected_links = [
        f'mailto:{server.cloud_owner.email}',
        rb.SUPPORT_URL,
        rb.WEBSITE_URL,
        rb.ENV,
        f'{rb.ENV}/authorize/activate',
    ]
    GenericKeywords().check_in_list(expected_links, links)
    email_con.delete_email(email_id)

    print("pass")


def email_is_locked_when_unregistered_user_is_invited(server: CloudServer):
    """email    C41889    cloud    CLOUD-8643    smoke    ci"""
    driver = get_headless_chrome()
    email_con = Email()
    email = email_con.get_random_email(sendemail=True)
    cloud_auth = (server.cloud_owner.email, server.cloud_owner.password)
    CLOUD_API.share(cloud_auth, server.id, 'viewer', email, viewer_permissions)
    time.sleep(30)
    email_id = email_con.wait_for_email(email)
    body = email_con.get_body(email_id)
    links = email_con.get_nx_links_from_email(body)
    driver.get(links)
    RegisterForm(driver).email_input_locked()
    driver.quit()
    print("pass")


def share_with_registered_user_works(server: CloudServer):
    """email    C41888    cloud    smoke    ci    C30446"""
    driver = get_headless_chrome()
    email = get_random_email()
    register_and_activate_account(driver, "Mark", "Hamill", email, password)
    cloud_auth = (server.cloud_owner.email, server.cloud_owner.password)
    CLOUD_API.share(cloud_auth, server.id, "viewer", email, viewer_permissions)
    url = ENV + f"/systems/{server.id}"
    driver.get(url)
    LoginDialog(driver).basic_cloud_login(server.cloud_owner.email, password)
    header = HeaderNav(driver)
    header.account_dropdown()
    SystemAdmin(driver)
    left_menu = SystemLeftMenu(driver)
    time.sleep(1)
    left_menu.users_button().click()
    left_menu.update_users_list()
    left_menu.users[1].click()
    user_there = False
    for user in left_menu.users:
        if user.text == email:
            user_there = True
    assert user_there, "User was not in the users list"

    driver.quit()
    print("pass")


if __name__ == "__main__":
    suite_name = Path(__file__).stem
    suite_name = suite_name.removeprefix("test_")
    with Suite() as suite:
        cloud_owner = suite.create_cloud_account()
        cloud_users = suite.create_cloud_users()
        cloud_server = suite.create_cloud_server(cloud_owner, suite_name, cloud_users)
        time.sleep(90) # added for now to allow the system to become interactable on cloud portal
        owner_can_remove_user(cloud_server)
        cloud_admin_can_remove_user(cloud_server)
        share_with_registered_user_works(cloud_server)
        share_with_registered_user_sends_notification(cloud_server)
        # share_with_unregistered_user_sends_notification()
        email_is_locked_when_unregistered_user_is_invited(cloud_server)

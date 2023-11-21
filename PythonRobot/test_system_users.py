import time
from pathlib import Path

from NoptixLibrary.suite import CloudAccount
from NoptixLibrary.suite import Mediaserver
from NoptixLibrary.suite import Suite
from RobotVariables import RobotVariables
from browsers.chrome import get_chrome
from email_access import EmailClient
from email_access import get_random_email
from pages.header import HeaderNav
from pages.landing_page import LandingPage
from pages.login import LoginDialog
from pages.register_form import RegisterForm
from pages.system_admin import SystemAdmin
from pages.system_left_menu import SystemLeftMenu
from pages.system_users import SystemUsers
from pages.systems_page import SystemsPage
from variables import ENV

password = "qweasd 123"
rb = RobotVariables("en_US")
permissions = CloudAccount.PERMISSIONS
viewer_permissions = permissions['viewer']
admin_permissions = permissions['cloudAdmin']
liveViewer_permissions = permissions['liveViewer']


def owner_can_remove_user(server: Mediaserver):
    """
    15. Delete user works
    [Tags]    email    C41903    webadmin    cloud    smoke    ci    C30726
    """
    with get_chrome() as driver:
        with CloudAccount(get_random_email()) as tmp_user:
            tmp_user.activate()
            server.share_with_user(tmp_user, 'viewer', viewer_permissions)
            owner = server.get_cloud_owner()
            url = ENV + f"/systems/{server.id}"
            try:
                driver.get(url)
                LoginDialog(driver).basic_cloud_login(owner.email, owner.password)
                header = HeaderNav(driver)
                header.account_dropdown()
                SystemAdmin(driver)
                left_menu = SystemLeftMenu(driver)
                left_menu.open_users_dropdown()
                left_menu.get_user_with_email(tmp_user.email).click()
                users_page = SystemUsers(driver)
                users_page.remove_user_button().click()
                users_page.remove_user_modal_button().click()
                header.log_out()
                LandingPage(driver).location_is_correct(url=f"{ENV}/")
                header.log_in_button().click()
                LoginDialog(driver).basic_cloud_login(tmp_user.email, tmp_user.password)
                header.account_dropdown()
                SystemsPage(driver).no_systems().wait_until_visible()
            except Exception:
                print("FAIL")
                driver.save_screenshot('error.png')
                raise
            else:
                print("PASS")


def cloud_admin_can_remove_user(server: Mediaserver):
    """
    15. Delete user works
    [Tags]    email    C41903    webadmin    cloud    smoke    ci    C30726
    """
    with get_chrome() as driver:
        with CloudAccount(get_random_email()) as tmp_user:
            tmp_user.activate()
            server.share_with_user(tmp_user, 'viewer', viewer_permissions)
            url = ENV + f"/systems/{server.id}"
            try:
                driver.get(url)
                cloud_admin = server.get_cloud_admin()
                LoginDialog(driver).basic_cloud_login(cloud_admin.email, cloud_admin.password)
                header = HeaderNav(driver)
                header.account_dropdown()
                SystemAdmin(driver)
                left_menu = SystemLeftMenu(driver)
                left_menu.open_users_dropdown()
                left_menu.get_user_with_email(tmp_user.email).click()
                users_page = SystemUsers(driver)
                users_page.remove_user_button().click()
                users_page.remove_user_modal_button().click()
                header.log_out()
                LandingPage(driver).location_is_correct(url=f"{ENV}/")
                header.log_in_button().click()
                LoginDialog(driver).basic_cloud_login(tmp_user.email, tmp_user.password)
                header.account_dropdown()
                SystemsPage(driver).no_systems().wait_until_visible()
            except Exception:
                print("FAIL")
                driver.save_screenshot('error.png')
                raise
            else:
                print("PASS")


def share_with_registered_user_sends_notification(server: Mediaserver):
    """email    C41888    cloud    smoke    ci    C30446"""
    with CloudAccount(get_random_email(sendemail=True)) as tmp_user:
        tmp_user.activate()
        server.share_with_user(tmp_user, 'viewer', viewer_permissions)
        email_subject = rb.__getattr__("INVITED_TO_SYSTEM_EMAIL_SUBJECT").replace("{{message.system_name}}", server.name)
        with EmailClient(email_alias=tmp_user.email) as client:
            client.wait_for_email_subject(email_subject)
        print("pass")


def share_with_unregistered_user_sends_notification(server: Mediaserver):
    """email    C41889    cloud    CLOUD-8643    smoke    ci    	C30445"""
    with CloudAccount(get_random_email(sendemail=True)) as tmp_user:
        tmp_user.activate()
        server.share_with_user(tmp_user, 'viewer', viewer_permissions)
        owner = server.get_cloud_owner()
        subject = rb.INVITED_TO_SYSTEM_EMAIL_SUBJECT_UNREGISTERED.replace("{{message.sharer_name}}", "Mark Hamill")
        subject = rb.replace_nested_variables(subject)
        with EmailClient(email_alias=tmp_user.email) as client:
            email_message = client.wait_for_email_subject(subject)
        assert email_message.get_button_color(ENV) == rb.THEME_COLOR
        email_message.is_cloud_name_present(rb.PRODUCT_NAME)
        expected_links = [
            f'mailto:{owner.email}',
            rb.SUPPORT_URL,
            rb.WEBSITE_URL,
            rb.ENV,
            f'{rb.ENV}/authorize/register',
        ]
        email_message.find_links_in_body(expected_links)
        # User cannot be deleted unless activated
        registration_link = email_message.get_register_account_link()
        with get_chrome() as driver:
            driver.get(registration_link)
            register_form = RegisterForm(driver)
            register_form.first_name_input().input_text("Mark")
            register_form.last_name_input().input_text("Hamill")
            register_form.password_input().input_text(password)
            register_form.terms_and_conditions_checkbox().select()
            register_form.create_account_button().click()
        print("PASS")


def email_is_locked_when_unregistered_user_is_invited(server: Mediaserver):
    """email    C41889    cloud    CLOUD-8643    smoke    ci"""
    with get_chrome() as driver:
        with CloudAccount(get_random_email(sendemail=True)) as tmp_user:
            tmp_user.activate()
            server.share_with_user(tmp_user, 'viewer', viewer_permissions)
            subject = rb.INVITED_TO_SYSTEM_EMAIL_SUBJECT_UNREGISTERED.replace("{{message.sharer_name}}", "Mark Hamill")
            subject = rb.replace_nested_variables(subject)
            with EmailClient(email_alias=tmp_user.email) as client:
                email_message = client.wait_for_email_subject(subject)
            links = email_message.get_register_account_link()
            driver.get(links)
            try:
                RegisterForm(driver).email_input_locked()
            except Exception:
                print("FAIL")
                driver.save_screenshot('error.png')
                raise
            else:
                # User cannot be deleted unless activated
                registration_link = email_message.get_register_account_link()
                driver.get(registration_link)
                register_form = RegisterForm(driver)
                register_form.first_name_input().input_text("Mark")
                register_form.last_name_input().input_text("Hamill")
                register_form.password_input().input_text(password)
                register_form.terms_and_conditions_checkbox().select()
                register_form.create_account_button().click()
                print("PASS")


def share_with_registered_user_works(server: Mediaserver):
    """email    C41888    cloud    smoke    ci    C30446"""
    with get_chrome() as driver:
        with CloudAccount(get_random_email()) as tmp_user:
            tmp_user.activate()
            server.share_with_user(tmp_user, 'viewer', viewer_permissions)
            owner = server.get_cloud_owner()
            url = ENV + f"/systems/{server.id}"
            try:
                driver.get(url)
                LoginDialog(driver).basic_cloud_login(owner.email, password)
                header = HeaderNav(driver)
                header.account_dropdown()
                SystemAdmin(driver)
                left_menu = SystemLeftMenu(driver)
                left_menu.open_users_dropdown()
                assert left_menu.get_user_with_email(tmp_user.email)
            except Exception:
                print("FAIL")
                driver.save_screenshot('error.png')
                raise
            else:
                print("PASS")


def cancel_disconnect(server: Mediaserver):
    """
    1. Cancel should cancel disconnection and disconnect should remove it when not owner
    [Tags]    C41884    cloud
    """
    with get_chrome() as driver:
        with CloudAccount(get_random_email()) as tmp_user:
            tmp_user.activate()
            server.share_with_user(tmp_user, 'viewer', viewer_permissions)
            url = ENV + f"/systems/{server.id}"
            try:
                driver.get(url)
                LoginDialog(driver).basic_cloud_login(tmp_user.email, tmp_user.password)
                system_admin = SystemAdmin(driver)
                system_admin.disconnect_from_account_button().click()
                system_admin.disconnect_modal_warning().wait_until_visible()
                system_admin.disconnect_from_account_cancel_button().click()
                system_admin.disconnect_modal_warning().wait_until_not_visible()
                system_admin.modal().wait_until_not_visible()
            except Exception:
                print("FAIL")
                driver.save_screenshot('error.png')
                raise
            else:
                print("PASS")


def disconnect_should_remove_system(server: Mediaserver):
    """
    1. Cancel should cancel disconnection and disconnect should remove it when not owner
    [Tags]    C41884    cloud
    """
    with get_chrome() as driver:
        with CloudAccount(get_random_email()) as tmp_user:
            tmp_user.activate()
            server.share_with_user(tmp_user, 'viewer', viewer_permissions)
            owner = server.get_cloud_owner()
            url = ENV + f"/systems/{server.id}"
            try:
                driver.get(url)
                login_dialog = LoginDialog(driver)
                login_dialog.basic_cloud_login(tmp_user.email, tmp_user.password)
                system_admin = SystemAdmin(driver)
                system_admin.disconnect_from_account_button().click()
                system_admin.disconnect_modal_warning().wait_until_visible()
                system_admin.disconnect_modal_disconnect_button().click()
                message = system_admin.disconnect_from_account_toast_notification(server.name)
                message.wait_until_visible()
                message.wait_until_not_visible(10)
                SystemsPage(driver).no_systems().wait_until_visible(30)
                HeaderNav(driver).log_out()
                driver.get(url)
                login_dialog.basic_cloud_login(owner.email, owner.password)
                system_left_menu = SystemLeftMenu(driver)
                system_left_menu.open_users_dropdown()
                assert not system_left_menu.has_user_with_email(tmp_user.email)
            except Exception:
                print("FAIL")
                driver.save_screenshot('error.png')
                raise
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
            system_left_menu.open_users_dropdown()
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
            system_left_menu.open_users_dropdown()
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
            system_left_menu.open_users_dropdown()
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
        with CloudAccount(get_random_email()) as tmp_admin:
            tmp_admin.activate()
            server.share_with_user(tmp_admin, 'cloudAdmin', admin_permissions)
            owner = server.get_cloud_owner()
            admin = server.get_cloud_admin()
            local_users = server.get_local_users()
            local_admin = local_users['cloudAdmin']
            url = ENV + f"/systems/{server.id}"
            try:
                driver.get(url)
                LoginDialog(driver).basic_cloud_login(admin.email, admin.password)
                system_left_menu = SystemLeftMenu(driver)
                system_left_menu.open_users_dropdown()
                # Verify can't edit/delete new admin
                system_left_menu.get_user_with_email(tmp_admin.email).click()
                system_user = SystemUsers(driver)
                system_user.remove_user_button().wait_until_not_visible()
                system_user.access_level_dropdown().wait_until_not_visible()
                assert system_user.user_header_text().get_text() == tmp_admin.email
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
                raise
            else:
                print("PASS")


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
            users_dropdown = system_left_menu.open_users_dropdown()
            users_dropdown.add_user_button().click()
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
        with CloudAccount(get_random_email(), combo_text, combo_text) as combo_user:
            server.share_with_user(combo_user, 'cloudAdmin', admin_permissions)
            url = ENV + f"/systems/{server.id}"
            try:
                driver.get(url)
                LoginDialog(driver).basic_cloud_login(combo_user.email, combo_user.password)
                system_left_menu = SystemLeftMenu(driver)
                system_left_menu.open_users_dropdown()
                system_left_menu.get_user_with_email(combo_user.email).click()
                assert f"{combo_text} {combo_text}" in SystemUsers(driver).user_name_text().get_text()
            except Exception:
                print("FAIL")
                driver.save_screenshot('error.png')
                raise
            else:
                print("PASS")


def owner_can_unlink_offline_system_from_cloud(server: Mediaserver):
    """
    2. Owner / Admin can unlink offline System from Cloud / Account
    [Tags]    C41897    cloud
    """
    with get_chrome() as driver:
        with CloudAccount(get_random_email()) as tmp_user:
            tmp_user.activate()
            server.share_with_user(tmp_user, 'viewer', viewer_permissions)
            server.stop()
            owner = server.get_cloud_owner()
            url = ENV + f"/systems/{server.id}"
            try:
                driver.get(url)
                LoginDialog(driver).basic_cloud_login(owner.email, owner.password)
                system_admin = SystemAdmin(driver)
                system_admin.system_offline_text().wait_until_visible(timeout=65)
                system_admin.disconnect_from_cloud_button().click()
                system_admin.disconnect_system_modal_button().click()
                system_admin.disconnect_from_cloud_toast_notification().wait_until_visible()
                HeaderNav(driver).log_out()
                driver.get(f"{ENV}/systems")
                LoginDialog(driver).basic_cloud_login(tmp_user.email, tmp_user.password)
                SystemsPage(driver).no_systems().wait_until_visible()
            except Exception:
                print("FAIL")
                driver.save_screenshot('error.png')
                server.start()
                time.sleep(10)
                server.connect_to_cloud(owner)
                raise
            else:
                print("PASS")
                server.start()
                time.sleep(10)
                server.connect_to_cloud(owner)


def viewer_can_remove_offline_system_from_account(server: Mediaserver):
    """
    2. Owner / Admin can unlink offline System from Cloud / Account
    [Tags]    C41898    cloud
    """
    with get_chrome() as driver:
        with CloudAccount(get_random_email()) as tmp_user:
            tmp_user.activate()
            server.share_with_user(tmp_user, 'viewer', viewer_permissions)
            server.stop()
            owner = server.get_cloud_owner()
            url = ENV + f"/systems/{server.id}"
            try:
                driver.get(url)
                LoginDialog(driver).basic_cloud_login(tmp_user.email, tmp_user.password)
                system_admin = SystemAdmin(driver)
                system_admin.disconnect_from_account_button().click()
                system_admin.disconnect_modal_warning().wait_until_visible()
                system_admin.disconnect_modal_disconnect_button().click()
                system_admin.disconnect_from_account_toast_notification(server.name).wait_until_visible()
                SystemsPage(driver).no_systems().wait_until_visible(60)
                HeaderNav(driver).log_out()
                driver.get(url)
                LoginDialog(driver).basic_cloud_login(owner.email, owner.password)
                system_left_menu = SystemLeftMenu(driver)
                system_left_menu.open_users_dropdown()
                assert not system_left_menu.has_user_with_email(tmp_user.email)
            except Exception:
                print("FAIL")
                driver.save_screenshot('error.png')
                server.start()
                raise
            else:
                print("PASS")
                server.start()


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
            users_dropdown = system_left_menu.open_users_dropdown()
            add_user_modal = users_dropdown.open_add_user_dialog()
            add_user_modal.close()
            add_user_modal = users_dropdown.open_add_user_dialog()
            add_user_modal.cancel()
        except Exception:
            print("FAIL")
            driver.save_screenshot('error.png')
            raise
        else:
            print("PASS")


def verify_special_hints_on_permissions_dropdown(server: Mediaserver):
    """
    8. When user selects role - special hint appears
    [Tags]    C41901    webadmin    cloud
    """
    with get_chrome() as driver:
        owner = server.get_cloud_owner()
        url = ENV + f"/systems/{server.id}"
        try:
            driver.get(url)
            LoginDialog(driver).basic_cloud_login(owner.email, owner.password)
            system_left_menu = SystemLeftMenu(driver)
            users_dropdown = system_left_menu.open_users_dropdown()
            users_dropdown.open_add_user_dialog()
            viewer_hint = system_left_menu.add_user_permissions_hint()
            viewer_hint.wait_until_visible()
            default_permission = system_left_menu.add_user_permissions_dropdown().text()
            assert rb.VIEWER_TEXT in default_permission, "Viewer was not visible in the Dropdown element"
            assert rb.ADD_USER_PERMISSIONS_HINT_VIEWER in viewer_hint.get_text(), "Hint text did not match Viewer hint"
        except Exception:
            print("FAIL")
            driver.save_screenshot('error.png')
            raise
        else:
            print("PASS")


def change_role_for_cloud_user(server: Mediaserver):
    """
    13. Change role for Cloud User
    [Tags]    C41900    webadmin    cloud
    """
    with get_chrome() as driver:
        with CloudAccount(get_random_email(), "Tmp", "Viewer") as tmp_user:
            server.share_with_user(tmp_user, 'viewer', viewer_permissions)
            owner = server.get_cloud_owner()
            url = ENV + f"/systems/{server.id}"
            try:
                driver.get(url)
                LoginDialog(driver).basic_cloud_login(owner.email, owner.password)
                system_left_menu = SystemLeftMenu(driver)
                system_left_menu.open_users_dropdown()
                system_left_menu.get_user_with_email(tmp_user.email).click()
                system_user = SystemUsers(driver)
                system_user.user_header_text().wait_until_visible()
                system_user.access_level_dropdown().wait_until_visible()
                system_user.remove_user_button().wait_until_visible()
                system_user.no_unsaved_changes_text().wait_until_visible()
                assert system_user.user_header_text().get_text() == tmp_user.email, "User email does not match"
                assert system_user.user_name_text().get_text() == "Tmp Viewer", "User name does not match"
                assert system_user.access_level_dropdown().text() == "Viewer", "User permission does not match"
                system_user.access_level_dropdown().click()
                system_user.access_level_dropdown_option("Administrator").click()
                system_user.save_button().wait_until_visible()
                system_user.cancel_button().wait_until_visible()
                system_user.save_button().click()
                system_user.save_button().wait_until_not_visible()
                system_user.cancel_button().wait_until_not_visible()
                system_user.access_level_dropdown().wait_until_visible()
                system_user.no_unsaved_changes_text().wait_until_visible()
                # CLOUD-11666 bug causes failure
                assert system_user.access_level_dropdown().text() == "Administrator", "User permission does not match"
            except Exception:
                print("FAIL")
                driver.save_screenshot('error.png')
                raise
            else:
                print("PASS")


def edit_permission_works_for_owner(server: Mediaserver):
    """
    14. Edit permission works
    [Tags]    C30657    C47041    webadmin    cloud
    """
    with get_chrome() as driver:
        with CloudAccount(get_random_email(), "Tmp", "liveViewer") as tmp_user:
            server.share_with_user(tmp_user, 'liveViewer', liveViewer_permissions)
            owner = server.get_cloud_owner()
            url = ENV + f"/systems/{server.id}"
            try:
                driver.get(url)
                LoginDialog(driver).basic_cloud_login(owner.email, owner.password)
                system_left_menu = SystemLeftMenu(driver)
                system_left_menu.open_users_dropdown()
                system_left_menu.get_user_with_email(tmp_user.email).click()
                system_user = SystemUsers(driver)
                system_user.access_level_dropdown().click()
                system_user.access_level_dropdown_option("Viewer").click()
                system_user.save_button().wait_until_visible()
                system_user.cancel_button().wait_until_visible()
                system_user.save_button().click()
                system_user.save_button().wait_until_not_visible()
                system_user.cancel_button().wait_until_not_visible()
                system_user.access_level_dropdown().wait_until_visible()
                system_user.no_unsaved_changes_text().wait_until_visible()
                vms_user = server.api.get_user_by_email(tmp_user.email)
                assert vms_user['permissions'] == viewer_permissions, "User permissions did not change on VMS"
                # CLOUD-11666 bug causes failure
                assert system_user.access_level_dropdown().text() == "Viewer", "User permission displayed does not match"
            except Exception:
                print("FAIL")
                driver.save_screenshot('error.png')
                raise
            else:
                print("PASS")


def edit_permission_works_for_cloud_admin(server: Mediaserver):
    """
    14. Edit permission works
    [Tags]    C30657    C47041    webadmin    cloud
    """
    with get_chrome() as driver:
        with CloudAccount(get_random_email(), "Tmp", "liveViewer") as tmp_user:
            server.share_with_user(tmp_user, 'liveViewer', liveViewer_permissions)
            admin = server.get_cloud_admin()
            url = ENV + f"/systems/{server.id}"
            try:
                driver.get(url)
                LoginDialog(driver).basic_cloud_login(admin.email, admin.password)
                system_left_menu = SystemLeftMenu(driver)
                system_left_menu.open_users_dropdown()
                system_left_menu.get_user_with_email(tmp_user.email).click()
                system_user = SystemUsers(driver)
                system_user.access_level_dropdown().click()
                system_user.access_level_dropdown_option("Viewer").click()
                system_user.save_button().wait_until_visible()
                system_user.cancel_button().wait_until_visible()
                system_user.save_button().click()
                system_user.save_button().wait_until_not_visible()
                system_user.cancel_button().wait_until_not_visible()
                system_user.access_level_dropdown().wait_until_visible()
                system_user.no_unsaved_changes_text().wait_until_visible()
                vms_user = server.api.get_user_by_email(tmp_user.email)
                assert vms_user['permissions'] == viewer_permissions, "User permissions did not change on VMS"
                # CLOUD-11666 bug causes failure
                assert system_user.access_level_dropdown().text() == "Viewer", "User permission displayed does not match"
            except Exception:
                print("FAIL")
                driver.save_screenshot('error.png')
                raise
            else:
                print("PASS")


def test_email_validation(server: Mediaserver):
    """
    [Tags]    C78227    C41902    C47296
    """
    owner = server.get_cloud_owner()
    url = ENV + f"/systems/{server.id}"
    with get_chrome() as driver:
        driver.get(url)
        LoginDialog(driver).basic_cloud_login(owner.email, owner.password)
        system_admin = SystemAdmin(driver)
        system_admin.merge_with_another_system_button().wait_until_clickable(90)
        system_left_menu = SystemLeftMenu(driver)
        users_dropdown = system_left_menu.open_users_dropdown()
        users_dropdown.open_add_user_dialog()
        email_field = system_left_menu.add_user_email_input()
        email_field.input_text('')
        system_left_menu.add_user_modal_button().click()
        assert system_left_menu.get_error().get_text() == 'Email is required'
        email_field.input_text('noptixqagmail.com')
        system_left_menu.add_user_modal_button().click()
        assert system_left_menu.get_error().get_text() == 'Please enter a valid Email'
        email_field.input_text('@gmail.com')
        system_left_menu.add_user_modal_button().click()
        assert system_left_menu.get_error().get_text() == 'Please enter a valid Email'
        email_field.input_text('noptixqa@gmail..com')
        system_left_menu.add_user_modal_button().click()
        assert system_left_menu.get_error().get_text() == 'Please enter a valid Email'
        email_field.input_text('noptixqa@192.168.1.1.0')
        system_left_menu.add_user_modal_button().click()
        assert system_left_menu.get_error().get_text() == 'Please enter a valid Email'
        email_field.input_text('noptixqa.@gmail.com')
        system_left_menu.add_user_modal_button().click()
        assert system_left_menu.get_error().get_text() == 'Please enter a valid Email'
        email_field.input_text('noptixq..a@gmail.c')
        system_left_menu.add_user_modal_button().click()
        assert system_left_menu.get_error().get_text() == 'Please enter a valid Email'
        email_field.input_text('noptixqa@-gmail.com')
        system_left_menu.add_user_modal_button().click()
        assert system_left_menu.get_error().get_text() == 'Please enter a valid Email'
        email_field.input_text('myemail')
        system_left_menu.add_user_modal_button().click()
        assert system_left_menu.get_error().get_text() == 'Please enter a valid Email'
        email_field.input_text('myemail@')
        system_left_menu.add_user_modal_button().click()
        assert system_left_menu.get_error().get_text() == 'Please enter a valid Email'
        email_field.input_text('myemail@gmail')
        system_left_menu.add_user_modal_button().click()
        assert system_left_menu.get_error().get_text() == 'Please enter a valid Email'
        email_field.input_text('myemail@.com')
        system_left_menu.add_user_modal_button().click()
        assert system_left_menu.get_error().get_text() == 'Please enter a valid Email'
        email_field.input_text('my@email@gmail.com')
        system_left_menu.add_user_modal_button().click()
        assert system_left_menu.get_error().get_text() == 'Please enter a valid Email'
        email_field.input_text('myemail@ gmail.com')
        system_left_menu.add_user_modal_button().click()
        assert system_left_menu.get_error().get_text() == 'Please enter a valid Email'
        email_field.input_text('myemail@gmail.com;')
        system_left_menu.add_user_modal_button().click()
        assert system_left_menu.get_error().get_text() == 'Please enter a valid Email'
        email_field.input_text(' ')
        system_left_menu.add_user_modal_button().click()
        assert system_left_menu.get_error().get_text() == 'Email is required'
        email_field.input_text(' myemail@gmail.com')
        email_field.press_tab()
        system_left_menu.get_error().wait_until_not_visible()
        email_field.input_text('myemail@gmail.com ')
        email_field.press_tab()
        system_left_menu.get_error().wait_until_not_visible()
        email_field.input_text('myemail@gmail.com')
        email_field.press_tab()
        system_left_menu.get_error().wait_until_not_visible()


def users_can_disconnect_themselves(server: Mediaserver):
    """
    21. Users should be able to disconnect themselves from cloud
    This test fails on a custom user because the system's name is not present in
    the toast.
    https://networkoptix.atlassian.net/browse/CLOUD-11867
    """
    role_names = {
        "cloudAdmin": rb.ADMIN_TEXT,
        "viewer": rb.VIEWER_TEXT,
        "liveViewer": rb.LIVE_VIEWER_TEXT,
        "advancedViewer": rb.ADV_VIEWER_TEXT,
        "custom": rb.CUSTOM_TEXT}
    url = ENV + f"/systems/{server.id}"
    for role in role_names:
        with get_chrome() as driver:
            with CloudAccount(get_random_email(), "firstname", "lastname") as tmp_user:
                tmp_user.activate()
                server.share_with_user(tmp_user, role, permissions[role])
                try:
                    driver.get(url)
                    LoginDialog(driver).basic_cloud_login(tmp_user.email, tmp_user.password)
                    system_admin = SystemAdmin(driver)
                    system_admin.disconnect_from_account_button().click()
                    system_admin.disconnect_modal_warning().wait_until_visible()
                    system_admin.disconnect_modal_generic_button().click()
                    message = system_admin.disconnect_from_account_toast_notification(server.name)
                    message.wait_until_visible()
                    message.wait_until_not_visible(10)
                except Exception:
                    print("FAIL")
                    driver.save_screenshot('error.png')
                    raise
                else:
                    print(f"PASS {role}")


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
        verify_special_hints_on_permissions_dropdown(cloud_server)
        change_role_for_cloud_user(cloud_server)
        edit_permission_works_for_owner(cloud_server)
        edit_permission_works_for_cloud_admin(cloud_server)
        test_email_validation(cloud_server)
        users_can_disconnect_themselves(cloud_server)

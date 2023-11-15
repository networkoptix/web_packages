import os
import random
import string
import time

from NoptixLibrary.cloud_portal_api import CloudPortalAPI
from NoptixLibrary.suite import CloudAccount
from NoptixLibrary.suite import Suite
from pages.change_pass_form import ChangePassForm
from generic_elements import Button
from generic_elements import TextField
from pages.header import HeaderNav
from pages.landing_page import LandingPage
from pages.login import AccountActivatedPane
from pages.login import LoginDialog
from pages.register_form import RegisterForm
from email_access import get_random_email
from resource_import import get_chrome
from pages.systems_page import SystemsPage
from variables import ENV


def allows_login_with_correct_credentials_and_log_out(cloud_user: CloudAccount):
    """C24212    C24213    smoke    ci    C94717    C94719"""
    with get_chrome() as driver:
        driver.get(ENV)
        header = HeaderNav(driver)
        header.log_in_button().click()
        login = LoginDialog(driver)
        login.email_input().input_text(cloud_user.email)
        login.next_button().click()
        login.password_input().input_text(cloud_user.password)
        login.login_button().click()
        SystemsPage(driver).no_systems().wait_until_visible()
        header.account_dropdown().click()
        header.log_out_option().click()
        landing_page = LandingPage(driver)
        landing_page.wait_until_loaded()
        landing_page.location_is_correct(url=f"{ENV}/")
        print("pass")


def allows_log_in_with_existing_email_in_uppercase(cloud_user: CloudAccount):
    with get_chrome() as driver:
        driver.get(ENV)
        header = HeaderNav(driver)
        header.log_in_button().click()
        login = LoginDialog(driver)
        login.email_input().input_text(cloud_user.email.upper())
        login.next_button().click()
        login.password_input().input_text(cloud_user.password)
        login.login_button().click()
        SystemsPage(driver).no_systems().wait_until_visible()
        print("pass")


def forgot_password_page_contains_prefilled_email(cloud_user: CloudAccount):
    """
    Passes email from email input to Restore password page, even without clicking
    'Log in' button
    [Tags]    C41872
    """
    with get_chrome() as driver:
        driver.get(ENV)
        header = HeaderNav(driver)
        header.log_in_button().click()
        login = LoginDialog(driver)
        login.email_input().input_text(cloud_user.email)
        login.next_button().click()
        login.forgot_password_button().click()
        login.reset_password_email_input().wait_until_text_is(cloud_user.email)
        print("pass")


def not_activated_user_login_check():
    """
    Shows non-activated user message when not activated at login; Resend activation button sends email
    [Tags]    email    C41865
    """
    with get_chrome() as driver:
        email = get_random_email()
        password = "qweasd 123"
        url = ENV + "/authorize?client_type=create&view_type=desktop"
        driver.get(url)
        RegisterForm(driver).register_new_user("darth", "bye", email, password)
        CloudPortalAPI().activate_account_via_api(email, password)
        account_activated = AccountActivatedPane(driver)
        account_activated.wait_until_visible()
        account_activated.get_log_in_button().click()
        # Locators are hardcoded there as it is impossible to use LoginDialog's elements here
        # because the dialogs checks appearance of some elements in its constructor. But if we
        # open the page after account activation the first page used in page validation does
        # not contain email field but has password field from the very start. Has to be updated when
        # _wait_until_modal_is_visible() is removed from LoginDialog constructor.
        password_input = TextField(
            driver,
            "//nx-authorize-component//input[@id='authorizePassword']",
            )
        password_input.input_text(password)
        login_button = Button(
            driver,
            "//nx-authorize-component//nx-process-button[@data-testid='btnLogin']",
            )
        login_button.click()
        SystemsPage(driver).no_systems().wait_until_visible()
        print("pass")


def displays_password_masked(cloud_user: CloudAccount):
    with get_chrome() as driver:
        driver.get(ENV)
        header = HeaderNav(driver)
        header.log_in_button().click()
        login = LoginDialog(driver)
        login.email_input().input_text(cloud_user.email)
        login.next_button().click()
        assert login.password_input().field_type() == 'password'
        print("pass")


def requires_log_in_if_the_user_has_just_logged_out_and_pressed_back_button_in_browser(
        cloud_user: CloudAccount):
    with get_chrome() as driver:
        driver.get(ENV)
        header = HeaderNav(driver)
        header.log_in_button().click()
        login = LoginDialog(driver)
        login.email_input().input_text(cloud_user.email.upper())
        login.next_button().click()
        login.password_input().input_text(cloud_user.password)
        login.login_button().click()
        SystemsPage(driver).no_systems().wait_until_visible()
        header.account_dropdown().click()
        header.log_out_option().click()
        landing_page = LandingPage(driver)
        landing_page.wait_until_loaded()
        landing_page.location_is_correct(url=f"{ENV}/")
        driver.back()
        LoginDialog(driver)
        print("pass")


def handles_more_than_255_symbols_email_and_password(cloud_user: CloudAccount):
    # Now is not working because of CLOUD-11071
    with get_chrome() as driver:
        driver.get(ENV)
        header = HeaderNav(driver)
        header.log_in_button().click()
        login = LoginDialog(driver)
        three_hundred_chars = ''.join(random.choice(string.ascii_letters) for i in range(300))
        login.email_input().input_text(three_hundred_chars)
        assert len(login.email_input().get_text()) == 255
        login.email_input().input_text(cloud_user.email)
        login.next_button().click()
        login.password_input().input_text(three_hundred_chars)
        assert len(login.password_input().get_text()) == 255
        print("pass")


def allows_copy_paste_in_input_fields():
    with get_chrome() as driver:
        copy_paste_text = "Copy Me"
        driver.get(ENV)
        header = HeaderNav(driver)
        header.log_in_button().click()
        login = LoginDialog(driver)
        login.email_input().input_text(copy_paste_text)
        login.email_input().copy_text()
        login.email_input().clear()
        login.email_input().paste_text()
        assert login.email_input().get_text() == "Copy Me"
        print("pass")


def should_respond_to_enter_key_and_log_in(cloud_user: CloudAccount):
    with get_chrome() as driver:
        driver.get(ENV)
        header = HeaderNav(driver)
        header.log_in_button().click()
        login = LoginDialog(driver)
        login.email_input().input_text(cloud_user.email)
        login.next_button().click()
        login.password_input().input_text(cloud_user.password)
        login.password_input().press_enter()
        SystemsPage(driver).no_systems().wait_until_visible()
        print("pass")


def should_respond_to_tab_key():
    with get_chrome() as driver:
        driver.get(ENV)
        header = HeaderNav(driver)
        header.log_in_button().click()
        login = LoginDialog(driver)
        login.email_input().press_tab()
        assert login.create_account_button().is_focused()
        login.email_input().double_press_tab()
        assert login.next_button().is_focused()
        print("pass")


def handles_two_tabs_updates_second_tab_state_if_logout_is_done_on_first(cloud_user: CloudAccount):
    with get_chrome() as driver:
        driver.get(ENV + '/authorize?client_type=create')
        register_form = RegisterForm(driver)
        register_form.terms_and_conditions_link().click()
        driver.switch_to.window(driver.window_handles[1])
        driver.wait_until_number_of_tabs_are_open(2)
        assert driver.current_url == ENV + '/content/eula'
        driver.get(ENV)
        header = HeaderNav(driver)
        header.log_in_button().click()
        login = LoginDialog(driver)
        login.email_input().input_text(cloud_user.email)
        login.next_button().click()
        login.password_input().input_text(cloud_user.password)
        login.login_button().click()
        SystemsPage(driver).no_systems().wait_until_visible()
        driver.switch_to.window(driver.window_handles[0])
        assert driver.current_url == ENV + '/authorize?client_type=create'
        driver.get(ENV)
        SystemsPage(driver).no_systems().wait_until_visible()
        header.account_dropdown().click()
        header.log_out_option().click()
        landing_page = LandingPage(driver)
        landing_page.wait_until_loaded()
        landing_page.location_is_correct(url=f"{ENV}/")
        driver.switch_to.window(driver.window_handles[1])
        LoginDialog(driver)
        print("pass")


def log_in_more_than_5_times(cloud_user: CloudAccount):
    """
    [Tags]    C42075
    """
    with get_chrome() as driver:
        wrong_password = "wrong 123"
        driver.get(ENV)
        header = HeaderNav(driver)
        header.log_in_button().click()
        login = LoginDialog(driver)
        login.email_input().input_text(cloud_user.email)
        login.next_button().click()
        for attempt in range(6):
            login.password_input().input_text(wrong_password)
            login.login_button().click()
            time.sleep(1)
        login.wait_until_has_too_many_attempts_error()
        time.sleep(65)
        login.password_input().input_text(cloud_user.password)
        login.login_button().click()
        SystemsPage(driver).no_systems().wait_until_visible()
        print("pass")


def user_is_logged_out_of_browser_after_a_password_change_in_another_browser(
        cloud_user: CloudAccount):
    """
    [Tags]    C41837
    """
    with get_chrome() as driver1:
        driver1.get(ENV)
        header = HeaderNav(driver1)
        header.log_in_button().click()
        login = LoginDialog(driver1)
        login.email_input().input_text(cloud_user.email)
        login.next_button().click()
        login.password_input().input_text(cloud_user.password)
        login.login_button().click()
        SystemsPage(driver1).no_systems().wait_until_visible()
        with get_chrome() as driver2:
            driver2.get(ENV)
            header = HeaderNav(driver2)
            header.log_in_button().click()
            login = LoginDialog(driver2)
            login.email_input().input_text(cloud_user.email)
            login.next_button().click()
            login.password_input().input_text(cloud_user.password)
            login.login_button().click()
            SystemsPage(driver2).no_systems().wait_until_visible()
            header.account_dropdown().click()
            header.change_password_option().click()
            change_pass_form = ChangePassForm(driver2)
            change_pass_form.verify_form_is_visible()
            change_pass_form.current_password_input().input_text(cloud_user.password)
            new_password = "newpass 123"
            change_pass_form.new_password_input().input_text(new_password)
            change_pass_form.save_button().click()
            driver1.refresh()
            LandingPage(driver1).wait_until_loaded()
            print("pass")


if __name__ == "__main__":
    suite_name = os.path.basename(__file__)
    suite_name = suite_name.replace("test_", "").replace(".py", "")
    with Suite() as suite:
        cloud_account = suite.create_cloud_account()
        allows_login_with_correct_credentials_and_log_out(cloud_account)
        allows_log_in_with_existing_email_in_uppercase(cloud_account)
        forgot_password_page_contains_prefilled_email(cloud_account)
        not_activated_user_login_check()
        displays_password_masked(cloud_account)
        requires_log_in_if_the_user_has_just_logged_out_and_pressed_back_button_in_browser(
            cloud_account)
        handles_more_than_255_symbols_email_and_password(cloud_account)
        allows_copy_paste_in_input_fields()
        should_respond_to_enter_key_and_log_in(cloud_account)
        should_respond_to_tab_key()
        handles_two_tabs_updates_second_tab_state_if_logout_is_done_on_first(cloud_account)
        log_in_more_than_5_times(cloud_account)
        user_is_logged_out_of_browser_after_a_password_change_in_another_browser(cloud_account)

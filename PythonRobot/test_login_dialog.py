import random
import string
import time

import resource_import
from generic_elements import Button
from generic_elements import TextField
from header import HeaderNav
from landing_page import LandingPage
from login import AccountActivatedPane
from login import LoginDialog
from register_form import RegisterForm
from resource_import import get_chrome
from resource_import import register_and_activate_account
from systems_page import SystemsPage
from variables import ENV


def allows_login_with_correct_credentials_and_log_out():
    """C24212    C24213    smoke    ci    C94717    C94719"""
    with get_chrome() as driver:
        email = resource_import.get_random_email()
        password = "qweasd 123"
        register_and_activate_account(driver, "Mark", "Hamill", email, password)
        driver.get(ENV)
        header = HeaderNav(driver)
        header.log_in_button().click()
        login = LoginDialog(driver)
        login.email_input().input_text(email)
        login.next_button().click()
        login.password_input().input_text(password)
        login.login_button().click()
        SystemsPage(driver).no_systems()
        header.account_dropdown().click()
        header.log_out_option().click()
        LandingPage(driver)
        print("pass")


def allows_log_in_with_existing_email_in_uppercase():
    with get_chrome() as driver:
        email = resource_import.get_random_email()
        password = "qweasd 123"
        register_and_activate_account(driver, "Mark", "Hamill", email, password)
        driver.get(ENV)
        header = HeaderNav(driver)
        header.log_in_button().click()
        login = LoginDialog(driver)
        login.email_input().input_text(email.upper())
        login.next_button().click()
        login.password_input().input_text(password)
        login.login_button().click()
        SystemsPage(driver).no_systems()
        print("pass")


def forgot_password_page_contains_prefilled_email():
    """
    Passes email from email input to Restore password page, even without clicking
    'Log in' button
    [Tags]    C41872
    """
    with get_chrome() as driver:
        email = resource_import.get_random_email()
        password = "qweasd 123"
        register_and_activate_account(driver, "Mark", "Hamill", email, password)
        driver.get(ENV)
        header = HeaderNav(driver)
        header.log_in_button().click()
        login = LoginDialog(driver)
        login.email_input().input_text(email)
        login.next_button().click()
        login.forgot_password_button().click()
        login.reset_password_email_input().wait_until_text_is(email)
        print("pass")


def not_activated_user_login_check():
    """
    Shows non-activated user message when not activated at login; Resend activation button sends email
    [Tags]    email    C41865
    """
    with get_chrome() as driver:
        email = resource_import.get_random_email()
        password = "qweasd 123"
        driver.get(ENV + '/register')
        resource_import.register(driver, "darth", "bye", email, password, view_type="desktop")
        resource_import.activate(driver, email, password)
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
        SystemsPage(driver).no_systems()
        print("pass")


def displays_password_masked():
    with get_chrome() as driver:
        email = resource_import.get_random_email()
        password = "qweasd 123"
        register_and_activate_account(driver, "Mark", "Hamill", email, password)
        driver.get(ENV)
        header = HeaderNav(driver)
        header.log_in_button().click()
        login = LoginDialog(driver)
        login.email_input().input_text(email)
        login.next_button().click()
        assert login.password_input().field_type() == 'password'
        print("pass")


def requires_log_in_if_the_user_has_just_logged_out_and_pressed_back_button_in_browser():
    with get_chrome() as driver:
        email = resource_import.get_random_email()
        password = "qweasd 123"
        register_and_activate_account(driver, "Mark", "Hamill", email, password)
        driver.get(ENV)
        header = HeaderNav(driver)
        header.log_in_button().click()
        login = LoginDialog(driver)
        login.email_input().input_text(email.upper())
        login.next_button().click()
        login.password_input().input_text(password)
        login.login_button().click()
        SystemsPage(driver).no_systems()
        header.account_dropdown().click()
        header.log_out_option().click()
        LandingPage(driver)
        driver.back()
        LoginDialog(driver)
        print("pass")


def handles_more_than_255_symbols_email_and_password():
    # Now is not working because of CLOUD-11071
    with get_chrome() as driver:
        email = resource_import.get_random_email()
        password = "qweasd 123"
        register_and_activate_account(driver, "Mark", "Hamill", email, password)
        driver.get(ENV)
        header = HeaderNav(driver)
        header.log_in_button().click()
        login = LoginDialog(driver)
        three_hundred_chars = ''.join(random.choice(string.ascii_letters) for i in range(300))
        login.email_input().input_text(three_hundred_chars)
        assert len(login.email_input().get_text()) == 255
        login.email_input().input_text(email)
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


def should_respond_to_enter_key_and_log_in():
    with get_chrome() as driver:
        email = resource_import.get_random_email()
        password = "qweasd 123"
        register_and_activate_account(driver, "Mark", "Hamill", email, password)
        driver.get(ENV)
        header = HeaderNav(driver)
        header.log_in_button().click()
        login = LoginDialog(driver)
        login.email_input().input_text(email)
        login.next_button().click()
        login.password_input().input_text(password)
        login.password_input().press_enter()
        SystemsPage(driver).no_systems()
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


def handles_two_tabs_updates_second_tab_state_if_logout_is_done_on_first():
    with get_chrome() as driver:
        driver.get(ENV + '/authorize?client_type=create')
        register_form = RegisterForm(driver)
        register_form.terms_and_conditions_link().click()
        driver.switch_to.window(driver.window_handles[1])
        driver.wait_until_number_of_tabs_are_open(2)
        assert driver.current_url == ENV + '/content/eula'
        email = resource_import.get_random_email()
        password = "qweasd 123"
        register_and_activate_account(driver, "Mark", "Hamill", email, password)
        driver.get(ENV)
        header = HeaderNav(driver)
        header.log_in_button().click()
        login = LoginDialog(driver)
        login.email_input().input_text(email)
        login.next_button().click()
        login.password_input().input_text(password)
        login.login_button().click()
        SystemsPage(driver).no_systems()
        driver.switch_to.window(driver.window_handles[0])
        assert driver.current_url == ENV + '/authorize?client_type=create'
        driver.get(ENV)
        SystemsPage(driver).no_systems()
        header.account_dropdown().click()
        header.log_out_option().click()
        LandingPage(driver)
        driver.switch_to.window(driver.window_handles[1])
        LoginDialog(driver)
        print("pass")


def log_in_more_than_5_times():
    """
    [Tags]    C42075
    """
    with get_chrome() as driver:
        email = resource_import.get_random_email()
        password = "qweasd 123"
        wrong_password = "wrong 123"
        register_and_activate_account(driver, "Mark", "Hamill", email, password)
        driver.get(ENV)
        header = HeaderNav(driver)
        header.log_in_button().click()
        login = LoginDialog(driver)
        login.email_input().input_text(email)
        login.next_button().click()
        for attempt in range(6):
            login.password_input().input_text(wrong_password)
            login.login_button().click()
            time.sleep(1)
        login.wait_until_has_too_many_attempts_error()
        time.sleep(65)
        login.password_input().input_text(password)
        login.login_button().click()
        SystemsPage(driver).no_systems()
        print("pass")


if __name__ == "__main__":
    allows_login_with_correct_credentials_and_log_out()
    allows_log_in_with_existing_email_in_uppercase()
    forgot_password_page_contains_prefilled_email()
    not_activated_user_login_check()
    displays_password_masked()
    requires_log_in_if_the_user_has_just_logged_out_and_pressed_back_button_in_browser()
    handles_more_than_255_symbols_email_and_password()
    allows_copy_paste_in_input_fields()
    should_respond_to_enter_key_and_log_in()
    should_respond_to_tab_key()
    handles_two_tabs_updates_second_tab_state_if_logout_is_done_on_first()
    log_in_more_than_5_times()

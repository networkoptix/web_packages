import resource_import
from header import HeaderNav
from landing_page import LandingPage
from login import LoginDialog
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


if __name__ == "__main__":
    allows_login_with_correct_credentials_and_log_out()
    allows_log_in_with_existing_email_in_uppercase()
    forgot_password_page_contains_prefilled_email()

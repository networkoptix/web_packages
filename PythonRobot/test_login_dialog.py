import resource_import
from NoptixLibrary.cloud_portal_api import CloudPortalAPI
from NoptixLibrary.generic_keywords import GenericKeywords
from header import HeaderNav
from landing_page import LandingPage
from login import LoginDialog
from resource_import import get_headless_chrome
from resource_import import register_and_activate_account
from systems_page import SystemsPage
from variables import ENV

password = "qweasd 123"

keywords = GenericKeywords()
CLOUD_API = CloudPortalAPI()


def allows_login_with_correct_credentials_and_log_out():
    driver = get_headless_chrome()
    email = resource_import.get_random_email()
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

    driver.quit()
    print("pass")


if __name__ == "__main__":
    allows_login_with_correct_credentials_and_log_out()
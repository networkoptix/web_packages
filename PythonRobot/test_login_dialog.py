import time
from selenium import webdriver

from resource_import import get_headless_chrome, register_and_activate_account, get_random_email
from NoptixLibrary.CloudPortalAPI import CloudPortalAPI
from variables import ENV
import robot_keywords
from login import LoginDialog
from header import HeaderNav
from landing_page import LandingPage

from NoptixLibrary.GenericKeywords import GenericKeywords
from RobotVariables import RobotVariables
from systems_page import SystemsPage
import resource_import

password = "qweasd 123"

keywords = GenericKeywords()
CLOUD_API = CloudPortalAPI()


def allows_login_with_correct_credentials_and_log_out():
    driver = get_headless_chrome()
    email = resource_import.get_random_email()
    register_and_activate_account(driver, "Mark", "Hamill", email, password)
    robot_keywords.go_to_url(driver, ENV)
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

    robot_keywords.close_browser(driver)
    print("pass")


if __name__ == "__main__":
    allows_login_with_correct_credentials_and_log_out()
import time

from selenium import webdriver

import resource_import
from resource_import import get_headless_chrome, register_and_activate_account

from variables import ENV
from test_account import cloud_login
import robot_keywords
from RobotVariables import RobotVariables
from login import LoginDialog
from header import HeaderNav
from change_pass_form import ChangePassForm
from landing_page import LandingPage
from selenium.webdriver.common.keys import Keys

password = "qweasd 123"
# login = ""
rb = RobotVariables("en_US")


def sets_new_password_and_successfully_logs_in():
    driver = get_headless_chrome()
    email = resource_import.get_random_email()
    register_and_activate_account(driver, "Mark", "Hamill", email, password)
    robot_keywords.go_to_url(driver, ENV)
    header = HeaderNav(driver)
    header.log_in_button().click()

    login = LoginDialog(driver)
    login.email_input().input_text(email)
    login.next_button().click()
    login.forgot_password_button().click()
    time.sleep(3)
    assert login.reset_password_email_input().get_text() == email, "Email was not autofilled in the field"
    login.reset_password_button().click()
    # Todo: get code from email and confirm password

def check_restore_password_email():
    # Todo: check email
    pass


if __name__ == "__main__":
    sets_new_password_and_successfully_logs_in()

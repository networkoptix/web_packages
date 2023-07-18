import time

from selenium import webdriver

import resource
from resource import get_headless_chrome, register_and_activate_account

from variables import ENV
from account import cloud_login
import robot_keywords
from RobotVariables import RobotVariables
from login import LoginDialog
from header import HeaderNav
from change_pass_form import ChangePassForm
from landing_page import LandingPage
from selenium.webdriver.common.keys import Keys

password = "qweasd 123"
#login = ""
rb = RobotVariables("en_US")


def can_be_accessed_via_dropdown():
    driver = get_headless_chrome()
    email = resource.get_random_email()
    register_and_activate_account(driver, "Mark", "Hamill", email, "qweasd 123")
    robot_keywords.go_to_url(driver, ENV)
    robot_keywords.wait_until_element_is_visible(driver, rb.LOG_IN_NAV_BAR)
    robot_keywords.click_element(driver, rb.LOG_IN_NAV_BAR)

    LoginDialog(driver).basic_cloud_login(email, "qweasd 123")
    header = HeaderNav(driver)
    header.account_dropdown().click()
    header.change_password_option().click()

    ChangePassForm(driver).verify_form_is_visible()
    robot_keywords.close_browser(driver)
    print("pass")


def can_be_accessed_via_direct_url():
    driver = get_headless_chrome()
    email = resource.get_random_email()
    register_and_activate_account(driver, "Mark", "Hamill", email, "qweasd 123")
    robot_keywords.go_to_url(driver, f"{ENV}/account/password")
    LoginDialog(driver).basic_cloud_login(email, "qweasd 123")
    ChangePassForm(driver).verify_form_is_visible()
    robot_keywords.close_browser(driver)
    print("pass")


def password_is_actually_changed_and_login_works_with_new_password():
    driver = get_headless_chrome()
    email = resource.get_random_email()
    register_and_activate_account(driver, "Mark", "Hamill", email, "qweasd 123")
    robot_keywords.go_to_url(driver, f"{ENV}/account/password")
    LoginDialog(driver).basic_cloud_login(email, "qweasd 123")

    change_pass_form = ChangePassForm(driver)
    change_pass_form.current_password_input().input_text("qweasd 123")
    change_pass_form.new_password_input().input_text("qweasd1234")
    change_pass_form.save_button().click()

    time.sleep(1)
    HeaderNav(driver).log_out()
    LandingPage(driver)

    header = HeaderNav(driver)
    header.log_in_button().click()
    login_dialog = LoginDialog(driver)
    login_dialog.email_input().input_text(email)
    login_dialog.next_button().click()
    login_dialog.password_input().input_text("qweasd 123")
    login_dialog.login_button().click()
    login_dialog.password_input_error_message()

    robot_keywords.close_browser(driver)
    print("pass")

def password_with_symbols_is_valid():
    driver = get_headless_chrome()
    email = resource.get_random_email()
    register_and_activate_account(driver, "Mark", "Hamill", email, "qweasd 123")
    robot_keywords.go_to_url(driver, f"{ENV}/account/password")
    LoginDialog(driver).basic_cloud_login(email, "qweasd 123")

    change_pass_form = ChangePassForm(driver)
    change_pass_form.current_password_input().input_text("qweasd 123")
    change_pass_form.new_password_input().input_text('''pass!@#$%^&*()_-+=;:'"`~,./\|?[]{}''')
    change_pass_form.save_button().click()

    time.sleep(1)
    HeaderNav(driver).log_out()
    LandingPage(driver)

    header = HeaderNav(driver)
    header.log_in_button().click()
    login_dialog = LoginDialog(driver)
    login_dialog.email_input().input_text(email)
    login_dialog.next_button().click()
    login_dialog.password_input().input_text("qweasd 123")
    login_dialog.login_button().click()
    login_dialog.password_input_error_message()

    robot_keywords.close_browser(driver)
    print("pass")

def password_with_space_in_the_middle_is_valid():
    driver = get_headless_chrome()
    email = resource.get_random_email()
    register_and_activate_account(driver, "Mark", "Hamill", email, "qweasd 123")
    robot_keywords.go_to_url(driver, f"{ENV}/account/password")
    LoginDialog(driver).basic_cloud_login(email, "qweasd 123")

    change_pass_form = ChangePassForm(driver)
    change_pass_form.current_password_input().input_text("qweasd 123")
    change_pass_form.new_password_input().input_text('qwea sd 123')
    change_pass_form.save_button().click()
    change_pass_form.no_unsaved_changes_message()

    HeaderNav(driver).log_out()
    LandingPage(driver)

    header = HeaderNav(driver)
    header.log_in_button().click()
    login_dialog = LoginDialog(driver)
    login_dialog.email_input().input_text(email)
    login_dialog.next_button().click()
    login_dialog.password_input().input_text("qweasd 123")
    login_dialog.login_button().click()
    login_dialog.password_input_error_message()

    robot_keywords.close_browser(driver)
    print("pass")

def pressing_enter_key_saves_data():
    driver = get_headless_chrome()
    email = resource.get_random_email()
    register_and_activate_account(driver, "Mark", "Hamill", email, "qweasd 123")
    robot_keywords.go_to_url(driver, f"{ENV}/account/password")
    LoginDialog(driver).basic_cloud_login(email, "qweasd 123")

    change_pass_form = ChangePassForm(driver)
    change_pass_form.current_password_input().input_text("qweasd 123")
    change_pass_form.new_password_input().input_text('qweasd 123')
    change_pass_form.new_password_input().input_text(Keys.ENTER)

    change_pass_form.no_unsaved_changes_message()
    robot_keywords.close_browser(driver)
    print("pass")


if __name__ == "__main__":
    can_be_accessed_via_dropdown()
    can_be_accessed_via_direct_url()
    password_is_actually_changed_and_login_works_with_new_password()
    password_with_symbols_is_valid()
    password_with_space_in_the_middle_is_valid()
    pressing_enter_key_saves_data()
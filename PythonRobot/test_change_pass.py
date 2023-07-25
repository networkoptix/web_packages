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

def can_be_accessed_via_dropdown():
    driver = get_headless_chrome()
    email = resource_import.get_random_email()
    register_and_activate_account(driver, "Mark", "Hamill", email, password)
    robot_keywords.go_to_url(driver, ENV)
    header = HeaderNav(driver)
    header.log_in_button().click()
    LoginDialog(driver).basic_cloud_login(email, password)
    header = HeaderNav(driver)
    header.account_dropdown().click()
    header.change_password_option().click()

    ChangePassForm(driver).verify_form_is_visible()
    robot_keywords.close_browser(driver)
    print("pass")


def can_be_accessed_via_direct_url():
    driver = get_headless_chrome()
    email = resource_import.get_random_email()
    register_and_activate_account(driver, "Mark", "Hamill", email, password)
    robot_keywords.go_to_url(driver, f"{ENV}/account/password")
    LoginDialog(driver).basic_cloud_login(email, password)
    ChangePassForm(driver).verify_form_is_visible()
    robot_keywords.close_browser(driver)
    print("pass")


def password_is_actually_changed_and_login_works_with_new_password():
    driver = get_headless_chrome()
    email = resource_import.get_random_email()
    register_and_activate_account(driver, "Mark", "Hamill", email, password)
    robot_keywords.go_to_url(driver, f"{ENV}/account/password")
    LoginDialog(driver).basic_cloud_login(email, password)

    change_pass_form = ChangePassForm(driver)
    change_pass_form.current_password_input().input_text(password)
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
    login_dialog.password_input().input_text(password)
    login_dialog.login_button().click()
    login_dialog.password_input_error_message()

    robot_keywords.close_browser(driver)
    print("pass")


def password_with_symbols_is_valid():
    driver = get_headless_chrome()
    email = resource_import.get_random_email()
    register_and_activate_account(driver, "Mark", "Hamill", email, password)
    robot_keywords.go_to_url(driver, f"{ENV}/account/password")
    LoginDialog(driver).basic_cloud_login(email, password)

    change_pass_form = ChangePassForm(driver)
    change_pass_form.current_password_input().input_text(password)
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
    login_dialog.password_input().input_text(password)
    login_dialog.login_button().click()
    login_dialog.password_input_error_message()

    robot_keywords.close_browser(driver)
    print("pass")


def password_with_space_in_the_middle_is_valid():
    driver = get_headless_chrome()
    email = resource_import.get_random_email()
    register_and_activate_account(driver, "Mark", "Hamill", email, password)
    robot_keywords.go_to_url(driver, f"{ENV}/account/password")
    LoginDialog(driver).basic_cloud_login(email, password)

    change_pass_form = ChangePassForm(driver)
    change_pass_form.current_password_input().input_text(password)
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
    login_dialog.password_input().input_text(password)
    login_dialog.login_button().click()
    login_dialog.password_input_error_message()

    robot_keywords.close_browser(driver)
    print("pass")


def pressing_enter_key_saves_data():
    driver = get_headless_chrome()
    email = resource_import.get_random_email()
    register_and_activate_account(driver, "Mark", "Hamill", email, password)
    robot_keywords.go_to_url(driver, f"{ENV}/account/password")
    LoginDialog(driver).basic_cloud_login(email, password)

    change_pass_form = ChangePassForm(driver)
    change_pass_form.current_password_input().input_text(password)
    change_pass_form.new_password_input().input_text(password)
    change_pass_form.new_password_input().input_text(Keys.ENTER)

    change_pass_form.no_unsaved_changes_message()
    robot_keywords.close_browser(driver)
    print("pass")


def pressing_tab_key_moves_focus_to_the_next_element():
    driver = get_headless_chrome()
    email = resource_import.get_random_email()
    register_and_activate_account(driver, "Mark", "Hamill", email, password)
    robot_keywords.go_to_url(driver, f"{ENV}/account/password")
    LoginDialog(driver).basic_cloud_login(email, password)

    change_pass_form = ChangePassForm(driver)
    change_pass_form.current_password_input().input_text(password)
    change_pass_form.current_password_input().input_text(Keys.TAB)

    if not change_pass_form.new_password_input().is_focused:
        raise RuntimeError("Element was not focused")
    change_pass_form.new_password_input().input_text(password)
    change_pass_form.new_password_input().input_text(Keys.TAB)

    if not change_pass_form.save_button().is_focused:
        raise RuntimeError("Element was not focused")

    robot_keywords.close_browser(driver)
    print("pass")

def displays_password_masked_shows_password_and_changes_eye_icon_when_clicked():
    driver = get_headless_chrome()
    email = resource_import.get_random_email()
    register_and_activate_account(driver, "Mark", "Hamill", email, password)
    robot_keywords.go_to_url(driver, f"{ENV}/account/password")
    LoginDialog(driver).basic_cloud_login(email, password)

    change_pass_form = ChangePassForm(driver)
    if change_pass_form.current_password_input().field_type() != 'password':
        raise RuntimeError("Current password field was not of password type")
    if change_pass_form.new_password_input().field_type() != 'password':
        raise RuntimeError("New password field was not of password type")
    change_pass_form.current_password_eye_icon_closed().click()
    change_pass_form.current_password_eye_icon_open()
    if change_pass_form.new_password_input().field_type() != 'text':
        raise RuntimeError("New password field was not of text type")
    change_pass_form.current_password_eye_icon_open().click()
    change_pass_form.current_password_eye_icon_closed()
    if change_pass_form.new_password_input().field_type() != 'password':
        raise RuntimeError("New password field was not of password type")

    robot_keywords.close_browser(driver)
    print("pass")

if __name__ == "__main__":
    can_be_accessed_via_dropdown()
    can_be_accessed_via_direct_url()
    password_is_actually_changed_and_login_works_with_new_password()
    password_with_symbols_is_valid()
    password_with_space_in_the_middle_is_valid()
    pressing_enter_key_saves_data()
    pressing_tab_key_moves_focus_to_the_next_element()
    displays_password_masked_shows_password_and_changes_eye_icon_when_clicked()
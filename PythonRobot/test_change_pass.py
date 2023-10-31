import time

from selenium.webdriver.common.keys import Keys

from RobotVariables import RobotVariables
from pages.change_pass_form import ChangePassForm
from pages.header import HeaderNav
from pages.landing_page import LandingPage
from pages.login import LoginDialog
from email_access import get_random_email
from resource_import import get_chrome
from resource_import import register_and_activate_account
from variables import ENV

password = "qweasd 123"
rb = RobotVariables("en_US")


def can_be_accessed_via_dropdown():
    with get_chrome() as driver:
        email = get_random_email()
        register_and_activate_account(driver, "Mark", "Hamill", email, password)
        driver.get(ENV)
        header = HeaderNav(driver)
        header.log_in_button().click()
        LoginDialog(driver).basic_cloud_login(email, password)
        header = HeaderNav(driver)
        header.account_dropdown().click()
        header.change_password_option().click()
        ChangePassForm(driver).verify_form_is_visible()
        print("pass")


def can_be_accessed_via_direct_url():
    with get_chrome() as driver:
        email = get_random_email()
        register_and_activate_account(driver, "Mark", "Hamill", email, password)
        driver.get(f"{ENV}/account/password")
        LoginDialog(driver).basic_cloud_login(email, password)
        ChangePassForm(driver).verify_form_is_visible()
        print("pass")


def password_is_actually_changed_and_login_works_with_new_password():
    with get_chrome() as driver:
        email = get_random_email()
        register_and_activate_account(driver, "Mark", "Hamill", email, password)
        driver.get(f"{ENV}/account/password")
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
        print("pass")


def password_with_symbols_is_valid():
    with get_chrome() as driver:
        email = get_random_email()
        register_and_activate_account(driver, "Mark", "Hamill", email, password)
        driver.get(f"{ENV}/account/password")
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
        print("pass")


def password_with_space_in_the_middle_is_valid():
    with get_chrome() as driver:
        email = get_random_email()
        register_and_activate_account(driver, "Mark", "Hamill", email, password)
        driver.get(f"{ENV}/account/password")
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
        print("pass")


def pressing_enter_key_saves_data():
    with get_chrome() as driver:
        email = get_random_email()
        register_and_activate_account(driver, "Mark", "Hamill", email, password)
        driver.get(f"{ENV}/account/password")
        LoginDialog(driver).basic_cloud_login(email, password)
        change_pass_form = ChangePassForm(driver)
        change_pass_form.current_password_input().input_text(password)
        change_pass_form.new_password_input().input_text(password)
        change_pass_form.new_password_input().input_text(Keys.ENTER)
        change_pass_form.no_unsaved_changes_message()
        print("pass")


def pressing_tab_key_moves_focus_to_the_next_element():
    with get_chrome() as driver:
        email = get_random_email()
        register_and_activate_account(driver, "Mark", "Hamill", email, password)
        driver.get(f"{ENV}/account/password")
        LoginDialog(driver).basic_cloud_login(email, password)
        change_pass_form = ChangePassForm(driver)
        change_pass_form.current_password_input().input_text(password)
        change_pass_form.current_password_input().input_text(Keys.TAB)
        assert change_pass_form.new_password_input().is_focused
        change_pass_form.new_password_input().input_text(password)
        change_pass_form.new_password_input().input_text(Keys.TAB)
        assert change_pass_form.save_button().is_focused()
        print("pass")


def displays_password_masked_shows_password_and_changes_eye_icon_when_clicked():
    with get_chrome() as driver:
        email = get_random_email()
        register_and_activate_account(driver, "Mark", "Hamill", email, password)
        driver.get(f"{ENV}/account/password")
        LoginDialog(driver).basic_cloud_login(email, password)
        change_pass_form = ChangePassForm(driver)
        assert change_pass_form.current_password_input().field_type() == 'password'
        assert change_pass_form.new_password_input().field_type() == 'password'
        change_pass_form.current_password_eye_icon_closed().click()
        change_pass_form.current_password_eye_icon_open()
        assert change_pass_form.new_password_input().field_type() == 'text'
        change_pass_form.current_password_eye_icon_open().click()
        change_pass_form.current_password_eye_icon_closed()
        assert change_pass_form.new_password_input().field_type() == 'password'
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

import random
import string
import time

from NoptixLibrary.suite import Suite
from RobotVariables import RobotVariables
from browsers.chrome import get_chrome
from pages.change_pass_form import ChangePassForm
from pages.header import HeaderNav
from pages.login import LoginDialog
from variables import ENV

rb = RobotVariables("en_US")


def can_be_accessed_via_dropdown(user):
    with get_chrome() as driver:
        driver.get(ENV)
        header = HeaderNav(driver)
        header.log_in_button().click()
        LoginDialog(driver).basic_cloud_login(user.email, user.password)
        header = HeaderNav(driver)
        header.account_dropdown().click()
        header.change_password_option().click()
        ChangePassForm(driver).verify_form_is_visible()
    print("pass")


def can_be_accessed_via_direct_url(user):
    with get_chrome() as driver:
        driver.get(f"{ENV}/account/password")
        LoginDialog(driver).basic_cloud_login(user.email, user.password)
        ChangePassForm(driver).verify_form_is_visible()
    print("pass")


def password_is_actually_changed_and_login_works_with_new_password(driver, user):
    driver.get(f"{ENV}/account/password")
    LoginDialog(driver).basic_cloud_login(user.email, user.password)

    change_pass_form = ChangePassForm(driver)
    change_pass_form.current_password_input().input_text(user.password)
    new_password = "qweasd1234"
    change_pass_form.new_password_input().input_text(new_password)
    change_pass_form.save_button().click()
    time.sleep(1)
    HeaderNav(driver).log_out()
    header = HeaderNav(driver)
    header.log_in_button().click()
    login_dialog = LoginDialog(driver)
    login_dialog.email_input().input_text(user.email)
    login_dialog.next_button().click()
    login_dialog.password_input().input_text(user.password)
    login_dialog.login_button().click()
    login_dialog.password_input_error_message()
    user.password = new_password


def password_with_symbols_is_valid(user):
    with get_chrome() as driver:
        driver.get(f"{ENV}/account/password")
        LoginDialog(driver).basic_cloud_login(user.email, user.password)

        change_pass_form = ChangePassForm(driver)
        change_pass_form.current_password_input().input_text(user.password)
        new_password = r"""pass!@#$%^&*()_-+=;:'"`~,./\|?[]{}"""
        change_pass_form.new_password_input().input_text(new_password)
        change_pass_form.save_button().click()
        time.sleep(1)
        HeaderNav(driver).log_out()
        header = HeaderNav(driver)
        header.log_in_button().click()
        login_dialog = LoginDialog(driver)
        login_dialog.email_input().input_text(user.email)
        login_dialog.next_button().click()
        login_dialog.password_input().input_text(user.password)
        login_dialog.login_button().click()
        login_dialog.password_input_error_message()
        user.password = new_password
    print("pass")


def password_with_space_in_the_middle_is_valid(user):
    with get_chrome() as driver:
        driver.get(f"{ENV}/account/password")
        LoginDialog(driver).basic_cloud_login(user.email, user.password)

        change_pass_form = ChangePassForm(driver)
        change_pass_form.current_password_input().input_text(user.password)
        new_password = 'qwea sd 123'
        change_pass_form.new_password_input().input_text(new_password)
        change_pass_form.save_button().click()
        change_pass_form.no_unsaved_changes_message()

        time.sleep(1)
        HeaderNav(driver).log_out()
        header = HeaderNav(driver)

        header.log_in_button().click()
        login_dialog = LoginDialog(driver)
        login_dialog.email_input().input_text(user.email)
        login_dialog.next_button().click()
        login_dialog.password_input().input_text(user.password)
        login_dialog.login_button().click()
        login_dialog.password_input_error_message()
        user.password = new_password
    print("pass")


def pressing_enter_key_saves_data(user):
    with get_chrome() as driver:
        driver.get(f"{ENV}/account/password")
        LoginDialog(driver).basic_cloud_login(user.email, user.password)

        change_pass_form = ChangePassForm(driver)
        change_pass_form.current_password_input().input_text(user.password)
        change_pass_form.new_password_input().input_text(user.password)
        change_pass_form.new_password_input().press_enter()

        change_pass_form.no_unsaved_changes_message()
    print("pass")


def pressing_tab_key_moves_focus_to_the_next_element(user):
    with get_chrome() as driver:
        driver.get(f"{ENV}/account/password")
        LoginDialog(driver).basic_cloud_login(user.email, user.password)

        change_pass_form = ChangePassForm(driver)
        change_pass_form.current_password_input().input_text(user.password)
        change_pass_form.current_password_input().press_tab()

        assert change_pass_form.new_password_input().is_focused(), "New password input was not focused"
        change_pass_form.new_password_input().input_text(user.password)
        change_pass_form.new_password_input().press_tab()

        assert change_pass_form.save_button().is_focused(), "Save button was not focused"
    print("pass")


def displays_password_masked_shows_password_and_changes_eye_icon_when_clicked(user):
    with get_chrome() as driver:
        driver.get(f"{ENV}/account/password")
        LoginDialog(driver).basic_cloud_login(user.email, user.password)

        change_pass_form = ChangePassForm(driver)
        assert change_pass_form.current_password_input().field_type() == 'password'
        assert change_pass_form.new_password_input().field_type() == 'password'
        change_pass_form.current_password_eye_icon_closed().click()
        change_pass_form.current_password_eye_icon_open().wait_until_visible()
        assert change_pass_form.new_password_input().field_type() == 'text'
        change_pass_form.current_password_eye_icon_open().click()
        change_pass_form.current_password_eye_icon_closed()
        assert change_pass_form.new_password_input().field_type() == 'password'
    print("pass")


def new_password_is_trimmed_to_255_character(user):
    three_hundred_chars = "".join(random.choices(string.ascii_letters, k=300))
    two_fifty_five_chars = three_hundred_chars[:255]
    with get_chrome() as driver:
        driver.get(f"{ENV}/account/password")
        LoginDialog(driver).basic_cloud_login(user.email, user.password)

        change_pass_form = ChangePassForm(driver)
        change_pass_form.new_password_input().input_text(three_hundred_chars)
        assert two_fifty_five_chars == change_pass_form.new_password_input().get_text()
    print("pass")


def incorrect_or_empty_old_password_prevents_password_change(user):
    with get_chrome() as driver:
        driver.get(f"{ENV}/account/password")
        LoginDialog(driver).basic_cloud_login(user.email, user.password)

        change_pass_form = ChangePassForm(driver)
        change_pass_form.new_password_input().input_text(user.password)
        assert not change_pass_form.save_button().is_enabled(), "Save button was not disabled"
        change_pass_form.new_password_input().clear()
        change_pass_form.current_password_input().input_text("incorrectpassword")
        change_pass_form.save_button().click()
        invalid_pass_toast = change_pass_form.invalid_current_password_toast()
        invalid_pass_toast.wait_until_visible()
        assert invalid_pass_toast.get_text() == f"{rb.CANNOT_SAVE_PASSWORD}: {rb.PASSWORD_INCORRECT}"
        invalid_pass_toast.wait_until_not_visible()


if __name__ == "__main__":
    with Suite() as suite:
        user = suite.create_cloud_account()
        can_be_accessed_via_dropdown(user)
        can_be_accessed_via_direct_url(user)
        password_is_actually_changed_and_login_works_with_new_password(user)
        password_with_symbols_is_valid(user)
        password_with_space_in_the_middle_is_valid(user)
        pressing_enter_key_saves_data(user)
        pressing_tab_key_moves_focus_to_the_next_element(user)
        displays_password_masked_shows_password_and_changes_eye_icon_when_clicked(user)
        new_password_is_trimmed_to_255_character(user)
        incorrect_or_empty_old_password_prevents_password_change(user)

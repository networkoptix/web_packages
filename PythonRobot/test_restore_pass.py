import time

from NoptixLibrary.suite import CloudAccount
from email_access import Email
from header import HeaderNav
from login import LoginDialog
from resource_import import get_chrome
from variables import ENV


def sets_new_password_and_successfully_logs_in(user: CloudAccount):
    with get_chrome() as driver:
        driver.get(ENV)
        header = HeaderNav(driver)
        header.log_in_button().click()
        login = LoginDialog(driver)
        login.email_input().input_text(user.email)
        login.next_button().click()
        login.forgot_password_button().click()
        assert login.reset_password_email_input().get_text() == user.email, "Email was not autofilled in the field"
        login.reset_password_button().click()
        email_con = Email()
        link = email_con.get_email_link(user.email, "restore_password")
        driver.get(link)
        login.activation_success_login_button().click()
        login.password_input().input_text(user.password)
        login.login_button().click()
        header.account_dropdown()


def check_restore_password_email(user: CloudAccount):
    with get_chrome() as driver:
        driver.get(ENV)
        header = HeaderNav(driver)
        header.log_in_button().click()
        login = LoginDialog(driver)
        login.email_input().input_text(user.email)
        login.next_button().click()
        login.forgot_password_button().click()
        login.reset_password_button().click()
        email_con = Email()
        email_id = email_con.wait_for_email(user.email)
        body = email_con.get_body(email_id)
        email_con.check_email_button(body, ENV, "#2FA2DB")
        email_con.check_email_cloud_name(body, "Nx Cloud")
        email_con.check_email_subject(email_id, "Reset your password")
        expected_links = [
            "https://support.networkoptix.com",
            "https://www.networkoptix.com",
            ENV,
            f'{ENV}/authorize/restore_password'
            ]
        email_con.find_links_in_email(body, expected_links)
        email_con.delete_email(email_id)


if __name__ == "__main__":
    with CloudAccount(sendemail=True) as user:
        sets_new_password_and_successfully_logs_in(user)
        check_restore_password_email(user)

from NoptixLibrary.suite import CloudAccount
from email_access import EmailClient
from header import HeaderNav
from login import LoginDialog
from resource_import import get_chrome
from variables import ENV


def sets_new_password_and_successfully_logs_in(user: CloudAccount):
    '''C26260'''
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
        with EmailClient(email_alias=user.email) as client:
            email = client.wait_for_reset_password_email()
            link = email.get_nx_links_from_email()
            client.delete_email(email)
        driver.get(link)
        login.new_password_input().input_text(user.password)
        login.password_reset_next_button().click()
        assert login.reset_success_text() == "Password is set!"
        login.password_reset_next_button().click()
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
        with EmailClient(email_alias=user.email) as client:
            email = client.wait_for_reset_password_email()
            email.check_email_button(ENV, "#2FA2DB")
            email.check_email_cloud_name("Nx Cloud")
            assert email.get_subject() == "Reset your password"
            expected_links = [
                "https://support.networkoptix.com",
                "https://www.networkoptix.com",
                ENV,
                f'{ENV}/authorize/restore_password'
                ]
            email.find_links_in_body(expected_links)
            client.delete_email(email)


def check_can_still_log_in_if_restore_not_finished(user: CloudAccount):
    '''C41873'''
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
        with EmailClient(email_alias=user.email) as client:
            email = client.wait_for_reset_password_email()
            link = email.get_nx_links_from_email()
            client.delete_email(email)
        driver.get(link)
        login.new_password_input().wait_until_visible()
        driver.get(ENV)
        header = HeaderNav(driver)
        header.log_in_button().click()
        login = LoginDialog(driver)
        login.basic_cloud_login(user.email, user.password)
        header.account_dropdown().click()


if __name__ == "__main__":
    with CloudAccount(sendemail=True) as user:
        sets_new_password_and_successfully_logs_in(user)
        check_restore_password_email(user)
        check_can_still_log_in_if_restore_not_finished(user)

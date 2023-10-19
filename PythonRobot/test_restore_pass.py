from NoptixLibrary.suite import CloudAccount
from email_access import EmailClient
from header import HeaderNav
from login import LoginDialog
from login import ResetPasswordForm
from resource_import import get_chrome
from toast_notification import ToastNotification
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
        login.reset_password_email_input().wait_until_text_is(user.email)
        login.reset_password_button().click()
        with EmailClient(email_alias=user.email) as client:
            email = client.wait_for_reset_password_email()
            link = email.get_nx_links_from_email()
            client.delete_email(email)
        driver.get(link)
        reset_password = ResetPasswordForm(driver)
        reset_password.wait_until_visible()
        reset_password.type_new_password(user.password)
        reset_password.click_next()
        assert reset_password.get_reset_success_text() == "Password is set!"
        reset_password.click_next()
        login.password_input().input_text(user.password)
        login.login_button().click()
        header.account_dropdown().click()


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
        login.reset_password_email_input().wait_until_text_is(user.email)
        login.reset_password_button().click()
        with EmailClient(email_alias=user.email) as client:
            email = client.wait_for_reset_password_email()
            link = email.get_nx_links_from_email()
            client.delete_email(email)
        driver.get(link)
        ResetPasswordForm(driver).wait_until_visible()
        driver.get(ENV)
        header = HeaderNav(driver)
        header.log_in_button().click()
        login = LoginDialog(driver)
        login.basic_cloud_login(user.email, user.password)
        header.account_dropdown().click()


def test_should_not_allow_restore_twice(user: CloudAccount):
    '''C42079'''
    with get_chrome() as driver:
        driver.get(ENV)
        header = HeaderNav(driver)
        header.log_in_button().click()
        login = LoginDialog(driver)
        login.email_input().input_text(user.email)
        login.next_button().click()
        login.forgot_password_button().click()
        login.reset_password_email_input().wait_until_text_is(user.email)
        login.reset_password_button().click()
        with EmailClient(email_alias=user.email) as client:
            email = client.wait_for_reset_password_email()
            link = email.get_nx_links_from_email()
            client.delete_email(email)
        driver.get(link)
        reset_password = ResetPasswordForm(driver)
        reset_password.wait_until_visible()
        reset_password.type_new_password(user.password)
        reset_password.click_next()
        assert reset_password.get_reset_success_text() == "Password is set!"
        reset_password.click_next()
        driver.get(link)
        reset_password.type_new_password(user.password)
        reset_password.click_next()
        assert ToastNotification(driver, "Cannot save password").get_message().get_text() == (
            "Cannot save password: Confirmation code is already used or incorrect"
            )


def check_password_masking(user: CloudAccount):
    '''C26260'''
    with get_chrome() as driver:
        driver.get(ENV)
        header = HeaderNav(driver)
        header.log_in_button().click()
        login = LoginDialog(driver)
        login.email_input().input_text(user.email)
        login.next_button().click()
        login.forgot_password_button().click()
        login.reset_password_button().click()
        header, description = login.get_reset_password_email_sent_text()
        assert header == "We've sent you an email"
        assert description == (
            "Please follow instructions there to reset your password"
            " and return here to log in again."
            )
        with EmailClient(email_alias=user.email) as client:
            email = client.wait_for_reset_password_email()
            link = email.get_nx_links_from_email()
            client.delete_email(email)
        driver.get(link)
        reset_password = ResetPasswordForm(driver)
        reset_password.wait_until_visible()
        assert reset_password.is_password_input_masked()
        assert reset_password.is_password_eye_closed()
        reset_password.toggle_password_mask()
        assert not reset_password.is_password_input_masked()
        assert reset_password.is_password_eye_open()
        reset_password.toggle_password_mask()
        assert reset_password.is_password_input_masked()
        assert reset_password.is_password_eye_closed()


def test_should_allow_visit_restore_after_log_in(user: CloudAccount):
    with get_chrome() as driver:
        driver.get(ENV)
        header = HeaderNav(driver)
        header.log_in_button().click()
        login = LoginDialog(driver)
        login.basic_cloud_login(user.email, user.password)
        HeaderNav(driver).account_dropdown().click()
        driver.get(f'{ENV}/authorize/restore_password')
        login.reset_password_email_input().wait_until_visible()


def test_account_activation_through_restore(user: CloudAccount):
    '''C41871'''
    with get_chrome() as driver:
        driver.get(ENV)
        header = HeaderNav(driver)
        header.log_in_button().click()
        login = LoginDialog(driver)
        login.email_input().input_text(user.email)
        login.next_button().click()
        assert login.login_input_error_text() == "Account not activated."
        driver.get(f'{ENV}/authorize/restore_password')
        login = LoginDialog(driver)
        login.reset_password_email_input().input_text(user.email)
        login.reset_password_button().click()
        with EmailClient(email_alias=user.email) as client:
            email = client.wait_for_reset_password_email()
            link = email.get_nx_links_from_email()
            client.delete_email(email)
        driver.get(link)
        reset_password = ResetPasswordForm(driver)
        reset_password.type_new_password(user.password)
        reset_password.click_next()
        assert reset_password.get_reset_success_text() == "Password is set!"
        reset_password.click_next()
        login.password_input().input_text(user.password)
        login.login_button().click()
        header = HeaderNav(driver)
        header.account_dropdown().click()


if __name__ == "__main__":
    with CloudAccount(sendemail=True) as user:
        sets_new_password_and_successfully_logs_in(user)
        check_restore_password_email(user)
        check_can_still_log_in_if_restore_not_finished(user)
        test_should_not_allow_restore_twice(user)
        check_password_masking(user)
        test_should_allow_visit_restore_after_log_in(user)
    with CloudAccount(activate=False, sendemail=True) as user:
        test_account_activation_through_restore(user)

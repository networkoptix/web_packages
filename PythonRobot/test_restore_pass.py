from NoptixLibrary.suite import CloudAccount
from email_access import EmailClient
from email_access import get_random_email
from generic_elements import ToastNotification
from pages.header import HeaderNav
from pages.login import LoginDialog
from pages.login import ResetPasswordForm
from resource_import import get_chrome
from variables import ENV


def sets_new_password_and_successfully_logs_in(user: CloudAccount):
    """C26260 email"""
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
            email_message = client.wait_for_reset_password_email()
            link = email_message.get_restore_password_link()
            client.delete_email(email_message)
        driver.get(link)
        reset_password = ResetPasswordForm(driver)
        reset_password.wait_until_visible()
        reset_password.type_new_password(user.password)
        reset_password.click_next()
        assert reset_password.get_reset_success_text() == "Password is set!"
        reset_password.click_next()
        login.password_input().input_text(user.password)
        login.login_button().click()
        assert header.is_logged_in()


def check_restore_password_email(user: CloudAccount):
    """email"""
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
            assert email.get_button_color(ENV) == "#2FA2DB"
            assert email.is_cloud_name_present("Nx Cloud")
            assert email.get_subject() == "Reset your password"
            expected_links = [
                "https://support.networkoptix.com",
                "https://networkoptix.com",
                ENV,
                f'{ENV}/authorize/restore_password'
                ]
            email.find_links_in_body(expected_links)
            client.delete_email(email)


def check_can_still_log_in_if_restore_not_finished(user: CloudAccount):
    """C41873 email"""
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
            email_message = client.wait_for_reset_password_email()
            link = email_message.get_restore_password_link()
            client.delete_email(email_message)
        driver.get(link)
        ResetPasswordForm(driver).wait_until_visible()
        driver.get(ENV)
        header = HeaderNav(driver)
        header.log_in_button().click()
        login = LoginDialog(driver)
        login.basic_cloud_login(user.email, user.password)
        assert header.is_logged_in()


def test_should_not_allow_restore_twice(user: CloudAccount):
    """C42079 email"""
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
            email_message = client.wait_for_reset_password_email()
            link = email_message.get_restore_password_link()
            client.delete_email(email_message)
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
        assert reset_password.get_cannot_save_notification().get_text() == (
            "Cannot save password: Confirmation code is already used or incorrect"
            )


def check_password_masking(user: CloudAccount):
    """C26260 email"""
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
            email_message = client.wait_for_reset_password_email()
            link = email_message.get_restore_password_link()
            client.delete_email(email_message)
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
    """email"""
    with get_chrome() as driver:
        driver.get(ENV)
        header = HeaderNav(driver)
        header.log_in_button().click()
        login = LoginDialog(driver)
        login.basic_cloud_login(user.email, user.password)
        assert HeaderNav(driver).is_logged_in()
        driver.get(f'{ENV}/authorize/restore_password')
        login.reset_password_email_input().wait_until_visible()


def test_account_activation_through_restore(user: CloudAccount):
    """C41871 email"""
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
            email_message = client.wait_for_reset_password_email()
            link = email_message.get_restore_password_link()
            client.delete_email(email_message)
        driver.get(link)
        reset_password = ResetPasswordForm(driver)
        reset_password.type_new_password(user.password)
        reset_password.click_next()
        assert reset_password.get_reset_success_text() == "Password is set!"
        reset_password.click_next()
        login.password_input().input_text(user.password)
        login.login_button().click()
        header = HeaderNav(driver)
        assert header.is_logged_in()


if __name__ == "__main__":
    with CloudAccount(get_random_email(sendemail=True)) as user:
        user.activate()
        sets_new_password_and_successfully_logs_in(user)
        check_restore_password_email(user)
        check_can_still_log_in_if_restore_not_finished(user)
        test_should_not_allow_restore_twice(user)
    with CloudAccount(get_random_email(sendemail=True)) as user:
        user.activate()
        check_password_masking(user)
        test_should_allow_visit_restore_after_log_in(user)
    with CloudAccount(get_random_email(sendemail=True)) as user:
        test_account_activation_through_restore(user)

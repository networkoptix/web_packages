from NoptixLibrary.suite import CloudAccount
from NoptixLibrary.suite import Suite
from RobotVariables import RobotVariables
from browsers.chrome import get_chrome
from pages.header import HeaderNav
from pages.login import LoginDialog
from variables import ENV

rb = RobotVariables("en_US")


def test_email_validation():
    with get_chrome() as driver:
        driver.get(ENV)
        header = HeaderNav(driver)
        header.log_in_button().click()
        login = LoginDialog(driver)
        login.next_button().click()
        assert login.wait_until_error() == rb.ENTER_EMAIL_TEXT
        login.email_input().input_text("noptixqagmail.com")
        login.next_button().click()
        assert login.wait_until_error() == rb.EMAIL_INVALID_TEXT
        login.email_input().input_text("@gmail.com")
        login.next_button().click()
        assert login.wait_until_error() == rb.EMAIL_INVALID_TEXT
        login.email_input().input_text("noptixqa@gmail..com")
        login.next_button().click()
        assert login.wait_until_error() == rb.EMAIL_INVALID_TEXT
        login.email_input().input_text("noptixqa@192.168.1.1.0")
        login.next_button().click()
        assert login.wait_until_error() == rb.EMAIL_INVALID_TEXT
        login.email_input().input_text("noptixqa.@gmail.com")
        login.next_button().click()
        assert login.wait_until_error() == rb.EMAIL_INVALID_TEXT
        login.email_input().input_text("noptixq..a@gmail.c")
        login.next_button().click()
        assert login.wait_until_error() == rb.EMAIL_INVALID_TEXT
        login.email_input().input_text("noptixqa@-gmail.com")
        login.next_button().click()
        assert login.wait_until_error() == rb.EMAIL_INVALID_TEXT
        login.email_input().input_text("noptixqa+does.not.exist@gmail.com")
        login.next_button().click()
        login.email_does_not_exist_message().wait_until_visible()
        login.you_can_create_account_message().wait_until_visible()

    print("pass")


def test_password_validation(user):
    with get_chrome() as driver:
        driver.get(ENV)
        header = HeaderNav(driver)
        header.log_in_button().click()
        login = LoginDialog(driver)
        login.email_input().input_text(user.email)
        login.next_button().click()
        login.password_input().wait_until_visible()
        login.login_button().click()
        assert login.wait_until_error() == rb.ENTER_PASSWORD_ERROR_TEXT
        login.password_input().input_text("incorrect password")
        login.login_button().click()
        assert login.wait_until_error() == rb.WRONG_PASSWORD

    print("pass")


if __name__ == "__main__":
    with Suite() as suite:
        test_email_validation()
        with CloudAccount() as user:
            test_password_validation(user)

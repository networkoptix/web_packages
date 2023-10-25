from RobotVariables import RobotVariables
from pages.header import HeaderNav
from pages.login import LoginDialog
from pages.reset_password_dialog import ResetPasswordDialog
from resource_import import get_headless_chrome
from resource_import import get_random_email
from resource_import import register_and_activate_account
from variables import ENV
rb = RobotVariables("en_US")


def test_email_validation():
    driver = get_headless_chrome()
    email = get_random_email(sendemail=True)
    register_and_activate_account(driver, "Mark", "Hamill", email, "qweasd 123")
    driver.get(ENV)
    header = HeaderNav(driver)
    header.log_in_button().click()
    login = LoginDialog(driver)
    login.email_input().input_text(email)
    login.next_button().click()
    login.forgot_password_button().click()
    reset_password_dialog = ResetPasswordDialog(driver)
    reset_password_dialog.clear_email_validation_error_message()
    reset_password_dialog.clear_email()
    assert reset_password_dialog.wait_until_error() == 'Enter email'
    reset_password_dialog.clear_email_validation_error_message()
    reset_password_dialog.input_email('noptixqagmail.com')
    assert reset_password_dialog.wait_until_error() == 'Invalid email'
    reset_password_dialog.clear_email_validation_error_message()
    reset_password_dialog.input_email('@gmail.com')
    assert reset_password_dialog.wait_until_error() == 'Invalid email'
    reset_password_dialog.clear_email_validation_error_message()
    reset_password_dialog.input_email('noptixqa@gmail..com')
    assert reset_password_dialog.wait_until_error() == 'Invalid email'
    reset_password_dialog.clear_email_validation_error_message()
    reset_password_dialog.input_email('noptixqa@192.168.1.1.0')
    assert reset_password_dialog.wait_until_error() == 'Invalid email'
    reset_password_dialog.clear_email_validation_error_message()
    reset_password_dialog.input_email('noptixqa.@gmail.com')
    assert reset_password_dialog.wait_until_error() == 'Invalid email'
    reset_password_dialog.clear_email_validation_error_message()
    reset_password_dialog.input_email('noptixq..a@gmail.com')
    assert reset_password_dialog.wait_until_error() == 'Invalid email'
    reset_password_dialog.clear_email_validation_error_message()
    reset_password_dialog.input_email('noptixqa@-gmail.com')
    assert reset_password_dialog.wait_until_error() == 'Invalid email'
    reset_password_dialog.clear_email_validation_error_message()
    reset_password_dialog.input_email('myemail')
    assert reset_password_dialog.wait_until_error() == 'Invalid email'
    reset_password_dialog.clear_email_validation_error_message()
    reset_password_dialog.input_email('myemail@')
    assert reset_password_dialog.wait_until_error() == 'Invalid email'
    reset_password_dialog.clear_email_validation_error_message()
    reset_password_dialog.input_email('myemail@gmail')
    assert reset_password_dialog.wait_until_error() == 'Invalid email'
    reset_password_dialog.clear_email_validation_error_message()
    reset_password_dialog.input_email('myemail@.com')
    assert reset_password_dialog.wait_until_error() == 'Invalid email'
    reset_password_dialog.clear_email_validation_error_message()
    reset_password_dialog.input_email('my@email@gmail.com')
    assert reset_password_dialog.wait_until_error() == 'Invalid email'
    reset_password_dialog.clear_email_validation_error_message()
    reset_password_dialog.input_email('myemail@ gmail.com')
    assert reset_password_dialog.wait_until_error() == 'Invalid email'
    reset_password_dialog.clear_email_validation_error_message()
    reset_password_dialog.input_email('myemail@gmail.com;')
    assert reset_password_dialog.wait_until_error() == 'Invalid email'
    reset_password_dialog.clear_email_validation_error_message()
    reset_password_dialog.input_email(' ')
    assert reset_password_dialog.wait_until_error() == 'Enter email'
    reset_password_dialog.set_email_validation_error_message()
    reset_password_dialog.input_email(' ' + 'myemail@gmail.com')
    reset_password_dialog.wait_until_no_error()
    reset_password_dialog.set_email_validation_error_message()
    reset_password_dialog.input_email('myemail@gmail.com' + ' ')
    reset_password_dialog.wait_until_no_error()
    reset_password_dialog.set_email_validation_error_message()
    reset_password_dialog.input_email('noptixautoqa+unregistered@gmail.com')
    reset_password_dialog.wait_until_no_error()
    driver.close()


if __name__ == '__main__':
    test_email_validation()

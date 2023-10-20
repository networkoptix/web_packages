import time

import resource_import
from RobotVariables import RobotVariables
from email_access import Email
from header import HeaderNav
from login import LoginDialog
from resource_import import get_headless_chrome
from resource_import import register_and_activate_account
from variables import ENV

password = "qweasd 123"
# login = ""
rb = RobotVariables("en_US")


def sets_new_password_and_successfully_logs_in():
    driver = get_headless_chrome()
    email = resource_import.get_random_email(sendemail=True)
    register_and_activate_account(driver, "Mark", "Hamill", email, password)
    driver.get(ENV)
    header = HeaderNav(driver)
    header.log_in_button().click()

    login = LoginDialog(driver)
    login.email_input().input_text(email)
    login.next_button().click()
    login.forgot_password_button().click()
    time.sleep(3)
    assert login.reset_password_email_input().get_text() == email, "Email was not autofilled in the field"
    login.reset_password_button().click()
    email_con = Email()
    link = email_con.get_email_link(email, "restore_password")
    driver.get(link)
    # login.activation_success_login_button().click()
    login.restore_password_input().input_text(password)
    login.next_button().click()
    login.restore_password_login_button().click()
    header.account_dropdown()

    driver.quit()
    print("pass")


def check_restore_password_email():
    driver = get_headless_chrome()
    email = resource_import.get_random_email(sendemail=True)
    register_and_activate_account(driver, "Mark", "Hamill", email, password)
    driver.get(ENV)
    header = HeaderNav(driver)
    header.log_in_button().click()

    login = LoginDialog(driver)
    login.email_input().input_text(email)
    login.next_button().click()
    login.forgot_password_button().click()
    login.reset_password_button().click()

    email_con = Email()
    email_id = email_con.wait_for_email(email, rb.RESET_PASSWORD_EMAIL_SUBJECT)
    body = email_con.get_body(email_id)
    email_con.check_email_button(body, ENV, rb.THEME_COLOR)
    email_con.check_email_cloud_name(body, rb.PRODUCT_NAME)

    expected_links = [rb.SUPPORT_URL, rb.WEBSITE_URL, ENV, f'{ENV}/authorize/restore_password']
    email_con.find_links_in_email(body, expected_links)
    email_con.delete_email(email_id)

    driver.quit()
    print("pass")

if __name__ == "__main__":
    sets_new_password_and_successfully_logs_in()
    check_restore_password_email()
import time

from selenium import webdriver

import resource
from resource import get_headless_chrome

from variables import ENV
from account import cloud_login
import robot_keywords
from RobotVariables import RobotVariables
from login import LoginDialog
from header import HeaderNav

password = "qweasd 123"
#login = ""
rb = RobotVariables("en_US")


def can_be_accessed_via_dropdown():
    driver = get_headless_chrome()
    robot_keywords.go_to_url(driver, ENV)
    robot_keywords.wait_until_element_is_visible(driver, rb.LOG_IN_NAV_BAR)
    robot_keywords.click_element(driver, rb.LOG_IN_NAV_BAR)

    login_dialog = LoginDialog(driver)
    login_dialog.basic_cloud_login("noptixautoqa+viewer@gmail.com", "qweasd 123")


    header = HeaderNav(driver)
    account_dropdown = header.account_dropdown()
    account_dropdown.click()
    change_password = header.change_password()
    change_password.click()
    robot_keywords.wait_until_elements_are_visible(driver, [rb.CURRENT_PASSWORD_INPUT, rb.NEW_PASSWORD_INPUT])
    robot_keywords.location_should_be(driver, f"{ENV}account/password")
    robot_keywords.close_browser(driver)
    print("pass")


def can_be_accessed_via_direct_url():
    driver = get_headless_chrome()
    robot_keywords.go_to_url(driver, f"{ENV}/account/password")
    login_dialog = LoginDialog(driver)
    login_dialog.basic_cloud_login("noptixautoqa+viewer@gmail.com", "qweasd 123")
    robot_keywords.wait_until_elements_are_visible(driver, [rb.CURRENT_PASSWORD_INPUT, rb.NEW_PASSWORD_INPUT])
    robot_keywords.location_should_be(driver, f"{ENV}account/password")
    robot_keywords.close_browser(driver)
    print("pass")


def password_is_actually_changed_and_login_works_with_new_password():
    driver = get_headless_chrome()
    robot_keywords.go_to_url(driver, f"{ENV}/account/password")
    login_dialog = LoginDialog(driver)
    login_dialog.basic_cloud_login("noptixautoqa+viewer@gmail.com", "qweasd 123")
    robot_keywords.wait_until_elements_are_visible(driver, [rb.CURRENT_PASSWORD_INPUT, rb.NEW_PASSWORD_INPUT])
    pwinput = input(driver, rb.CURRENT_PASSWORD_INPUT)
    pwinput.input_text(password)

    # robot_keywords.input_text(driver, rb.CURRENT_PASSWORD_INPUT, password)
    robot_keywords.input_text(driver, rb.NEW_PASSWORD_INPUT, rb.ALT_PASSWORD)
    robot_keywords.wait_until_elements_are_visible(driver,
                                                   [rb.CHANGE_PASSWORD_BUTTON, rb.CANCEL_PASSWORD_CHANGES_BUTTON])
    robot_keywords.click_button(driver, rb.CHANGE_PASSWORD_BUTTON)
    robot_keywords.elements_should_not_be_visible(driver,
                                                  [rb.CHANGE_PASSWORD_BUTTON, rb.CANCEL_PASSWORD_CHANGES_BUTTON])
    robot_keywords.wait_until_element_is_visible(driver, rb.CHANGE_PASS_NO_CHANGES)
    HeaderNav(driver).log_out()
    robot_keywords.go_to_url(driver, f"{ENV}/account/password")
    cloud_login(driver, "noptixautoqa+viewer@gmail.com", "qweasd 123", button=None, validate=False)
    robot_keywords.wait_until_element_is_visible(driver, rb.WRONG_PASSWORD_MESSAGE)
    robot_keywords.close_browser(driver)
    print("pass")

def password_with_symbols_is_valid():
    driver = get_headless_chrome()
    robot_keywords.go_to_url(driver, f"{ENV}/account/password")
    login_dialog = LoginDialog(driver)
    login_dialog.basic_cloud_login("noptixautoqa+viewer@gmail.com", "qweasd 123")    
    robot_keywords.wait_until_elements_are_visible(driver, [CURRENT_PASSWORD_INPUT, NEW_PASSWORD_INPUT])
    robot_keywords.input_text(driver, CURRENT_PASSWORD_INPUT, password)
    robot_keywords.input_text(driver, NEW_PASSWORD_INPUT, SYMBOL_PASSWORD)
    robot_keywords.wait_until_elements_are_visible(driver, [CHANGE_PASSWORD_BUTTON, CANCEL_PASSWORD_CHANGES_BUTTON])
    robot_keywords.click_button(driver, CHANGE_PASSWORD_BUTTON)
    robot_keywords.elements_should_not_be_visible(driver, [CHANGE_PASSWORD_BUTTON, CANCEL_PASSWORD_CHANGES_BUTTON])
    robot_keywords.wait_until_element_is_visible(driver, CHANGE_PASS_NO_CHANGES)
    resource.log_out_cloud(driver)
    robot_keywords.go_to_url(driver, f"{ENV}/account/password")
    cloud_login(driver, "noptixautoqa+advviewer@gmail.com", SYMBOL_PASSWORD, button=None)
    resource.log_out_cloud(driver)
    robot_keywords.go_to_url(driver, f"{ENV}/account/password")
    cloud_login(driver, "noptixautoqa+viewer@gmail.com", "qweasd 123", button=None, validate=False)
    robot_keywords.wait_until_element_is_visible(driver, rb.WRONG_PASSWORD_MESSAGE)
    robot_keywords.close_browser(driver)
    print("pass")

if __name__ == "__main__":
    can_be_accessed_via_dropdown()
    can_be_accessed_via_direct_url()
    password_is_actually_changed_and_login_works_with_new_password()

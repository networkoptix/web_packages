from selenium import webdriver

import resource
from resource import get_headless_chrome
from variables import ERROR_COLOR, CHANGE_PASSWORD_BUTTON_DROPDOWN, WRONG_PASSWORD_MESSAGE
from variable_files.change_pass_variables import CURRENT_PASSWORD_INPUT, NEW_PASSWORD_INPUT, ALT_PASSWORD, CHANGE_PASSWORD_BUTTON, CANCEL_PASSWORD_CHANGES_BUTTON, CHANGE_PASS_NO_CHANGES
from account_variables import ACCOUNT_DROPDOWN, ACCOUNT_SETTINGS_BUTTON, YOUR_ACCOUNT_IS_SUCCESSFULLY_SAVED
from selenium.webdriver.common.by import By
from resource import verify_in_account_page, validate_log_out
from selenium.webdriver.chrome.options import Options
from variables import  ACCOUNT_DOES_NOT_EXIST, EMAIL_INPUT, LOG_IN_MODAL, LOG_IN_NAV_BAR, LOG_IN_NEXT_BUTTON, LOGGED_IN_CLOSE_BUTTON, PASSWORD_INPUT, LOG_IN_NAV_BAR, LOG_IN_BUTTON, ENV, YOU_CAN_CREATE_AN_ACCOUNT
from variables import  ACCOUNT_CREATION_EMAIL_SUCCESS
from account import cloud_login
import robot_keywords

password = "qweasd 123"
login = ""

def can_be_accessed_via_dropdown():
    driver = get_headless_chrome()
    robot_keywords.go_to_url(driver, ENV)
    cloud_login(driver, "noptixautoqa+viewer@gmail.com", "qweasd 123")
    robot_keywords.wait_until_element_is_visible(driver, ACCOUNT_DROPDOWN)
    robot_keywords.click_button(driver, ACCOUNT_DROPDOWN)
    robot_keywords.wait_until_element_is_visible(driver, CHANGE_PASSWORD_BUTTON_DROPDOWN)
    robot_keywords.click_on_link(driver, CHANGE_PASSWORD_BUTTON_DROPDOWN)
    robot_keywords.wait_until_elements_are_visible(driver, [CURRENT_PASSWORD_INPUT, NEW_PASSWORD_INPUT])
    robot_keywords.location_should_be(driver, f"{ENV}account/password")
    robot_keywords.close_browser(driver)
    print("pass")

def can_be_accessed_via_direct_url():
    driver = get_headless_chrome()
    robot_keywords.go_to_url(driver, f"{ENV}/account/password")
    cloud_login(driver, "noptixautoqa+viewer@gmail.com", "qweasd 123", button= None)
    robot_keywords.wait_until_elements_are_visible(driver, [CURRENT_PASSWORD_INPUT, NEW_PASSWORD_INPUT])
    robot_keywords.location_should_be(driver, f"{ENV}account/password")
    robot_keywords.close_browser(driver)
    print("pass")

def password_is_actually_changed_and_login_works_with_new_password():
    driver = get_headless_chrome()
    robot_keywords.go_to_url(driver, f"{ENV}/account/password")
    cloud_login(driver, "noptixautoqa+viewer@gmail.com", "qweasd 123", button=None)
    robot_keywords.wait_until_elements_are_visible(driver, [CURRENT_PASSWORD_INPUT, NEW_PASSWORD_INPUT])
    robot_keywords.input_text(driver, CURRENT_PASSWORD_INPUT, password)
    robot_keywords.input_text(driver, NEW_PASSWORD_INPUT, ALT_PASSWORD)
    robot_keywords.wait_until_elements_are_visible(driver, [CHANGE_PASSWORD_BUTTON, CANCEL_PASSWORD_CHANGES_BUTTON])
    robot_keywords.click_button(driver, CHANGE_PASSWORD_BUTTON)
    robot_keywords.elements_should_not_be_visible(driver, [CHANGE_PASSWORD_BUTTON, CANCEL_PASSWORD_CHANGES_BUTTON])
    robot_keywords.wait_until_element_is_visible(driver, CHANGE_PASS_NO_CHANGES)
    resource.log_out_cloud(driver)
    robot_keywords.go_to_url(driver, f"{ENV}/account/password")
    cloud_login(driver, "noptixautoqa+viewer@gmail.com", "qweasd 123", button=None, validate=False)
    robot_keywords.wait_until_element_is_visible(driver, WRONG_PASSWORD_MESSAGE)
    robot_keywords.close_browser(driver)
    print("pass")





if __name__ == "__main__":
    can_be_accessed_via_dropdown()
    can_be_accessed_via_direct_url()
    password_is_actually_changed_and_login_works_with_new_password()
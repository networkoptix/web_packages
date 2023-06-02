from account_variables import ACCOUNT_CANCEL, ACCOUNT_DROPDOWN, ACCOUNT_EMAIL, ACCOUNT_FIRST_NAME, ACCOUNT_LANGUAGE_DROPDOWN, ACCOUNT_LAST_NAME, ACCOUNT_SETTINGS_BUTTON, DELETE_ACCOUNT_BUTTON

import robot_keywords
from selenium import webdriver

def verify_in_account_page(driver: webdriver):
    for element in [ACCOUNT_EMAIL, ACCOUNT_FIRST_NAME, ACCOUNT_LAST_NAME, ACCOUNT_LANGUAGE_DROPDOWN, ACCOUNT_DROPDOWN, DELETE_ACCOUNT_BUTTON]:
        robot_keywords.wait_until_element_is_visible(driver, element)
    for element in [ACCOUNT_SETTINGS_BUTTON, ACCOUNT_CANCEL]:
        robot_keywords.element_should_not_be_visible(driver, element)
    robot_keywords.sleep(0.5)
    return driver



from account_variables import BACKDROP, ANONYMOUS_BODY
from variables import LOG_IN_BUTTON_TEXT
from account_variables import ACCOUNT_CANCEL, ACCOUNT_DROPDOWN, ACCOUNT_EMAIL, ACCOUNT_FIRST_NAME, ACCOUNT_LANGUAGE_DROPDOWN, ACCOUNT_LAST_NAME, ACCOUNT_SETTINGS_BUTTON, DELETE_ACCOUNT_BUTTON

import robot_keywords
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.desired_capabilities import DesiredCapabilities


def get_headless_chrome():
    #TODO: remove logging stuff and restore headless option
    chrome_options = Options()
    chrome_options.add_argument("--enable-logging")
    chrome_options.add_argument("--headless")
    capabilities = DesiredCapabilities.CHROME
    capabilities['goog:loggingPrefs'] = {'browser': 'ALL'}

    driver = webdriver.Chrome(options=chrome_options, desired_capabilities=capabilities)
    return driver


def verify_in_account_page(driver: webdriver):
    robot_keywords.wait_until_elements_are_visible(driver, [ACCOUNT_EMAIL,
                                                            ACCOUNT_FIRST_NAME,
                                                            ACCOUNT_LAST_NAME,
                                                            ACCOUNT_LANGUAGE_DROPDOWN,
                                                            ACCOUNT_DROPDOWN,
                                                            DELETE_ACCOUNT_BUTTON
                                                            ])
    for element in [ACCOUNT_SETTINGS_BUTTON, ACCOUNT_CANCEL]:
        robot_keywords.element_should_not_be_visible(driver, element)
    robot_keywords.sleep(0.5)
    return driver


def validate_log_out(driver: webdriver):
    robot_keywords.wait_until_element_is_visible(driver, BACKDROP)
    robot_keywords.wait_until_page_contains_element(driver, ANONYMOUS_BODY)
    
def verify_in_account_page(driver: webdriver):
    robot_keywords.wait_until_elements_are_visible(driver, [ACCOUNT_EMAIL,
                                                            ACCOUNT_FIRST_NAME,
                                                            ACCOUNT_LAST_NAME,
                                                            ACCOUNT_LANGUAGE_DROPDOWN,
                                                            ACCOUNT_DROPDOWN,
                                                            DELETE_ACCOUNT_BUTTON
                                                            ])
    for element in [ACCOUNT_SETTINGS_BUTTON, ACCOUNT_CANCEL]:
        robot_keywords.element_should_not_be_visible(driver, element)
    robot_keywords.sleep(0.5)



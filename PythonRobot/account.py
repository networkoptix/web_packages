from selenium import webdriver
from account_variables import ACCOUNT_DROPDOWN, ACCOUNT_SETTINGS_BUTTON
from selenium.webdriver.common.by import By
from resource import verify_in_account_page
from selenium.webdriver.chrome.options import Options
from variables import  ACCOUNT_DOES_NOT_EXIST, EMAIL_INPUT, LOG_IN_MODAL, LOG_IN_NAV_BAR, LOG_IN_NEXT_BUTTON, PASSWORD_INPUT, LOG_IN_NAV_BAR, LOG_IN_BUTTON, ENV, YOU_CAN_CREATE_AN_ACCOUNT

import robot_keywords

password = "qweasd 123"
login = ""


def cloud_login(driver, email, password, validate=True, button=LOG_IN_NAV_BAR, exists=True, reset=False, two_FA=False, twoFA_backup_code="" ):
    if button:
        
        locator = (By.XPATH, button)
        robot_keywords.wait_until_element_is_visible(driver, button)
        robot_keywords.click_element(driver, button)

    if validate and not two_FA:
        # check language variable and set it to default. That is, set language before logging in
        # TODO: check language
        pass
        #TODO: set user theme (ie, light or dark mode)
        pass
    for element in [LOG_IN_MODAL, LOG_IN_NEXT_BUTTON, EMAIL_INPUT ]:
        robot_keywords.wait_until_element_is_visible(driver, element)
    robot_keywords.sleep(1)
    robot_keywords.input_text(driver, EMAIL_INPUT, email)
    robot_keywords.sleep(1)
    robot_keywords.click_element(driver, LOG_IN_NEXT_BUTTON)

    if exists:
        robot_keywords.wait_until_element_is_visible(driver, PASSWORD_INPUT)
        robot_keywords.input_text(driver, PASSWORD_INPUT,password)
        robot_keywords.sleep(1)
        robot_keywords.wait_until_element_is_visible(driver, LOG_IN_BUTTON)
        robot_keywords.click_element(driver, LOG_IN_BUTTON)

    else:  
        robot_keywords.wait_until_element_is_visible(driver,ACCOUNT_DOES_NOT_EXIST,YOU_CAN_CREATE_AN_ACCOUNT)
    # TODO: Check if 2fa is true and there is no backup code
    if validate:
        robot_keywords.wait_until_element_is_visible(driver, ACCOUNT_DROPDOWN)
    robot_keywords.sleep(0.5)



def test_can_access_account_page_from_dropdown():
    """1 Can access the account page from dropdown"""
    chrome_options = Options()
    chrome_options.add_argument("--headless")
    driver = webdriver.Chrome(options=chrome_options)
    robot_keywords.go_to_url(driver, ENV)
    cloud_login(driver, "noptixautoqa+owner@gmail.com", "qweasd 123")
    robot_keywords.sleep(3)
    robot_keywords.wait_until_element_is_visible(driver, ACCOUNT_DROPDOWN)
    robot_keywords.click_button(driver, ACCOUNT_DROPDOWN)
    robot_keywords.wait_until_element_is_visible(driver, ACCOUNT_SETTINGS_BUTTON)
    robot_keywords.click_on_link(driver, ACCOUNT_SETTINGS_BUTTON)
    verify_in_account_page(driver)
    robot_keywords.close_browser(driver)

if __name__ == "__main__":

    test_can_access_account_page_from_dropdown()
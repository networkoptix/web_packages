from selenium import webdriver
from resource import get_headless_chrome
from variables import ERROR_COLOR
from account_variables import LOG_IN_CLOSE_BUTTON, ACCOUNT_FIRST_NAME, ACCOUNT_LAST_NAME, ACCOUNT_SAVE
from account_variables import ACCOUNT_DROPDOWN, ACCOUNT_SETTINGS_BUTTON, YOUR_ACCOUNT_IS_SUCCESSFULLY_SAVED
from account_variables import TEST_FIRST_NAME, TEST_LAST_NAME
from selenium.webdriver.common.by import By
from resource import verify_in_account_page, validate_log_out
from selenium.webdriver.chrome.options import Options
from variables import  ACCOUNT_DOES_NOT_EXIST, EMAIL_INPUT, LOG_IN_MODAL, LOG_IN_NAV_BAR, LOG_IN_NEXT_BUTTON, LOGGED_IN_CLOSE_BUTTON, PASSWORD_INPUT, LOG_IN_NAV_BAR, LOG_IN_BUTTON, ENV, YOU_CAN_CREATE_AN_ACCOUNT
from variables import  ACCOUNT_CREATION_EMAIL_SUCCESS
import robot_keywords

password = "qweasd 123"
login = ""


def cloud_login(driver, email, password, validate=True, button=LOG_IN_NAV_BAR, exists=True,  api=False, reset=False, two_FA=False, twoFA_backup_code="" ):
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
    robot_keywords.wait_until_elements_are_visible(driver, [LOG_IN_MODAL, LOG_IN_NEXT_BUTTON, EMAIL_INPUT ])
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
    driver = get_headless_chrome()
    robot_keywords.go_to_url(driver, ENV)
    cloud_login(driver, "noptixautoqa+owner@gmail.com", "qweasd 123")
    robot_keywords.sleep(3)
    robot_keywords.wait_until_element_is_visible(driver, ACCOUNT_DROPDOWN)
    robot_keywords.click_button(driver, ACCOUNT_DROPDOWN)
    robot_keywords.wait_until_element_is_visible(driver, ACCOUNT_SETTINGS_BUTTON)
    robot_keywords.click_on_link(driver, ACCOUNT_SETTINGS_BUTTON)
    verify_in_account_page(driver)
    robot_keywords.close_browser(driver)


def test_can_access_account_page_from_direct_link():
    """2 Can access the account page from direct link while logged in"""
    driver = get_headless_chrome()
    robot_keywords.go_to_url(driver, ENV)
    cloud_login(driver, "noptixautoqa+owner@gmail.com", "qweasd 123")
    robot_keywords.go_to_url(driver,ENV + "/account")
    verify_in_account_page(driver)
    robot_keywords.close_browser(driver)  

def test_cannot_access_account_page_from_direct_link_closing_log():
    """3 Accessing the account page from a direct link while logged out asks for login, closing log in takes you to main page"""
    driver = get_headless_chrome()
    robot_keywords.go_to_url(driver,ENV + "/account")
    #robot_keywords.wait_until_element_is_visible(driver, LOG_IN_CLOSE_BUTTON)
    #driver = robot_keywords.click_button(driver, LOG_IN_CLOSE_BUTTON)
    validate_log_out(driver)
    robot_keywords.location_should_be(driver, ENV + "/account")
    robot_keywords.close_browser(driver)

def test_cannot_access_account_page_from_direct_link_on_valid_login():
    """4 Accessing the account page from a direct link while logged out asks for login, on valid login takes you to account page"""
    driver = get_headless_chrome()
    robot_keywords.go_to_url(driver,ENV + "/account")
    cloud_login(driver, "noptixautoqa+owner@gmail.com", "qweasd 123", button=None)
    robot_keywords.go_to_url(driver,ENV + "/account")
    verify_in_account_page(driver)
    robot_keywords.close_browser(driver)

def test_changing_first_name_and_saving_maintains_that_setting():
    """5 Changing first name and saving maintains that setting"""
    driver = get_headless_chrome()
    robot_keywords.go_to_url(driver, ENV + "/account")
    cloud_login(driver, "noptixautoqa+owner@gmail.com", "qweasd 123", button=None, api=False)
    verify_in_account_page(driver)
    robot_keywords.clear_element_text(driver, ACCOUNT_FIRST_NAME)
    robot_keywords.input_text(driver, ACCOUNT_FIRST_NAME, "nameChanged")
    # TODO: the save button doesn't appear.
    robot_keywords.wait_until_element_is_visible(driver, ACCOUNT_SAVE)
    robot_keywords.click_button(driver, ACCOUNT_SAVE)
    robot_keywords.check_for_alert(driver, YOUR_ACCOUNT_IS_SUCCESSFULLY_SAVED)
    robot_keywords.close_browser(driver)

    driver = get_headless_chrome()
    robot_keywords.go_to_url(driver, ENV + "/account")
    cloud_login(driver, "noptixautoqa+owner@gmail.com", "qweasd 123", button=None, api=False)
    verify_in_account_page(driver)
    robot_keywords.sleep(2)
    robot_keywords.wait_until_textfield_contains(driver, ACCOUNT_FIRST_NAME, "nameChanged")
    robot_keywords.clear_element_text(driver, ACCOUNT_FIRST_NAME)
    robot_keywords.input_text(driver, ACCOUNT_FIRST_NAME, TEST_FIRST_NAME)
    robot_keywords.wait_until_element_is_visible(driver, ACCOUNT_SAVE)
    robot_keywords.click_button(driver, ACCOUNT_SAVE)
    robot_keywords.check_for_alert(driver, YOUR_ACCOUNT_IS_SUCCESSFULLY_SAVED)

def test_changing_last_name_and_saving_maintains_that_setting():
    """6 Changing last name and saving maintains that setting"""
    #TODO: 
    driver = get_headless_chrome()
    robot_keywords.go_to_url(driver, ENV + "/account")
    cloud_login(driver, "noptixautoqa+owner@gmail.com", "qweasd 123", button=None, api=False)
    verify_in_account_page(driver)
    robot_keywords.input_text(driver, ACCOUNT_LAST_NAME, "nameChanged")
    robot_keywords.wait_until_element_is_visible(driver, ACCOUNT_SAVE)
    robot_keywords.click_button(driver, ACCOUNT_SAVE)
    robot_keywords.check_for_alert(driver, YOUR_ACCOUNT_IS_SUCCESSFULLY_SAVED)
    robot_keywords.close_browser(driver)

    driver = get_headless_chrome()
    robot_keywords.go_to_url(driver, ENV + "/account")
    cloud_login(driver, "noptixautoqa+owner@gmail.com", "qweasd 123", button=None, api=False)
    verify_in_account_page(driver)
    robot_keywords.wait_until_textfield_contains(driver, ACCOUNT_LAST_NAME, "nameChanged")
    robot_keywords.input_text(driver, ACCOUNT_LAST_NAME, TEST_LAST_NAME)
    robot_keywords.wait_until_element_is_visible(driver, ACCOUNT_SAVE)
    robot_keywords.click_button(driver, ACCOUNT_SAVE)
    robot_keywords.check_for_alert(driver, YOUR_ACCOUNT_IS_SUCCESSFULLY_SAVED)

def test_first_name_is_required():
    """7 First name is required"""
    driver = get_headless_chrome()
    robot_keywords.go_to_url(driver, ENV + "/account")
    cloud_login(driver, "noptixautoqa+owner@gmail.com", "qweasd 123", button=None, api=False)
    verify_in_account_page(driver)
    robot_keywords.delete_all_text(driver, ACCOUNT_FIRST_NAME)
    robot_keywords.click_element(driver, ACCOUNT_LAST_NAME)
    
    robot_keywords.wait_until_element_has_style(driver, ACCOUNT_FIRST_NAME, f"border-color: {ERROR_COLOR};")

if __name__ == "__main__":

    test_can_access_account_page_from_dropdown()
    test_can_access_account_page_from_direct_link()
    #test_cannot_access_account_page_from_direct_link_closing_log()
    test_cannot_access_account_page_from_direct_link_on_valid_login()
    test_changing_first_name_and_saving_maintains_that_setting()
    test_changing_last_name_and_saving_maintains_that_setting()


from account_variables import BACKDROP, ANONYMOUS_BODY
from variable_files.variables import LOG_IN_BUTTON_TEXT, PASSWORD_BADGE, COMMON_PASSWORD, PASSWORD_IS_TOO_COMMON_BADGE, PASSWORD_IS_WEAK_BADGE, PASSWORD_IS_FAIR_BADGE, PASSWORD_IS_GOOD_BADGE 
from variable_files.variables import PASSWORD_IS_TOO_SHORT_BADGE, PASSWORD_INCORRECT_BADGE, PASSWORD_BADGE_TOOLTIP, WEAK_PASSWORDS, INCORRECT_PASSWORDS, FAIR_PASSWORDS, GOOD_PASSWORDS, SEVEN_CHAR_PASSWORD
from account_variables import ACCOUNT_CANCEL, ACCOUNT_DROPDOWN, ACCOUNT_EMAIL, ACCOUNT_FIRST_NAME, ACCOUNT_LANGUAGE_DROPDOWN, ACCOUNT_LAST_NAME, ACCOUNT_SETTINGS_BUTTON, DELETE_ACCOUNT_BUTTON
from variables import LOG_OUT_BUTTON
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

def check_password_badge(driver: webdriver, password, new_focus):
    if password != "":
        robot_keywords.wait_until_element_is_visible(driver, PASSWORD_BADGE)
    if password == COMMON_PASSWORD:
        robot_keywords.wait_until_element_is_visible(driver, PASSWORD_IS_TOO_COMMON_BADGE)
    elif password in  WEAK_PASSWORDS:
        robot_keywords.wait_until_element_is_visible(driver, PASSWORD_IS_WEAK_BADGE)
    elif password in INCORRECT_PASSWORDS:
        robot_keywords.wait_until_element_is_visible(driver, PASSWORD_INCORRECT_BADGE)
    elif password in FAIR_PASSWORDS:
        robot_keywords.wait_until_element_is_visible(driver, PASSWORD_IS_FAIR_BADGE)
    elif password in GOOD_PASSWORDS:
        robot_keywords.wait_until_element_is_visible(driver, PASSWORD_IS_GOOD_BADGE)
    elif password == SEVEN_CHAR_PASSWORD:
        robot_keywords.wait_until_element_is_visible(driver, PASSWORD_IS_TOO_COMMON_BADGE)
    
    if password != "":
        robot_keywords.mouse_over(driver, PASSWORD_BADGE)
    
    if password == COMMON_PASSWORD:
        robot_keywords.wait_until_element_is_visible(driver, f'{PASSWORD_BADGE_TOOLTIP}//div[contains(@class, "tooltip-body") and text()="{PASSWORD_TOO_COMMON_TEXT}"])')
    elif password in  WEAK_PASSWORDS:
        robot_keywords.wait_until_element_is_visible(driver, f'{PASSWORD_BADGE_TOOLTIP}//div[contains(@class, "tooltip-body") and text()="{PASSWORD_IS_WEAK_TEXT}"])')
    elif password in INCORRECT_PASSWORDS:
        robot_keywords.wait_until_element_is_visible(driver, f'{PASSWORD_BADGE_TOOLTIP}//div[contains(@class, "tooltip-body") and text()="{PASSWORD_SPECIAL_CHARS_TEXT}"])')
    elif password in FAIR_PASSWORDS:
        robot_keywords.wait_until_element_is_visible(driver, f'{PASSWORD_BADGE_TOOLTIP}//div[contains(@class, "tooltip-body") and text()="{PASSWORD_IS_WEAK_TEXT}"])')
    elif password == SEVEN_CHAR_PASSWORD:
        robot_keywords.wait_until_element_is_visible(driver, f'{PASSWORD_BADGE_TOOLTIP}//div[contains(@class, "tooltip-body") and text()="{PASSWORD_IS_TOO_SHORT}"])')


    if password == COMMON_PASSWORD:
        move_focus_and_check_badge_stays(driver, PASSWORD_IS_TOO_COMMON_BADGE, new_focus)
    elif password in  WEAK_PASSWORDS:
        move_focus_and_check_badge_stays(driver, PASSWORD_IS_WEAK_BADGE, new_focus)
    elif password in INCORRECT_PASSWORDS:
        move_focus_and_check_badge_stays(driver, PASSWORD_INCORRECT_BADGE, new_focus)
    elif password in FAIR_PASSWORDS:
        robot_keywords.wait_until_element_is_visible(driver, PASSWORD_IS_FAIR_BADGE)
    elif password in GOOD_PASSWORDS:
        robot_keywords.wait_until_element_is_visible(driver, PASSWORD_IS_GOOD_BADGE)
    elif password == SEVEN_CHAR_PASSWORD:
        move_focus_and_check_badge_stays(driver, PASSWORD_IS_TOO_COMMON_BADGE, new_focus)
    


def move_focus_and_check_badge_stays(driver, badge, new_focus):
    robot_keywords.element_should_be_visible(driver, badge)
    robot_keywords.click_element(driver, new_focus)
    robot_keywords.element_should_be_visible(driver, badge)

def log_out_cloud(driver: webdriver):
    robot_keywords.wait_until_page_does_not_contain_element(driver, BACKDROP)
    robot_keywords.wait_until_page_contains_element(driver, LOG_OUT_BUTTON)
    robot_keywords.wait_until_element_is_visible(driver, ACCOUNT_DROPDOWN)
    robot_keywords.click_button(driver, ACCOUNT_DROPDOWN)
    robot_keywords.wait_until_element_is_visible(driver, LOG_OUT_BUTTON)
    robot_keywords.click_on_link(driver, LOG_OUT_BUTTON)
    validate_log_out()
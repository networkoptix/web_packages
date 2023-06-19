from selenium import webdriver
from resource import get_headless_chrome
from variable_files.variables import ENV, ERROR_COLOR, EMAIL_INVALID, EMAIL_ALREADY_REGISTERED, EMAIL_IS_REQUIRED, PASSWORD_BADGE, PASSWORD_IS_REQUIRED, PASSWORD_SPECIAL_CHARS, 
from variable_files.variables import PASSWORD_IS_WEAK, FIRST_NAME_IS_REQUIRED, LAST_NAME_IS_REQUIRED, GOOD_PASSWORDS, FAIR_PASSWORDS
from variable_files.register_variables import URL, REGISTER_FIRST_NAME_INPUT, REGISTER_LAST_NAME_INPUT, REGISTER_EMAIL_INPUT, REGISTER_PASSWORD_INPUT, CREATE_ACCOUNT_BUTTON, TERMS_AND_CONDITIONS_ERROR, TERMS_AND_CONDITIONS_CHECKBOX_VISIBLE
from selenium.webdriver.common.by import By
from resource import verify_in_account_page, validate_log_out
from selenium.webdriver.chrome.options import Options
from account import cloud_login
import robot_keywords


def test_register_invalid(driver, first, last, email, password, checked):
    robot_keywords.reload_page(driver)
    # Run Keyword If    "${LANGUAGE}"=="he_IL"    Set Suite Variable    ${EMAIL INVALID}
    # ...    //span[contains(@class,'input-error') and contains(text(),'${EMAIL INVALID TEXT}')]
    # Run Keyword If    "${LANGUAGE}"=="he_IL"    Set Suite Variable    ${EMAIL IS REQUIRED}
    # ...    //span[contains(@class,'input-error') and contains(text(),'${EMAIL IS REQUIRED TEXT}')]
    visible_elements = [REGISTER_FIRST_NAME_INPUT, REGISTER_LAST_NAME_INPUT, REGISTER_EMAIL_INPUT, REGISTER_PASSWORD_INPUT, CREATE_ACCOUNT_BUTTON]
    robot_keywords.wait_until_elements_are_visible(driver, visible_elements)
    invisible_elements = [
                         EMAIL_INVALID, 
                         EMAIL_ALREADY_REGISTERED, 
                         EMAIL_IS_REQUIRED, 
                         PASSWORD_BADGE, 
                         PASSWORD_IS_REQUIRED, 
                         PASSWORD_SPECIAL_CHARS, 
                         PASSWORD_IS_WEAK, 
                         FIRST_NAME_IS_REQUIRED, 
                         LAST_NAME_IS_REQUIRED, 
                         TERMS_AND_CONDITIONS_ERROR
                         ]
    robot_keywords.elements_should_not_be_visible(driver, invisible_elements)
    register_form_validation(driver, first, last, email, password, checked)



def register_form_validation(driver, first_name, last_name, email, password, checked):
    robot_keywords.input_text(driver, REGISTER_FIRST_NAME_INPUT, first_name)
    robot_keywords.input_text(driver, REGISTER_LAST_NAME_INPUT, last_name)
    robot_keywords.input_text(driver, REGISTER_EMAIL_INPUT, email)
    robot_keywords.click_element(driver, REGISTER_PASSWORD_INPUT)
    robot_keywords.sleep(.1)
    robot_keywords.input_text(driver, REGISTER_PASSWORD_INPUT, password)
    if password != "":
        # check_password_badge
    if checked:
        robot_keywords.click_element(driver, TERMS_AND_CONDITIONS_CHECKBOX_VISIBLE)
    robot_keywords.sleep(.1)
    robot_keywords.click_button(driver, CREATE_ACCOUNT_BUTTON)


import json
import os
from pathlib import Path
import re
import tempfile
import certifi
from requests.auth import HTTPDigestAuth, HTTPBasicAuth
import urllib3
import selenium
from account_variables import BACKDROP, ANONYMOUS_BODY
from account_variables import ACCOUNT_CANCEL, ACCOUNT_DROPDOWN, ACCOUNT_EMAIL, ACCOUNT_FIRST_NAME, ACCOUNT_LANGUAGE_DROPDOWN, ACCOUNT_LAST_NAME, ACCOUNT_SETTINGS_BUTTON, DELETE_ACCOUNT_BUTTON
from variables import LOG_OUT_BUTTON
import json
import os
from pathlib import Path
import re
import tempfile
import certifi
from requests.auth import HTTPDigestAuth, HTTPBasicAuth
import urllib3
import selenium
import robot_keywords
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.desired_capabilities import DesiredCapabilities
from selenium.webdriver.chrome.service import Service
import warnings
from RobotVariables import RobotVariables
import requests
import time
from random import randint
import robot_lists as rl

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

rb = RobotVariables("en_US")

_letsencrypt_stage_cert_path = str(Path(__file__).parent / 'letsencrypt-stg.crt')
if os.getenv('LETSENCRYPT_STAGE_CERT_REQUIRED'):
    with tempfile.NamedTemporaryFile(mode='a+b', suffix='.pem', delete=False) as certs_file:
        with open(_letsencrypt_stage_cert_path, 'rb') as letsencrypt_stage_cert:
            certs_file.write(letsencrypt_stage_cert.read())
        with open(certifi.where(), 'rb') as trusted_certs:
            certs_file.write(trusted_certs.read())
        _ssl_certs_path = Path(certs_file.name)
else:
    _ssl_certs_path = Path(certifi.where())

def get_headless_chrome():
    # TODO: remove logging stuff and restore headless option
    chrome_options = Options()
    chrome_options.add_argument("--enable-logging")
    #chrome_options.add_argument("--headless")
    capabilities = DesiredCapabilities.CHROME
    capabilities['goog:loggingPrefs'] = {'browser': 'ALL'}

    driver = webdriver.Chrome(options=chrome_options, desired_capabilities=capabilities)
    return driver

def verify_in_account_page(driver: webdriver):
    robot_keywords.wait_until_elements_are_visible(driver, [rb.ACCOUNT_EMAIL,
                                                            rb.ACCOUNT_FIRST_NAME,
                                                            rb.ACCOUNT_LAST_NAME,
                                                            rb.ACCOUNT_LANGUAGE_DROPDOWN,
                                                            rb.ACCOUNT_DROPDOWN,
                                                            rb.DELETE_ACCOUNT_BUTTON
                                                            ])
    for element in [rb.ACCOUNT_SETTINGS_BUTTON, rb.ACCOUNT_CANCEL]:
        robot_keywords.element_should_not_be_visible(driver, element)
    robot_keywords.sleep(0.5)
    #robot_keywords.wait_until_element_is_visible(driver, rb.BACKDROP)
    #robot_keywords.wait_until_page_contains_element(driver, rb.ANONYMOUS_BODY)

def validate_log_out(driver: webdriver):
    robot_keywords.wait_until_element_is_not_visible(driver, rb.BACKDROP)
    robot_keywords.wait_until_page_contains_element(driver, rb.ANONYMOUS_BODY)

def get_lang_list():
    jsonPath = os.path.join("customizations", rb.CUST_LANGUAGE_LIST)
    with open(jsonPath, encoding="utf-8") as langDict:
        return json.load(langDict)

# def validate_on_register_page(driver: webdriver):
#     for element in [rb.REGISTER_FIRST_NAME_INPUT, rb.REGISTER_LAST_NAME_INPUT, rb.REGISTER_PASSWORD_INPUT, rb.CREATE_ACCOUNT_BUTTON]:
#         robot_keywords.wait_until_element
#     is_visible(driver, element)

# def get_code_from_api(email, message_type):
#     with self._session(self.baseEmail, self.password) as s:
#         s.headers.update({"referer": f"{rb.ENV}/authorize"})
#         get_code_response = s.post(
#             f'{rb.ENV}/api/robot/get_code',
#             json={'email': email, 'type': message_type})
#     get_code_response.raise_for_status()
#     return get_code_response.json()['code']

# def activate_account_via_api(email, password):
#     code = get_code_from_api(email, "activate_account")
#     code = re.sub(r'%3D', '=', code)
#     code = re.sub(r'%2B', '+', code)
#     activate_response = requests.post(f'{rb.ENV}/api/account/activate', auth=HTTPBasicAuth(email, password), json={"code": code}, verify=False)
#     activate_response.raise_for_status()
#     return f"{rb.ENV}/authorize/activate/{activate_response.json()}"

# def activate(driver, email, password=rb.BASE_PASSWORD, from_email=rb.FROM_EMAIL_DEFAULT):
#     if from_email:
#         link = get_email_link(email, password, "activate", via_email=from_email)
#         robot_keywords.go_to_url(link)
#         for element in [rb.ACTIVATION_SUCCESS, rb.ACTIVATION_SUCCESS_ICON, rb.ACTIVATION_SUCCESS_LOG_IN_BUTTON]:
#             robot_keywords.wait_until_element_is_visible(driver, element)
#     else:
#         activate_account_via_api

# def get_email_link(email, password, link_type, from_email=rb.FROM_EMAIL_DEFAULT):
#     pass

# def register(first_name, last_name, email, password, checked=False, view_type=""):
#     if view_type:
#         robot_keywords.go_to_url(rb.ENV + "/authorize?client_type=create&view_type=" + view_type)
#     else:
#         robot_keywords.go_to_url(rb.ENV + "/authorize?client_type=create")
#     validate_on_register_page()
#     robot_keywords.input_text(rb.REGISTER_FIRST_NAME_INPUT, first_name)
#     robot_keywords.input_text(rb.REGISTER_LAST_NAME_INPUT, last_name)

    try:
        robot_keywords.wait_until_element_is_visible(rb.REGISTER_EMAIL_INPUT_LOCKED, 5)
    except selenium.common.exceptions.TimeoutException:
        robot_keywords.input_text(rb.REGISTER_EMAIL_INPUT, email)

    robot_keywords.input_text(rb.REGISTER_PASSWORD_INPUT, password)
    if not checked:
        robot_keywords.click_element(rb.TERMS_AND_CONDITIONS_CHECKBOX_VISIBLE)
    robot_keywords.click_button(rb.CREATE_ACCOUNT_BUTTON)

def register_and_activate_account(driver, first_name, last_name, email, password, reg="api", from_email=rb.FROM_EMAIL_DEFAULT):
    if reg == "api":
        register_account(first_name, last_name, email, password)
    elif reg == "ui":
        register(first_name, last_name, email, password)
    robot_keywords.sleep(1)
    activate(driver, email, password, from_email=from_email)

def check_password_badge(driver: webdriver, password, new_focus):
    if password != "":
        robot_keywords.wait_until_element_is_visible(driver, rb.PASSWORD_BADGE)
    if password == rb.COMMON_PASSWORD:
        robot_keywords.wait_until_element_is_visible(driver, rb.PASSWORD_IS_TOO_COMMON_BADGE)
    elif password in  rl.WEAK_PASSWORDS:
        robot_keywords.wait_until_element_is_visible(driver, rb.PASSWORD_IS_WEAK_BADGE)
    elif password in rl.INCORRECT_PASSWORDS:
        robot_keywords.wait_until_element_is_visible(driver, rb.PASSWORD_INCORRECT_BADGE)
    elif password in rl.FAIR_PASSWORDS:
        robot_keywords.wait_until_element_is_visible(driver, rb.PASSWORD_IS_FAIR_BADGE)
    elif password in rl.GOOD_PASSWORDS:
        robot_keywords.wait_until_element_is_visible(driver, rb.PASSWORD_IS_GOOD_BADGE)
    elif password == rb.SEVEN_CHAR_PASSWORD:
        robot_keywords.wait_until_element_is_visible(driver, rb.PASSWORD_IS_TOO_SHORT_BADGE)
    
    if password != "":
        robot_keywords.mouse_over(driver, rb.PASSWORD_BADGE)
    
    if password == rb.COMMON_PASSWORD:
        robot_keywords.wait_until_element_is_visible(driver, f'{rb.PASSWORD_BADGE_TOOLTIP}//div[contains(@class, "tooltip-body") and text()="{rb.PASSWORD_TOO_COMMON_TEXT}"]')
    elif password in  rl.WEAK_PASSWORDS:
        robot_keywords.wait_until_element_is_visible(driver, f'{rb.PASSWORD_BADGE_TOOLTIP}//div[contains(@class, "tooltip-body") and text()="{rb.PASSWORD_IS_WEAK_TEXT}"]')
    elif password in rl.INCORRECT_PASSWORDS:
        robot_keywords.wait_until_element_is_visible(driver, f'{rb.PASSWORD_BADGE_TOOLTIP}//div[contains(@class, "tooltip-body") and text()="{rb.PASSWORD_SPECIAL_CHARS_TEXT}"]')
    elif password in rl.FAIR_PASSWORDS:
        robot_keywords.wait_until_element_is_visible(driver, f'{rb.PASSWORD_BADGE_TOOLTIP}//div[contains(@class, "tooltip-body") and text()="{rb.PASSWORD_IS_WEAK_TEXT}"]')
    elif password == rb.SEVEN_CHAR_PASSWORD:
        robot_keywords.wait_until_element_is_visible(driver, f'{rb.PASSWORD_BADGE_TOOLTIP}//div[contains(@class, "tooltip-body") and contains(text(), "{rb.PASSWORD_TOO_SHORT_TEXT}")]')


    if password == rb.COMMON_PASSWORD:
        move_focus_and_check_badge_stays(driver,rb.PASSWORD_IS_TOO_COMMON_BADGE, new_focus)
    elif password in  rl.WEAK_PASSWORDS:
        move_focus_and_check_badge_stays(driver, rb.PASSWORD_IS_WEAK_BADGE, new_focus)
    elif password in rl.INCORRECT_PASSWORDS:
        move_focus_and_check_badge_stays(driver, rb.PASSWORD_INCORRECT_BADGE, new_focus)
    elif password in rl.FAIR_PASSWORDS:
        robot_keywords.wait_until_element_is_visible(driver, rb.PASSWORD_IS_FAIR_BADGE)
    elif password in rl.GOOD_PASSWORDS:
        robot_keywords.wait_until_element_is_visible(driver, rb.PASSWORD_IS_GOOD_BADGE)
    elif password == rb.SEVEN_CHAR_PASSWORD:
        move_focus_and_check_badge_stays(driver, rb.PASSWORD_IS_TOO_SHORT_BADGE, new_focus)
    
def register_account(firstName, lastName, email, password):
    body = {
        "email": email,
        "password": password,
        "first_name": firstName,
        "last_name": lastName
    }
    register_response = requests.post('https://cloud-test.hdw.mx/api/account/register',
                                      auth=HTTPBasicAuth("noptixautoqa@gmail.com", password),
                                      json=body,
                                      verify=False)
    register_response.raise_for_status()
    return register_response.json()

def get_random_email(email, sendemail=False, extra="", symbols=False):
    if not sendemail:
        email = email.replace('sendemail', '')
    if symbols:
        index = email.find('@')
        email = email[:index] + \
                "!#$%'*-/=?^_`{|}~" + str(time.time()) + email[index:]
        return email
    else:
        index = email.find('@')
        email = email[:index] + str(time.time()) + str(randint(1, 100)) + extra + email[index:]
        return email

def move_focus_and_check_badge_stays(driver, badge, new_focus):
    robot_keywords.element_should_be_visible(driver, badge)
    robot_keywords.click_element(driver, new_focus)
    robot_keywords.element_should_be_visible(driver, badge)

def move_focus_and_check_element(driver, element, new_focus):
    robot_keywords.click_element(driver, new_focus)
    robot_keywords.wait_until_element_is_visible(driver, element)

def get_random_email(email, sendemail=False, extra="", symbols=False):
    if not sendemail:
        email = email.replace('sendemail', '')
    if symbols:
        index = email.find('@')
        email = email[:index] + \
                "!#$%'*-/=?^_`{|}~" + str(time.time()) + email[index:]
        return email
    else:
        index = email.find('@')
        email = email[:index] + str(time.time()) + str(randint(1, 100)) + extra + email[index:]
        return email
def log_out_cloud(driver: webdriver):
    robot_keywords.wait_until_page_does_not_contain_element(driver, BACKDROP)
    robot_keywords.wait_until_page_contains_element(driver, LOG_OUT_BUTTON)
    robot_keywords.wait_until_element_is_visible(driver, ACCOUNT_DROPDOWN)
    robot_keywords.click_button(driver, ACCOUNT_DROPDOWN)
    robot_keywords.wait_until_element_is_visible(driver, LOG_OUT_BUTTON)
    robot_keywords.click_on_link(driver, LOG_OUT_BUTTON)
    validate_log_out(driver)

def check_new_password_outline_and_error_message(driver, new_password, new_focus, input, input_name):
    robot_keywords.click_element(driver, new_focus)
    if new_password not in rl.FAIR_PASSWORDS and new_password not in rl.GOOD_PASSWORDS:
        robot_keywords.element_style_should_be(driver, input, "border-bottom-color",rb.ERROR_COLOR_WITH_OPACITY)
        robot_keywords.element_style_should_be(driver, input, "border-top-color", rb.ERROR_COLOR_WITH_OPACITY)
        robot_keywords.element_style_should_be(driver, input, "border-right-color", rb.ERROR_COLOR_WITH_OPACITY)
        robot_keywords.element_style_should_be(driver, input, "border-left-color", rb.ERROR_COLOR_WITH_OPACITY)
        robot_keywords.element_style_should_be(driver, input, "color", rb.ERROR_COLOR_WITH_OPACITY)
        robot_keywords.wait_until_element_is_visible(driver, f"//nx-password-input[@name='{input_name}' and contains(@class, 'ng-invalid')]//input[@id='{input_name}']")
    if new_password == "" or new_password == " ":
        robot_keywords.input_text(driver, input, "")
        move_focus_and_check_element(driver, rb.PASSWORD_IS_REQUIRED, new_focus)
    elif new_password == rb.SEVEN_CHAR_PASSWORD:
        move_focus_and_check_element(driver, rb.PASSWORD_TOO_SHORT, new_focus)
    elif new_password in rl.INCORRECT_PASSWORDS:
        move_focus_and_check_element(driver, rb.PASSWORD_SPECIAL_CHARS, new_focus)
    elif new_password == rb.COMMON_PASSWORD:
        move_focus_and_check_element(driver, rb.PASSWORD_TOO_COMMON, new_focus)
    elif new_password in rl.WEAK_PASSWORDS:
        move_focus_and_check_element(driver, rb.PASSWORD_IS_WEAK, new_focus)

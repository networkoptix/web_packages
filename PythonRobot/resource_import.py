import email
import imaplib
import json
import os
import pathlib
import re
import time
from contextlib import contextmanager
from email.header import decode_header
from random import randint
from typing import ContextManager

import urllib3
from NoptixLibrary.cloud_portal_api import CloudPortalAPI
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.remote.webdriver import WebDriver

import robot_keywords
import robot_lists as rl
from RobotVariables import RobotVariables
from email_access import Email
from generic_element import Element
from login import LoginDialog
from text_field import TextField

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

rb = RobotVariables("en_US")

def activate(driver, email, password=rb.BASE_PASSWORD, from_email=rb.FROM_EMAIL_DEFAULT):
    if from_email:
        link = get_email_link(email, password, from_email, "activate")
        driver.get(link)
        for element in [rb.ACTIVATION_SUCCESS, rb.ACTIVATION_SUCCESS_ICON, rb.ACTIVATION_SUCCESS_LOG_IN_BUTTON]:
            Element(driver, element).wait_until_visible()
    else:
        api = CloudPortalAPI()
        api.activate_account_via_api(email, password)

def check_email_subject(email_id, sub_text, email_address, password, host, port):
        conn = imaplib.IMAP4_SSL(host, int(port))
        conn.login(email_address, password)
        conn.select()
        typ, data = conn.uid(
            'fetch', email_id, '(BODY.PEEK[HEADER.FIELDS (SUBJECT)])')
        for res in data:
            if isinstance(res, tuple):
                # Decoding ascii and header
                header = email.header.decode_header(
                    res[1].decode('ascii').strip())
                # Decoding utf-8
                header_str = "".join([x[0].decode(
                    'utf-8').strip() if x[1] else re.sub("(^b\'|\')", "", str(x[0])) for x in header])
                # Removing the word "Subject:" from the string
                header_str = re.sub("Subject:", "", header_str)
                if sub_text != header_str.strip():
                    raise Exception(header_str + ' was not ' + sub_text)
        conn.logout()

def check_language_logged_in(email, password, language="en_US"): 
    api = CloudPortalAPI()
    current_lang = api.get_account_language(email, password)
    if current_lang == language:
        api.set_account_language(email, password, language)
    time.sleep(2)

def cloud_login(driver, email, password, validate=True, button=rb.LOG_IN_NAV_BAR, exists=True,  api=False, reset=False, two_FA=False, twoFA_backup_code="" ):
    if button:
        Element(driver, button).wait_until_visible()
        Element(driver, button).click()

    if validate and not two_FA:
        # check language variable and set it to default. That is, set language before logging in
        # TODO: check language
        pass
        #TODO: set user theme (ie, light or dark mode)
        pass
    for element in [rb.LOG_IN_MODAL, rb.LOG_IN_NEXT_BUTTON, rb.EMAIL_INPUT ]:
        Element(driver, element).wait_until_visible()
    time.sleep(1)
    robot_keywords.input_text(driver, rb.EMAIL_INPUT, email)
    time.sleep(1)
    Element(driver, rb.LOG_IN_NEXT_BUTTON).click()

    if exists:
        Element(driver, rb.PASSWORD_INPUT).wait_until_visible()
        robot_keywords.input_text(driver, rb.PASSWORD_INPUT, password)
        time.sleep(1)
        log_in_button = Element(driver, rb.LOG_IN_BUTTON)
        log_in_button.wait_until_visible()
        log_in_button.click()
    else:
        for element in [rb.ACCOUNT_DOES_NOT_EXIST, rb.YOU_CAN_CREATE_AN_ACCOUNT]:
            Element(driver, element).wait_until_visible()
    # TODO: Check if 2fa is true and there is no backup code
    if validate:
        Element(driver, rb.ACCOUNT_DROPDOWN).wait_until_visible()
    time.sleep(0.5)

def check_log_in(driver: webdriver, user: str, password: str, button=rb.LOG_IN_NAV_BAR):
    random_email = get_random_email(rb.BASE_EMAIL)
    #LoginDialog(driver).basic_cloud_login(random_email, rb.BASE_PASSWORD)
    LoginDialog(driver).basic_cloud_login(user, password)

def check_password_badge(driver: webdriver, password, new_focus):
    if password != "":
        Element(driver, rb.PASSWORD_BADGE).wait_until_visible()
    if password == rb.COMMON_PASSWORD:
        Element(driver, rb.PASSWORD_IS_TOO_COMMON_BADGE).wait_until_visible()
    elif password in rl.WEAK_PASSWORDS:
        Element(driver, rb.PASSWORD_IS_WEAK_BADGE).wait_until_visible()
    elif password in rl.INCORRECT_PASSWORDS:
        Element(driver, rb.PASSWORD_INCORRECT_BADGE).wait_until_visible()
    elif password in rl.FAIR_PASSWORDS:
        Element(driver, rb.PASSWORD_IS_FAIR_BADGE).wait_until_visible()
    elif password in rl.GOOD_PASSWORDS:
        Element(driver, rb.PASSWORD_IS_GOOD_BADGE).wait_until_visible()
    elif password == rb.SEVEN_CHAR_PASSWORD:
        Element(driver, rb.PASSWORD_IS_TOO_SHORT_BADGE).wait_until_visible()
    
    if password != "":
        robot_keywords.mouse_over(driver, rb.PASSWORD_BADGE)
    
    if password == rb.COMMON_PASSWORD:
        too_common = Element(
            driver,
            f'{rb.PASSWORD_BADGE_TOOLTIP}//div[contains(@class, "tooltip-body") '
            f'and text()="{rb.PASSWORD_TOO_COMMON_TEXT}"]',
            )
        too_common.wait_until_visible()
    elif password in rl.WEAK_PASSWORDS:
        weak_password = Element(
            driver,
            f'{rb.PASSWORD_BADGE_TOOLTIP}//div[contains(@class, "tooltip-body") '
            f'and text()="{rb.PASSWORD_IS_WEAK_TEXT}"]',
            )
        weak_password.wait_until_visible()
    elif password in rl.INCORRECT_PASSWORDS:
        incorrect_password = Element(
            driver,
            f'{rb.PASSWORD_BADGE_TOOLTIP}//div[contains(@class, "tooltip-body") '
            f'and text()="{rb.PASSWORD_SPECIAL_CHARS_TEXT}"]',
            )
        incorrect_password.wait_until_visible()
    elif password in rl.FAIR_PASSWORDS:
        fair_password = Element(
            driver,
            f'{rb.PASSWORD_BADGE_TOOLTIP}//div[contains(@class, "tooltip-body") '
            f'and text()="{rb.PASSWORD_IS_WEAK_TEXT}"]',
            )
        fair_password.wait_until_visible()
    elif password == rb.SEVEN_CHAR_PASSWORD:
        seven_char_password = Element(
            driver,
            f'{rb.PASSWORD_BADGE_TOOLTIP}//div[contains(@class, "tooltip-body") '
            f'and contains(text(), "{rb.PASSWORD_TOO_SHORT_TEXT}")]',
            )
        seven_char_password.wait_until_visible()


    if password == rb.COMMON_PASSWORD:
        move_focus_and_check_badge_stays(driver,rb.PASSWORD_IS_TOO_COMMON_BADGE, new_focus)
    elif password in  rl.WEAK_PASSWORDS:
        move_focus_and_check_badge_stays(driver, rb.PASSWORD_IS_WEAK_BADGE, new_focus)
    elif password in rl.INCORRECT_PASSWORDS:
        move_focus_and_check_badge_stays(driver, rb.PASSWORD_INCORRECT_BADGE, new_focus)
    elif password in rl.FAIR_PASSWORDS:
        Element(driver, rb.PASSWORD_IS_FAIR_BADGE).wait_until_visible()
    elif password in rl.GOOD_PASSWORDS:
        Element(driver, rb.PASSWORD_IS_GOOD_BADGE).wait_until_visible()
    elif password == rb.SEVEN_CHAR_PASSWORD:
        move_focus_and_check_badge_stays(driver, rb.PASSWORD_IS_TOO_SHORT_BADGE, new_focus)

def check_new_password_outline_and_error_message(driver, new_password, new_focus, input, input_name):
    Element(driver, new_focus).click()
    if new_password not in rl.FAIR_PASSWORDS and new_password not in rl.GOOD_PASSWORDS:
        robot_keywords.element_style_should_be(driver, input, "border-bottom-color",rb.ERROR_COLOR_WITH_OPACITY)
        robot_keywords.element_style_should_be(driver, input, "border-top-color", rb.ERROR_COLOR_WITH_OPACITY)
        robot_keywords.element_style_should_be(driver, input, "border-right-color", rb.ERROR_COLOR_WITH_OPACITY)
        robot_keywords.element_style_should_be(driver, input, "border-left-color", rb.ERROR_COLOR_WITH_OPACITY)
        robot_keywords.element_style_should_be(driver, input, "color", rb.ERROR_COLOR_WITH_OPACITY)
        password_element = Element(
            driver,
            f"//nx-password-input[@name='{input_name}' "
            f"and contains(@class, 'ng-invalid')]//input[@id='{input_name}']",
            )
        password_element.wait_until_visible()
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

def detect_language(text):
    from googletrans import Translator
    detected_langs = str(Translator().detect(text))
    return detected_langs

def delete_email(mail, email_uid):
    # Mark the email for deletion
    mail.uid('STORE', email_uid, '+FLAGS', '(\Deleted)')

    # Permanently remove mails that are marked for deletion
    mail.expunge()
    
def get_email_link(recipient, link_type, from_email=rb.FROM_EMAIL_DEFAULT, timeout=300):
    if from_email:
        email_con = Email()
        email_id = email_con.wait_for_email(recipient)
        body = email_con.get_body(email_id)
        # mbox = open_mailbox(host=rb.BASE_HOST,password=rb.BASE_EMAIL_PASSWORD, email=recipient, is_secure=True)
        # email_uid = wait_for_email(mbox, recipient=recipient, timeout_sec=120)
        if link_type == "activate":
            email_con.check_email_subject(email_id, rb.ACTIVATE_YOUR_ACCOUNT_EMAIL_SUBJECT)
        link = email_con.get_email_link(recipient, link_type)
        return link
    else:
        print("from email only")
        pass

def get_headless_chrome():
    # TODO: remove logging stuff and restore headless option
    chrome_options = Options()
    chrome_options.add_argument("--enable-logging")
    chrome_options.add_argument("--log-level=3")
    # chrome_options.add_argument("--headless")
   
    # capabilities = DesiredCapabilities.CHROME
    # capabilities['goog:loggingPrefs'] = {'browser': 'ALL'}

    driver = webdriver.Chrome(options=chrome_options)
    # driver.execute_script("localStorage.setItem('theme', 'light');")
    return driver


@contextmanager
def get_chrome() -> ContextManager[WebDriver]:
    driver = get_headless_chrome()
    try:
        yield driver
    finally:
        driver.quit()


def get_lang_list():
    path = pathlib.Path().parent / 'customizations' / 'default_lang_list.json'
    with open(path, encoding="utf-8") as langDict:
        return json.load(langDict)
    
def get_nx_links_from_email(self, email_index, body):
        url = rf'href=[\'\"]?(https:\/\/([^<>]*)(|.dev|.test|\.mx\/|.host\/|\.com\/)(authorize)\/[^\'\" >]+)'
        res = re.findall(url, str(body))
        return str(res[0][0])
    
def get_random_email(email=rb.BASE_EMAIL_SENDEMAIL, sendemail=False, extra="", symbols=False):
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
        
def logout_japanese(driver:webdriver):

    robot_keywords.wait_until_page_does_not_contain_element(driver, rb.BACKDROP)
    element = """//header//li[contains(@class, 'dropdown-item-container')]//a/span[contains(text(),"ログアウト")]"""
    robot_keywords.wait_until_page_contains_element(driver, element)

    time.sleep(0.5)
    Element(driver, rb.ACCOUNT_DROPDOWN).click()
    Element(driver, element).wait_until_visible()
    Element(driver, element).click()
    validate_log_out(driver)

def move_focus_and_check_badge_stays(driver, badge, new_focus):
    badge = Element(driver, badge)
    badge.should_be_visible()
    badge.click()
    badge.should_be_visible()

def move_focus_and_check_element(driver, element, new_focus):
    Element(driver, new_focus).click()
    Element(driver, element).wait_until_visible()

def open_mailbox(host=rb.BASE_HOST, password=rb.BASE_PASSWORD, email=rb.BASE_EMAIL, is_secure=True):
    try:
        if is_secure:
            mail = imaplib.IMAP4_SSL(host)
        else:
            mail = imaplib.IMAP4(host)

        mail.login(email, password)
        mail.select('inbox')         
        return mail

    except Exception as e:
        print(f"An error occurred: {e}")
        return None

def open_page_anonymously(driver: webdriver, url: str, title: str):
    driver.get(url)
    robot_keywords.location_should_be(driver, url)
    time.sleep(3)
    assert driver.title == title


def register_and_activate_account(driver, first_name, last_name, email, password, reg="api", from_email=rb.FROM_EMAIL_DEFAULT):
    api = CloudPortalAPI()

    if reg == "api":
        api.register_account(first_name, last_name, email, password)
    elif reg == "ui":
        api.register(first_name, last_name, email, password)
    time.sleep(1)
    activate(driver, email, password, from_email=from_email)

def register_and_activate_random_email(driver, first_name, last_name, password, reg="api", from_email=rb.FROM_EMAIL_DEFAULT):
    random_email = get_random_email(sendemail=from_email)
    register_and_activate_account(driver, first_name, last_name, random_email, password, reg=reg, from_email=from_email)  
    return random_email

def register(driver, first_name, last_name, email, password, checked=False, view_type=""):
    if view_type:
        url = rb.ENV + "/authorize?client_type=create&view_type=" + view_type
        driver.get(url)
    else:
        driver.get("https://cloud-test.hdw.mx/authorize?client_type=create")
    validate_on_register_page(driver)

    robot_keywords.input_text(driver, rb.REGISTER_FIRST_NAME_INPUT, first_name)
    robot_keywords.input_text(driver, rb.REGISTER_LAST_NAME_INPUT, last_name)
    # continue on failure
    try:
        Element(driver, rb.REGISTER_EMAIL_INPUT_LOCKED).wait_until_visible()
    except:
        pass
    robot_keywords.input_text(driver, rb.REGISTER_EMAIL_INPUT, email)
    robot_keywords.input_text(driver, rb.REGISTER_PASSWORD_INPUT, password)
    if not checked:
        Element(driver, rb.TERMS_AND_CONDITIONS_CHECKBOX_VISIBLE).click()
    Element(driver, rb.CREATE_ACCOUNT_BUTTON).click()


# from robot_tests/Resources/front-end-resources/restore-pass-resource.robot    
def send_restore_password_email(driver: webdriver, email: str) -> None:
    url = rb.ENV + "/authorize"
    driver.get(url)
    Element(driver, rb.LOG_IN_MODAL).wait_until_visible()
    Element(driver, rb.LOG_IN_NEXT_BUTTON).wait_until_visible()
    Element(driver, rb.EMAIL_INPUT).wait_until_visible()
    time.sleep(1)
    TextField(driver, rb.EMAIL_INPUT).input_text(email)
    time.sleep(1)
    Element(driver, rb.LOG_IN_NEXT_BUTTON).click()
    Element(driver, rb.FORGOT_PASSWORD_BUTTON).wait_until_visible()
    Element(driver, rb.FORGOT_PASSWORD_BUTTON).click()
    robot_keywords.input_text(driver, rb.RESTORE_PASSWORD_EMAIL_INPUT, email)
    Element(driver, rb.RESET_PASSWORD_BUTTON).click()


def validate_log_out(driver: webdriver):
    robot_keywords.wait_until_element_is_not_visible(driver, rb.BACKDROP)
    robot_keywords.wait_until_page_contains_element(driver, rb.ANONYMOUS_BODY)

def verify_in_account_page(driver: webdriver):
    Element(driver, rb.ACCOUNT_EMAIL).wait_until_visible()
    Element(driver, rb.ACCOUNT_FIRST_NAME).wait_until_visible()
    Element(driver, rb.ACCOUNT_LAST_NAME).wait_until_visible()
    Element(driver, rb.ACCOUNT_LANGUAGE_DROPDOWN).wait_until_visible()
    Element(driver, rb.ACCOUNT_DROPDOWN).wait_until_visible()
    Element(driver, rb.DELETE_ACCOUNT_BUTTON).wait_until_visible()
    for element in [rb.ACCOUNT_SETTINGS_BUTTON, rb.ACCOUNT_CANCEL]:
        Element(driver, element).should_not_be_visible()
    time.sleep(0.5)


def wait_for_email(mail, recipient, timeout_sec):
    started_at = time.monotonic()
    while True:
        # Search the inbox for emails with specific "To" header
        result, data = mail.uid('search', None, f'(HEADER "To" "{recipient}")')
        email_ids = data[0].split()
        for email_id in email_ids:
            result, email_data = mail.uid('fetch', email_id, '(FLAGS)')
            email_flags = email_data[0].decode()  # decode the entire byte string
            if result == 'OK' and '\\Seen' not in email_flags:
                return email_id
        if time.monotonic() - started_at > timeout_sec:
            raise RuntimeError(
                f"No email for {mail} to {recipient} within {timeout_sec} seconds timeout")
        time.sleep(1)

    
def validate_on_register_page(driver: webdriver):
    Element(driver, rb.REGISTER_FIRST_NAME_INPUT).wait_until_visible()
    Element(driver, rb.REGISTER_LAST_NAME_INPUT).wait_until_visible()
    Element(driver, rb.REGISTER_PASSWORD_INPUT).wait_until_visible()
    Element(driver, rb.CREATE_ACCOUNT_BUTTON).wait_until_visible()


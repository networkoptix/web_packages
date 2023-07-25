
import time
import email
from email.header import decode_header
from re import findall
import imaplib
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
import robot_lists as rl
import requests
import time
from random import randint
from NoptixLibrary.CloudSession import CloudSession
from NoptixLibrary.CloudPortalAPI import CloudPortalAPI 
from NoptixLibrary import *
from googletrans import Translator

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

rb = RobotVariables("en_US")

# _letsencrypt_stage_cert_path = str(Path(__file__).parent / 'letsencrypt-stg.crt')
# if os.getenv('LETSENCRYPT_STAGE_CERT_REQUIRED'):
#     with tempfile.NamedTemporaryFile(mode='a+b', suffix='.pem', delete=False) as certs_file:
#         with open(_letsencrypt_stage_cert_path, 'rb') as letsencrypt_stage_cert:
#             certs_file.write(letsencrypt_stage_cert.read())
#         with open(certifi.where(), 'rb') as trusted_certs:
#             certs_file.write(trusted_certs.read())
#         _ssl_certs_path = Path(certs_file.name)
# else:
#     _ssl_certs_path = Path(certifi.where())

def get_headless_chrome():
    # TODO: remove logging stuff and restore headless option
    chrome_options = Options()
    chrome_options.add_argument("--enable-logging")
    chrome_options.add_argument("--log-level=3")
    chrome_options.binary_location = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
    #chrome_options.add_argument("--headless")
   
    capabilities = DesiredCapabilities.CHROME
    capabilities['goog:loggingPrefs'] = {'browser': 'ALL'}

    driver = webdriver.Chrome(options=chrome_options, desired_capabilities=capabilities)
    # driver.execute_script("localStorage.setItem('theme', 'light');")
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

def activate(driver, email, password=rb.BASE_PASSWORD, from_email=rb.FROM_EMAIL_DEFAULT):
    if from_email:
        link = get_email_link(email, password, "activate")
        robot_keywords.go_to_url(link)
        for element in [rb.ACTIVATION_SUCCESS, rb.ACTIVATION_SUCCESS_ICON, rb.ACTIVATION_SUCCESS_LOG_IN_BUTTON]:
            robot_keywords.wait_until_element_is_visible(driver, element)
    else:
        api = CloudPortalAPI.CloudPortalAPI()
        api.activate_account_via_api(email, password)

def get_nx_links_from_email(self, email_index, body):
        url = rf'href=[\'\"]?(https:\/\/([^<>]*)(|.dev|.test|\.mx\/|.host\/|\.com\/)(authorize)\/[^\'\" >]+)'
        res = findall(url, str(body))
        return str(res[0][0])

def get_email_link(recipient, link_type, from_email=rb.FROM_EMAIL_DEFAULT, timeout=300):
    if from_email:
        mbox = open_mailbox(host=rb.BASE_HOST,password=rb.BASE_EMAIL_PASSWORD, email=recipient, is_secure=True)
        email_uid = wait_for_email(mbox, recipient=recipient, timeout=120, status="UNREAD")
        if link_type == "activate":
            check_email_subject(email_uid, rb.ACTIVATE_YOUR_ACCOUNT_EMAIL_SUBJECT, rb.BASE_EMAIL, rb.BASE_EMAIL_PASSWORD, rb.BASE_HOST, rb.BASE_PORT)
        body = mbox.uid('fetch', email_uid, '(BODY.PEEK[TEXT])')
        links = get_nx_links_from_email(email_uid, link_type, body)   
        return links
    else:
        print("from email only")
        pass
    

# def register(first_name, last_name, email, password, checked=False, view_type=""):
#     if view_type:
#         robot_keywords.go_to_url(rb.ENV + "/authorize?client_type=create&view_type=" + view_type)
#     else:
#         robot_keywords.go_to_url(rb.ENV + "/authorize?client_type=create")
#     validate_on_register_page()
#     robot_keywords.input_text(rb.REGISTER_FIRST_NAME_INPUT, first_name)
#     robot_keywords.input_text(rb.REGISTER_LAST_NAME_INPUT, last_name)

#     try:
#         robot_keywords.wait_until_element_is_visible(rb.REGISTER_EMAIL_INPUT_LOCKED, 5)
#     except selenium.common.exceptions.TimeoutException:
#         robot_keywords.input_text(rb.REGISTER_EMAIL_INPUT, email)

#     robot_keywords.input_text(rb.REGISTER_PASSWORD_INPUT, password)
#     if not checked:
#         robot_keywords.click_element(rb.TERMS_AND_CONDITIONS_CHECKBOX_VISIBLE)
#     robot_keywords.click_button(rb.CREATE_ACCOUNT_BUTTON)

def register_and_activate_account(driver, first_name, last_name, email, password, reg="api", from_email=rb.FROM_EMAIL_DEFAULT):
    api = CloudPortalAPI.CloudPortalAPI()

    if reg == "api":
        api.register_account(first_name, last_name, email, password)
    elif reg == "ui":
        api.register(first_name, last_name, email, password)
    robot_keywords.sleep(1)
    activate(driver, email, password, from_email=from_email)

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
    
# from robot_tests/Resources/front-end-resources/restore-pass-resource.robot    
def send_restore_password_email(driver: webdriver, email: str)->  None:

    robot_keywords.go_to_url(driver, rb.ENV + "/authorize")
    robot_keywords.wait_until_elements_are_visible(driver, [rb.LOG_IN_MODAL, rb.LOG_IN_NEXT_BUTTON, rb.EMAIL_INPUT])
    time.sleep(1)
    robot_keywords.wait_until_input_succeeds(driver, rb.EMAIL_INPUT, email)
    time.sleep(1)
    robot_keywords.click_element(driver, rb.LOG_IN_NEXT_BUTTON)
    robot_keywords.wait_until_element_is_visible(driver, rb.FORGOT_PASSWORD_BUTTON)
    robot_keywords.click_element(driver, rb.FORGOT_PASSWORD_BUTTON)
    robot_keywords.input_text(driver, rb.RESTORE_PASSWORD_EMAIL_INPUT, email)
    robot_keywords.click_element(driver, rb.RESET_PASSWORD_BUTTON)


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
    
def move_focus_and_check_badge_stays(driver, badge, new_focus):
    robot_keywords.element_should_be_visible(driver, badge)
    robot_keywords.click_element(driver, new_focus)
    robot_keywords.element_should_be_visible(driver, badge)

def move_focus_and_check_element(driver, element, new_focus):
    robot_keywords.click_element(driver, new_focus)
    robot_keywords.wait_until_element_is_visible(driver, element)

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

def wait_for_email(mail, recipient, timeout, status='UNSEEN'):
    start_time = time.time()

    while True:
        # Check if the timeout has been reached
        if time.time() - start_time > timeout:
            return None

        # Search the inbox for emails with specific "To" header
        result, data = mail.uid('search', None, f'(HEADER "To" "{recipient}")')
        email_ids = data[0].split()
        
        for email_id in email_ids:
            result, email_data = mail.uid('fetch', email_id, '(FLAGS)')
            email_flags = email_data[0].decode()  # decode the entire byte string
            if result == 'OK' and '\\Seen' not in email_flags:
                result, email_data = mail.uid('fetch', email_id, '(BODY.PEEK[HEADER])')
                raw_email = email_data[0][1].decode('utf-8')
                email_message = email.message_from_string(raw_email)
                return email_id
        time.sleep(1)

def check_language_logged_in(email, password, language="en_US"): 
    api = CloudPortalAPI.CloudPortalAPI()
    current_lang = api.get_account_language(email, password)
    if current_lang == language:
        api.set_account_language(email, password, language)
    time.sleep(2)

def delete_email(mail, email_uid):
    # Mark the email for deletion
    mail.uid('STORE', email_uid, '+FLAGS', '(\Deleted)')

    # Permanently remove mails that are marked for deletion
    mail.expunge()
    
def check_email_subject(self, email_id, sub_text, email_address, password, host, port):
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
   
def detect_language(text):
    detected_langs = str(Translator().detect(text))
    return detected_langs

def logout_japanese(driver:webdriver):

    robot_keywords.wait_until_page_does_not_contain_element(driver, rb.BACKDROP)
    element = """//header//li[contains(@class, 'dropdown-item-container')]//a/span[contains(text(),"ログアウト")]"""
    robot_keywords.wait_until_page_contains_element(driver, element)

    time.sleep(0.5)
    robot_keywords.click_element(driver, rb.ACCOUNT_DROPDOWN)
    robot_keywords.wait_until_element_is_visible(driver, element)
    robot_keywords.click_element(driver, element)
    validate_log_out(driver)

def set_language_anonymous():
    # currently disabled
    pass
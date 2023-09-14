import email
import imaplib
import json
import os
import re
import time
from email.header import decode_header
from random import randint

import urllib3
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

import robot_keywords
import robot_lists as rl
from NoptixLibrary.cloud_portal_api import CloudPortalAPI
from RobotVariables import RobotVariables
from generic_element import Element
from login import LoginDialog

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

rb = RobotVariables("en_US")

def activate(driver, email, password=rb.BASE_PASSWORD, from_email=rb.FROM_EMAIL_DEFAULT):
    if from_email:
        link = get_email_link(email, password, "activate")
        robot_keywords.go_to_url(link)
        for element in [rb.ACTIVATION_SUCCESS, rb.ACTIVATION_SUCCESS_ICON, rb.ACTIVATION_SUCCESS_LOG_IN_BUTTON]:
            robot_keywords.wait_until_element_is_visible(driver, element)
    else:
        api = CloudPortalAPI()
        api.activate_account_via_api(email, password)

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

def check_language_logged_in(email, password, language="en_US"): 
    api = CloudPortalAPI.CloudPortalAPI()
    current_lang = api.get_account_language(email, password)
    if current_lang == language:
        api.set_account_language(email, password, language)
    time.sleep(2)

def cloud_login(driver, email, password, validate=True, button=rb.LOG_IN_NAV_BAR, exists=True,  api=False, reset=False, two_FA=False, twoFA_backup_code="" ):
    if button:
        robot_keywords.wait_until_element_is_visible(driver, button)
        Element(driver, button).click()

    if validate and not two_FA:
        # check language variable and set it to default. That is, set language before logging in
        # TODO: check language
        pass
        #TODO: set user theme (ie, light or dark mode)
        pass
    robot_keywords.wait_until_elements_are_visible(driver, [rb.LOG_IN_MODAL, rb.LOG_IN_NEXT_BUTTON, rb.EMAIL_INPUT ])
    time.sleep(1)
    robot_keywords.input_text(driver, rb.EMAIL_INPUT, email)
    time.sleep(1)
    Element(driver, rb.LOG_IN_NEXT_BUTTON).click()

    if exists:
        robot_keywords.wait_until_element_is_visible(driver, rb.PASSWORD_INPUT)
        robot_keywords.input_text(driver, rb.PASSWORD_INPUT,password)
        time.sleep(1)
        robot_keywords.wait_until_element_is_visible(driver, rb.LOG_IN_BUTTON)
        Element(driver, rb.LOG_IN_BUTTON).click()
    else:
        robot_keywords.wait_until_elements_are_visible(driver,[rb.ACCOUNT_DOES_NOT_EXIST,rb.YOU_CAN_CREATE_AN_ACCOUNT])
    # TODO: Check if 2fa is true and there is no backup code
    if validate:
        robot_keywords.wait_until_element_is_visible(driver, rb.ACCOUNT_DROPDOWN)
    time.sleep(0.5)

def check_log_in(driver: webdriver, user: str, password: str, button=rb.LOG_IN_NAV_BAR):
    random_email = get_random_email(rb.BASE_EMAIL)
    #LoginDialog(driver).basic_cloud_login(random_email, rb.BASE_PASSWORD)
    LoginDialog(driver).basic_cloud_login(user, password)

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

def check_new_password_outline_and_error_message(driver, new_password, new_focus, input, input_name):
    Element(driver, new_focus).click()
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

def get_lang_list():
    jsonPath = os.path.join("customizations", rb.CUST_LANGUAGE_LIST)
    with open(jsonPath, encoding="utf-8") as langDict:
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
    robot_keywords.wait_until_element_is_visible(driver, element)
    Element(driver, element).click()
    validate_log_out(driver)

def move_focus_and_check_badge_stays(driver, badge, new_focus):
    badge = Element(driver, badge)
    badge.should_be_visible()
    badge.click()
    badge.should_be_visible()

def move_focus_and_check_element(driver, element, new_focus):
    Element(driver, new_focus).click()
    robot_keywords.wait_until_element_is_visible(driver, element)

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
    robot_keywords.go_to_url(driver, url)
    robot_keywords.location_should_be(driver, url)
    time.sleep(3)
    robot_keywords.title_should_be(driver, title)


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
        robot_keywords.go_to_url(driver, rb.ENV + "/authorize?client_type=create&view_type=" + view_type)
    else:
        robot_keywords.go_to_url(driver, "https://cloud-test.hdw.mx/authorize?client_type=create")
    validate_on_register_page(driver)

    robot_keywords.input_text(driver, rb.REGISTER_FIRST_NAME_INPUT, first_name)
    robot_keywords.input_text(driver, rb.REGISTER_LAST_NAME_INPUT, last_name)
    # continue on failure
    try:
        robot_keywords.wait_until_element_is_visible(driver, rb.REGISTER_EMAIL_INPUT_LOCKED)
    except:
        pass
    robot_keywords.input_text(driver, rb.REGISTER_EMAIL_INPUT, email)
    robot_keywords.input_text(driver, rb.REGISTER_PASSWORD_INPUT, password)
    if not checked:
        Element(driver, rb.TERMS_AND_CONDITIONS_CHECKBOX_VISIBLE).click()
    Element(driver, rb.CREATE_ACCOUNT_BUTTON).click()




def set_language_anonymous():
    # currently disabled
    pass

# from robot_tests/Resources/front-end-resources/restore-pass-resource.robot    
def send_restore_password_email(driver: webdriver, email: str)->  None:

    robot_keywords.go_to_url(driver, rb.ENV + "/authorize")
    robot_keywords.wait_until_elements_are_visible(driver, [rb.LOG_IN_MODAL, rb.LOG_IN_NEXT_BUTTON, rb.EMAIL_INPUT])
    time.sleep(1)
    robot_keywords.wait_until_input_succeeds(driver, rb.EMAIL_INPUT, email)
    time.sleep(1)
    Element(driver, rb.LOG_IN_NEXT_BUTTON).click()
    robot_keywords.wait_until_element_is_visible(driver, rb.FORGOT_PASSWORD_BUTTON)
    Element(driver, rb.FORGOT_PASSWORD_BUTTON).click()
    robot_keywords.input_text(driver, rb.RESTORE_PASSWORD_EMAIL_INPUT, email)
    Element(driver, rb.RESET_PASSWORD_BUTTON).click()

def validate_log_in(driver: webdriver, email: str, password: str, timeout: int = 10) -> None:
    robot_keywords.wait_until_element_is_visible(driver, rb.ACCOUNT_DROPDOWN)
    robot_keywords.wait_until_element_is_not_visible(driver, """//div[@class="placeholder"]""")
    # TODO: get ${mode} and define CLOUD_NAME
    # if mode == 'webadmin':
    #     robot_keywords.wait_until_element_is_visible(driver, rb.CLOUD_NAME)

def validate_log_out(driver: webdriver):
    robot_keywords.wait_until_element_is_not_visible(driver, rb.BACKDROP)
    robot_keywords.wait_until_page_contains_element(driver, rb.ANONYMOUS_BODY)

def verify_in_account_page(driver: webdriver):
    robot_keywords.wait_until_elements_are_visible(driver, [rb.ACCOUNT_EMAIL,
                                                            rb.ACCOUNT_FIRST_NAME,
                                                            rb.ACCOUNT_LAST_NAME,
                                                            rb.ACCOUNT_LANGUAGE_DROPDOWN,
                                                            rb.ACCOUNT_DROPDOWN,
                                                            rb.DELETE_ACCOUNT_BUTTON
                                                            ])
    for element in [rb.ACCOUNT_SETTINGS_BUTTON, rb.ACCOUNT_CANCEL]:
        Element(driver, element).should_not_be_visible()
    time.sleep(0.5)

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

def verify_delete_user_dialog(driver: webdriver):
    robot_keywords.wait_until_elements_are_visible(driver,
                                                   [rb.DELETE_ACCOUNT_MODAL_BUTTON, 
                                                     rb.DELETE_ACCOUNT_CANCEL_BUTTON,
                                                     rb.DELETE_ACCOUNT_PASSWORD_INPUT,
                                                     rb.DELETE_ACCOUNT_CLOSE_BUTTON,
                                                     rb.DELETE_ACCOUNT_PASSWORD_LABEL,
                                                     rb.DELETE_ACCOUNT_INFO,
                                                     rb.DELETE_ACCOUNT_HEADER])
    
def validate_on_register_page(driver: webdriver):
    robot_keywords.wait_until_elements_are_visible(driver, 
                                                   [rb.REGISTER_FIRST_NAME_INPUT, 
                                                    rb.REGISTER_LAST_NAME_INPUT, 
                                                    rb.REGISTER_PASSWORD_INPUT, 
                                                    rb.CREATE_ACCOUNT_BUTTON])








    




    



    















   





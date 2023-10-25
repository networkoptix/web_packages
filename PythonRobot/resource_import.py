import imaplib
import json
import logging
import pathlib
import time
from contextlib import contextmanager
from random import randint
from typing import ContextManager

import urllib3
from selenium.webdriver.remote.webdriver import WebDriver

import robot_lists as rl
from NoptixLibrary.cloud_portal_api import CloudPortalAPI
from RobotVariables import RobotVariables
from browsers.chrome import ChromeBrowser
from email_access import Email
from generic_elements import Button
from generic_elements import Checkbox
from generic_elements import DropDown
from generic_elements import DropDownOption
from generic_elements import ElementNotInDOM
from generic_elements import Image
from generic_elements import PageText
from generic_elements import Pane
from generic_elements import TextField
from generic_elements import Tooltip

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

rb = RobotVariables("en_US")


def activate(driver, email, password=rb.BASE_PASSWORD, from_email=rb.FROM_EMAIL_DEFAULT):
    if from_email:
        link = get_email_link(email)
        driver.get(link)
        PageText(driver, rb.ACTIVATION_SUCCESS).wait_until_visible()
        Image(driver, rb.ACTIVATION_SUCCESS_ICON).wait_until_visible()
        Button(driver, rb.ACTIVATION_SUCCESS_LOG_IN_BUTTON).wait_until_visible()
    else:
        api = CloudPortalAPI()
        api.activate_account_via_api(email, password)


def check_language_logged_in(email, password, language="en_US"):
    api = CloudPortalAPI()
    current_lang = api.get_account_language(email, password)
    if current_lang == language:
        api.set_account_language(email, password, language)
    time.sleep(2)


def cloud_login(driver, email, password, validate=True, button=rb.LOG_IN_NAV_BAR, exists=True,
                api=False, reset=False, two_FA=False, twoFA_backup_code=""):
    if button:
        Button(driver, button).wait_until_visible()
        Button(driver, button).click()

    if validate and not two_FA:
        # check language variable and set it to default. That is, set language before logging in
        # TODO: check language
        pass
        # TODO: set user theme (ie, light or dark mode)
        pass
    Pane(driver, rb.LOG_IN_MODAL).wait_until_visible()
    Button(driver, rb.LOG_IN_NEXT_BUTTON).wait_until_visible()
    TextField(driver, rb.EMAIL_INPUT).wait_until_visible()
    time.sleep(1)
    TextField(driver, rb.EMAIL_INPUT).input_text(email)
    time.sleep(1)
    Button(driver, rb.LOG_IN_NEXT_BUTTON).click()

    if exists:
        TextField(driver, rb.PASSWORD_INPUT).wait_until_visible()
        TextField(driver, rb.PASSWORD_INPUT).input_text(password)
        time.sleep(1)
        log_in_button = Button(driver, rb.LOG_IN_BUTTON)
        log_in_button.wait_until_visible()
        log_in_button.click()
    else:
        PageText(driver, rb.ACCOUNT_DOES_NOT_EXIST).wait_until_visible()
        PageText(driver, rb.YOU_CAN_CREATE_AN_ACCOUNT).wait_until_visible()
    # TODO: Check if 2fa is true and there is no backup code
    if validate:
        DropDown(driver, rb.ACCOUNT_DROPDOWN).wait_until_visible()
    time.sleep(0.5)


def check_password_badge(driver: WebDriver, password, new_focus):
    if password != "":
        Image(driver, rb.PASSWORD_BADGE).wait_until_visible()
    if password == rb.COMMON_PASSWORD:
        Image(driver, rb.PASSWORD_IS_TOO_COMMON_BADGE).wait_until_visible()
    elif password in rl.WEAK_PASSWORDS:
        Image(driver, rb.PASSWORD_IS_WEAK_BADGE).wait_until_visible()
    elif password in rl.INCORRECT_PASSWORDS:
        Image(driver, rb.PASSWORD_INCORRECT_BADGE).wait_until_visible()
    elif password in rl.FAIR_PASSWORDS:
        Image(driver, rb.PASSWORD_IS_FAIR_BADGE).wait_until_visible()
    elif password in rl.GOOD_PASSWORDS:
        Image(driver, rb.PASSWORD_IS_GOOD_BADGE).wait_until_visible()
    elif password == rb.SEVEN_CHAR_PASSWORD:
        Image(driver, rb.PASSWORD_IS_TOO_SHORT_BADGE).wait_until_visible()

    if password != "":
        Image(driver, rb.PASSWORD_BADGE).hover()

    if password == rb.COMMON_PASSWORD:
        too_common = Tooltip(
            driver,
            f'{rb.PASSWORD_BADGE_TOOLTIP}//div[contains(@class, "tooltip-body") '
            f'and text()="{rb.PASSWORD_TOO_COMMON_TEXT}"]',
        )
        too_common.wait_until_visible()
    elif password in rl.WEAK_PASSWORDS:
        weak_password = Tooltip(
            driver,
            f'{rb.PASSWORD_BADGE_TOOLTIP}//div[contains(@class, "tooltip-body") '
            f'and text()="{rb.PASSWORD_IS_WEAK_TEXT}"]',
        )
        weak_password.wait_until_visible()
    elif password in rl.INCORRECT_PASSWORDS:
        incorrect_password = Tooltip(
            driver,
            f'{rb.PASSWORD_BADGE_TOOLTIP}//div[contains(@class, "tooltip-body") '
            f'and text()="{rb.PASSWORD_SPECIAL_CHARS_TEXT}"]',
        )
        incorrect_password.wait_until_visible()
    elif password in rl.FAIR_PASSWORDS:
        fair_password = Tooltip(
            driver,
            f'{rb.PASSWORD_BADGE_TOOLTIP}//div[contains(@class, "tooltip-body") '
            f'and text()="{rb.PASSWORD_IS_WEAK_TEXT}"]',
        )
        fair_password.wait_until_visible()
    elif password == rb.SEVEN_CHAR_PASSWORD:
        seven_char_password = Tooltip(
            driver,
            f'{rb.PASSWORD_BADGE_TOOLTIP}//div[contains(@class, "tooltip-body") '
            f'and contains(text(), "{rb.PASSWORD_TOO_SHORT_TEXT}")]',
        )
        seven_char_password.wait_until_visible()

    if password == rb.COMMON_PASSWORD:
        move_focus_and_check_badge_stays(driver, rb.PASSWORD_IS_TOO_COMMON_BADGE, new_focus)
    elif password in rl.WEAK_PASSWORDS:
        move_focus_and_check_badge_stays(driver, rb.PASSWORD_IS_WEAK_BADGE, new_focus)
    elif password in rl.INCORRECT_PASSWORDS:
        move_focus_and_check_badge_stays(driver, rb.PASSWORD_INCORRECT_BADGE, new_focus)
    elif password in rl.FAIR_PASSWORDS:
        Image(driver, rb.PASSWORD_IS_FAIR_BADGE).wait_until_visible()
    elif password in rl.GOOD_PASSWORDS:
        Image(driver, rb.PASSWORD_IS_GOOD_BADGE).wait_until_visible()
    elif password == rb.SEVEN_CHAR_PASSWORD:
        move_focus_and_check_badge_stays(driver, rb.PASSWORD_IS_TOO_SHORT_BADGE, new_focus)


def check_new_password_outline_and_error_message(driver, new_password, new_focus, input,
                                                 input_name):
    TextField(driver, new_focus).click()
    if new_password not in rl.FAIR_PASSWORDS and new_password not in rl.GOOD_PASSWORDS:
        field = TextField(driver, input)
        assert field.value_of_css_property("border-bottom-color") == rb.ERROR_COLOR_WITH_OPACITY
        assert field.value_of_css_property("border-top-color") == rb.ERROR_COLOR_WITH_OPACITY
        assert field.value_of_css_property("border-right-color") == rb.ERROR_COLOR_WITH_OPACITY
        assert field.value_of_css_property("border-left-color") == rb.ERROR_COLOR_WITH_OPACITY
        assert field.value_of_css_property("color") == rb.ERROR_COLOR_WITH_OPACITY
        password_element = TextField(
            driver,
            f"//nx-password-input[@name='{input_name}' "
            f"and contains(@class, 'ng-invalid')]//input[@id='{input_name}']",
        )
        password_element.wait_until_visible()
    if new_password == "" or new_password == " ":
        TextField(driver, input).input_text("")
        move_focus_and_check_element(driver, rb.PASSWORD_IS_REQUIRED, new_focus)
    elif new_password == rb.SEVEN_CHAR_PASSWORD:
        move_focus_and_check_element(driver, rb.PASSWORD_TOO_SHORT, new_focus)
    elif new_password in rl.INCORRECT_PASSWORDS:
        move_focus_and_check_element(driver, rb.PASSWORD_SPECIAL_CHARS, new_focus)
    elif new_password == rb.COMMON_PASSWORD:
        move_focus_and_check_element(driver, rb.PASSWORD_TOO_COMMON, new_focus)
    elif new_password in rl.WEAK_PASSWORDS:
        move_focus_and_check_element(driver, rb.PASSWORD_IS_WEAK, new_focus)


def delete_email(mail, email_uid):
    # Mark the email for deletion
    mail.uid('STORE', email_uid, '+FLAGS', '(\Deleted)')

    # Permanently remove mails that are marked for deletion
    mail.expunge()


def get_email_link(recipient):
    email_con = Email()
    email_id = email_con.wait_for_email(recipient)
    link_type = "activate"
    email_con.check_email_subject(email_id, rb.ACTIVATE_YOUR_ACCOUNT_EMAIL_SUBJECT)
    link = email_con.get_email_link(recipient, link_type)
    return link


def get_headless_chrome():
    return ChromeBrowser()


@contextmanager
def get_chrome() -> ContextManager[ChromeBrowser]:
    driver = get_headless_chrome()
    try:
        yield driver
    finally:
        driver.quit()


def get_lang_list():
    path = pathlib.Path(__file__).parent / 'customizations' / 'default_lang_list.json'
    with open(path, encoding="utf-8") as langDict:
        return json.load(langDict)


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


def logout_japanese(driver: WebDriver):
    Pane(driver, rb.BACKDROP).wait_until_does_not_exist()
    element = """//header//li[contains(@class, 'dropdown-item-container')]//a/span[contains(text(),"ログアウト")]"""
    DropDownOption(driver, element).wait_until_visible()

    time.sleep(0.5)
    DropDown(driver, rb.ACCOUNT_DROPDOWN).click()
    DropDownOption(driver, element).wait_until_visible()
    DropDownOption(driver, element).click()
    validate_log_out(driver)


def move_focus_and_check_badge_stays(driver, badge, new_focus):
    badge = Image(driver, badge)
    badge.wait_until_visible()
    badge.click()
    badge.wait_until_visible()


def move_focus_and_check_element(driver, element, new_focus):
    TextField(driver, new_focus).click()
    PageText(driver, element).wait_until_visible()


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


def register_and_activate_account(driver, first_name, last_name, email, password, reg="api",
                                  from_email=rb.FROM_EMAIL_DEFAULT):
    api = CloudPortalAPI()

    if reg == "api":
        api.register_account(first_name, last_name, email, password)
    elif reg == "ui":
        api.register(first_name, last_name, email, password)
    time.sleep(1)
    activate(driver, email, password, from_email=from_email)


def register(driver, first_name, last_name, email, password, checked=False, view_type=""):
    if view_type:
        url = rb.ENV + "/authorize?client_type=create&view_type=" + view_type
        driver.get(url)
    else:
        driver.get("https://cloud-test.hdw.mx/authorize?client_type=create")
    validate_on_register_page(driver)

    TextField(driver, rb.REGISTER_FIRST_NAME_INPUT).input_text(first_name)
    TextField(driver, rb.REGISTER_LAST_NAME_INPUT).input_text(last_name)
    TextField(driver, rb.REGISTER_EMAIL_INPUT).input_text(email)
    TextField(driver, rb.REGISTER_PASSWORD_INPUT).input_text(password)
    if not checked:
        # Workaround. Rework Checkbox wrapper to simplify arguments.
        Checkbox(driver, rb.TERMS_AND_CONDITIONS_CHECKBOX_VISIBLE).click()
    Button(driver, rb.CREATE_ACCOUNT_BUTTON).click()


# from robot_tests/Resources/front-end-resources/restore-pass-resource.robot
def send_restore_password_email(driver: WebDriver, email: str) -> None:
    url = rb.ENV + "/authorize"
    driver.get(url)
    Pane(driver, rb.LOG_IN_MODAL).wait_until_visible()
    Button(driver, rb.LOG_IN_NEXT_BUTTON).wait_until_visible()
    TextField(driver, rb.EMAIL_INPUT).wait_until_visible()
    time.sleep(1)
    TextField(driver, rb.EMAIL_INPUT).input_text(email)
    time.sleep(1)
    Button(driver, rb.LOG_IN_NEXT_BUTTON).click()
    Button(driver, rb.FORGOT_PASSWORD_BUTTON).wait_until_visible()
    Button(driver, rb.FORGOT_PASSWORD_BUTTON).click()
    TextField(driver, rb.RESTORE_PASSWORD_EMAIL_INPUT).input_text(email)
    Button(driver, rb.RESET_PASSWORD_BUTTON).click()


def validate_log_out(driver: WebDriver):
    Pane(driver, rb.BACKDROP).wait_until_not_visible(10)
    PageText(driver, rb.ANONYMOUS_BODY).wait_until_visible()


def verify_in_account_page(driver: WebDriver):
    TextField(driver, rb.ACCOUNT_EMAIL).wait_until_visible()
    TextField(driver, rb.ACCOUNT_FIRST_NAME).wait_until_visible()
    TextField(driver, rb.ACCOUNT_LAST_NAME).wait_until_visible()
    DropDown(driver, rb.ACCOUNT_LANGUAGE_DROPDOWN).wait_until_visible()
    DropDown(driver, rb.ACCOUNT_DROPDOWN).wait_until_visible()
    Button(driver, rb.DELETE_ACCOUNT_BUTTON).wait_until_visible()
    Button(driver, rb.ACCOUNT_SETTINGS_BUTTON).wait_until_not_visible()
    Button(driver, rb.ACCOUNT_CANCEL).wait_until_not_visible()
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


def validate_on_register_page(driver: WebDriver):
    TextField(driver, rb.REGISTER_FIRST_NAME_INPUT).wait_until_visible()
    TextField(driver, rb.REGISTER_LAST_NAME_INPUT).wait_until_visible()
    TextField(driver, rb.REGISTER_PASSWORD_INPUT).wait_until_visible()
    Button(driver, rb.CREATE_ACCOUNT_BUTTON).wait_until_visible()


_logger = logging.getLogger(__name__)

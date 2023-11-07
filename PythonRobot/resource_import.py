import json
import logging
import pathlib
import time
from contextlib import contextmanager
from typing import ContextManager

import urllib3

from NoptixLibrary.cloud_portal_api import CloudPortalAPI
from RobotVariables import RobotVariables
from browsers.chrome import ChromeBrowser
from email_access import EmailClient
from generic_elements import Button
from generic_elements import Checkbox
from generic_elements import DropDown
from generic_elements import DropDownOption
from generic_elements import Image
from generic_elements import PageText
from generic_elements import Pane
from generic_elements import TextField


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


def get_email_link(recipient):
    with EmailClient(email_alias=recipient) as client:
        email_message = client.wait_for_activate_account_email()
        return email_message.get_activate_account_link()


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


def logout_japanese(driver):
    Pane(driver, rb.BACKDROP).wait_until_does_not_exist()
    element = """//header//li[contains(@class, 'dropdown-item-container')]//a/span[contains(text(),"ログアウト")]"""
    DropDownOption(driver, element).wait_until_visible()

    time.sleep(0.5)
    DropDown(driver, rb.ACCOUNT_DROPDOWN).click()
    DropDownOption(driver, element).wait_until_visible()
    DropDownOption(driver, element).click()
    validate_log_out(driver)


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


def send_restore_password_email(driver, email: str) -> None:
    url = rb.ENV + "/authorize"
    driver.get(url)
    Pane(driver, rb.LOG_IN_MODAL).wait_until_visible()
    TextField(driver, rb.EMAIL_INPUT).input_text(email)
    Button(driver, rb.LOG_IN_NEXT_BUTTON).click()
    Button(driver, rb.FORGOT_PASSWORD_BUTTON).click()
    TextField(driver, rb.RESTORE_PASSWORD_EMAIL_INPUT).input_text(email)
    Button(driver, rb.RESET_PASSWORD_BUTTON).click()


def validate_log_out(driver):
    Pane(driver, rb.BACKDROP).wait_until_not_visible(10)
    PageText(driver, rb.ANONYMOUS_BODY).wait_until_visible()


def validate_on_register_page(driver):
    TextField(driver, rb.REGISTER_FIRST_NAME_INPUT).wait_until_visible()
    TextField(driver, rb.REGISTER_LAST_NAME_INPUT).wait_until_visible()
    TextField(driver, rb.REGISTER_PASSWORD_INPUT).wait_until_visible()
    Button(driver, rb.CREATE_ACCOUNT_BUTTON).wait_until_visible()


_logger = logging.getLogger(__name__)

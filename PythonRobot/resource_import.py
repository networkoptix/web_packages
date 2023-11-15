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
from generic_elements import DropDown
from generic_elements import DropDownOption
from generic_elements import Image
from generic_elements import PageText
from generic_elements import Pane


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
    Pane(driver, rb.BACKDROP).wait_until_not_visible()
    element = """//header//li[contains(@class, 'dropdown-item-container')]//a/span[contains(text(),"ログアウト")]"""
    DropDownOption(driver, element).wait_until_visible()

    time.sleep(0.5)
    DropDown(driver, rb.ACCOUNT_DROPDOWN).click()
    DropDownOption(driver, element).wait_until_visible()
    DropDownOption(driver, element).click()
    validate_log_out(driver)


def validate_log_out(driver):
    Pane(driver, rb.BACKDROP).wait_until_not_visible(10)
    PageText(driver, rb.ANONYMOUS_BODY).wait_until_visible()


_logger = logging.getLogger(__name__)

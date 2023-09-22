import time
from pathlib import Path
from typing import Optional

from selenium.common.exceptions import NoSuchElementException
from selenium.common.exceptions import TimeoutException
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.remote.webdriver import WebDriver

import robot_keywords
from RobotVariables import RobotVariables
from generic_element import Element
from toast_notification import ToastNotification
from variables import ENV
from wrappers import Button
from wrappers import Checkbox
from wrappers import PageText
from wrappers import TextField


class SystemAdmin:
    def __init__(self, driver: WebDriver, lang="en_US"):
        self.driver = driver
        self.rb = RobotVariables(lang)
        self._wait_until_page_loaded()
        # Todo: find way to pass id in
        # self._location_is_correct()

    def disconnect_from_cloud_button(self):
        translated_xpath = self.rb.replace_nested_variables("//button[contains(text(),'{DISCONNECT_BUTTON_TEXT}')]")
        return Button(self.driver, translated_xpath)

    def disconnect_modal_disconnect_button(self):
        translated_xpath = self.rb.replace_nested_variables(
            "//nx-modal-disconnect-content//button[contains(text(), '{DISCONNECT_BUTTON_TEXT}')]")
        return Button(self.driver, translated_xpath)

    def disconnect_from_account_button(self):
        translated_xpath = self.rb.replace_nested_variables(
            "//button[contains(text(),'{DISCONNECT_FROM_MY_ACCOUNT_TEXT}')]")
        return Button(self.driver, translated_xpath)

    def disconnect_from_account_confirm_button(self):
        translated_xpath = self.rb.replace_nested_variables(
            "//nx-modal-generic-content//button[contains(text(),'{DISCONNECT_BUTTON_TEXT}')]")
        return Button(self.driver, translated_xpath)

    def disconnect_from_account_cancel_button(self):
        translated_xpath = self.rb.replace_nested_variables(
            "//nx-modal-generic-content//button[span[contains(text(),'{CANCEL_BUTTON_TEXT}')]]")
        return Button(self.driver, translated_xpath)

    def disconnect_from_cloud_toast_notification(self):
        disconnect_message = self.rb.__getattr__('SUCCESSFULLY_DISCONNECTED')
        return ToastNotification(self.driver, disconnect_message)

    def disconnect_from_account_toast_notification(self, system_name):
        disconnect_message = self.rb.__getattr__("SYSTEM_DELETED_FROM_ACCOUNT")
        replaced_disconnect_message = disconnect_message.replace("{{system_name}}", system_name)
        return ToastNotification(self.driver, replaced_disconnect_message)

    def mandatory_2fa_chechbox(self):
        return Checkbox(self.driver, "//nx-checkbox[@name='mandatory2fa']", "//input")

    def twofa_verification_code_input(self):
        return TextField(self.driver, '//input[@id="verificationCode"]')

    def twofa_enable_button(self):
        return Button(self.driver, "//button[text()='Enable']")

    def merge_with_another_system_button(self):
        translated_xpath = self.rb.replace_nested_variables("//button[span[text()='{MERGE_SYSTEM_BUTTON_TEXT}']]")
        return Button(self.driver, translated_xpath)

    def merge_next_button(self):
        translated_xpath = self.rb.replace_nested_variables("//button[contains(text(),'{NEXT_TEXT}')]")
        return Button(self.driver, translated_xpath)

    def merge_systems_button(self):
        translated_xpath = self.rb.replace_nested_variables("//button[text()='{MERGE_SYSTEMS_TEXT}']")
        return Button(self.driver, translated_xpath)

    def primary_first_system(self):
        return Checkbox(self.driver, "//label[@for='firstSystem']", "//input[@id='firstSystem']")

    def primary_second_system(self):
        return Checkbox(self.driver, "//label[@for='secondSystem']", "//input[@id='secondSystem']")

    def system_is_being_merged(self):
        translated_xpath = self.rb.replace_nested_variables("//div[contains(text(), '${SYSTEM_IS_BEING_MERGED_TEXT}')]")
        return PageText(self.driver, translated_xpath)

    def systems_merged_success_toast_notification(self, primary_system_name, secondary_system_name):
        alert_text = self.rb.__getattr__("SYSTEM_MERGE_COMPLETED_TEXT", get_replacements=False)
        alert_text = alert_text.replace("%PRIMARY%", primary_system_name)
        alert_text = alert_text.replace("%SECONDARY%", secondary_system_name)
        return ToastNotification(self.driver, alert_text)

    def has_no_access_message(self) -> bool:
        error_message = self.rb.__getattr__('SYSTEM_NO_ACCESS_TEXT')
        try:
            self.driver.find_element(By.XPATH, f'//h2[@name="FAILED_TO_ACCESS_SYSTEM" and contains(text(), \'{error_message}\')]')
        except NoSuchElementException:
            return False
        return True

    def get_system_name_edit_field(self) -> '_SystemName':
        element = self.driver.find_element(By.XPATH, '//div/nx-editable-heading//nx-text-editable')
        return _SystemName(element, self.rb)

    def get_cancel_button(self) -> Optional[Button]:
        button_text = self.rb.__getattr__('CANCEL_BUTTON_TEXT')
        locator = f'//nx-cancel-button//button[contains(text(), "{button_text}")]'
        try:
            self.driver.find_element(By.XPATH, locator)
        except NoSuchElementException:
            return None
        return Button(self.driver, locator)

    def get_save_button(self):
        button_text = self.rb.__getattr__('SAVE_BUTTON_TEXT')
        locator = f'//nx-process-button//button[contains(text(), "{button_text}")]'
        try:
            self.driver.find_element(By.XPATH, locator)
        except NoSuchElementException:
            return None
        return Button(self.driver, locator)

    def has_no_unsaved_changes_message(self) -> bool:
        no_unsaved_changes = self.rb.__getattr__('NO_UNSAVED_CHANGES_TEXT')
        locator = f"//nx-apply//div[contains(text(), '{no_unsaved_changes}')]"
        try:
            self.driver.find_element(By.XPATH, locator)
        except NoSuchElementException:
            return False
        return True

    def refresh(self):
        self.driver.refresh()
        self._wait_until_page_loaded()

    def get_information_tab(self) -> '_TabInformation':
        """
        Problem: the Information tab couldn't appear without switching to another tab or refreshing the page
        See: https://networkoptix.atlassian.net/browse/CLOUD-11437
        """
        locator = f'//header//a[contains(text(),"{self.rb.INFORMATION_TEXT}")]'

        def _wait():
            started_at = time.monotonic()
            timeout_sec = 30
            while True:
                if len(self.driver.find_elements_by_xpath(locator)) > 0:
                    break
                try:
                    robot_keywords.wait_until_page_contains_element(self.driver, locator, timeout=10)
                except TimeoutException:
                    if time.monotonic() - started_at > timeout_sec:
                        raise TimeoutError(f"{locator!r} is not visible after {timeout_sec} seconds")
                    self.driver.refresh()
        _wait()  # It is a workaround. To be removed after resolving CLOUD-11437
        return _TabInformation(self.driver, locator)

    def _wait_until_page_loaded(self):
        robot_keywords.wait_until_page_contains_element(self.driver, "//nx-system-settings-component")
        robot_keywords.wait_until_page_contains_element(
            self.driver, "//div[contains(@class, 'fixed-sidebar')]//a[@id='servers']")
        robot_keywords.wait_until_page_contains_element(
            self.driver, "//div/nx-editable-heading//nx-text-editable")

    def _location_is_correct(self):
        robot_keywords.location_should_be(self.driver, f"{ENV}systems/")


class _SystemName:

    def __init__(self, element, rb: RobotVariables):
        self._element = element
        self._rb = rb

    def set_text(self, new_name: str):
        self.clear_text()
        self._element.send_keys(new_name)

    def get_text(self) -> str:
        return self._element.text

    def clear_text(self):
        current_text = self.get_text()
        self._element.click()
        for _ in range(len(current_text)):
            self._element.send_keys(Keys.ARROW_RIGHT)
            self._element.send_keys(Keys.BACKSPACE)

    def has_empty_field_error(self):
        border_color = self._element.value_of_css_property('border-color')
        return border_color == self._rb.__getattr__('ERROR_COLOR')


class _TabInformation:

    def __init__(self, driver: WebDriver, locator: str, variables: RobotVariables):
        self._driver = driver
        self._locator = locator
        self._element = Element(driver, locator)
        self._variables = variables

    def click(self):
        self._element.click()
        # The page always renders in online status and then changes to offline if needed.
        # Without a sleep, the following code does not have time to detect the offline status.
        time.sleep(2)
        started_at = time.monotonic()
        timeout_sec = 10
        while True:
            if self._is_system_online() or self.is_current_system_inaccessible():
                break
            if time.monotonic() - started_at > timeout_sec:
                raise TimeoutError(f"{self._locator!r} is not visible after {timeout_sec} seconds")
            time.sleep(1)

    def check_links(self):
        robot_keywords.wait_until_page_contains_element(self._driver, '//nx-menu//nx-level-1-item/a[@id="alerts"]')
        robot_keywords.wait_until_page_contains_element(self._driver, '//nx-menu//nx-level-1-item/a[@id="systems"]')
        robot_keywords.wait_until_page_contains_element(self._driver, '//nx-menu//nx-level-1-item/a[@id="servers"]')
        robot_keywords.wait_until_page_contains_element(self._driver, '//nx-menu//nx-level-1-item/a[@id="networkInterfaces"]')
        robot_keywords.wait_until_page_contains_element(self._driver, '//div[contains(@class,"menuLinks")]/nx-health-update')
        robot_keywords.wait_until_page_contains_element(self._driver, '//div[contains(@class,"menuLinks")]/div')

    def check_links_uploaded(self):
        robot_keywords.wait_until_page_contains_element(self._driver, '//nx-menu//nx-level-1-item/a[@id="alerts"]')
        robot_keywords.wait_until_page_contains_element(self._driver, '//nx-menu//nx-level-1-item/a[@id="systems"]')
        robot_keywords.wait_until_page_contains_element(self._driver, '//nx-menu//nx-level-1-item/a[@id="storages"]')
        robot_keywords.wait_until_page_contains_element(self._driver, '//nx-menu//nx-level-1-item/a[@id="servers"]')
        robot_keywords.wait_until_page_contains_element(self._driver, '//nx-menu//nx-level-1-item/a[@id="networkInterfaces"]')
        robot_keywords.wait_until_page_contains_element(self._driver, '//div[contains(@class,"menuLinks")]/div')

    def is_current_system_inaccessible(self) -> bool:
        return len(self._driver.find_elements_by_xpath(
            f'//div[contains(text(),"{self._variables.SYSTEM_CANNOT_BE_ACCESSED_TEXT}")]')) > 0

    def upload_json_report(self, filename: Path):
        e = Element(self._driver, '//input[contains(@class,"ngx-file-drop__file-input")]')
        e.send_keys(str(filename))
        started_at = time.monotonic()
        timeout_sec = 10
        while True:
            if self._is_imported_report():
                break
            if time.monotonic() - started_at > timeout_sec:
                raise RuntimeError(f"Report did not load after {timeout_sec} seconds")
            time.sleep(0.5)

    def _is_imported_report(self) -> bool:
        return len(self._driver.find_elements_by_xpath(
            f'//nx-ribbon//div[@class="message"]//div[contains(text(),"{self._variables.VIEWING_IMPORTED_REPORT_TEXT}")]')) > 0

    def _is_system_online(self) -> bool:
        return len(self._driver.find_elements_by_xpath('//nx-menu//nx-level-1-item')) > 0

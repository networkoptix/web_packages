import logging
import time

from selenium.common.exceptions import ElementClickInterceptedException
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.remote.webdriver import WebDriver
from selenium.webdriver.common.by import By

from RobotVariables import RobotVariables
from browsers.chrome import ChromeBrowser
from generic_elements import Button
from generic_elements import Checkbox
from generic_elements import ElementNotInDOM
from generic_elements import ElementNotVisible
from generic_elements import Page
from generic_elements import PageText
from generic_elements import TabItem
from generic_elements import TextField
from system_admin_tab_information import TabInformation
from system_admin_tab_settings import TabSettings
from system_left_menu import SystemLeftMenu
from toast_notification import ToastNotification
from variables import ENV

_logger = logging.getLogger(__name__)


class SystemAdmin:
    def __init__(self, driver: ChromeBrowser, lang="en_US"):
        self.driver = driver
        self.rb = RobotVariables(lang)
        self._wait_until_page_loaded()
        # Todo: find way to pass id in
        # self._location_is_correct()

    def disconnect_from_cloud_button(self):
        translated_xpath = self.rb.replace_nested_variables("//button[contains(text(),'{DISCONNECT_BUTTON_TEXT}')]")
        return Button(self.driver, translated_xpath)
    
    def disconnect_system_modal_button(self):
        return Button(self.driver, "//nx-process-button[@data-testid='disconnectSystemBtn']//button")

    def disconnect_modal_disconnect_button(self):
        translated_xpath = self.rb.replace_nested_variables(
            "//nx-modal-generic-content//button[contains(text(), '{DISCONNECT_BUTTON_TEXT}')]")
        return Button(self.driver, translated_xpath)

    def disconnect_modal_warning(self):
        translated_xpath = self.rb.replace_nested_variables(
            "//nx-modal-generic-content//p[contains(text(), '{DISCONNECT_MODAL_WARNING_TEXT}')]")
        return PageText(self.driver, translated_xpath)

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
    
    def system_offline_text(self):
        return PageText(self.driver, f"//div[contains(text(),'{self.rb.SYSTEM_IS_OFFLINE_TEXT}')]")

    def ensure_system_online(self, system_name: str, timeout = 10.0):
        error_message = f"System {system_name} is offline and cannot be merged with the current one"
        started_at = time.monotonic()
        clicked_next_button = False
        while True:
            error = PageText(
                self.driver,
                f'//nx-modal-merge-content//p[text()="{error_message}"]',
                )
            try:
                error.wait_until_visible()
            except (ElementNotVisible, ElementNotInDOM):
                break
            if time.monotonic() - started_at > timeout:
                raise RuntimeError(f"System {system_name} is not ready for merge in {timeout} seconds")
            Button(self.driver, '//nx-modal-merge-content//button[text()="Check"]').click()
            clicked_next_button = True
            time.sleep(0.5)
        if not clicked_next_button:
            self.merge_next_button().click()

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

    def get_system_name_edit_field(self) -> '_SystemName':
        text_field = TextField(
            self.driver,
            '//div/nx-editable-heading//nx-text-editable',
            )
        return _SystemName(text_field, self.rb)

    def get_cancel_button(self) -> Button:
        button_text = self.rb.__getattr__('CANCEL_BUTTON_TEXT')
        locator = f'//nx-cancel-button//button[contains(text(), "{button_text}")]'
        return Button(self.driver, locator)

    def get_save_button(self) -> Button:
        button_text = self.rb.__getattr__('SAVE_BUTTON_TEXT')
        locator = f'//nx-process-button//button[contains(text(), "{button_text}")]'
        return Button(self.driver, locator)

    def _has_no_unsaved_changes_message(self) -> bool:
        no_unsaved_changes = self.rb.__getattr__('NO_UNSAVED_CHANGES_TEXT')
        locator = f"//nx-apply//div[contains(text(), '{no_unsaved_changes}')]"
        text_element = PageText(self.driver, locator)
        try:
            text_element.wait_until_visible()
        except ElementNotVisible:
            return False
        return True

    def wait_for_unsaved_changes_messages(self):
        started_at = time.monotonic()
        timeout_sec = 3
        while True:
            if self._has_no_unsaved_changes_message():
                break
            if time.monotonic() - started_at > 3:
                raise RuntimeError(
                    f"No unsaved changes message did not appear after {timeout_sec} seconds")
            time.sleep(0.1)

    def refresh(self):
        self.driver.refresh()
        self._wait_until_page_loaded()

    def modal(self):
        return PageText(self.driver, "//div[@modal-render='true']")

    def get_information_tab(self) -> 'TabInformation':
        """
        Problem: the Information tab couldn't appear without switching to another tab or refreshing the page
        See: https://networkoptix.atlassian.net/browse/CLOUD-11437
        """
        locator = (f'//header//a[contains(text(),"{self.rb.INFORMATION_TEXT}")]'
                   f' | //header//div[contains(text(),"{self.rb.INFORMATION_TEXT}")]')
        self._wait_for_tab_loaded(locator)
        return TabInformation(self.driver, locator, self.rb)

    def get_tab_settings(self) -> TabSettings:
        self._wait_for_tab_loaded(f'//header//a[contains(text(),"{self.rb.INFORMATION_TEXT}")]')
        return TabSettings(
            self.driver,
            f'//header//nx-header-level-two//div[contains(text(),"{self.rb.SETTINGS_TEXT}")]',
            self.rb,
        )

    def _wait_for_tab_loaded(self, locator: str):
        """
        Problem: the Information tab and another couldn't appear without switching to another tab or refreshing the page.
        To be removed after resolving CLOUD-11437.
        See: https://networkoptix.atlassian.net/browse/CLOUD-11437
        """
        started_at = time.monotonic()
        timeout_sec = 30
        while True:
            if len(self.driver.find_elements_by_xpath(locator)) > 0:
                break
            try:
                TabItem(self.driver, locator).wait_until_visible(timeout=10)
            except ElementNotVisible:
                if time.monotonic() - started_at > timeout_sec:
                    raise TimeoutError(f"{locator!r} is not visible after {timeout_sec} seconds")
                self.driver.refresh()

    def _wait_until_page_loaded(self):
        system_loaded_locator = "//nx-system-settings-component"
        started_at = time.monotonic()
        timeout_sec = 90
        while True:
            if len(self.driver.find_elements(By.XPATH, system_loaded_locator)) > 0:
                break
            try:
                PageText(self.driver, system_loaded_locator).wait_until_visible()
            except (ElementNotInDOM, ElementNotVisible):
                self.driver.refresh()
                if time.monotonic() - started_at > timeout_sec:
                    raise TimeoutError(f"{system_loaded_locator!r} is not visible after {timeout_sec} seconds")
        
    def _location_is_correct(self):
        self.driver.location_should_be(f"{ENV}systems/")

    def get_left_menu(self):
        return SystemLeftMenu(self.driver)

    def wait_for_security_form(self):
        locator = "//form[@name='systemAndSecuritySettingsForm']"
        PageText(self.driver, locator).wait_until_visible()

    def get_owner_label(self):
        locator = "//nx-system-admin-component/div/div/nx-block/div/div[1]/header/div/span"
        return PageText(self.driver, locator)

    def get_your_access_level_label(self):
        locator = "//nx-system-admin-component//nx-block/div/nx-section/div/div[2]/span"
        return PageText(self.driver, locator)


class FailedToAccessSystemPage:

    def __init__(self, driver: WebDriver, lang="en_US"):
        self.driver = driver
        self.rb = RobotVariables(lang)

    def is_shown(self) -> bool:
        error_message = self.rb.__getattr__('SYSTEM_NO_ACCESS_TEXT')
        text_element = PageText(
            self.driver,
            f'//h2[@name="FAILED_TO_ACCESS_SYSTEM" and contains(text(), \'{error_message}\')]',
        )
        try:
            text_element.wait_until_visible()
        except ElementNotVisible:
            return False
        return True


class _SystemName:

    def __init__(self, element: TextField, rb: RobotVariables):
        self._element = element
        self._rb = rb

    def _wait_for_editable(self):
        # Is needed until CLOUD-11567 exists.
        timeout_sec = 30
        started_at = time.monotonic()
        while True:
            try:
                self._element.click()
                return
            except ElementClickInterceptedException:
                _logger.info("System name is not editable yet")
            if time.monotonic() - started_at > timeout_sec:
                raise RuntimeError("System name is not editable within 30 seconds timeout")
            _logger.info("Refreshing the page")
            self._element._driver.refresh()
            time.sleep(3)

    def set_text(self, new_name: str):
        self.clear_text()
        self._element.send_keys(new_name)

    def get_text(self) -> str:
        return self._element.get_text()

    def clear_text(self):
        current_text = self.get_text()
        self._wait_for_editable()
        self._element.click()
        for _ in range(len(current_text)):
            self._element.send_keys(Keys.ARROW_RIGHT)
            self._element.send_keys(Keys.BACKSPACE)

    def has_empty_field_error(self):
        border_color = self._element.value_of_css_property('border-color')
        # Sometimes there is another red color provided by CSS.
        # As it does not affect users small workaround is added.
        expected_red_colors = [self._rb.__getattr__('ERROR_COLOR'), "rgb(194, 38, 38)"]
        return border_color in expected_red_colors

    def wait_until_name_is(self, expected_name: str):
        timeout_sec = 30
        started_at = time.monotonic()
        while True:
            actual_name = self.get_text()
            if actual_name == expected_name:
                return
            if time.monotonic() - started_at > timeout_sec:
                raise RuntimeError(
                    f"System name is not changed within 30 seconds timeout. "
                    f"Expected: {expected_name}, actual: {actual_name}")
            _logger.info("System name does not match expected yet. Refreshing the page")
            self._element._driver.refresh()
            time.sleep(3)

    def wait_until_visible(self):
        self._element.wait_until_visible()

import time
from pathlib import Path
from string import Template
from typing import NamedTuple
from typing import Optional

from selenium.common.exceptions import NoSuchElementException
from selenium.common.exceptions import TimeoutException
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.remote.webdriver import WebDriver

import robot_keywords
from RobotVariables import RobotVariables
from generic_element import Element
from generic_element import ElementNotInDOM
from generic_element import ElementNotVisible
from toast_notification import ToastNotification
from variables import ENV
from wrappers import Button
from wrappers import Checkbox
from wrappers import PageText
from wrappers import Table
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

    def ensure_system_online(self, system_name: str, timeout = 10.0):
        error_message = f"System {system_name} is offline and cannot be merged with the current one"
        started_at = time.monotonic()
        clicked_next_button = False
        while True:
            error = Element(
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

    def modal(self):
        return PageText(self.driver, "//div[@modal-render='true']")

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
        return _TabInformation(self.driver, locator, self.rb)

    def _wait_until_page_loaded(self):
        robot_keywords.wait_until_page_contains_element(self.driver, "//nx-system-settings-component")
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
        self.wait_until_ready()

    def wait_until_ready(self):
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
        element = Element(self._driver, '//input[contains(@class,"ngx-file-drop__file-input")]')
        element.send_file(str(filename))
        started_at = time.monotonic()
        timeout_sec = 10
        while True:
            if self.is_imported_report():
                break
            if time.monotonic() - started_at > timeout_sec:
                raise TimeoutError(f"Report did not load after {timeout_sec} seconds")
            time.sleep(0.5)

    def is_imported_report(self) -> bool:
        return len(self._driver.find_elements_by_xpath(
            f'//nx-ribbon//div[@class="message"]//div[contains(text(),"{self._variables.VIEWING_IMPORTED_REPORT_TEXT}")]')) > 0

    def _is_system_online(self) -> bool:
        return len(self._driver.find_elements_by_xpath('//nx-menu//nx-level-1-item')) > 0

    def no_alerts(self) -> bool:
        return len(self._driver.find_elements_by_xpath(
            f'//h2[contains(text(),"{self._variables.NO_ALERTS_TEXT}")]')) > 0

    def system_is_doing_well(self) -> bool:
        return len(self._driver.find_elements_by_xpath(
            f'//div[contains(text(),"{self._variables.SYSTEM_DOING_WELL_TEXT}")]')) > 0

    def get_alerts_count(self) -> int:
        e = Element(self._driver, '//div[@id="nx-table"]/div[contains(@class,"table-header")]')
        (count, _) = e.text().strip().split()
        return int(count)

    def get_systems_section(self) -> '_Section':
        return _Section(self._driver, '//nx-menu//nx-level-1-item/a[@id="systems"]', 'Systems')

    def get_alerts_section(self) -> '_AlertsSection':
        return _AlertsSection(self._driver, '//nx-menu//nx-level-1-item/a[@id="alerts"]', 'Alerts')

    def get_servers_section(self) -> '_Section':
        return _Section(self._driver, '//nx-menu//nx-level-1-item/a[@id="servers"]', 'Servers')

    def get_cameras_section(self) -> '_Section':
        return _Section(self._driver, '//nx-menu//nx-level-1-item/a[@id="cameras"]', 'Cameras')

    def get_storages_section(self) -> '_Section':
        return _Section(self._driver, '//nx-menu//nx-level-1-item/a[@id="storages"]', 'Storages')

    def get_network_section(self) -> '_Section':
        return _Section(self._driver, '//nx-menu//nx-level-1-item/a[@id="networkInterfaces"]', 'Network Interfaces')


class _Section:

    def __init__(self, driver: WebDriver, locator: str, name: str):
        robot_keywords.wait_until_page_contains_element(driver, locator, 5)
        self._driver = driver
        self._element = Element(driver, locator)
        self._name = name

    def click(self):
        self._element.click()
        started_at = time.monotonic()
        timeout_sec = 5
        while True:
            if self._is_active():
                break
            if time.monotonic() - started_at > timeout_sec:
                raise TimeoutError(f"{self._name} section is not visible after {timeout_sec} seconds")
            time.sleep(0.5)

    def get_text_first_card_header(self) -> str:
        return Element(self._driver, '//nx-single-entity//header').text()

    def has_table(self) -> bool:
        return len(self._driver.find_elements_by_xpath('//div[@id="nx-table"]')) > 0

    def has_card(self) -> bool:
        return len(self._driver.find_elements_by_xpath('//nx-single-entity')) > 0

    def _is_active(self) -> bool:
        return self.has_table() or self.has_card()


class _AlertsSummary(NamedTuple):
    servers_errors: int
    servers_warnings: int
    cameras_errors: int
    cameras_warnings: int
    storages_errors: int
    storages_warnings: int
    network_errors: int
    network_warnings: int


class _AlertsSection(_Section):

    def get_alerts_summary(self) -> _AlertsSummary:
        xpath_template = Template(
            '//div[contains(@class, "card-header") and contains(text(), "$card_name")]'
            '/following-sibling::div[contains(@class, "card-body")]',
        )
        card = Element(self._driver, xpath_template.substitute(card_name='Servers'))
        servers_errors = card.find_element('//nx-alert-counter/div/span', 1)
        servers_warnings = card.find_element('//nx-alert-counter/div/span', 2)
        card = Element(self._driver, xpath_template.substitute(card_name='Cameras'))
        cameras_errors = card.find_element('//nx-alert-counter/div/span', 1)
        cameras_warnings = card.find_element('//nx-alert-counter/div/span', 2)
        card = Element(self._driver, xpath_template.substitute(card_name='Storage Locations'))
        storages_errors = card.find_element('//nx-alert-counter/div/span', 1)
        storages_warnings = card.find_element('//nx-alert-counter/div/span', 2)
        card = Element(self._driver, xpath_template.substitute(card_name='Network Interfaces'))
        networks_errors = card.find_element('//nx-alert-counter/div/span', 1)
        networks_warnings = card.find_element('//nx-alert-counter/div/span', 2)
        return _AlertsSummary(
            int(servers_errors.text()),
            int(servers_warnings.text()),
            int(cameras_errors.text()),
            int(cameras_warnings.text()),
            int(storages_errors.text()),
            int(storages_warnings.text()),
            int(networks_errors.text()),
            int(networks_warnings.text()),
        )

    def get_alerts_summary_from_table(self) -> _AlertsSummary:
        errors = {'Server': 0, 'Camera': 0, 'Storage': 0, 'Interface': 0}
        warnings = errors.copy()
        while True:
            table = Table(self._driver, '//div[@id="nx-table"]//table')
            for row in table.get_data():
                type_ = row[1].get_property('title')
                element = row[0].find_element('/svg-icon')
                if 'error.svg' in element.get_attribute('data-src'):
                    errors[type_] += 1
                elif 'warning.svg' in element.get_attribute('data-src'):
                    warnings[type_] += 1
                else:
                    TimeoutError(f'Could not recognize alert {type_} with SVG {element.get_attribute("data-src")}')
            paginator_next = Element(self._driver, '//nx-paginator//a[@id="paginator-next"]')
            if 'disabled' in paginator_next.get_attribute('class'):
                break
            paginator_next.click()
            time.sleep(3)
        return _AlertsSummary(
            errors['Server'],
            warnings['Server'],
            errors['Camera'],
            warnings['Camera'],
            errors['Storage'],
            warnings['Storage'],
            errors['Interface'],
            warnings['Interface'],
        )

    def get_pages_count(self):
        paginator = Element(self._driver, '//nx-paginator//a[@id="paginator-tile-last"]')
        if paginator.in_dom:
            return int(paginator.text())
        return 1

    def _is_active(self) -> bool:
        is_offline = self._driver.find_elements_by_xpath(
            '//nx-system-health-component/g[@id="Cloud/Placeholders/Offline"]') > 0
        is_online = self._driver.find_elements_by_xpath(
            '//nx-system-health-component/g[@class="gridAlertsCards"]') > 0
        return is_online or is_offline

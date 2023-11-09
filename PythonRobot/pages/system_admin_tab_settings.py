import time
from typing import Callable

from selenium.webdriver.common.keys import Keys
from selenium.webdriver.remote.webdriver import WebDriver

from RobotVariables import RobotVariables
from generic_elements import Button
from generic_elements import Checkbox
from generic_elements import ElementNotVisible
from generic_elements import Image
from generic_elements import Link
from generic_elements import PageText
from generic_elements import Pane
from generic_elements import SpinBox
from generic_elements import TabItem
from generic_elements import TextField


class TabSettings:

    def __init__(self, driver: WebDriver, locator: str, robot_variables: RobotVariables):
        self._driver = driver
        self._element = TabItem(driver, locator)
        self._rb = robot_variables

    def click(self):
        self._element.click()
        # The page always renders in online status and then changes to offline if needed.
        # Without a sleep, the following code does not have time to detect the offline status.
        time.sleep(2)
        self._wait_until_ready()

    def _wait_until_ready(self):
        Pane(self._driver, "//nx-system-settings-component").wait_until_visible()
        Pane(self._driver, "//div[contains(@class, 'fixed-sidebar')]//a[@id='servers']").wait_until_visible()
        TextField(self._driver, "//div/nx-editable-heading//nx-text-editable").wait_until_visible()

    def get_servers_section(self) -> '_ServersSection':
        return _ServersSection(self._driver, '//nx-menu//nx-level-1-item/a[@id="servers"]', 'Servers', self._rb)

    def get_general_section(self) -> '_GeneralSettings':
        self._wait_until_ready()
        return _GeneralSettings(self._driver)


class _ServersSection:

    def __init__(self, driver: WebDriver, locator: str, name: str, robot_variables: RobotVariables):
        self._driver = driver
        self._element = TabItem(driver, locator)
        self._element.wait_until_visible(15)
        self._name = name
        self._rb = robot_variables

    def click(self):
        self._element.click()
        started_at = time.monotonic()
        timeout_sec = 30
        while True:
            if self._is_active():
                break
            if time.monotonic() - started_at > timeout_sec:
                raise TimeoutError(f"{self._name} section is not visible after {timeout_sec} seconds")
            time.sleep(0.5)

    def get_server_page(self, name: str) -> '_ServerPage':
        locator = f'//nx-level-3-item//nx-search-highlight[contains(text(),"{name}")]'
        return _ServerPage(self._driver, locator, self._rb)

    def get_default_server_page(self) -> '_ServerPage':
        locator = '//nx-level-3-item//nx-search-highlight'
        Link(self._driver, locator).wait_until_visible()
        return _ServerPage(self._driver, locator, self._rb)

    def _is_active(self) -> bool:
        try:
            self.get_default_server_page()
        except ElementNotVisible:
            return False
        else:
            return True


class _ServerPage:

    def __init__(self, driver: WebDriver, locator: str, robot_variables: RobotVariables):
        self._element = Link(driver, locator)
        self._element.wait_until_visible(30)
        self._driver = driver
        self._rb = robot_variables

    def click(self):
        self._element.click()

    def wait_until_visible_common_elements(self):
        self.get_restart_button().wait_until_visible()
        self.get_detailed_info_button().wait_until_visible()
        PageText(self._driver, f'//header//p[contains(text(),"{self._rb.IP_TEXT}")]').wait_until_visible()
        PageText(self._driver, f'//header//p[contains(text(),"{self._rb.OS_TEXT}")]').wait_until_visible()
        PageText(self._driver, f'//header//p[contains(text(),"{self._rb.VERSION_TEXT}")]').wait_until_visible()

    def wait_until_visible_owner_elements(self):
        self.get_port_field().wait_until_visible()

    def set_server_name(self, name: str):
        element_name = self.get_name_field()
        element_name.click()
        element_name.input_text(name + Keys.ENTER)
        self.get_save_button().click()

    def open_restart_dialog(self) -> '_RestartDialog':
        self.get_restart_button().click()
        return _RestartDialog(self._driver, self._rb)

    def wait_until_restarting_banner(self):
        PageText(self._driver, f"//nx-alert-block//span[contains(text(),{self._rb.RESTARTING})]").wait_until_visible()

    def wait_until_restarting_alert_visible(self):
        locator = ('//div[contains(@class,"toast")]//span[contains(@class,"toast-content")]'
                   f'/../span[contains(text(),"{self._rb.SERVER_RESTARTED_TEXT}")]')
        PageText(self._driver, locator).wait_until_visible(timeout=30)
        PageText(self._driver, locator).wait_until_not_visible()

    def get_port_field(self) -> TextField:
        return TextField(self._driver, f'//nx-numeric[@name="server-port"]/input[@id="server-port-numeric"]')

    def wait_until_error_server_port_is_required(self):
        self._get_input_error_element(self._rb.SERVER_PORT_IS_REQUIRED_TEXT).wait_until_visible()

    def has_message_server_port_is_required(self) -> bool:
        try:
            self._get_input_error_element(self._rb.SERVER_PORT_IS_REQUIRED_TEXT).wait_until_visible()
        except ElementNotVisible:
            return False
        else:
            return True

    def has_message_port_too_low(self) -> bool:
        try:
            PageText(
                self._driver,
                f'//nx-apply//div[contains(@class,"warning-text") and contains(text(),"{self._rb.PORT_TOO_LOW_TEXT}")]'
            ).wait_until_visible()
        except ElementNotVisible:
            return False
        else:
            return True

    def get_save_button(self) -> Button:
        return Button(self._driver, f'//nx-process-button[@data-testid="saveSettingsBtn"]//button')

    def get_cancel_button(self) -> Button:
        return Button(self._driver, f'//nx-cancel-button[@data-testid="cancelSettingsBtn"]//button')

    def get_check_status_button(self) -> Button:
        return Button(self._driver, f'//nx-alert-block//button/span[contains(text(),"{self._rb.CHECK_STATUS_TEXT}")]')

    def get_restart_button(self) -> Button:
        return Button(self._driver, f'//nx-section//button/span[contains(text(), "{self._rb.RESTART}")]/parent::button')

    def get_detailed_info_button(self) -> Button:
        return Button(self._driver,
                      f'//nx-standard-server-component//header//button/span[contains(text(),"{self._rb.DETAILED_INFO_TEXT}")]')

    def get_name_field(self) -> TextField:
        return TextField(self._driver, f'//nx-block//nx-editable-heading//nx-text-editable')

    def wait_until_offline_status(self, timeout=10):
        started_at = time.monotonic()
        while True:
            try:
                PageText(self._driver, f'//nx-alert-block//div[contains(text(),"{self._rb.SERVER_OFFLINE_TEXT}")]').wait_until_visible()
            except ElementNotVisible:
                if time.monotonic() - started_at > timeout:
                    raise TimeoutError(f"Offline status does not appear after {timeout} seconds")
                time.sleep(0.5)
            else:
                break

    def wait_until_offline_status_not_visible(self, timeout=10):
        started_at = time.monotonic()
        while True:
            try:
                PageText(self._driver, f'//nx-alert-block//div[contains(text(),"{self._rb.SERVER_OFFLINE_TEXT}")]').wait_until_visible()
            except ElementNotVisible:
                break
            else:
                if time.monotonic() - started_at > timeout:
                    raise TimeoutError(f"Offline status does not disappear after {timeout} seconds")
                time.sleep(0.5)

    def wait_until_checking_banner(self, timeout=5):
        started_at = time.monotonic()
        while True:
            try:
                self._get_checking_banner().wait_until_visible()
            except ElementNotVisible:
                if time.monotonic() - started_at > timeout:
                    raise TimeoutError(f"Banner 'Checking' does not appear after {timeout} seconds")
                time.sleep(0.5)
            else:
                break

    def wait_until_checking_banner_is_not_visible(self, timeout=5):
        started_at = time.monotonic()
        while True:
            try:
                self._get_checking_banner().wait_until_visible()
            except ElementNotVisible:
                break
            else:
                if time.monotonic() - started_at > timeout:
                    raise TimeoutError(f"Banner 'Checking' does not disappear after {timeout} seconds")
                time.sleep(0.5)

    def ensure_server_is_offline(self):
        Image(self._driver, '//nx-server-component//*[local-name()="g" and @id="Cloud/Placeholders/NoSettings"]').wait_until_visible()
        PageText(self._driver, '//*[@data-testid="placeholderTitle" and @name="NO_SETTINGS"]').wait_until_visible()
        PageText(self._driver, '//*[contains(@class, "placeholder-message") and @name="NO_SETTINGS"]').wait_until_visible()
        _wait_element_until_not_visible(self.get_port_field)
        _wait_element_until_not_visible(self.get_restart_button)
        _wait_element_until_not_visible(self.get_detailed_info_button)
        _wait_element_until_not_visible(self.get_name_field)

    def _get_input_error_element(self, message_text: str) -> PageText:
        return PageText(
            self._driver,
            f'//div/span[contains(@class,"input-error") and contains(text(),"{message_text}")]',
        )

    def _get_checking_banner(self) -> PageText:
        return PageText(
            self._driver,
            f'//nx-alert-block//div[contains(text(),"{self._rb.CHECKING_TEXT}")]',
        )


class _RestartDialog:

    def __init__(self, driver: WebDriver, robot_variables: RobotVariables):
        self._driver = driver
        self._rb = robot_variables

    def wait_until_visible(self):
        button = self.get_button_close()
        button.wait_until_visible()
        button = self.get_button_cancel()
        button.wait_until_visible()
        button = self.get_button_restart()
        button.wait_until_visible()

    def wait_until_not_visible(self):
        button = self.get_button_close()
        button.wait_until_not_visible()
        button = self.get_button_cancel()
        button.wait_until_not_visible()
        button = self.get_button_restart()
        button.wait_until_not_visible()

    def get_button_close(self) -> Button:
        return Button(self._driver, '//nx-modal-restart-server-content//button[contains(@class,"close")]')

    def get_button_cancel(self) -> Button:
        return Button(
            self._driver,
            f'//nx-modal-restart-server-content//button[contains(text(),"{self._rb.CANCEL_BUTTON_TEXT}")]',
            )

    def get_button_restart(self) -> Button:
        return Button(self._driver, '//nx-modal-restart-server-content//button[@type="submit"]')


def _wait_element_until_not_visible(element_getter: Callable, timeout=5):
    try:
        element = element_getter()
        element.wait_until_visible(timeout=timeout)
    except ElementNotVisible:
        return
    else:
        raise RuntimeError(f'Element "{element}" does not disappear after {timeout} seconds')


class _GeneralSettings:

    def __init__(self, driver: WebDriver):
        self._driver = driver

    def _get_save_button(self) -> Button:
        return Button(self._driver, '//button[text()="Save"]')

    def _get_cancel_button(self) -> Button:
        return Button(self._driver, '//button[text()="Cancel"]')

    def is_ok_button_visible(self) -> bool:
        return self._get_save_button().is_visible()

    def is_cancel_button_visible(self) -> bool:
        return self._get_cancel_button().is_visible()

    def autodiscovery_option(self) -> Checkbox:
        return Checkbox(
            self._driver,
            '//label[@class="nx-checkbox"]/*[@id="autoDiscoveryEnabled"]/..',
            )

    def get_autodiscovery_option_text(self) -> str:
        return PageText(
            self._driver,
            '//label[@for="autoDiscoveryEnabled"]//span'
            ).get_text()

    def get_autodiscovery_description(self) -> str:
        return PageText(self._driver, '//label[@id="autoDiscoveryEnabledHelpBlock"]').get_text()

    def statistics_allowed_option(self) -> Checkbox:
        return Checkbox(
            self._driver,
            '//label[@class="nx-checkbox"]/*[@id="statisticsAllowed"]/..',
            )

    def get_statistics_allowed_option_text(self) -> str:
        return PageText(
            self._driver,
            '//label[@for="statisticsAllowed"]//span'
            ).get_text()

    def get_statistics_allowed_description(self) -> str:
        return PageText(self._driver, '//label[@id="statisticsAllowedHelpBlock"]').get_text()

    def optimize_camera_settings_option(self) -> Checkbox:
        return Checkbox(
            self._driver,
            '//label[@class="nx-checkbox"]/*[@id="cameraSettingsOptimization"]/..',
            )

    def get_optimize_camera_settings_option_text(self) -> str:
        return PageText(
            self._driver,
            '//label[@for="cameraSettingsOptimization"]//span'
            ).get_text()

    def audit_trail_option(self) -> Checkbox:
        return Checkbox(
            self._driver,
            '//label[@class="nx-checkbox"]/*[@id="auditTrailEnabled"]/..'
            )

    def get_audit_trail_option_text(self) -> str:
        return PageText(
            self._driver,
            '//label[@for="auditTrailEnabled"]//span'
            ).get_text()

    def get_audit_trail_description(self) -> str:
        return PageText(self._driver, '//label[@id="auditTrailEnabledHelpBlock"]').get_text()

    def force_encrypted_connections_option(self) -> Checkbox:
        return Checkbox(
            self._driver,
            '//label[@class="nx-checkbox"]/*[@id="trafficEncryptionForced"]/..',
            )

    def get_force_encrypted_connections_option_text(self) -> str:
        return PageText(
            self._driver,
            '//label[@for="trafficEncryptionForced"]//span'
            ).get_text()

    def force_encrypted_connections_description(self) -> str:
        return PageText(self._driver, '//label[@id="trafficEncryptionForced"]').get_text()

    def video_traffic_encryption_option(self) -> Checkbox:
        return Checkbox(
            self._driver,
            '//label[@class="nx-checkbox"]/*[@id="videoTrafficEncryptionForced"]/..',
            )

    def get_video_traffic_encryption_option_text(self) -> str:
        return PageText(
            self._driver,
            '//label[@for="videoTrafficEncryptionForced"]//span'
            ).get_text()

    def video_traffic_encryption_description(self) -> str:
        return PageText(
            self._driver,
            '//label[@id="videoTrafficEncryptionForcedHelpBlock"]',
            ).get_text()

    def limit_session_duration_option(self) -> Checkbox:
        return Checkbox(
            self._driver,
            '//label[@class="nx-checkbox"]/*[@id="sessionLimitMinutesToggle"]/..',
            )

    def get_limit_session_duration_option_text(self) -> str:
        return PageText(
            self._driver,
            '//label[@for="sessionLimitMinutesToggle"]//span'
            ).get_text()

    def _get_session_limit_spin_box(self) -> SpinBox:
        return SpinBox(self._driver, '//input[@id="generic-numeric"]')

    def get_session_duration_limit(self) -> int:
        # The default value is in days. Recalculation according to hours and
        # minutes are not implemented.
        return int(self._get_session_limit_spin_box().get_value())

    def set_session_duration_limit(self, value: int):
        self._get_session_limit_spin_box().set_value(str(value))

    def save(self):
        self._get_save_button().click()

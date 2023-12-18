import logging
import time

from selenium.common.exceptions import ElementClickInterceptedException
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.remote.webdriver import WebDriver

from RobotVariables import RobotVariables
from browsers.chrome import ChromeBrowser
from generic_elements import Button
from generic_elements import Checkbox
from generic_elements import ElementNotVisible
from generic_elements import Image
from generic_elements import NxCheckbox
from generic_elements import Page
from generic_elements import PageText
from generic_elements import TabItem
from generic_elements import TextField
from generic_elements import ToastNotification
from pages.system_admin_tab_information import TabInformation
from pages.system_admin_tab_settings import TabSettings
from pages.system_left_menu import SystemLeftMenu
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
            "//nx-modal-disconnect-content//button[contains(text(), '{DISCONNECT_BUTTON_TEXT}')]")
        return Button(self.driver, translated_xpath)

    def disconnect_modal_generic_button(self):
        translated_xpath = self.rb.replace_nested_variables(
            "//nx-modal-generic-content//button[contains(text(), '{DISCONNECT_BUTTON_TEXT}')]")
        return Button(self.driver, translated_xpath)

    def disconnect_modal_cancel_button(self):
        locator = "//nx-modal-disconnect-content/form//nx-cancel-button/button"
        return Button(self.driver, locator)

    def disconnect_modal_close_button(self):
        locator = "//nx-modal-disconnect-content//button[contains(@class, close)]"
        return Button(self.driver, locator)

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
        return ToastNotification(
            self.driver,
            f"//nx-toast//span[contains(text(),'{disconnect_message}')]",
            )

    def disconnect_from_account_toast_notification(self, system_name):
        disconnect_message = self.rb.__getattr__("SYSTEM_DELETED_FROM_ACCOUNT")
        replaced_disconnect_message = disconnect_message.replace("{{system_name}}", system_name)
        return ToastNotification(
            self.driver,
            f"//nx-toast//span[contains(text(),'{replaced_disconnect_message}')]",
            )

    def mandatory_2fa_checkbox(self):
        return Checkbox(self.driver, "//nx-checkbox[@name='mandatory2fa']")

    def twofa_verification_code_input(self):
        return TextField(self.driver, '//nx-2fa-code-input/input')

    def twofa_enable_button(self):
        return Button(self.driver, "//button[text()='Enable']")

    def merge_with_another_system_button(self):
        translated_xpath = self.rb.replace_nested_variables("//button[span[text()='{MERGE_SYSTEM_BUTTON_TEXT}']]")
        return Button(self.driver, translated_xpath)

    def system_offline_text(self):
        return PageText(self.driver, f"//div[contains(text(),'{self.rb.SYSTEM_IS_OFFLINE_TEXT}')]")

    def system_is_being_merged(self):
        translated_xpath = self.rb.replace_nested_variables("//div[contains(text(), '{SYSTEM_IS_BEING_MERGED_TEXT}')]")
        return PageText(self.driver, translated_xpath)

    def systems_merged_success_toast_notification(self, primary_system_name, secondary_system_name):
        alert_text = self.rb.__getattr__("SYSTEM_MERGE_COMPLETED_TEXT", get_replacements=False)
        alert_text = alert_text.replace("%PRIMARY%", primary_system_name)
        alert_text = alert_text.replace("%SECONDARY%", secondary_system_name)
        return ToastNotification(
            self.driver,
            f"//nx-toast//span[contains(text(),'{alert_text}')]",
            )

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
        Problem: the Information tab couldn't appear without switching to another tab or refreshing the page.

        See: https://networkoptix.atlassian.net/browse/CLOUD-11437
        """
        locator = (
            f'//header//a[contains(text(),"{self.rb.INFORMATION_TEXT}")]'
            f' | //header//div[contains(text(),"{self.rb.INFORMATION_TEXT}")]',
            )
        self._wait_for_tab_loaded(locator)
        return TabInformation(self.driver, locator, self.rb)

    def get_tab_settings(self) -> TabSettings:
        # There are two variants of the locator, one for the active tab and another for the inactive tab
        locator = (
            f'//header//nx-header-level-two//a[contains(text(),"{self.rb.SETTINGS_TEXT}")]'
            f' | //header//nx-header-level-two//div[contains(text(),"{self.rb.SETTINGS_TEXT}")]',
            )
        self._wait_for_tab_loaded(locator)
        return TabSettings(self.driver, locator, self.rb)

    def get_active_tab_by_name(self, name: str) -> Button:
        return Button(
            self.driver,
            f"//header//nx-header-level-two//div[contains(text(),'{name}')]",
            )

    def get_not_active_tab_by_name(self, name: str) -> Button:
        return Button(
            self.driver,
            f"//header//nx-header-level-two//a[contains(text(),'{name}')]",
            )

    def _wait_for_tab_loaded(self, locator: str):
        started_at = time.monotonic()
        timeout_sec = 30
        while True:
            try:
                TabItem(self.driver, locator).wait_until_visible(timeout=10)
            except ElementNotVisible:
                if time.monotonic() - started_at > timeout_sec:
                    raise TimeoutError(f"{locator!r} is not visible after {timeout_sec} seconds")
                time.sleep(3)
            else:
                break

    def _wait_until_page_loaded(self):
        system_loaded_locator = "//nx-system-settings-component"
        started_at = time.monotonic()
        timeout_sec = 90
        while True:
            try:
                PageText(self.driver, system_loaded_locator).wait_until_visible()
            except ElementNotVisible:
                if time.monotonic() - started_at > timeout_sec:
                    raise TimeoutError(f"{system_loaded_locator!r} is not visible after {timeout_sec} seconds")
                time.sleep(3)
            else:
                break

    def _location_is_correct(self):
        self.driver.location_should_be(f"{ENV}systems/")

    def get_left_menu(self):
        return SystemLeftMenu(self.driver)

    def wait_for_security_form(self):
        locator = "//form[@name='systemAndSecuritySettingsForm']"
        PageText(self.driver, locator).wait_until_visible()

    def get_owner_label(self):
        locator = f"//nx-system-admin-component//span[contains(text(), '{self.rb.OWNER_TEXT}')]/.."
        return PageText(self.driver, locator)

    def get_your_access_level_label(self):
        locator = f"//nx-system-admin-component//span[contains(text(), '{self.rb.YOUR_ACCESS_LEVEL_TEXT}')]/.."
        return PageText(self.driver, locator)

    def get_advanced_settings_block(self):
        return _AdvancedSettings(self.driver)

    def get_back_arrow_button(self):
        locator = "//header//nx-header-logo-area//div[@class='arrow-btn ng-star-inserted']"
        return Button(self.driver, locator)

    def get_placeholder_icon(self):
        return Image(
            self.driver,
            '//*[name()="svg-icon" and contains(@data-src,'
            '"/images/placeholders/section/system_settings_placeholder.svg")]',
            )


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

    def get_go_to_main_page_button(self) -> Button:
        return Button(self.driver, '//button//a[@routerlink="/"]/..')

    def wait_for_broken_link_text(self):
        link_is_broken_xpath = self.rb.replace_nested_variables(
            '//div[contains(text(), "{THIS_LINK_IS_BROKEN_TEXT}")]')
        PageText(self.driver, link_is_broken_xpath).wait_until_visible()


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


class _AdvancedSettings:

    def __init__(self, driver: ChromeBrowser, lang="en_US"):
        self.driver = driver
        self.rb = RobotVariables(lang)

    def get_hide_advanced_settings_button(self):
        locator = self.rb.replace_nested_variables(
            "//button/span[text()='{HIDE_ADVANCED_SETTINGS_TEXT}']")
        return Button(self.driver, locator)

    def get_hide_advanced_settings_icon(self):
        locator = self.rb.replace_nested_variables(
            "//*[name()='svg-icon' and contains(@data-src, "
            "'images/icons/standard/eye_closed.svg')]")
        return Image(self.driver, locator)

    def get_advanced_settings_alert_icon(self):
        locator = self.rb.replace_nested_variables(
            "//*[name()='svg-icon' and contains(@data-src, "
            "'images/icons/error.svg')]")
        return Image(self.driver, locator)

    def get_advanced_settings_alert(self):
        locator = self.rb.replace_nested_variables("//div[text()='{ADVANCED_SETTINGS_ALERT_TEXT}']")
        return PageText(self.driver, locator)

    def get_advanced_settings_warning(self):
        locator = self.rb.replace_nested_variables(
            "//span[text()='{ADVANCED_SETTINGS_WARNING_TEXT}']")
        return PageText(self.driver, locator)

    def get_advanced_settings_element_block_one(self):
        return _BlockOne(self.driver)

    def get_connection_alive_update_interval_input(self) -> TextField:
        locator = self.rb.replace_nested_variables(
            "//input[@id='ec2AliveUpdateIntervalSec']")
        return TextField(self.driver, locator)

    def get_email_from_input(self) -> TextField:
        locator = self.rb.replace_nested_variables("//input[@id='emailFrom']")
        return TextField(self.driver, locator)

    def get_email_signature_input(self) -> TextField:
        locator = self.rb.replace_nested_variables("//input[@id='emailSignature']")
        return TextField(self.driver, locator)

    def get_support_email_input(self) -> TextField:
        locator = self.rb.replace_nested_variables("//input[@id='emailSupportEmail']")
        return TextField(self.driver, locator)


class _BlockOne:

    def __init__(self, driver: ChromeBrowser, lang="en_US"):
        self.driver = driver
        self.rb = RobotVariables(lang)

    def _get_checkbox_by_id(self, checkbox_id: str):
        parent_locator = "//*[@id='advancedSystemSettingsForm']"
        el = Page(self.driver, parent_locator)
        el._element.wait_until_visible()
        checkbox = el._element.find_element_by_id(checkbox_id)
        return NxCheckbox(self.driver, checkbox)

    def has_checkbox_with_id(self, checkbox_id: str):
        try:
            self._get_checkbox_by_id(checkbox_id)
        except ElementNotVisible:
            return False
        return True

    def get_additional_local_fs_types_input(self):
        locator = self.rb.replace_nested_variables("//input[@id='additionalLocalFsTypes']")
        return TextField(self.driver, locator)

    def get_additional_local_fs_types_label(self):
        locator = self.rb.replace_nested_variables(
            "//div[text()='{ADDITIONAL_LOCAL_FS_TYPES_TEXT}']")
        return PageText(self.driver, locator)

    def get_audit_trail_period_days_input(self):
        locator = "//input[@id='auditTrailPeriodDays']"
        return TextField(self.driver, locator)

    def get_audit_trail_period_days_label(self):
        locator = self.rb.replace_nested_variables("//div[text()='{AUDIT_TRAIL_PERIOD_DAYS_TEXT}']")
        return PageText(self.driver, locator)

    def get_client_statistics_relative_url_input(self):
        locator = "//input[@id='clientStatisticsSettingsUrl']"
        return TextField(self.driver, locator)

    def get_client_statistics_relative_url_label(self):
        locator = self.rb.replace_nested_variables(
            "//div[text()='{CLIENT_STATISTICS_RELATIVE_URL_TEXT}']")
        return PageText(self.driver, locator)

    def get_arecont_rtsp_enabled_checkbox(self) -> NxCheckbox:
        return self._get_checkbox_by_id("arecontRtspEnabled")

    def has_arecont_rtsp_enabled_checkbox(self) -> bool:
        try:
            self.get_arecont_rtsp_enabled_checkbox().is_visible()
        except ElementNotVisible:
            return False

    def get_arecont_rtsp_enabled_label(self):
        locator = self.rb.replace_nested_variables("//div[text()='{ARECONT_RTSP_ENABLED_TEXT}']")
        return PageText(self.driver, locator)

    def get_auto_discovery_response_enabled_checkbox(self) -> NxCheckbox:
        return self._get_checkbox_by_id("autoDiscoveryResponseEnabled")

    def has_auto_discovery_response_enabled_checkbox(self) -> bool:
        try:
            self.get_auto_discovery_response_enabled_checkbox().is_visible()
        except ElementNotVisible:
            return False

    def get_auto_discovery_response_enabled_label(self):
        locator = self.rb.replace_nested_variables("//div[text()='{AUTO_DISCOVERY_RESPONSE_TEXT}']")
        return PageText(self.driver, locator)

    def get_auto_update_thumbnails_checkbox(self) -> NxCheckbox:
        return self._get_checkbox_by_id("autoUpdateThumbnails")

    def has_auto_update_thumbnails_checkbox(self) -> bool:
        try:
            self.get_auto_update_thumbnails_checkbox().is_visible()
        except ElementNotVisible:
            return False

    def get_auto_update_thumbnails_label(self):
        locator = self.rb.replace_nested_variables("//div[text()='{AUTO_UPDATE_THUMNAILS_TEXT}']")
        return PageText(self.driver, locator)

    def get_backup_new_cameras_by_default_checkbox(self) -> NxCheckbox:
        return self._get_checkbox_by_id("backupNewCamerasByDefault")

    def has_backup_new_cameras_by_default_checkbox(self) -> bool:
        try:
            self.get_backup_new_cameras_by_default_checkbox().is_visible()
        except ElementNotVisible:
            return False

    def get_backup_new_cameras_by_default_label(self):
        locator = self.rb.replace_nested_variables(
            "//div[text()='{BACKUP_NEW_CAMERAS_BY_DEFAULT_TEXT}']")
        return PageText(self.driver, locator)

    def wait_until_elements_loaded(self):
        self.get_additional_local_fs_types_input().wait_until_visible(10)
        self.get_additional_local_fs_types_label().wait_until_visible()
        self.get_audit_trail_period_days_input().wait_until_visible()
        self.get_audit_trail_period_days_label().wait_until_visible()
        self.get_client_statistics_relative_url_input().wait_until_visible()
        self.get_client_statistics_relative_url_label().wait_until_visible()
        self.has_arecont_rtsp_enabled_checkbox()
        self.get_arecont_rtsp_enabled_label().wait_until_visible()
        self.has_auto_discovery_response_enabled_checkbox()
        self.get_auto_discovery_response_enabled_label().wait_until_visible()
        self.has_auto_update_thumbnails_checkbox()
        self.get_auto_update_thumbnails_label().wait_until_visible()
        # Does not work because of CLOUD-11670
        self.has_backup_new_cameras_by_default_checkbox()
        self.get_backup_new_cameras_by_default_label().wait_until_visible()

    def wait_until_elements_not_seen(self):
        self.get_additional_local_fs_types_input().wait_until_not_visible()
        self.get_additional_local_fs_types_label().wait_until_not_visible()
        self.get_audit_trail_period_days_input().wait_until_not_visible()
        self.get_audit_trail_period_days_label().wait_until_not_visible()
        self.get_client_statistics_relative_url_input().wait_until_not_visible()
        self.get_client_statistics_relative_url_label().wait_until_not_visible()
        if self.has_arecont_rtsp_enabled_checkbox():
            raise RuntimeError("Arecont RTSP Enabled checkbox is visible")
        self.get_arecont_rtsp_enabled_label().wait_until_not_visible()
        if self.has_auto_discovery_response_enabled_checkbox():
            raise RuntimeError("Auto Discovery Response Enabled checkbox is visible")
        self.get_auto_discovery_response_enabled_label().wait_until_not_visible()
        if self.has_auto_update_thumbnails_checkbox():
            raise RuntimeError("Auto Update Thumbnails checkbox is visible")
        self.get_auto_update_thumbnails_label().wait_until_not_visible()
        # Does not work because of CLOUD-11670
        if self.get_backup_new_cameras_by_default_checkbox().is_visible():
            raise RuntimeError("Backup New Cameras by Default checkbox is visible")
        self.get_backup_new_cameras_by_default_label().wait_until_not_visible()

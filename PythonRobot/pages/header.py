import logging

from selenium.webdriver.remote.webdriver import WebDriver

from RobotVariables import RobotVariables
from generic_elements import Button
from generic_elements import ElementNotInDOM
from generic_elements import ElementNotVisible
from generic_elements import PageText
from generic_elements import Pane
from pages.landing_page import LandingPage

_logger = logging.getLogger(__name__)


class HeaderNav:

    def __init__(self, driver: WebDriver, lang="en_US", ):
        self._locator = "//nx-header"
        self._driver = driver
        self._rb = RobotVariables(lang)
        self._wait_until_header_is_visible()

    def _wait_until_header_is_visible(self):
        Pane(self._driver, self._locator).wait_until_visible()

    def is_logged_in(self) -> bool:
        try:
            self.account_dropdown().wait_until_visible(10)
        except (ElementNotVisible, ElementNotInDOM):
            return False
        return True

    def account_dropdown(self):
        return Button(self._driver, "//header//div[@data-testid='accountSettingsDropdown']/preceding-sibling::button")

    def account_settings_option(self):
        return Button(self._driver, "//header//li//a[@href = '/account']")

    def change_password_option(self):
        return Button(self._driver, "//header//li//a[@href = '/account/password']")

    def security_option(self):
        return Button(self._driver, "//header//li//a[@href = '/account/security']")

    def log_out_option(self):
        translated_xpath = self._rb.replace_nested_variables(
            "//header//li//a/span[contains(text(),'{LOG_OUT_BUTTON_TEXT}')]/..")
        return Button(self._driver, translated_xpath)

    def administration_selection(self):
        pass

    def log_in_button(self) -> Button:
        translated_xpath = self._rb.replace_nested_variables(
            "//header//a[contains(text(),'{LOG_IN_BUTTON_TEXT}')]/..")
        # TODO: Remove a boilerplate after stabilize the portal
        # At times, the start page loads with the old design, which disrupts the tests
        max_attempts = 5
        for attempt in range(1, max_attempts + 1):
            button = Button(self._driver, translated_xpath)
            try:
                button.wait_until_visible()
            except ElementNotInDOM:
                if attempt >= max_attempts:
                    raise
                self._driver.refresh()
                _logger.info(f"The 'Log in' button cannot be found. Retrying after refresh.")
            else:
                return button

    def my_systems_button(self):
        # Todo: add "My Systems" to the translation files
        return Button(self._driver, "//div[contains(text(), 'My Systems')]")

    def log_out(self):
        self.account_dropdown().click()
        self.log_out_option().click()
        LandingPage(self._driver).wait_until_loaded()

    def create_account(self):
        return Button(self._driver, "//header//a[@href='/authorize?client_type=create']")

    def language_dropdown(self):
        return Button(self._driver, "//header//nx-header-language-select")

    def systems_link(self):
        return Button(self._driver, f'//a[contains(text(), "{self._rb.SYSTEMS_LINK_TEXT}")]')

    def home_link(self):
        return Button(self._driver, f'//a[contains(text(), "{self._rb.HOME_TEXT}")]')

    def resouces_link(self):
        return Button(self._driver, f'//a[contains(text(), "{self._rb.RESOURCES_TEXT}")]')

    def for_developers_link(self):
        return Button(self._driver, f'//a[contains(text(), "{self._rb.FOR_DEVELOPERS_TEXT}")]')

    def get_system_name(self) -> str:
        element = PageText(self._driver, '//nx-header//span[@class="system-name"]')
        return element.get_text().strip()

    def wait_for_system_offline_text(self):
        locator = f"//h2[@name=OFFLINE and contains(text(),{self._rb.SYSTEM_OFFLINE_TEXT})]"
        PageText(self._driver, locator).wait_until_visible()

    def click_tab_by_name(self, tab_name: str):
        self._driver.find_element_by_link_text(tab_name).click()

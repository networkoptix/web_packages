from selenium.webdriver.common.by import By

from RobotVariables import RobotVariables
from landing_page import LandingPage
from wrappers import Button
from wrappers import Pane


class HeaderNav:

    def __init__(self, driver, lang="en_US", ):
        self.driver = driver
        self.rb = RobotVariables(lang)
        self._wait_until_header_is_visible()

    def _wait_until_header_is_visible(self):
        Pane(self.driver, "//nx-header").wait_until_visible()

    def account_dropdown(self):
        return Button(self.driver, "//header//div[@data-testid='accountSettingsDropdown']/preceding-sibling::button")

    def account_settings_option(self):
        return Button(self.driver, "//header//li//a[@href = '/account']")

    def change_password_option(self):
        return Button(self.driver, "//header//li//a[@href = '/account/password']")

    def security_option(self):
        return Button(self.driver, "//header//li//a[@href = '/account/security']")

    def log_out_option(self):
        translated_xpath = self.rb.replace_nested_variables(
            "//header//li//a/span[contains(text(),'{LOG_OUT_BUTTON_TEXT}')]/..")
        return Button(self.driver, translated_xpath)

    def administration_selection(self):
        pass

    def log_in_button(self):
        translated_xpath = self.rb.replace_nested_variables(
            "//header//a[contains(text(),'{LOG_IN_BUTTON_TEXT}')]/..")
        return Button(self.driver, translated_xpath)

    def my_systems_button(self):
        # Todo: add "My Systems" to the translation files
        return Button(self.driver, "//div[contains(text(), 'My Systems')]")

    def log_out(self):
        self.account_dropdown().click()
        self.log_out_option().click()
        LandingPage(self.driver)

    def create_account(self):
        return Button(self.driver, "//header//a[@href='/authorize?client_type=create']")

    def language_dropdown(self):
        return Button(self.driver, "//header//nx-header-language-select")

    def systems_link(self):
        return Button(self.driver, f'//a[contains(text(), "{self.rb.SYSTEMS_LINK_TEXT}")]')

    def home_link(self):
        return Button(self.driver, f'//a[contains(text(), "{self.rb.HOME_TEXT}")]')

    def resouces_link(self):
        return Button(self.driver, f'//a[contains(text(), "{self.rb.RESOURCES_TEXT}")]')

    def for_developers_link(self):
        return Button(self.driver, f'//a[contains(text(), "{self.rb.FOR_DEVELOPERS_TEXT}")]')

    def get_system_name(self) -> str:
        element = self.driver.find_element(By.XPATH, '//nx-header//span[@class="system-name"]')
        return element.text.strip()

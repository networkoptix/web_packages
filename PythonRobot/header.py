import robot_keywords
from button import Button
from RobotVariables import RobotVariables


class HeaderNav:

    def __init__(self, driver, lang="en_US", ):
        self.driver = driver
        self.rb = RobotVariables(lang)
        self._wait_until_header_is_visible()

    def _wait_until_header_is_visible(self):
        robot_keywords.wait_until_element_is_visible(self.driver, "//nx-header")

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
            "//header//span[contains(text(),'{LOG_IN_BUTTON_TEXT}')]/..")
        return Button(self.driver, translated_xpath)

    def log_out(self):
        self.account_dropdown().click()
        self.log_out_option().click()

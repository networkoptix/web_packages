import robot_keywords
from RobotVariables import RobotVariables
from button import Button
from variables import ENV
from selenium.webdriver.common.by import By


class SystemLeftMenu:
    def __init__(self, driver, lang="en_US"):
        self.driver = driver
        self.rb = RobotVariables(lang)
        self._wait_until_page_loaded()
        self.users = []
        self.servers = []
        # Todo: find way to pass id in
        # self._location_is_correct()

    def users_button(self):
        translated_xpath = self.rb.replace_nested_variables(
            "//span[contains(text(), '{USERS}')]")
        return Button(self.driver, translated_xpath)

    def update_users_list(self):
        self.users = self.driver.find_elements(By.XPATH, "//div[@id='level3users']//nx-level-3-item")

    def servers_button(self):
        translated_xpath = self.rb.replace_nested_variables(
            "//span[contains(text(), '{SERVERS}')]")
        return Button(self.driver, translated_xpath)

    def update_servers_list(self):
        self.servers = self.driver.find_elements(By.XPATH, "//div[@id='level3servers']//nx-level-3-item")

    def _wait_until_page_loaded(self):
        robot_keywords.wait_until_page_contains_element(self.driver, "//nx-menu")

    def _location_is_correct(self):
        robot_keywords.location_should_be(self.driver, f"{ENV}systems/")
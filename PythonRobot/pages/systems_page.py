from selenium.webdriver.common.by import By

from RobotVariables import RobotVariables
from generic_elements import Button
from generic_elements import PageText
from generic_elements import Pane
from generic_elements import TextField
from pages.system_tile import SystemTile
from variables import ENV


class SystemsPage:
    def __init__(self, driver, lang="en_US"):
        self.driver = driver
        self.rb = RobotVariables(lang)
        self._wait_until_page_contains_systems_list()
        self._location_is_correct()
        self.tiles = self.update_system_tiles()

    def no_systems(self):
        translated_xpath = self.rb.replace_nested_variables(
                           "//span[contains(text(),'{YOU_HAVE_NO_SYSTEMS_TEXT}')]")
        return PageText(self.driver, translated_xpath)

    def search_bar(self):
        return TextField(self.driver, "//input[@placeholder='Search systems']")

    def search_x_button(self):
        return Button(self.driver, "//button[contains(@class,'btn-clear')]")

    def systems_found(self, system_count):
        if system_count > 1:
            system_text = self.rb.replace_nested_variables('{SYSTEMS_FOUND}')
        else:
            system_text = self.rb.replace_nested_variables('{SYSTEM_FOUND}')
        return PageText(self.driver, f"//span[contains(text(), '{system_count} {system_text}')]")

    def update_system_tiles(self):
        tiles = self.driver.find_elements(By.XPATH, "//nx-system-card")
        self.tiles = list((SystemTile(self.driver, tile) for tile in tiles))
        return self.tiles

    def _wait_until_page_contains_systems_list(self):
        Pane(self.driver, "//nx-systems-list-component").wait_until_visible(40)

    def _location_is_correct(self):
        self.driver.location_should_be(f"{ENV}/systems")

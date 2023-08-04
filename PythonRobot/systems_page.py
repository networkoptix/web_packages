import robot_keywords
from generic_element import Element
from page_text import PageText
from text_field import TextField
from button import Button
from RobotVariables import RobotVariables
from variables import ENV
from system_tile import SystemTile


class SystemsPage:
    def __init__(self, driver, lang="en_US"):
        self.driver = driver
        self.rb = RobotVariables(lang)
        self._wait_until_page_contains_systems_list()
        self._location_is_correct()
        self.tiles = self._system_tiles()

    def no_systems(self):
        translated_xpath = self.rb.replace_nested_variables(
                           "//span[contains(text(),'{YOU_HAVE_NO_SYSTEMS_TEXT}')]")
        return Element(self.driver, translated_xpath)



    def _system_tiles(self):
        tiles = self.driver.find_elements_by_xpath("//nx-system-card")
        return list((SystemTile(self.driver, tile) for tile in tiles))

    def _wait_until_page_contains_systems_list(self):
        robot_keywords.wait_until_page_contains_element(self.driver, "//nx-systems-list-component")

    def _location_is_correct(self):
        robot_keywords.location_should_be(self.driver, f"{ENV}systems")
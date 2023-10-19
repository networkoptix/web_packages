import time
from typing import Collection

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
        self.wait_until_visible()
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

    def wait_for_tiles_count(self, count: int):
        started_at = time.monotonic()
        while True:
            self.update_system_tiles()
            actual_tiles_count = len(self.tiles)
            if actual_tiles_count == count:
                return
            if time.monotonic() - started_at > 3:
                raise RuntimeError(f"Wrong tiles count. Expected {count}, got {actual_tiles_count}")

    def _wait_until_page_contains_systems_list(self):
        Pane(self.driver, "//nx-systems-list-component").wait_until_visible(40)

    def _location_is_correct(self):
        self.driver.location_should_be(f"{ENV}/systems")

    def wait_until_visible(self):
        self._wait_until_page_contains_systems_list()
        self._location_is_correct()

    def get_tiles_with_owner(self, expected_owner: str) -> Collection[SystemTile]:
        actual_tiles = []
        self.update_system_tiles()
        for tile in self.tiles:
            if tile.owner().text == expected_owner:
                actual_tiles.append(tile)
        return actual_tiles

    def get_tile_by_name(self, expected_name: str) -> SystemTile:
        self.update_system_tiles()
        for tile in self.tiles:
            if tile.title().text == expected_name:
                if tile is not None:
                    return tile

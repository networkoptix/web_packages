import time

import selenium.common.exceptions

from RobotVariables import RobotVariables


class SystemTile:
    def __init__(self, driver, tile_element, lang="en_US"):
        self.driver = driver
        self.selenium_element = tile_element
        self.rb = RobotVariables(lang)

    def title(self):
        return self.selenium_element.find_element_by_xpath(".//h2//nx-search-highlight")

    def owner(self):
        return self.selenium_element.find_element_by_xpath(".//span[contains(@class, 'user-name')]")

    def online(self):
        try:
            self.selenium_element.find_element_by_xpath(".//button")
            return True
        except selenium.common.exceptions.NoSuchElementException:
            return False
        except selenium.common.exceptions.StaleElementReferenceException:
            return False

    def wait_until_is_online(self):
        started_at = time.monotonic()
        while True:
            if self.online():
                return
            if time.monotonic() - started_at > 60:
                raise RuntimeError("Tile is offline after timeout")

    def wait_until_is_offline(self):
        started_at = time.monotonic()
        while True:
            if not self.online():
                return
            if time.monotonic() - started_at > 40:
                raise RuntimeError("Tile is online after timeout")

    def click(self):
        self.selenium_element.click()

    def is_title_highlighted(self) -> bool:
        return "highlighted" in self.title().find_element_by_xpath("./span").get_attribute("class")

    def is_owner_highlighted(self) -> bool:
        locator = ".//nx-search-highlight/span"
        return "highlighted" in self.owner().find_element_by_xpath(locator).get_attribute("class")

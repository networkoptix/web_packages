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

    def click(self):
        self.selenium_element.click()
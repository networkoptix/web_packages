from selenium import webdriver

import robot_keywords
from generic_element import Element


class Button:
    def __init__(self, driver: webdriver, locator):
        self.driver = driver
        # TODO: add check to confirm button text is correct?
        element = Element(self.driver, locator)
        self.selenium_element = element.get_selenium_element()
        self.locator = locator
        self.is_visible = element.is_visible()
        self.is_focused = element.is_focused()

    def click(self):
        Element(self.driver, self.locator).wait_until_visible()
        robot_keywords.wait_until_element_is_enabled(self.driver, self.locator)
        self.selenium_element.click()

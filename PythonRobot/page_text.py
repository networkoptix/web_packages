from selenium import webdriver

import robot_keywords
from generic_element import Element


class PageText:
    def __init__(self, driver: webdriver, locator):
        self.driver = driver
        element = Element(self.driver, locator)
        element.wait_until_visible()
        self.selenium_element = element.get_selenium_element()
        self.is_visible = element.is_visible()
        self.is_focused = element.is_focused()
        self.text = self.selenium_element.text

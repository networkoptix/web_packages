from selenium import webdriver
from selenium.webdriver.common.by import By

from generic_element import Element
import robot_keywords


class Button:
    def __init__(self, driver: webdriver, locator):
        self.driver = driver
        # TODO: add check to confirm button text is correct?

        self.selenium_element = element.get_selenium_element()
        self.locator = locator
        self.is_visible = element.is_visible()
        self.is_focused = element.is_focused()

    def click(self):
        robot_keywords.wait_until_element_is_visible(self.driver, self.locator)
        robot_keywords.wait_until_element_is_enabled(self.driver, self.locator)
        self.selenium_element.click()

    def contains(self, text):
        return self.selenium_element


from selenium import webdriver
from selenium.webdriver.common.by import By

from generic_element import Element
import robot_keywords


class Button:
    def __init__(self, driver: webdriver, locator):
        self.driver = driver

        element = Element(self.driver, locator)
        self.selenium_element = element.get_selenium_element()
        self.is_visible = element.is_visible()
        self.is_focused = element.is_focused()

    def click(self):
        self.selenium_element.click()
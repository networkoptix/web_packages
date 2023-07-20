from selenium import webdriver
from selenium.webdriver.common.by import By

import robot_keywords

from generic_element import Element


class TextField:
    def __init__(self, driver: webdriver, locator):
        self.driver = driver
        robot_keywords.wait_until_element_is_visible(self.driver, locator)

        element = Element(self.driver, locator)
        self.selenium_element = element.get_selenium_element()
        self.is_visible = element.is_visible()
        self.is_focused = element.is_focused()

    def input_text(self, text: str):
        self.selenium_element.clear()
        self.selenium_element.send_keys(text)

    def clear(self):
        self.selenium_element.clear()

    def get_outline_color(self) -> str:
        return self.selenium_element.value_of_css_property("border-color")

    def get_text_color(self) -> str:
        return self.selenium_element.value_of_css_property("color")

    def field_type(self) -> str:
        return self.selenium_element.get_attribute("type")

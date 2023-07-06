from selenium import webdriver
from selenium.webdriver.common.by import By

import robot_keywords


class Input:
    def __init__(self, driver: webdriver, locator):
        self.driver = driver
        robot_keywords.wait_until_element_is_visible(self.driver, locator)
        self.element = self.driver.find_element(By.XPATH, locator)

    def input_text(self, text: str):
        self.element.clear()
        self.element.send_keys(text)

    def clear(self):
        self.element.clear()

    def get_outline_color(self):
        return self.element.value_of_css_property("border-color")

    def get_text_color(self):
        return self.element.value_of_css_property("color")
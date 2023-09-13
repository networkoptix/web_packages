from selenium import webdriver
from selenium.webdriver.common.by import By

import robot_keywords


class TextField:
    def __init__(self, driver: webdriver, locator, time_out=10):
        self.driver = driver
        self.locator = locator

        robot_keywords.wait_until_page_contains_element(self.driver, self.locator, time_out)
        self.selenium_element = self.driver.find_element(By.XPATH, locator)


    def input_text(self, text: str):
        self.selenium_element.clear()
        self.selenium_element.send_keys(text)

    def clear(self):
        self.selenium_element.clear()

    def get_text(self):
        if self.selenium_element.text:
            return self.selenium_element.text
        elif self.selenium_element.get_attribute("value"):
            return self.selenium_element.get_attribute("value")
        else:
            raise RuntimeError("Element had no text")

    def get_outline_color(self) -> str:
        return self.selenium_element.value_of_css_property("border-color")

    def get_text_color(self) -> str:
        return self.selenium_element.value_of_css_property("color")

    def field_type(self) -> str:
        return self.selenium_element.get_attribute("type")

    def is_focused(self) -> bool:
        return self.selenium_element.equals(self.driver.switchTo().activeElement());

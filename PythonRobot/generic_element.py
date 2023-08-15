from selenium import webdriver
from selenium.webdriver.common.by import By
import selenium.common.exceptions

import robot_keywords


class Element:
    def __init__(self, driver: webdriver, locator, time_out=10):
        self.driver = driver
        self.locator = locator
        self.element = None
        self.in_dom = self.element_in_dom()

    def element_in_dom(self, timeout=5):
        try:
            robot_keywords.wait_until_page_contains_element(self.driver, self.locator, timeout)
            self.element = self.driver.find_element(By.XPATH, self.locator)
            return True
        except selenium.common.exceptions.TimeoutException:
            return False

    def get_selenium_element(self):
        return self.element

    def text(self):
        return self.element.text

    def is_focused(self):
        return self.element == self.driver.switch_to.active_element

    def is_visible(self):
        return self.element.is_displayed()



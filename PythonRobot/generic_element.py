from selenium import webdriver
from selenium.webdriver.common.by import By

import robot_keywords

class Element:
    def __init__(self, driver: webdriver, locator, wait_for = False):
        self.driver = driver
        self.locator = locator
        if wait_for:
            robot_keywords.wait_until_element_is_visible(self.driver, self.locator)
        self.element = self.driver.find_element(By.XPATH, locator)

    def get_selenium_element(self):
        return self.element

    def is_focused(self):
        return self.element == self.driver.switch_to.active_element

    def is_visible(self):
        return self.element.is_displayed()




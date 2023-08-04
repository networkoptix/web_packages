from selenium import webdriver
from selenium.webdriver.common.by import By
import selenium.common.exceptions

import robot_keywords

class Element:
    def __init__(self, driver: webdriver, locator, time_out=10):
        self.driver = driver
        self.locator = locator    
        try:
            robot_keywords.wait_until_page_contains_element(self.driver, self.locator, time_out)
            self.element = self.driver.find_element(By.XPATH, locator)
            self.in_dom = True
        except selenium.common.exceptions.TimeoutException:
            self.in_dom = False

    def get_selenium_element(self):
        return self.element

    def is_focused(self):
        return self.element == self.driver.switch_to.active_element

    def is_visible(self):
        return self.element.is_displayed()



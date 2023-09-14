from selenium import webdriver
from selenium.webdriver.common.by import By
import selenium.common.exceptions
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


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
        except selenium.common.exceptions.TimeoutException:
            return False
        self.element = self.driver.find_element(By.XPATH, self.locator)
        return True

    def get_selenium_element(self):
        return self.element

    def text(self):
        return self.element.text

    def is_focused(self):
        return self.element == self.driver.switch_to.active_element

    def is_visible(self):
        return self.element.is_displayed()

    def wait_until_visible(self,  timeout: int = 10) -> None:
        WebDriverWait(self.driver, timeout).until(EC.visibility_of_element_located((By.XPATH, self.locator)))



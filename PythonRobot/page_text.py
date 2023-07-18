from selenium import webdriver
from selenium.webdriver.common.by import By

import robot_keywords


class PageText:
    def __init__(self, driver: webdriver, locator):
        self.driver = driver
        robot_keywords.wait_until_element_is_visible(self.driver, locator)
        self.element = self.driver.find_element(By.XPATH, locator)
        self.text = self.element.text
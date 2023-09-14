from selenium import webdriver
from selenium.webdriver.common.by import By

import robot_keywords
from generic_element import Element


class Checkbox:
    def __init__(self, driver: webdriver, visible_locator, actual_locator):
        self.driver = driver
        Element(self.driver, visible_locator).wait_until_visible()
        self.selenium_element = self.driver.find_element(By.XPATH, f"{visible_locator}{actual_locator}")
        self.clickable_element = self.driver.find_element(By.XPATH, visible_locator)
        self.checked_xpath = f'{visible_locator}//span[@class="tick checked"]'
        self.unchecked_xpath = f'{visible_locator}//span[contains(@class,"unchecked")]'

    def click(self):
        self.clickable_element.click()

    def select(self):
        if self.unchecked():
            self.clickable_element.click()
    
    def unselect(self):
        if self.checked():
            self.clickable_element.click()

    def checked(self):
        return self.driver.find_element(By.XPATH, self.checked_xpath)
    
    def unchecked(self):
         return self.driver.find_element(By.XPATH, self.unchecked_xpath)
    
    def is_focused(self):
        return self.selenium_element == self.driver.switch_to.active_element()
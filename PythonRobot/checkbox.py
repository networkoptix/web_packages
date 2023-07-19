from selenium import webdriver
from selenium.webdriver.common.by import By 

import robot_keywords

class Checkbox:
    def __init__(self, driver: webdriver, visible_locator, actual_locator):
        self.driver = driver
        robot_keywords.wait_until_element_is_visible(self.driver, visible_locator)
        self.actual_element = self.driver.find_element(By.XPATH, f"{visible_locator}{actual_locator}")
        self.clickable_element = self.driver.find_element(By.XPATH, visible_locator)

    def click(self):
        self.clickable_element.click()

    def select(self):
        if not self.actual_element.is_selected():
            print("selecting")
            self.clickable_element.click()
    
    def unselect(self):
        if self.actual_element.is_selected():
            print("unselecting")
            self.clickable_element.click()

    def checked(self):
        return self.actual_element.is_selected()
from selenium import webdriver
from selenium.webdriver.common.by import By

from generic_element import Element


class Checkbox:

    def __init__(self, driver: webdriver, visible_locator, actual_locator):
        self._driver = driver
        Element(self._driver, visible_locator).wait_until_visible()
        self._selenium_element = self._driver.find_element(By.XPATH, f"{visible_locator}{actual_locator}")
        self._clickable_element = self._driver.find_element(By.XPATH, visible_locator)
        self._checked_xpath = f'{visible_locator}//span[@class="tick checked"]'
        self._unchecked_xpath = f'{visible_locator}//span[contains(@class,"unchecked")]'

    def click(self):
        self._clickable_element.click()

    def select(self):
        if self.unchecked():
            self._clickable_element.click()

    def unselect(self):
        if self.checked():
            self._clickable_element.click()

    def checked(self):
        return self._driver.find_element(By.XPATH, self._checked_xpath)

    def unchecked(self):
        return self._driver.find_element(By.XPATH, self._unchecked_xpath)

    def is_focused(self):
        return self._selenium_element == self._driver.switch_to.active_element()

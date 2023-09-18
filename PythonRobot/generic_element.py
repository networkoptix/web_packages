import platform

import selenium.common.exceptions
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support import expected_conditions as ec
from selenium.webdriver.support.ui import WebDriverWait

import robot_keywords


class Element:
    def __init__(self, driver: webdriver, locator, timeout=10):
        self._driver = driver
        self._locator = locator
        self._element = None
        self._timeout = timeout
        self.in_dom = self.element_in_dom(timeout=timeout)

    def element_in_dom(self, timeout):
        if not timeout:
            timeout = self._timeout
        try:
            robot_keywords.wait_until_page_contains_element(self._driver, self._locator, timeout)
        except selenium.common.exceptions.TimeoutException:
            return False
        self._element = self._driver.find_element(By.XPATH, self._locator)
        return True

    def get_selenium_element(self):
        return self._element

    def text(self):
        return self._element.text

    def is_focused(self):
        return self._element == self._driver.switch_to.active_element

    def is_visible(self):
        return self._element.is_displayed()

    def click(self):
        WebDriverWait(self._driver, self._timeout).until(ec.element_to_be_clickable((By.XPATH, self._locator))).click()

    def wait_until_visible(self,  timeout: int = 10) -> None:
        WebDriverWait(self._driver, timeout).until(ec.visibility_of_element_located((By.XPATH, self._locator)))

    def get_attribute(self, attribute: str):
        return self._driver.find_element(By.XPATH, self._locator).get_attribute(attribute)

    def should_be_enabled(self):
        WebDriverWait(self._driver, self._timeout).until(ec.element_to_be_clickable((By.XPATH, self._locator)))

    def should_be_disabled(self):
        WebDriverWait(self._driver, self._timeout).until_not(ec.element_to_be_clickable((By.XPATH, self._locator)))

    def should_not_be_visible(self):
        WebDriverWait(self._driver, self._timeout).until_not(ec.visibility_of_element_located((By.XPATH, self._locator)))

    def should_be_visible(self):
        WebDriverWait(self._driver, self._timeout).until(ec.visibility_of_element_located((By.XPATH, self._locator)))

    def delete_all_text(self):
        element = WebDriverWait(self._driver, self._timeout).until(ec.presence_of_element_located((By.XPATH, self._locator)))
        if platform.system() == 'Darwin':
            element.send_keys(Keys.COMMAND + 'a')
        else:
            element.send_keys(Keys.CONTROL + 'a')
        element.send_keys(Keys.BACK_SPACE)

    def clear_text(self):
        self._driver.find_element(By.XPATH, self._locator).clear()

    def wait_until_has_style(self, css_selector, style_name, expected_value):
        def check_style():
            try:
                element = self._driver.find_element(By.CSS_SELECTOR, css_selector)
                style_value = element.value_of_css_property(style_name)
                return style_value == expected_value
            except:
                return False

        WebDriverWait(self._driver, self._timeout).until(check_style)

    def send_keys(self, text: str):
        self._element.send_keys(text)

    def value_of_css_property(self, style_property: str):
        return self._element.value_of_css_property(style_property)

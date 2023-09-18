import platform

import selenium.common.exceptions
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support import expected_conditions as ec
from selenium.webdriver.support.ui import WebDriverWait


class Element:
    def __init__(self, driver: webdriver, locator, timeout=10):
        self._driver = driver
        self._locator = locator
        self._timeout = timeout
        self.in_dom = self.element_in_dom(timeout=timeout)
        self._element = self._driver.find_element(By.XPATH, self._locator)

    def element_in_dom(self, timeout):
        if not timeout:
            timeout = self._timeout
        try:
            WebDriverWait(self._driver, timeout).until(ec.presence_of_element_located((By.XPATH, self._locator)))
        except selenium.common.exceptions.TimeoutException:
            return False
        return True

    def text(self):
        self.wait_until_visible()
        return self._element.text

    def is_focused(self):
        self.should_be_enabled()
        return self._element == self._driver.switch_to.active_element

    def is_visible(self):
        return self._element.is_displayed()

    def click(self):
        self.should_be_enabled()
        self._element.click()

    def wait_until_visible(self,  timeout: int = 10) -> None:
        WebDriverWait(self._driver, timeout).until(ec.visibility_of_element_located((By.XPATH, self._locator)))

    def get_attribute(self, attribute: str):
        return self._element.get_attribute(attribute)

    def should_be_enabled(self):
        WebDriverWait(self._driver, self._timeout).until(ec.element_to_be_clickable((By.XPATH, self._locator)))

    def should_be_disabled(self):
        WebDriverWait(self._driver, self._timeout).until_not(ec.element_to_be_clickable((By.XPATH, self._locator)))

    def should_not_be_visible(self):
        WebDriverWait(self._driver, self._timeout).until_not(ec.visibility_of_element_located((By.XPATH, self._locator)))

    def should_be_visible(self):
        WebDriverWait(self._driver, self._timeout).until(ec.visibility_of_element_located((By.XPATH, self._locator)))

    def delete_all_text(self):
        self.should_be_enabled()
        if platform.system() == 'Darwin':
            self._element.send_keys(Keys.COMMAND + 'a')
        else:
            self._element.send_keys(Keys.CONTROL + 'a')
        self._element.send_keys(Keys.BACK_SPACE)

    def clear_text(self):
        self.should_be_enabled()
        self._element.clear()

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
        self.should_be_enabled()
        self._element.send_keys(text)

    def value_of_css_property(self, style_property: str):
        return self._element.value_of_css_property(style_property)

    # Return type is weird. See documentation for more details. Should be reworked.
    def get_screenshot(self, filename: str) -> bool:
        self.wait_until_visible()
        return self._element.screenshot(filename)

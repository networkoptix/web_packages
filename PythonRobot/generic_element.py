import logging
import platform
import time

from selenium import webdriver
from selenium.common.exceptions import NoSuchElementException
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys

_DEFAULT_TIMEOUT = 10
_logger = logging.getLogger(__name__)


class Element:

    def __init__(self, driver: webdriver, locator):
        self._driver = driver
        self._locator = locator
        self._element = None
        self.in_dom = self._in_dom_within_timeout()

    def _in_dom_within_timeout(self, timeout: float = .5):
        try:
            self.wait_until_exists(timeout)
        except ElementNotInDOM:
            return False
        return True

    def text(self):
        self.wait_until_visible()
        return self._element.text

    def is_focused(self):
        self.wait_until_clickable()
        return self._element == self._driver.switch_to.active_element

    def is_visible(self):
        return self._element.is_displayed()

    def click(self):
        self.wait_until_clickable()
        self._element.click()

    def wait_until_visible(self, timeout: float = _DEFAULT_TIMEOUT):
        self.wait_until_exists(timeout)
        started_at = time.monotonic()
        while True:
            if self._element.is_displayed():
                return
            if time.monotonic() - started_at > timeout:
                raise ElementNotVisible(f'Element locator: {self._locator}')
            time.sleep(.1)

    def get_attribute(self, attribute: str):
        return self._element.get_attribute(attribute)

    def wait_until_clickable(self, timeout: float = _DEFAULT_TIMEOUT):
        self.wait_until_visible(timeout)
        started_at = time.monotonic()
        while True:
            if self._element.is_enabled():
                return
            if time.monotonic() - started_at > timeout:
                raise ElementNotClickable(f'Element locator: {self._locator}')
            time.sleep(.1)

    def wait_until_not_clickable(self, timeout: float = _DEFAULT_TIMEOUT):
        self.wait_until_visible(timeout)
        started_at = time.monotonic()
        while True:
            if not self._element.is_enabled():
                return
            if time.monotonic() - started_at > timeout:
                raise ElementClickable(f'Element locator: {self._locator}')
            time.sleep(.1)

    def wait_until_not_visible(self, timeout: float = _DEFAULT_TIMEOUT):
        self.wait_until_exists(timeout)
        started_at = time.monotonic()
        while True:
            if not self._element.is_displayed():
                return
            if time.monotonic() - started_at > timeout:
                raise ElementVisible(f'Element locator: {self._locator}')
            time.sleep(.1)

    def delete_all_text(self):
        self.wait_until_clickable()
        if platform.system() == 'Darwin':
            self._element.send_keys(Keys.COMMAND + 'a')
        else:
            self._element.send_keys(Keys.CONTROL + 'a')
        self._element.send_keys(Keys.BACK_SPACE)

    def clear_text(self):
        self.wait_until_clickable()
        self._element.clear()

    def send_keys(self, text: str):
        self.wait_until_clickable()
        self._element.send_keys(text)

    def value_of_css_property(self, style_property: str):
        return self._element.value_of_css_property(style_property)

    # Return type is weird. See documentation for more details. Should be reworked.
    def get_screenshot(self, filename: str) -> bool:
        self.wait_until_visible()
        return self._element.screenshot(filename)

    def wait_until_exists(self, timeout: float = _DEFAULT_TIMEOUT):
        started_at = time.monotonic()
        while True:
            try:
                self._element = self._driver.find_element(By.XPATH, self._locator)
                return
            except NoSuchElementException:
                _logger.debug('Element with locator %s not in DOM yet', self._locator)
            if time.monotonic() - started_at > timeout:
                raise ElementNotInDOM(f'Element locator: {self._locator}')
            time.sleep(.1)

    def wait_until_does_not_exist(self, timeout: float = _DEFAULT_TIMEOUT):
        started_at = time.monotonic()
        while True:
            try:
                self._driver.find_element(By.XPATH, self._locator)
            except NoSuchElementException:
                return
            if time.monotonic() - started_at > timeout:
                raise ElementInDOM(f'Element locator: {self._locator}')
            _logger.debug('Element with locator %s still in DOM', self._locator)
            time.sleep(.1)


class ElementNotInDOM(Exception):
    pass


class ElementNotVisible(Exception):
    pass


class ElementNotClickable(Exception):
    pass


class ElementVisible(Exception):
    pass


class ElementClickable(Exception):
    pass


class ElementInDOM(Exception):
    pass

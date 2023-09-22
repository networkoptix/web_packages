import logging
import platform
import time

from selenium.webdriver import ActionChains
from selenium.common.exceptions import NoSuchElementException
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support import expected_conditions as ec
from selenium.webdriver.remote.webdriver import WebDriver

_DEFAULT_TIMEOUT = 10
_logger = logging.getLogger(__name__)


class Element:

    def __init__(self, driver: WebDriver, locator):
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

    def clear_text(self):
        self.wait_until_clickable()
        self._element.clear()

    def click(self):
        self.wait_until_clickable()
        self._element.click()

    def count(self, timeout: float = 10.0):
        # Wait for the page to fully load (by waiting for the document.readyState to be 'complete')
        WebDriverWait(self._driver, timeout).until(
            lambda driver: driver.execute_script("return document.readyState") == "complete"
        )

        # Now, wait for the presence of all elements matching the locator.
        # This ensures that at least one element is present before proceeding.
        WebDriverWait(self._driver, timeout).until(
            ec.presence_of_all_elements_located((By.XPATH, self._locator))
        )
        return len(self._driver.find_elements(By.XPATH, self._locator))

    def hover(self):
        self.wait_until_visible()
        action = ActionChains(self._driver)
        action.move_to_element(self._element).perform()

    def delete_all_text(self):
        self.wait_until_clickable()
        if platform.system() == 'Darwin':
            self._element.send_keys(Keys.COMMAND + 'a')
        else:
            self._element.send_keys(Keys.CONTROL + 'a')
        self._element.send_keys(Keys.BACK_SPACE)

    def get_attribute(self, attribute: str):
        return self._element.get_attribute(attribute)

    def get_property(self, name: str):
        return self._element.get_property(name)

    def get_screenshot(self) -> bytes:
        self.wait_until_visible()
        return self._element.screenshot_as_png

    def is_focused(self):
        self.wait_until_clickable()
        return self._element == self._driver.switch_to.active_element

    def is_visible(self):
        return self._element.is_displayed()

    def send_keys(self, text: str):
        self.wait_until_clickable()
        self._element.send_keys(text)

    def should_contain(self, text: str):
        self.wait_until_visible()
        if text not in self._element.text:
            raise ElementTextIncorrect()

    def text(self):
        self.wait_until_visible()
        return self._element.text

    def value_of_css_property(self, style_property: str):
        return self._element.value_of_css_property(style_property)

    def wait_until_clickable(self, timeout: float = _DEFAULT_TIMEOUT):
        self.wait_until_visible(timeout)
        started_at = time.monotonic()
        while True:
            if self._element.is_enabled():
                return
            if time.monotonic() - started_at > timeout:
                raise ElementNotClickable(f'Element locator: {self._locator}')
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
        try:
            self.wait_until_exists(timeout)
        except ElementNotInDOM:
            return
        started_at = time.monotonic()
        while True:
            if not self._element.is_displayed():
                return
            if time.monotonic() - started_at > timeout:
                raise ElementVisible(f'Element locator: {self._locator}')
            time.sleep(.1)

    def wait_until_visible(self, timeout: float = _DEFAULT_TIMEOUT):
        self.wait_until_exists(timeout)
        started_at = time.monotonic()
        while True:
            if self._element.is_displayed():
                return
            if time.monotonic() - started_at > timeout:
                raise ElementNotVisible(f'Element locator: {self._locator}')
            time.sleep(.1)

    def send_file(self, text: str):
        self._element.send_keys(text)

    def find_element(self, locator: str, position: int = 1) -> 'Element':
        return Element(self._driver, f'({self._locator}{locator})[{position}]')


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

class ElementTextIncorrect(Exception):
    pass

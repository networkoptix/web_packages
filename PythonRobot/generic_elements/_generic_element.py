import logging
import time

from selenium.common.exceptions import NoSuchElementException
from selenium.common.exceptions import StaleElementReferenceException
from selenium.webdriver import ActionChains
from selenium.webdriver.common.by import By
from selenium.webdriver.remote.webdriver import WebDriver
from selenium.webdriver.support import expected_conditions as ec
from selenium.webdriver.support.ui import WebDriverWait

_DEFAULT_TIMEOUT = 10
_logger = logging.getLogger(__name__)


class Element:

    def __init__(self, driver: WebDriver, locator):
        self._driver = driver
        self._locator = locator
        self._element = None

    def clear_text(self):
        self.wait_until_clickable()
        self._element.clear()

    def click(self):
        self.wait_until_clickable()
        try:
            self._element.click()
        except StaleElementReferenceException:
            self._element = self._driver.find_element(By.XPATH, self._locator)
            self._element.click()
            print(".click() intercepted a 'StaleElementReferenceException'")

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

    def get_attribute(self, attribute: str):
        self.wait_until_exists()
        return self._element.get_attribute(attribute)

    def get_property(self, name: str):
        self.wait_until_exists()
        return self._element.get_property(name)

    def get_screenshot(self) -> bytes:
        self.wait_until_visible()
        return self._element.screenshot_as_png

    def is_focused(self):
        self.wait_until_clickable()
        return self._element == self._driver.switch_to.active_element

    def is_visible(self):
        return False if self._element is None else self._element.is_displayed()

    def send_keys(self, text: str):
        self.wait_until_clickable()
        self._element.send_keys(text)

    def should_contain(self, text: str):
        if text not in self.text():
            raise ElementTextIncorrect()

    def text(self):
        self.wait_until_visible()
        return self._element.text

    def value_of_css_property(self, style_property: str):
        self.wait_until_exists()
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
            self.wait_until_exists(0)
        except ElementNotInDOM:
            return
        started_at = time.monotonic()
        while True:
            try:
                if not self._element.is_displayed():
                    return
            except StaleElementReferenceException:
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

    def find_element(self, locator: str, position: int = 1) -> 'Element':
        return Element(self._driver, f'({self._locator}{locator})[{position}]')

    def is_enabled(self, timeout: float = _DEFAULT_TIMEOUT) -> bool:
        self.wait_until_visible(timeout)
        return self._element.is_enabled()

    def _check_and_refresh(self):
        try:
            self._element.is_displayed()
        except StaleElementReferenceException:
            self.wait_until_exists()
            _logger.debug(f'Element was stale and refreshed ({self._locator})')

    def find_element_by_partial_link_text(self, text: str):
        self.wait_until_exists()
        return self._element.find_element_by_partial_link_text(text)

    def get_html_attribute(self, attribute_name: str):
        self.wait_until_exists()
        return self._element.get_attribute(attribute_name)


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

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

    def clear_text(self):
        self.wait_until_clickable()
        self._get_element().clear()

    def click(self):
        self.wait_until_clickable()
        self._get_element().click()

    def count(self, timeout: float = 10.0):
        # Wait for the page to fully load (by waiting for the document.readyState to be 'complete')
        WebDriverWait(self._driver, timeout).until(
            lambda driver: driver.execute_script("return document.readyState") == "complete",
            )

        # Now, wait for the presence of all elements matching the locator.
        # This ensures that at least one element is present before proceeding.
        WebDriverWait(self._driver, timeout).until(
            ec.presence_of_all_elements_located((By.XPATH, self._locator)),
            )
        return len(self._driver.find_elements(By.XPATH, self._locator))

    def hover(self):
        self.wait_until_visible()
        action = ActionChains(self._driver)
        action.move_to_element(self._get_element()).perform()

    def get_attribute(self, attribute: str):
        self.wait_until_in_dom()
        return self._get_element().get_attribute(attribute)

    def get_property(self, name: str):
        self.wait_until_visible()
        return self._get_element().get_property(name)

    def get_screenshot(self) -> bytes:
        self.wait_until_visible()
        return self._get_element().screenshot_as_png

    def is_focused(self):
        self.wait_until_clickable()
        return self._get_element() == self._driver.switch_to.active_element

    def is_enabled(self) -> bool:
        try:
            element = self._get_element()
        except ElementNotInDOM:
            return False
        return element.is_enabled()

    def is_visible(self):
        try:
            element = self._get_element()
        except ElementNotInDOM:
            return False
        try:
            return element.is_displayed()
        except StaleElementReferenceException:
            _logger.debug(f"StaleElementReferenceException caught on {self._locator}")
            time.sleep(2)
            element = self._get_element()
            return element.is_displayed()

    def send_keys(self, text: str):
        self._get_element().send_keys(text)

    def should_contain(self, text: str):
        if text not in self.text():
            raise ElementTextIncorrect()

    def text(self):
        self.wait_until_visible()
        return self._get_element().text

    def own_text(self):
        self.wait_until_visible()
        # Getting a text without sub elements
        return self._driver.execute_script('return arguments[0].childNodes[0].textContent;', self._get_element())

    def value_of_css_property(self, style_property: str):
        self.wait_until_visible()
        return self._get_element().value_of_css_property(style_property)

    def wait_until_in_dom(self, timeout: float = _DEFAULT_TIMEOUT):
        started_at = time.monotonic()
        while True:
            try:
                self._get_element()
            except ElementNotInDOM as e:
                _logger.debug(e)
            else:
                return
            if time.monotonic() - started_at > timeout:
                raise ElementNotInDOM(f'Element locator: {self._locator} after waiting {timeout}')
            time.sleep(.1)

    def wait_until_clickable(self, timeout: float = _DEFAULT_TIMEOUT):
        started_at = time.monotonic()
        while True:
            try:
                element = self._get_element()
            except ElementNotInDOM as e:
                _logger.debug(e)
            else:
                try:
                    if element.is_enabled():
                        return
                except StaleElementReferenceException:
                    _logger.debug('Element with locator %s has gone or updated', self._locator)
            if time.monotonic() - started_at > timeout:
                raise ElementNotClickable(f'Element locator: {self._locator}')
            time.sleep(.1)

    def wait_until_not_clickable(self, timeout: float = _DEFAULT_TIMEOUT):
        started_at = time.monotonic()
        while True:
            try:
                element = self._get_element()
            except ElementNotInDOM:
                return
            try:
                if not element.is_enabled():
                    return
            except StaleElementReferenceException:
                return
            if time.monotonic() - started_at > timeout:
                raise ElementClickable(f'Element locator: {self._locator}')
            time.sleep(.1)

    def wait_until_not_visible(self, timeout: float = _DEFAULT_TIMEOUT):
        started_at = time.monotonic()
        while True:
            try:
                element = self._get_element()
            except ElementNotInDOM:
                return
            try:
                if not element.is_displayed():
                    return
            except StaleElementReferenceException:
                return
            if time.monotonic() - started_at > timeout:
                raise ElementVisible(f'Element locator: {self._locator}')
            time.sleep(.1)

    def wait_until_visible(self, timeout: float = _DEFAULT_TIMEOUT):
        started_at = time.monotonic()
        while True:
            try:
                element = self._get_element()
            except ElementNotInDOM as e:
                _logger.debug(e)
            else:
                try:
                    if element.is_displayed():
                        return
                except StaleElementReferenceException:
                    _logger.debug('Element with locator %s has gone or updated', self._locator)
            if time.monotonic() - started_at > timeout:
                raise ElementNotVisible(f'Element locator: {self._locator}')
            time.sleep(.1)

    def find_element(self, locator: str, position: int = 1) -> 'Element':
        return Element(self._driver, f'({self._locator}{locator})[{position}]')

    def find_element_by_partial_link_text(self, text: str):
        self.wait_until_visible()
        return self._get_element().find_element_by_partial_link_text(text)

    def find_element_by_id(self, child_id: str):
        return self._get_element().find_element_by_id(child_id)

    def _get_element(self):
        try:
            return self._driver.find_element(By.XPATH, self._locator)
        except NoSuchElementException:
            raise ElementNotInDOM(f"Element with locator {self._locator!r} not in DOM")

    def is_exists(self) -> bool:
        try:
            self._driver.find_element(By.XPATH, self._locator)
        except NoSuchElementException:
            return False
        return True


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

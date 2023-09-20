from selenium import webdriver
from selenium.webdriver.common.by import By

from generic_element import Element


class Button:

    def __init__(self, driver: webdriver, locator):
        self.driver = driver
        # TODO: add check to confirm button text is correct?
        self._element = Element(self.driver, locator)

    def click(self):
        self._element.click()

    def is_visible(self) -> bool:
        return self._element.is_visible()

    def is_focused(self) -> bool:
        return self._element.is_focused()

    def wait_until_visible(self, timeout: float = 5):
        self._element.wait_until_visible(timeout)

    def wait_until_not_visible(self, timeout: float = 5):
        self._element.wait_until_not_visible(timeout)


class Checkbox:

    def __init__(self, driver: webdriver, visible_locator, actual_locator):
        self._driver = driver
        self._element = Element(self._driver, visible_locator)
        self._element.wait_until_visible()
        self._selenium_element = self._driver.find_element(By.XPATH, f"{visible_locator}{actual_locator}")
        self._checked_xpath = f'{visible_locator}//span[@class="tick checked"]'
        self._unchecked_xpath = f'{visible_locator}//span[contains(@class,"unchecked")]'

    def click(self):
        self._element.click()

    def select(self):
        if self.unchecked():
            self._element.click()

    def unselect(self):
        if self.checked():
            self._element.click()

    def checked(self):
        return self._driver.find_element(By.XPATH, self._checked_xpath)

    def unchecked(self):
        return self._driver.find_element(By.XPATH, self._unchecked_xpath)

    def is_focused(self):
        return self._selenium_element == self._driver.switch_to.active_element()


class PageText:

    def __init__(self, driver: webdriver, locator):
        self._driver = driver
        self._element = Element(self._driver, locator)
        self._element.wait_until_visible()

    def get_text(self) -> str:
        return self._element.text()

    def wait_until_visible(self, timeout: float = 5):
        self._element.wait_until_visible(timeout)

    def wait_until_not_visible(self, timeout: float = 5):
        self._element.wait_until_not_visible(timeout)


class TextField:

    def __init__(self, driver: webdriver, locator):
        self._driver = driver
        self._element = Element(self._driver, locator)
        # TODO: Remove locator field.
        self.locator = locator

    def input_text(self, text: str):
        self._element.clear_text()
        self._element.send_keys(text)

    def clear(self):
        self._element.clear_text()

    def get_text(self):
        if self._element.text:
            return self._element.text
        elif self._element.get_attribute("value"):
            return self._element.get_attribute("value")
        else:
            raise RuntimeError("Element had no text")

    def get_outline_color(self) -> str:
        return self._element.value_of_css_property("border-color")

    def get_text_color(self) -> str:
        return self._element.value_of_css_property("color")

    def field_type(self) -> str:
        return self._element.get_attribute("type")

    def is_focused(self) -> bool:
        return self._element.is_focused()

    def get_attribute(self, attribute: str):
        return self._element.get_attribute(attribute)

    def wait_until_visible(self, timeout: float = 5):
        self._element.wait_until_visible(timeout)


class Table:

    def __init__(self, driver: webdriver, locator):
        self._driver = driver
        self._element = Element(self._driver, locator)

    def wait_until_visible(self, timeout: float = 5):
        self._element.wait_until_visible(timeout)

    def wait_until_not_visible(self, timeout: float = 5):
        self._element.wait_until_not_visible(timeout)


class Image:

    def __init__(self, driver: webdriver, locator):
        self._driver = driver
        self._element = Element(self._driver, locator)

    def screenshot(self, filename: str):
        return self._element.get_screenshot(filename)


class Pane:

    def __init__(self, driver: webdriver, locator):
        self._driver = driver
        self._element = Element(self._driver, locator)

    def wait_until_visible(self, timeout: float = 5):
        self._element.wait_until_visible(timeout)

    def wait_until_not_visible(self, timeout: float = 5):
        self._element.wait_until_not_visible(timeout)


class Link:

    def __init__(self, driver: webdriver, locator):
        self._driver = driver
        self._element = Element(self._driver, locator)

    def wait_until_not_visible(self, timeout: float = 5):
        self._element.wait_until_not_visible(timeout)

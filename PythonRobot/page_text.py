from selenium import webdriver

from generic_element import Element


class PageText:

    def __init__(self, driver: webdriver, locator):
        self._driver = driver
        self._element = Element(self._driver, locator)
        self._element.wait_until_visible()

    def get_text(self) -> str:
        return self._element.text()

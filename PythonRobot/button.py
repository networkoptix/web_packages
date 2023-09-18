from selenium import webdriver

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

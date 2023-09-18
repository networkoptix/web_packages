from selenium import webdriver

from generic_element import Element


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

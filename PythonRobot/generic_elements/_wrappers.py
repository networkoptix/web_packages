import platform
import time
from typing import Optional
from typing import Sequence

from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.remote.webdriver import WebDriver
from selenium.webdriver.remote.webelement import WebElement

from generic_elements import ElementNotInDOM
from generic_elements._generic_element import Element


class Button:

    def __init__(self, driver: WebDriver, locator):
        self.driver = driver
        # TODO: add check to confirm button text is correct?
        self._element = Element(self.driver, locator)

    def click(self):
        self._element.click()

    def is_visible(self) -> bool:
        try:
            self._element.wait_until_exists()
        except ElementNotInDOM:
            return False
        return self._element.is_visible()

    def is_focused(self) -> bool:
        return self._element.is_focused()

    def should_contain(self, text: str):
        self._element.should_contain(text)

    def get_text(self):
        if self._element.text():
            return self._element.text()
        elif self._element.get_attribute("value"):
            return self._element.get_attribute("value")
        else:
            raise RuntimeError("Element had no text")

    def wait_until_visible(self, timeout: float = 5):
        self._element.wait_until_visible(timeout)

    def wait_until_not_visible(self, timeout: float = 5):
        self._element.wait_until_not_visible(timeout)

    def wait_until_clickable(self, timeout: float = 5):
        self._element.wait_until_clickable(timeout)

    def wait_until_not_clickable(self, timeout: float = 5):
        self._element.wait_until_not_clickable(timeout)

    def wait_until_does_not_exist(self):
        self._element.wait_until_does_not_exist()

    def is_enabled(self) -> bool:
        self._element.wait_until_visible()
        if 'disabled' in self._element.get_attribute('class'):
            return False
        return self._element.is_enabled()


class Checkbox:

    def __init__(self, driver: WebDriver, locator):
        self._driver = driver
        self._element = Element(self._driver, locator)
        self._checked_xpath = f'{locator}//span[@class="tick checked"]'
        self._unchecked_xpath = f'{locator}//span[contains(@class,"unchecked")]'

    def click(self):
        self._element.click()

    def select(self):
        self.wait_until_visible()
        if self.unchecked():
            self._element.click()

    def unselect(self):
        self.wait_until_visible()
        if self.checked():
            self._element.click()

    def checked(self):
        self.wait_until_visible()
        return self._driver.find_element(By.XPATH, self._checked_xpath)

    def unchecked(self):
        self.wait_until_visible()
        return self._driver.find_element(By.XPATH, self._unchecked_xpath)

    def is_focused(self):
        self.wait_until_visible()
        return self._element.is_focused()

    def wait_until_visible(self):
        self._element.wait_until_visible()


class PageText:

    def __init__(self, driver: WebDriver, locator):
        self._driver = driver
        self._element = Element(self._driver, locator)

    def get_text(self) -> str:
        return self._element.text()

    def wait_until_visible(self, timeout: float = 5):
        self._element.wait_until_visible(timeout)

    def wait_until_not_visible(self, timeout: float = 5):
        self._element.wait_until_not_visible(timeout)

    def click(self):
        self._element.click()

    def hover(self):
        self._element.hover()

    def wait_until_does_not_exist(self, timeout: float = 5):
        self._element.wait_until_does_not_exist(timeout)

    def should_contain(self, text: str):
        self._element.should_contain(text)

    def get_attribute(self, attribute: str) -> Optional[str]:
        return self._element.get_attribute(attribute)


class TextField:

    def __init__(self, driver: WebDriver, locator):
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
        if self._element.text():
            return self._element.text()
        elif self._element.get_attribute("value"):
            return self._element.get_attribute("value")
        else:
            return ""

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

    def delete_all_text(self):
        self._element.wait_until_clickable()
        if platform.system() == 'Darwin':
            self._element.send_keys(Keys.COMMAND + 'a')
        else:
            self._element.send_keys(Keys.CONTROL + 'a')
        self._element.send_keys(Keys.BACK_SPACE)

    def click(self):
        self._element.click()

    def hover(self):
        self._element.hover()

    def is_visible(self) -> bool:
        return self._element.is_visible()

    def is_enabled(self) -> bool:
        return self._element.is_enabled()

    def value_of_css_property(self, style_property: str):
        return self._element.value_of_css_property(style_property)

    def send_keys(self, keys: str):
        self._element.send_keys(keys)

    def wait_until_text_is(self, text: str, timeout=5):
        started_at = time.monotonic()
        while True:
            if self.get_text() == text:
                return
            if time.monotonic() - started_at > timeout:
                raise TextNotFound(f'Text field contains text "{self.get_text()}" instead of "{text}"')
            time.sleep(.1)

    def wait_until_does_not_exist(self):
        self._element.wait_until_does_not_exist()

    def wait_until_has_style(self, style_name: str, expected_value: str, timeout_sec: float = 30):
        started_at = time.monotonic()
        while True:
            actual_value = self.value_of_css_property(style_name)
            if actual_value == expected_value:
                return
            if time.monotonic() - started_at > timeout_sec:
                raise RuntimeError(
                    f'Wrong value for css property: {style_name}.'
                    f' Actual: {actual_value}. Expected: {expected_value}',
                    )
            time.sleep(1)

    def copy_text(self):
        self.send_keys(Keys.CONTROL + 'a')
        self.send_keys(Keys.CONTROL + 'c')

    def paste_text(self):
        self.send_keys(Keys.CONTROL + 'v')

    def press_enter(self):
        self.send_keys(Keys.ENTER)

    def press_tab(self):
        self.send_keys(Keys.TAB)

    def double_press_tab(self):
        self.send_keys(Keys.TAB + Keys.TAB)

    def get_html_attribute(self, attribute_name: str):
        return self._element.get_html_attribute(attribute_name)


class SearchBar:

    def __init__(self, driver: WebDriver, locator):
        self._driver = driver
        self._element = Element(self._driver, locator)

    def should_be_focused(self):
        return self._element.is_focused()

    def search_text(self, text: str):
        self._element.send_keys(text)
        # self._element.submit()

    def wait_until_visible(self, timeout: float = 0.5):
        self._element.wait_until_visible(timeout)

    def click(self):
        self._element.click()

    def get_attribute(self, attribute: str):
        return self._element.get_attribute(attribute)


class Table:

    def __init__(self, driver: WebDriver,
                 locator,
                 target_item: str = "",
                 target_contents: str = ""):
        self._driver = driver
        self._element = Element(self._driver, locator)
        self.locator = locator
        self.target_item = target_item
        self.target_contents = target_contents

    def target_should_contain(self, text: str):
        locator = self.locator + self.target_item + self.target_contents
        target = Element(self._driver, locator)
        target.should_contain(text)

    def wait_until_target_is_visible(self, timeout: float = 5):
        target = Element(self._driver, self.locator + self.target_item)
        target.wait_until_visible(timeout)

    def wait_until_visible(self, timeout: float = 5):
        self._element.wait_until_visible(timeout)

    def wait_until_not_visible(self, timeout: float = 5):
        self._element.wait_until_not_visible(timeout)

    def wait_until_does_not_exist(self, timeout: float = 5):
        self._element.wait_until_does_not_exist(timeout)

    def get_data(self, locator="") -> Sequence[Sequence[Element]]:
        if not locator:
            locator = self.locator
        rows = []
        row_n = 1
        while True:
            row_locator = f'({locator}//tr)[{row_n}]'
            if len(self._driver.find_elements(By.XPATH, row_locator)) == 0:
                break
            print("found at least one  f'({self.locator}//tr)[{row_n}]'")
            row = []
            cell_n = 1
            while True:
                cell_locator = f'({row_locator}//td)[{cell_n}]'
                if len(self._driver.find_elements(By.XPATH, cell_locator)) == 0:
                    break
                print("found cell_locator")
                cell = Element(self._driver, cell_locator)
                row.append(cell)
                cell_n += 1
            if row:
                rows.append(row)
            row_n += 1
        return rows


class Image:

    def __init__(self, driver: WebDriver, locator):
        self._driver = driver
        self._element = Element(self._driver, locator)

    def wait_until_visible(self, timeout: float = 5):
        self._element.wait_until_visible(timeout)

    def click(self):
        self._element.click()

    def hover(self):
        self._element.hover()


class Pane:

    def __init__(self, driver: WebDriver, locator):
        self._driver = driver
        self._element = Element(self._driver, locator)
        self.item = None
        self.locator = locator

    def count_item(self, item_locator: str):
        xpath = self.locator + item_locator
        return Element(self._driver, xpath).count()

    def should_contain(self, text: str):
        self._element.should_contain(text)

    def wait_until_visible(self, timeout: float = 5):
        self._element.wait_until_visible(timeout)

    def wait_until_not_visible(self, timeout: float = 5):
        self._element.wait_until_not_visible(timeout)

    def wait_until_does_not_exist(self, timeout: float = 5):
        self._element.wait_until_does_not_exist(timeout)

    def find_element(self, locator, position) -> Element:
        return self._element.find_element(locator, position)


class Link:

    def __init__(self, driver: WebDriver, locator):
        self._driver = driver
        self._element = Element(self._driver, locator)

    def wait_until_not_visible(self, timeout: float = 5):
        self._element.wait_until_not_visible(timeout)

    def wait_until_does_not_exist(self, timeout: float = 5):
        self._element.wait_until_does_not_exist(timeout)

    def wait_until_visible(self, timeout: float = 5):
        self._element.wait_until_visible(timeout)

    def click(self):
        self._element.click()

    def get_attribute(self, attribute: str):
        return self._element.get_attribute(attribute)


class DropDown:

    def __init__(self, driver: WebDriver, locator):
        self._driver = driver
        self._element = Element(self._driver, locator)

    def wait_until_visible(self, timeout: float = 5):
        self._element.wait_until_visible(timeout)

    def wait_until_not_visible(self, timeout: float = 5):
        self._element.wait_until_not_visible(timeout)

    def click(self):
        self._element.click()

    def text(self) -> str:
        return self._element.text()


class DropDownOption:

    # TODO: Move functionality to DropDown class.

    def __init__(self, driver: WebDriver, locator):
        self._driver = driver
        self._element = Element(self._driver, locator)

    def wait_until_visible(self, timeout: float = 5):
        self._element.wait_until_visible(timeout)

    def wait_until_not_visible(self, timeout: float = 5):
        self._element.wait_until_not_visible(timeout)

    def click(self):
        self._element.click()


class Tooltip:

    def __init__(self, driver: WebDriver, locator):
        self._driver = driver
        self._element = Element(self._driver, locator)

    def wait_until_visible(self, timeout: float = 5):
        self._element.wait_until_visible(timeout)


class TabItem:

    def __init__(self, driver: WebDriver, locator):
        self._driver = driver
        self._element = Element(self._driver, locator)

    def click(self):
        self._element.click()

    def wait_until_visible(self, timeout: float = 5):
        self._element.wait_until_visible(timeout)


class Page:

    def __init__(self, driver: WebDriver, locator):
        self._driver = driver
        self._element = Element(self._driver, locator)

    def wait_until_exists(self, timeout: float = 5):
        self._element.wait_until_exists(timeout)

    def wait_until_visible(self, timeout: float = 5):
        self._element.wait_until_visible(timeout)


class TextNotFound(Exception):
    pass


class MenuNode:

    def __init__(self, driver: WebDriver, element: WebElement):
        self._driver = driver
        self._element = element

    def value_of_css_property(self, style_property: str):
        return self._element.value_of_css_property(style_property)

    def click(self):
        self._element.click()


class NxCheckbox:

    def __init__(self, driver: WebDriver, element: WebElement):
        self._driver = driver
        self._element = element

    def is_visible(self):
        try:
            return self._element.is_displayed()
        except ElementNotInDOM:
            return False

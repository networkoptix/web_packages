import time
from typing import Optional
from typing import Sequence

from selenium.webdriver.common.by import By
from selenium.webdriver.remote.webdriver import WebDriver

from generic_element import Element


class Button:

    def __init__(self, driver: WebDriver, locator):
        self.driver = driver
        # TODO: add check to confirm button text is correct?
        self._element = Element(self.driver, locator)

    def click(self):
        self._element.click()

    def is_visible(self) -> bool:
        return self._element.is_visible()

    def is_focused(self) -> bool:
        return self._element.is_focused()

    def should_contain(self, text: str):
        self._element.should_contain(text)

    def wait_until_visible(self, timeout: float = 5):
        self._element.wait_until_visible(timeout)

    def wait_until_not_visible(self, timeout: float = 5):
        self._element.wait_until_not_visible(timeout)

    def wait_until_clickable(self, timeout: float = 5):
        self._element.wait_until_clickable(timeout)

    def wait_until_not_clickable(self, timeout: float = 5):
        self._element.wait_until_not_clickable(timeout)


class Checkbox:

    def __init__(self, driver: WebDriver, visible_locator, actual_locator):
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
        return self._selenium_element == self._driver.switch_to.active_element


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

    def wait_until_does_not_exist(self, timeout: float = 5):
        self._element.wait_until_does_not_exist(timeout)


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

    def delete_all_text(self):
        self._element.delete_all_text()

    def click(self):
        self._element.click()

    def send_keys(self, keys: str):
        self._element.send_keys(keys)

    def wait_until_contains_text(self, expected_text: str, timeout: float = 10):
        started_at = time.monotonic()
        while True:
            current_text = self._element.text()
            if current_text == expected_text:
                return
            if time.monotonic() - started_at > timeout:
                raise RuntimeError(f'Expected text: {expected_text}. Actual text {current_text}')


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

    def get_data(self) -> Sequence[Sequence[Element]]:
        rows = []
        row_n = 1
        while True:
            row_locator = f'({self.locator}//tr)[{row_n}]'
            if len(self._driver.find_elements_by_xpath(row_locator)) == 0:
                break
            row = []
            cell_n = 1
            while True:
                cell_locator = f'({row_locator}//td)[{cell_n}]'
                if len(self._driver.find_elements_by_xpath(cell_locator)) == 0:
                    break
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

    def get_screenshot(self):
        return self._element.get_screenshot()

    def wait_until_visible(self, timeout: float = 5):
        self._element.wait_until_visible(timeout)

    def click(self):
        self._element.click()


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


class Link:

    def __init__(self, driver: WebDriver, locator):
        self._driver = driver
        self._element = Element(self._driver, locator)

    def wait_until_not_visible(self, timeout: float = 5):
        self._element.wait_until_not_visible(timeout)

    def click(self):
        self._element.click()

    def wait_until_visible(self, timeout: float = 5):
        self._element.wait_until_visible(timeout)

    def get_text(self) -> str:
        return self._element.text()

    def get_attribute(self, attribute: str) -> Optional[str, None]:
        return self._element.get_attribute(attribute)


class DropDown:

    def __init__(self, driver: WebDriver, locator):
        self._driver = driver
        self._element = Element(self._driver, locator)

    def wait_until_visible(self, timeout: float = 5):
        self._element.wait_until_visible(timeout)

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

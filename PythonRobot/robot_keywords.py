import time

from selenium.webdriver.common.by import By
from selenium.webdriver.remote.webdriver import WebDriver
from selenium.webdriver.support import expected_conditions as ec
from selenium.webdriver.support.ui import WebDriverWait


# keep the following functions in alphabetical order


def location_should_be(driver: WebDriver, url: str) -> None:
    WebDriverWait(driver, 1).until(ec.url_to_be(url))


def location_should_contain(driver: WebDriver, url: str) -> None:
    WebDriverWait(driver, 10).until(ec.url_contains(url))


def wait_until_element_has_style(driver, css_selector, style_name, expected_value, timeout=30):
    def check_style(driver):
        try:
            element = driver.find_element(By.CSS_SELECTOR, css_selector)
            style_value = element.value_of_css_property(style_name)
            return style_value == expected_value
        except:
            return False

    WebDriverWait(driver, timeout).until(check_style)


def wait_until_number_of_tabs_are_open(driver, number: int, timeout=30):
    start_time = time.monotonic()
    handles = driver.window_handles
    while True:
        if len(handles) == number:
            return
        if time.monotonic() - start_time > timeout:
            raise AssertionError(f"Looking for {number} tabs, found {len(handles)} tabs.")
        time.sleep(.2)

import time
from typing import Tuple

from selenium.webdriver.remote.webdriver import WebDriver
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as ec
from selenium.webdriver.support.ui import WebDriverWait

from generic_element import Element


# keep the following functions in alphabetical order

def check_for_alert(driver: WebDriver, alert_text: str, timeout: int = 10) -> None:
    alert = "//div[contains(@class,'toast')]//span[contains(@class,'toast-content')]"
    xpath = f"{alert}/../span[contains(text(), '{alert_text}')]"
    Element(driver, xpath).wait_until_visible(timeout)
    wait_until_page_does_not_contain_element(driver, xpath, timeout)


def click_button(driver: WebDriver, locator: Tuple) -> None:
    WebDriverWait(driver, 10).until(ec.element_to_be_clickable((By.XPATH, locator))).click()


def click_on_link(driver: WebDriver, locator: Tuple) -> None:
    WebDriverWait(driver, 10).until(ec.element_to_be_clickable((By.XPATH, locator))).click()


def element_should_contain(driver: WebDriver, locator: str, text: str, timeout: int = 10) -> None:
    WebDriverWait(driver, timeout).until(ec.text_to_be_present_in_element((By.XPATH, locator), text))


def element_style_should_be(driver, locator, style_attribute, expected_value):
    element = driver.find_element(By.XPATH, locator)
    observed_value = element.value_of_css_property(style_attribute)
    if observed_value == expected_value:
        pass
    else:
        raise AssertionError(f"Expected: {expected_value}\nObserved: {observed_value}")


def get_element_count(driver: WebDriver, locator: str) -> int:
    return len(driver.find_elements(By.XPATH, locator))


def input_text(driver: WebDriver, locator: Tuple, text: str) -> None:
    element = driver.find_element(By.XPATH, locator)
    element.clear()
    element.send_keys(text)


def location_should_be(driver: WebDriver, url: str) -> None:
    WebDriverWait(driver, 1).until(ec.url_to_be(url))


def location_should_contain(driver: WebDriver, url: str) -> None:
    WebDriverWait(driver, 10).until(ec.url_contains(url))


def mouse_over(driver, locator):
    element = driver.find_element(By.XPATH, locator)
    action = ActionChains(driver)
    action.move_to_element(element).perform()


def wait_until_element_has_style(driver, css_selector, style_name, expected_value, timeout=30):
    def check_style(driver):
        try:
            element = driver.find_element(By.CSS_SELECTOR, css_selector)
            style_value = element.value_of_css_property(style_name)
            return style_value == expected_value
        except:
            return False

    WebDriverWait(driver, timeout).until(check_style)


def wait_until_element_is_enabled(driver: WebDriver, locator: str, timeout: int = 40) -> None:
    WebDriverWait(driver, timeout).until(ec.element_to_be_clickable((By.XPATH, locator)))


def wait_until_pane_is_not_visible(driver: WebDriver, locator: str, timeout: int = 10) -> None:
    WebDriverWait(driver, timeout).until_not(ec.visibility_of_element_located((By.XPATH, locator)))


def wait_until_number_of_tabs_are_open(driver, number: int, timeout=30):
    start_time = time.monotonic()
    handles = driver.window_handles
    while True:
        if len(handles) == number:
            return
        if time.monotonic() - start_time > timeout:
            raise AssertionError(f"Looking for {number} tabs, found {len(handles)} tabs.")
        time.sleep(.2)


def wait_until_page_contains(driver: WebDriver, text: str, timeout: int = 40) -> None:
    WebDriverWait(driver, timeout).until(ec.text_to_be_present_in_element((By.XPATH, "//*"), text))


def wait_until_page_contains_element(driver: WebDriver, locator: str, timeout: int = 40) -> None:
    WebDriverWait(driver, timeout).until(ec.presence_of_element_located((By.XPATH, locator)))


def wait_until_page_does_not_contain_element(driver: WebDriver, locator: str, timeout: int = 10) -> None:
    WebDriverWait(driver, timeout).until_not(ec.presence_of_element_located((By.XPATH, locator)))


def wait_until_textfield_contains(driver, locator, expected_text, timeout: int = 40) -> None:
    WebDriverWait(driver, timeout).until(ec.text_to_be_present_in_element_value((By.XPATH, locator), expected_text))

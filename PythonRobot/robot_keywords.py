import time
from typing import Tuple

from selenium import webdriver
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait


# keep the following functions in alphabetical order

def check_for_alert(driver: webdriver, alert_text: str, timeout: int = 10) -> None:
    alert = "//div[contains(@class,'toast')]//span[contains(@class,'toast-content')]"
    xpath = f"{alert}/../span[contains(text(), '{alert_text}')]"
    wait_until_element_is_visible(driver, xpath, timeout)
    wait_until_page_does_not_contain_element(driver, xpath, timeout)


def click_button(driver: webdriver, locator: Tuple) -> None:
    WebDriverWait(driver, 10).until(EC.element_to_be_clickable((By.XPATH, locator))).click()


def click_on_link(driver: webdriver, locator: Tuple) -> None:
    WebDriverWait(driver, 10).until(EC.element_to_be_clickable((By.XPATH, locator))).click()


def location_should_be(driver: webdriver, url: str) -> None:
    WebDriverWait(driver, 1).until(EC.url_to_be(url))


def location_should_contain(driver: webdriver, url: str) -> None:
    WebDriverWait(driver, 10).until(EC.url_contains(url))


def input_text(driver: webdriver, locator: Tuple, text: str) -> None:
    element = driver.find_element(By.XPATH, locator)
    element.clear()
    element.send_keys(text)


def wait_until_element_has_style(driver, css_selector, style_name, expected_value, timeout=30):
    def check_style(driver):
        try:
            element = driver.find_element(By.CSS_SELECTOR, css_selector)
            style_value = element.value_of_css_property(style_name)
            return style_value == expected_value
        except:
            return False

    WebDriverWait(driver, timeout).until(check_style)


def wait_until_element_is_visible(driver: webdriver, locator: str, timeout: int = 40) -> None:
    WebDriverWait(driver, timeout).until(EC.visibility_of_element_located((By.XPATH, locator)))


def wait_until_element_is_not_visible(driver: webdriver, locator: str, timeout: int = 10) -> None:
    WebDriverWait(driver, timeout).until_not(EC.visibility_of_element_located((By.XPATH, locator)))


def wait_until_element_is_enabled(driver: webdriver, locator: str, timeout: int = 40) -> None:
    WebDriverWait(driver, timeout).until(EC.element_to_be_clickable((By.XPATH, locator)))


def wait_until_page_contains(driver: webdriver, text: str, timeout: int = 40) -> None:
    WebDriverWait(driver, timeout).until(EC.text_to_be_present_in_element((By.XPATH, "//*"), text))


def wait_until_page_contains_element(driver: webdriver, locator: str, timeout: int = 40) -> None:
    WebDriverWait(driver, timeout).until(EC.presence_of_element_located((By.XPATH, locator)))


def wait_until_page_does_not_contain_element(driver: webdriver, locator: str, timeout: int = 10) -> None:
    WebDriverWait(driver, timeout).until_not(EC.presence_of_element_located((By.XPATH, locator)))


def wait_until_textfield_contains(driver, locator, expected_text, timeout: int = 40) -> None:
    WebDriverWait(driver, timeout).until(EC.text_to_be_present_in_element_value((By.XPATH, locator), expected_text))


def mouse_over(driver, locator):
    element = driver.find_element(By.XPATH, locator)
    action = ActionChains(driver)
    action.move_to_element(element).perform()


def element_style_should_be(driver, locator, style_attribute, expected_value):
    element = driver.find_element(By.XPATH, locator)
    observed_value = element.value_of_css_property(style_attribute)
    if observed_value == expected_value:
        pass
    else:
        # driver.capture_page_screenshot()
        raise AssertionError(f"Expected: {expected_value}\nObserved: {observed_value}")


def wait_until_number_of_tabs_are_open(driver, number: int, timeout=30):
    start_time = time.monotonic()
    handles = driver.window_handles
    while True:
        if len(handles) == number:
            return
        if time.monotonic() - start_time > timeout:
            raise AssertionError(f"Looking for {number} tabs, found {len(handles)} tabs.")
        time.sleep(.2)

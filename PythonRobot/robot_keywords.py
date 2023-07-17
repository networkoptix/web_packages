import time
from typing import Tuple, List
from selenium import webdriver
import selenium
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.keys import Keys
from selenium.common.exceptions import TimeoutException
import platform
from selenium.webdriver.common.action_chains import ActionChains

from variables import ALERT

# keep the following functions in alphabetical order

def check_for_alert(driver: webdriver, alert_text: str, timeout: int =10) -> None:
    ALERT = "//div[contains(@class,'toast')]//span[contains(@class,'toast-content')]"
    xpath = f"{ALERT}/../span[contains(text(), '{alert_text}')]"
    wait_until_element_is_visible(driver, xpath, timeout)
    wait_until_page_does_not_contain_element(driver, xpath, timeout)


def click_button(driver: webdriver, locator: Tuple) -> None:
    WebDriverWait(driver, 10).until(EC.element_to_be_clickable((By.XPATH, locator))).click()

def click_element(driver: webdriver, locator: str) -> None:
    driver.find_element(By.XPATH, locator).click()

def click_on_link(driver: webdriver, locator: Tuple) -> None:
    WebDriverWait(driver, 10).until(EC.element_to_be_clickable((By.XPATH, locator))).click()

def close_browser(driver: webdriver) -> None:
    driver.quit()

# TODO: what is the difference between clear_element_text and delete_all_text?
def clear_element_text(driver: webdriver, locator: Tuple) -> None:
    driver.find_element(By.XPATH, locator).clear()

def delete_all_text(driver: webdriver, locator: Tuple):
    element = WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.XPATH, locator)))
    if platform.system() == 'Darwin':
        element.send_keys(Keys.COMMAND + 'a')
    else:
        element.send_keys(Keys.CONTROL + 'a')
    element.send_keys(Keys.BACK_SPACE)


def element_should_be_visible(driver: webdriver, locator: str, timeout: int = 10) -> None:
    WebDriverWait(driver, timeout).until(EC.visibility_of_element_located((By.XPATH, locator)))

def element_should_be_visible(driver: webdriver, locator: str, timeout: int = 10) -> None:
    WebDriverWait(driver, timeout).until(EC.visibility_of_element_located((By.XPATH, locator)))

def element_should_not_be_visible(driver: webdriver, locator: str, timeout: int = 10) -> None:
    WebDriverWait(driver, timeout).until_not(EC.visibility_of_element_located((By.XPATH, locator)))

def element_should_be_disabled(driver: webdriver, locator: str, timeout: int = 10) -> None:
    WebDriverWait(driver, timeout).until_not(EC.element_to_be_clickable((By.XPATH, locator)))

def element_should_be_enabled(driver: webdriver, locator: str, timeout: int = 10) -> None:
    WebDriverWait(driver, timeout).until(EC.element_to_be_clickable((By.XPATH, locator)))

def get_element_attribute(driver: webdriver, locator: str, attribute: str) -> str:
    element_attribute = driver.find_element(By.XPATH, locator).get_attribute(attribute)
    print("element_attribute: ", element_attribute , attribute, locator)
    return element_attribute

def element_should_be_disabled(driver: webdriver, locator: str, timeout: int = 10) -> None:
    WebDriverWait(driver, timeout).until_not(EC.element_to_be_clickable((By.XPATH, locator)))

def element_should_be_enabled(driver: webdriver, locator: str, timeout: int = 10) -> None:
    WebDriverWait(driver, timeout).until(EC.element_to_be_clickable((By.XPATH, locator)))

def get_element_attribute(driver: webdriver, locator: str, attribute: str) -> str:
    element_attribute = driver.find_element(By.XPATH, locator).get_attribute(attribute)
    print("element_attribute: ", element_attribute , attribute, locator)
    return element_attribute

# def elements_should_not_be_visible(driver: webdriver, locators: List[str]) -> None:
#     for locator in locators:
#         element_should_not_be_visible(driver, locator)


def go_to_url(driver: webdriver, url: str) -> None:
    driver.get(url)

def location_should_be(driver: webdriver, url: str) -> None:
    WebDriverWait(driver, 10).until(EC.url_to_be(url))
    
def input_text(driver: webdriver, locator: Tuple, text: str) -> None:
    element = driver.find_element(By.XPATH, locator)
    element.clear()
    element.send_keys(text)

def open_browser_and_go_to_url(driver: webdriver, url: str) -> None:
    driver.get(url)

def reload_page(driver: webdriver) -> None:
    driver.refresh()

def regular_open_browser() -> webdriver:
    driver = webdriver.Chrome()
    return driver

def sleep(duration: int) -> None:
    time.sleep(duration)

def wait_for_input_text(driver: webdriver, locator: Tuple, expected_text: str, timeout: int = 10) -> None:
    WebDriverWait(driver, timeout).until(input_text)

def wait_until_element_has_style(driver, css_selector, style_name, expected_value, timeout=30):
    def check_style(driver):
        try:
            element = driver.find_element(By.CSS_SELECTOR, css_selector)
            style_value = element.value_of_css_property(style_name)
            return style_value == expected_value
        except:
            return False
    WebDriverWait(driver, timeout).until(check_style)  
    
def wait_until_element_has_style(driver: webdriver, element_locator: str, expected_style: str, timeout: int = 10):
    WebDriverWait(driver, timeout).until(EC.visibility_of_element_located((By.XPATH, element_locator)))


def wait_until_element_is_not_visible(driver: webdriver, locator: str, timeout: int = 10) -> None:
    WebDriverWait(driver, timeout).until_not(EC.visibility_of_element_located((By.XPATH, locator)))

def wait_until_element_is_visible(driver: webdriver, locator: str, timeout: int = 10) -> None:
    WebDriverWait(driver, timeout).until(EC.visibility_of_element_located((By.XPATH, locator)))

def wait_until_elements_are_visible(driver: webdriver, locators: List[str] , timeout: int = 10) -> None:
    for locator in locators:
        wait_until_element_is_visible(driver, locator, timeout=timeout)


def wait_until_input_succeeds(driver: webdriver, locator: Tuple, text: str, timeout: int = 10):
    end_time = time.time() + timeout
    while True:
        try:
            input_text(driver, locator, text)
            break  # if the function call was successful, break out of the loop
        except Exception as e:
            if time.time() > end_time:
                raise TimeoutException(f'Timeout after {timeout} seconds waiting for input_text to execute successfully') from e
            time.sleep(0.1)  # pause before retrying






def wait_until_page_contains(driver: webdriver, text: str, timeout: int = 10) -> None:
    WebDriverWait(driver, timeout).until(EC.text_to_be_present_in_element((By.XPATH, "//*"), text))

def wait_until_page_contains_element(driver: webdriver, locator: str, timeout: int = 10) -> None:
    WebDriverWait(driver, timeout).until(EC.presence_of_element_located((By.XPATH, locator)))

def  wait_until_page_does_not_contain_element(driver: webdriver, locator: str, timeout: int = 10) -> None:
    WebDriverWait(driver, timeout).until_not(EC.presence_of_element_located((By.XPATH, locator)))

def wait_until_textfield_contains(driver, locator, expected_text, timeout: int = 10) -> None:
    WebDriverWait(driver, timeout).until(EC.text_to_be_present_in_element_value((By.XPATH, locator), expected_text))

def reload_page(driver: webdriver):
    driver.refresh()

def mouse_over(driver, locator):
    element = driver.find_element(By.XPATH, locator)
    action = ActionChains(driver)
    action.move_to_element(element).perform()

def element_style_should_be(driver, locator, styleAttribute, expectedValue):
    observedValue = get_element_style(driver, locator, styleAttribute)
    if observedValue == expectedValue:
        pass
    else:
        # driver.capture_page_screenshot()
        raise AssertionError(f"Expected: {expectedValue}\nObserved: {observedValue}")

def get_element_style(driver, locator, styleAttribute):
        not_found = None
        try:
            element = driver.find_element(By.XPATH, locator)
            value = element.value_of_css_property(styleAttribute)
            return value
        except:
            not_found = f"No element found with style attribute {styleAttribute}"
        raise AssertionError(not_found)

def title_should_be(driver, title: str, message: str = None):
        """Verifies that the current page title equals ``title``.

        The ``message`` argument can be used to override the default error
        message.

        ``message`` argument is new in SeleniumLibrary 3.1.
        """
        actual = get_title(driver)
        if actual != title:
            if message is None:
                message = f"Title should have been '{title}' but was '{actual}'."
            raise AssertionError(message)
        driver.info(f"Page title is '{title}'.")

def get_title(driver) -> str:
        """Returns the title of the current page."""
        return driver.title
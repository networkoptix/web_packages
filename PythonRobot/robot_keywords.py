import platform
import time
from typing import List
from typing import Tuple

from selenium import webdriver
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from generic_element import Element


# keep the following functions in alphabetical order

def check_for_alert(driver: webdriver, alert_text: str, timeout: int = 10) -> None:
    alert = "//div[contains(@class,'toast')]//span[contains(@class,'toast-content')]"
    xpath = f"{alert}/../span[contains(text(), '{alert_text}')]"
    wait_until_element_is_visible(driver, xpath, timeout)
    wait_until_page_does_not_contain_element(driver, xpath, timeout)


def click_button(driver: webdriver, locator: Tuple) -> None:
    WebDriverWait(driver, 10).until(EC.element_to_be_clickable((By.XPATH, locator))).click()

# deprecated: this functionality has been moved to generic_element
def click_element(driver: webdriver, locator: str) -> None:
    driver.find_element(By.XPATH, locator).click()


def click_on_link(driver: webdriver, locator: Tuple) -> None:
    WebDriverWait(driver, 10).until(EC.element_to_be_clickable((By.XPATH, locator))).click()


def close_browser(driver: webdriver) -> None:
    driver.quit()

# deprecated: this functionality has been moved to generic_element
def get_element_attribute(driver: webdriver, locator: str, attribute: str) -> str:
    element_attribute = driver.find_element(By.XPATH, locator).get_attribute(attribute)
    #print("element_attribute: ", element_attribute, attribute, locator)
    return element_attribute
# deprecated: this functionality has been moved to generic_element
def get_text(driver: webdriver, locator: str) -> str:
    return driver.find_element(By.XPATH, locator).text


def go_to_url(driver: webdriver, url: str) -> None:
    driver.get(url)


def location_should_be(driver: webdriver, url: str) -> None:
    WebDriverWait(driver, 1).until(EC.url_to_be(url))


def location_should_contain(driver: webdriver, url: str) -> None:
    WebDriverWait(driver, 10).until(EC.url_contains(url))


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

def wait_until_element_contains(driver, locator, expected_text, timeout: int = 10) -> None:
    WebDriverWait(driver, timeout).until(EC.text_to_be_present_in_element((By.XPATH, locator), expected_text))


def wait_until_element_has_style(driver, css_selector, style_name, expected_value, timeout=30):
    def check_style(driver):
        try:
            element = driver.find_element(By.CSS_SELECTOR, css_selector)
            style_value = element.value_of_css_property(style_name)
            return style_value == expected_value
        except:
            return False

    WebDriverWait(driver, timeout).until(check_style)

def wait_until_element_is_not_visible(driver: webdriver, locator: str, timeout: int = 10) -> None:
    WebDriverWait(driver, timeout).until_not(EC.visibility_of_element_located((By.XPATH, locator)))


def wait_until_element_is_visible(driver: webdriver, locator: str, timeout: int = 10) -> None:
    Element(driver, locator).wait_until_visible(timeout=timeout)


def wait_until_element_is_enabled(driver: webdriver, locator: str, timeout: int = 40) -> None:
    WebDriverWait(driver, timeout).until(EC.element_to_be_clickable((By.XPATH, locator)))


# deprecated: this functionality has been moved to generic_element
def wait_until_elements_are_visible(driver: webdriver, locators: List[str], timeout: int = 40) -> None:
    for locator in locators:
        wait_until_element_is_visible(driver, locator, timeout=timeout)


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
    observed_value = get_element_style(driver, locator, style_attribute)
    if observed_value == expected_value:
        pass
    else:
        # driver.capture_page_screenshot()
        raise AssertionError(f"Expected: {expected_value}\nObserved: {observed_value}")


def get_element_style(driver, locator, style_attribute):
    not_found = None
    try:
        element = driver.find_element(By.XPATH, locator)
        value = element.value_of_css_property(style_attribute)
        return value
    except:
        not_found = f"No element found with style attribute {style_attribute}"
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


def get_title(driver) -> str:
    """Returns the title of the current page."""
    return driver.title


def wait_until_number_of_tabs_are_open(driver, number, timeout=30):
    timeout = timeout + time.time()
    found = None
    handles = driver.window_handles
    while time.time() < timeout:
        try:
            if str(len(handles)) == str(number):
                return
        except:
            found = f"Looking for {number} tabs, found {len(handles)} tabs."
        time.sleep(.2)
    raise AssertionError(found)

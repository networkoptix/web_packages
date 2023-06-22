import time
from typing import Tuple, Union
from selenium import webdriver
import selenium
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
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

def delete_all_text(driver: webdriver, locator: Tuple) -> None:
    driver.find_element(By.XPATH, locator).clear()

def element_should_be_visible(driver: webdriver, locator: str, timeout: int = 10) -> None:
    WebDriverWait(driver, timeout).until(EC.visibility_of_element_located((By.XPATH, locator)))

def element_should_not_be_visible(driver: webdriver, locator: str, timeout: int = 10) -> None:
    WebDriverWait(driver, timeout).until_not(EC.visibility_of_element_located((By.XPATH, locator)))

def elements_should_not_be_visible(driver: webdriver, locators: list[str]) -> None:
    for locator in locators:
        element_should_not_be_visible(driver, locator)

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

def regular_open_browser() -> webdriver:
    driver = webdriver.Chrome()
    return driver

def sleep(duration: int) -> None:
    time.sleep(duration)
def wait_until_element_has_style(driver: webdriver, element_locator: Tuple[str, str], expected_style: str, timeout: int = 10):
    def element_has_style(driver):
        element = driver.find_element(*element_locator)
        return expected_style in element.get_attribute('style')

    WebDriverWait(driver, timeout).until(element_has_style)

def wait_until_element_is_not_visible(driver: webdriver, locator: str, timeout: int = 10) -> None:
    WebDriverWait(driver, timeout).until_not(EC.visibility_of_element_located((By.XPATH, locator)))

def wait_until_element_is_visible(driver: webdriver, locator: str, timeout: int = 10) -> None:
    WebDriverWait(driver, timeout).until(EC.visibility_of_element_located((By.XPATH, locator)))

def wait_until_elements_are_visible(driver: webdriver, locators: list[str], timeout: int = 10) -> None:
    for locator in locators:
        wait_until_element_is_visible(driver, locator, timeout=timeout)

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
    element = driver.find_element(locator)
    action = ActionChains(driver)
    action.move_to_element(element).perform()
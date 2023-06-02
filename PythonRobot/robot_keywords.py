import time
from typing import Tuple, Union
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


def sleep(duration: int) -> None:
    time.sleep(duration)

def wait_until_element_is_visible(driver: webdriver, locator: str, timeout: int = 10) -> None:
    WebDriverWait(driver, timeout).until(EC.visibility_of_element_located((By.XPATH,locator)))

def element_should_not_be_visible(driver: webdriver, locator: str, timeout: int = 10) -> None:
    WebDriverWait(driver, timeout).until_not(EC.visibility_of_element_located((By.XPATH,locator)))


def click_on_link(driver: webdriver, locator: Tuple) -> None:
    WebDriverWait(driver, 10).until(EC.element_to_be_clickable((By.XPATH, locator))).click()

def open_browser_and_go_to_url(driver: webdriver, url: str) -> None:
    driver.get(url)

def input_text(driver: webdriver, locator: Tuple, text: str) -> None:
    element = driver.find_element(By.XPATH, locator)
    element.clear()
    element.send_keys(text)

def click_button(driver: webdriver, locator: Tuple) -> None:
    WebDriverWait(driver, 10).until(EC.element_to_be_clickable((By.XPATH, locator))).click()

def go_to_url(driver: webdriver, url: str) -> None:
    driver.get(url)


def close_browser(driver: webdriver) -> None:
    driver.quit()

def click_element(driver: webdriver, locator: str) -> None:
    driver.find_element(By.XPATH, locator).click()

def regular_open_browser() -> webdriver:
    driver = webdriver.Chrome()
    return driver

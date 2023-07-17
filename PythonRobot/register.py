from selenium import webdriver
from resource import get_headless_chrome, check_password_badge, check_new_password_outline_and_error_message
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from account import cloud_login
import robot_keywords
from RobotVariables import RobotVariables
import robot_lists as rl
from colorama import Fore, Back, Style
from header import HeaderNav
from register_form import RegisterForm

rb = RobotVariables("en_US")
driver = get_headless_chrome()
robot_keywords.go_to_url(driver, rb.ENV)

def page_in_anonymous_state():
    """1. Should open register page in anonymous state by clicking Register button on top right corner"""
    HeaderNav(driver).create_account().click()
    RegisterForm(driver)

def open_from_success_page():
    """2. Should open register page from register success page by clicking Register button on top right corner"""


if __name__ == "__main__":
    page_in_anonymous_state()
    print(f'{Fore.WHITE}{page_in_anonymous_state.__doc__}\t\t\t\t{Fore.GREEN}| PASS |')
    
    driver.close()
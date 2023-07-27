from selenium import webdriver
from resource_import import get_headless_chrome, get_random_email, activate
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from test_account import cloud_login
import robot_keywords
from RobotVariables import RobotVariables
import robot_lists as rl
from colorama import Fore, Back, Style
from button import Button
from header import HeaderNav
from register_form import RegisterForm

rb = RobotVariables("en_US")
# driver = get_headless_chrome()
# robot_keywords.go_to_url(driver, rb.ENV)

def page_in_anonymous_state_register_header():
    """1. Should open register page in anonymous state by clicking Register button on top right corner"""
    driver = get_headless_chrome()
    robot_keywords.go_to_url(driver, rb.ENV)
    HeaderNav(driver).create_account().click()
    RegisterForm(driver)
    driver.close()

def open_from_success_page():
    """2. Should open register page from register success page by clicking Register button on top right corner"""
    email = get_random_email(sendemail=True)
    driver = get_headless_chrome()
    robot_keywords.go_to_url(driver, rb.ENV)
    HeaderNav(driver).create_account().click()
    register_form = RegisterForm(driver)
    register_form.register_new_user("mark", "hamill", email, rb.BASE_PASSWORD)
    #Todo activate still needs email to work
    # activate(driver, email, from_email=True)
    # robot_keywords.go_to_url(driver, rb.ENV)
    # HeaderNav(driver).create_account().click()
    # RegisterForm(driver)
    driver.close()

def page_in_anonymous_state_redister_home():
    """3. Should open register page in anonymous state by clicking Register button on homepage"""
    driver = get_headless_chrome()
    robot_keywords.go_to_url(driver, rb.ENV)
    Button(driver, rb.CREATE_ACCOUNT_BODY).click()
    RegisterForm(driver)


if __name__ == "__main__":
    # page_in_anonymous_state_register_header()
    # print(f'{Fore.WHITE}{page_in_anonymous_state_register_header.__doc__}\t\t\t\t{Fore.GREEN}| PASS |')

    # open_from_success_page()
    # print(f'{Fore.WHITE}{open_from_success_page.__doc__}\t\t\t\t{Fore.GREEN}| PASS |')

    page_in_anonymous_state_redister_home()
    print(f'{Fore.WHITE}{page_in_anonymous_state_redister_home.__doc__}\t\t\t\t{Fore.GREEN}| PASS |')
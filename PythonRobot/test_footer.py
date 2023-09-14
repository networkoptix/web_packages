import time

from colorama import Fore

import robot_keywords
from RobotVariables import RobotVariables
from footer import Footer
from resource_import import get_headless_chrome

rb = RobotVariables("en_US")

# Webadmin only
def api_documentation_link():
    """1. API documentation link leads to proper page"""
    driver = get_headless_chrome()
    robot_keywords.go_to_url(driver, rb.ENV)
    Footer(driver, "webadmin")
    driver.close()

# Webadmin only
def download_sdk_link():
    """2. Download SDK link leads to proper page"""   
    driver = get_headless_chrome()
    robot_keywords.go_to_url(driver, rb.ENV)
    Footer(driver, "webadmin")
    driver.close()

def support_link():
    """3. Support leads to the proper support site"""
    driver = get_headless_chrome()
    robot_keywords.go_to_url(driver, rb.ENV)
    footer = Footer(driver, "cloud")
    footer.support_link().click()
    robot_keywords.wait_until_number_of_tabs_are_open(driver, 2)
    driver.switch_to.window(driver.window_handles[1])
    time.sleep(1)
    robot_keywords.location_should_contain(driver, rb.SUPPORT_URL)
    driver.close()

def copyright_link():
    """4. Copyright leads to the proper site"""
    driver = get_headless_chrome()
    robot_keywords.go_to_url(driver, rb.ENV)
    footer = Footer(driver, "cloud")
    time.sleep(1)
    footer.copyright_link().click()
    robot_keywords.wait_until_number_of_tabs_are_open(driver, 2)
    driver.switch_to.window(driver.window_handles[1])
    time.sleep(1)
    robot_keywords.location_should_be(driver, rb.COPYRIGHT_URL)
    driver.close()

def terms_link():
    """5. Terms leads to the proper EULA site"""
    driver = get_headless_chrome()
    robot_keywords.go_to_url(driver, rb.ENV)
    footer = Footer(driver, "cloud")
    footer.terms_link().click()
    time.sleep(2)
    robot_keywords.location_should_contain(driver, rb.TERMS_URL)
    driver.close()

def privacy_link():
    """6. Privacy leads to the proper page"""
    driver = get_headless_chrome()
    robot_keywords.go_to_url(driver, rb.ENV)
    footer = Footer(driver, "cloud")
    footer.privacy_link().click()
    robot_keywords.wait_until_number_of_tabs_are_open(driver, 2)
    driver.switch_to.window(driver.window_handles[1])
    time.sleep(1)
    robot_keywords.location_should_be(driver, rb.PRIVACY_POLICY_FULL_URL)
    driver.close()

if __name__ == "__main__":
    support_link()
    print(f'{Fore.WHITE}{support_link.__doc__}\t\t\t{Fore.GREEN}| PASS |')

    copyright_link()
    print(f'{Fore.WHITE}{copyright_link.__doc__}\t\t\t\t{Fore.GREEN}| PASS |')

    terms_link()
    print(f'{Fore.WHITE}{terms_link.__doc__}\t\t\t\t{Fore.GREEN}| PASS |')

    privacy_link()
    print(f'{Fore.WHITE}{privacy_link.__doc__}\t\t\t\t{Fore.GREEN}| PASS |')


import time

from colorama import Fore

from RobotVariables import RobotVariables
from pages.footer import Footer
from resource_import import get_chrome

rb = RobotVariables("en_US")


# Webadmin only
def api_documentation_link():
    """1. API documentation link leads to proper page"""
    with get_chrome() as driver:
        driver.get(rb.ENV)
        Footer(driver, "webadmin")


# Webadmin only
def download_sdk_link():
    """2. Download SDK link leads to proper page"""
    with get_chrome() as driver:
        driver.get(rb.ENV)
        Footer(driver, "webadmin")


def support_link():
    """3. Support leads to the proper support site"""
    with get_chrome() as driver:
        driver.get(rb.ENV)
        footer = Footer(driver, "cloud")
        footer.support_link().click()
        driver.wait_until_number_of_tabs_are_open(2)
        driver.switch_to.window(driver.window_handles[1])
        time.sleep(1)
        driver.location_should_contain(rb.SUPPORT_URL)


def copyright_link():
    """4. Copyright leads to the proper site"""
    with get_chrome() as driver:
        driver.get(rb.ENV)
        footer = Footer(driver, "cloud")
        time.sleep(1)
        footer.copyright_link().click()
        driver.wait_until_number_of_tabs_are_open(2)
        driver.switch_to.window(driver.window_handles[1])
        time.sleep(1)
        driver.location_should_be(rb.COPYRIGHT_URL)


def terms_link():
    """5. Terms leads to the proper EULA site"""
    with get_chrome() as driver:
        driver.get(rb.ENV)
        footer = Footer(driver, "cloud")
        footer.terms_link().click()
        time.sleep(2)
        driver.location_should_contain(rb.TERMS_URL)


def privacy_link():
    """6. Privacy leads to the proper page"""
    with get_chrome() as driver:
        driver.get(rb.ENV)
        footer = Footer(driver, "cloud")
        footer.privacy_link().click()
        driver.wait_until_number_of_tabs_are_open(2)
        driver.switch_to.window(driver.window_handles[1])
        time.sleep(1)
        driver.location_should_be(rb.PRIVACY_POLICY_FULL_URL)


if __name__ == "__main__":
    support_link()
    print(f'{Fore.WHITE}{support_link.__doc__}\t\t\t{Fore.GREEN}| PASS |')

    copyright_link()
    print(f'{Fore.WHITE}{copyright_link.__doc__}\t\t\t\t{Fore.GREEN}| PASS |')

    terms_link()
    print(f'{Fore.WHITE}{terms_link.__doc__}\t\t\t\t{Fore.GREEN}| PASS |')

    privacy_link()
    print(f'{Fore.WHITE}{privacy_link.__doc__}\t\t\t\t{Fore.GREEN}| PASS |')

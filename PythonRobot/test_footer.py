import time

from RobotVariables import RobotVariables
from browsers.chrome import get_chrome
from colorama import Fore
from pages.footer import Footer

rb = RobotVariables("en_US")


# Webadmin only
def api_documentation_link():
    """1. API documentation link leads to proper page."""
    with get_chrome() as driver:
        driver.get(rb.ENV)
        Footer(driver).wait_until_footer_is_visible_webadmin()


# Webadmin only
def download_sdk_link():
    """2. Download SDK link leads to proper page."""
    with get_chrome() as driver:
        driver.get(rb.ENV)
        Footer(driver).wait_until_footer_is_visible_webadmin()


def support_link(driver):
    """3. Support leads to the proper support site."""
    driver.get(rb.ENV)
    footer = Footer(driver)
    footer.wait_until_footer_is_visible_cloud()
    footer.support_link().click()
    driver.wait_until_number_of_tabs_are_open(2)
    driver.switch_to.window(driver.window_handles[1])
    time.sleep(1)
    driver.location_should_contain(rb.SUPPORT_URL)


def copyright_link(driver):
    """4. Copyright leads to the proper site."""
    driver.get(rb.ENV)
    footer = Footer(driver)
    footer.wait_until_footer_is_visible_cloud()
    time.sleep(1)
    footer.copyright_link().click()
    driver.wait_until_number_of_tabs_are_open(2)
    driver.switch_to.window(driver.window_handles[1])
    time.sleep(1)
    driver.location_should_be(rb.COPYRIGHT_URL)


def terms_link(driver):
    """5. Terms leads to the proper EULA site."""
    driver.get(rb.ENV)
    footer = Footer(driver)
    footer.wait_until_footer_is_visible_cloud()
    footer.terms_link().click()
    time.sleep(2)
    driver.location_should_contain(rb.TERMS_URL)


def privacy_link(driver):
    """6. Privacy leads to the proper page."""
    driver.get(rb.ENV)
    footer = Footer(driver)
    footer.wait_until_footer_is_visible_cloud()
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

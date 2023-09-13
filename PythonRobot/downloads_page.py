import time
from urllib.request import Request
from urllib.request import urlopen

from selenium.webdriver.common.by import By

import robot_keywords


class DownloadsPage:

    def __init__(self, driver):
        self._driver = driver
        self._wait_until_loaded()

    def _wait_until_loaded(self):
        robot_keywords.wait_until_page_contains_element(self._driver, "//nx-download-component")

    def get_windows_client_installer_tab(self) -> '_Tab':
        return self._get_tab('//nx-download-component//*[@id="windows"]')

    def get_linux_client_installer_tab(self) -> '_Tab':
        return self._get_tab('//nx-download-component//*[@id="linux"]')

    def get_mac_client_installer_tab(self) -> '_Tab':
        return self._get_tab('//nx-download-component//*[@id="macos"]')

    def get_play_store_link(self):
        return self._get_link('//nx-download-component//a[contains(@class, "mobile-link Android")]')

    def _get_tab(self, locator):
        robot_keywords.wait_until_page_contains_element(self._driver, locator, timeout=5)
        return _Tab(self._driver, locator)

    def _get_link(self, locator):
        robot_keywords.wait_until_page_contains_element(self._driver, locator, timeout=5)
        return self._driver.find_element(By.XPATH, locator).get_attribute('href')


class _Tab:

    def __init__(self, driver, locator):
        self._driver = driver
        self._locator = locator
        self._element = driver.find_element(By.XPATH, locator)

    def click(self):
        self._element.click()
        started_at = time.monotonic()
        timeout_sec = 5
        while True:
            if self.is_active():
                break
            if time.monotonic() - started_at > timeout_sec:
                raise RuntimeError(f"{self._locator!r} is not visible after {timeout_sec} seconds")
            time.sleep(0.5)

    def is_active(self):
        return self._get_download_button().is_displayed()

    def check_download_button_link(self):
        client_link_element = self._driver.find_element(
            By.XPATH, '//nx-download-component//a[contains(@class, "download-button")]')
        client_link = client_link_element.get_attribute('href')
        _check_link(client_link)

    def check_other_packages_links(self):
        other_links_elements = self._driver.find_elements(
            By.XPATH, '//nx-download-component//div[contains(@class, "links")]/a')
        if not other_links_elements:
            raise RuntimeError("No other packages exists")
        for link_element in other_links_elements:
            link = link_element.get_attribute('href')
            _check_link(link)

    def _get_download_button(self):
        return self._driver.find_element(
            By.XPATH, '//nx-download-component//a[contains(@class, "download-button")]')


def _check_link(link: str):
    with urlopen(Request(link, method='HEAD'), timeout=5) as response:
        if response.code != 200:
            raise RuntimeError(
                f"HEAD {link} request returned unexpected HTTP status {response.code}")
        content_length = int(response.headers.get('Content-Length'))
        if content_length < 1000:
            raise RuntimeError(f"File {link} is too small")

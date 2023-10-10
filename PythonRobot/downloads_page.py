import time
from urllib.request import Request
from urllib.request import urlopen

from selenium.webdriver.common.by import By

from generic_elements import Page
from generic_elements import Button
from generic_elements import Link
from generic_elements import TabItem


class DownloadsPage:

    def __init__(self, driver):
        self._driver = driver
        self._wait_until_loaded()

    def _wait_until_loaded(self):
        Page(self._driver, "//nx-download-component").wait_until_exists(40)

    def get_windows_client_installer_tab(self) -> '_Tab':
        return self._get_tab('//nx-download-component//*[@id="windows"]')

    def get_linux_client_installer_tab(self) -> '_Tab':
        return self._get_tab('//nx-download-component//*[@id="linux"]')

    def get_mac_client_installer_tab(self) -> '_Tab':
        return self._get_tab('//nx-download-component//*[@id="macos"]')

    def get_play_store_link(self):
        return self._get_link('//nx-download-component//a[contains(@class, "mobile-link Android")]')

    def get_itunes_store_link(self):
        return self._get_link('//nx-download-component//a[contains(@class, "mobile-link iOS")]')

    def get_other_releases_link(self) -> str:
        return self._get_link('//nx-download-component//a[@data-testid="historyReleaseLink"]')

    def _get_tab(self, locator):
        TabItem(self._driver, locator).wait_until_visible()
        return _Tab(self._driver, locator)

    def _get_link(self, locator):
        link = Link(self._driver, locator)
        link.wait_until_visible()
        return link.get_attribute('href')


class _Tab:

    def __init__(self, driver, locator):
        self._driver = driver
        self._locator = locator
        self._element = TabItem(self._driver, self._locator)

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
        return self._get_download_button().is_visible()

    def check_download_button_link(self):
        link = Link(
            self._driver,
            '//nx-download-component//a[contains(@class, "download-button")]',
            )
        client_link = link.get_attribute('href')
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
        button = Button(
            self._driver,
            '//nx-download-component//a[contains(@class, "download-button")]',
            )
        return button


def _check_link(link: str):
    with urlopen(Request(link, method='HEAD'), timeout=5) as response:
        if response.code != 200:
            raise RuntimeError(
                f"HEAD {link} request returned unexpected HTTP status {response.code}")
        content_length = int(response.headers.get('Content-Length'))
        if content_length < 1000:
            raise RuntimeError(f"File {link} is too small")

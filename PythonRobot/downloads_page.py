import time

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

    def _get_tab(self, locator):
        robot_keywords.wait_until_page_contains_element(self._driver, locator, timeout=5)
        return _Tab(self._driver, locator)


class _Tab:

    def __init__(self, driver, locator):
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

    def _get_download_button(self):
        return self._driver.find_element(
            By.XPATH, '//nx-download-component//a[contains(@class, "download-button")]')

import time

from selenium.webdriver.common.by import By

import robot_keywords
from button import Button


class DownloadsPage:

    def __init__(self, driver):
        self._driver = driver
        self._wait_until_loaded()

    def _wait_until_loaded(self):
        robot_keywords.wait_until_page_contains_element(self._driver, "//nx-download-component")

    def click_windows_client_installer_tab(self):
        self._click_tab('//nx-download-component//*[@id="windows"]')

    def click_linux_client_installer_tab(self):
        self._click_tab('//nx-download-component//*[@id="linux"]')

    def click_mac_client_installer_tab(self):
        self._click_tab('//nx-download-component//*[@id="macos"]')

    def _click_tab(self, locator):
        Button(self._driver, locator).click()
        started_at = time.monotonic()
        timeout_sec = 5
        download_button = self._driver.find_element(
            By.XPATH, '//nx-download-component//a[contains(@class, "download-button")]')
        while True:
            if download_button.is_displayed():
                break
            if time.monotonic() - started_at > timeout_sec:
                raise RuntimeError(f"{locator!r} is not visible after {timeout_sec} seconds")
            time.sleep(0.5)

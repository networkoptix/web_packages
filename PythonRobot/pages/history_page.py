import time
from typing import Collection

import requests
from selenium.webdriver.remote.webdriver import WebDriver
from selenium.webdriver.remote.webelement import WebElement

from PythonRobot import RobotVariables
from generic_elements import Page
from generic_elements import TabItem


class HistoryPage:

    def __init__(self, driver: WebDriver, variables: RobotVariables):
        self._driver = driver
        self._wait_until_loaded()
        self._variables = variables

    def _wait_until_loaded(self):
        Page(self._driver, "//nx-download-history").wait_until_visible(40)

    def get_download_links_for_last_version(self) -> Collection[str]:
        release_block = self._driver.find_element_by_xpath('//nx-release')
        download_block = release_block.find_element_by_xpath('./div/a')
        download_block.click()
        download_elements = release_block.find_elements_by_xpath('./div/ul/li/a')
        collected_links = []
        for element in download_elements:
            link = element.get_attribute('href')
            if link is not None and 'updates.networkoptix.com' in link:
                collected_links.append(link)
        if len(collected_links) == 0:
            raise RuntimeError("Did not find any distribs.")
        return collected_links

    def get_releases_tab(self) -> '_Tab':
        return self._get_tab(
            '//nx-download-history//span[contains(@class,"tab-heading")'
            f' and text()="{self._variables.RELEASES_TAB_TEXT}"]',
            )

    def get_patches_tab(self) -> '_Tab':
        return self._get_tab(
            '//nx-download-history//span[contains(@class,"tab-heading")'
            f' and text()="{self._variables.PATCHES_TAB_TEXT}"]',
            )

    def get_betas_tab(self) -> '_Tab':
        return self._get_tab(
            '//nx-download-history//span[contains(@class,"tab-heading")'
            f' and text()="{self._variables.BETAS_TAB_TEXT}"]',
            )

    def _get_tab(self, locator):
        TabItem(self._driver, locator).wait_until_visible()
        return _Tab(self._driver, locator)


class _Tab:

    def __init__(self, driver: WebDriver, locator: str):
        self._driver = driver
        self._locator = locator
        self._element = driver.find_element_by_xpath(locator)

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
        upper_element = self._element.find_element_by_xpath('..')
        return 'active' in upper_element.get_attribute('class')

    def get_platform_downloads_for_last_version(self) -> Collection['_PlatformDownloadBlock']:
        release_block = self._driver.find_element_by_xpath('//nx-release')
        elements = release_block.find_elements_by_xpath('./div/a')
        platform_blocks = []
        for e in elements:
            platform_blocks.append(_PlatformDownloadBlock(self._driver, e))
        return platform_blocks


class _PlatformDownloadBlock:

    def __init__(self, driver: WebDriver, element: WebElement):
        self._driver = driver
        self._element = element

    def click(self):
        self._element.click()

    def check_download_links(self):
        download_elements = self._element.find_elements_by_xpath('../ul/li/a')
        count_collected_links = 0
        for element in download_elements:
            link = element.get_attribute('href')
            if link is not None and 'updates.networkoptix.com' in link:
                count_collected_links += 1
                _check_link(link)
        if count_collected_links == 0:
            raise RuntimeError("Did not find any distribs.")


def _check_link(link: str):
    with requests.head(url=link) as response:
        if response.status_code != 200:
            raise RuntimeError(
                f"HEAD {link} request returned unexpected HTTP status {response.status_code}")
        content_length = int(response.headers.get('Content-Length'))
        if content_length is None:
            raise RuntimeError("Response does not have the field Content-Length.")
        if content_length < 1000:
            raise RuntimeError(f"File {link} is too small ({content_length} bytes).")

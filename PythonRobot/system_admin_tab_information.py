import time
from pathlib import Path
from string import Template
from typing import NamedTuple

from selenium.webdriver.remote.webdriver import WebDriver

import robot_keywords
from RobotVariables import RobotVariables
from generic_element import Element
from wrappers import Table


class TabInformation:

    def __init__(self, driver: WebDriver, locator: str, variables: RobotVariables):
        self._driver = driver
        self._locator = locator
        self._element = Element(driver, locator)
        self._variables = variables

    def click(self):
        self._element.click()
        # The page always renders in online status and then changes to offline if needed.
        # Without a sleep, the following code does not have time to detect the offline status.
        time.sleep(2)
        self.wait_until_ready()

    def wait_until_ready(self):
        started_at = time.monotonic()
        timeout_sec = 10
        while True:
            if self._is_system_online() or self.is_current_system_inaccessible():
                break
            if time.monotonic() - started_at > timeout_sec:
                raise TimeoutError(f"{self._locator!r} is not visible after {timeout_sec} seconds")
            time.sleep(1)

    def check_links(self):
        robot_keywords.wait_until_page_contains_element(self._driver, '//nx-menu//nx-level-1-item/a[@id="alerts"]')
        robot_keywords.wait_until_page_contains_element(self._driver, '//nx-menu//nx-level-1-item/a[@id="systems"]')
        robot_keywords.wait_until_page_contains_element(self._driver, '//nx-menu//nx-level-1-item/a[@id="servers"]')
        robot_keywords.wait_until_page_contains_element(self._driver, '//nx-menu//nx-level-1-item/a[@id="networkInterfaces"]')
        robot_keywords.wait_until_page_contains_element(self._driver, '//div[contains(@class,"menuLinks")]/nx-health-update')
        robot_keywords.wait_until_page_contains_element(self._driver, '//div[contains(@class,"menuLinks")]/div')

    def check_links_uploaded(self):
        robot_keywords.wait_until_page_contains_element(self._driver, '//nx-menu//nx-level-1-item/a[@id="alerts"]')
        robot_keywords.wait_until_page_contains_element(self._driver, '//nx-menu//nx-level-1-item/a[@id="systems"]')
        robot_keywords.wait_until_page_contains_element(self._driver, '//nx-menu//nx-level-1-item/a[@id="storages"]')
        robot_keywords.wait_until_page_contains_element(self._driver, '//nx-menu//nx-level-1-item/a[@id="servers"]')
        robot_keywords.wait_until_page_contains_element(self._driver, '//nx-menu//nx-level-1-item/a[@id="networkInterfaces"]')
        robot_keywords.wait_until_page_contains_element(self._driver, '//div[contains(@class,"menuLinks")]/div')

    def is_current_system_inaccessible(self) -> bool:
        return len(self._driver.find_elements_by_xpath(
            f'//div[contains(text(),"{self._variables.SYSTEM_CANNOT_BE_ACCESSED_TEXT}")]')) > 0

    def upload_json_report(self, filename: Path):
        element = Element(self._driver, '//input[contains(@class,"ngx-file-drop__file-input")]')
        element.send_file(str(filename))
        started_at = time.monotonic()
        timeout_sec = 10
        while True:
            if self.is_imported_report():
                break
            if time.monotonic() - started_at > timeout_sec:
                raise TimeoutError(f"Report did not load after {timeout_sec} seconds")
            time.sleep(0.5)

    def is_imported_report(self) -> bool:
        return len(self._driver.find_elements_by_xpath(
            f'//nx-ribbon//div[@class="message"]//div[contains(text(),"{self._variables.VIEWING_IMPORTED_REPORT_TEXT}")]')) > 0

    def _is_system_online(self) -> bool:
        return len(self._driver.find_elements_by_xpath('//nx-menu//nx-level-1-item')) > 0

    def no_alerts(self) -> bool:
        return len(self._driver.find_elements_by_xpath(
            f'//h2[contains(text(),"{self._variables.NO_ALERTS_TEXT}")]')) > 0

    def system_is_doing_well(self) -> bool:
        return len(self._driver.find_elements_by_xpath(
            f'//div[contains(text(),"{self._variables.SYSTEM_DOING_WELL_TEXT}")]')) > 0

    def get_alerts_count(self) -> int:
        e = Element(self._driver, '//div[@id="nx-table"]/div[contains(@class,"table-header")]')
        (count, _) = e.text().strip().split()
        return int(count)

    def get_systems_section(self) -> '_Section':
        return _Section(self._driver, '//nx-menu//nx-level-1-item/a[@id="systems"]', 'Systems')

    def get_alerts_section(self) -> '_AlertsSection':
        return _AlertsSection(self._driver, '//nx-menu//nx-level-1-item/a[@id="alerts"]', 'Alerts')

    def get_servers_section(self) -> '_Section':
        return _Section(self._driver, '//nx-menu//nx-level-1-item/a[@id="servers"]', 'Servers')

    def get_cameras_section(self) -> '_Section':
        return _Section(self._driver, '//nx-menu//nx-level-1-item/a[@id="cameras"]', 'Cameras')

    def get_storages_section(self) -> '_Section':
        return _Section(self._driver, '//nx-menu//nx-level-1-item/a[@id="storages"]', 'Storages')

    def get_network_section(self) -> '_Section':
        return _Section(self._driver, '//nx-menu//nx-level-1-item/a[@id="networkInterfaces"]', 'Network Interfaces')


class _Section:

    def __init__(self, driver: WebDriver, locator: str, name: str):
        robot_keywords.wait_until_page_contains_element(driver, locator, 5)
        self._driver = driver
        self._element = Element(driver, locator)
        self._name = name

    def click(self):
        self._element.click()
        started_at = time.monotonic()
        timeout_sec = 5
        while True:
            if self._is_active():
                break
            if time.monotonic() - started_at > timeout_sec:
                raise TimeoutError(f"{self._name} section is not visible after {timeout_sec} seconds")
            time.sleep(0.5)

    def get_text_first_card_header(self) -> str:
        return Element(self._driver, '//nx-single-entity//header').text()

    def has_table(self) -> bool:
        return len(self._driver.find_elements_by_xpath('//div[@id="nx-table"]')) > 0

    def has_card(self) -> bool:
        return len(self._driver.find_elements_by_xpath('//nx-single-entity')) > 0

    def _is_active(self) -> bool:
        return self.has_table() or self.has_card()


class _AlertsSummary(NamedTuple):
    servers_errors: int
    servers_warnings: int
    cameras_errors: int
    cameras_warnings: int
    storages_errors: int
    storages_warnings: int
    network_errors: int
    network_warnings: int


class _AlertsSection(_Section):

    def get_alerts_summary(self) -> _AlertsSummary:
        xpath_template = Template(
            '//div[contains(@class, "card-header") and contains(text(), "$card_name")]'
            '/following-sibling::div[contains(@class, "card-body")]',
        )
        card = Element(self._driver, xpath_template.substitute(card_name='Servers'))
        servers_errors = card.find_element('//nx-alert-counter/div/span', 1)
        servers_warnings = card.find_element('//nx-alert-counter/div/span', 2)
        card = Element(self._driver, xpath_template.substitute(card_name='Cameras'))
        cameras_errors = card.find_element('//nx-alert-counter/div/span', 1)
        cameras_warnings = card.find_element('//nx-alert-counter/div/span', 2)
        card = Element(self._driver, xpath_template.substitute(card_name='Storage Locations'))
        storages_errors = card.find_element('//nx-alert-counter/div/span', 1)
        storages_warnings = card.find_element('//nx-alert-counter/div/span', 2)
        card = Element(self._driver, xpath_template.substitute(card_name='Network Interfaces'))
        networks_errors = card.find_element('//nx-alert-counter/div/span', 1)
        networks_warnings = card.find_element('//nx-alert-counter/div/span', 2)
        return _AlertsSummary(
            int(servers_errors.text()),
            int(servers_warnings.text()),
            int(cameras_errors.text()),
            int(cameras_warnings.text()),
            int(storages_errors.text()),
            int(storages_warnings.text()),
            int(networks_errors.text()),
            int(networks_warnings.text()),
        )

    def get_alerts_summary_from_table(self) -> _AlertsSummary:
        errors = {'Server': 0, 'Camera': 0, 'Storage': 0, 'Interface': 0}
        warnings = errors.copy()
        while True:
            table = Table(self._driver, '//div[@id="nx-table"]//table')
            for row in table.get_data():
                type_ = row[1].get_property('title')
                element = row[0].find_element('/svg-icon')
                if 'error.svg' in element.get_attribute('data-src'):
                    errors[type_] += 1
                elif 'warning.svg' in element.get_attribute('data-src'):
                    warnings[type_] += 1
                else:
                    TimeoutError(f'Could not recognize alert {type_} with SVG {element.get_attribute("data-src")}')
            paginator_next = Element(self._driver, '//nx-paginator//a[@id="paginator-next"]')
            if 'disabled' in paginator_next.get_attribute('class'):
                break
            paginator_next.click()
            time.sleep(3)
        return _AlertsSummary(
            errors['Server'],
            warnings['Server'],
            errors['Camera'],
            warnings['Camera'],
            errors['Storage'],
            warnings['Storage'],
            errors['Interface'],
            warnings['Interface'],
        )

    def get_pages_count(self):
        paginator = Element(self._driver, '//nx-paginator//a[@id="paginator-tile-last"]')
        if paginator.in_dom:
            return int(paginator.text())
        return 1

    def _is_active(self) -> bool:
        is_offline = self._driver.find_elements_by_xpath(
            '//nx-system-health-component/g[@id="Cloud/Placeholders/Offline"]') > 0
        is_online = self._driver.find_elements_by_xpath(
            '//nx-system-health-component/g[@class="gridAlertsCards"]') > 0
        return is_online or is_offline

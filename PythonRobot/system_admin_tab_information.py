import time
from pathlib import Path
from string import Template
from typing import NamedTuple

from selenium.webdriver.remote.webdriver import WebDriver

from RobotVariables import RobotVariables
from generic_element import Element
from generic_element import ElementNotInDOM
from generic_element import ElementNotVisible
from wrappers import Link
from wrappers import PageText
from wrappers import Pane
from wrappers import TabItem
from wrappers import Table
from wrappers import TextField


class TabInformation:

    def __init__(self, driver: WebDriver, locator: str, variables: RobotVariables):
        self._driver = driver
        self._locator = locator
        self._element = TabItem(driver, locator)
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
        Link(self._driver, '//nx-menu//nx-level-1-item/a[@id="alerts"]').wait_until_visible()
        Link(self._driver, '//nx-menu//nx-level-1-item/a[@id="systems"]').wait_until_visible()
        Link(self._driver, '//nx-menu//nx-level-1-item/a[@id="servers"]').wait_until_visible()
        Link(self._driver, '//nx-menu//nx-level-1-item/a[@id="networkInterfaces"]').wait_until_visible()
        Link(self._driver, '//div[contains(@class,"menuLinks")]/nx-health-update').wait_until_visible()
        Link(self._driver, '//div[contains(@class,"menuLinks")]/div').wait_until_visible()

    def check_links_uploaded(self):
        Link(self._driver, '//nx-menu//nx-level-1-item/a[@id="alerts"]').wait_until_visible()
        Link(self._driver, '//nx-menu//nx-level-1-item/a[@id="systems"]').wait_until_visible()
        Link(self._driver, '//nx-menu//nx-level-1-item/a[@id="servers"]').wait_until_visible()
        Link(self._driver, '//nx-menu//nx-level-1-item/a[@id="networkInterfaces"]').wait_until_visible()
        Link(self._driver, '//div[contains(@class,"menuLinks")]/div').wait_until_visible()

    def is_current_system_inaccessible(self) -> bool:
        try:
            PageText(self._driver, f'//div[contains(text(),"{self._variables.SYSTEM_CANNOT_BE_ACCESSED_TEXT}")]')
        except (ElementNotVisible, ElementNotInDOM):
            return False
        else:
            return True

    def upload_json_report(self, filename: Path):
        element = TextField(self._driver, '//input[contains(@class,"ngx-file-drop__file-input")]')
        element.input_text(str(filename))
        started_at = time.monotonic()
        timeout_sec = 10
        while True:
            if self.is_imported_report():
                break
            if time.monotonic() - started_at > timeout_sec:
                raise TimeoutError(f"Report did not load after {timeout_sec} seconds")
            time.sleep(0.5)

    def is_imported_report(self) -> bool:
        try:
            PageText(
                self._driver,
                f'//nx-ribbon//div[@class="message"]//div[contains(text(),"{self._variables.VIEWING_IMPORTED_REPORT_TEXT}")]',
            )
        except (ElementNotVisible, ElementNotInDOM):
            return False
        else:
            return True

    def _is_system_online(self) -> bool:
        try:
            Link(self._driver, '//nx-menu//nx-level-1-item')
        except (ElementNotVisible, ElementNotInDOM):
            return False
        else:
            return True

    def no_alerts(self) -> bool:
        try:
            PageText(self._driver, f'//h2[contains(text(),"{self._variables.NO_ALERTS_TEXT}")]')
        except (ElementNotVisible, ElementNotInDOM):
            return False
        else:
            return True

    def system_is_doing_well(self) -> bool:
        try:
            PageText(self._driver, f'//div[contains(text(),"{self._variables.SYSTEM_DOING_WELL_TEXT}")]')
        except (ElementNotVisible, ElementNotInDOM):
            return False
        else:
            return True

    def get_alerts_count(self) -> int:
        table_header = PageText(self._driver, '//div[@id="nx-table"]/div[contains(@class,"table-header")]')
        (count, _) = table_header.get_text().strip().split()
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
        self._driver = driver
        self._element = TabItem(driver, locator)
        self._element.wait_until_visible(5)
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
        return PageText(self._driver, '//nx-single-entity//header').get_text()

    def has_table(self) -> bool:
        try:
            Link(self._driver, '//div[@id="nx-table"]')
        except (ElementNotVisible, ElementNotInDOM):
            return False
        else:
            return True

    def has_card(self) -> bool:
        try:
            Link(self._driver, '//nx-single-entity')
        except (ElementNotVisible, ElementNotInDOM):
            return False
        else:
            return True

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
        card = Pane(self._driver, xpath_template.substitute(card_name='Servers'))
        servers_errors = card.find_element('//nx-alert-counter/div/span', 1)
        servers_warnings = card.find_element('//nx-alert-counter/div/span', 2)
        card = Pane(self._driver, xpath_template.substitute(card_name='Cameras'))
        cameras_errors = card.find_element('//nx-alert-counter/div/span', 1)
        cameras_warnings = card.find_element('//nx-alert-counter/div/span', 2)
        card = Pane(self._driver, xpath_template.substitute(card_name='Storage Locations'))
        storages_errors = card.find_element('//nx-alert-counter/div/span', 1)
        storages_warnings = card.find_element('//nx-alert-counter/div/span', 2)
        card = Pane(self._driver, xpath_template.substitute(card_name='Network Interfaces'))
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
            paginator_next = PageText(self._driver, '//nx-paginator//a[@id="paginator-next"]')
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
        try:
            paginator = PageText(self._driver, '//nx-paginator//a[@id="paginator-tile-last"]')
        except (ElementNotVisible, ElementNotInDOM):
            return 1
        else:
            return int(paginator.get_text())

    def _is_active(self) -> bool:
        offline = online = True
        try:
            Link(self._driver, '//nx-system-health-component/g[@id="Cloud/Placeholders/Offline"]')
        except (ElementNotVisible, ElementNotInDOM):
            offline = False
        try:
            Link(self._driver, '//nx-system-health-component/g[@class="gridAlertsCards"]')
        except (ElementNotVisible, ElementNotInDOM):
            online = False
        return online or offline

import re
import time
from typing import NamedTuple
from typing import Sequence

from RobotVariables import RobotVariables
from browsers.chrome import ChromeBrowser
from generic_elements import Button
from generic_elements import Checkbox
from generic_elements import DropDown
from generic_elements import ElementNotVisible
from generic_elements import ListWrapper
from generic_elements import PageText
from generic_elements import Pane


class _SystemSelectDropdown(DropDown):

    def get_dropdown_button(self, server_name) -> Button:
        return Button(self._driver, f'//nx-select//button/span[contains(text(), {server_name!r})]/..')

    def select_server(self, name: str):
        server_in_list = Button(
            self._driver,
            f"//form[@name='checkMergeForm']//nx-select//li//span[contains(text(),{name!r})]",
            )
        server_in_list.click()


class MergeDialog:


    def __init__(self, driver: ChromeBrowser, lang="en_US"):
        self._driver = driver
        self._rb = RobotVariables(lang)

    def wait_until_not_visible(self):
        self.get_dialog_pane().wait_until_not_visible()

    def verify(self):
        header_text = PageText(
            self._driver, f'//nx-modal-merge-content//h1/span[contains(text(), {self._rb.MERGE_SYSTEMS_TEXT}!r)]')
        header_text.wait_until_visible()
        close_button = Button(self._driver, '//nx-modal-merge-content//button[contains(@class,"close")]')
        close_button.wait_until_clickable()
        self.get_next_button().wait_until_clickable()
        merge_is_possible = PageText(
            self._driver,
            f'//nx-modal-merge-content//p[contains(text(),{self._rb.MERGE_CURRENT_SYSTEM_WITH_TEXT!r})]',
            )
        merge_is_possible.wait_until_visible()

    def get_dialog_pane(self) -> Pane:
        return Pane(self._driver, "//nx-modal-merge-content")

    def get_next_button(self) -> Button:
        return Button(
            self._driver,
            f'//nx-modal-merge-content//button[contains(@class,"btn btn-primary") and contains(text(),{self._rb.NEXT_TEXT!r})]',
            )

    def primary_first_system(self):
        return Checkbox(self._driver, "//label[@for='firstSystem']")

    def primary_second_system(self):
        return Checkbox(self._driver, "//label[@for='secondSystem']")

    def merge_systems_button(self):
        xpath = "//button[text()='{MERGE_SYSTEMS_TEXT}']"
        translated_xpath = self._rb.replace_nested_variables(xpath)
        return Button(self._driver, translated_xpath)

    def get_back_button(self):
        xpath = "//button[contains(text(),'{BACK_TEXT}')]"
        translated_xpath = self._rb.replace_nested_variables(xpath)
        return Button(self._driver, translated_xpath)

    def get_system_offline_message(self, system_name) -> PageText:
        text = self._rb.CANNOT_MERGE_WITH_OFFLINE_SYSTEM_TEXT
        replaced_text = text.replace('%SYSTEM NAME%', system_name)
        xpath = f'//nx-modal-merge-content//p[text()={replaced_text!r}]'
        return PageText(self._driver, xpath)

    def ensure_system_online(self, system_name: str, timeout=10.0):
        started_at = time.monotonic()
        clicked_next_button = False
        while True:
            try:
                self.get_system_offline_message(system_name).wait_until_visible()
            except ElementNotVisible:
                break
            if time.monotonic() - started_at > timeout:
                raise RuntimeError(f"System {system_name} is not ready for merge in {timeout} seconds")
            self.get_next_button().click()
            clicked_next_button = True
            time.sleep(0.5)
        if not clicked_next_button:
            self.get_next_button().click()

    def get_close_button(self) -> Button:
        return Button(self._driver, "//button[contains(@class,'close')]")

    def get_system_select_dropdown(self) -> _SystemSelectDropdown:
        return _SystemSelectDropdown(self._driver, "//nx-select")

    def get_first_server_radio_select(self) -> Button:
        return Button(self._driver, '//nx-radio[@name="firstSystem"]')

    def get_second_server_radio_select(self) -> Button:
        return Button(self._driver, '//nx-radio[@name="secondSystem"]')

    def get_available_systems(self) -> Sequence['System']:
        systems_list = ListWrapper(
            self._driver,
            '//nx-modal-merge-content//form[@name="checkMergeForm"]//ul[@class="dropdown-menu--list"]',
            )
        systems = []
        for item in systems_list.get_items():
            name = item.get_child_own_text('/a/span')
            state = item.get_child_own_text('/a/span/span') or ''
            state = re.sub("[^a-z]", "", state)
            systems.append(System(name, state.strip('- ')))
        return systems

    def wait_until_system_is_accessible(self, system_name: str):
        item = PageText(
            self._driver,
            f'//nx-modal-merge-content//button[@id="mergeSystemSelect"]//span[contains(text(), {system_name!r})]',
            )
        item.wait_until_visible(30)

    def get_about_to_merge_text(self) -> PageText:
        return PageText(self._driver, "//form[@name='confirmMergeForm']/div/p")


class System(NamedTuple):
    name: str
    state: str

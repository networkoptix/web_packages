import re
import time
from typing import NamedTuple
from typing import Sequence

from RobotVariables import RobotVariables
from browsers.chrome import ChromeBrowser
from generic_elements import Button
from generic_elements import Checkbox
from generic_elements import ElementNotVisible
from generic_elements import ListWrapper
from generic_elements import PageText
from generic_elements import Pane


class MergeDialog:

    def __init__(self, driver: ChromeBrowser, lang="en_US"):
        self._driver = driver
        self._rb = RobotVariables(lang)

    def wait_until_not_visible(self):
        self.get_dialog_pane().wait_until_not_visible()

    def verify(self):
        header_text = PageText(
            self._driver, f'//nx-modal-merge-content//h1/span[contains(text(), "{self._rb.MERGE_SYSTEMS_TEXT}")]')
        header_text.wait_until_visible()
        close_button = Button(self._driver, '//nx-modal-merge-content//button[contains(@class,"close")]')
        close_button.wait_until_clickable()
        self.get_next_button().wait_until_clickable()
        merge_is_possible = PageText(
            self._driver,
            f'//nx-modal-merge-content//p[contains(text(),"{self._rb.MERGE_CURRENT_SYSTEM_WITH_TEXT}")]',
            )
        merge_is_possible.wait_until_visible()

    def get_dialog_pane(self) -> Pane:
        return Pane(self._driver, "//nx-modal-merge-content")

    def get_next_button(self) -> Button:
        return Button(
            self._driver,
            f'//nx-modal-merge-content//button[contains(@class,"btn btn-primary") and contains(text(),"{self._rb.NEXT_TEXT}")]',
            )

    def primary_first_system(self):
        return Checkbox(self._driver, "//label[@for='firstSystem']")

    def primary_second_system(self):
        return Checkbox(self._driver, "//label[@for='secondSystem']")

    def merge_systems_button(self):
        translated_xpath = self._rb.replace_nested_variables(
            "//button[text()='{MERGE_SYSTEMS_TEXT}']",
            )
        return Button(self._driver, translated_xpath)

    def ensure_system_online(self, system_name: str, timeout=10.0):
        error_message = f"System {system_name} is offline and cannot be merged with the current one"
        started_at = time.monotonic()
        clicked_next_button = False
        while True:
            try:
                (PageText(
                    self._driver,
                    f'//nx-modal-merge-content//p[text()="{error_message}"]',
                    )
                 .wait_until_visible()
                 )

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

    def get_system_select_button(self) -> Button:
        return Button(self._driver, '//nx-modal-merge-content//button[@id="mergeSystemSelect"]')

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
            f'//nx-modal-merge-content//button[@id="mergeSystemSelect"]//span[contains(text(), "{system_name}")]',
            )
        item.wait_until_visible(30)


class System(NamedTuple):
    name: str
    state: str

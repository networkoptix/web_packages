import re
from typing import NamedTuple
from typing import Sequence

from RobotVariables import RobotVariables
from browsers.chrome import ChromeBrowser
from generic_elements import Button
from generic_elements import ListWrapper
from generic_elements import PageText


class MergeDialog:
    def __init__(self, driver: ChromeBrowser, lang="en_US"):
        self._driver = driver
        self._rb = RobotVariables(lang)

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

    def get_next_button(self) -> Button:
        return Button(
            self._driver,
            f'//nx-modal-merge-content//button[contains(@class,"btn btn-primary") and contains(text(),"{self._rb.NEXT_TEXT}")]',
        )

    def get_system_select_button(self) -> Button:
        return Button(self._driver, '//nx-modal-merge-content//button[@id="mergeSystemSelect"]')

    def get_available_systems(self) -> Sequence['System']:
        systems_list = ListWrapper(
            self._driver,
            f'//nx-modal-merge-content//form[@name="checkMergeForm"]//ul[@class="dropdown-menu--list"]',
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

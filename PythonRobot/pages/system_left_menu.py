import logging
import time

from selenium.common.exceptions import NoSuchElementException
from selenium.webdriver.common.by import By

from RobotVariables import RobotVariables
from browsers.chrome import ChromeBrowser
from generic_elements import Button
from generic_elements import DropDown
from generic_elements import DropDownOption
from generic_elements import Image
from generic_elements import Link
from generic_elements import MenuNode
from generic_elements import Page
from generic_elements import PageText
from generic_elements import Pane
from generic_elements import TextField
from variables import ENV

_logger = logging.getLogger(__name__)


class SystemLeftMenu:

    def __init__(self, driver, lang="en_US"):
        self._locator = "//nx-menu"
        self.driver = driver
        self.rb = RobotVariables(lang)
        self._wait_until_page_loaded()
        # Todo: find way to pass id in
        # self._location_is_correct()

    def _users_button(self):
        translated_xpath = self.rb.replace_nested_variables(
            "//span[contains(text(), '{USERS}')]")
        return Button(self.driver, translated_xpath)

    def open_users_dropdown(self):
        self._users_button().click()
        dropdown = UsersDropdown(self.driver)
        dropdown.wait_for_open()
        return dropdown

    def _get_users_list(self):
        locator = "//nx-level-3-item//span[contains(@class, 'user')]/nx-search-highlight"
        Link(self.driver, locator).wait_until_visible()
        users = self.driver.find_elements(By.XPATH, locator)
        result = []
        for user in users:
            result.append(
                Button(
                    self.driver,
                    f"//nx-level-3-item//nx-search-highlight[contains(text(), '{user.text}')]",
                    ))
        return result

    def get_user_with_email(self, email: str):
        self._get_users_list()
        for user in self._get_users_list():
            if user.get_text() == email:
                return user
        raise _UserNotFoundError(email)

    def has_user_with_email(self, email: str):
        try:
            self.get_user_with_email(email)
        except _UserNotFoundError:
            return False
        return True

    def wait_for_user_with_email(self, email: str):
        started_at = time.monotonic()
        while True:
            try:
                return self.get_user_with_email(email)
            except _UserNotFoundError:
                _logger.info(f"Waiting for user with email {email} in users list")
            if time.monotonic() - started_at > 5:
                raise _UserNotFoundError(email)

    def servers_button(self):
        translated_xpath = self.rb.replace_nested_variables(
            "//span[contains(text(), '{SERVERS}')]")
        return Button(self.driver, translated_xpath)

    def servers_count(self):
        return len(self.driver.find_elements(
            By.XPATH, "//div[@id='level3servers']//nx-level-3-item"))

    def add_user_modal(self):
        return Pane(self.driver, "//form[@name='addUserForm']")

    def add_user_email_input(self):
        return TextField(
            self.driver, "//form[@name='addUserForm']//input[@id='addUserDialogEmail']")

    def add_user_modal_button(self):
        return Button(
            self.driver,
            "//form[@name='addUserForm']//nx-process-button[@data-testid='addUserBtn']")

    def add_user_permissions_dropdown(self):
        return DropDown(
            self.driver,
            "//form[@name='addUserForm']//nx-permissions-select[@id='permissionsSelect']//button")

    def permissions_dropdown_option(self, permissions):
        option = DropDownOption(
            self.driver,
            f"//form[@name='addUserForm']//nx-permissions-select//li//span[text()='{permissions}']")
        option.wait_until_visible()
        return DropDownOption(
            self.driver,
            f"//form[@name='addUserForm']//nx-permissions-select//"
            f"li//span[text()='{permissions}']/..")

    def permissions_dropdown_unavailable(self, permissions):
        option = DropDownOption(
            self.driver,
            f"//form[@name='addUserForm']//nx-permissions-select//li//span[text()='{permissions}']")
        option.wait_until_not_visible()

    def add_user_modal_close_button(self):
        return Button(
            self.driver, "//form[@name='addUserForm']//button[@data-testid='closeAddUser']")

    def add_user_modal_cancel_button(self):
        return Button(self.driver, "//nx-cancel-button[@data-testid='cancelAddUserBtn']/button")

    def add_user_permissions_hint(self):
        return PageText(
            self.driver, "//form[@name='addUserForm']//span[@data-testid='addUserHelpBlock']")

    def share_system_with_user(self, email, permissions):
        UsersDropdown(self.driver).add_user_button().click()
        self.add_user_email_input().input_text(email)
        self.add_user_permissions_dropdown().click()
        self.permissions_dropdown_option(permissions).click()
        self.add_user_modal_button().click()

    def add_user_modal_error(self, text):
        return PageText(self.driver, f"//span[contains(text(),'{text}')]")

    def _get_element(self):
        return Page(self.driver, self._locator)

    def _wait_until_page_loaded(self):
        self._get_element().wait_until_visible(40)

    def _location_is_correct(self):
        self.driver.location_should_be(f"{ENV}systems/")

    def get_search_field(self):
        return SearchField(self.driver, f"{self._locator}/nx-search//input")

    def get_node_by_name_within_timeout(self, name: str, timeout_sec=3):
        started_at = time.monotonic()
        while True:
            try:
                element = self._get_element()._element.find_element_by_partial_link_text(name)
                return MenuNode(self.driver, element)
            except AttributeError as e:
                if "'NoneType' object has no attribute 'find_element_by_link_text'" in str(e):
                    _logger.info(f"Node {name} not found yet")
            except NoSuchElementException:
                _logger.info(f"Node {name} not found yet")
            if time.monotonic() - started_at > timeout_sec:
                raise NoSuchElementException(f"Node {name} not found within {timeout_sec} seconds")

    def has_node_with_name(self, name):
        try:
            self.get_node_by_name_within_timeout(name, 0)
        except NoSuchElementException:
            return False
        return True

    def has_nothing_found_text(self):
        placeholder = PageText(
                self.driver,
                f"{self._locator}"
                f"/div[contains(@class,nx-menu)]/div[contains(@class,nx-menu-placeholder)]",
                )
        return placeholder.get_text() == 'Nothing found'

    def get_error(self) -> PageText:
        return PageText(
            self.driver,
            '//nx-modal-add-user-content//span[contains(@class, "input-error")]',
            )


class _UserNotFoundError(Exception):

    def __init__(self, node):
        self._node = node

    def __str__(self):
        return f"{self._node} node is not present in left menu"


class SearchField:

    def __init__(self, driver: ChromeBrowser, locator: str):
        self._locator = locator
        self.driver = driver

    def _get_field(self):
        return TextField(self.driver, self._locator)

    def wait_until_not_visible(self):
        self._get_field().wait_until_not_visible()

    def wait_until_visible(self):
        self._get_field().wait_until_visible()

    def input_text(self, text: str):
        self._get_field().input_text(text)

    def get_cross_button(self) -> Button:
        locator = (
            "/html/body/nx-app/div/div[2]/div/nx-system-settings-component/div/div/div[1]"
            "/nx-menu/nx-search/div/div/div/div/div/button")
        return Button(self.driver, locator)

    def wait_for_loupe_icon(self):
        locator = f"{self._locator}//following-sibling::span[contains(@class, web-icon-search)]"
        Image(self.driver, locator).wait_until_visible()

    def get_text(self) -> str:
        return self._get_field().get_text()

    def click(self):
        self._get_field().click()

    def is_focused(self) -> bool:
        return self._get_field().is_focused()

    def get_placeholder_text(self):
        return self._get_field().get_attribute('placeholder')


class UsersDropdown(DropDown):

    def __init__(self, driver):
        self._locator = '//nx-menu//div[@class=level-1-container]'
        super().__init__(driver, self._locator)

    def add_user_button(self):
        return Button(
            self._driver,
            self._locator + '//nx-menu-button[@data-testid="addUserBtn"]/button'
            )

    def wait_for_open(self, timeout=45):
        # Currently it takes 30+ seconds to load the dropdown
        self.add_user_button().wait_until_clickable(timeout=timeout)

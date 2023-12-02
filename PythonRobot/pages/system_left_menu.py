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
from generic_elements import MenuNode
from generic_elements import Page
from generic_elements import PageText
from generic_elements import Pane
from generic_elements import TextField
from nx_modal import NxModalDialog
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

    def users_dropdown(self):
        return UsersDropdown(self.driver)

    def servers_button(self):
        translated_xpath = self.rb.replace_nested_variables(
            "//span[contains(text(), '{SERVERS}')]")
        return Button(self.driver, translated_xpath)

    def servers_count(self):
        return len(self.driver.find_elements(
            By.XPATH, "//div[@id='level3servers']//nx-level-3-item"))

    def share_system_with_user(self, email, permissions):
        add_user_dialog = UsersDropdown(self.driver).open_add_user_dialog()
        add_user_dialog.email_input().input_text(email)
        permissions_dropdown = add_user_dialog.permissions_dropdown()
        permissions_dropdown.select_option_with_label(permissions)
        add_user_dialog.submit()

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
        self._locator = '//nx-menu//a[@id="users"]/..'
        super().__init__(driver, self._locator)

    def _add_user_button(self):
        return Button(
            self._driver,
            '//nx-menu-button[@data-testid="addUserBtn"]/button'
            )

    def _is_open(self):
        return self._add_user_button().is_visible()

    def _is_loaded(self):
        if not self._is_open():
            return False
        return self._add_user_button().is_enabled()

    def _wait_for_loaded(self, timeout=45):
        # Currently it takes 30+ seconds to load the dropdown
        self._add_user_button().wait_until_clickable(timeout=timeout)

    def open(self):
        if self._is_loaded():
            return
        self.click()
        self._wait_for_loaded()

    def open_add_user_dialog(self):
        self.open()
        self._add_user_button().click()
        dialog = AddUserModalDialog(self._driver)
        dialog.wait_until_visible()
        return dialog

    def _list_user_options(self):
        self.open()
        locator = (
            "//nx-level-3-item//span[contains(@class, 'user')]/nx-search-highlight")
        elements = self._driver.find_elements(By.XPATH, locator)
        return [
            _UserOption(self._driver, locator + f"[contains(text(), '{e.text}')]") for e in elements]

    def get_user_with_email(self, email: str):
        for user in self._list_user_options():
            if user.label() == email:
                return user
        raise _UserNotFoundError(email)

    def has_user_with_email(self, email: str):
        try:
            self.get_user_with_email(email)
        except _UserNotFoundError:
            return False
        return True

    def get_local_user_with_username(self, user_name: str) -> DropDownOption:
        for user in self._list_user_options():
            if user.label() == user_name:
                return user
        raise _UserNotFoundError(user_name)

    def has_local_user_with_username(self, user_name: str):
        try:
            self.get_local_user_with_username(user_name)
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


class _UserOption(DropDownOption):

    pass


class AddUserModalDialog(NxModalDialog):

    def __init__(self, driver):
        super().__init__(driver, '//form[@name="addUserForm"]')

    def _close_button(self):
        return Button(
            self._driver,
            self._locator + '//button[@data-testid="closeAddUser"]'
            )

    def _submit_button(self):
        return Button(
            self._driver,
            self._locator + '//nx-process-button[@data-testid="addUserBtn"]')

    def _error_message(self):
        return PageText(
            self._driver,
            self._locator + '//span[contains(@class, "input-error")]')

    def email_input(self):
        return TextField(
            self._driver,
            self._locator + "//input[@id='addUserDialogEmail']")

    def permissions_dropdown(self):
        return PermissionsDropDown(
            self._driver,
            self._locator + "//nx-permissions-select//button")

    def has_error(self):
        return self._error_message().is_visible()

    def has_error_with_text(self, text: str):
        error = self._error_message()
        return error.get_text() == text

    def hint_text(self) -> str:
        hint = PageText(
            self._driver,
            self._locator + "//span[@data-testid='addUserHelpBlock']")
        hint.wait_until_visible()
        return hint.get_text()


class PermissionsDropDown(DropDown):

    def __init__(self, driver, button_locator):
        super().__init__(driver, button_locator)
        # TODO: Rework base class to accept locator of a dropdown in __init__(), not button locator
        self._locator, _ = button_locator.split('//button')

    def _opened_options(self):
        return Pane(
            self._driver,
            self._locator + "/div[@class='dropdown permissions-show']")

    def _is_open(self):
        return self._opened_options().is_visible()

    def _open(self):
        if self._is_open():
            return
        self.click()
        self._opened_options().wait_until_visible()

    def _option_with_label(self, label: str):
        return DropDownOption(
            self._driver,
            self._locator + f"//span[text()='{label}']"
            )

    def has_option_with_label(self, label: str):
        self._open()
        option = self._option_with_label(label)
        return option.is_visible()

    def select_option_with_label(self, label: str):
        self._open()
        option = self._option_with_label(label)
        option.click()

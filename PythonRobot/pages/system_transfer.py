import logging

from selenium.webdriver.remote.webdriver import WebDriver

from generic_elements import Button
from generic_elements import DropDown
from generic_elements import DropDownOption
from generic_elements import ElementNotInDOM
from generic_elements import ElementNotVisible
from generic_elements import Page
from generic_elements import PageText
from generic_elements import TextField


class SystemOwnership:

    def __init__(self, driver: WebDriver, lang="en_US"):
        self._driver = driver
        self.locator = '//nx-system-admin-component//header'
        self._wait_until_visible()

    def accept_ownership_transfer(self):
        self.wait_until_accept_reject_transfer_visible()
        self._accept_ownership_transfer_button().click()
        self.wait_until_accept_reject_transfer_not_visible()

    def reject_ownership_transfer(self):
        self.wait_until_accept_reject_transfer_visible()
        self._reject_ownership_transfer_button().click()
        self.wait_until_accept_reject_transfer_not_visible()

    def wait_until_accept_reject_transfer_visible(self):
        self._accept_ownership_transfer_button().wait_until_visible()
        self._reject_ownership_transfer_button().wait_until_visible()

    def wait_until_accept_reject_transfer_not_visible(self):
        self._accept_ownership_transfer_button().wait_until_not_visible()
        self._reject_ownership_transfer_button().wait_until_not_visible()

    def check_cancel_ownership_transfer_available(self):
        self._cancel_transfer_ownership_button().wait_until_visible()

    def ensure_cancel_ownership_transfer_not_available(self):
        try:
            self._cancel_transfer_ownership_button().wait_until_visible(2)
        except (ElementNotVisible, ElementNotInDOM):
            _logger.debug("Cancel ownership button is not available. Continue")
        else:
            raise RuntimeError("Button 'cancel' [ownership transfer] should not be available")

    def cancel_ownership_transfer(self):
        button = self._cancel_transfer_ownership_button()
        button.click()
        button.wait_until_not_visible()

    def check_change_ownership_available(self):
        self._change_ownership_button().wait_until_visible()

    def ensure_change_ownership_not_available(self):
        try:
            self._change_ownership_button().wait_until_visible(2)
        except (ElementNotVisible, ElementNotInDOM):
            _logger.debug("Change ownership button is not available. Continue")
        else:
            raise RuntimeError("Button 'change' [ownership] should not be available")

    def open_ownership_transfer_dialog(self):
        self._change_ownership_button().click()
        return SystemTransferOwnershipModal(self._driver)

    def get_system_owner_text(self):
        return TextField(self._driver, f'{self.locator}//span[contains(@class,"system-owner")]').get_text()

    def get_system_owner_wants_to_transfer_text(self):
        return TextField(self._driver, f'{self.locator}//span//span[contains(text(),"wants to transfer")]').get_text()

    def _accept_ownership_transfer_button(self):
        return Button(self._driver, f'{self.locator}/div[2]/button[contains(@class,"btn-primary")]')

    def _reject_ownership_transfer_button(self):
        return Button(self._driver, f'{self.locator}/div[2]/button[contains(@class,"btn-default")]')

    def _change_ownership_button(self):
        return Button(self._driver, f'{self.locator}//a[@id="change-ownership"]')

    def _cancel_transfer_ownership_button(self):
        return Button(self._driver, f'{self.locator}//a[@id="cancel-transfers"]')

    def _wait_until_visible(self):
        Page(self._driver, self.locator)._element.wait_until_visible(25)


class SystemTransferOwnershipModal:

    def __init__(self, driver: WebDriver, lang="en_US"):
        self._driver = driver
        self.locator = '//form[@name="transferOwnershipForm"]'
        self._wait_until_visible()

    def do_transfer(self, to_email: str):
        self._get_user_selection_dropdown().click()
        self._get_user_in_dropdown(to_email).click()
        self._next_button().click()
        transfer_warning = self.get_transfer_warning_text()
        if transfer_warning != (
                'Once the ownership transfer is complete, you will be removed from the system.'
                ):
            raise RuntimeError(f"Expected warning text does not match: {transfer_warning!r}")
        self._transfer_button().click()
        message = self.get_request_sent_text()
        if message != "Request has been sent":
            raise RuntimeError(f"Request sent message does not match: {message!r}")
        self._ok_button().click()

    def get_no_users_text(self):
        return TextField(self._driver, f'{self.locator}//div[contains(@class,"no-users")]/div').get_text()

    def click_add_user(self):
        Button(self._driver, f'{self.locator}//div[contains(@class,"no-users")]/button').click()

    def close(self):
        Button(self._driver, f'{self.locator}//button[contains(@class,"close")]').click()
        self._wait_until_not_visible()

    def get_transfer_warning_text(self):
        return TextField(self._driver, f'{self.locator}//div[@class="warning-block"]/p').get_text()

    def get_request_sent_text(self):
        return TextField(self._driver, f'{self.locator}//p[@id="request-sent"]').get_text()

    def _next_button(self):
        return Button(self._driver, f'{self.locator}//div[@class="process-button"]/button[text()="Next"]')

    def _transfer_button(self):
        return Button(self._driver, f'{self.locator}//div[@class="process-button"]/button[text()="Transfer"]')

    def _ok_button(self):
        return Button(self._driver, f'{self.locator}//button[contains(@class,"btn-primary")]')

    def _get_user_selection_dropdown(self):
        return DropDown(self._driver, f'{self.locator}//nx-searchable-select//div[contains(@class,"dropdown")]//button')

    def _get_user_in_dropdown(self, email: str):
        return DropDownOption(
            self._driver,
            f'{self.locator}//div[contains(@class,dropdown-menu)]//nx-search-highlight[text()={email!r}]',
            )

    def _wait_until_visible(self):
        Page(self._driver, self.locator)._element.wait_until_visible()

    def _wait_until_not_visible(self):
        Page(self._driver, self.locator)._element.wait_until_not_visible()

    def get_email_field(self) -> TextField:
        return TextField(self._driver, f'{self.locator}//*[@id="search-input"]')

    def wait_for_user_not_found_error(self):
        error_label = PageText(
                self._driver,
                (f'{self.locator}//span[contains(@class,error-label) '
                 'and contains(text(),"User not found")]'),
                )
        error_label.wait_until_visible()


_logger = logging.getLogger(__name__)

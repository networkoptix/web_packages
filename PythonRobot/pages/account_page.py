from browsers.chrome import ChromeBrowser
from generic_elements import Button
from generic_elements import DropDown
from generic_elements import PageText
from generic_elements import TextField
from generic_elements import Tooltip


class AccountPage:

    def __init__(self, driver: ChromeBrowser):
        self._driver = driver

    def wait_until_loaded(self):
        self.email().wait_until_visible()
        self.first_name().wait_until_visible()
        self.last_name().wait_until_visible()
        self.language_dropdown().wait_until_visible()
        self.delete_account_button().wait_until_visible()
        self.save_button().wait_until_not_visible()
        self.cancel_button().wait_until_not_visible()

    def delete_account_button(self):
        return Button(
            self._driver,
            "//nx-account-settings-component//nx-block//button[@id=\"accountSettingsDeleteButton\"]",
            )

    def language_dropdown(self):
        return DropDown(
            self._driver,
            "//nx-language-select//button[@id='dropdownMenuButton']",
            )

    def last_name(self):
        return TextField(
            self._driver,
            "//form[@name='accountForm']//input[@id='lastName']",
            )

    def first_name(self):
        return TextField(
            self._driver,
            "//form[@name='accountForm']//input[@id='firstName']",
            )

    def email(self):
        return PageText(self._driver, "//a[@id='settings']")

    def save_button(self):
        return Button(
            self._driver,
            "//nx-process-button[@data-testid=\"saveSettingsBtn\"]//button",
            )

    def cancel_button(self):
        return Button(
            self._driver,
            "//nx-cancel-button[@data-testid=\"cancelSettingsBtn\"]//button",
            )

    def get_can_not_delete_account_tooltip(self):
        self.delete_account_button().hover()
        return Tooltip(
            self._driver,
            "//nx-tooltip-component/div[contains(@class,\"tooltip-body\")]",
            )

from browsers.chrome import ChromeBrowser
from generic_elements import Button
from generic_elements import DropDown
from generic_elements import PageText
from generic_elements import TextField
from generic_elements import ToastNotification
from generic_elements import Tooltip
from nx_modal import NxModalDialog


class AccountPage:

    def __init__(self, driver: ChromeBrowser):
        self._driver = driver

    def wait_until_loaded(self):
        self.email().wait_until_visible(timeout=15)
        self.first_name().wait_until_visible()
        self.last_name().wait_until_visible()
        self.get_language_dropdown().get_dropdown_button().wait_until_visible()
        self.delete_account_button().wait_until_visible()
        self.save_button().wait_until_not_visible()
        self.cancel_button().wait_until_not_visible()

    def delete_account_button(self):
        return Button(
            self._driver,
            "//nx-account-settings-component//nx-block//button[@id=\"accountSettingsDeleteButton\"]",
            )

    def get_language_dropdown(self):
        return _LanguageDropdown(self._driver)

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

    def delete_account_dialog(self):
        self.delete_account_button().click()
        dialog = DeleteCloudAccountDialog(self._driver)
        return dialog


class DeleteCloudAccountDialog(NxModalDialog):

    def __init__(self, driver: ChromeBrowser):
        super().__init__(driver=driver, locator='//nx-modal-delete-cloud-user-content')

    def _password_input(self):
        return TextField(
            self._driver,
            self._locator + '//form[@name="deleteCloudUserForm"]//input[@id="password"]',
            )

    def _header(self):
        return PageText(
            self._driver,
            self._locator + '//h1[@class="modal-title"]'
            )

    def wait_until_loaded(self):
        self._submit_button().wait_until_visible()
        self._close_button().wait_until_visible()
        self._cancel_button().wait_until_visible()
        self._password_input().wait_until_visible()
        self._header().wait_until_visible()

    def delete_account(self, password: str):
        self._password_input().input_text(password)
        self.submit()


class SuccessToast(ToastNotification):

    def __init__(self, driver):
        super().__init__(driver, '//nx-app-toasts//div[@class="alert alert-success toast"]')


class _LanguageDropdown(DropDown):

    def __init__(self, driver: ChromeBrowser):
        super().__init__(driver=driver, locator='//nx-language-select')

    def get_dropdown_button(self):
        return self.find_element("//button[@id='dropdownMenuButton']")

    def set_language(self, language_code: str):
        self.get_dropdown_button().click()
        self.find_element(f"//span[@lang='{language_code}']/..").click()

    def get_active_language(self) -> str:
        return self.find_element("//span[@id='activeLang']").text()

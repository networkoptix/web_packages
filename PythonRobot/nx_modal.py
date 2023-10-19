from selenium.webdriver.remote.webdriver import WebDriver

from PythonRobot.generic_elements import Button
from PythonRobot.generic_elements import ModalWindow
from PythonRobot.generic_elements import PageText


class NxModalWindow(ModalWindow):

    def __init__(self, driver: WebDriver, locator: str):
        super().__init__(driver, locator)

    def _close_button(self):
        return Button(
            self._driver,
            self._locator + '//button[@data-dismiss="modal"]'
            )

    def _header(self):
        return PageText(self._driver, "//div[@class='modal-header']")

    def _body(self):
        return PageText(self._driver, "//div[@class='modal-body ng-star-inserted']")

    def close(self) -> None:
        close_button = self._close_button()
        close_button.click()
        self.wait_until_not_visible()

    def get_header_text(self) -> str:
        return self._header().get_text()

    def get_body_text(self) -> str:
        return self._body().get_text()


class SettingsSavedModalWindow(NxModalWindow):

    def __init__(self, driver: WebDriver):
        super().__init__(driver, '//nx-modal-generic-content')


class NxModalDialog(NxModalWindow):

    def _cancel_button(self):
        return Button(
            self._driver,
            self._locator + '//nx-cancel-button'
            )

    def _submit_button(self):
        return Button(
            self._driver,
            self._locator + '//nx-process-button'
            )

    def cancel(self):
        cancel_button = self._cancel_button()
        cancel_button.click()
        self.wait_until_not_visible()

    def submit(self):
        submit_button = self._submit_button()
        submit_button.click()

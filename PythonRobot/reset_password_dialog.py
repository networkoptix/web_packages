from selenium.webdriver.common.keys import Keys

from wrappers import Page
from wrappers import PageText
from wrappers import TextField


class ResetPasswordDialog:

    def __init__(self, driver):
        self._driver = driver
        Page(self._driver, "//nx-authorize-reset-request-component").wait_until_exists(40)

    def input_email(self, email: str):
        text_field = TextField(
            self._driver,
            '//nx-authorize-reset-request-component//input[@id="resetPasswordEmail"]',
            )
        text_field.clear()
        text_field.send_keys(email)

    def clear_email(self):
        text_filed = TextField(
            self._driver,
            '//nx-authorize-reset-request-component//input[@id="resetPasswordEmail"]',
            )
        text_filed.clear()
        # clear() does not trigger error message. To trigger empty email error send_keys()
        # must be used.
        text_filed.send_keys('a')
        text_filed.send_keys(Keys.BACKSPACE)

    def clear_email_validation_error_message(self):
        self.input_email('proper.email@gmail.com')
        self.wait_until_no_error()

    def set_email_validation_error_message(self):
        self.input_email('error_email')
        self.wait_until_error()

    def wait_until_error(self) -> str:
        actual_error = self._get_error_message()
        actual_error .wait_until_visible(3)
        return actual_error .get_text().strip()

    def wait_until_no_error(self):
        self._get_error_message().wait_until_not_visible(3)

    def _get_error_message(self) -> PageText:
        return PageText(
            self._driver,
            '//nx-authorize-reset-request-component//p[contains(@class, "error-label")]',
            )

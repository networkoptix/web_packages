import time
from typing import Optional

from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.common.exceptions import NoSuchElementException

import robot_keywords


class ResetPasswordDialog:

    def __init__(self, driver):
        self._driver = driver
        robot_keywords.wait_until_page_contains_element(
            driver, "//nx-authorize-reset-request-component")

    def input_email(self, email: str):
        element = self._driver.find_element(
            By.XPATH, '//nx-authorize-reset-request-component//input[@id="resetPasswordEmail"]')
        element.clear()
        element.send_keys(email)

    def clear_email(self):
        element = self._driver.find_element(
            By.XPATH, '//nx-authorize-reset-request-component//input[@id="resetPasswordEmail"]')
        element.clear()
        # clear() does not trigger error message. To trigger empty email error send_keys()
        # must be used.
        element.send_keys('a')
        element.send_keys(Keys.BACKSPACE)

    def clear_email_validation_error_message(self):
        self.input_email('proper.email@gmail.com')
        self.wait_until_no_error()

    def set_email_validation_error_message(self):
        self.input_email('error_email')
        self.wait_until_error()

    def wait_until_error(self) -> str:
        started_at = time.monotonic()
        while True:
            actual_error = self._get_error_message()
            if actual_error is not None:
                break
            if time.monotonic() - started_at > 3:
                raise RuntimeError("Failed to get email validation error message")
            time.sleep(0.1)
        return actual_error

    def wait_until_no_error(self):
        started_at = time.monotonic()
        while True:
            actual_error = self._get_error_message()
            if actual_error is None:
                break
            if time.monotonic() - started_at > 3:
                raise RuntimeError(f"Email validation error message present: {actual_error!r}")
            time.sleep(0.1)

    def _get_error_message(self) -> Optional[str]:
        try:
            element = self._driver.find_element(
                By.XPATH,
                '//nx-authorize-reset-request-component//p[contains(@class, "error-label")]')
        except NoSuchElementException:
            return None
        return element.text.strip()

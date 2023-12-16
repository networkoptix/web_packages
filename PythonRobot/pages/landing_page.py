import logging
import time

from RobotVariables import RobotVariables
from generic_elements import Button
from generic_elements import PageText


class LandingPage:

    def __init__(self, driver, lang="en_US"):
        self.driver = driver
        self.rb = RobotVariables(lang)

    def create_account_button(self):
        translated_xpath = self.rb.replace_nested_variables("//a[contains(text(), '{CREATE ACCOUNT BUTTON TEXT}')]")
        return Button(self.driver, translated_xpath)

    def _session_expired_dismiss(self):
        """Deals with intermittent session expired modal after logging out."""
        try:
            PageText(self.driver, "//span[contains(text(), 'Your session has expired')]").wait_until_visible()
        except Exception:
            pass
        else:
            Button(self.driver, "//button[contains(text(),'OK')]").click()

    def get_label(self):
        return PageText(
            self.driver,
            "//body[contains(@class,'anonymous')]//h1[@data-testid='welcomeCaption']",
            )

    def wait_until_loaded(self):
        self._session_expired_dismiss()
        self.get_label().wait_until_visible()

    def location_is_correct(self, url: str, timeout=10):
        start_time = time.monotonic()
        while True:
            try:
                self.driver.location_should_be(url)
                return
            except RuntimeError as e:
                if f'Expected url {url}' in str(e):
                    _logger.info("Waiting for correct location")
                else:
                    raise
            if time.monotonic() - start_time > timeout:
                raise RuntimeError(f"Wrong location. Expected {url}, got {self.driver.current_url}")


_logger = logging.getLogger(__name__)

import logging
import time

from RobotVariables import RobotVariables
from generic_elements import Button
from generic_elements import PageText
from variables import ENV


class LandingPage:

    def __init__(self, driver, lang="en_US", ):
        self.driver = driver
        self.rb = RobotVariables(lang)

    def create_account_button(self):
        translated_xpath = self.rb.replace_nested_variables("//a[contains(text(), '{CREATE ACCOUNT BUTTON TEXT}')]")
        return Button(self.driver, translated_xpath)
    
    def _session_expired_dismiss(self):
        """
        Deals with intermittent session expired modal after logging out.
        """
        try:
            PageText(self.driver, "//span[contains(text(), 'Your session has expired')]").wait_until_visible()
        except:
            pass
        else:
            Button(self.driver, "//button[contains(text(),'OK')]").click()

    def wait_until_loaded(self):
        self._session_expired_dismiss()
        self._location_is_correct()
        header = PageText(
            self.driver,
            "//body[contains(@class,'anonymous')]//h1[@data-testid='welcomeCaption']",
            )
        header.wait_until_visible()

    def _location_is_correct(self, timeout=10):
        start_time = time.monotonic()
        while True:
            try:
                self.driver.location_should_be(f"{ENV}/")
                return
            except RuntimeError as e:
                if f'Expected url {ENV}' in str(e):
                    _logger.info("Waiting for correct location")
                else:
                    raise
            if time.monotonic() - start_time > timeout:
                raise RuntimeError(f"Wrong location. Expected {ENV}, got {self.driver.current_url}")


class MetaLandingPage(LandingPage):

    def get_label(self):
        return PageText(
            self.driver,
            "//body[contains(@class,'anonymous')]//h1[@data-testid='welcomeCaption']",
            )

    def wait_until_loaded(self):
        self.get_label().wait_until_visible()

    def _location_is_correct(self, timeout=10):
        location = "https://metavms.cloud-test.hdw.mx/"
        start_time = time.monotonic()
        while True:
            current_location = self.driver.current_url
            if time.monotonic() - start_time > timeout:
                raise RuntimeError(
                    f"Wrong location. Expected {location}, got {current_location}")
            try:
                self.driver.location_should_be(f"{location}")
                return
            except RuntimeError as e:
                if f'Expected url {location}' in str(e):
                    _logger.info(
                        "Waiting for location %s. Current location is %s",
                        location,
                        current_location,
                        )


_logger = logging.getLogger(__name__)

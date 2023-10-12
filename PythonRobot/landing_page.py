import time

from RobotVariables import RobotVariables
from generic_elements import Button
from generic_elements import Pane
from variables import ENV


class LandingPage:

    def __init__(self, driver, lang="en_US", ):
        self.driver = driver
        self.rb = RobotVariables(lang)
        self._wait_until_landing_page_is_visible()
        self._location_is_correct()

    def create_account_button(self):
        translated_xpath = self.rb.replace_nested_variables("//a[contains(text(), '{CREATE ACCOUNT BUTTON TEXT}')]")
        return Button(self.driver, translated_xpath)

    def _wait_until_landing_page_is_visible(self):
        landing_page = Pane(
            self.driver,
            "//body[contains(@class,'anonymous')]//h1[@data-testid='welcomeCaption']",
            )
        landing_page.wait_until_visible()

    def _location_is_correct(self, timeout=10):
        start_time = time.monotonic()
        while start_time + timeout < time.monotonic():
            try:
                self.driver.location_should_be(f"{ENV}")
                break
            except:
                pass

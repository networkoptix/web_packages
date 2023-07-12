import robot_keywords
from button import Button
from RobotVariables import RobotVariables
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
        robot_keywords.wait_until_element_is_visible(self.driver,
                                                     "//body[contains(@class,'anonymous')]//h1[@data-testid='welcomeCaption']")

    def _location_is_correct(self):
        robot_keywords.location_should_be(self.driver, f"{ENV}")
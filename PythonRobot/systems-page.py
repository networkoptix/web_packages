import robot_keywords
from page_text import PageText
from text_field import TextField
from button import Button
from RobotVariables import RobotVariables
from variables import ENV


class SystemsPage:
    def __init__(self, driver, lang="en_US"):
        self.driver = driver
        self.rb = RobotVariables(lang)
        self._wait_until_page_is_visible()
        self._location_is_correct()

    def my_systems_button(self):
        # Todo: add "My Systems" to the translation files
        return Button(self.driver, "//div[contains(text(), 'My Systems')]")

    def _wait_until_page_is_visible(self):
        pass

    def _location_is_correct(self)
        pass
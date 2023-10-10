import robot_keywords
from RobotVariables import RobotVariables
from variables import ENV
from wrappers import Button
from wrappers import DropDown
from wrappers import Page
from wrappers import PageText


class SystemUsers:
    def __init__(self, driver, lang="en_US"):
        self.driver = driver
        self.rb = RobotVariables(lang)
        self._wait_until_page_loaded()
        # Todo: find way to pass id in
        # self._location_is_correct()

    def remove_user_button(self):
        translated_xpath = self.rb.replace_nested_variables("//button[contains(text(),'{REMOVE_USER_BUTTON_TEXT}')]")
        return Button(self.driver, translated_xpath)

    def remove_user_modal_button(self):
        translated_xpath = self.rb.replace_nested_variables(
            "//nx-modal-remove-user-content//button[contains(text(),'{REMOVE_BUTTON_TEXT}')]")
        return Button(self.driver, translated_xpath)
    
    def user_header_text(self):
        return PageText(self.driver, "//nx-system-settings-component//nx-block/..//header//h2")
    
    def access_level_dropdown(self):
        return DropDown(self.driver, "//nx-system-settings-component//nx-block/..//nx-section//button[@id='componentId']")
    
    def _wait_until_page_loaded(self):
        Page(self.driver, "//nx-system-user-component").wait_until_exists(40)

    def _location_is_correct(self):
        robot_keywords.location_should_be(self.driver, f"{ENV}systems/")
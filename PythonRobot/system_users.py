import robot_keywords
from generic_element import Element
from page_text import PageText
from text_field import TextField
from toast_notification import ToastNotification
from button import Button
from RobotVariables import RobotVariables
from variables import ENV

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

    def _wait_until_page_loaded(self):
        robot_keywords.wait_until_page_contains_element(self.driver, "//nx-system-user-component")

    def _location_is_correct(self):
        robot_keywords.location_should_be(self.driver, f"{ENV}systems/")
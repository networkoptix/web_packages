import robot_keywords
from generic_element import Element
from page_text import PageText
from text_field import TextField
from toast_notification import ToastNotification
from button import Button
from RobotVariables import RobotVariables
from variables import ENV

class SystemAdmin:
    def __init__(self, driver, lang="en_US"):
        self.driver = driver
        self.rb = RobotVariables(lang)
        self._wait_until_page_loaded()
        # Todo: find way to pass id in
        #self._location_is_correct()

    def disconnect_button(self):
        translated_xpath = self.rb.replace_nested_variables("//button[contains(text(),'{DISCONNECT_BUTTON_TEXT}')]")
        return Button(self.driver, translated_xpath)

    def disconnect_modal_disconnect_button(self):
        translated_xpath = self.rb.replace_nested_variables(
            "//nx-modal-disconnect-content//button[contains(text(), '{DISCONNECT_BUTTON_TEXT}')]")
        print(translated_xpath)
        return Button(self.driver, translated_xpath)

    def disconnect_toast_notification(self):
        disconnect_message = self.rb.__getattr__('SUCCESSFULLY_DISCONNECTED')
        return ToastNotification(self.driver, disconnect_message)

    def _wait_until_page_loaded(self):
        robot_keywords.wait_until_page_contains_element(self.driver, "//nx-system-settings-component")

    def _location_is_correct(self):
        robot_keywords.location_should_be(self.driver, f"{ENV}systems/")
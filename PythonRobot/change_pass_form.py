import robot_keywords
from PythonRobot.generic_element import Element
from RobotVariables import RobotVariables
from button import Button
from page_text import PageText
from text_field import TextField
from variables import ENV


class ChangePassForm:
    def __init__(self, driver, lang="en_US"):
        self.driver = driver
        self.rb = RobotVariables(lang)
        self._wait_until_form_is_visible()
        self._location_is_correct()

    def current_password_input(self) -> TextField:
        return TextField(self.driver, "//input[@id='password']")

    def new_password_input(self) -> TextField:
        return TextField(self.driver, "//nx-password-input[@componentid='newPassword']//input")

    def save_button(self) -> Button:
        translated_xpath = self.rb.replace_nested_variables("//button[contains(text(), '{SAVE_BUTTON_TEXT}')]")
        return Button(self.driver, translated_xpath)

    def cancel_button(self) -> Button:
        translated_xpath = self.rb.replace_nested_variables("//button[contains(text(), '{CANCEL_BUTTON_TEXT}')]")
        return Button(self.driver, translated_xpath)

    def no_unsaved_changes_message(self) -> PageText:
        translated_xpath = self.rb.replace_nested_variables(
            "//nx-apply//div[contains(text(), '{NO_UNSAVED_CHANGES_TEXT}')]")
        return PageText(self.driver, translated_xpath)

    def current_password_eye_icon_open(self) -> Button:
        return Button(self.driver, "//svg-icon[contains(@data-src,'/images/icons/text_buttons/eye.svg')]")

    def current_password_eye_icon_closed(self) -> Button:
        return Button(self.driver, "//svg-icon[contains(@data-src,'/images/icons/text_buttons/eye_closed.svg')]")


    def verify_form_is_visible(self):
        self.new_password_input()
        self.current_password_input()

    def change_password(self, old_password, new_password):
        current_password_input = self.current_password_input()
        current_password_input.input_text(old_password)
        new_password_input = self.new_password_input()
        new_password_input.input_text(new_password)
        save_button = self.save_button()
        save_button.click()

    def _wait_until_form_is_visible(self):
        element = Element(self.driver, "//nx-account-password-component")
        element.wait_until_visible(timeout=10)

    def _location_is_correct(self):
        robot_keywords.location_should_be(self.driver, f"{ENV}/account/password")

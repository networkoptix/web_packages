import robot_keywords
from text_field import TextField
from button import Button
from RobotVariables import RobotVariables
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
        robot_keywords.wait_until_element_is_visible(self.driver, "//nx-account-password-component")

    def _location_is_correct(self):
        robot_keywords.location_should_be(self.driver, f"{ENV}account/password")

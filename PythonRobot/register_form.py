import robot_keywords
from input import Input
from button import Button
from RobotVariables import RobotVariables


class RegisterForm:
    def __init__(self, driver, lang="en_US"):
        self.driver = driver
        self.rb = RobotVariables(lang)
        self._wait_until_form_is_visible()
        self._location_is_correct()
    
    def first_name_input(self):
        return Input(self.driver, "//form//input[@id='firstName']")

    def last_name_input(self):
        return Input(self.driver, "//form//input[@id='lastName']")

    def password_input(self):
        return Input(self.driver, "//form//nx-password-input//input[@id='createAccountPassword']")

    def create_account_button(self):
        return Button(self.driver, f"//button[contains(text(),'{self.rb.CREATE_ACCOUNT_BUTTON_TEXT}')]")

    def _wait_until_form_is_visible(self):
        robot_keywords.wait_until_element_is_visible(self.driver, "//nx-authorize-create-account-component")
        self.first_name_input()
        self.last_name_input()
        self.password_input()
        self.create_account_button()
        # Todo: 
        # robot_keywords.title_should_be(self.driver, self.rb.replace_nested_variables(self.rb.REGISTER_TITLE_TEXT))

    def _location_is_correct(self):
        robot_keywords.location_should_be(self.driver, f"{self.rb.ENV}authorize?client_type=create")
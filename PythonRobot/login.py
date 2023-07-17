import robot_keywords
from text_field import TextField
from button import Button
from RobotVariables import RobotVariables


class LoginDialog:
    def __init__(self, driver, lang="en_US"):
        self.driver = driver
        self.rb = RobotVariables(lang)
        self._wait_until_modal_is_visible()

    def email_input(self) -> TextField:
        return TextField(self.driver, "//nx-authorize-component//input[@id='authorizeEmail']")

    def password_input(self) -> TextField:
        return TextField(self.driver, "//nx-authorize-component//input[@id='authorizePassword']")
    
    def password_input_error_message(self) -> TextField:
        translated_xpath = self.rb.replace_nested_variables(
            "//nx-authorize-component//p[contains(text(),'{WRONG_PASSWORD}')]")
        print(translated_xpath)
        return TextField(self.driver, translated_xpath)

    def next_button(self):
        return Button(self.driver, "//nx-authorize-component//nx-process-button[@data-testid='btnLogin']")

    def login_button(self):
        return Button(self.driver, "//nx-authorize-component//nx-process-button[@data-testid='btnLogin']")

    def basic_cloud_login(self, email, password):
        email_field = self.email_input()
        email_field.input_text(email)
        next_button = self.next_button()
        next_button.click()
        password_input = self.password_input()
        password_input.input_text(password)
        login_button = self.login_button()
        login_button.click()

    def _wait_until_modal_is_visible(self):
        robot_keywords.wait_until_element_is_visible(self.driver,
                                                     "//nx-authorize-component/div[@class='authorize-main main-w']")

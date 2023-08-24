import robot_keywords
from text_field import TextField
from button import Button
from RobotVariables import RobotVariables


class LoginDialog:
    def __init__(self, driver, lang="en_US", twofa=""):
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
        return TextField(self.driver, translated_xpath)

    def next_button(self):
        translated_xpath = self.rb.replace_nested_variables("//button[contains(text(), '{NEXT_TEXT}')]")
        return Button(self.driver, translated_xpath)

    def login_button(self):
        return Button(self.driver, "//nx-authorize-component//nx-process-button[@data-testid='btnLogin']")
    
    def twofa_auth_code_input(self):
        return TextField(self.driver, "//nx-authorize-component//nx-authorize-auth-code-component//input[@id='authCode']")

    def twofa_login_button(self):
        return Button(self.driver, f"//nx-authorize-component//nx-process-button//button[contains(text(),'Log In')]")

    def forgot_password_button(self):
        translated_xpath = self.rb.replace_nested_variables("//button//span[contains(text(),'{FORGOT_PASSWORD_TEXT}')]")
        return Button(self.driver, translated_xpath)

    def reset_password_email_input(self):
        return TextField(self.driver, "//input[@id='resetPasswordEmail']")

    def reset_password_button(self):
        translated_xpath = self.rb.replace_nested_variables("//button[contains(text(), '{RESET_PASSWORD_BUTTON_TEXT}')]")
        return Button(self.driver, translated_xpath)

    def basic_cloud_login(self, email, password):
        email_field = self.email_input()
        email_field.input_text(email)
        next_button = self.next_button()
        next_button.click()
        password_input = self.password_input()
        password_input.input_text(password)
        login_button = self.login_button()
        login_button.click()

    def twofa_cloud_login(self, email, password, twofa):
        email_field = self.email_input()
        email_field.input_text(email)
        next_button = self.next_button()
        next_button.click()
        password_input = self.password_input()
        password_input.input_text(password)
        login_button = self.login_button()
        login_button.click()
        twofa_field = self.twofa_auth_code_input()
        twofa_field.input_text(twofa)
        twofa_login = self.twofa_login_button()
        twofa_login.click()

    def _wait_until_modal_is_visible(self):
        robot_keywords.wait_until_element_is_visible(self.driver,
                                                     "//nx-authorize-component/div[@class='authorize-main main-w']")

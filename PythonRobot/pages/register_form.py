from RobotVariables import RobotVariables
from generic_elements import Button
from generic_elements import Checkbox
from generic_elements import PageText
from generic_elements import Pane
from generic_elements import TextField


class RegisterForm:

    def __init__(self, driver, lang="en_US"):
        self.driver = driver
        self.locator = "//nx-authorize-create-account-component"
        self.rb = RobotVariables(lang)
        self.required_text = f"/following-sibling::p[contains(@class,error-label) and contains(text(),'{self.rb.REQUIRED_TEXT}')]"
        self._wait_until_form_is_visible()

    def email_input(self):
        return TextField(self.driver, "//form//nx-email-input/input[@id='email']")

    def email_input_locked(self):
        return TextField(self.driver, "//input[@name='registerEmailLocked']")

    def first_name_input(self):
        return TextField(self.driver, "//form//input[@id='firstName']")

    def last_name_input(self):
        return TextField(self.driver, "//form//input[@id='lastName']")

    def password_input(self):
        return TextField(self.driver, "//form//nx-password-input//input[@id='createAccountPassword']")

    def create_account_button(self):
        return Button(self.driver, f"//button[contains(text(),'{self.rb.CREATE_ACCOUNT_BUTTON_TEXT}')]")

    def terms_and_conditions_checkbox(self):
        return Checkbox(self.driver, "//nx-checkbox[@name='termsAndConditions']")

    def terms_and_conditions_link(self):
        return Button(self.driver, "//a[@href='/content/eula']")

    def privacy_policy_link(self):
        return Button(self.driver, "//a[@href='https://www.networkoptix.com/privacy-policy/']")

    def account_creation_success(self):
        return PageText(self.driver, "//nx-authorize-activate-account-component")

    def first_name_is_required_error(self):
        return PageText(self.driver, "//p[@id='firstNameRequiredError']")

    def last_name_is_required_error(self):
        return PageText(self.driver, "//p[@id='lastNameRequiredError']")

    def email_is_required_error(self):
        return PageText(self.driver, "//p[@data-testid='emailRequiredError']")

    def password_is_required_error(self):
        return PageText(self.driver, "//div[@id='passwordRequiredError']")

    def email_is_invalid_error(self):
        return PageText(self.driver, f"//p[contains(@class,error-label) and contains(text(),'{self.rb.EMAIL_INVALID_TEXT}')]")

    def password_special_chars_error(self):
        return PageText(self.driver, f"//div[contains(@class,input-error) and contains(text(),'{self.rb.PASSWORD_SPECIAL_CHARS_TEXT}')]")

    def account_already_exists_error(self):
        return PageText(self.driver, f"//p[contains(@class,'error-label') and contains(text(),'{self.rb.ACCOUNT_ALREADY_EXISTS}')]")

    def password_is_weak_error(self):
        return PageText(self.driver, f"//div[contains(@class,input-error) and contains(text(),'{self.rb.PASSWORD_IS_WEAK_TEXT}')]")

    def password_eye_open(self):
        return Button(self.driver, "//svg-icon[contains(@data-src,'/images/icons/text_buttons/eye.svg')]/parent::span")

    def password_eye_closed(self):
        return Button(self.driver, "//svg-icon[contains(@data-src,'/images/icons/text_buttons/eye_closed.svg')]/parent::span")

    def login_button(self):
        return Button(self.driver, "//span[@data-testid='createAccountLogIn']/parent::button")

    def _wait_until_form_is_visible(self):
        Pane(self.driver, "//nx-authorize-create-account-component").wait_until_visible()
        self.first_name_input()
        self.last_name_input()
        self.password_input()
        self.create_account_button()

    def register_new_user(self, first_name, last_name, email, password):
        self.first_name_input().input_text(first_name)
        self.last_name_input().input_text(last_name)
        self.email_input().input_text(email)
        self.password_input().input_text(password)
        self.terms_and_conditions_checkbox().select()
        self.create_account_button().click()

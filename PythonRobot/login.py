from RobotVariables import RobotVariables
from generic_elements import Button
from generic_elements import PageText
from generic_elements import Pane
from generic_elements import TextField


class LoginDialog:
    def __init__(self, driver, lang="en_US", twofa=""):
        self.driver = driver
        self.rb = RobotVariables(lang)
        self._wait_until_modal_is_visible()

    def email_input(self) -> TextField:
        return TextField(self.driver, "//nx-authorize-component//input[@id='authorizeEmail']")

    def password_input(self) -> TextField:
        return TextField(self.driver, "//nx-authorize-component//input[@id='authorizePassword']")

    def new_password_input(self) -> TextField:
        return TextField(self.driver, '//nx-authorize-component//input[@id="resetPassword"]')

    def password_reset_next_button(self) -> Button:
        return Button(self.driver, '//nx-authorize-component//nx-process-button[@data-testid="btnResetPassword"]')

    def reset_success_text(self) -> PageText:
        return PageText(self.driver, '//nx-authorize-component//h3[@data-testid="resetSuccess"]').get_text()

    def password_input_error_message(self) -> TextField:
        translated_xpath = self.rb.replace_nested_variables(
            "//nx-authorize-component//p[contains(text(),'{WRONG_PASSWORD}')]")
        return TextField(self.driver, translated_xpath)

    def next_button(self):
        translated_xpath = self.rb.replace_nested_variables("//button[contains(text(), '{NEXT_TEXT}')]")
        return Button(self.driver, translated_xpath)

    def login_button(self):
        return Button(self.driver, "//nx-authorize-component//nx-process-button[@data-testid='btnLogin']")

    def restore_password_login_button(self) -> Button:
        return Button(self.driver, "//nx-authorize-reset-password-component//button[@type='submit']")

    def activation_success_login_button(self):
        translated_xpath = self.rb.replace_nested_variables("//button[contains(text(), '{LOG_IN_BUTTON_TEXT}')]")
        return Button(self.driver, translated_xpath)

    def twofa_auth_code_input(self):
        return TextField(self.driver, "//nx-authorize-component//nx-authorize-auth-code-component//input[@id='authCode']")

    def twofa_login_button(self):
        return Button(self.driver, f"//nx-authorize-component//nx-process-button//button[@type='submit']")

    def twofa_backup_code_button(self):
        return Button(self.driver, f"//nx-authorize-auth-code-component//span[text()='{self.rb.TWOFA_BACKUP_CODE_BTN_TEXT}']")

    def twofa_backup_code_input(self):
        return TextField(self.driver, "//nx-authorize-backup-code-component//input[@id='backupCode']")

    def twofa_error_login_code(self):
        return PageText(self.driver, f'//nx-authorize-component//nx-authorize-auth-code-component//p[contains(text(),"{self.rb.TWOFA_INVALID_CODE_TEXT}")]')

    def forgot_password_button(self):
        translated_xpath = self.rb.replace_nested_variables("//button//span[contains(text(),'{FORGOT_PASSWORD_TEXT}')]")
        return Button(self.driver, translated_xpath)

    def reset_password_email_input(self):
        return TextField(self.driver, "//input[@id='resetPasswordEmail']")

    def reset_password_button(self):
        translated_xpath = self.rb.replace_nested_variables("//button[contains(text(), '{RESET_PASSWORD_BUTTON_TEXT}')]")
        return Button(self.driver, translated_xpath)

    def basic_cloud_login(self, email, password):
        self.email_input().input_text(email)
        self.next_button().click()
        self.password_input().input_text(password)
        self.login_button().click()
        PageText(
            self.driver, '//nx-account-settings-select//*[contains(@class, "displayed-name")]').wait_until_visible()

    def twofa_cloud_login(self, email, password, twofa):
        self.basic_cloud_login(email, password)
        self.twofa_auth_code_input().input_text(twofa)
        self.twofa_login_button().click()

    def twofa_backup_cloud_login(self, email, password, backup_code):
        self.basic_cloud_login(email, password)
        self.twofa_backup_code_button().click()
        self.twofa_backup_code_input().input_text(backup_code)
        self.twofa_login_button().click()

    def _wait_until_modal_is_visible(self):
        modal = Pane(self.driver, "//nx-authorize-component/div[@class='authorize-main main-w']")
        modal.wait_until_visible()

    def create_account_button(self):
        translated_xpath = self.rb.replace_nested_variables(
            "//nx-authorize-email-component//button[contains(text(), "
            f"'{self.rb.CREATE_ACCOUNT_BUTTON_TEXT}')]")
        return Button(self.driver, translated_xpath)

    def wait_until_has_too_many_attempts_error(self):
        translated_xpath = self.rb.replace_nested_variables(
            "//nx-authorize-component//p[contains(text(), "
            f"'{self.rb.TOO_MANY_ATTEMPTS_TEXT}')]")
        label = PageText(self.driver, translated_xpath)
        label.wait_until_visible()


class AccountActivatedPane:

    def __init__(self, driver):
        self.driver = driver
        self.rb = RobotVariables("en_US")

    def wait_until_visible(self):
        pane = Pane(
            self.driver,
            "//nx-authorize-activate-account-component//form",
            )
        pane.wait_until_visible()

    def get_log_in_button(self):
        self.wait_until_visible()
        return Button(
            self.driver,
            "//nx-authorize-activate-account-component//button[contains(text(), "
            f"'{self.rb.LOG_IN_BUTTON_TEXT}')]",
            )

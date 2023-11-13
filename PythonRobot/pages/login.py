from typing import Tuple

from RobotVariables import RobotVariables
from generic_elements import Button
from generic_elements import ElementNotInDOM
from generic_elements import ElementNotVisible
from generic_elements import Image
from generic_elements import PageText
from generic_elements import Pane
from generic_elements import TextField
from generic_elements import ToastNotification


class LoginDialog:
    def __init__(self, driver, lang="en_US", twofa=""):
        self._driver = driver
        self.rb = RobotVariables(lang)
        self._wait_until_modal_is_visible()

    def email_input(self) -> TextField:
        return TextField(self._driver, "//nx-authorize-component//input[@id='authorizeEmail']")

    def email_does_not_exist_message(self) -> PageText:
        translated_xpath = self.rb.replace_nested_variables(
            f"//p[contains(text(),'{self.rb.ACCOUNT_DOES_NOT_EXIST_TEXT}')]"
        )
        return PageText(self._driver, translated_xpath)

    def you_can_create_account_message(self) -> PageText:
        translated_xpath = self.rb.replace_nested_variables(
            f"//p[contains(text(),'{self.rb.YOU_CAN_CREATE_ACCOUNT_TEXT}')]"
        )
        return PageText(self._driver, translated_xpath)

    def password_input(self) -> TextField:
        return TextField(self._driver, "//nx-authorize-component//input[@id='authorizePassword']")

    def password_input_error_message(self) -> TextField:
        translated_xpath = self.rb.replace_nested_variables(
            "//nx-authorize-component//p[contains(text(),'{WRONG_PASSWORD}')]")
        return TextField(self._driver, translated_xpath)


    def login_input_error_text(self):
        return TextField(self._driver, '//nx-authorize-component//p[contains(@class,"error-label")]').get_text()

    def next_button(self):
        translated_xpath = self.rb.replace_nested_variables("//button[contains(text(), '{NEXT_TEXT}')]")
        return Button(self._driver, translated_xpath)

    def russian_next_button(self):
        return Button(self.driver, "//button[contains(text(), 'Далее')]")

    def login_button(self):
        return Button(self._driver, "//nx-authorize-component//nx-process-button[@data-testid='btnLogin']")

    def restore_password_login_button(self) -> Button:
        return Button(self._driver, "//nx-authorize-reset-password-component//button[@type='submit']")

    def activation_success_login_button(self):
        translated_xpath = self.rb.replace_nested_variables("//button[contains(text(), '{LOG_IN_BUTTON_TEXT}')]")
        return Button(self._driver, translated_xpath)

    def twofa_auth_code_input(self):
        return TextField(self._driver, "//nx-authorize-component//nx-authorize-auth-code-component//input[@id='authCode']")

    def twofa_login_button(self):
        return Button(self._driver, f"//nx-authorize-component//nx-process-button//button[@type='submit']")

    def twofa_backup_code_button(self):
        return Button(self._driver, f"//nx-authorize-auth-code-component//span[text()='{self.rb.TWOFA_BACKUP_CODE_BTN_TEXT}']")

    def twofa_backup_code_input(self):
        return TextField(self._driver, "//nx-authorize-backup-code-component//input[@id='backupCode']")

    def twofa_error_login_code(self):
        return PageText(self._driver, f'//nx-authorize-component//nx-authorize-auth-code-component//p[contains(text(),"{self.rb.TWOFA_INVALID_CODE_TEXT}")]')

    def forgot_password_button(self):
        translated_xpath = self.rb.replace_nested_variables("//button//span[contains(text(),'{FORGOT_PASSWORD_TEXT}')]")
        return Button(self._driver, translated_xpath)

    def russian_forgot_password_button(self):
        return Button(self.driver, "//button//span[contains(text(),'Забыли пароль?')]")

    def reset_password_email_input(self):
        return TextField(self._driver, "//input[@id='resetPasswordEmail']")

    def reset_password_button(self):
        translated_xpath = self.rb.replace_nested_variables("//button[contains(text(), '{RESET_PASSWORD_BUTTON_TEXT}')]")
        return Button(self._driver, translated_xpath)

    def get_reset_password_email_sent_text(self) -> Tuple[str, str]:
        base = '//div[@class="email-sent"]'
        header_text = PageText(self._driver, f'{base}/h3').get_text()
        description_text = PageText(self._driver, f'{base}/p').get_text()
        return header_text, description_text

    def basic_cloud_login(self, email, password):
        self.email_input().input_text(email)
        self.next_button().click()
        self.password_input().input_text(password)
        self.login_button().click()

    def twofa_cloud_login(self, email, password, twofa):
        self.basic_cloud_login(email, password)
        self.twofa_auth_code_input().input_text(twofa)
        self.twofa_login_button().click()

    def twofa_backup_cloud_login(self, email, password, backup_code):
        self.basic_cloud_login(email, password)
        self.twofa_backup_code_button().click()
        self.twofa_backup_code_input().input_text(backup_code)
        self.twofa_login_button().click()

    def wait_until_error(self) -> str:
        actual_error = self._get_error_message()
        actual_error.wait_until_visible(3)
        return actual_error.get_text().strip()

    def _get_error_message(self) -> PageText:
        return PageText(
            self._driver,
            '''//nx-authorize-email-component//p[contains(@class, "error-label")] |
            //nx-authorize-password-component//p[contains(@class, "error-label")]''',
            )

    def _wait_until_modal_is_visible(self):
        modal = Pane(self._driver, "//nx-authorize-component/div[@class='authorize-main main-w']")
        modal.wait_until_visible()

    def create_account_button(self):
        translated_xpath = self.rb.replace_nested_variables(
            "//nx-authorize-email-component//button[contains(text(), "
            f"'{self.rb.CREATE_ACCOUNT_BUTTON_TEXT}')]")
        return Button(self._driver, translated_xpath)

    def wait_until_has_too_many_attempts_error(self):
        translated_xpath = self.rb.replace_nested_variables(
            "//nx-authorize-component//p[contains(text(), "
            f"'{self.rb.TOO_MANY_ATTEMPTS_TEXT}')]")
        label = PageText(self._driver, translated_xpath)
        label.wait_until_visible()


class AccountActivatedPane:

    def __init__(self, driver):
        self._driver = driver
        self.rb = RobotVariables("en_US")

    def wait_until_visible(self):
        pane = Pane(
            self._driver,
            "//nx-authorize-activate-account-component//form",
            )
        pane.wait_until_visible()

    def get_log_in_button(self):
        self.wait_until_visible()
        return Button(
            self._driver,
            "//nx-authorize-activate-account-component//button[contains(text(), "
            f"'{self.rb.LOG_IN_BUTTON_TEXT}')]",
            )


class ResetPasswordForm:

    def __init__(self, driver):
        self._driver = driver
        self._locator = '//nx-authorize-reset-password-component'

    def is_password_input_masked(self):
        return self.get_new_password_input().get_attribute('type') == 'password'

    def is_password_eye_open(self):
        try:
            Image(self._driver, f'{self._locator}//svg-icon[contains(@data-src, "eye.svg")]').wait_until_visible(1)
            return True
        except (ElementNotVisible, ElementNotInDOM):
            return False

    def is_password_eye_closed(self):
        try:
            Image(self._driver, f'{self._locator}//svg-icon[contains(@data-src, "eye_closed.svg")]').wait_until_visible(1)
            return True
        except (ElementNotVisible, ElementNotInDOM):
            return False

    def toggle_password_mask(self):
        Image(self._driver, f'{self._locator}//svg-icon').click()

    def type_new_password(self, password: str):
        self.get_new_password_input().input_text(password)

    def get_new_password_input(self) -> TextField:
        return TextField(self._driver, f'{self._locator}//input[@id="resetPassword"]')

    def click_next(self):
        Button(self._driver, f'{self._locator}//nx-process-button[@data-testid="btnResetPassword"]').click()

    def get_reset_success_text(self) -> str:
        return PageText(self._driver, f'{self._locator}//h3[@data-testid="resetSuccess"]').get_text()

    def wait_until_visible(self):
        Pane(self._driver, self._locator).wait_until_visible(10)

    def get_cannot_save_notification(self) -> ToastNotification:
        return ToastNotification(
            self._driver,
            "//nx-toast//span[contains(text(),'Cannot save password')]"
            )

    def wait_for_password_required_error(self):
        error = PageText(self._driver, "//*[@id='passwordRequiredError']")
        error.wait_until_visible()

    def wait_for_error_label(self, error_text: str):
        error = PageText(
            self._driver,
            f"//*[@id='failMessages']/nx-tag/a[contains (text(), '{error_text}')]",
            )
        error.wait_until_visible()

    def wait_for_success_label(self, label_text: str):
        label = PageText(
            self._driver,
            f"//*[@id='successMessages']/nx-tag/a[contains (text(), '{label_text}')]",
            )
        label.wait_until_visible()

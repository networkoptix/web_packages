import time

import robot_keywords
from NoptixLibrary.cloud_2fa import Cloud2fa
from RobotVariables import RobotVariables
from button import Button
from checkbox import Checkbox
from RobotVariables import RobotVariables
from NoptixLibrary.cloud_2fa import Cloud2fa
from generic_element import Element
from NoptixLibrary.suite import CloudAccount
from selenium.webdriver.common.by import By
from text_field import TextField
from page_text import PageText


class SecurityForm:
    def __init__(self, driver, lang="en_US"):
        self.driver = driver
        self.twofa_modal = "//nx-enable-account-2fa"
        self.rb = RobotVariables(lang)
        self._wait_until_form_is_visible()

    def twofa_enable_button(self):
        return Button(self.driver, f"//button[contains(text(),'{self.rb.ENABLE_TWOFA_TEXT}')]")

    def twofa_disable_button(self):
        return Button(self.driver, f"//button[contains(text(),'{self.rb.DISABLE_TWOFA_TEXT}')]")

    def twofa_enabled_badge(self):
        return Button(self.driver, f"//a[@name='tag-tag' and contains(text(),'{self.rb.ENABLED_TEXT}')]")

    def twofa_disabled_badge(self):
        return Button(self.driver, f"//a[@name='tag-tag' and contains(text(),'{self.rb.DISABLED_TEXT}')]")

    def twofa_password_modal_input(self):
        return TextField(self.driver, f"{self.twofa_modal}//input[@id='login_password']")

    def twofa_password_modal_next_button(self):
        return Button(self.driver, f"{self.twofa_modal}//svg-icon[contains(@data-src,'/images/icons/standard/arrow_right.svg')]")

    def twofa_code_button(self):
        return Button(self.driver, f"{self.twofa_modal}//button[@id='qrMode']")

    def twofa_key_modal_next_button(self):
        return Button(self.driver, f"{self.twofa_modal}//button[@id='nextWizardCode']")

    def twofa_key(self):
        return PageText(self.driver, f"{self.twofa_modal}//nx-info-block//div[@class='block-section-values']//p[contains(@title,'Key')]")

    def twofa_totp_input(self):
        return TextField(self.driver, f"//nx-2fa-code-input/input")

    def twofa_verify_button(self):
        return Button(self.driver, f"{self.twofa_modal}//button[text()='{self.rb.TWOFA_VERIFY_BTN_TEXT}']")

    def twofa_copy_all_button(self):
        return Button(self.driver, f"{self.twofa_modal}//span[text()='{self.rb.TWOFA_COPY_ALL_BTN_TEXT}']")

    def twofa_ok_button(self):
        return Button(self.driver, f"{self.twofa_modal}//button[@id='wizardDone']")

    def twofa_backup_code_error(self):
        return Element(self.driver, "//nx-authorize-backup-code-component//p")

    def twofa_verification_checkbox(self):
        return Checkbox(self.driver, "//nx-account-security-component//nx-section//nx-checkbox", "//input[@id='skip-tfauth']" )

    def twofa_settings_modal_uncheck(self):
        return PageText(self.driver, f"//nx-require-code-on-login//p/span[text()='{self.rb.TWOFA_SETTINGS_MODAL_DESCRIPTION_TEXT2}']")

    def twofa_settings_modal_check(self):
        return PageText(self.driver, f"//nx-require-code-on-login//p/span[text()='{self.rb.TWOFA_SETTINGS_MODAL_DESCRIPTION_TEXT1}']")

    def twofa_disable_modal_button(self):
        return Button(self.driver, f"//nx-disable-account-2fa//button[@type='submit']")

    def twofa_settings_modal_on_instructions(self):
        return PageText(self.driver, f"//nx-require-code-on-login//label/span[text()='{self.rb.TWOFA_SETTINGS_MODAL_INST_ON_TEXT}']")

    def twofa_settings_modal_off_instructions(self):
        return PageText(self.driver, f"//nx-require-code-on-login//label/span[text()='{self.rb.TWOFA_SETTINGS_MODAL_INST_OFF_TEXT}']")

    def twofa_settings_modal_apply(self):
        return Button(self.driver, f"//nx-require-code-on-login//nx-process-button//button[@type='submit']/..")

    def twofa_settings_modal_cancel(self):
        return Button(self.driver, f"//nx-require-code-on-login//button[(@type='reset') or contains(text(),'{self.rb.CANCEL_BUTTON_TEXT}')]")

    def twofa_page_save(self):
        return Button(self.driver, '//nx-account-security-component//nx-apply//button[@type="submit"]')

    def twofa_page_cancel(self):
        return Button(self.driver, '//nx-account-security-component//nx-apply//button[@type="submit"]')

    def turn_on_2fa(self, account: CloudAccount, qr_code=False):
        self.twofa_enable_button().click()
        self.twofa_password_modal_input().input_text(account.password)
        self.twofa_password_modal_next_button().click()
        if qr_code:
            key = self._get_key_from_qr_code()
            self.twofa_key_modal_next_button().click()
        else:
            self.twofa_code_button().click()
            key = self.twofa_key().text.strip()
            self.twofa_key_modal_next_button().click()
        time.sleep(1)
        totp = Cloud2fa().get_2fa_verification_code(key)
        self.twofa_totp_input().input_text(totp)
        self.twofa_verify_button().click()
        self.twofa_copy_all_button()
        backup_code_indexes = self.driver.find_elements(By.XPATH, f'{self.twofa_modal}//div[@class="nx-backup-codes"]//span')
        backup_code_entries = self.driver.find_elements(By.XPATH, f'{self.twofa_modal}//div[@class="nx-backup-codes"]//div')
        backup_codes = []
        for index, full_entry in zip(backup_code_indexes, backup_code_entries):
            backup_code_clean = full_entry.text.removeprefix(index.text)
            backup_codes.append(backup_code_clean)
        assert len(backup_codes) == 8
        account.setup_2fa(key, backup_codes)
        self.twofa_ok_button().click()

    def turn_off_2fa(self, totp):
        self.twofa_disable_button().click()
        self.twofa_totp_input().input_text(totp)
        self.twofa_disable_modal_button().click()

    def _get_key_from_qr_code(self):
        Element(self.driver, f'{self.twofa_modal}//qr-code').get_selenium_element().screenshot('qr_code.png')
        return Cloud2fa().decode_qr('qr_code.png')

    def _wait_until_form_is_visible(self):
        self.twofa_enable_button()
        self.twofa_disabled_badge()


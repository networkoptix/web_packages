import robot_keywords
from page_text import PageText
from text_field import TextField
from button import Button
from checkbox import Checkbox
from RobotVariables import RobotVariables
from variables import ENV
from NoptixLibrary.Cloud2fa import Cloud2fa
from generic_element import Element
import random

class SecurityForm:
    def __init__(self, driver, lang="en_US"):
        self.driver = driver
        self.twofa_modal = "//nx-two-fa-modal-content"
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
        return TextField(self.driver, f"{self.twofa_modal}//input[@id='tfaCodeInput']")

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
        return PageText(self.driver, f"{self.twofa_modal}//p[text()='{self.rb.TWOFA_SETTINGS_MODAL_DESCRIPTION_TEXT2}']")
    
    def twofa_settings_modal_check(self):
        return PageText(self.driver, f"{self.twofa_modal}//p[text()='{self.rb.TWOFA_SETTINGS_MODAL_DESCRIPTION_TEXT1}']")
    
    def twofa_disable_modal_button(self):
        return Button(self.driver, f"{self.twofa_modal}//button[@type='submit']")
    
    def twofa_settings_modal_on_instructions(self):
        return PageText(self.driver, f"{self.twofa_modal}//label[text()='{self.rb.TWOFA_SETTINGS_MODAL_INST_ON_TEXT}']")
    
    def twofa_settings_modal_off_instructions(self):
        return PageText(self.driver, f"{self.twofa_modal}//label[text()='{self.rb.TWOFA_SETTINGS_MODAL_INST_OFF_TEXT}']")
    
    def twofa_settings_modal_apply(self):
        return Button(self.driver, f"{self.twofa_modal}//nx-process-button//button[@type='submit']/..")
    
    def twofa_settings_modal_cancel(self):
        return Button(self.driver, f"{self.twofa_modal}//button[(@type='reset') or contains(text(),'{self.rb.CANCEL_BUTTON_TEXT}')]")
    
    def twofa_page_save(self):
        return Button(self.driver, '//nx-account-security-component//nx-apply//button[@type="submit"]')
    
    def twofa_page_cancel(self):
        return Button(self.driver, '//nx-account-security-component//nx-apply//button[@type="submit"]')
    
    def turn_on_2fa(self, password, qr_code=False):
        self.twofa_enable_button().click()
        self.twofa_password_modal_input().input_text(password)
        self.twofa_password_modal_next_button().click()
        if qr_code:
            key = self._get_key_from_qr_code()
            self.twofa_key_modal_next_button().click()
        else:    
            self.twofa_code_button().click()
            key = self.twofa_key().text.strip()
            self.twofa_key_modal_next_button().click()
        robot_keywords.sleep(5)
        totp = Cloud2fa().get_2fa_verification_code(key)
        self.twofa_totp_input().input_text(totp)
        self.twofa_verify_button().click()
        self.twofa_copy_all_button()
        randInt = random.randint(1, 8)
        randomOneTimeBackupCode = PageText(self.driver, f"//nx-two-fa-modal-content//span[text()='{randInt}']/..").text
        randomOneTimeBackupCode = randomOneTimeBackupCode[1:12]
        self.twofa_ok_button().click()
        twofa_codes = {"totp" : totp, "backup": randomOneTimeBackupCode, "key": key}
        return twofa_codes
    
    def turn_off_2fa(self, totp):
        self.twofa_disable_button().click()
        self.twofa_totp_input().input_text(totp)
        self.twofa_disable_modal_button().click()

    def _get_key_from_qr_code(self):
        Element(self.driver, "//nx-two-fa-modal-content//qr-code").get_selenium_element().screenshot('qr_code.png')
        return Cloud2fa().decode_qr('qr_code.png')
        
    def _wait_until_form_is_visible(self):
        self.twofa_enable_button()
        self.twofa_disabled_badge()
                
    
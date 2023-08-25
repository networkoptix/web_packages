import robot_keywords
from page_text import PageText
from text_field import TextField
from button import Button
from checkbox import Checkbox
from RobotVariables import RobotVariables
from variables import ENV
from NoptixLibrary.Cloud2fa import Cloud2fa
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
        return Button(self.driver, f"//a[@id='tag-tag' and contains(text(),'{self.rb.ENABLED_TEXT}')]")
    
    def twofa_disabled_badge(self):
        return Button(self.driver, f"//a[@id='tag-tag' and contains(text(),'{self.rb.DISABLED_TEXT}')]")
    
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
    
    def turn_on_2fa(self, password):
        self.twofa_enable_button().click()
        self.twofa_password_modal_input().input_text(password)
        self.twofa_password_modal_next_button().click()
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
        twofa_codes = {"totp" : totp, "backup": randomOneTimeBackupCode}
        return twofa_codes
    
    def _wait_until_form_is_visible(self):
        self.twofa_enable_button()
        self.twofa_disabled_badge()
                
    
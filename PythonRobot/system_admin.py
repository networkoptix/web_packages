import robot_keywords
from generic_element import Element
from page_text import PageText
from text_field import TextField
from toast_notification import ToastNotification
from button import Button
from checkbox import Checkbox
from RobotVariables import RobotVariables
from variables import ENV

class SystemAdmin:
    def __init__(self, driver, lang="en_US"):
        self.driver = driver
        self.rb = RobotVariables(lang)
        self._wait_until_page_loaded()
        # Todo: find way to pass id in
        #self._location_is_correct()

    def disconnect_from_cloud_button(self):
        translated_xpath = self.rb.replace_nested_variables("//button[contains(text(),'{DISCONNECT_BUTTON_TEXT}')]")
        return Button(self.driver, translated_xpath)

    def disconnect_modal_disconnect_button(self):
        translated_xpath = self.rb.replace_nested_variables(
            "//nx-modal-disconnect-content//button[contains(text(), '{DISCONNECT_BUTTON_TEXT}')]")
        return Button(self.driver, translated_xpath)

    def disconnect_from_account_button(self):
        translated_xpath = self.rb.replace_nested_variables(
            "//button[contains(text(),'{DISCONNECT_FROM_MY_ACCOUNT_TEXT}')]")
        return Button(self.driver, translated_xpath)

    def disconnect_from_account_confirm_button(self):
        translated_xpath = self.rb.replace_nested_variables(
            "//nx-modal-generic-content//button[contains(text(),'{DISCONNECT_BUTTON_TEXT}')]")
        return Button(self.driver, translated_xpath)

    def disconnect_from_account_cancel_button(self):
        translated_xpath = self.rb.replace_nested_variables(
            "//nx-modal-generic-content//button[span[contains(text(),'{CANCEL_BUTTON_TEXT}')]]")
        return Button(self.driver, translated_xpath)

    def disconnect_from_cloud_toast_notification(self):
        disconnect_message = self.rb.__getattr__('SUCCESSFULLY_DISCONNECTED')
        return ToastNotification(self.driver, disconnect_message)

    def disconnect_from_account_toast_notification(self, system_name):
        disconnect_message = self.rb.__getattr__("SYSTEM_DELETED_FROM_ACCOUNT")
        replaced_disconnect_message = disconnect_message.replace("{{system_name}}", system_name)
        return ToastNotification(self.driver, replaced_disconnect_message)

    def mandatory_2fa_chechbox(self):
        return Checkbox(self.driver, "//nx-checkbox[@name='mandatory2fa']", "//input")
    
    def twofa_verification_code_input(self):
        return TextField(self.driver, '//input[@id="verificationCode"]')
    
    def twofa_enable_button(self):
        return Button(self.driver, "//button[text()='Enable']")
    
    def merge_with_another_system_button(self):
        translated_xpath = self.rb.replace_nested_variables("//button[span[text()='{MERGE_SYSTEM_BUTTON_TEXT}']]")
        return Button(self.driver, translated_xpath)

    def merge_next_button(self):
        translated_xpath = self.rb.replace_nested_variables("//button[contains(text(),'{NEXT_TEXT}')]")
        return Button(self.driver, translated_xpath)

    def merge_systems_button(self):
        translated_xpath = self.rb.replace_nested_variables("//button[text()='{MERGE_SYSTEMS_TEXT}']")
        return Button(self.driver, translated_xpath)

    def primary_first_system(self):
        return Checkbox(self.driver, "//label[@for='firstSystem']", "//input[@id='firstSystem']")

    def primary_second_system(self):
        return Checkbox(self.driver, "//label[@for='secondSystem']", "//input[@id='secondSystem']")

    def system_is_being_merged(self):
        translated_xpath = self.rb.replace_nested_variables("//div[contains(text(), '${SYSTEM_IS_BEING_MERGED_TEXT}')]")
        return Element(self.driver, translated_xpath)

    def systems_merged_success_toast_notification(self, primary_system_name, secondary_system_name):
        alert_text = self.rb.__getattr__("SYSTEM_MERGE_COMPLETED_TEXT", get_replacements=False)
        alert_text = alert_text.replace("%PRIMARY%", primary_system_name)
        alert_text = alert_text.replace("%SECONDARY%", secondary_system_name)
        return ToastNotification(self.driver, alert_text)

    def _wait_until_page_loaded(self):
        robot_keywords.wait_until_page_contains_element(self.driver, "//nx-system-settings-component")

    def _location_is_correct(self):
        robot_keywords.location_should_be(self.driver, f"{ENV}systems/")
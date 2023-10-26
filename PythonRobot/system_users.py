from RobotVariables import RobotVariables
from generic_elements import Button
from generic_elements import DropDown
from generic_elements import Page
from generic_elements import PageText
from generic_elements import DropDownOption
from variables import ENV


class SystemUsers:
    def __init__(self, driver, lang="en_US"):
        self.driver = driver
        self.rb = RobotVariables(lang)
        self._wait_until_page_loaded()
        # Todo: find way to pass id in
        # self._location_is_correct()

    def remove_user_button(self):
        translated_xpath = self.rb.replace_nested_variables("//button[contains(text(),'{REMOVE_USER_BUTTON_TEXT}')]")
        return Button(self.driver, translated_xpath)

    def remove_user_modal_button(self):
        translated_xpath = self.rb.replace_nested_variables(
            "//nx-modal-remove-user-content//button[contains(text(),'{REMOVE_BUTTON_TEXT}')]")
        return Button(self.driver, translated_xpath)
    
    def user_header_text(self):
        return PageText(self.driver, "//nx-system-settings-component//nx-block/..//header//h2")
    
    def user_name_text(self):
        return PageText(self.driver, "//nx-system-settings-component//nx-block/..//header//span[contains(@class, 'user-name')]")
    
    def access_level_dropdown(self):
        return DropDown(self.driver, "//nx-system-settings-component//nx-block/..//nx-section//button[@id='componentId']")
    
    def access_level_dropdown_option(self, permissions):
        return DropDownOption(self.driver, f"//nx-system-settings-component//nx-block/..//nx-section//ul[contains(@class, 'dropdown-menu')]//span[text()='{permissions}']/..")

    def save_button(self):
        return Button(self.driver, f"//nx-process-button//button[contains(text(), '{self.rb.SAVE_BUTTON_TEXT}')]")

    def cancel_button(self):
        return Button(self.driver, f"//nx-cancel-button//button[contains(text(), '{self.rb.CANCEL_BUTTON_TEXT}')]")

    def no_unsaved_changes_text(self):
        return PageText(self.driver, f"//nx-apply//div[contains(text(), '{self.rb.NO_UNSAVED_CHANGES_TEXT}')]")

    def _wait_until_page_loaded(self):
        Page(self.driver, "//nx-system-user-component").wait_until_exists(40)

    def _location_is_correct(self):
        self.driver.location_should_be(f"{ENV}systems/")

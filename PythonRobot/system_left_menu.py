from selenium.webdriver.common.by import By

from RobotVariables import RobotVariables
from generic_elements import Button
from generic_elements import DropDown
from generic_elements import DropDownOption
from generic_elements import Page
from generic_elements import PageText
from generic_elements import TextField
from variables import ENV


class SystemLeftMenu:
    def __init__(self, driver, lang="en_US"):
        self._locator = "//nx-menu"
        self.driver = driver
        self.rb = RobotVariables(lang)
        self._wait_until_page_loaded()
        self.users = []
        self.servers = []
        # Todo: find way to pass id in
        # self._location_is_correct()

    def users_button(self):
        translated_xpath = self.rb.replace_nested_variables(
            "//span[contains(text(), '{USERS}')]")
        return Button(self.driver, translated_xpath)

    def update_users_list(self):
        users = self.driver.find_elements(By.XPATH, "//nx-level-3-item//span[contains(@class, 'user')]/nx-search-highlight")
        self.users = []
        for user in users:
            self.users.append(Button(self.driver, f"//nx-level-3-item//nx-search-highlight[contains(text(), '{user.text}')]"))

    def get_user_with_email(self, email: str):
        self.update_users_list()
        for user in self.users:
            if user.get_text() == email:
                return user
        raise RuntimeError(
            f"No user with email {email} found in the system. Existing users: {self.users}")

    def servers_button(self):
        translated_xpath = self.rb.replace_nested_variables(
            "//span[contains(text(), '{SERVERS}')]")
        return Button(self.driver, translated_xpath)

    def update_servers_list(self):
        self.servers = self.driver.find_elements(By.XPATH, "//div[@id='level3servers']//nx-level-3-item")

    def add_users_button(self):
        return Button(self.driver, '//nx-menu-button[@data-testid="addUserBtn"]//button')
    
    def add_user_email_input(self):
        return TextField(self.driver, "//form[@name='addUserForm']//input[@id='addUserDialogEmail']")
    
    def add_user_modal_button(self):
        return Button(self.driver, "//form[@name='addUserForm']//nx-process-button[@data-testid='addUserBtn']")

    def add_user_permissions_dropdown(self):
        return DropDown(self.driver, "//form[@name='addUserForm']//nx-permissions-select[@id='permissionsSelect']//button")

    def permissions_dropdown_option(self, permissions):
        option = DropDownOption(self.driver, f"//form[@name='addUserForm']//nx-permissions-select//li//span[text()='{permissions}']")
        option.wait_until_visible()
        return DropDownOption(self.driver, f"//form[@name='addUserForm']//nx-permissions-select//li//span[text()='{permissions}']/..")

    def add_user_modal_close_button(self):
        return Button(self.driver, "//form[@name='addUserForm']//button[@data-testid='closeAddUser']")

    def share_system_with_user(self, email, permissions):
        self.add_users_button().click()
        self.add_user_email_input().input_text(email)
        self.add_user_permissions_dropdown().click()
        self.permissions_dropdown_option(permissions).click()
        self.add_user_modal_button().click()

    def add_user_modal_error(self, text):
        return PageText(self.driver, f"//span[contains(text(),'{text}')]")

    def _wait_until_page_loaded(self):
        Page(self.driver, self._locator).wait_until_exists(40)

    def _location_is_correct(self):
        self.driver.location_should_be(f"{ENV}systems/")

    def get_search_field(self):
        return TextField(self.driver, f"{self._locator}/nx-search//input")

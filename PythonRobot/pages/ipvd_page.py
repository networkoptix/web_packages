import random
import time

from selenium.webdriver.common.by import By
from selenium.webdriver.remote.webdriver import WebDriver

import resource_import
from RobotVariables import RobotVariables
from generic_elements import Button
from generic_elements import Link
from generic_elements import PageText
from generic_elements import Pane
from generic_elements import SearchBar
from generic_elements import Table
from generic_elements import TextField


class ColumnDataNotVerified(Exception):
    pass

class TableEmpty(Exception):
    pass

class IPVDTable(Table):
    def __init__(self, driver: WebDriver):
        self.locator = "//nx-ipvd//nx-table"
        self.driver = driver
        self.first_item = """//div[contains(@class, 'big-row')]/div[contains(@style, "vendor")]/div"""
        self.contents = '/../../div[contains(@id, "hardwareType")]'
        super().__init__(driver, self.locator)

    def column_should_contain(self, search_string:str,):
        data = self._get_data(search_string)
        if not data:
            raise ColumnDataNotVerified
        search_string_missing = False
        for row in data:
            if not [x.startswith(search_string) for x in row]:
                search_string_missing = True
        if search_string_missing:
            raise ColumnDataNotVerified

    def _get_data(self, manufacturer:str):
        data = []
        rows = self.driver.find_elements(By.XPATH, '//div[contains(@class, "big-row analytics")]')
        for row in rows:
            data_row = []
            items = row.find_elements(By.XPATH, f"//*[starts-with(@id, '{manufacturer}')]")
            for element in items:
                for thing in element.text.split('\n'):
                    data_row.append(thing)
            data.append(data_row)
        return data

    def _get_rows(self):
        self.wait_until_visible()
        xpath = '//nx-ipvd//div[@class="content"]//div[not(contains(@style, '
        xpath = xpath + '"grid-area: id / id")) and not(contains(@style, '
        xpath = xpath + '"grid-area: sort"))]/div[@class="ng-star-inserted" '
        xpath = xpath + 'and contains(text(), " ") and string-length() > 2]'
        return self.driver.find_elements(By.XPATH, xpath)

    def row_count(self):
        rows = self._get_rows()
        return len(rows)

    def random_row(self, ):
        row_count = self.row_count()
        row_number = random.randint(1, row_count - 1)
        return self._get_rows()[row_number]


class FeedbackForm:
    def __init__(self, driver, lang="en_US"):
        self.driver = driver
        self.rb = RobotVariables(lang)
        self.messageForm = "//form[@name='messageForm']"

    def feedback(self):
        feedback = "//nx-modal-message-content" + self.messageForm
        return TextField(self.driver, feedback)

    def feedback_cancel_button(self):
        feedback = self.messageForm
        button = feedback + self.rb.replace_nested_variables("//button[text()='{CANCEL_BUTTON_TEXT}']")
        return Button(self.driver, button)

    def feedback_email(self):
        field = "//input[@id='user_email']"
        return TextField(self.driver, field)

    def feedback_name(self):
        field = self.messageForm + "//input[@id='user_name']"
        return TextField(self.driver, field)

    def feedback_message(self):
        field = self.messageForm + "//textarea[@id='message']"
        return TextField(self.driver, field)

    def feedback_privacy_policy(self):
        form = f"//form[@name='feedbackForm']"
        policy = self.rb.replace_nested_variables(form + "//a[text() = '{PRIVACY_POLICY_LINK_TEXT}']")
        return Link(self.driver, policy)

    def feedback_close_button(self):
        button = self.messageForm + self.rb.replace_nested_variables("//button[contains(@class,'close')]")
        return Button(self.driver, button)

    def feedback_send_button(self):
        button = self.messageForm + self.rb.replace_nested_variables("//button[text()='{SEND_BUTTON_TEXT}']")
        return Button(self.driver, button)

    def feedback_submit(self):
        button = self.messageForm + self.rb.replace_nested_variables("//button[text()='{SEND_BUTTON_TEXT}']")
        return Button(self.driver, button)

    def send_device_feedback(self):
        xpath = self.rb.replace_nested_variables("//nx-ipvd//a[contains(text(), '{IPVD_SEND_DEVICE_FEEDBACK_TEXT}')]")
        return Link(self.driver, xpath)

    def submit_a_request_button(self):
        xpath = "//nx-ipvd//span[contains(text(),'{IPVD_SUBMIT_A_REQUEST_TEXT}')]"
        submit_a_request = self.rb.replace_nested_variables(xpath)
        return Button(self.driver, submit_a_request)

class IVPDPage:

    def __init__(self, driver, lang="en_US"):
        self.driver = driver
        self.rb = RobotVariables(lang)
        self.go_to_ipvd()
        self.validate_on_ipvd_page()

    def adv_features_button(self):
        ipvd_adv_features_close_button = "//span[contains(@class,'close-button')]"
        return Button(self.driver, ipvd_adv_features_close_button)

    def advanced_search_button(self):
        locator = "//span[contains(text(),'{IPVD_ADV_SEARCH_BUTTON_TEXT}')]/.."
        adv_search_button = self.rb.replace_nested_variables(locator)
        return Button(self.driver, adv_search_button)

    def and_more(self):
        manufacturers_pane = "//nx-ipvd//nx-vendor-list/nx-block[@id='vendors-block']"
        and_more = f"{manufacturers_pane}//div[@class=manufacture-info]"
        return Pane(self.driver, and_more)

    def assert_table_appears(self):
        self.ipvd_table().wait_until_target_is_visible()
        self.ipvd_table().target_should_contain("Encoder")

    def device_details(self):
        device_details = "//nx-ipvd//nx-cam-view"
        return Pane(self.driver, device_details)

    def devices_pane(self):
        dp_path = "//nx-ipvd//nx-vendor-list/nx-block[@id='cameras-block']"
        devices_pane = Pane(self.driver, dp_path)
        devices_pane.item = Pane(self.driver, dp_path + "//nx-tag/a")
        return devices_pane

    def encoders_button(self):
        xpath = "//a[contains(text(), '{IPVD_DEV_FILTER_ENCODERS}')]"
        encoders = self.rb.replace_nested_variables(xpath)
        return Button(self.driver, encoders)

    def export_to_csv_link(self):
        export_to_csv_link = self.rb.replace_nested_variables(
            "//*[@class='export-button']/a[contains(text(), '{IPVD_EXPORT_TO_CSV_TEXT}')]")
        return Link(self.driver, export_to_csv_link)

    def filter_button(self):
        filter_button = '//nx-search//span[@class="filter-label"]'
        return Button(self.driver, filter_button)

    def first_page_button(self):
        xpath = '//*[@id="paginator-tile-first"]'
        return Button(self.driver, xpath)

    def go_to_ipvd(self):
        url = self.rb.ENV + "/ipvd"
        self.driver.get(url)

    def ipvd_table(self):
        return IPVDTable(self.driver)

    def landing_page_text(self):
        landing_page_text = "//nx-ipvd//p"
        return PageText(self.driver, landing_page_text)

    def last_page_button(self):
        xpath = '//*[@id="paginator-tile-last"]'
        return Button(self.driver, xpath)

    def last_page_number(self):
        page = self.last_page_button().get_text()
        return int(page)

    def manufactures_pane(self):
        manufacturers_pane = "//nx-ipvd//nx-vendor-list/nx-block[@id='vendors-block']"
        return Pane(self.driver, manufacturers_pane)

    def next_page_button(self):
        xpath = '//*[@id="paginator-next"]'
        return Button(self.driver, xpath)

    def pagination(self):
        pagination = '//*[@id="pagination"]'
        return PageText(self.driver, pagination)

    def placeholder_text(self):
        search_placeholder = self.search_bar().get_attribute("placeholder")
        assert search_placeholder.lower() == self.rb.SEARCH_PLACEHOLDER_TEXT.lower()

    def previous_page_button(self):
        xpath = '//*[@id="paginator-prev"]'
        return Button(self.driver, xpath)

    def search_bar(self):
        return SearchBar(self.driver, "//input[@name='query']")


    def search_text(self, text: str):
        self.search_bar().search_text(text)

    def select_device_from_table_by_row(self, row_number=1, include_last=True):
        pass

    def select_device_from_table_randomly(self, include_last=True):
        self.validate_device_table_has_contents(include_last)
        table = IPVDTable(self.driver)
        row = table.random_row()
        row.click()


    def validate_device_column_content(self, querystring: str):
        """Validate IPVD Device Table Column contains Desired Value in all Rows"""
        table = IPVDTable(self.driver)
        table.column_should_contain(querystring)

    def validate_device_table_contents(self, querystring: str)-> bool:
        """Validate IPVD Device Table Column contains Desired Value in all Rows on all Pages"""
        if self.validate_device_table_has_contents():
            self.first_page_button().click()
            last_page = self.last_page_number()
            for page_number in range(1, last_page + 1):
                self.validate_device_column_content(querystring)
                if page_number < last_page:
                    self.next_page_button().click()
            return True
        else:
            return False

    def table_has_rows(self) -> bool:
        table = IPVDTable(self.driver)
        row_count = table.row_count()
        if not row_count:
            return False
        return True

    def validate_device_table_has_contents(self, include_last=True) -> bool:
        """Validate IPVD Device Table Not Empty"""
        if not self.table_has_rows():
            return False
        if include_last:
            self.last_page_button().wait_until_visible()
        self.previous_page_button().wait_until_visible()
        self.first_page_button().wait_until_visible()
        self.next_page_button().wait_until_visible()
        self.export_to_csv_link().wait_until_visible()
        return True

    def validate_landing_page_objects_not_visible(self):
        for element in [self.manufactures_pane(), self.and_more(), self.devices_pane()]:
            element.wait_until_does_not_exist()

    def validate_on_ipvd_page(self):
        self.search_bar().wait_until_visible(timeout=60)
        self.advanced_search_button().is_visible()
        self.manufactures_pane().wait_until_visible(timeout=60)
        self.devices_pane().wait_until_visible(timeout=60)
        self.landing_page_text().wait_until_visible(timeout=60)
        assert self.driver.title == self.rb.IPVD_TITLE_TEXT + ' - ' + self.rb.PRODUCT_NAME
        for element in [self.ipvd_table(), self.device_details(), self.pagination(), self.export_to_csv_link()]:
            element.wait_until_does_not_exist()

    def validate_privacy_policy(self):
        ff = FeedbackForm(self.driver)
        ff.feedback_privacy_policy().wait_until_visible()
        url = ff.feedback_privacy_policy().get_attribute('href')
        assert url.find("privacy")
        ff.feedback_privacy_policy().click()
        window_handles = self.driver.window_handles
        assert len(window_handles) == 2
        self.driver.switch_to.window(window_handles[-1])
        current_url = self.driver.current_url
        position = url.find(current_url)
        self.driver.close()
        self.driver.switch_to.window(window_handles[0])
        if position < 0:
            return False
        return True

    def vendor_button(self, vendor="Axis"):
        vendor = f"//nx-tag/a[contains(text(), '{vendor}')]"
        return Button(self.driver, vendor)


if __name__ == "__main__":
    pass

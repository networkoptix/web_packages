from selenium.webdriver.common.by import By
from selenium.webdriver.remote.webdriver import WebDriver

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

    # TODO: column number may not be necessary
    def column_should_contain(self,  column:int, search_string:str,):
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

    # TODO: remove if unused
    # def _count_item(self, item_locator: str):
    #     xpath = self.locator +  item_locator
    #     return len(self.driver.find_elements(By.XPATH, item_locator))

    def row_count(self):
        self.wait_until_visible()
        xpath = '//nx-ipvd//div[@class="content"]//div[not(contains(@style, '
        xpath = xpath + '"grid-area: id / id")) and not(contains(@style, '
        xpath = xpath + '"grid-area: sort"))]/div[@class="ng-star-inserted" '
        xpath = xpath + 'and contains(text(), " ") and string-length() > 2]'
        return len(self.driver.find_elements(By.XPATH, xpath))


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

    def feedback(self):
        feedback = "//nx-modal-message-content//form[@name='messageForm']"
        return TextField(self.driver, feedback)

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
        #xpath = "//ipvd//nx-paginator/a[@id=paginator-tile-first]"
        xpath = '//*[@id="paginator-tile-last"]'
        return Button(self.driver, xpath)

    def last_page_number(self):
        # self.pagination().wait_until_visible()
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
        self.search_bar().click()
        self.search_bar().should_be_focused()
        self.search_bar().search_text(text)

    def submit_a_request_button(self):
        xpath = "//nx-ipvd//span[contains(text(),'{IPVD_SUBMIT_A_REQUEST_TEXT}')]"
        submit_a_request = self.rb.replace_nested_variables(xpath)
        return Button(self.driver, submit_a_request)

    # TODO: column number may not be necessary
    def validate_device_column_content(self, column: int, querystring: str):
        """Validate IPVD Device Table Column contains Desired Value in all Rows"""
        table = IPVDTable(self.driver)
        table.column_should_contain(column, querystring)

    # TODO: column number may not be necessary
    def validate_device_table_contents(self, column: int, querystring: str):
        """Validate IPVD Device Table Column contains Desired Value in all Rows on all Pages"""
        row_count = self.validate_device_table_not_empty()
        self.first_page_button().click()
        last_page = self.last_page_number()
        for page_number in range(1, last_page + 1):
            self.validate_device_column_content(column, querystring)
            if page_number < last_page:
                self.next_page_button().click()

    def validate_device_table_not_empty(self, include_last=True):
        """Validate IPVD Device Table Not Empty"""
        table = IPVDTable(self.driver)
        row_count = table.row_count()
        if not row_count:
            raise TableEmpty
        if include_last:
            self.last_page_button().wait_until_visible()
        self.previous_page_button().wait_until_visible()
        self.first_page_button().wait_until_visible()
        self.next_page_button().wait_until_visible()
        # TODO: fix csv_link xpath
        # self.export_to_csv_link().wait_until_visible()
        return row_count

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

    def vendor_button(self, vendor="Axis"):
        vendor = f"//nx-tag/a[contains(text(), '{vendor}')]"
        return Button(self.driver, vendor)


if __name__ == "__main__":
    pass

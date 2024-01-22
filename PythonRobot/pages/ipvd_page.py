import random
from typing import List

from selenium.webdriver.common.by import By
from selenium.webdriver.remote.webdriver import WebDriver
from selenium.webdriver.remote.webelement import WebElement

from RobotVariables import RobotVariables
from generic_elements import Button
from generic_elements import DropDown
from generic_elements import DropDownOption
from generic_elements import Link
from generic_elements import PageText
from generic_elements import Pane
from generic_elements import SearchBar
from generic_elements import Table
from generic_elements import TextField


class ColumnDataNotVerified(Exception):
    pass


class NoTableRowsReturned(Exception):
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

    def column_should_contain(self, search_string: str) -> bool:
        data = self._get_data(search_string)
        if not data:
            raise ColumnDataNotVerified()
        search_string_missing = False
        for row in data:
            if not [x.startswith(search_string) for x in row]:
                search_string_missing = True
        if search_string_missing:
            return False
        return True

    def _get_data(self, manufacturer: str) -> List[list]:
        data = []
        rows = self.driver.find_elements(By.XPATH, '//div[contains(@class, "big-row ng-star-inserted")]')
        for row in rows:
            data_row = []
            items = row.find_elements(By.XPATH, f"//*[starts-with(@id, '{manufacturer}')]")
            for element in items:
                for thing in element.text.split('\n'):
                    data_row.append(thing)
            data.append(data_row)
        return data

    def _get_rows(self) -> List[WebElement]:
        self.wait_until_visible()
        xpath = "//div[starts-with(@id, 'model-')]"
        return self.driver.find_elements(By.XPATH, xpath)

    def row_count(self) -> int:
        rows = self._get_rows()
        return len(rows)

    def random_row(self) -> WebElement:
        row_count = self.row_count()
        if row_count > 1:
            row_number = random.randint(0, row_count - 1)
        else:
            row_number = 0
        return self._get_rows()[row_number]

    def get_row(self, row_number: int) -> WebElement:
        rows = self._get_rows()
        if row_number < 0 or row_number > len(rows) - 1:
            raise NoTableRowsReturned()
        return rows[row_number - 1]


class FeedbackForm:

    def __init__(self, driver, lang="en_US"):
        self.driver = driver
        self.rb = RobotVariables(lang)
        self.messageForm = "//form[@name='messageForm']"

    def feedback(self) -> TextField:
        feedback = "//nx-modal-message-content" + self.messageForm
        return TextField(self.driver, feedback)

    def feedback_cancel_button(self) -> Button:
        feedback = self.messageForm
        button = feedback + self.rb.replace_nested_variables("//button[text()='{CANCEL_BUTTON_TEXT}']")
        return Button(self.driver, button)

    def feedback_email(self) -> TextField:
        field = "//input[@id='user_email']"
        return TextField(self.driver, field)

    def feedback_name(self) -> TextField:
        field = self.messageForm + "//input[@id='user_name']"
        return TextField(self.driver, field)

    def feedback_message(self) -> TextField:
        field = self.messageForm + "//textarea[@id='message']"
        return TextField(self.driver, field)

    def feedback_privacy_policy(self) -> Link:
        form = "//form[@name='feedbackForm']"
        policy = self.rb.replace_nested_variables(form + "//a[text() = '{PRIVACY_POLICY_LINK_TEXT}']")
        return Link(self.driver, policy)

    def feedback_close_button(self) -> Button:
        button = self.messageForm + self.rb.replace_nested_variables("//button[contains(@class,'close')]")
        return Button(self.driver, button)

    def feedback_send_button(self) -> Button:
        button = self.messageForm + self.rb.replace_nested_variables("//button[text()='{SEND_BUTTON_TEXT}']")
        return Button(self.driver, button)

    def feedback_submit(self) -> Button:
        button = self.messageForm + self.rb.replace_nested_variables("//button[text()='{SEND_BUTTON_TEXT}']")
        return Button(self.driver, button)

    def send_device_feedback(self) -> Link:
        xpath = self.rb.replace_nested_variables("//nx-ipvd//a[contains(text(), '{IPVD_SEND_DEVICE_FEEDBACK_TEXT}')]")
        return Link(self.driver, xpath)

    def submit_a_request_button(self) -> Button:
        xpath = "//nx-ipvd//span[contains(text(),'{IPVD_SUBMIT_A_REQUEST_TEXT}')]"
        submit_a_request = self.rb.replace_nested_variables(xpath)
        return Button(self.driver, submit_a_request)


class IVPDPage:

    def __init__(self, driver, lang="en_US"):
        self.driver = driver
        self.rb = RobotVariables(lang)
        self.go_to_ipvd()
        self.validate_on_ipvd_page()
        self.base_url = self.rb.ENV + '/ipvd'
        self.filters = "//nx-ipvd//nx-search/div/div"
        self._advanced_features = "//nx-ipvd//nx-search/div/div//div/label[text()='Features']/.."

    def advanced_features_audio_button(self) -> Button:
        path = self.rb.replace_nested_variables(
            "//nx-tag/a[contains(text(),'{IPVD_ADV_FEATURE_AUDIO}')"
            "and not(contains(text(),'{IPVD_ADV_FEATURE_2-WAY_AUDIO}'))]/.."
            )
        return Button(self.driver, self._advanced_features + path)

    def advanced_features_2way_audio_button(self) -> Button:
        path = self.rb.replace_nested_variables("//nx-tag/a[contains(text(),'{IPVD_ADV_FEATURE_TWO_WAY_AUDIO}')]/..")
        return Button(self.driver, self._advanced_features + path)

    def advanced_features_advanced_ptz_button(self) -> Button:
        path = self.rb.replace_nested_variables("//nx-tag/a[contains(text(),'{IPVD_ADV_FEATURE_ADV_PTZ}')]/..")
        return Button(self.driver, self._advanced_features + path)

    def advanced_features_advanced_ptz_close_button(self) -> Button:
        return Button(self.driver, '//a[@name="tag-Advanced PTZ"]/span')

    def advanced_features_fisheye_button(self) -> Button:
        path = self.rb.replace_nested_variables("//nx-tag/a[contains(text(),'{IPVD_ADV_FEATURE_FISHEYE}')]/..")
        return Button(self.driver, self._advanced_features + path)

    def advanced_features_h265_button(self) -> Button:
        path = self.rb.replace_nested_variables("//nx-tag/a[contains(text(),'{IPVD_ADV_FEATURE_H265}')]/..")
        return Button(self.driver, self._advanced_features + path)

    def advanced_features_motion_button(self) -> Button:
        return Button(self.driver, self._advanced_features)

    def advanced_features_multi_sensor(self) -> Button:
        path = self.rb.replace_nested_variables("//nx-tag/a[contains(text(),'{IPVD_ADV_FEATURE_MULTI_SENSOR}')]/..")
        return Button(self.driver, self._advanced_features + path)

    def advanced_features_ptz_button(self) -> Button:
        path = self.rb.replace_nested_variables("//nx-tag/a[contains(text(),'{IPVD_ADV_FEATURE_PTZ}')"
                                                "and not(contains(text(),'{IPVD_ADV_FEATURE_ADV_PTZ}'))]/..")
        return Button(self.driver, self._advanced_features + path)

    def advanced_features_ptz_close_button(self) -> Button:
        xpath = self.advanced_features_ptz_button().locator + "//span[contains(@class,'close-button')]"
        return Button(self.driver, xpath)

    def get_active_page_number(self) -> int:
        self.get_pagination().wait_until_visible()
        return int(self._extract_page_number().get_text())

    def _extract_page_number(self) -> PageText:
        xpath = self.get_pagination().locator + "/a[contains(@class,'active')]"
        return PageText(self.driver, xpath)

    def get_advanced_features_button(self) -> Button:
        ipvd_adv_features_close_button = "//span[contains(@class,'close-button')]"
        return Button(self.driver, ipvd_adv_features_close_button)

    def advanced_search_button(self) -> Button:
        locator = "//span[contains(text(),'{IPVD_ADV_SEARCH_BUTTON_TEXT}')]"
        adv_search_button = self.rb.replace_nested_variables(locator)
        return Button(self.driver, adv_search_button)

    def and_more(self) -> Pane:
        manufacturers_pane = "//nx-ipvd//nx-vendor-list/nx-block[@id='vendors-block']"
        and_more = f"{manufacturers_pane}//div[@class=manufacture-info]"
        return Pane(self.driver, and_more)

    def assert_table_appears(self) -> None:
        self.ipvd_table().wait_until_target_is_visible()
        self.ipvd_table().target_should_contain("Encoder")

    def clear_text_search_button(self) -> Button:
        return Button(self.driver, self.filters + '//button[contains(@class, "search-clear")]')

    def device_details(self) -> Pane:
        device_details = "//nx-ipvd//nx-cam-view"
        return Pane(self.driver, device_details)

    def get_device_manufacturer(self) -> str:
        xpath = self.device_details().locator + '//h4[@class="camera-vendor-model"]//span[1]'
        return PageText(self.driver, xpath).get_text()

    def get_device_model(self) -> str:
        xpath = self.device_details().locator + '//h4[@class="camera-vendor-model"]//span[2]'
        return PageText(self.driver, xpath).get_text()

    def devices_pane(self) -> Pane:
        dp_path = "//nx-ipvd//nx-vendor-list/nx-block[@id='cameras-block']"
        devices_pane = Pane(self.driver, dp_path)
        devices_pane.item = Pane(self.driver, dp_path + "//nx-tag/a")
        return devices_pane

    def encoders_button(self) -> Button:
        xpath = "//a[contains(text(), '{IPVD_DEV_FILTER_ENCODERS}')]"
        encoders = self.rb.replace_nested_variables(xpath)
        return Button(self.driver, encoders)

    def export_to_csv_link(self) -> Link:
        export_to_csv_link = self.rb.replace_nested_variables(
            "//*[@class='export-button']/a[contains(text(), '{IPVD_EXPORT_TO_CSV_TEXT}')]")
        return Link(self.driver, export_to_csv_link)

    def filters_applied_button(self) -> Button:
        xpath = "//nx-ipvd//nx-search/div/div/div[1]//span[contains(@class,'filter-label')]"
        return Button(self.driver, xpath)

    def first_page_button(self) -> Button:
        xpath = '//*[@id="paginator-tile-first"]'
        return Button(self.driver, xpath)

    def go_to_ipvd(self) -> None:
        url = self.rb.ENV + "/ipvd"
        self.driver.get(url)

    def click_table_heading_manufacturer(self) -> None:
        xpath = self.rb.replace_nested_variables("//span[contains(text(), '{IPVD_ADV_FILTER_MFR}')]/..")
        manufacturer_element = self.driver.find_element(By.XPATH, xpath)
        self.driver.execute_script("arguments[0].click();", manufacturer_element)

    def table_heading_sort(self) -> PageText:
        xpath = "//*[contains(concat(' ', normalize-space(@class), ' '), ' sort-svg sort-svg-asc ')]"

        return PageText(self.driver, xpath)

    def ipvd_table(self) -> IPVDTable:
        return IPVDTable(self.driver)

    def landing_page_text(self) -> PageText:
        landing_page_text = "//nx-ipvd//p"
        return PageText(self.driver, landing_page_text)

    def last_page_button(self) -> Button:
        xpath = '//*[@id="paginator-tile-last"]'
        return Button(self.driver, xpath)

    def last_page_number(self) -> int:
        page = self.last_page_button().get_text()
        return int(page)

    def manufactures_pane(self) -> Pane:
        manufacturers_pane = "//nx-ipvd//nx-vendor-list/nx-block[@id='vendors-block']"
        return Pane(self.driver, manufacturers_pane)

    def manufactures_dropdown(self) -> DropDown:
        return DropDown(self.driver, '//*[@id="vendors"]')

    def manufactures_dropdown_select(self, item: str) -> None:
        dropdown = self.driver.find_element(By.XPATH, self.manufactures_dropdown().locator)
        dropdown.click()
        label_xpath = f"//label[@for='vendors-{item}']"
        label = self.driver.find_element(By.XPATH, label_xpath)
        self.driver.execute_script("arguments[0].click();", label)

    def minimum_resolution_dropdown(self) -> DropDown:
        return DropDown(self.driver, '//*[@id="resolution"]')

    def minimum_resolution_dropdown_deployed(self) -> DropDown:
        xpath = "//div[@class='dropdown-menu' and contains(@style, 'display: inline-block;')]"
        return DropDown(self.driver, xpath)

    def minimum_resolution_dropdown_selection(self) -> DropDownOption:
        xpath = "//button[@id='resolution']//span[@class='ellipsis ng-star-inserted']"
        return DropDownOption(self.driver, xpath)

    def minimum_resolution_select(self, resolution: str) -> None:
        xpath = f"//a[.//span[contains(text(), '{resolution}')]]"
        resolution_option = self.driver.find_element(By.XPATH, xpath)
        self.driver.execute_script("arguments[0].click();", resolution_option)
        self.manufactures_dropdown().click()

    def next_page_button(self) -> Button:
        xpath = '//*[@id="paginator-next"]'
        return Button(self.driver, xpath)

    def get_nothing_found_from_search(self) -> PageText:
        xpath = "// div[contains( @class ,'text-placeholder') and contains(text(), "
        path = self.rb.replace_nested_variables(xpath + '"{NOTHING_FOUND}")]')
        return PageText(self.driver, path)

    def get_pagination(self) -> PageText:
        pagination = '//nx-paginator'
        return PageText(self.driver, pagination)

    def placeholder_text(self) -> bool:
        search_placeholder = self.search_bar().get_attribute("placeholder")
        if search_placeholder.lower() == self.rb.SEARCH_PLACEHOLDER_TEXT.lower():
            return True
        else:
            return False

    def previous_page_button(self) -> Button:
        xpath = '//*[@id="paginator-prev"]'
        return Button(self.driver, xpath)

    def ptz_camera_filter_button(self) -> Button:
        xpath = (
            self.devices_pane().locator
            + self.rb.replace_nested_variables(
                '//nx-tag/a[contains(text(),"{IPVD_DEV_FILTER_PTZ_CAMERAS}")] /..',
                )
            )

        return Button(self.driver, xpath)

    def search_bar(self) -> SearchBar:
        return SearchBar(self.driver, "//input[@name='query']")

    def search_text(self, text: str) -> None:
        self.search_bar().search_text(text)

    def select_device_from_table_by_row(self, row_number=1, include_last=True) -> None:
        self.validate_device_table_has_contents(include_last)
        table = IPVDTable(self.driver)
        row = table.get_row(row_number)
        row.click()

    def select_device_from_table_randomly(self, include_last=True) -> None:
        self.validate_device_table_has_contents(include_last)
        table = IPVDTable(self.driver)
        row = table.random_row()
        row.click()

    def search_with_no_results(self, search_string) -> None:
        self.search_bar().click()
        self.search_bar().should_be_focused()
        self.search_bar().input_text(search_string)
        self.ipvd_table().wait_until_not_visible()
        self.get_pagination().wait_until_not_visible()
        self.export_to_csv_link().wait_until_not_visible()

    def types_dropdown(self) -> DropDown:
        return DropDown(self.driver, '//*[@id="hardwareTypes"]')

    def type_dropdown_choose(self, item: str) -> None:
        dropdown = self.driver.find_element(By.XPATH, self.types_dropdown().locator)
        dropdown.click()
        checkbox_id = f"hardwareTypes-{item.lower()}"
        checkbox_xpath = f"//input[@id='{checkbox_id}']"
        checkbox = self.driver.find_element(By.XPATH, checkbox_xpath)
        self.driver.execute_script("arguments[0].click();", checkbox)
        dropdown.click()

    def validate_device_column_content(self, querystring: str) -> None:
        """Validate IPVD Device Table Column contains Desired Value in all Rows."""
        table = IPVDTable(self.driver)
        table.column_should_contain(querystring)

    def validate_device_table_contents(self, querystring: str) -> bool:
        """Validate IPVD Device Table Column contains Desired Value in all Rows on all Pages."""
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
        table.wait_until_visible(10)
        return bool(table.row_count())

    def validate_advanced_search_is_closed(self):
        self.advanced_search_button().wait_until_visible()
        self.search_bar().click()
        self.minimum_resolution_dropdown().wait_until_not_visible()
        self.types_dropdown().wait_until_not_visible()
        self.advanced_features_audio_button().wait_until_not_visible()
        self.advanced_features_2way_audio_button().wait_until_not_visible()
        self.advanced_features_advanced_ptz_button().wait_until_not_visible()
        self.advanced_features_fisheye_button().wait_until_not_visible()
        self.advanced_features_motion_button().wait_until_not_visible()
        self.advanced_features_h265_button().wait_until_not_visible()
        self.advanced_features_multi_sensor().wait_until_not_visible()

    def validate_advanced_search_is_open(self):
        self.advanced_search_button().wait_until_visible()
        self.search_bar().click()
        self.minimum_resolution_dropdown().wait_until_visible()
        self.types_dropdown().wait_until_visible()
        self.advanced_features_audio_button().wait_until_visible()
        self.advanced_features_2way_audio_button().wait_until_visible()
        self.advanced_features_advanced_ptz_button().wait_until_visible()
        self.advanced_features_fisheye_button().wait_until_visible()
        self.advanced_features_motion_button().wait_until_visible()
        self.advanced_features_h265_button().wait_until_visible()
        self.advanced_features_multi_sensor().wait_until_visible()

    def validate_device_table_has_contents(self, include_last=True) -> bool:
        """Validate IPVD Device Table Not Empty."""
        if not self.table_has_rows():
            return False
        if include_last:
            self.last_page_button().wait_until_visible()
        self.previous_page_button().wait_until_visible()
        self.first_page_button().wait_until_visible()
        self.next_page_button().wait_until_visible()
        self.export_to_csv_link().wait_until_visible()
        return True

    def validate_landing_page_objects_not_visible(self) -> None:
        for element in [self.manufactures_pane(), self.and_more(), self.devices_pane()]:
            element.wait_until_not_visible()

    def validate_on_ipvd_page(self) -> bool:
        self.search_bar().wait_until_visible(timeout=60)
        self.advanced_search_button().is_visible()
        self.manufactures_pane().wait_until_visible(timeout=60)
        self.devices_pane().wait_until_visible(timeout=60)
        self.landing_page_text().wait_until_visible(timeout=60)
        assert self.driver.title == self.rb.IPVD_TITLE_TEXT + ' - ' + self.rb.PRODUCT_NAME
        for element in [self.ipvd_table(), self.device_details(), self.get_pagination(), self.export_to_csv_link()]:
            element.wait_until_not_visible()
        return True

    def validate_privacy_policy(self) -> bool:
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

    def vendor_button(self, vendor="Axis") -> Button:
        vendor = f"//nx-tag/a[contains(text(), '{vendor}')]"
        return Button(self.driver, vendor)


if __name__ == "__main__":
    pass

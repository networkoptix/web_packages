from RobotVariables import RobotVariables
from wrappers import Button
from wrappers import Link
from wrappers import PageText
from wrappers import Pane
from wrappers import Table
from wrappers import TextField

from generic_element import Element

class IVPDPage:

    def __init__(self, driver, lang="en_US"):
        self.driver = driver
        self.rb = RobotVariables(lang)
        self.go_to_ipvd()
        self.validate_on_ipvd_page()

    def ipvd_table(self):
        table_locator = "//nx-ipvd//nx-table"
        first_item = """//div[contains(@class, 'big-row')]/div[contains(@style, "vendor")]/div"""
        contents = '/../../div[contains(@id, "hardwareType")]'
        table = Table(self.driver, table_locator, first_item, contents)
        return table

    def export_to_csv_link(self):
        export_to_csv_link = self.rb.replace_nested_variables(
            "//ipvd//div[@class='export-button']/a[contains(text(), '{IPVD_EXPORT_TO_CSV_TEXT}')]")
        return Link(self.driver, export_to_csv_link)

    def landing_page_text(self):
        landing_page_text = "//nx-ipvd//p"
        return PageText(self.driver, landing_page_text)

    def assert_table_appears(self):

        self.ipvd_table().wait_until_target_is_visible()
        # we want to make sure that the first row has "Encoder" in the type column.
        self.ipvd_table().target_should_contain("Encoder")

    def device_details(self):
        device_details = "//nx-ipvd//nx-cam-view"
        return Element(self.driver, device_details)

    def manufactures_pane(self):
        manufacturers_pane = "//nx-ipvd//nx-vendor-list/nx-block[@id='vendors-block']"
        return Pane(self.driver, manufacturers_pane)

    def and_more(self):
        manufacturers_pane = "//nx-ipvd//nx-vendor-list/nx-block[@id='vendors-block']"
        and_more = f"{manufacturers_pane}//div[@class=manufacture-info]"
        return Pane(self.driver, and_more)

    def devices_pane(self):
        dp_path = "//nx-ipvd//nx-vendor-list/nx-block[@id='cameras-block']"
        devices_pane = Pane(self.driver, dp_path)
        devices_pane.item = Element(self.driver, dp_path + "//nx-tag/a")
        return devices_pane

    def advanced_search_button (self):
        locator = "//span[contains(text(),'{IPVD_ADV_SEARCH_BUTTON_TEXT}')]/.."
        adv_search_button = self.rb.replace_nested_variables(locator)
        return Button(self.driver, adv_search_button)

    def feedback(self):
        feedback = "//nx-modal-message-content//form[@name='messageForm']"
        return TextField(self.driver, feedback)

    def filter_button(self):
        filter_button = '//nx-search//span[@class="filter-label"]'
        return Button(self.driver, filter_button)

    def submit_a_request_button(self):
        xpath = "//nx-ipvd//span[contains(text(),'{IPVD_SUBMIT_A_REQUEST_TEXT}')]"
        submit_a_request = self.rb.replace_nested_variables(xpath)
        return Button(self.driver, submit_a_request)

    def go_to_ipvd(self):
        url = self.rb.ENV + "/ipvd"
        self.driver.get(url)

    def pagination(self):
        pagination = "//nx-ipvd//nx-pagination"
        return Element(self.driver, pagination)

    def vendor_button(self, vendor="Axis"):
        vendor = f"//nx-tag/a[contains(text(), '{vendor}')]"
        return Button(self.driver, vendor)

    def adv_features_button(self):
        ipvd_adv_features_close_button = "//span[contains(@class,'close-button')]"
        return Button(self.driver, ipvd_adv_features_close_button)

    def encoders_button(self):
        xpath = "//a[contains(text(), '{IPVD_DEV_FILTER_ENCODERS}')]"
        encoders = self.rb.replace_nested_variables(xpath)
        return Button(self.driver, encoders)

    def search_bar(self):
        return  Element(self.driver, "//input[@name='query']")

    def placeholder_text(self):
        search_placeholder = self.search_bar().get_attribute("placeholder")
        assert search_placeholder.lower() == self.rb.SEARCH_PLACEHOLDER_TEXT.lower()

    def validate_on_ipvd_page(self):

        self.search_bar().wait_until_visible(timeout=60)
        self.advanced_search_button().is_visible()
        self.manufactures_pane().wait_until_visible(timeout=60)
        self.devices_pane().wait_until_visible(timeout=60)
        self.landing_page_text().wait_until_visible(timeout=60)

        assert self.driver.title == self.rb.IPVD_TITLE_TEXT + ' - ' + self.rb.PRODUCT_NAME

        for element in [self.ipvd_table(), self.device_details(), self.pagination(), self.export_to_csv_link()]:
            element.wait_until_does_not_exist()

    def validate_landing_page_objects_not_visible(self):
        for element in [self.manufactures_pane(), self.and_more(), self.devices_pane()]:
            element.wait_until_does_not_exist()
if __name__ == "__main__":
    pass

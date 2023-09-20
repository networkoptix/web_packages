import robot_keywords
from RobotVariables import RobotVariables
from generic_element import Element
from wrappers import Button

rb = RobotVariables("en_US")


class IVPDPage():
    FILTERS = '//nx-ipvd//nx-search/div/div/'
    FILTERS_BASIC = f"{FILTERS}/div[1]/div"
    SEARCH_BAR = "//input[@name='query']"
    ADV_SEARCH_BUTTON = rb.replace_nested_variables("//span[contains(text(),'{IPVD_ADV_SEARCH_BUTTON_TEXT}')]/..")
    MANUFACTURERS_PANE = "//nx-ipvd//nx-vendor-list/nx-block[@id='vendors-block']"
    AND_MORE = f"{MANUFACTURERS_PANE}//div[@class=manufacture-info]"
    DEVICES_PANE = "//nx-ipvd//nx-vendor-list/nx-block[@id='cameras-block']"
    LANDING_PAGE_TEXT = "//nx-ipvd//p"
    TABLE = "//nx-ipvd//nx-table"
    DEVICE_DETAILS = "//nx-ipvd//nx-cam-view"
    PAGINATION = "//nx-ipvd//nx-pagination"
    EXPORT_TO_CSV_LINK = rb.replace_nested_variables(
        "//ipvd//div[@class='export-button']/a[contains(text(), '{IPVD_EXPORT_TO_CSV_TEXT}')]")
    MANUFACTURERS_PANE_ITEM = "//nx-block[@id='vendors-block']//nx-tag/a"
    LANDING_PAGE_TEXT = "//nx-ipvd//p"
    IPVD_TABLE_FIRST_ITEM = TABLE + """//div[contains(@class, 'big-row')]/div[contains(@style, "vendor")]/div"""

    FEEDBACK = "//nx-modal-message-content//form[@name='messageForm']"

    def __init__(self, driver, lang="en_US"):
        self.driver = driver
        self.rb = RobotVariables(lang)
        url = self.rb.ENV + "/ipvd"
        driver.get(url)
        self.validate_on_ipvd_page()

    def assert_table_appears(self):
        Element(self.driver, self.IPVD_TABLE_FIRST_ITEM).wait_until_visible(20)
        # we want to make sure that the first row has "Encoder" in the type column.
        robot_keywords.element_text_should_be(self.driver,
                                              self.IPVD_TABLE_FIRST_ITEM + '/../../div[contains(@id, "hardwareType")]',
                                              "Encoder")

    def click_adv_features_close_button(self):
        ADV_FEATURES_CLOSE_BUTTON = "//span[contains(@class,'close-button')]"
        robot_keywords.click_button(self.driver, ADV_FEATURES_CLOSE_BUTTON)

    def filter_button(self):
        FILTER_BUTTON = '//nx-search//span[@class="filter-label"]'
        return Button(self.driver, FILTER_BUTTON)

    def submit_a_request_button(self):
        xpath = "//nx-ipvd//span[contains(text(),'{IPVD_SUBMIT_A_REQUEST_TEXT}')]"
        SUBMIT_A_REQUEST = self.rb.replace_nested_variables(xpath)
        return Button(self.driver, SUBMIT_A_REQUEST)

    def go_to_ipvd(self):
        url = rb.ENV + "/ipvd"
        self.driver.get(url)

    def vendor_button(self, vendor="Axis"):
        VENDOR = f"//nx-tag/a[contains(text(), '{vendor}')]"
        return Button(self.driver, VENDOR)

    def adv_features_button(self):
        IPVD_ADV_FEATURES_CLOSE_BUTTON = "//span[contains(@class,'close-button')]"
        return Button(self.driver, IPVD_ADV_FEATURES_CLOSE_BUTTON)

    def advanced_search_button(self):
        locator = f"//span[contains(text(),'{self.rb.IPVD_ADV_SEARCH_BUTTON_TEXT}')]/.."
        return Button(self.driver, locator)

    def encoders_button(self):
        xpath = "//a[contains(text(), '{IPVD_DEV_FILTER_ENCODERS}')]"
        ENCODERS = self.rb.replace_nested_variables(xpath)
        return Button(self.driver, ENCODERS)

    def placeholder_text(self):
        search_palceholder = Element(self.driver, self.SEARCH_BAR).get_attribute("placeholder")
        assert search_palceholder.lower() == self.rb.SEARCH_PLACEHOLDER_TEXT.lower()

    def _wait_until_page_loaded(self):
        robot_keywords.wait_until_page_contains_element(self.driver, self.LANDING_PAGE_TEXT)

    def validate_on_ipvd_page(self):
        Element(self.driver, IVPDPage.SEARCH_BAR).wait_until_visible(timeout=60)
        Element(self.driver, IVPDPage.ADV_SEARCH_BUTTON).wait_until_visible(timeout=60)
        Element(self.driver, IVPDPage.MANUFACTURERS_PANE).wait_until_visible(timeout=60)
        Element(self.driver, IVPDPage.DEVICES_PANE).wait_until_visible(timeout=60)
        Element(self.driver, IVPDPage.LANDING_PAGE_TEXT).wait_until_visible(timeout=60)
        assert self.driver.title == rb.IPVD_TITLE_TEXT, rb.IPVD_TITLE_TEXT + ' - ' + rb.PRODUCT_NAME
        for element in [self.TABLE, self.DEVICE_DETAILS, self.PAGINATION, self.EXPORT_TO_CSV_LINK]:
            Element(self.driver, element).wait_until_not_visible()

    def validate_landing_page_objects_not_visible(self):
        for element in [self.MANUFACTURERS_PANE, self.AND_MORE, self.DEVICES_PANE]:
            Element(self.driver, element).wait_until_not_visible()


if __name__ == "__main__":
    pass

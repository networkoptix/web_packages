import resource_import
from RobotVariables import RobotVariables
from pages.ipvd_page import IVPDPage

rb = RobotVariables("en_US")
password = "qweasd1234"
login = "noptixautoqa+owner@gmail.com"

def ipvd_page_loads_without_login():
    """1. IPVD Page loads without Login"""
    with resource_import.get_chrome() as driver:
        ipvd_page = IVPDPage(driver)
        ipvd_page.go_to_ipvd()

def ipvd_page_loads_while_logged_in():
    """2. IPVD Page loads while Logged in"""
    with resource_import.get_chrome() as driver:
        driver.get(rb.ENV)
        resource_import.cloud_login(driver, login, password)
        ipvd_page = IVPDPage(driver)

        ipvd_page.go_to_ipvd()

def ipvd_landing_page_actions():
    """3. IPVD landing page actions"""
    with resource_import.get_chrome() as driver:
        ipvd_page = IVPDPage(driver)
        ipvd_page.validate_on_ipvd_page()
        ipvd_page.placeholder_text()

        ipvd_page.advanced_search_button().should_contain(rb.IPVD_ADV_SEARCH_BUTTON_TEXT)

        manufacturers = ipvd_page.manufactures_pane().count_item('//*[contains(@class,"float-left mr-1 mb-1")]')
        assert manufacturers > 0

        ipvd_page.devices_pane().should_contain(ipvd_page.rb.IPVD_DEVICES_TEXT)
        device_types = ipvd_page.devices_pane().count_item('//nx-tag/a')
        assert device_types == 10

        ipvd_page.landing_page_text().should_contain(ipvd_page.rb.IPVD_SUBMIT_A_REQUEST_TEXT)

        ipvd_page.vendor_button().click()
        ipvd_page.ipvd_table().wait_until_visible()

        ipvd_page.validate_landing_page_objects_not_visible()

        ipvd_page.adv_features_button().click()
        ipvd_page.validate_on_ipvd_page()

        ipvd_page.encoders_button().click()
        ipvd_page.assert_table_appears()
        ipvd_page.validate_landing_page_objects_not_visible()

        ipvd_page.adv_features_button().click()
        ipvd_page.validate_on_ipvd_page()

        ipvd_page.submit_a_request_button().click()

        ipvd_page.feedback().wait_until_visible()

def text_search_manufacturer():
    """ Text search correctly finds Manufacturers"""
    with resource_import.get_chrome() as driver:
        ipvd_page = IVPDPage(driver)
        ipvd_page.go_to_ipvd()
        ipvd_page.search_text("hanwha")
        row_count = ipvd_page.validate_device_table_contents(1, "Hanwha")


if __name__ == "__main__":
    print("Running test_ipvd.py")
    ipvd_page_loads_without_login()
    ipvd_page_loads_while_logged_in()
    ipvd_landing_page_actions()
    text_search_manufacturer()


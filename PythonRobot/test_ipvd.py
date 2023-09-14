import resource_import
from ipvd_page import IVPDPage
import robot_keywords
from time import sleep
from RobotVariables import RobotVariables
rb = RobotVariables("en_US")


def ipvd_landing_page_actions():
    """3. IPVD landing page actions"""
    driver = resource_import.get_headless_chrome()
    ipvd_page = IVPDPage(driver)
    ipvd_page.validate_on_ipvd_page()
    ipvd_page.placeholder_text()

    robot_keywords.element_should_contain(driver, ipvd_page.ADV_SEARCH_BUTTON, rb.IPVD_ADV_SEARCH_BUTTON_TEXT)
    robot_keywords.element_should_contain(driver, ipvd_page.MANUFACTURERS_PANE, rb.IPVD_ADV_FILTER_MFRS.lower())
    manufacturers = robot_keywords.get_element_count(driver, ipvd_page.MANUFACTURERS_PANE_ITEM)
    assert manufacturers > 0

    robot_keywords.element_should_contain(driver, ipvd_page.DEVICES_PANE, rb.IPVD_DEVICES_TEXT)    
    device_types = robot_keywords.get_element_count(driver, ipvd_page.DEVICES_PANE + "//nx-tag/a")
    assert device_types == 10

    robot_keywords.element_should_contain(driver, ipvd_page.LANDING_PAGE_TEXT, rb.IPVD_SUBMIT_A_REQUEST_TEXT)

    ipvd_page.vendor_button().click()
    robot_keywords.wait_until_element_is_visible(driver, ipvd_page.TABLE)
    ipvd_page.validate_landing_page_objects_not_visible()

    ipvd_page.adv_features_button().click()
    ipvd_page.validate_on_ipvd_page()

    ipvd_page.encoders_button().click()
    ipvd_page.assert_table_appears()
    ipvd_page.validate_landing_page_objects_not_visible()

    ipvd_page.adv_features_button().click()
    ipvd_page.validate_on_ipvd_page()

    ipvd_page.submit_a_request_button().click()
    robot_keywords.wait_until_element_is_visible(driver, ipvd_page.FEEDBACK)


if __name__ == "__main__":
    print("Running test_ipvd.py")
    ipvd_landing_page_actions()



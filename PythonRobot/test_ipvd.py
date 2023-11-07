import time

import resource_import
from RobotVariables import RobotVariables
from pages.ipvd_page import IVPDPage
from pages.ipvd_page import FeedbackForm

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
        ff = FeedbackForm(driver)
        ff.submit_a_request_button().click()
        ff.feedback().wait_until_visible()

def text_search_manufacturer():
    """4. Text search correctly finds Manufacturers"""
    with resource_import.get_chrome() as driver:
        ipvd_page = IVPDPage(driver)
        ipvd_page.go_to_ipvd()
        ipvd_page.search_text("hanwha")
        valid = ipvd_page.validate_device_table_contents("Hanwha")
        assert valid

def request_form_basic_validation():
    """5. Request Form Basic Validations"""
    with resource_import.get_chrome() as driver:
        ipvd_page = IVPDPage(driver)
        ipvd_page.go_to_ipvd()
        ff = FeedbackForm(driver)
        ff.submit_a_request_button().wait_until_visible()
        ff.submit_a_request_button().click()
        ff.feedback().wait_until_visible()
        assert ipvd_page.validate_privacy_policy()
        before_color = ff.feedback_name().get_outline_color()
        ff.feedback_send_button().click()
        after_color = ff.feedback_name().get_outline_color()
        assert before_color != after_color
        assert ff.feedback_email().get_outline_color() == after_color
        assert ff.feedback_message().get_outline_color() == after_color
        ff.feedback_cancel_button().click()
        ff.feedback().wait_until_does_not_exist()
        ff.submit_a_request_button().click()
        ff.feedback().wait_until_visible()
        ff.feedback_close_button().wait_until_visible()
        ff.feedback_close_button().click()
        ff.feedback().wait_until_does_not_exist()

def feedback_form_basic_validations():
    """6. Feedback Form Basic Validations"""
    with resource_import.get_chrome() as driver:
        ipvd_page = IVPDPage(driver)
        resource_import.cloud_login(driver, login, password)
        ipvd_page.go_to_ipvd()
        ipvd_page.validate_on_ipvd_page()
        ipvd_page.search_text("Axis")
        ipvd_page.select_device_from_table_randomly()

        ff = FeedbackForm(driver)
        ff.send_device_feedback().click()
        ff.feedback().wait_until_visible()
        before_color = ff.feedback_message().get_outline_color()
        assert ipvd_page.validate_privacy_policy()
        ff.feedback_send_button().click()
        after_color = ff.feedback_message().get_outline_color()
        assert before_color != after_color
        assert ff.feedback_message().get_outline_color() == after_color
        ff.feedback_cancel_button().click()
        ff.feedback().wait_until_does_not_exist()
        ff.send_device_feedback().click()
        ff.feedback().wait_until_visible()
        ff.feedback_cancel_button().click()
        ff.feedback().wait_until_does_not_exist()

if __name__ == "__main__":
    print("Running test_ipvd.py")
    ipvd_page_loads_without_login()
    ipvd_page_loads_while_logged_in()
    ipvd_landing_page_actions()
    text_search_manufacturer()
    request_form_basic_validation()
    feedback_form_basic_validations()


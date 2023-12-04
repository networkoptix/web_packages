import time

from NoptixLibrary.suite import Suite
from RobotVariables import RobotVariables
from browsers.chrome import get_chrome
from pages.header import HeaderNav
from pages.ipvd_page import IVPDPage
from pages.ipvd_page import FeedbackForm
from pages.login import LoginDialog

rb = RobotVariables("en_US")

def ipvd_page_loads_without_login():
    """1. IPVD Page loads without Login"""
    with get_chrome() as driver:
        ipvd_page = IVPDPage(driver)
        ipvd_page.go_to_ipvd()

def ipvd_page_loads_while_logged_in(login, password):
    """2. IPVD Page loads while Logged in"""
    with get_chrome() as driver:
        driver.get(rb.ENV)
        HeaderNav(driver).log_in_button().click()
        LoginDialog(driver).basic_cloud_login(login, password)

def ipvd_landing_page_actions():
    """3. IPVD landing page actions"""
        # step 1
    with get_chrome() as driver:
        ipvd_page = IVPDPage(driver)
        assert ipvd_page.validate_on_ipvd_page()
        ipvd_page.placeholder_text()
        ipvd_page.advanced_search_button().should_contain(rb.IPVD_ADV_SEARCH_BUTTON_TEXT)
        manufacturers = ipvd_page.manufactures_pane().count_item('//*[contains(@class,"float-left mr-1 mb-1")]')
        assert manufacturers > 0
        ipvd_page.devices_pane().should_contain(ipvd_page.rb.IPVD_DEVICES_TEXT)
        device_types = ipvd_page.devices_pane().count_item('//nx-tag/a')
        assert device_types == 10
        ipvd_page.landing_page_text().should_contain(ipvd_page.rb.IPVD_SUBMIT_A_REQUEST_TEXT)
        # step 2
        ipvd_page.vendor_button().click()
        ipvd_page.ipvd_table().wait_until_visible()
        ipvd_page.validate_landing_page_objects_not_visible()
        # step 3
        ipvd_page.get_advanced_features_button().click()
        assert ipvd_page.validate_on_ipvd_page()
        # step 4
        ipvd_page.encoders_button().click()
        ipvd_page.assert_table_appears()
        ipvd_page.validate_landing_page_objects_not_visible()
        # step 5
        ipvd_page.get_advanced_features_button().click()
        assert ipvd_page.validate_on_ipvd_page()
        # step 6
        form = FeedbackForm(driver)
        form.submit_a_request_button().click()
        form.feedback().wait_until_visible()

def text_search_manufacturer():
    """4. Text search correctly finds Manufacturers"""
    with get_chrome() as driver:
        ipvd_page = IVPDPage(driver)
        ipvd_page.go_to_ipvd()
        assert ipvd_page.validate_on_ipvd_page()
        ipvd_page.search_text("hanwha")
        valid = ipvd_page.validate_device_table_contents("Hanwha")
        assert valid


def request_form_basic_validation():
    """5. Request Form Basic Validations"""
    with get_chrome() as driver:
        ipvd_page = IVPDPage(driver)
        # step 1
        ipvd_page.go_to_ipvd()
        assert ipvd_page.validate_on_ipvd_page()
        form = FeedbackForm(driver)
        form.submit_a_request_button().wait_until_visible()
        form.submit_a_request_button().click()
        form.feedback().wait_until_visible()
        assert ipvd_page.validate_privacy_policy()
        # step 2
        before_color = form.feedback_name().get_outline_color()
        form.feedback_send_button().click()
        after_color = form.feedback_name().get_outline_color()
        assert before_color != after_color
        assert form.feedback_email().get_outline_color() == after_color
        assert form.feedback_message().get_outline_color() == after_color
        # step 3
        form.feedback_cancel_button().click()
        form.feedback().wait_until_not_visible()
        # step 4
        form.submit_a_request_button().click()
        form.feedback().wait_until_visible()
        form.feedback_close_button().wait_until_visible()
        form.feedback_close_button().click()
        form.feedback().wait_until_not_visible()

def feedback_form_basic_validations(login, password):
    """6. Feedback Form Basic Validations"""
    with get_chrome() as driver:
        # step 1
        ipvd_page = IVPDPage(driver)
        HeaderNav(driver).log_in_button().click()
        LoginDialog(driver).basic_cloud_login(login, password)
        ipvd_page.go_to_ipvd()
        assert ipvd_page.validate_on_ipvd_page()

        ipvd_page.search_text("Axis")
        ipvd_page.select_device_from_table_randomly()
        form = FeedbackForm(driver)
        form.send_device_feedback().click()
        form.feedback().wait_until_visible()
        before_color = form.feedback_message().get_outline_color()
        assert ipvd_page.validate_privacy_policy()
        # step 2
        form.feedback_send_button().click()
        after_color = form.feedback_message().get_outline_color()
        assert before_color != after_color
        assert form.feedback_message().get_outline_color() == after_color
        # step 3
        form.feedback_cancel_button().click()
        form.feedback().wait_until_not_visible()
        # step 4
        form.send_device_feedback().click()
        form.feedback().wait_until_visible()
        form.feedback_cancel_button().click()
        form.feedback().wait_until_not_visible()

def test_text_search(login, password):
    """7. Text search"""
    with get_chrome() as driver:
        # step 1
        ipvd_page = IVPDPage(driver)
        HeaderNav(driver).log_in_button().click()
        LoginDialog(driver).basic_cloud_login(login, password)
        ipvd_page.go_to_ipvd()
        assert ipvd_page.validate_on_ipvd_page()

        # step 2
        ipvd_page.search_text('h')
        assert  ipvd_page.validate_device_table_has_contents()
        driver.location_should_be(ipvd_page.base_url + '?search=h')
        ipvd_page.clear_text_search_button().wait_until_visible()
        assert not ipvd_page.previous_page_button().is_enabled()
        assert ipvd_page.table_has_rows()
        # step 3
        assert not ipvd_page.previous_page_button().is_enabled()
        ipvd_page.next_page_button().click()
        expected_url = f"{ipvd_page.base_url}?search=h&page=2"
        driver.location_should_be(expected_url)
        ipvd_page.previous_page_button().wait_until_clickable()
        # step 4
        ipvd_page.previous_page_button().click()
        expected_url = f"{ipvd_page.base_url}?search=h&page=1"
        driver.location_should_be(expected_url)
        assert not ipvd_page.previous_page_button().is_enabled()
        # step 5
        ipvd_page.last_page_button().wait_until_visible()
        ipvd_page.last_page_button().click()
        time.sleep(5)
        assert not ipvd_page.next_page_button().is_enabled()

        # step 6
        ipvd_page.previous_page_button().wait_until_clickable()
        active_page1 =ipvd_page.get_active_page_number()
        ipvd_page.previous_page_button().click()
        active_page2 = ipvd_page.get_active_page_number()
        assert active_page2 + 1 ==  active_page1

        #step 7
        ipvd_page.clear_text_search_button().click()
        driver.location_should_be(ipvd_page.base_url)
        assert ipvd_page.validate_on_ipvd_page()

        #step 8
        ipvd_page.search_text('h')
        driver.location_should_be(ipvd_page.base_url + "?search=h")
        last_page1 = ipvd_page.last_page_number()
        ipvd_page.clear_text_search_button().click()
        ipvd_page.search_text('hi')
        driver.location_should_be(ipvd_page.base_url + "?search=hi")
        ipvd_page.validate_device_table_has_contents()
        last_page2 = ipvd_page.last_page_number()
        assert last_page2 < last_page1

        # step 9
        ipvd_page.clear_text_search_button().click()
        driver.location_should_be(ipvd_page.base_url)
        assert ipvd_page.validate_on_ipvd_page()

        # step 10
        ipvd_page.search_with_no_results('aaaaaaaa')
        driver.location_should_be(ipvd_page.base_url + '?search=aaaaaaaa')
        ipvd_page.get_nothing_found_from_search().wait_until_visible()

        # step 11
        ipvd_page.clear_text_search_button().click()
        desired_text = "Dahua"
        ipvd_page.search_text(desired_text)
        driver.location_should_be(ipvd_page.base_url + "?search=" + desired_text)
        ipvd_page.select_device_from_table_randomly()
        assert desired_text == ipvd_page.get_device_manufacturer()

        # step 12
        ipvd_page.clear_text_search_button().click()
        desired_text = "SNC-CH120"
        ipvd_page.search_text(desired_text)
        driver.location_should_be(ipvd_page.base_url + "?search=" + desired_text)
        row = ipvd_page.ipvd_table().random_row()
        assert desired_text == row.text

        # step 13
        ipvd_page.clear_text_search_button().click()
        desired_text = 'Digital Watchdog DWCA'
        ipvd_page.search_text(desired_text)
        encoded_text = 'Digital%20Watchdog%20DWCA'
        driver.location_should_be(ipvd_page.base_url + "?search=" + encoded_text)
        ipvd_page.select_device_from_table_randomly(include_last=False)
        make = ipvd_page.get_device_manufacturer()
        model = ipvd_page.get_device_model()
        assert desired_text in  make + ' ' + model

        # step 14
        ipvd_page.clear_text_search_button().click()
        desired_text = '1920x1080'
        ipvd_page.search_text(desired_text)
        driver.location_should_be(ipvd_page.base_url + "?search=" + desired_text)
        ipvd_page.select_device_from_table_by_row(1)
        make1 = ipvd_page.get_device_manufacturer()
        ipvd_page.table_heading_sort().wait_until_not_visible()
        ipvd_page.click_table_heading_manufacturer()
        make2 = ipvd_page.get_device_manufacturer()
        assert '&sortBy=vendor,DESC' in driver.current_url
        ipvd_page.select_device_from_table_by_row(1)
        make3 = ipvd_page.get_device_manufacturer()
        assert make1 == make2
        assert make2 < make3

def text_search_filter(login, password):
    """8 Text in Search Input is kept after clicking X on
    Applied Features filter indicator"""
    with get_chrome() as driver:
        # step 1
        manufacturer = 'Axis'
        ipvd_page = IVPDPage(driver)
        ipvd_page.go_to_ipvd()
        assert ipvd_page.validate_on_ipvd_page()
        ipvd_page.ptz_camera_filter_button().click()
        ipvd_page.ipvd_table().wait_until_visible()
        ipvd_page.search_text(manufacturer)
        time.sleep(2)
        ipvd_page.filters_applied_button().wait_until_visible()
        button_text = '2 ' + rb.IPVD_FILTERS_APPLIED_TEXT
        ipvd_page.filters_applied_button().should_contain(button_text)

        ipvd_page.select_device_from_table_by_row(1)
        assert  ipvd_page.get_device_manufacturer() == manufacturer
        ipvd_page.select_device_from_table_randomly()
        assert  ipvd_page.get_device_manufacturer() == manufacturer
        ipvd_page.select_device_from_table_randomly()
        assert  ipvd_page.get_device_manufacturer() == manufacturer

        # step 2
        ipvd_page.advanced_search_button().click()
        filter_text = ipvd_page.search_bar().get_attribute('value')
        assert filter_text == manufacturer
        ipvd_page.select_device_from_table_randomly()
        assert ipvd_page.get_device_manufacturer() == manufacturer

if __name__ == "__main__":
    with Suite() as suite:
        cloud_user = suite.create_cloud_account()
        print("Running test_ipvd.py")
        ipvd_page_loads_without_login()
        ipvd_page_loads_while_logged_in(cloud_user.email, cloud_user.password)
        ipvd_landing_page_actions()
        text_search_manufacturer()
        request_form_basic_validation()
        feedback_form_basic_validations(cloud_user.email, cloud_user.password)
        test_text_search(cloud_user.email, cloud_user.password)
        text_search_filter(cloud_user.email, cloud_user.password)

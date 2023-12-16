from pathlib import Path

from NoptixLibrary.suite import Mediaserver
from NoptixLibrary.suite import Suite
from RobotVariables import RobotVariables
from browsers.chrome import get_chrome
from pages.header import HeaderNav
from pages.login import LoginDialog
from pages.system_admin import SystemAdmin

rb = RobotVariables("en_US")


def test_health_monitor_details_panel_errors_and_warnings(server: Mediaserver):
    with get_chrome() as driver:
        driver.get(rb.ENV)
        owner = server.get_cloud_owner()
        HeaderNav(driver).log_in_button().click()
        LoginDialog(driver).basic_cloud_login(owner.email, owner.password)
        driver.get(rb.ENV + f"/systems/{server.id}")
        system_administration = SystemAdmin(driver)
        tab_info = system_administration.get_information_tab()
        tab_info.click()
        tab_info.check_links()
        json_file = Path(__file__).parent.absolute() / 'test_data/one-of-each.json'
        tab_info.upload_json_report(json_file)
        tab = system_administration.get_information_tab()
        tab.get_servers_section().click()

        information_tab = system_administration.get_information_tab()

        servers_section = information_tab.get_servers_section()
        servers_section.click()

        servers_section.get_table_problem("testserver error").click()
        server_details1 = information_tab.get_details_pane()
        server_details1.get_pane_error_by_title("Server testserver error is broken").wait_until_visible()

        servers_section.get_table_problem("testserver 2 errors").click()
        server_details2 = information_tab.get_details_pane()
        error = server_details2.get_pane_error_by_title("Server testserver 2 errors is broken")
        error.wait_until_visible()
        assert server_details2.get_pane_problem_count(error) == 2

        servers_section.get_table_problem("testserver warning").click()
        server_details3 = information_tab.get_details_pane()
        server_details3.get_pane_warning_by_title("Server testserver warning is broken").wait_until_visible()

        servers_section.get_table_problem("testserver 2 warnings").click()
        server_details4 = information_tab.get_details_pane()
        warning = server_details4.get_pane_warning_by_title("Server testserver 2 warnings is broken")
        warning.wait_until_visible()
        assert warning.get_count() == 2

        servers_section.get_table_problem("testserver both").click()
        server_details5 = information_tab.get_details_pane()
        issue1 = server_details5.get_pane_error_by_title("Server testserver both is broken")
        issue1.wait_until_visible()
        issue2 = server_details5.get_pane_warning_by_title("Server testserver both is broken")
        issue2.wait_until_visible()

        cameras_section = information_tab.get_cameras_section()
        cameras_section.click()

        cameras_section.get_table_problem("test error").click()
        camera_details1 = information_tab.get_details_pane()
        camera_details1.get_pane_error_by_title("Camera test error is broken").wait_until_visible()

        cameras_section.get_table_problem("test 2 errors").click()
        camera_details2 = information_tab.get_details_pane()
        errors = camera_details2.get_pane_error_by_title("Camera test 2 errors is broken")
        errors.wait_until_visible()
        assert camera_details2.get_pane_problem_count(errors) == 2

        cameras_section.get_table_problem("test camera warning").click()
        camera_details3 = information_tab.get_details_pane()
        warning = camera_details3.get_pane_warning_by_title("Camera test camera warning is broken")
        warning.wait_until_visible()

        cameras_section.get_table_problem("test two warnings").click()
        camera_details4 = information_tab.get_details_pane()
        warnings = camera_details4.get_pane_warning_by_title("Camera test two warnings is broken")
        warnings.wait_until_visible()
        assert camera_details4.get_pane_problem_count(warnings) == 2

        cameras_section.get_table_problem("test both").click()
        camera_details5 = information_tab.get_details_pane()
        issue1 = camera_details5.get_pane_error_by_title("Camera test both is broken")
        issue1.wait_until_visible()
        issue2 = camera_details5.get_pane_warning_by_title("Camera test both is broken")
        issue2.wait_until_visible()

        storage_section = information_tab.get_storages_section()
        storage_section.click()

        storage_section.get_table_problem("test storage error").click()
        storage_details1 = information_tab.get_details_pane()
        storage_details1.get_pane_error_by_title("Storage test storage error is broken").wait_until_visible()

        storage_section.get_table_problem("test storage 2 errors").click()
        storage_details2 = information_tab.get_details_pane()
        errors = storage_details2.get_pane_error_by_title("Storage test storage 2 errors is broken")
        errors.wait_until_visible()
        assert storage_details2.get_pane_problem_count(errors) == 2

        storage_section.get_table_problem("test storage warning").click()
        storage_details3 = information_tab.get_details_pane()
        warning = storage_details3.get_pane_warning_by_title("Storage test storage warning is broken")
        warning.wait_until_visible()

        storage_section.get_table_problem("test storage 2 warnings").click()
        storage_details4 = information_tab.get_details_pane()
        warnings = storage_details4.get_pane_warning_by_title("Storage test storage 2 warnings is broken")
        warnings.wait_until_visible()
        assert storage_details4.get_pane_problem_count(warnings) == 2

        storage_section.get_table_problem("test storage both").click()
        storage_details5 = information_tab.get_details_pane()
        issue1 = storage_details5.get_pane_error_by_title("Storage test storage both is broken")
        issue1.wait_until_visible()
        issue2 = storage_details5.get_pane_warning_by_title("Storage test storage both is broken")
        issue2.wait_until_visible()

        network_section = information_tab.get_network_section()
        network_section.click()

        network_section.get_table_problem("test network error").click()
        network_details1 = information_tab.get_details_pane()
        network_details1.get_pane_error_by_title("Interface test network error is broken").wait_until_visible()

        network_section.get_table_problem("test network 2 errors").click()
        network_details2 = information_tab.get_details_pane()
        errors = network_details2.get_pane_error_by_title("Interface test network 2 errors is broken")
        errors.wait_until_visible()
        assert network_details2.get_pane_problem_count(errors) == 2

        network_section.get_table_problem("test network warning").click()
        network_details3 = information_tab.get_details_pane()
        warning = network_details3.get_pane_warning_by_title("Interface test network warning is broken")
        warning.wait_until_visible()

        network_section.get_table_problem("test network 2 warnings").click()
        network_details4 = information_tab.get_details_pane()
        warnings = network_details4.get_pane_warning_by_title("Interface test network 2 warnings is broken")
        warnings.wait_until_visible()
        assert network_details4.get_pane_problem_count(warnings) == 2

        network_section.get_table_problem("test network both").click()
        network_details5 = information_tab.get_details_pane()
        issue1 = network_details5.get_pane_error_by_title("Interface test network both is broken")
        issue1.wait_until_visible()
        issue2 = network_details5.get_pane_warning_by_title("Interface test network both is broken")
        issue2.wait_until_visible()


if __name__ == "__main__":
    with Suite() as suite:
        user = suite.create_cloud_account()
        server = suite.create_cloud_server(user, "HM_Details")

        test_health_monitor_details_panel_errors_and_warnings(server)

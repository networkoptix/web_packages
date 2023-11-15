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
        server_details3.get_pane_warning_by_title(
            "Server testserver warning is broken").wait_until_visible()

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
        

if __name__ == "__main__":
    with Suite() as suite:
        user = suite.create_cloud_account()
        server = suite.create_cloud_server(user, "HM_Details")

        test_health_monitor_details_panel_errors_and_warnings(server)

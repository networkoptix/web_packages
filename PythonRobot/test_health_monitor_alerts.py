"""robot_tests/test-cases/health-monitor.robot."""
import time
from pathlib import Path

from NoptixLibrary.suite import Mediaserver
from NoptixLibrary.suite import Suite
from RobotVariables import RobotVariables
from browsers.chrome import get_chrome
from colorama import Fore
from pages.header import HeaderNav
from pages.login import LoginDialog
from pages.system_admin import SystemAdmin


def no_alerts_message_shows_when_no_alerts(server: Mediaserver, rb: RobotVariables):
    """
    9. No alerts message shows when there are no alerts.

    [Tags]    cloud    webadmin
    """
    with get_chrome() as driver:
        driver.get(rb.ENV)
        cloud_owner = server.get_cloud_owner()
        HeaderNav(driver).log_in_button().click()
        LoginDialog(driver).basic_cloud_login(cloud_owner.email, cloud_owner.password)
        driver.get(rb.ENV + f"/systems/{server.id}")
        system = SystemAdmin(driver, rb.language)
        tab_info = system.get_information_tab()
        tab_info.click()
        tab_info.check_links()
        json_file = Path(__file__).parent.absolute() / 'test_data/no-alerts.json'
        tab_info.upload_json_report(json_file)
        assert tab_info.no_alerts()
        assert tab_info.system_is_doing_well()


def errors_and_warnings_are_counted_correctly(server: Mediaserver, rb: RobotVariables):
    """
    11. Errors and warnings are counted and shown correctly in the left pane and header tiles.

    [Tags]    cloud    webadmin
    """
    with get_chrome() as driver:
        driver.get(rb.ENV)
        cloud_owner = server.get_cloud_owner()
        HeaderNav(driver).log_in_button().click()
        LoginDialog(driver).basic_cloud_login(cloud_owner.email, cloud_owner.password)
        driver.get(rb.ENV + f"/systems/{server.id}")
        system = SystemAdmin(driver, rb.language)
        tab_info = system.get_information_tab()
        tab_info.click()
        tab_info.check_links()
        json_file = Path(__file__).parent.absolute() / 'test_data/one-of-each.json'
        tab_info.upload_json_report(json_file)
        tab_info.check_links_uploaded()
        alerts_section = tab_info.get_alerts_section()
        time.sleep(5)  # Wait for the data fully load
        alerts_summary = alerts_section.get_alerts_summary()
        alerts_summary_from_table = alerts_section.get_alerts_summary_from_table()
        assert alerts_summary == alerts_summary_from_table, (
            f"The number of alerts does not match.\n"
            f"From cards: {alerts_summary}\n"
            f"From table: {alerts_summary_from_table}"
            )
        json_file = Path(__file__).parent.absolute() / 'test_data/one-page.json'
        tab_info.upload_json_report(json_file)
        tab_info.check_links_uploaded()
        alerts_section = tab_info.get_alerts_section()
        time.sleep(5)  # Wait for the data fully load
        alerts_summary = alerts_section.get_alerts_summary()
        alerts_summary_from_table = alerts_section.get_alerts_summary_from_table()
        assert alerts_summary == alerts_summary_from_table, (
            f"The number of alerts does not match.\n"
            f"From cards: {alerts_summary}\n"
            f"From table: {alerts_summary_from_table}"
            )


def change_page_height(server: Mediaserver, rb: RobotVariables):
    """
    12. Changing page height and refreshing reduces row count and increases page count.

    [Tags]    C69785    cloud    webadmin
    """
    with get_chrome() as driver:
        driver.get(rb.ENV)
        cloud_owner = server.get_cloud_owner()
        HeaderNav(driver).log_in_button().click()
        LoginDialog(driver).basic_cloud_login(cloud_owner.email, cloud_owner.password)
        driver.get(rb.ENV + f"/systems/{server.id}")
        system = SystemAdmin(driver, rb.language)
        tab_info = system.get_information_tab()
        tab_info.click()
        tab_info.check_links()
        json_file = Path(__file__).parent.absolute() / 'test_data/one-page.json'
        tab_info.upload_json_report(json_file)
        alerts_section = tab_info.get_alerts_section()
        assert alerts_section.get_pages_count() == 2
        driver.set_window_size(1920, 600)
        time.sleep(1)
        assert alerts_section.get_pages_count() != 2
        alerts_summary = alerts_section.get_alerts_summary()
        alerts_summary_from_table = alerts_section.get_alerts_summary_from_table()
        assert alerts_summary == alerts_summary_from_table, (
            "The number of alerts does not match.\n"
            f"From cards: {alerts_summary}\n"
            f"From table: {alerts_summary_from_table}"
            )


if __name__ == '__main__':
    suite_name = Path(__file__).stem
    if 'test_' == suite_name[:5]:
        suite_name = suite_name.replace('test_', '', 1)
    variables = RobotVariables("en_US")
    with Suite() as suite:
        cloud_owner = suite.create_cloud_account()
        cloud_server = suite.create_cloud_server(cloud_owner, f"{suite_name}_")
        no_alerts_message_shows_when_no_alerts(cloud_server, variables)
        print(f'{Fore.WHITE}{no_alerts_message_shows_when_no_alerts.__doc__.strip()}\t\t\t{Fore.GREEN}| PASS |')
        errors_and_warnings_are_counted_correctly(cloud_server, variables)
        print(f'{Fore.WHITE}{errors_and_warnings_are_counted_correctly.__doc__.strip()}\t\t\t{Fore.GREEN}| PASS |')
        change_page_height(cloud_server, variables)
        print(f'{Fore.WHITE}{change_page_height.__doc__.strip()}\t\t\t{Fore.GREEN}| PASS |')

from pathlib import Path

from NoptixLibrary.suite import Mediaserver
from NoptixLibrary.suite import Suite
from RobotVariables import RobotVariables
from browsers.chrome import get_chrome
from pages.header import HeaderNav
from pages.login import LoginDialog
from pages.system_admin import SystemAdmin

rb = RobotVariables("en_US")


def test_health_monitor_warnings(server: Mediaserver):
    with get_chrome() as driver:
        driver.get(rb.ENV)
        owner = server.get_cloud_owner()
        HeaderNav(driver).log_in_button().click()
        LoginDialog(driver).basic_cloud_login(owner.email, owner.password)
        driver.get(rb.ENV + f"/systems/{server.id}")
        system_administration = SystemAdmin(driver, rb.language)
        tab_info = system_administration.get_information_tab()
        tab_info.click()
        tab_info.check_links()
        json_file = Path(__file__).parent.absolute() / 'test_data/one-of-each.json'
        tab_info.upload_json_report(json_file)
        tab = system_administration.get_information_tab()
        tab.get_servers_section().click()


if __name__ == "__main__":
    with Suite() as suite:
        user = suite.create_cloud_account()
        server = suite.create_cloud_server(user, "HM_Details")

        test_health_monitor_warnings(server)

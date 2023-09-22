"""robot_tests/test-cases/health-monitor.robot"""
from pathlib import Path

from colorama import Fore

from PythonRobot.NoptixLibrary.suite import CloudServer
from PythonRobot.NoptixLibrary.suite import Suite
from PythonRobot.RobotVariables import RobotVariables
from PythonRobot.resource_import import cloud_login
from PythonRobot.resource_import import get_chrome
from PythonRobot.system_admin import SystemAdmin


def json_upload_works(server: CloudServer, rb: RobotVariables):
    """
    4. Json upload works
    [Tags]    cloud    webadmin
    """
    with get_chrome() as driver:
        driver.get(rb.ENV)
        cloud_login(driver, server.cloud_owner.email, server.cloud_owner.password)
        driver.get(rb.ENV + f"/systems/{server.id}")
        system = SystemAdmin(driver, rb.language)
        tab_info = system.get_information_tab()
        tab_info.click()
        tab_info.check_links()
        json_file = Path(__file__).parent.absolute() / 'test_data/one-page.json'
        tab_info.upload_json_report(json_file)
        tab_info.check_links_uploaded()


if __name__ == '__main__':
    suite_name = Path(__file__).stem
    if 'test_' == suite_name[:5]:
        suite_name = suite_name.replace('test_', '', 1)
    variables = RobotVariables("en_US")
    with Suite() as suite:
        cloud_owner = suite.create_cloud_account()
        cloud_server = suite.create_cloud_server(cloud_owner, f"{suite_name}_")
        json_upload_works(cloud_server, variables)
        print(f'{Fore.WHITE}{json_upload_works.__doc__.strip()}\t\t\t{Fore.GREEN}| PASS |')

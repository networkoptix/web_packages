"""robot_tests/test-cases/health-monitor.robot"""
from pathlib import Path

from colorama import Fore

from PythonRobot.NoptixLibrary.suite import CloudServer
from PythonRobot.NoptixLibrary.suite import Suite
from PythonRobot.RobotVariables import RobotVariables
from PythonRobot.resource_import import cloud_login
from PythonRobot.resource_import import get_chrome
from PythonRobot.system_admin import SystemAdmin


def going_to_health_monitor_when_system_is_offline(server: CloudServer, rb: RobotVariables):
    """
    3. Going to health monitor when system is offline and shows offline message
    [Tags]    cloud
    """
    with get_chrome() as driver:
        driver.get(rb.ENV)
        cloud_login(driver, server.cloud_owner.email, server.cloud_owner.password)
        driver.get(rb.ENV + f"/systems/{server.id}")
        system = SystemAdmin(driver, rb.language)
        tab_info = system.get_information_tab()
        tab_info.click()
        assert tab_info.is_current_system_inaccessible()


if __name__ == '__main__':
    suite_name = Path(__file__).stem
    if 'test_' == suite_name[:5]:
        suite_name = suite_name.replace('test_', '', 1)
    variables = RobotVariables("en_US")
    with Suite() as suite:
        cloud_owner = suite.create_cloud_account()
        cloud_server_offline = suite.create_cloud_server(cloud_owner, f"{suite_name}_1_")
        cloud_server_offline.stop()
        going_to_health_monitor_when_system_is_offline(cloud_server_offline, variables)
        print(f'{Fore.WHITE}{going_to_health_monitor_when_system_is_offline.__doc__.strip()}\t\t\t{Fore.GREEN}| PASS |')

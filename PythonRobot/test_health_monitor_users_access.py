"""robot_tests/test-cases/health-monitor.robot"""
from contextlib import ExitStack
from pathlib import Path

from colorama import Fore

from PythonRobot.NoptixLibrary.cloud_portal_api import CloudPortalAPI
from PythonRobot.NoptixLibrary.suite import CloudAccount
from PythonRobot.NoptixLibrary.suite import CloudServer
from PythonRobot.NoptixLibrary.suite import Suite
from PythonRobot.RobotVariables import RobotVariables
from PythonRobot.resource_import import cloud_login
from PythonRobot.resource_import import get_chrome
from PythonRobot.system_admin import SystemAdmin


def owner_admin_has_access_to_health_monitoring(server: CloudServer, rb: RobotVariables):
    """
    1. Owner/admin has access to health monitoring
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


def administrator_has_access_to_health_monitoring(server: CloudServer, rb: RobotVariables):
    """
    2. Administrator has access to health monitoring
    [Tags]    cloud    webadmin
    """
    cloud_api = CloudPortalAPI()
    cloud_auth = (server.cloud_owner.email, server.cloud_owner.password)

    with ExitStack() as exit_stack:
        account = exit_stack.enter_context(CloudAccount())
        cloud_api.share(cloud_auth, server.id, 'cloudAdmin',  account.email, '')
        driver = exit_stack.enter_context(get_chrome())
        driver.get(rb.ENV)
        cloud_login(driver, account.email, account.password)
        driver.get(rb.ENV + f"/systems/{server.id}")
        system = SystemAdmin(driver, rb.language)
        tab_info = system.get_information_tab()
        tab_info.click()
        tab_info.check_links()


if __name__ == '__main__':
    suite_name = Path(__file__).stem
    if 'test_' == suite_name[:5]:
        suite_name = suite_name.replace('test_', '', 1)
    variables = RobotVariables("en_US")
    with Suite() as suite:
        cloud_owner = suite.create_cloud_account()
        cloud_server = suite.create_cloud_server(cloud_owner, f"{suite_name}_1_")
        owner_admin_has_access_to_health_monitoring(cloud_server, variables)
        print(f'{Fore.WHITE}{owner_admin_has_access_to_health_monitoring.__doc__.strip()}\t\t\t{Fore.GREEN}| PASS |')
        administrator_has_access_to_health_monitoring(cloud_server, variables)
        print(f'{Fore.WHITE}{administrator_has_access_to_health_monitoring.__doc__.strip()}\t\t\t{Fore.GREEN}| PASS |')

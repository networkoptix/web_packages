"""robot_tests/test-cases/health-monitor.robot"""
from contextlib import ExitStack
from pathlib import Path

from colorama import Fore

from NoptixLibrary.cloud_portal_api import CloudPortalAPI
from NoptixLibrary.suite import CloudAccount
from NoptixLibrary.suite import Mediaserver
from NoptixLibrary.suite import Suite
from RobotVariables import RobotVariables
from resource_import import cloud_login
from resource_import import get_chrome
from system_admin import SystemAdmin


def owner_admin_has_access_to_health_monitoring(server: Mediaserver, rb: RobotVariables):
    """
    1. Owner/admin has access to health monitoring
    [Tags]    cloud    webadmin
    """
    with get_chrome() as driver:
        driver.get(rb.ENV)
        owner = server.get_cloud_owner()
        cloud_login(driver, owner.email, owner.password)
        driver.get(rb.ENV + f"/systems/{server.id}")
        system = SystemAdmin(driver, rb.language)
        tab_info = system.get_information_tab()
        tab_info.click()
        tab_info.check_links()


def administrator_has_access_to_health_monitoring(server: Mediaserver, rb: RobotVariables):
    """
    2. Administrator has access to health monitoring
    [Tags]    cloud    webadmin
    """
    cloud_api = CloudPortalAPI()
    owner = server.get_cloud_owner()
    cloud_auth = (owner.email, owner.password)

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


def user_does_not_have_access_to_health_monitor(server: Mediaserver, rb: RobotVariables, role: str, error_message: str):
    """
    6, 7, 8. User does not have access to health monitor
    [Tags]    cloud    webadmin
    """
    cloud_api = CloudPortalAPI()
    owner = server.get_cloud_owner()
    cloud_auth = (owner.email, owner.password)

    with ExitStack() as exit_stack:
        account = exit_stack.enter_context(CloudAccount())
        cloud_api.share(cloud_auth, server.id, role,  account.email, '')
        driver = exit_stack.enter_context(get_chrome())
        driver.get(rb.ENV)
        cloud_login(driver, account.email, account.password)
        driver.get(rb.ENV + f"/systems/{server.id}")
        system = SystemAdmin(driver, rb.language)
        try:
            system.get_information_tab()
        except TimeoutError:
            pass
        else:
            raise RuntimeError(error_message)


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
        msg_error = "Advanced Viewer should not have access to the Information tab."
        user_does_not_have_access_to_health_monitor(cloud_server, variables, 'advancedViewer', msg_error)
        print(f'{Fore.WHITE} {user_does_not_have_access_to_health_monitor.__doc__.strip()}\t\t\t{Fore.GREEN}Advanced viewer | PASS |')
        msg_error = "Viewer should not have access to the Information tab."
        user_does_not_have_access_to_health_monitor(cloud_server, variables, 'viewer', msg_error)
        print(f'{Fore.WHITE} {user_does_not_have_access_to_health_monitor.__doc__.strip()}\t\t\t{Fore.GREEN}Viewer | PASS |')
        msg_error = "LiveViewer should not have access to the Information tab."
        user_does_not_have_access_to_health_monitor(cloud_server, variables, 'liveViewer', msg_error)
        print(f'{Fore.WHITE} {user_does_not_have_access_to_health_monitor.__doc__.strip()}\t\t\t{Fore.GREEN}Live viewer | PASS |')

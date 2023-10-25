"""robot_tests/test-cases/system-servers.robot"""
import logging
from pathlib import Path

from colorama import Fore
from requests import HTTPError
from selenium.webdriver.common.keys import Keys

from NoptixLibrary.suite import CloudAccount
from NoptixLibrary.suite import Mediaserver
from NoptixLibrary.suite import Suite
from RobotVariables import RobotVariables
from pages.header import HeaderNav
from pages.login import LoginDialog
from resource_import import get_chrome
from pages.system_admin import SystemAdmin


def test_change_port_only_for_owner(server: Mediaserver, rb: RobotVariables, cloud_account: CloudAccount):
    """
    7. Change port is only available for owner
    [Tags]    C70927    cloud    webadmin
    """
    with get_chrome() as driver:
        driver.get(rb.ENV)
        HeaderNav(driver).log_in_button().click()
        LoginDialog(driver).basic_cloud_login(cloud_account.email, cloud_account.password)
        driver.get(rb.ENV + f"/systems/{server.id}")
        system = SystemAdmin(driver, rb.language)
        tab_settings = system.get_tab_settings()
        tab_settings.click()
        servers_section = tab_settings.get_servers_section()
        servers_section.click()
        server_page = servers_section.get_server_page(server.get_server_name())
        server_page.click()
        server_page.wait_until_visible_common_elements()
        server_page.wait_until_visible_owner_elements()
        assert not server_page.get_port_field().is_enabled()


def test_change_port_field_validation(server: Mediaserver, rb: RobotVariables):
    """
    8. Port field validation
    [Tags]    C70929    cloud    webadmin     CLOUD-8753
    """
    logger = logging.getLogger('8. Port field validation')
    with get_chrome() as driver:
        driver.get(rb.ENV)
        HeaderNav(driver).log_in_button().click()
        owner = server.get_cloud_owner()
        LoginDialog(driver).basic_cloud_login(owner.email, owner.password)
        driver.get(rb.ENV + f"/systems/{server.id}")
        system = SystemAdmin(driver, rb.language)
        tab_settings = system.get_tab_settings()
        tab_settings.click()
        servers_section = tab_settings.get_servers_section()
        servers_section.click()
        server_page = servers_section.get_server_page(server.get_server_name())
        server_page.click()
        server_page.wait_until_visible_common_elements()
        server_page.wait_until_visible_owner_elements()
        logger.info("Step 1. Port is required")
        port_element = server_page.get_port_field()
        port_before = port_element.get_text()
        port_element.click()
        port_element.input_text(Keys.ENTER)
        assert server_page.has_message_server_port_is_required()
        driver.refresh()
        port_element = server_page.get_port_field()
        port_element.wait_until_visible(30)
        assert not server_page.has_message_server_port_is_required()
        assert port_element.get_text() == port_before
        logger.info("Step 2. Entered zero automatically changes to 1, and the Save button is not active")
        port_element = server_page.get_port_field()
        port_element.click()
        port_element.input_text('0')
        port_element.wait_until_text_is('1')
        assert not server_page.get_save_button().is_enabled()
        logger.info("Step 3. Port number below 1024 is not valid")
        port_element = server_page.get_port_field()
        port_element.click()
        port_element.input_text('1023')
        assert server_page.has_message_port_too_low()
        logger.info("Step 4. Entered value above 65535 automatically changes to 65535")
        port_element = server_page.get_port_field()
        port_element.click()
        port_element.input_text('77777')
        assert not server_page.has_message_port_too_low()
        assert port_element.get_text() == '65535'
        logger.info("Step 5. Port number below 0 is not valid and automatically changes to 1")
        port_element = server_page.get_port_field()
        port_element.click()
        port_element.input_text('-1')
        assert server_page.has_message_port_too_low()
        assert port_element.get_text() == '1'
        logger.info("Step 6. Entered value 1024 is valid")
        port_element = server_page.get_port_field()
        port_element.click()
        port_element.input_text('1024')
        assert not server_page.has_message_port_too_low()
        assert port_element.get_text() == '1024'
        logger.info("Step 7. Pressed the Cancel button to cancel changes")
        server_page.get_cancel_button().click()
        assert port_element.get_text() == port_before


def test_change_port(server: Mediaserver, rb: RobotVariables):
    """
    9. Change port
    [Tags]    C70975    cloud    webadmin
    """
    logger = logging.getLogger('9. Change port')
    with get_chrome() as driver:
        driver.get(rb.ENV)
        HeaderNav(driver).log_in_button().click()
        owner = server.get_cloud_owner()
        LoginDialog(driver).basic_cloud_login(owner.email, owner.password)
        driver.get(rb.ENV + f"/systems/{server.id}")
        system = SystemAdmin(driver, rb.language)
        tab_settings = system.get_tab_settings()
        tab_settings.click()
        servers_section = tab_settings.get_servers_section()
        servers_section.click()
        server_page = servers_section.get_server_page(server.get_server_name())
        server_page.click()
        server_page.wait_until_visible_common_elements()
        server_page.wait_until_visible_owner_elements()
        port_element = server_page.get_port_field()
        port_element.input_text('7002')
        logger.info('Port has been changed to 7002')
        server_page.get_save_button().click()
        new_api = server.get_copy_api(7002)
        new_api.get_cameras()
        new_api.change_port(7001)
        logger.info('Port has been changed back to 7001')
        server.api.get_cameras()


def test_not_owner_cannot_change_port(server: Mediaserver, cloud_account: CloudAccount):
    """
    10. Administrator cannot change port via API
    [Tags]    C70927    cloud    webadmin   WIP
    """
    server.api.reconnect()  # Authorization could be broken after previous tests
    new_api = server.get_copy_api(username=cloud_account.email, password=cloud_account.password)
    try:
        new_api.change_port(7002)
    except HTTPError as exc:
        if exc.response.status_code != 403:
            raise
    else:
        raise RuntimeError(f"User {cloud_account.email} could change port via API")


if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)
    suite_name = Path(__file__).stem
    if 'test_' == suite_name[:5]:
        suite_name = suite_name.replace('test_', '', 1)
    variables = RobotVariables("en_US")
    with Suite() as suite:
        cloud_owner = suite.create_cloud_account()
        cloud_admin = suite.create_cloud_account()
        cloud_server = suite.create_cloud_server(cloud_owner, f"{suite_name}", {'cloudAdmin': cloud_admin})
        test_change_port_only_for_owner(cloud_server, variables, cloud_admin)
        print(f'{Fore.WHITE}{test_change_port_only_for_owner.__doc__.strip()}\t\t\t{Fore.GREEN}| PASS |')
        test_change_port_field_validation(cloud_server, variables)
        print(f'{Fore.WHITE}{test_change_port_field_validation.__doc__.strip()}\t\t\t{Fore.GREEN}| PASS |')
        test_change_port(cloud_server, variables)
        print(f'{Fore.WHITE}{test_change_port.__doc__.strip()}\t\t\t{Fore.GREEN}| PASS |')
        test_not_owner_cannot_change_port(cloud_server, cloud_admin)
        print(f'{Fore.WHITE}{test_not_owner_cannot_change_port.__doc__.strip()}\t\t\t{Fore.GREEN}| PASS |')

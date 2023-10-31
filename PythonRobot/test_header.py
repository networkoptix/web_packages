from pathlib import Path

from NoptixLibrary.suite import Mediaserver
from NoptixLibrary.suite import Suite
from email_access import get_random_email
from pages.header import HeaderNav
from pages.landing_page import MetaLandingPage
from pages.login import LoginDialog
from pages.systems_page import SystemsPage
from resource_import import cloud_login
from resource_import import get_chrome
from resource_import import register_and_activate_account
from variables import ENV


def anon_header_correct():
    """new: Anonymous Header shows correct items"""
    with get_chrome() as driver:
        driver.get(ENV)
        header = HeaderNav(driver)
        header.create_account().wait_until_visible()
        header.language_dropdown().wait_until_visible()
        assert header.log_in_button().is_visible()
        assert header.home_link().is_visible()
        assert header.resouces_link().is_visible()
        assert header.for_developers_link().is_visible()
        assert not header.systems_link().is_visible()
        print("PASS")


def logged_in_header_correct(server: Mediaserver):
    """new: Logged in Header shows correct items"""
    with get_chrome() as driver:
        driver.get(ENV)
        header = HeaderNav(driver)
        header.log_in_button().click()
        owner = server.get_cloud_owner()
        LoginDialog(driver).basic_cloud_login(owner.email, owner.password)
        header.systems_link().wait_until_visible()
        assert header.resouces_link().is_visible()
        assert header.for_developers_link().is_visible()
        print("PASS")


def no_systems_header_button_text_is_correct():
    with get_chrome() as driver:
        password = 'qweasd 123'
        email = get_random_email()
        register_and_activate_account(driver, "Mark", "Hamill", email, password)
        driver.get(ENV)
        cloud_login(driver, email, password)
        SystemsPage(driver).no_systems().wait_until_visible()
        header = HeaderNav(driver)
        assert header.is_logged_in()
        assert header.systems_link().is_visible()
        assert header.resouces_link().is_visible()
        assert header.for_developers_link().is_visible()
        assert header.my_systems_button().is_visible()
        header.for_developers_link().click()
        # Now fails because of bug https://networkoptix.atlassian.net/browse/CLOUD-11719
        assert driver.current_url == 'https://metavms.cloud-test.hdw.mx/'
        MetaLandingPage(driver).get_page().should_contain('Nx Meta Cloud')
        print("PASS")


if __name__ == "__main__":
    suite_name = Path(__file__).stem
    suite_name = suite_name.removeprefix("test_")
    with Suite() as suite:
        cloud_owner = suite.create_cloud_account()
        cloud_server = suite.create_cloud_server(cloud_owner, f'{suite_name}_1_')
        anon_header_correct()
        logged_in_header_correct(cloud_server)
        no_systems_header_button_text_is_correct()

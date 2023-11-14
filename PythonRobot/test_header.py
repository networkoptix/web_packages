from pathlib import Path

from NoptixLibrary.suite import Mediaserver, CloudAccount
from NoptixLibrary.suite import Suite
from email_access import get_random_email
from pages.header import HeaderNav
from pages.landing_page import LandingPage
from pages.login import LoginDialog
from pages.system_admin import SystemAdmin
from pages.systems_page import SystemsPage
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
        HeaderNav(driver).log_in_button().click()
        LoginDialog(driver).basic_cloud_login(email, password)
        SystemsPage(driver).no_systems().wait_until_visible()
        header = HeaderNav(driver)
        assert header.is_logged_in()
        assert header.systems_link().is_visible()
        assert header.resouces_link().is_visible()
        assert header.for_developers_link().is_visible()
        assert header.my_systems_button().is_visible()
        header.for_developers_link().click()
        # Now fails because of bug https://networkoptix.atlassian.net/browse/CLOUD-11719
        landing_page = LandingPage(driver)
        landing_page.wait_until_loaded()
        landing_page.location_is_correct(url="https://metavms.cloud-test.hdw.mx/")
        landing_page.get_label().should_contain('Nx Meta Cloud')
        print("PASS")


def one_system_check_header(cloud_user: CloudAccount):
    with get_chrome() as driver:
        driver.get(ENV)
        HeaderNav(driver).log_in_button().click()
        LoginDialog(driver).basic_cloud_login(cloud_user.email, cloud_user.password)
        system_administration = SystemAdmin(driver)
        header = HeaderNav(driver)
        assert header.is_logged_in()
        assert header.systems_link().is_visible()
        assert header.resouces_link().is_visible()
        assert header.for_developers_link().is_visible()
        assert not header.my_systems_button().is_visible()
        system_administration.get_not_active_tab_by_name('View').wait_until_visible()
        system_administration.get_not_active_tab_by_name('Bookmarks').wait_until_visible()
        system_administration.get_active_tab_by_name('Settings').wait_until_visible()
        system_administration.get_not_active_tab_by_name('Information').wait_until_visible()
        system_administration.get_not_active_tab_by_name('Monitoring').wait_until_visible()
        print("PASS")


def check_header_and_dropdown_content_for_not_admins(cloud_user: CloudAccount):
    with get_chrome() as driver:
        driver.get(ENV)
        header = HeaderNav(driver)
        header.log_in_button().click()
        LoginDialog(driver).basic_cloud_login(cloud_user.email, cloud_user.password)
        system_administration = SystemAdmin(driver)
        assert header.is_logged_in()
        assert header.systems_link().is_visible()
        assert header.resouces_link().is_visible()
        assert header.for_developers_link().is_visible()
        assert not header.my_systems_button().is_visible()
        system_administration.get_not_active_tab_by_name('View').wait_until_visible()
        system_administration.get_not_active_tab_by_name('Bookmarks').wait_until_visible()
        system_administration.get_active_tab_by_name('Settings').wait_until_visible()
        system_administration.get_not_active_tab_by_name('Information').wait_until_not_visible()
        system_administration.get_not_active_tab_by_name('Monitoring').wait_until_not_visible()
        print("PASS")


def check_header_for_many_systems_user(cloud_user: CloudAccount):
    with get_chrome() as driver:
        driver.get(ENV)
        header = HeaderNav(driver)
        header.log_in_button().click()
        LoginDialog(driver).basic_cloud_login(cloud_user.email, cloud_user.password)
        systems_page = SystemsPage(driver)
        header.my_systems_button().wait_until_visible()
        assert header.is_logged_in()
        assert header.systems_link().is_visible()
        assert header.resouces_link().is_visible()
        assert header.for_developers_link().is_visible()
        systems_page.tiles[0].click()
        system_administration = SystemAdmin(driver)
        assert header.is_logged_in()
        assert header.systems_link().is_visible()
        assert header.resouces_link().is_visible()
        assert header.for_developers_link().is_visible()
        assert not header.my_systems_button().is_visible()
        system_administration.get_not_active_tab_by_name('View').wait_until_visible()
        system_administration.get_not_active_tab_by_name('Bookmarks').wait_until_visible()
        system_administration.get_active_tab_by_name('Settings').wait_until_visible()
        system_administration.get_not_active_tab_by_name('Information').wait_until_visible()
        system_administration.get_not_active_tab_by_name('Monitoring').wait_until_visible()
        system_administration.get_back_arrow_button().click()
        SystemsPage(driver)
        print("PASS")


if __name__ == "__main__":
    suite_name = Path(__file__).stem
    suite_name = suite_name.removeprefix("test_")
    with Suite() as suite:
        cloud_owner = suite.create_cloud_account()
        cloud_users = suite.create_cloud_accounts()
        cloud_server = suite.create_cloud_server(cloud_owner, f'{suite_name}_1_', cloud_users)
        anon_header_correct()
        logged_in_header_correct(cloud_server)
        no_systems_header_button_text_is_correct()
        one_system_check_header(cloud_owner)
        check_header_and_dropdown_content_for_not_admins(cloud_server.get_cloud_viewer())
        check_header_and_dropdown_content_for_not_admins(cloud_server.get_cloud_live_viewer())
        check_header_and_dropdown_content_for_not_admins(cloud_server.get_cloud_advanced_viewer())
        check_header_and_dropdown_content_for_not_admins(cloud_server.get_cloud_custom_user())
        second_cloud_server = suite.create_cloud_server(
            cloud_owner,
            f'{suite_name}_2_',
            )
        check_header_for_many_systems_user(cloud_owner)

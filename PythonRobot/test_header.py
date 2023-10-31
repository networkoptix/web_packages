from pathlib import Path

from NoptixLibrary.suite import Mediaserver
from NoptixLibrary.suite import Suite
from pages.header import HeaderNav
from pages.login import LoginDialog
from resource_import import get_chrome
from variables import ENV


def anon_header_correct():
    """new: Anonymous Header shows correct items"""
    with get_chrome() as driver:
        driver.get(ENV)
        header = HeaderNav(driver)
        header.create_account()
        header.language_dropdown()
        header.log_in_button()
        header.home_link()
        header.resouces_link()
        header.for_developers_link()
        link = header.systems_link()
        assert not link.is_visible()
        print("PASS")


def logged_in_header_correct(server: Mediaserver):
    """new: Logged in Header shows correct items"""
    with get_chrome() as driver:
        driver.get(ENV)
        header = HeaderNav(driver)
        header.log_in_button().click()
        owner = server.get_cloud_owner()
        LoginDialog(driver).basic_cloud_login(owner.email, owner.password)
        header.systems_link()
        header.resouces_link()
        header.for_developers_link()
        print("PASS")


if __name__ == "__main__":
    suite_name = Path(__file__).stem
    suite_name = suite_name.removeprefix("test_")
    with Suite() as suite:
        cloud_owner = suite.create_cloud_account()
        cloud_server = suite.create_cloud_server(cloud_owner, f'{suite_name}_1_')
        anon_header_correct()
        logged_in_header_correct(cloud_server)

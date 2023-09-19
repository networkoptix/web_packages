from pathlib import Path

from NoptixLibrary.cloud_portal_api import CloudPortalAPI
from NoptixLibrary.docker_api import DockerApi
from NoptixLibrary.generic_keywords import GenericKeywords
from header import HeaderNav
from resource_import import get_chrome
from NoptixLibrary.suite import CloudServer
from NoptixLibrary.suite import Suite
from login import LoginDialog
from variables import ENV

password = "qweasd 123"

keywords = GenericKeywords()
docker_api = DockerApi()
CLOUD_API = CloudPortalAPI()

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
        try:
            header.systems_link()
        except:
            pass
        else:
            raise RuntimeError("Systems link is present on Anonymous")
        print("PASS")

def logged_in_header_correct(server: CloudServer):
    """new: Logged in Header shows correct items"""
    with get_chrome() as driver:
        driver.get(ENV)
        header = HeaderNav(driver)
        header.log_in_button().click()
        LoginDialog(driver).basic_cloud_login(server.cloud_owner.email, server.cloud_owner.password)
        header.systems_link()
        header.resouces_link()
        header.for_developers_link()
        print("PASS")

if __name__ == "__main__":
    suite_name = Path(__file__).stem
    suite_name = suite_name.removeprefix("test_")
    with Suite() as suite:
        suite: Suite
        cloud_owner = suite.create_cloud_account()
        cloud_server = suite.create_cloud_server(cloud_owner, f'{suite_name}_1_')
        anon_header_correct()
        logged_in_header_correct(cloud_server)

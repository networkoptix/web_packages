"""test-cases/history.robot"""

from colorama import Fore

from PythonRobot.downloads_page import DownloadsPage
from PythonRobot.history_page import HistoryPage
from RobotVariables import RobotVariables
from resource_import import get_headless_chrome
from test_account import cloud_login

variables = RobotVariables("en_US")


def test_history_link_in_the_download_page():
    """1. History link is in the downloads page for user with access and takes you to /downloads/releases"""
    email = variables.replace_nested_variables(variables.BASE_EMAIL)
    driver = get_headless_chrome()
    driver.get(variables.ENV)
    cloud_login(driver, email, variables.BASE_PASSWORD)
    driver.get(variables.ENV + 'download')
    download_page = DownloadsPage(driver)
    download_page.get_windows_client_installer_tab().click()
    link = download_page.get_other_releases_link()
    driver.get(link)
    HistoryPage(driver)
    driver.quit()


if __name__ == "__main__":
    test_history_link_in_the_download_page()
    print(f'{Fore.WHITE}{test_history_link_in_the_download_page.__doc__}\t\t\t{Fore.GREEN}| PASS |')


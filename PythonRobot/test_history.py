"""test-cases/history.robot"""
from colorama import Fore

from PythonRobot.downloads_page import DownloadsPage
from PythonRobot.history_page import HistoryPage
from RobotVariables import RobotVariables
from resource_import import get_chrome
from test_account import cloud_login

variables = RobotVariables("en_US")


def test_history_link_in_the_download_page():
    """1. History link is in the downloads page for user with access and takes you to /downloads/releases"""
    email = variables.replace_nested_variables(variables.BASE_EMAIL)
    with get_chrome() as driver:
        driver.get(variables.ENV)
        cloud_login(driver, email, variables.BASE_PASSWORD)
        driver.get(variables.ENV + 'download')
        download_page = DownloadsPage(driver)
        download_page.get_windows_client_installer_tab().click()
        link = download_page.get_other_releases_link()
        driver.get(link)
        HistoryPage(driver, variables)


def test_expandable_sections():
    """2. Make sure expandable sections show options"""
    email = variables.replace_nested_variables(variables.BASE_EMAIL)
    with get_chrome() as driver:
        driver.get(variables.ENV)
        cloud_login(driver, email, variables.BASE_PASSWORD)
        driver.get(variables.ENV + 'downloads/releases')
        history_page = HistoryPage(driver, variables)
        tab_releases = history_page.get_releases_tab()
        tab_releases.click()
        platform_downloads = tab_releases.get_platform_downloads_for_last_version()
        for platform in platform_downloads:
            platform.click()
            platform.check_download_links()
        tab_patches = history_page.get_patches_tab()
        tab_patches.click()
        platform_downloads = tab_patches.get_platform_downloads_for_last_version()
        for platform in platform_downloads:
            platform.click()
            platform.check_download_links()
        tab_betas = history_page.get_betas_tab()
        tab_betas.click()
        platform_downloads = tab_betas.get_platform_downloads_for_last_version()
        for platform in platform_downloads:
            platform.click()
            platform.check_download_links()


if __name__ == "__main__":
    test_history_link_in_the_download_page()
    print(f'{Fore.WHITE}{test_history_link_in_the_download_page.__doc__}\t\t\t{Fore.GREEN}| PASS |')

    test_expandable_sections()
    print(f'{Fore.WHITE}{test_expandable_sections.__doc__}\t\t\t{Fore.GREEN}| PASS |')

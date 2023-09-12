import robot_keywords
import variables
from downloads_page import DownloadsPage
from footer import Footer
from resource_import import get_headless_chrome


def download_link_is_in_the_footer():
    driver = get_headless_chrome()
    driver.get(variables.ENV)
    Footer(driver, 'cloud').get_downloads_link()
    driver.close()


# Download link takes you to the /downloads page
def check_download_link():
    driver = get_headless_chrome()
    driver.get(variables.ENV)
    Footer(driver, 'cloud').get_downloads_link().click()
    DownloadsPage(driver)
    driver.close()


# Make sure each tab changes the text to show the corresponding OS and url
def check_download_tabs():
    driver = get_headless_chrome()
    driver.get(variables.ENV)
    Footer(driver, 'cloud').get_downloads_link().click()
    download_page = DownloadsPage(driver)
    download_page.click_windows_client_installer_tab()
    robot_keywords.location_should_be(driver, variables.ENV + '/download/windows')
    download_page.click_linux_client_installer_tab()
    robot_keywords.location_should_be(driver, variables.ENV + '/download/linux')
    download_page.click_mac_client_installer_tab()
    robot_keywords.location_should_be(driver, variables.ENV + '/download/macos')
    driver.close()


if __name__ == '__main__':
    download_link_is_in_the_footer()
    check_download_link()
    check_download_tabs()

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.desired_capabilities import DesiredCapabilities

import variables
from pages.downloads_page import DownloadsPage
from pages.footer import Footer
from resource_import import get_chrome


def download_link_is_in_the_footer():
    with get_chrome() as driver:
        driver.get(variables.ENV)
        footer = Footer(driver)
        footer.wait_until_footer_is_visible_cloud()
        footer.get_downloads_link()


# Download link takes you to the /downloads page
def check_download_link():
    with get_chrome() as driver:
        driver.get(variables.ENV)
        footer = Footer(driver)
        footer.wait_until_footer_is_visible_cloud()
        footer.get_downloads_link().click()
        DownloadsPage(driver)


# Make sure each tab changes the text to show the corresponding OS and url
def check_download_tabs():
    with get_chrome() as driver:
        driver.get(variables.ENV)
        footer = Footer(driver)
        footer.wait_until_footer_is_visible_cloud()
        footer.get_downloads_link().click()
        download_page = DownloadsPage(driver)
        download_page.get_windows_client_installer_tab().click()
        driver.location_should_be(variables.ENV + '/download/windows')
        download_page.get_linux_client_installer_tab().click()
        driver.location_should_be(variables.ENV + '/download/linux')
        download_page.get_mac_client_installer_tab().click()
        driver.location_should_be(variables.ENV + '/download/macos')


# Going to the downloads page should show you the tab according to your OS
def check_default_download_tab():
    windows_user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36"
    windows_user_agent_driver = _get_chromedriver(windows_user_agent)
    windows_user_agent_driver.get(variables.ENV)
    footer = Footer(windows_user_agent_driver)
    footer.wait_until_footer_is_visible_cloud()
    footer.get_downloads_link().click()
    download_page = DownloadsPage(windows_user_agent_driver)
    windows_tab = download_page.get_windows_client_installer_tab()
    if not windows_tab.is_active():
        raise RuntimeError(f"Linux tab is not visible with User-Agent {windows_user_agent!r}")
    windows_user_agent_driver.close()
    linux_user_agent = "Mozilla/5.0 (X11; Ubuntu; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36"
    linux_user_agent_driver = _get_chromedriver(linux_user_agent)
    linux_user_agent_driver.get(variables.ENV)
    footer = Footer(linux_user_agent_driver)
    footer.wait_until_footer_is_visible_cloud()
    footer.get_downloads_link().click()
    download_page = DownloadsPage(linux_user_agent_driver)
    linux_tab = download_page.get_linux_client_installer_tab()
    if not linux_tab.is_active():
        raise RuntimeError(f"Linux tab is not visible with User-Agent {linux_user_agent!r}")
    linux_user_agent_driver.close()
    mac_user_agent = "Mozilla/5.0  (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36"
    mac_user_agent_driver = _get_chromedriver(mac_user_agent)
    mac_user_agent_driver.get(variables.ENV)
    footer = Footer(mac_user_agent_driver)
    footer.wait_until_footer_is_visible_cloud()
    footer.get_downloads_link().click()
    download_page = DownloadsPage(mac_user_agent_driver)
    mac_tab = download_page.get_mac_client_installer_tab()
    if not mac_tab.is_active():
        raise RuntimeError(f"Linux tab is not visible with User-Agent {mac_user_agent!r}")
    mac_user_agent_driver.close()


def validate_the_windows_download_links():
    with get_chrome() as driver:
        driver.get(variables.ENV)
        footer = Footer(driver)
        footer.wait_until_footer_is_visible_cloud()
        footer.get_downloads_link().click()
        download_page = DownloadsPage(driver)
        tab = download_page.get_windows_client_installer_tab()
        tab.click()
        tab.check_download_button_link()
        tab.check_other_packages_links()


def validate_the_linux_download_links():
    with get_chrome() as driver:
        driver.get(variables.ENV)
        footer = Footer(driver)
        footer.wait_until_footer_is_visible_cloud()
        footer.get_downloads_link().click()
        download_page = DownloadsPage(driver)
        tab = download_page.get_linux_client_installer_tab()
        tab.click()
        tab.check_download_button_link()
        tab.check_other_packages_links()


def validate_the_mac_download_links():
    with get_chrome() as driver:
        driver.get(variables.ENV)
        footer = Footer(driver)
        footer.wait_until_footer_is_visible_cloud()
        footer.get_downloads_link().click()
        download_page = DownloadsPage(driver)
        tab = download_page.get_mac_client_installer_tab()
        tab.click()
        tab.check_download_button_link()
        tab.check_other_packages_links()


def check_play_store_link():
    with get_chrome() as driver:
        driver.get(variables.ENV)
        footer = Footer(driver)
        footer.wait_until_footer_is_visible_cloud()
        footer.get_downloads_link().click()
        download_page = DownloadsPage(driver)
        actual_url = download_page.get_play_store_link()
        expected_url = 'https://play.google.com/store/apps/details?id=com.networkoptix.nxwitness'
        if actual_url != expected_url:
            raise RuntimeError(f"Actual Play Store URL is {actual_url}, expected {expected_url}")


def check_itunes_store_link():
    with get_chrome() as driver:
        driver.get(variables.ENV)
        footer = Footer(driver)
        footer.wait_until_footer_is_visible_cloud()
        footer.get_downloads_link().click()
        download_page = DownloadsPage(driver)
        actual_url = download_page.get_itunes_store_link()
        expected_url = 'https://itunes.apple.com/eg/app/hd-witness/id1050899754'
        if actual_url != expected_url:
            raise RuntimeError(f"Actual Play Store URL is {actual_url}, expected {expected_url}")


def _get_chromedriver(user_agent):
    chrome_options = Options()
    chrome_options.add_argument("--enable-logging")
    chrome_options.add_argument(f"--user-agent={user_agent}")
    chrome_options.add_argument("--log-level=3")
    chrome_options.add_argument("--headless")
    capabilities = DesiredCapabilities.CHROME
    capabilities['goog:loggingPrefs'] = {'browser': 'ALL'}
    return webdriver.Chrome(options=chrome_options, desired_capabilities=capabilities)


if __name__ == '__main__':
    download_link_is_in_the_footer()
    check_download_link()
    check_download_tabs()
    check_default_download_tab()
    validate_the_windows_download_links()
    validate_the_linux_download_links()
    validate_the_mac_download_links()
    check_play_store_link()
    check_itunes_store_link()

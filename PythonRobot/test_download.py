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


if __name__ == '__main__':
    download_link_is_in_the_footer()
    check_download_link()

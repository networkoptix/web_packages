import robot_keywords


class DownloadsPage:

    def __init__(self, driver):
        self._driver = driver
        self._wait_until_loaded()

    def _wait_until_loaded(self):
        robot_keywords.wait_until_page_contains_element(self._driver, "//nx-download-component")

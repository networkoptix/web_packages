from browsers.chrome import ChromeBrowser
from generic_elements import Pane


class ViewPage:

    def __init__(self, driver: ChromeBrowser):
        self._locator = "//nx-system-view-index-page"
        self._driver = driver

    def wait_for_system_offline_placeholder(self):
        locator = f"{self._locator}/nx-page-placeholder"
        Pane(self._driver, locator).wait_until_visible()

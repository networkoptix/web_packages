import time

from selenium.webdriver import Chrome
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support import expected_conditions as ec
from selenium.webdriver.support.wait import WebDriverWait


class ChromeBrowser(Chrome):

    def __init__(self):
        self._options = Options()
        self._configure()
        super().__init__(options=self._options)

    def _configure(self):
        self._options.add_argument("--enable-logging")
        self._options.add_argument("--log-level=3")

    def location_should_be(self, url: str):
        WebDriverWait(self, 1).until(ec.url_to_be(url))

    def location_should_contain(self, url: str):
        WebDriverWait(self, 10).until(ec.url_contains(url))

    def wait_until_number_of_tabs_are_open(self, number: int, timeout_sec=30):
        start_time = time.monotonic()
        handles = self.window_handles
        while True:
            if len(handles) == number:
                return
            if time.monotonic() - start_time > timeout_sec:
                raise AssertionError(f"Looking for {number} tabs, found {len(handles)} tabs.")
            time.sleep(.2)

import time

from selenium.webdriver import Chrome
from selenium.webdriver.chrome.options import Options


class ChromeBrowser(Chrome):

    def __init__(self):
        self._options = Options()
        self._configure()
        super().__init__(options=self._options)

    def _configure(self):
        self._options.add_argument("--enable-logging")
        self._options.add_argument("--log-level=3")

    def location_should_be(self, url: str):
        timeout_sec = 1
        started_at = time.monotonic()
        while True:
            current_url = self.current_url
            if current_url == url:
                return
            if time.monotonic() - started_at > timeout_sec:
                raise RuntimeError(f'Current url: {current_url}, Expected url {url}')

    def location_should_contain(self, url: str):
        timeout_sec = 10
        started_at = time.monotonic()
        while True:
            current_url = self.current_url
            if url in current_url:
                return
            if time.monotonic() - started_at > timeout_sec:
                raise RuntimeError(
                    f'Current url {current_url} does not contain {url} substring',
                    )

    def wait_until_number_of_tabs_are_open(self, number: int, timeout_sec=30):
        start_time = time.monotonic()
        handles = self.window_handles
        while True:
            if len(handles) == number:
                return
            if time.monotonic() - start_time > timeout_sec:
                raise AssertionError(f"Looking for {number} tabs, found {len(handles)} tabs.")
            time.sleep(.2)

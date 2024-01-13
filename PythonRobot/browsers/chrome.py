import time
import json
from contextlib import contextmanager
from typing import ContextManager
from pathlib import Path

from selenium.webdriver import ActionChains
from selenium.webdriver import Chrome
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.keys import Keys


class ChromeBrowser(Chrome):

    def __init__(self):
        self._options = Options()
        self._configure()
        super().__init__(options=self._options)

    def _configure(self):
        self._options.add_argument("--enable-logging")
        self._options.add_argument("--log-level=3")

    def location_should_be(self, url: str):
        timeout_sec = 10
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

    def scroll_to_bottom(self):
        ActionChains(self).send_keys(Keys.END).perform()

    def _save_artifacts(self, artifacts_dir: Path):
        self.save_screenshot(f'{artifacts_dir}_screenshot.png')
        logs = [
            self.get_log("browser"),
            self.get_log("driver"),
        ]
        with open(f'{artifacts_dir}_chrome_logs.json', 'w') as error_log:
            json.dump(logs, error_log, ensure_ascii=False, indent=4)

@contextmanager
def get_chrome() -> ContextManager[ChromeBrowser]:
    driver = ChromeBrowser()
    try:
        yield driver
    finally:
        driver.quit()

@contextmanager
def test_in_chrome(artifacts_dir: Path) -> ContextManager[ChromeBrowser]:
    driver = ChromeBrowser()
    try:
        yield driver
    finally:
        driver._save_artifacts(artifacts_dir)
        driver.quit()

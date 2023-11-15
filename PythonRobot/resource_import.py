import logging
from contextlib import contextmanager
from typing import ContextManager

import urllib3

from RobotVariables import RobotVariables
from browsers.chrome import ChromeBrowser

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

rb = RobotVariables("en_US")


@contextmanager
def get_chrome() -> ContextManager[ChromeBrowser]:
    driver = ChromeBrowser()
    try:
        yield driver
    finally:
        driver.quit()


_logger = logging.getLogger(__name__)

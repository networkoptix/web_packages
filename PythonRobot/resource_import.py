import json
import logging
import pathlib
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


def get_lang_list():
    path = pathlib.Path(__file__).parent / 'customizations' / 'default_lang_list.json'
    with open(path, encoding="utf-8") as langDict:
        return json.load(langDict)


_logger = logging.getLogger(__name__)

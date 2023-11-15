import logging

import urllib3

from RobotVariables import RobotVariables

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

rb = RobotVariables("en_US")

_logger = logging.getLogger(__name__)

import json
from robot.api import logger
from robot.api.deco import keyword, library
import os.path
import git
import sys
from robot.libraries.BuiltIn import BuiltIn

from FTViewAPI import FTViewAPI
from datetime import datetime


logLocation = "file:///C:/develop/cloud_portal/robot_tests/log.html"
repo = git.Repo(search_parent_directories=True)
revision = repo.head.object.hexsha
API = FTViewAPI()
class FTViewListener:
    ROBOT_LISTENER_API_VERSION = 3

    def __init__(self, user, host):
        self.user=user
        self.host=host
        now = datetime.now()
        self.runStartTime = now.strftime("%m/%d/%Y %H:%M:%S")

    def start_suite(self, data, result):
        self.vmsVersion = BuiltIn().get_variable_value('${IMAGE}')
        API.stage_start(self.user, self.host, self.runStartTime, revision, sys.argv, self.vmsVersion, data.name, result.starttime)

    def start_test(self, data, result):
        API.stage_start(self.user, self.host, self.runStartTime, revision, sys.argv, self.vmsVersion, data.name, result.starttime)

    def end_test(self, data, result):
        API.stage_finish(self.user, self.host, self.runStartTime, data.name, result.status, result.elapsedtime/1000, result.message)
    
    def end_suite(self, data, result):
        API.stage_finish(self.user, self.host, self.runStartTime, data.name, result.status, result.elapsedtime/1000, result.message)
        API.stage_artifact(self.user, self.host, self.runStartTime, data.name, logLocation)

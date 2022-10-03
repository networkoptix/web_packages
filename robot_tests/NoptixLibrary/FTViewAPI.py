import requests
from requests.auth import HTTPDigestAuth, HTTPBasicAuth
from robot.api import logger
from robot.api.deco import keyword, library

class FTViewAPI:
    
    def __init__(self, FTServer='http://10.1.5.109:8090'):
        self.FTServer = FTServer

    def stage_start(self, user, host, runStartTime, revision, args, url, name, stageStartTime):
        body = {
            "run_username": user,
            "run_hostname": host, 
            "run_started_at_iso": runStartTime, 
            "run_ft_revision": revision, 
            "run_args": args, 
            "run_vms_url": url, 
            "stage_name": name, 
            "stage_started_at_iso": stageStartTime
        }
        r = requests.post(f'{self.FTServer}/api/reporting/start', json=body)
    
    def stage_finish(self, user, host, runStartTime, name, status, duration, message=""):
        status = self.result_converter(status)
        body = {
            "run_username": user, 
            "run_hostname": host, 
            "run_started_at_iso": runStartTime,
            "stage_name": name,
            "stage_status": status, 
            "stage_duration_sec": duration, 
            "stage_message": message
        }
        r = requests.post(f'{self.FTServer}/api/reporting/finish', json=body)
        

    def stage_artifact(self, user, host, runStartTime, name, url):
        body = {
            "run_username": user, 
            "run_hostname": host, 
            "run_started_at_iso": runStartTime,
            "stage_name": name,
            "artifact_url": "file:///C:/develop/cloud_portal/robot_tests/log.html"
        }
        r = requests.post(f'{self.FTServer}/api/reporting/artifact', json=body)

    def stage_mark(self, testsJson):
        r = requests.post(f'{self.FTServer}/testrail/api/mark', json=testsJson)

    def result_converter(self, status):
        if status == "PASS":
            return "passed"
        elif status == "FAIL":
            return "failed"
        elif status == "SKIP":
            return "skipped"
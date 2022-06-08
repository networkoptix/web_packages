from robot.running import TestSuiteBuilder
from robot.model import SuiteVisitor
from NoptixLibrary.FTViewAPI import FTViewAPI
import json
import git

class TestSuiteFinder(SuiteVisitor):
    def __init__(self):
        self.tests = []

    def visit_suite(self, suite):
        self.tests.append(suite)

def get_test_json():
    builder = TestSuiteBuilder()
    testsuite = builder.build('test-cases')
    finder = TestSuiteFinder()
    testsuite.visit(finder)
    repo = git.Repo(search_parent_directories=True)
    revision = repo.head.object.hexsha
    branch = repo.active_branch.name
    tests=[]
    for suite in testsuite.suites:
        #suites[f'{suite.name}'] = {}
        for test in suite.tests:
            tags=[]
            for tag in test.tags:
                tags.append(tag)
            
            tests.append(
                {
                    "run_ft_revision":revision,
                    "stage_name":f"{suite.name}::{test.name}",
                    "marks":tags,
                    "stage_url":f"https://gitlab.nxvms.dev/dev/cloud_portal/-/blob/{branch}/robot_tests/test-cases/{suite.name}.robot"
                }
            )
    return json.dumps(tests)
API = FTViewAPI()
API.stage_mark(get_test_json())
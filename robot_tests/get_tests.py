from robot.running import TestSuiteBuilder
from robot.model import SuiteVisitor
import json

class TestSuiteFinder(SuiteVisitor):
    def __init__(self):
        self.tests = []

    def visit_suite(self, suite):
        self.tests.append(suite)


builder = TestSuiteBuilder()
testsuite = builder.build('test-cases')
finder = TestSuiteFinder()
testsuite.visit(finder)
suites={}
for suite in testsuite.suites:
    suites[f'{suite.name}'] = {}
    for test in suite.tests:
        suites[f'{suite.name}'][f'{test.name}'] = {}
        suites[f'{suite.name}'][f'{test.name}']['tags'] = []
        for tag in test.tags:
            suites[f'{suite.name}'][f'{test.name}']['tags'].append(tag)

suitesJson = json.dumps(suites)
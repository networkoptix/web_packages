import time
from pathlib import Path
import traceback
from browsers.chrome import test_in_chrome
from typing import Callable
from typing import Optional
from colorama import Fore


class Reporter:

    def __init__(self):
        self._started_at = time.monotonic()
        self._fails_count = 0
        self._failed_tests = []
        self._passes_count = 0
        self._passed_tests = []
        self._skipped_count = 0
        self._skipped_tests = []

    def pass_test(self, test_name, duration):
        self._passes_count += 1
        print(f'{Fore.GREEN}PASS____{test_name}{Fore.WHITE}')
        self._passed_tests.append(f'    {test_name}____{duration}')

    def fail_test(self, test_name):
        self._fails_count += 1
        print(f'{Fore.RED}FAIL____{test_name}{Fore.WHITE}')
        self._failed_tests.append(f'    {test_name}')

    def skip_test(self, test_name, msg):
        self._skipped_count += 1
        print(f'{Fore.YELLOW}SKIP____{test_name}{Fore.WHITE}')
        if msg is not None:
            print(msg)
        self._skipped_tests.append(f'    {test_name}')

    def finalize(self):
        duration = time.strftime("%H:%M:%S", time.gmtime(time.monotonic() - self._started_at))
        print(f'{Fore.RED}FAILS: {self._fails_count}')
        print(*self._failed_tests, sep="\n")
        print(f'{Fore.GREEN}PASSES: {self._passes_count}')
        print(*self._passed_tests, sep="\n")
        print(f'{Fore.YELLOW}SKIPS: {self._skipped_count}')
        print(*self._skipped_tests, sep="\n")
        print(f'{Fore.WHITE}TOTAL TESTS: {self._fails_count + self._passes_count}')
        print(f'RUN DURATION: {duration}')
        print(f"{Fore.BLUE}Scroll up to see the stack traces :)")


class Test:

    def __init__(self, reporter: Reporter, test_function: Callable, *args, **kwargs):
        self._callable = test_function
        self._reporter = reporter
        self._args = args
        self._kwargs = kwargs
        self._name = self._callable.__name__
        self._artifacts_dir = Path(f'artifacts/{self._name}_{str(time.time()).split(".")[0]}_')

    def run(self):
        started_at = time.monotonic()
        with test_in_chrome(self._artifacts_dir) as browser:
            try:
                self._callable(browser, *self._args, **self._kwargs)
            except Exception:
                self._reporter.fail_test(self._name)
                print(traceback.format_exc())
            else:
                duration = time.strftime("%H:%M:%S", time.gmtime(time.monotonic() - started_at))
                self._reporter.pass_test(self._name, duration)

    def skip(self, msg: Optional[str] = None):
        self._reporter.skip_test(self._name, msg)

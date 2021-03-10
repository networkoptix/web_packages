''' This will only run properly on Ubuntu for now due to Docker.
# You can run it on Windows or Mac but the Cloud-Merge tests will fail.'''

import datetime
import time
import functools
import queue
from threading import Thread
from os import system, path, getcwd
from get_names import get_threaded_names
from pabot.pabot import main as pabot
from robot import run_cli


ENVIRONMENT = "https://cloud-test.hdw.mx"
CUSTOMIZATION = "default"
LANGUAGE = "en_US"
OUTPUT_LOCATION = f"{getcwd()}/outputs"
loc = OUTPUT_LOCATION


def timer(func):
    ''' a simple decorator to print out actual run time.  
    Robot prints the total run time of each case which isn't real time spent running'''
    @functools.wraps(func)
    def wrapper_timer(*args, **kwargs):
        start_time = datetime.datetime.now()
        func(*args, **kwargs)
        run_time = datetime.datetime.now() - start_time
        print(run_time)
    return wrapper_timer

@timer
def threaded_test_run(output, language):
    system(
        "pabot "
        "--pabotlib "
        "--ordering " "order.txt "
        #"--loglevel", "trace",
        "-i " "threaded "
        "-e " "licenses "
        "-e " "merge "
        "-e " "customizations "
        "-v " f"ENV:{ENVIRONMENT} "
        "-v " f"SCREENSHOTDIRECTORY:{path.join(loc, 'combined-results')} "
        "-V " f"getvars.py:{CUSTOMIZATION}:{language} "
        "--output " "threaded.xml "
        "test-cases"
    )

    run_cli([
        #"--loglevel", "trace",
        "-v", f"ENV:{ENVIRONMENT}",
        "-v", f"SCREENSHOTDIRECTORY:{path.join(loc, 'combined-results')}",
        "-V", f"getvars.py:{CUSTOMIZATION}:{language}",
        "-e", "threaded",
        "-e", "merge",
        "-e", "licenses",
        "-e", "customizations",
        "--output", "serial.xml",
        "test-cases"
        ],
    exit=False)

    system(
        "rebot "
        "-o fullrun.xml "
        "-R threaded.xml serial.xml"
    )

if __name__ == '__main__':
    threaded_test_run(OUTPUT_LOCATION, LANGUAGE)

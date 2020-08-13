''' This will only run properly on Ubuntu for now due to Docker.
# You can run it on Windows or Mac but the Cloud-Merge tests will fail.'''

import datetime
import time
import functools
import queue
from threading import Thread
from os import system, path
from get_names import get_threaded_names


ENVIRONMENT = "https://cloud-test.hdw.mx"
CUSTOMIZATION = "default"
LANGUAGE = "en_US"
OUTPUT_LOCATION = "outputs"
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
        "--ordering order.txt "
        "--loglevel trace "
        "-i threaded "
        "-i threaded-file "
        "-e merge "
        "-e customizations "
        f"-v ENV:{ENVIRONMENT} "
        f"-v SCREENSHOTDIRECTORY:{path.join(loc, 'combined-results')} "
        f"-V getvars.py:{CUSTOMIZATION}:{language} "
        f"--output threaded.xml "
        "test-cases"
        )

    system(
        "robot "
        "--loglevel trace "
        f"-v ENV:{ENVIRONMENT} "
        f"-v SCREENSHOTDIRECTORY:{path.join(loc, 'combined-results')} "
        f"-V getvars.py:{CUSTOMIZATION}:{language} "
        "-e threaded "
        "-e threaded-file "
        "-e merge "
        "-e customizations "
        f"--output serial.xml "
        "test-cases"
        )
    
    system(
        "rebot "
        "-o fullrun.xml "
        "-R threaded.xml serial.xml"
    )

if __name__ == '__main__':
    threaded_test_run(OUTPUT_LOCATION, LANGUAGE)

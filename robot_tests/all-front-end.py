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

def threaded_test_run(output, language):
    system(
            "pabot "
            #"--testlevelsplit "
            "--ordering order.txt "
            "--loglevel trace "
            "-i threaded "
            "-e hm "
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
            "-e hm "
            f"--output serial.xml "
            "test-cases"
        )
    

if __name__ == '__main__':
    threaded_test_run(OUTPUT_LOCATION, LANGUAGE)

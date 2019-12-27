''' This will only run properly on Ubuntu for now due to Docker.
# You can run it on Windows or Mac but the Cloud-Merge tests will fail.'''

import datetime
import time
import functools
import queue
from threading import Thread
from os import system, path
from get_names import get_threaded_names


ENVIRONMENT = "https://cloud-dev3.hdw.mx"
CUSTOMIZATION = "dev3"
LANGUAGE = "en_US"
OUTPUT_LOCATION = "outputs"

CMD_LIST = []
# list of files that are going to be run as a whole file, but threaded
THREADABLE_FILE_LIST = (
    "activate", "cloud-merge", "register-form-validation", "login-form-validation",
    "change-pass-form-validation", "restore-pass-form-validation-email",
    "restore-pass-form-validation-password", "share-form-validation", 
    "ipvd-form-feedback-validation", "ipvd-form-request-validation")

TEST_LIST = list(set((test[0] for test in get_threaded_names("Threaded"))))

# Collect the list of tests that need to be run serially
# Note we do not use individual cases here and only want the files themselves.
# They will be filtered by excluding the "threaded" and "threaded file"
# tags and remove repeats.
SERIAL_LIST = list(set((test[0] for test in get_threaded_names("Unthreaded"))))


Q = queue.Queue(maxsize=0)
NUM_THREADS = 6


def do_stuff(cue):
    '''# actually runs the commands in the queue'''
    while True:
        system(cue.get())
        cue.task_done()



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
def threaded_test_run(loc, lang):

    ''' loop through the threadable tests and add a command to run each'''
    for idx, file in enumerate(TEST_LIST):
        output_name = f"{file}multi{str(idx)}"
        CMD_LIST.append(
            "robot "
            "--loglevel trace "
            "-i threaded "
            "-e 'Threaded File' "
            f"-v ENV:{ENVIRONMENT} "
            f"-v SCREENSHOTDIRECTORY:{path.join(loc, 'combined-results')} "
            f"-V getvars.py:{lang}:{CUSTOMIZATION} "
            f"--output {path.join(loc, output_name)}.xml "
            f"{path.join('test-cases', f'{file}.robot')} "
        )

    # loop through the threadable files and add a command to run each
    for idx, file in enumerate(THREADABLE_FILE_LIST):
        output_name = f"{file}multi{str(idx)}"
        CMD_LIST.append(
            "robot "
            "--loglevel trace "
            f"-v ENV:{ENVIRONMENT} "
            f"-v SCREENSHOTDIRECTORY:{path.join(loc, 'combined-results')} "
            f"-V getvars.py:{lang}:{CUSTOMIZATION} "
            f"--output {path.join(loc, output_name)}.xml " 
            f"{path.join('test-cases', f'{file}.robot')} "
        )

    # loop through the serial tests and run them
    for idx, file in enumerate(SERIAL_LIST):
        output_name = f"{file}multi{str(idx+200)}"
        system(
            "robot "
            "--loglevel trace "
            f"-v ENV:{ENVIRONMENT} "
            f"-v SCREENSHOTDIRECTORY:{path.join(loc, 'combined-results')} "
            f"-V getvars.py:{lang}:{CUSTOMIZATION} "
            "-e Threaded "
            "-e 'Threaded File' "
            f"--output {path.join(loc, output_name)}.xml "
            f"{path.join('test-cases', f'{file}.robot')}"
        )

    # fill the queue with all the commands
    for cmd in CMD_LIST:
        Q.put(cmd)

    # run and manage the threads
    for _ in range(NUM_THREADS):
        worker = Thread(target=do_stuff, args=(Q,))
        worker.setDaemon(True)
        worker.start()
        #due to a post request sent by a variable file,
        #we wait a second so we don't get bad responses from the server
        time.sleep(1)

    Q.join()

    # get the list of all file names
    # merge outputs with the same names to single outputs per file
    # merge single file outputs to one output file
    file_list = (test[0] for test in get_threaded_names(""))
    file_list = list(set(file_list))
    for idx, file in enumerate(file_list):
        system(
            'rebot ' 
            f"-o {path.join(loc, 'threadedRun'+str(idx))}.xml "
            f"-R {path.join(loc, file+'multi*')}.xml)"
        )

    system(
        "rebot --loglevel info -o queuedRun.xml "
        f"-N {lang} "
        f"{path.join(loc, 'threadedRun*')}.xml"
    )

if __name__ == '__main__':
    threaded_test_run(OUTPUT_LOCATION, LANGUAGE)

import logging
import time

logger = logging.getLogger(__name__)


def timer(func):

    def exec_foo(*args, **kwargs):
        start = time.time()
        res = func(*args, **kwargs)
        end = time.time()

        logger.info(
            f"Function: {func.__name__}\nArgs: {args}\nKwargs: {kwargs}\nelapsed time: {end - start}")

        return res
    return exec_foo


class Timer:
    def __init__(self, measure_name):
        self.measure_name = measure_name

    def __enter__(self):
        self.start_time = time.time()
        logger.info(f"Starting {self.measure_name}.".format(self.measure_name))
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.finish_time = time.time()
        logger.info(
            f"{self.measure_name} took {self.finish_time - self.start_time}")

    def elapsed_time(self):
        return self.finish_time - self.start_time

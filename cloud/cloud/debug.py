import structlog
import time

logger = structlog.getLogger(__name__)


def timer(func):

    def exec_foo(*args, **kwargs):
        start = time.time()
        res = func(*args, **kwargs)
        end = time.time()

        logger.info("function_timing", args=args, kwargs=kwargs, elapsed_time=end - start)

        return res
    return exec_foo


class Timer:
    def __init__(self, measure_name):
        self.measure_name = measure_name

    def __enter__(self):
        self.start_time = time.time()
        logger.info("measurement_start", measure_name=self.measure_name)
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.finish_time = time.time()
        logger.info("measurement_end", measure_name=self.measure_name, duration=self.finish_time - self.start_time)

    def elapsed_time(self):
        return self.finish_time - self.start_time

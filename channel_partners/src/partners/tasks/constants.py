from enum import StrEnum


class ReportTaskState(StrEnum):
    success = 'success'
    failed = 'failed'
    pending = 'pending'

    @classmethod
    def states(cls):
        return list(map(lambda c: c.value, cls))

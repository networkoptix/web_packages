import logging
from typing import (
    List,
    Optional,
    Set,
    Union,
)


class ExcludeEventsFilter(logging.Filter):
    def __init__(self, excluded_event_type: Optional[Union[Set[str], List[str]]] = None) -> None:
        super().__init__()
        self.excluded_event_type = excluded_event_type

    def filter(self, record: logging.LogRecord) -> bool:
        if not isinstance(record.msg, dict) or self.excluded_event_type is None:
            # Include the log message if msg is not a dictionary or excluded_event_type is not provided
            return True

        if record.msg.get('event') in self.excluded_event_type:
            # Exclude the log message
            return False
        # Include the log message
        return True

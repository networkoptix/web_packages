import logging

import structlog


# Define the new logging level and its numerical value
ELEVATED_DEBUG_LEVEL = 15
logging.addLevelName(ELEVATED_DEBUG_LEVEL, "ELEVATED_DEBUG")


def elevated_debug(self, message, *args, **kwargs):
    if self.isEnabledFor(ELEVATED_DEBUG_LEVEL):
        self._log(ELEVATED_DEBUG_LEVEL, message, args, **kwargs)


logging.Logger.elevated_debug = elevated_debug
structlog.stdlib.NAME_TO_LEVEL["elevated_debug"] = ELEVATED_DEBUG_LEVEL


class CustomBoundLogger(structlog.stdlib.BoundLogger):
    def elevated_debug(self, event=None, **kw):
        """
        Log 'event' with level ELEVATED_DEBUG.
        """
        return self._proxy_to_logger("elevated_debug", event, **kw)

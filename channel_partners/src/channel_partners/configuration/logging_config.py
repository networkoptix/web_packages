import logging
from typing import (
    Dict,
    Literal,
)

import structlog


LOGGER_ROOT_NAME = ""
LOGGER_STRUCTLOG_NAME = "django_structlog"


def configure_logging(environment: Literal["local", "ci", "prod"], min_level: int) -> Dict:
    logging.basicConfig(level=min_level)

    loggers = {
        "version": 1,
        "disable_existing_loggers": True,
        "formatters": {
            "json_formatter": {
                "()": structlog.stdlib.ProcessorFormatter,
                "processor": structlog.processors.JSONRenderer(),
                "foreign_pre_chain": [
                    structlog.contextvars.merge_contextvars,
                    structlog.processors.TimeStamper(fmt="iso"),
                    structlog.stdlib.add_logger_name,
                    structlog.stdlib.add_log_level,
                    structlog.stdlib.PositionalArgumentsFormatter(),
                    structlog.processors.CallsiteParameterAdder(
                        {
                            structlog.processors.CallsiteParameter.FILENAME,
                            structlog.processors.CallsiteParameter.FUNC_NAME,
                            structlog.processors.CallsiteParameter.LINENO,
                        }
                    ),
                ],
            },
            "plain_console": {
                "()": structlog.stdlib.ProcessorFormatter,
                "processor": structlog.dev.ConsoleRenderer(colors=True),
                "foreign_pre_chain": [
                    structlog.contextvars.merge_contextvars,
                    structlog.processors.TimeStamper(fmt="iso"),
                    structlog.stdlib.add_logger_name,
                    structlog.stdlib.add_log_level,
                    structlog.stdlib.PositionalArgumentsFormatter(),
                    structlog.processors.CallsiteParameterAdder(
                        {
                            structlog.processors.CallsiteParameter.FILENAME,
                            structlog.processors.CallsiteParameter.FUNC_NAME,
                            structlog.processors.CallsiteParameter.LINENO,
                        }
                    ),
                ],
            }
        },
        "filters": {
            "exclude_request_started": {
                "()": "channel_partners.logging.logging_filters.ExcludeEventsFilter",
                'excluded_event_type': ['request_started']  # <- Example excluding request_started event
            },
            "drop_debug_logs": {
                "()": "channel_partners.logging.middleware.DebugLevelFilter",
                'level': min_level
            }
        },
        "handlers": {
            "console": {
                "class": "logging.StreamHandler",
                "formatter": "plain_console",
                'filters': ['exclude_request_started', 'drop_debug_logs']
            },
            "console_json": {
                "class": "logging.StreamHandler",
                "formatter": "json_formatter",
                'filters': ['exclude_request_started', 'drop_debug_logs']
            }
        },
        "loggers": {
            LOGGER_ROOT_NAME: {
                "handlers": ["console" if environment == "local" else "console_json"],
                "level": min_level,
                "filters": ["drop_debug_logs"]
            },
            LOGGER_STRUCTLOG_NAME: {
                "handlers": ["console" if environment == "local" else "console_json"],
                "level": min_level,
                "filters": ["drop_debug_logs"]
            }
        }
    }
    return loggers

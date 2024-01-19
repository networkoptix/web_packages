import os
from logging.handlers import RotatingFileHandler
from typing import Literal

import structlog


LOGS_DIRECTORY: str = "logs"


def configure_logging(environment: Literal["local", "ci", "prod"]):
    # Configure structlog to wrap the loggers with a stdlib Logger
    base_structlog_processors = [
        structlog.contextvars.merge_contextvars,
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.UnicodeDecoder(),
        structlog.processors.CallsiteParameterAdder(
            {
                structlog.processors.CallsiteParameter.FILENAME,
                structlog.processors.CallsiteParameter.FUNC_NAME,
                structlog.processors.CallsiteParameter.LINENO,
            }
        ),
    ]

    base_structlog_formatter = [structlog.stdlib.ProcessorFormatter.wrap_for_formatter]

    structlog.configure(
        processors=base_structlog_processors + base_structlog_formatter,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )

    if environment in ["ci", "prod"]:
        return {
            "version": 1,
            "disable_existing_loggers": False,
            "formatters": {
                "json_formatter": {
                    "()": structlog.stdlib.ProcessorFormatter,
                    "processor": structlog.processors.JSONRenderer(),
                    'foreign_pre_chain': base_structlog_processors,
                }
            },
            "handlers": {
                "null": {
                    "class": "logging.NullHandler",
                },
                "console": {
                    "class": "logging.StreamHandler",
                    "formatter": "json_formatter",
                }
            },
            "loggers": {
                # Use structlog middleware
                "django.server": {
                    "handlers": ["null"],
                    "propagate": False,
                },
                # Use structlog middleware
                "django.request": {
                    "handlers": ["null"],
                    "propagate": False,
                },
                # Use structlog middleware
                "werkzeug": {
                    "handlers": ["null"],
                    "propagate": False,
                },
                "django_structlog": {
                    "handlers": ["console"],
                    "level": "INFO",
                },
                "channel_partners": {
                    "handlers": ["console"],
                    "level": "INFO",
                },
                "accounts": {
                    "handlers": ["console"],
                    "level": "INFO",
                },
                "partners": {
                    "handlers": ["console"],
                    "level": "INFO",
                },
                "utils": {
                    "handlers": ["console"],
                    "level": "INFO",
                },
                "tools": {
                    "handlers": ["console"],
                    "level": "INFO",
                },
            }
        }
    elif environment == "local":
        if not os.path.exists(LOGS_DIRECTORY):
            os.makedirs(LOGS_DIRECTORY)
            print("Directory created at", LOGS_DIRECTORY)
        else:
            print("Directory already exists at", LOGS_DIRECTORY)

        return {
            "version": 1,
            "disable_existing_loggers": False,
            "formatters": {
                "json_formatter": {
                    "()": structlog.stdlib.ProcessorFormatter,
                    "processor": structlog.processors.JSONRenderer(),
                    'foreign_pre_chain': base_structlog_processors,
                },
                "plain_console": {
                    "()": structlog.stdlib.ProcessorFormatter,
                    "processor": structlog.dev.ConsoleRenderer(colors=True),
                    'foreign_pre_chain': base_structlog_processors,
                },
                "key_value": {
                    "()": structlog.stdlib.ProcessorFormatter,
                    "processor": structlog.processors.KeyValueRenderer(
                        key_order=['timestamp', 'level', 'event', 'logger']),
                    'foreign_pre_chain': base_structlog_processors,
                },
            },
            "handlers": {
                "null": {
                    "class": "logging.NullHandler",
                },
                "console": {
                    "class": "logging.StreamHandler",
                    "formatter": "plain_console",
                },
                "json_file": {
                    "()": RotatingFileHandler,
                    "filename": os.path.join(LOGS_DIRECTORY, 'json.log'),
                    "maxBytes": 10 * 1024 * 1024,  # 10 MB in bytes
                    "backupCount": 0,
                    "formatter": "json_formatter",
                },
                "flat_line_file": {
                    "()": RotatingFileHandler,
                    "filename": os.path.join(LOGS_DIRECTORY, 'flat_line.log'),
                    "maxBytes": 10 * 1024 * 1024,  # 10 MB in bytes
                    "backupCount": 0,
                    "formatter": "key_value",
                },
            },
            "loggers": {
                # DB logs
                "django.db.backends": {
                    "level": "INFO",
                },
                # Use structlog middleware
                "django.server": {
                    "handlers": ["null"],
                    "propagate": False,
                },
                # Use structlog middleware
                "django.request": {
                    "handlers": ["null"],
                    "propagate": False,
                },
                # Use structlog middleware
                "werkzeug": {
                    "handlers": ["null"],
                    "propagate": False,
                },
                "channel_partners": {
                    "handlers": ["console", "flat_line_file", "json_file"],
                    "level": "INFO",
                },
                "accounts": {
                    "handlers": ["console", "flat_line_file", "json_file"],
                    "level": "INFO",
                },
                "partners": {
                    "handlers": ["console", "flat_line_file", "json_file"],
                    "level": "INFO",
                },
                "utils": {
                    "handlers": ["console", "flat_line_file", "json_file"],
                    "level": "INFO",
                },
                "tools": {
                    "handlers": ["console", "flat_line_file", "json_file"],
                    "level": "INFO",
                },
                "django_structlog": {
                    "handlers": ["console", "flat_line_file", "json_file"],
                    "level": "INFO",
                },
            }
        }

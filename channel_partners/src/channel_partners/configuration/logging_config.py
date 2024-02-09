import logging
from typing import (
    Dict,
    Literal,
)

import structlog


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
        "handlers": {
            "console": {
                "class": "logging.StreamHandler",
                "formatter": "plain_console",
            },
            "console_json": {
                "class": "logging.StreamHandler",
                "formatter": "json_formatter",
            }
        },
        "loggers": {
            "": {
                "handlers": ["console" if environment == "local" else "console_json"],
                "level": logging.getLevelName(min_level),
            },
            "django_strutlog": {
                "handlers": ["console" if environment == "local" else "console_json"],
                "level": logging.getLevelName(min_level),
            }
        }
    }
    return loggers

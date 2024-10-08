import structlog
from typing import Dict

import logging


def configure_logging(log_level) -> Dict:
    logging.basicConfig(level=log_level)

    loggers = {
        "version": 1,
        "disable_existing_loggers": True,  # Think about this
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
                    structlog.processors.format_exc_info,
                    structlog.processors.StackInfoRenderer(),
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
                    structlog.processors.format_exc_info,
                    structlog.processors.StackInfoRenderer(),
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
                "()": "cloud.cloud_logging.filters.ExcludeEventsFilter",
                'excluded_event_type': ['request_started']
            }
        },
        "handlers": {
            "console": {
                "class": "logging.StreamHandler",
                "formatter": "plain_console",
                'filters': ['exclude_request_started', ]
            },
            "console_json": {
                "class": "logging.StreamHandler",
                "formatter": "json_formatter",
                'filters': ['exclude_request_started', ]
            },
        },
        "loggers": {
            '': {  # default settings for all django loggers
                'level': log_level,
                'propagate': False,
                'handlers': ['console']
            },
            "django_structlog": {
                'level': log_level,
                'handlers': ['console']
            },
            'django.security.csrf': {
                'level': 'ERROR',
                'propagate': False,
                'handlers': ['console']
            },
            'api.views.account': {
                'level': 'CRITICAL',
                'propagate': False,
                'handlers': ['console']
            }
        },
    }

    return loggers

# Prior Configuration
# {
#     'version': 1,
#     'disable_existing_loggers': False,
#     'filters': {
#         'downgrade_requests': {
#             '()': 'django.utils.log.CallbackFilter',
#             'callback': downgrade_requests
#         }
#     },
#     'formatters': {
#         'verbose': {
#             'format': '[%(levelname)s] %(asctime)s %(module)s %(process)d %(thread)d %(message)s'
#         },
#         'simple': {
#             'format': '[%(levelname)s] %(message)s'
#         },
#     },
#     'handlers': {
#         'console': {
#             'level': 'DEBUG',
#             'class': 'logging.StreamHandler',
#             'filters': ['downgrade_requests'],
#             'formatter': 'verbose'
#         },
#         'mail_admins': {
#             'level': 'CRITICAL',
#             'class': 'cloud.logger.LimitAdminEmailHandler',
#             'formatter': 'simple'
#         },
#     },
#     'loggers': {
#         '': {  # default settings for all django loggers
#             'level': LOG_LEVEL,
#             'propagate': True,
#             'handlers': ['console']
#         },
#         'django.security.csrf': {
#             'level': 'ERROR',
#             'propagate': False,
#             'handlers': ['console']
#         },
#         'api.views.utils': {
#             'level': LOG_LEVEL,
#             'propagate': False,
#             'handlers': ['console']
#         },
#         'cloud.helpers.exceptions': {
#             'level': LOG_LEVEL,
#             'propagate': False,
#             'handlers': ['console']
#         },
#         'cloud.controllers.cloud_gateway': {
#             'level': LOG_LEVEL,
#             'propagate': False,
#             'handlers': ['console']
#         },
#         'notifications.tasks': {
#             'level': LOG_LEVEL,
#             'propagate': False,
#             'handlers': ['console']
#         },
#         'api.account_backend': {  # explicitly mention all modules with loggers
#             'level': LOG_LEVEL,
#             'propagate': False,
#             'handlers': ['console']
#         },
#         'cms.controllers.cloud_api': {
#             'level': LOG_LEVEL,
#             'propagate': False,
#             'handlers': ['console']
#         },
#         'api.views.account': {
#             'level': 'CRITICAL',
#             'propagate': False,
#             'handlers': ['console']
#         },
#         'cms.controllers.filldata': {
#             'level': LOG_LEVEL,
#             'propagate': False,
#             'handlers': ['console']
#         }
#     }
# }

import logging
import logging.config
from uuid import uuid4

import structlog
from hypercorn.logging import AccessLogAtoms
from quart import Quart, request, g

"""
| Attribute | Value                          | Description                                                     |
|-----------|--------------------------------|-----------------------------------------------------------------|
| `h`       | `127.0.0.1:62161`              | The host and port number of the client making the request       |
| `l`       | `-`                            | The remote user name obtained through identd (usually `-`)      |
| `t`       | `[18/Sep/2024:15:59:42 -0700]` | The time the request was received                               |
| `r`       | `GET /test 1.1`                | The full request line from the client                           |
| `R`       | `GET /test 1.1`                | The raw request line                                            |
| `s`       | `200`                          | The HTTP status code returned to the client                     |
| `st`      | `OK`                           | The status text (reason phrase) associated with the status code |
| `S`       | `http`                         | The scheme used for the request (`http` or `https`)             |
| `m`       | `GET`                          | The HTTP method used for the request                            |
| `U`       | `/test`                        | The URL path of the requested resource                          |
| `Uq`      | `/test`                        | The URL path with query string of the requested resource        |
| `q`       | ` `                            | The query string part of the URL (empty in this case)           |
| `H`       | `1.1`                          | The HTTP protocol version                                       |
| `b`       | `2`                            | The number of bytes sent in the response body (without headers) |
| `B`       | `2`                            | The number of bytes sent in the response, including headers     |
| `f`       | `-`                            | The referer header from the request (often `-` if not provided) |
| `a`       | `curl/8.1.2`                   | The `User-Agent` header from the request                        |
| `T`       | `0`                            | The time taken to serve the request, in seconds                 |
| `D`       | `8424`                         | The time taken to serve the request, in microseconds            |
| `L`       | `0.008424`                     | The time taken to serve the request, in seconds as a float      |
| `p`       | `<6973>`                       | The process ID of the server handling the request               |
"""

REQUEST_EVENTS = {'request_finished', 'request_failed'}


def clear_loggers():
    """
    Clear all loggers except the root logger.
    
    Rational: By removing the filters, handlers, and setting propagate to True, we can ensure that any of the loggers
    will not do any filtering, transforming, or formatting of the log records. This will allow the root logger to handle
    the log records and apply the configured handlers and formatters.
    
    """
    root_logger = logging.getLogger()

    for name, logger in logging.root.manager.loggerDict.items():
        # Ignore placeholder loggers, these are used internally by the logging module and are not actual loggers
        if isinstance(logger, logging.PlaceHolder):
            # Skip PlaceHolder objects
            continue

        if logger == root_logger:
            continue

        logger.handlers.clear()
        logger.filters.clear()
        logger.propagate = True


class CustomProcessorFormatter(structlog.stdlib.ProcessorFormatter):
    """
    Custom formatter to process Quart access logs using structlog.
    The formatter is designed to extract specific attributes from AccessLogAtoms.
    """

    def format(self, record: logging.LogRecord) -> str:
        if isinstance(record.args, AccessLogAtoms):
            atoms = record.args
            event_dict = {
                'host': atoms.get('h', None),
                'status': atoms.get('s', None),
                'method': atoms.get('m', None),
                'path': atoms.get('U', None),
                'query_params': atoms.get('q', None),
                'response_size': atoms.get('b', None),
                'request_duration_ms': round(float(atoms.get('D', 0)) * 0.001, 2)
            }

            # Set extra attributes on the record
            for key, value in event_dict.items():
                setattr(record, key, value)

            # Set the message to request_finished or request_failed
            record.msg = "request_finished" if 200 <= int(atoms.get('s', 0)) < 500 else "request_failed"
            record.args = None
        return super().format(record)


def add_custom_context(logger, method_name, event_dict):
    event = event_dict.get('event')
    if event in REQUEST_EVENTS:
        record = event_dict.get('_record')
        if record:
            for attr in ['host', 'status', 'method', 'path', 'query_params', 'response_size', 'request_duration_ms']:
                event_dict[attr] = getattr(record, attr, None)
        return event_dict
    return event_dict


def remove_LocalQueueHandler(app) -> None:
    """
    Remove the LocalQueueHandler from the logger handlers and must be
    called inside @app.before_serving decorated function.
    """
    from quart.logging import LocalQueueHandler
    app.logger.handlers = [h for h in app.logger.handlers if not isinstance(h, LocalQueueHandler)]


def configure_logging(app: Quart):
    """Setup root logger to use structlog with JSON formatting."""
    logging_config = {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "json_formatter": {
                "()": CustomProcessorFormatter,
                "processor": structlog.processors.JSONRenderer(),
                "foreign_pre_chain": [
                    structlog.contextvars.merge_contextvars,
                    structlog.processors.TimeStamper(fmt="iso"),
                    structlog.stdlib.add_logger_name,
                    structlog.stdlib.add_log_level,
                    structlog.stdlib.PositionalArgumentsFormatter(),
                    structlog.processors.format_exc_info,
                    structlog.processors.StackInfoRenderer(),
                    add_custom_context,
                    structlog.processors.CallsiteParameterAdder(
                        {
                            structlog.processors.CallsiteParameter.FILENAME,
                            structlog.processors.CallsiteParameter.FUNC_NAME,
                            structlog.processors.CallsiteParameter.LINENO,
                        }
                    )
                ],
            },
            "plain_console": {
                "()": CustomProcessorFormatter,
                "processor": structlog.dev.ConsoleRenderer(colors=True),
                "foreign_pre_chain": [
                    structlog.contextvars.merge_contextvars,
                    structlog.processors.TimeStamper(fmt="iso"),
                    structlog.stdlib.add_logger_name,
                    structlog.stdlib.add_log_level,
                    structlog.stdlib.PositionalArgumentsFormatter(),
                    structlog.processors.format_exc_info,
                    structlog.processors.StackInfoRenderer(),
                    add_custom_context,
                    structlog.processors.CallsiteParameterAdder(
                        {
                            structlog.processors.CallsiteParameter.FILENAME,
                            structlog.processors.CallsiteParameter.FUNC_NAME,
                            structlog.processors.CallsiteParameter.LINENO,
                        }
                    )
                ],
            }
        },
        "filters": {},
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
                "handlers": ["console"] if app.config.get("ENV") == 'development' else ["console_json"],
                "level": "DEBUG"
            },
        }
    }

    logging.config.dictConfig(logging_config)


def setup_logging(app: Quart) -> None:
    configure_logging(app)
    remove_LocalQueueHandler(app)

    @app.before_request
    async def before_request() -> None:
        structlog.contextvars.clear_contextvars()
        x_amzn_trace_id = request.headers.get('X-Amzn-Trace-Id', None)
        x_request_id = request.headers.get('X-Request-Id', str(uuid4()))
        x_forwarded_for = request.headers.get('X-Forwarded-For', None)

        # Bind the request context to the logger
        structlog.contextvars.bind_contextvars(
            x_forwarded_for=x_forwarded_for,
            x_amzn_trace_id=x_amzn_trace_id,
            request_id=x_request_id,

        )

        g.x_request_id = x_request_id
        g.x_amzn_trace_id = x_amzn_trace_id

    @app.after_request
    async def after_request(response) -> None:
        # Log the request duration
        response.headers['X-Request-ID'] = g.x_request_id
        response.headers['X-Amzn-Trace-Id'] = g.x_amzn_trace_id

        return response

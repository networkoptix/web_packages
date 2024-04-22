import structlog
from django.core.cache import caches
from django.dispatch import receiver
from django.http import HttpRequest
from django_structlog import signals

from channel_partners.utils import standardize_path


"""
Initially attempted to place into logging_config.py, but it was causing multiple tests to fail. 

The resolution was to move this receiver to a separate file and now all works as expected.
"""


# TODO: Add response time to these
# @receiver(signals.bind_extra_request_failed_metadata)
# @receiver(signals.bind_extra_request_finished_metadata)
# ------------------------------------------------------ #


@receiver(signals.bind_extra_request_metadata)
def bind_additional_request_metadata(request: HttpRequest, logger, **kwargs):
    """
    Binds additional request metadata to the structlog context for logging purposes.
    Adds 'cloud_host' and 'clean_path' variables to the structlog context.

    :param request: The HTTP request object.
    :type request: HttpRequest
    :param logger: The logger object (unused).
    :param kwargs: Additional keyword arguments (unused).
    """
    normalized_path: str = standardize_path(request.path)
    group_tag = caches['local'].get(normalized_path, None)

    structlog.contextvars.bind_contextvars(
        path=request.path,
        normalized_path=normalized_path,
        method=request.method,
        group_tag=group_tag
    )

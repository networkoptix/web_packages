import traceback
from concurrent.futures import ThreadPoolExecutor
from contextvars import ContextVar, copy_context
from functools import wraps

from django.conf import settings
from django.db import close_old_connections
from django.utils.deprecation import MiddlewareMixin

from cloud.helpers.exceptions import APIInternalException, ErrorCodes

customization_ctx = ContextVar('customization_ctx', default=None)
hostname_ctx = ContextVar('hostname_ctx', default=None)


class CustomizationCtxMiddleware(MiddlewareMixin):
    def process_request(self, request):
        customization = getattr(request, 'CUSTOMIZATION', None)
        customization_ctx.set(customization)
        if customization:
            # ensure that the customization is found by the hostname
            hostname_ctx.set(request.get_host().split(':')[0].lower())


class ContextExecutor(ThreadPoolExecutor):

    def __init__(self, max_workers=None, thread_name_prefix='', initargs=()):
        self.context = copy_context()
        super().__init__(max_workers=max_workers, initializer=self._set_inner_context,
                         thread_name_prefix=thread_name_prefix, initargs=initargs)

    def _set_inner_context(self):
        for var, val in self.context.items():
            var.set(val)

    def submit(self, fn, *args, **kwargs):
        def wrap(*wargs, **wkwargs):
            close_old_connections()
            try:
                return fn(*wargs, **wkwargs)
            finally:
                close_old_connections()

        return super().submit(wrap, *args, **kwargs)


def needs_customization_ctx(key='customization', set_context: bool = True):
    """
    Checks keyword arguments for presented customization name and set ContextVar.
    :param func: decorated function.
    :param key: customization keyword, default `customization`.
    :param set_context: ensure ContextVar customization_ctx is set. default `True`.
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            if not kwargs.get(key):
                raise APIInternalException(
                    f'No customization given in {func.__module__}.{func.__name__}', error_code=ErrorCodes.no_customization_given
                )
            if set_context:
                if not customization_ctx.get():
                    customization_ctx.set(kwargs.get(key))
            return func(*args, **kwargs)
        return wrapper

    return decorator


def is_metavms(request=None) -> bool:
    customization = getattr(request, 'CUSTOMIZATION', None) or customization_ctx.get()
    return customization == settings.META_CUSTOMIZATION

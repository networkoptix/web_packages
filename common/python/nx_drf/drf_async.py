from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from asgiref.sync import sync_to_async
import asyncio
import types


def async_api_view(http_method_names=None):
    """
    Decorator that converts a function-based view into an AsyncAPIView subclass.
    Takes a list of allowed methods for the view as an argument.
    """
    http_method_names = ['GET'] if (http_method_names is None) else http_method_names

    def decorator(func):

        WrappedAsyncAPIView = type(
            'WrappedAsyncAPIView',
            (AsyncAPIView,),
            {'__doc__': func.__doc__}
        )

        # Note, the above allows us to set the docstring.
        # It is the equivalent of:
        #
        #     class WrappedAsyncAPIView(AsyncAPIView):
        #         pass
        #     WrappedAsyncAPIView.__doc__ = func.doc    <--- Not possible to do this

        # api_view applied without (method_names)
        assert not(isinstance(http_method_names, types.FunctionType)), \
            '@api_view missing list of allowed HTTP methods'

        # api_view applied with eg. string instead of list of strings
        assert isinstance(http_method_names, (list, tuple)), \
            '@api_view expected a list of strings, received %s' % type(http_method_names).__name__

        allowed_methods = set(http_method_names) | {'options'}
        WrappedAsyncAPIView.http_method_names = [method.lower() for method in allowed_methods]

        view_is_async = asyncio.iscoroutinefunction(func)

        if view_is_async:
            async def handler(self, *args, **kwargs):
                return await func(*args, **kwargs)
        else:
            def handler(self, *args, **kwargs):
                return func(*args, **kwargs)

        for method in http_method_names:
            setattr(WrappedAsyncAPIView, method.lower(), handler)

        WrappedAsyncAPIView.__name__ = func.__name__
        WrappedAsyncAPIView.__module__ = func.__module__

        WrappedAsyncAPIView.renderer_classes = getattr(func, 'renderer_classes',
                                                  AsyncAPIView.renderer_classes)

        WrappedAsyncAPIView.parser_classes = getattr(func, 'parser_classes',
                                                AsyncAPIView.parser_classes)

        WrappedAsyncAPIView.authentication_classes = getattr(func, 'authentication_classes',
                                                        AsyncAPIView.authentication_classes)

        WrappedAsyncAPIView.throttle_classes = getattr(func, 'throttle_classes',
                                                  AsyncAPIView.throttle_classes)

        WrappedAsyncAPIView.permission_classes = getattr(func, 'permission_classes',
                                                    AsyncAPIView.permission_classes)

        WrappedAsyncAPIView.schema = getattr(func, 'schema',
                                        AsyncAPIView.schema)

        return WrappedAsyncAPIView.as_view()

    return decorator


class AsyncAPIView(APIView):
    def sync_dispatch(self, request, *args, **kwargs):
        """
        `.sync_dispatch()` is pretty much the same as Django's regular dispatch,
        but with extra hooks for startup, finalize, and exception handling.
        """
        self.args = args
        self.kwargs = kwargs
        request = self.initialize_request(request, *args, **kwargs)
        self.request = request
        self.headers = self.default_response_headers  # deprecate?

        try:
            self.initial(request, *args, **kwargs)

            # Get the appropriate handler method
            if request.method.lower() in self.http_method_names:
                handler = getattr(self, request.method.lower(),
                                  self.http_method_not_allowed)
            else:
                handler = self.http_method_not_allowed

            response = handler(request, *args, **kwargs)

        except Exception as exc:
            response = self.handle_exception(exc)

        self.response = self.finalize_response(request, response, *args, **kwargs)
        return self.response

    async def async_dispatch(self, request, *args, **kwargs):
        """
        `.async_dispatch()` is pretty much the same as Django's regular dispatch,
        except for awaiting the handler function and with extra hooks for startup,
        finalize, and exception handling.
        """
        self.args = args
        self.kwargs = kwargs
        request = self.initialize_request(request, *args, **kwargs)
        self.request = request
        self.headers = self.default_response_headers  # deprecate?

        try:
            await sync_to_async(self.initial)(request, *args, **kwargs)

            # Get the appropriate handler method
            if request.method.lower() in self.http_method_names:
                handler = getattr(self, request.method.lower(),
                                  self.http_method_not_allowed)
            else:
                handler = self.http_method_not_allowed

            response = await handler(request, *args, **kwargs)

        except Exception as exc:
            response = self.handle_exception(exc)

        self.response = self.finalize_response(request, response, *args, **kwargs)
        return self.response

    def dispatch(self, request, *args, **kwargs):
        """
        Dispatch checks if the view is async or not and uses the respective
        async or sync dispatch method.
        """
        if getattr(self, 'view_is_async', False):
            return self.async_dispatch(request, *args, **kwargs)
        else:
            return self.sync_dispatch(request, *args, **kwargs)

    def options(self, request, *args, **kwargs):
        """
        Handler method for HTTP 'OPTIONS' request.
        """
        def func():
            if self.metadata_class is None:
                return self.http_method_not_allowed(request, *args, **kwargs)
            data = self.metadata_class().determine_metadata(request, self)
            return Response(data, status=status.HTTP_200_OK)

        if getattr(self, 'view_is_async', False):
            async def handler():
                return await sync_to_async(func)()
        else:
            def handler():
                return func()
        return handler()

import traceback
import logging

from django.conf import settings
from django.http import HttpResponse
from django.shortcuts import redirect
from rest_framework import status

logger = logging.getLogger(__name__)


class CatchExceptionMiddleware(object):
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        return self.get_response(request)

    @staticmethod
    def process_exception(request, exception):
        logging.info(request)
        stack_trace = traceback.format_exc().replace("Traceback", "")
        logging.critical(
            f"{exception.__class__.__name__}: {exception}\nCall Stack:\n{stack_trace}")
        if not settings.DEBUG:
            return HttpResponse("Error with request", status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class HeaderMiddleware(object):
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        referer = request.headers.get('Referer')
        # If the http_referer has embed in it then we have to remove samesite from the cookies.
        if referer and "embed" in referer and response.cookies:
            cookies = response.cookies
            for key in cookies.keys():
                cookies[key]["samesite"] = ""
            response.cookies.update(cookies)
        return response


class FilterErrorMiddleware(object):
    # Redirects if user enters a filter querystring that causes a database error
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        if request.path_info.startswith('/admin') and hasattr(response, 'template_name'):
            if type(response.template_name) == list:
                template_name = response.template_name[0]
            else:
                template_name = response.template_name
            if template_name and 'invalid_setup' in template_name:
                return redirect(request.path_info + '?e=1')

        return response

class CachedMiddleware(object):
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        if request.GET.get('cached', False):
            response['Vary'] = 'customization'
        return response

import traceback
import logging

from django.conf import settings
from django.utils.deprecation import MiddlewareMixin
from django.http import HttpResponse
from django.shortcuts import redirect
from rest_framework import status

from util.helpers import get_customization_name_from_cloud_host

logger = logging.getLogger(__name__)


class CatchExceptionMiddleware(MiddlewareMixin):
    @staticmethod
    def process_exception(request, exception):
        logging.info(request)
        stack_trace = traceback.format_exc().replace("Traceback", "")
        logging.critical(
            f"{exception.__class__.__name__}: {exception}\nCall Stack:\n{stack_trace}")
        if not settings.DEBUG:
            return HttpResponse("Error with request", status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class HeaderMiddleware(MiddlewareMixin):
    def process_response(self, request, response):
        referer = request.headers.get('Referer')
        # If the http_referer has embed in it then we have to remove samesite from the cookies.
        if referer and "embed" in referer and response.cookies:
            cookies = response.cookies
            for key in cookies.keys():
                cookies[key]["samesite"] = ""
            response.cookies.update(cookies)
        return response


class FilterErrorMiddleware(MiddlewareMixin):
    # Redirects if user enters a filter querystring that causes a database error
    def process_response(self, request, response):
        if request.path_info.startswith('/admin') and hasattr(response, 'template_name'):
            if type(response.template_name) == list:
                template_name = response.template_name[0]
            else:
                template_name = response.template_name
            if template_name and 'invalid_setup' in template_name:
                return redirect(request.path_info + '?e=1')

        return response


class CachedMiddleware(MiddlewareMixin):
    def process_response(self, request, response):
        if request.GET.get('cached', False):
            response['Vary'] = 'customization'
        return response


class CustomizationMiddleware(MiddlewareMixin):
    def process_request(self, request):
        host = request.get_host()
        # If local set customization name from setting
        if host.startswith('localhost') and settings.LOCAL_CUSTOMIZATION:
            customization_name = settings.LOCAL_CUSTOMIZATION
        else:
            customization_name = get_customization_name_from_cloud_host(host)

        request.META['CUSTOMIZATION'] = customization_name
        request.CUSTOMIZATION = customization_name

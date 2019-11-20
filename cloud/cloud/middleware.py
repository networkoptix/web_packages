import traceback
from django.conf import settings
from django.http import HttpResponse
from rest_framework import status

import logging
logger = logging.getLogger(__name__)


class CatchExceptionMiddleware(object):
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        return self.get_response(request)

    @staticmethod
    def process_exception(request, exception):
        logging.info(request)
        logging.critical("{}: {}\nCall Stack:\n{}".format(exception.__class__.__name__,
                                                          exception,
                                                          traceback.format_exc().replace("Traceback", "")))
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

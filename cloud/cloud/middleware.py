import traceback
import logging

import waffle
from django.conf import settings
from django.contrib.auth import logout
from django.urls import reverse_lazy
from django.utils.deprecation import MiddlewareMixin
from django.http import HttpResponse, JsonResponse
from django.shortcuts import redirect
from rest_framework import status
from django.http import HttpRequest
from rest_framework.renderers import JSONRenderer

from cloud.helpers.exceptions import (
    APIInternalException, ErrorCodes, api_success,
)
from cms.feature_flags import FLAGS, flag_is_active_for_user
from cms.views.agreement import check_required_tos
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


class CookieMonsterMiddleware(MiddlewareMixin):
    """
    Middleware that removes the session cookie from the request if the csrftoken is missing.
    This seems to happen when there's a cloud outage and the csrftoken goes missing.
    Refer to CLOUD-11854
    """
    @staticmethod
    def process_request(request):
        cookies = request.COOKIES
        if 'loginCode' in request.path_info and 'csrftoken' not in cookies and 'sessionid' in cookies:
            logout(request)


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
    # Todo. Add tests in QA for health checks
    health_checks = [
        reverse_lazy('health_migrations'),
        reverse_lazy('notification_health_email'),
        reverse_lazy('notification_health_push'),
    ]

    def process_request(self, request):
        host = request.get_host()
        # If local set customization name from setting
        if host.startswith('localhost') and settings.LOCAL_CUSTOMIZATION or settings.LOCAL_ENVIRONMENT:
            customization_name = settings.LOCAL_CUSTOMIZATION
        else:
            customization_name = get_customization_name_from_cloud_host(host)
        if not customization_name and request.path not in self.health_checks:
            raise APIInternalException(f'Cannot determine customization for host "{host}".',
                                       error_code=ErrorCodes.wrong_parameters)
        request.META['CUSTOMIZATION'] = customization_name
        request.CUSTOMIZATION = customization_name


class TOSAgreementMiddleware(MiddlewareMixin):
    EXCLUDE_ENDPOINTS = [
        '',
        '/',
        reverse_lazy('get_agreement'),
        reverse_lazy('accept_agreement'),
        reverse_lazy('get_settings'),
        reverse_lazy('account'),
    ]
    EXCLUDE_PATHS = [
        '/api/notifications/'
    ]

    def process_request(self, request: HttpRequest):
        customization = request.CUSTOMIZATION
        if not waffle.flag_is_active(request=request, flag_name=FLAGS.require_tos_agreement):
            return
        if request.user.is_superuser or not request.user.is_authenticated:
            return
        if request.path in self.EXCLUDE_ENDPOINTS:
            return
        for path in self.EXCLUDE_PATHS:
            if request.path.startswith(path):
                return
        required_tos = check_required_tos(customization, request.user)
        if not required_tos:
            return

        response = api_success({'message': "TOS Agreement requires for user acceptance.", "agreement": required_tos},
                               status_code=status.HTTP_451_UNAVAILABLE_FOR_LEGAL_REASONS)
        response.accepted_renderer = JSONRenderer()
        response.accepted_media_type = "application/json"
        response.renderer_context = {}
        response.render()
        return response


from django.conf import settings
from django.http import HttpRequest, SimpleCookie
from django.test import Client

from rest_framework import status
from rest_framework.test import APIClient

from importlib import import_module
from requests.exceptions import HTTPError


class MockResponse:
    def __init__(self, **kwargs):
        self.status_code = kwargs.get('status_code', status.HTTP_200_OK)
        self.json_data = kwargs.get('json', {})
        self.reason = kwargs.get('reason', '')
        self.url = kwargs.get('url', '')

    def json(self):
        return self.json_data

    def raise_for_status(self):
        """Raises stored :class:`HTTPError`, if one occurred."""

        http_error_msg = ''
        if isinstance(self.reason, bytes):
            # We attempt to decode utf-8 first because some servers
            # choose to localize their reason strings. If the string
            # isn't utf-8, we fall back to iso-8859-1 for all other
            # encodings. (See PR #3538)
            try:
                reason = self.reason.decode('utf-8')
            except UnicodeDecodeError:
                reason = self.reason.decode('iso-8859-1')
        else:
            reason = self.reason

        if 400 <= self.status_code < 500:
            http_error_msg = u'%s Client Error: %s for url: %s' % (self.status_code, reason, self.url)

        elif 500 <= self.status_code < 600:
            http_error_msg = u'%s Server Error: %s for url: %s' % (self.status_code, reason, self.url)

        if http_error_msg:
            raise HTTPError(http_error_msg, response=self)


class MockCache:
    def __init__(self):
        self.cache = {}

    def get(self, key, default=None):
        return self.cache.get(key, default)

    def set(self, key, value, timeout=60):
        self.cache[key] = value


class NxOverride:
    def _login(self, user, backend=None, ip='127.0.0.1'):
        from django.contrib.auth import login
        engine = import_module(settings.SESSION_ENGINE)

        # Create a fake request to store login details.
        request = HttpRequest()
        request.META.update({'REMOTE_ADDR': ip})

        if self.session:
            request.session = self.session
        else:
            request.session = engine.SessionStore()
        login(request, user, backend)

        # Save the session values.
        request.session.save()

        # Set the cookie to represent the session.
        session_cookie = settings.SESSION_COOKIE_NAME
        self.cookies[session_cookie] = request.session.session_key
        cookie_data = {
            'max-age': None,
            'path': '/',
            'domain': settings.SESSION_COOKIE_DOMAIN,
            'secure': settings.SESSION_COOKIE_SECURE or None,
            'expires': None,
        }
        self.cookies[session_cookie].update(cookie_data)

    def logout(self, user, ip='127.0.0.1'):
        """Log out the user by removing the cookies and session object."""
        from django.contrib.auth import logout
        request = HttpRequest()
        engine = import_module(settings.SESSION_ENGINE)
        if self.session:
            request.session = self.session
            request.user = user
            request.META.update({'REMOTE_ADDR': ip})
        else:
            request.session = engine.SessionStore()
        logout(request)
        self.cookies = SimpleCookie()


class NxTestClient(NxOverride, Client):
    pass


class NxAPIClient(NxOverride, APIClient):
    def logout(self):
        self._credentials = {}

        # Also clear any `force_authenticate`
        self.handler._force_user = None
        self.handler._force_token = None

        if self.session:
            super().logout()


def unwrap(decorated_func):
    while hasattr(decorated_func, '__wrapped__'):
        decorated_func = decorated_func.__wrapped__
    return decorated_func

from django.conf import settings
from django.http import HttpRequest, SimpleCookie
from django.test import Client


from importlib import import_module


class NxTestClient(Client):
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



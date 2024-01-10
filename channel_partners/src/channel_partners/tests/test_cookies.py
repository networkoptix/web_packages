import pytest
from django.conf import settings
from django.http import HttpResponse
from django.test import Client
from django.test import TestCase
from django.test import override_settings
from django.urls import path


# View for Testing
def set_cookies(request):
    response = HttpResponse("Setting cookies")
    response.set_cookie(settings.CSRF_COOKIE_NAME, 'csrf_token_value', path=settings.CSRF_COOKIE_PATH)
    response.set_cookie(settings.SESSION_COOKIE_NAME, 'session_id_value', path=settings.SESSION_COOKIE_PATH)
    response.set_cookie(settings.LANGUAGE_COOKIE_NAME, 'language_value', path=settings.LANGUAGE_COOKIE_PATH)
    return response


# Setting our View for the test.
urlpatterns = [
    path('set_cookies/', set_cookies, name='set_cookies'),
]


@override_settings(ROOT_URLCONF=__name__)
class CookiePathTest(TestCase):
    def setUp(self):
        self.client = Client()

    @pytest.mark.django_db
    def test_cookie_paths(self):
        """
        Test that the CSRF token cookie is correctly set with the path '/partners'.
        """
        response = self.client.get('/set_cookies/')

        self.assertEqual(response.cookies['channel_partners_csrftoken']['path'], '/partners')

    def test_cookie_names(self):
        """
        Test that the cookie names are correctly set.
        """
        response = self.client.get('/set_cookies/')

        # Testing that the cookies have the keys and match the expected path
        ## CSRF stuff
        csrf_actual = response.cookies['channel_partners_csrftoken']['path']
        csrf_expected = "/partners"
        self.assertEqual(csrf_actual, csrf_expected)

        ## Session stuff
        session_actual = response.cookies['channel_partners_sessionid']['path']
        session_expected = "/partners"
        self.assertEqual(session_actual, session_expected)

        ## Language stuff
        language_actual = response.cookies['channel_partners_django_language']['path']
        language_expected = "/partners"
        self.assertEqual(language_actual, language_expected)

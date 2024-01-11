from django.test import TestCase, Client
import pytest


class CookiePathTest(TestCase):
    def setUp(self):
        self.client = Client()

    @pytest.mark.django_db
    def test_cookie_paths(self):
        """
        Test that the CSRF token cookie is correctly set with the path '/partners'.
        """
        response = self.client.get('/partners/admin/login/?next=/partners/admin/')

        self.assertEqual(response.cookies['csrftoken']['path'], '/partners')

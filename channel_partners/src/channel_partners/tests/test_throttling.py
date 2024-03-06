from time import sleep
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.contrib.auth.models import User
from django.core.cache import caches
from django.test import (
    TestCase,
    override_settings,
)
from django.urls import (
    path,
    resolve,
)
from rest_framework import status
from rest_framework.response import Response
from rest_framework.test import APIClient
from rest_framework.views import APIView

from channel_partners.throttling.throttle import (
    AnonymousRateThrottle,
    AuthenticatedUserRateThrottle,
    SystemRateThrottle,
)
from partners.authentication import (
    NxCloudOauthTokenAuthentication,
    NxCloudSystemBasicAuthentication,
)


class NoAuthNoPermQuickResponseView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request, *args, **kwargs):
        return Response({"message": "Quick response"}, status=status.HTTP_200_OK)


class UserQuickResponseView(APIView):
    authentication_classes = [NxCloudOauthTokenAuthentication]
    permission_classes = []

    def get(self, request, *args, **kwargs):
        return Response({"message": "Quick response"}, status=status.HTTP_200_OK)


class SystemQuickResponseView(APIView):
    authentication_classes = [NxCloudSystemBasicAuthentication]
    permission_classes = []

    def get(self, request, *args, **kwargs):
        return Response({"message": "Quick response"}, status=status.HTTP_200_OK)


# Create a temporary URL conf for the test
urlpatterns = [
    path('partners/test-anon/', NoAuthNoPermQuickResponseView.as_view(), name='test-anon'),
    path('partners/internal/', NoAuthNoPermQuickResponseView.as_view(), name='test-internal'),
    path('partners/test-user/', UserQuickResponseView.as_view(), name='test-response'),
    path('partners/test-system/', SystemQuickResponseView.as_view(), name='test-system')

]


########################################
###                 TESTS                      ###
########################################
@override_settings(ROOT_URLCONF=__name__)
class ThrottleTests(TestCase):
    def setUp(self):

        caches["throttling"].clear()
        self.client = APIClient()

        # Explicitly set throttle rates & override settings.py
        AuthenticatedUserRateThrottle.rate = '10/5s'
        AnonymousRateThrottle.rate = '2/5s'
        SystemRateThrottle.rate = '2/5s'

    def test_internal_endpoint_no_throttle(self):
        for _ in range(50):
            response = self.client.get('/partners/internal/')
            self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_anonymous_throttle(self):
        for _ in range(2):
            response = self.client.get('/partners/test-anon/')
            self.assertEqual(response.status_code, status.HTTP_200_OK)

        response_fail = self.client.get('/partners/test-anon/')
        self.assertEqual(response_fail.status_code, status.HTTP_429_TOO_MANY_REQUESTS)

    @patch('partners.authentication.NxCloudOauthTokenAuthentication.authenticate')
    def test_authenticated_user_rate_throttle(self, mock_auth):
        # Create a fake user object
        fake_user = User(username='fakeuser')

        mock_auth.return_value = (fake_user, 'fake-token')

        # Simulate authenticated requests
        for _ in range(10):
            response = self.client.get('/partners/test-user/')
            self.assertEqual(response.status_code, status.HTTP_200_OK)

        response_fail = self.client.get('/partners/test-user/')
        self.assertEqual(response_fail.status_code, status.HTTP_429_TOO_MANY_REQUESTS)

    @patch('partners.authentication.NxCloudSystemBasicAuthentication.authenticate_credentials')
    def test_system_rate_throttle(self, mock_auth):
        class StubSystemId:
            system_id = "123213121"

        def side_effect_authenticate_credentials(userid, password, request=None):
            # Simulate adding cloud_system to the request
            request.cloud_system = StubSystemId()
            fake_user = get_user_model()()
            return fake_user, None

        # Use side effect instead of return_value
        mock_auth.side_effect = side_effect_authenticate_credentials

        def get_basic_auth_header(username, password):
            import base64
            credentials = f"{username}:{password}".encode('utf-8')
            b64_credentials = base64.b64encode(credentials).decode('utf-8')
            return {'HTTP_AUTHORIZATION': f'Basic {b64_credentials}'}

        auth_headers = get_basic_auth_header('system_id', 'password')
        self.client.credentials(**auth_headers)

        # Simulate authenticated requests
        for _ in range(2):
            response = self.client.get('/partners/test-system/')
            self.assertEqual(response.status_code, status.HTTP_200_OK)

        response_fail = self.client.get('/partners/test-system/')
        self.assertEqual(response_fail.status_code, status.HTTP_429_TOO_MANY_REQUESTS)

    def test_throttle_policies_active(self):
        match = resolve('/partners/test-anon/')
        view = match.func

        view_class = getattr(view, 'cls', None)
        self.assertIsNotNone(view_class, "No view class found for the endpoint")

        # Check if the expected throttle classes are applied
        self.assertIn(
            AuthenticatedUserRateThrottle,
            view_class.throttle_classes,
            "AuthenticatedUserRateThrottle is not applied")
        self.assertIn(
            AnonymousRateThrottle,
            view_class.throttle_classes,
            "AnonymousRateThrottle is not applied")
        self.assertIn(
            SystemRateThrottle,
            view_class.throttle_classes,
            "SystemRateThrottle is not applied")

    @patch('partners.authentication.NxCloudOauthTokenAuthentication.authenticate')
    def test_authenticated_user_extended_rate_throttle(self, mock_auth):
        # Create a fake user object
        fake_user = User(username='extended_rate_user')
        mock_auth.return_value = (fake_user, 'fake-token')

        # Simulate authenticated requests that should pass under the new rate limit
        for _ in range(10):
            response = self.client.get('/partners/test-user/')
            self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Wait for 5 seconds to reset the throttle
        sleep(5)

        # Next requests within the new period should also pass
        for _ in range(10):
            response = self.client.get('/partners/test-user/')
            self.assertEqual(response.status_code, status.HTTP_200_OK)

        # The next request should fail due to throttling
        response_fail = self.client.get('/partners/test-user/')
        self.assertEqual(response_fail.status_code, status.HTTP_429_TOO_MANY_REQUESTS)

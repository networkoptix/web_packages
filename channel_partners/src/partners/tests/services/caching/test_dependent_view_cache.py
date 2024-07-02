import json
from unittest import mock

import pytest
from django.core.cache import caches
from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.urls import path
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.generators import SchemaGenerator
from drf_spectacular.utils import (
    extend_schema,
    extend_schema_view,
)
from rest_framework import serializers
from rest_framework.decorators import (
    action,
    api_view,
    authentication_classes,
    permission_classes,
)
from rest_framework.mixins import (
    ListModelMixin,
    RetrieveModelMixin,
)
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet

from partners.authentication import NxCloudOauthTokenAuthentication
from partners.filters import CreatedTsAndIdAndNameFilter
from partners.models import CloudUser
from partners.services.cache_service import CacheService
from partners.services.caching.cache_dependency import CacheDependency
from partners.services.caching.cache_enums import CachedDependencyFieldTypeEnum
from partners.services.caching.dependent_view_cache import (
    Dependencies,
    dependent_view_cache,
)
from partners.tests.services.caching.test_dependent_cache import update_cache
from partners.views import DefaultPagination


"""
NOTES:

## Definitions
    - CBV: Class Based Views
    - FBV: Function Based Views

"""

dependencies = [
    CacheDependency(
        model=CloudUser,
        field=CachedDependencyFieldTypeEnum.VERSION,
        source='path.pk'
    ),
]


class CloudUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = CloudUser
        fields = '__all__'


@extend_schema_view(
    list=extend_schema(summary="List all users", description="List all users"),
    retrieve=extend_schema(summary="Retrieve a user", description="Retrieve a user"),
    sass_report=extend_schema(summary="Sass report", description="Sass report")
)
@dependent_view_cache({
    "list": Dependencies([], validate_user=True),
    "retrieve": Dependencies(dependencies, validate_user=True),
    "sass_report": Dependencies(dependencies, validate_user=True)
})
class TestViewSet(ListModelMixin, RetrieveModelMixin, GenericViewSet):
    authentication_classes = (NxCloudOauthTokenAuthentication,)
    http_method_names = ['get']
    serializer_class = CloudUserSerializer
    permission_classes = (IsAuthenticated,)
    queryset = CloudUser.objects.all()
    pagination_class = DefaultPagination
    filter_backends = [DjangoFilterBackend]
    filterset_class = CreatedTsAndIdAndNameFilter

    @action(detail=True, methods=['get'])
    def sass_report(self, request, *args, **kwargs):
        return Response({"message": "This is the sass_report action"})


@extend_schema(
    tags=["Users"],
    summary="Get all users",
    description="Get all users",
    responses={200: CloudUserSerializer(many=True)})
@dependent_view_cache({"all_users": Dependencies([], validate_user=True)})
@api_view(['GET'])
@authentication_classes([NxCloudOauthTokenAuthentication])
@permission_classes([IsAuthenticated])
def all_users(request):
    queryset = CloudUser.objects.all()
    serializer = CloudUserSerializer(queryset, many=True)
    return Response(serializer.data)


urlpatterns = [
    # Paths from `TestViewSet`
    path('partners/test/', TestViewSet.as_view({'get': 'list'}), name='test-list'),
    path('partners/test/<int:pk>/', TestViewSet.as_view({'get': 'retrieve'}), name='test-detail'),
    path('partners/test/<int:pk>/sass_report/', TestViewSet.as_view({'get': 'sass_report'}), name='test-sass-report'),

    # Paths from `all_users` function
    path('partners/all_users/', all_users, name='all-users'),
]


@pytest.fixture
def cache_cleared():
    caches['default'].clear()
    caches['local'].clear()
    caches['dependent_cache'].clear()


@pytest.fixture
def temporary_urlconf():
    from django.conf import settings
    original_urlconf = settings.ROOT_URLCONF
    settings.ROOT_URLCONF = __name__
    yield
    settings.ROOT_URLCONF = original_urlconf


def pop_queries(queries):
    return [
        query
        for query in queries.captured_queries
        if query['sql'] not in ('BEGIN', 'COMMIT', 'ROLLBACK', 'SAVEPOINT', 'RELEASE SAVEPOINT')
    ]


@pytest.mark.django_db(transaction=True, reset_sequences=True, serialized_rollback=True)
class TestDependentViewCacheDecorator:

    @pytest.fixture(autouse=True)
    def setup_method(
            self,
            cloud_test_host,
            channel_partner_factory,
            cloud_user_factory,
            temporary_urlconf, cache_cleared
    ) -> None:
        self.cp = channel_partner_factory(cloud_host=cloud_test_host)
        self.user = cloud_user_factory(email="asdsadsadas@aol.com")
        self.cloud_host = cloud_test_host
        update_cache([self.cp, self.user])

    def test_openapi_schema_generation(self):
        """
        NOTE: DRF Spectacular converts the `pk` to `id` in the schema generation
        """
        generator = SchemaGenerator(patterns=urlpatterns)
        schema = generator.get_schema(request=None, public=True)

        # Check if the paths are present in the schema
        assert '/partners/test/' in schema['paths']
        assert '/partners/test/{id}/' in schema['paths']
        assert '/partners/test/{id}/sass_report/' in schema['paths']
        assert '/partners/all_users/' in schema['paths']

        # Check if the metadata is correct for the list endpoint
        list_metadata = schema['paths']['/partners/test/']['get']
        assert list_metadata['summary'] == "List all users"
        assert list_metadata['description'] == "List all users"

        # Check if the metadata is correct for the retrieve endpoint
        retrieve_metadata = schema['paths']['/partners/test/{id}/']['get']
        assert retrieve_metadata['summary'] == "Retrieve a user"
        assert retrieve_metadata['description'] == "Retrieve a user"

        # Check if the metadata is correct for the sass_report endpoint
        sass_report_metadata = schema['paths']['/partners/test/{id}/sass_report/']['get']
        assert sass_report_metadata['summary'] == "Sass report"
        assert sass_report_metadata['description'] == "Sass report"

        # Check if the metadata is correct for the all_users function-based view
        all_users_metadata = schema['paths']['/partners/all_users/']['get']
        assert all_users_metadata['summary'] == "Get all users"
        assert all_users_metadata['description'] == "Get all users"
        assert all_users_metadata['tags'] == ["Users"]

        # Verify the response schema for the all_users endpoint
        all_users_responses = all_users_metadata['responses']
        assert '200' in all_users_responses

    def test_cache_key_generation(self, client, mock_auth_with_user):
        mock_auth_with_user(self.user)
        id: int = 1
        headers = {
            'X-Original-Host': self.cloud_host.hostname,
            'Accept': 'application/json'
        }
        path = f"/partners/test/{id}/"

        client.get(path, headers=headers)

        expected_cache_key = f'dependent_cache:TestViewSet:retrieve:method:GET:host:{self.cloud_host.hostname}:user_id:{self.user.id}:path:{path}'
        cached_data = CacheService.get_cache_fields(expected_cache_key, ['content'])
        assert cached_data is not None
        assert 'content' in cached_data

    def test_cache_service_retrieve_error(self, client, mock_auth_with_user):
        mock_auth_with_user(self.user)
        id: int = 1
        headers = {
            'X-Original-Host': self.cloud_host.hostname,
            'Accept': 'application/json'
        }
        path = f"/partners/test/{id}/"
        with mock.patch('rest_framework.views.APIView.check_throttles', return_value=None):
            with mock.patch(
                    'partners.services.cache_service.CacheService.get_cache_fields',
                    side_effect=Exception("Cache service error")):
                response = client.get(path, headers=headers)

        assert response.status_code == 200
        assert response.content == b'{"id":1,"version":0,"email":"asdsadsadas@aol.com","full_name":null}'

        cache_key = f'dependent_cache:TestViewSet:retrieve:method:GET:host:{self.cloud_host.hostname}:user_id:1:path:{path}'
        cached_response = CacheService.get_cache_fields(cache_key, ['content'])
        assert cached_response is not None
        assert json.loads(json.dumps(cached_response['content'])) == json.loads(response.content.decode("utf-8"))

    def test_cache_set_error(self, client, mock_auth_with_user):
        mock_auth_with_user(self.user)
        id: int = 1
        headers = {
            'X-Original-Host': self.cloud_host.hostname,
            'Accept': 'application/json'
        }
        path = f"/partners/test/{id}/"
        with mock.patch('rest_framework.views.APIView.check_throttles', return_value=None):
            with mock.patch('partners.services.cache_service.CacheService.set_cache_fields',
                            side_effect=Exception("Cache set error")):
                response = client.get(path, headers=headers)

        assert response.status_code == 200
        assert response.content == b'{"id":1,"version":0,"email":"asdsadsadas@aol.com","full_name":null}'

        cache_key = f'dependent_cache:TestViewSet:retrieve:method:GET:host:{self.cloud_host.hostname}:user_id:1:path:{path}'
        cached_response = CacheService.get_cache_fields(cache_key, ['content'])
        assert cached_response is None

    def test_cache_authenticated_get_retrieve(self, client, mock_auth_with_user, caplog):
        mock_auth_with_user(self.user)
        id: int = 1
        headers = {
            'X-Original-Host': self.cloud_host.hostname,
            'Accept': 'application/json'
        }
        path = f"/partners/test/{id}/"

        # First request
        with mock.patch('rest_framework.views.APIView.check_throttles', return_value=None):
            with CaptureQueriesContext(connection) as first_queries:
                response = client.get(path, headers=headers)

        assert len(pop_queries(first_queries)) > 0

        assert response.status_code == 200
        assert response.content == b'{"id":1,"version":0,"email":"asdsadsadas@aol.com","full_name":null}'

        cache_key = f'dependent_cache:TestViewSet:retrieve:method:GET:host:{self.cloud_host.hostname}:user_id:1:path:{path}'
        cached_response = CacheService.get_cache_fields(cache_key, ['content'])
        assert cached_response is not None
        assert json.loads(json.dumps(cached_response['content'])) == json.loads(response.content.decode("utf-8"))

        # Second request (follow-up)
        with mock.patch('rest_framework.views.APIView.check_throttles', return_value=None):
            with CaptureQueriesContext(connection) as second_queries:
                second_response = client.get(path, headers=headers)

        assert second_response.status_code == 200
        assert second_response.content == response.content

        assert "Validation hash mismatch -- clearing cache" not in caplog.text
        assert len(pop_queries(second_queries)) == 0

    def test_change_after_first_call(self, client, mock_auth_with_user, caplog):
        mock_auth_with_user(self.user)
        id: int = 1
        headers = {
            'X-Original-Host': self.cloud_host.hostname,
            'Accept': 'application/json'
        }
        path = f"/partners/test/{id}/"

        # First request
        with mock.patch('rest_framework.views.APIView.check_throttles', return_value=None):
            with CaptureQueriesContext(connection) as first_queries:
                response = client.get(path, headers=headers)

        assert len(pop_queries(first_queries)) > 0

        assert response.status_code == 200
        assert response.content == b'{"id":1,"version":0,"email":"asdsadsadas@aol.com","full_name":null}'

        cache_key = f'dependent_cache:TestViewSet:retrieve:method:GET:host:{self.cloud_host.hostname}:user_id:1:path:{path}'
        cached_response = CacheService.get_cache_fields(cache_key, ['content'])
        assert cached_response is not None
        assert json.loads(json.dumps(cached_response['content'])) == json.loads(response.content.decode("utf-8"))

        # Update the user
        self.user.email = "updated_user_email@example.com"
        self.user.save()

        # Second request (follow-up)
        with mock.patch('rest_framework.views.APIView.check_throttles', return_value=None):
            with CaptureQueriesContext(connection) as second_queries:
                second_response = client.get(path, headers=headers)

        assert second_response.status_code == 200
        assert second_response.content == b'{"id":1,"version":1,"email":"updated_user_email@example.com","full_name":null}'

        assert "Validation hash mismatch -- clearing cache" in caplog.text
        assert len(pop_queries(second_queries)) == 1

    def test_get_list(self, client, mock_auth_with_user, caplog):
        mock_auth_with_user(self.user)
        headers = {
            'X-Original-Host': self.cloud_host.hostname,
            'Accept': 'application/json'
        }
        path = "/partners/test/"

        # First request
        with mock.patch('rest_framework.views.APIView.check_throttles', return_value=None):
            with CaptureQueriesContext(connection) as first_queries:
                response = client.get(path, headers=headers)

        assert len(pop_queries(first_queries)) > 0

        assert response.status_code == 200
        assert response.content == (b'{"count":2,"next":null,"previous":null,"results":[{"id":1,"version":0,"email'
                                    b'":"asdsadsadas@aol.com","full_name":null},{"id":2,"version":1,"email":"defau'
                                    b'lt_cp_admin@networkoptix.com","full_name":null}]}')

        cache_key = f'dependent_cache:TestViewSet:list:method:GET:host:{self.cloud_host.hostname}:user_id:1:path:{path}'
        cached_response = CacheService.get_cache_fields(cache_key, ['content'])
        assert cached_response is not None
        assert cached_response is not {}


        assert json.loads(json.dumps(cached_response['content'])) == json.loads(response.content.decode("utf-8"))

        # Second request (follow-up)
        with mock.patch('rest_framework.views.APIView.check_throttles', return_value=None):
            with CaptureQueriesContext(connection) as second_queries:
                second_response = client.get(path, headers=headers)

        assert second_response.status_code == 200
        assert second_response.content == response.content

        assert "Validation hash mismatch -- clearing cache" not in caplog.text
        assert len(pop_queries(second_queries)) == 0

    def test_get_sass_report(self, client, mock_auth_with_user, caplog):
        mock_auth_with_user(self.user)
        id: int = 1
        headers = {
            'X-Original-Host': self.cloud_host.hostname,
            'Accept': 'application/json'
        }
        path = f"/partners/test/{id}/sass_report/"

        # First request
        with mock.patch('rest_framework.views.APIView.check_throttles', return_value=None):
            with CaptureQueriesContext(connection) as first_queries:
                response = client.get(path, headers=headers)

        assert len(pop_queries(first_queries)) > 0

        assert response.status_code == 200
        assert response.json() == {"message": "This is the sass_report action"}

        cache_key = f'dependent_cache:TestViewSet:sass_report:method:GET:host:{self.cloud_host.hostname}:user_id:1:path:{path}'
        cached_response = CacheService.get_cache_fields(cache_key, ['content'])
        assert cached_response is not None
        assert json.loads(json.dumps(cached_response['content'])) == json.loads(response.content.decode("utf-8"))

        # Second request (follow-up)
        with mock.patch('rest_framework.views.APIView.check_throttles', return_value=None):
            with CaptureQueriesContext(connection) as second_queries:
                second_response = client.get(path, headers=headers)

        assert second_response.status_code == 200
        assert second_response.json() == response.json()

        assert "Validation hash mismatch -- clearing cache" not in caplog.text
        assert len(pop_queries(second_queries)) == 0

    def test_get_all_users_function_based_view(self, client, mock_auth_with_user, caplog):
        path = "/partners/all_users/"
        mock_auth_with_user(self.user)
        headers = {
            'X-Original-Host': self.cloud_host.hostname,
            'Accept': 'application/json'
        }

        # First request
        with CaptureQueriesContext(connection) as first_queries:
            response = client.get(path, headers=headers)

        assert len(pop_queries(first_queries)) > 0

        assert response.status_code == 200
        assert response.content == (b'[{"id":1,"version":0,"email":"asdsadsadas@aol.com","full_name":null},{"id":2'
                                    b',"version":1,"email":"default_cp_admin@networkoptix.com","full_name":null}]')

        # Second request (follow-up)
        with mock.patch('rest_framework.views.APIView.check_throttles', return_value=None):
            with CaptureQueriesContext(connection) as second_queries:
                second_response = client.get(path, headers=headers)

        assert second_response.status_code == 200
        assert second_response.content == response.content

        assert "Validation hash mismatch -- clearing cache" not in caplog.text
        assert len(pop_queries(second_queries)) == 0

    def test_get_list_with_query_param(self, client, mock_auth_with_user, caplog):
        path = "/partners/test/?email=asdsadsadas@aol.com"
        mock_auth_with_user(self.user)
        headers = {
            'X-Original-Host': self.cloud_host.hostname,
            'Accept': 'application/json'
        }

        # First request
        with mock.patch('rest_framework.views.APIView.check_throttles', return_value=None):
            with CaptureQueriesContext(connection) as first_queries:
                response = client.get(path, headers=headers)

        assert len(pop_queries(first_queries)) > 0

        assert response.status_code == 200
        assert response.content == (b'{"count":2,"next":null,"previous":null,"results":[{"id":1,"version":0,"email'
                                    b'":"asdsadsadas@aol.com","full_name":null},{"id":2,"version":1,"email":"defau'
                                    b'lt_cp_admin@networkoptix.com","full_name":null}]}')

        cache_key = f'dependent_cache:TestViewSet:list:method:GET:host:{self.cloud_host.hostname}:user_id:1:path:{path}'
        cached_response = CacheService.get_cache_fields(cache_key, ['content'])
        assert cached_response is not None
        assert json.loads(json.dumps(cached_response['content'])) == json.loads(response.content.decode("utf-8"))

        # Second request (follow-up)
        with mock.patch('rest_framework.views.APIView.check_throttles', return_value=None):
            with CaptureQueriesContext(connection) as second_queries:
                second_response = client.get(path, headers=headers)

        assert second_response.status_code == 200
        assert second_response.content == response.content

        assert "Validation hash mismatch -- clearing cache" not in caplog.text
        assert len(pop_queries(second_queries)) == 0

    def test_caching_different_http_methods(self, client, mock_auth_with_user, caplog):
        mock_auth_with_user(self.user)
        headers = {
            'X-Original-Host': self.cloud_host.hostname,
            'Accept': 'application/json'
        }

        # Test GET (should be cached)
        with mock.patch('rest_framework.views.APIView.check_throttles', return_value=None):
            get_response = client.get("/partners/test/1/", headers=headers)
        assert get_response.status_code == 200

        # Test POST (should not be cached)
        with mock.patch('rest_framework.views.APIView.check_throttles', return_value=None):
            post_response = client.post("/partners/test/1/", headers=headers, data={})

        assert post_response.status_code in [405, 403]  # Method not allowed or forbidden

        # Verify that GET is still cached
        with mock.patch('rest_framework.views.APIView.check_throttles', return_value=None):
            with CaptureQueriesContext(connection) as queries:
                second_get_response = client.get("/partners/test/1/", headers=headers)

        assert second_get_response.status_code == 200
        assert second_get_response.content == get_response.content

        assert "Validation hash mismatch -- clearing cache" not in caplog.text
        assert len(pop_queries(queries)) == 0

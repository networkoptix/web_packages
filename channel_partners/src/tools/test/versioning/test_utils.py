import pytest
from django.core.exceptions import ImproperlyConfigured
from django.urls import (
    include,
    path,
)
from rest_framework import serializers
from rest_framework.decorators import (
    action,
    api_view,
)
from rest_framework.mixins import (
    ListModelMixin,
    RetrieveModelMixin,
)
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet

import tools.versioning.utils
from tools.versioning.decorators import version_range
from tools.versioning.routers import VersionedRouter
from tools.versioning.utils import (
    Versions,
    get_urlpatterns,
    get_versions,
    settings,
    versioned_serializer,
)
from tools.versioning.views import VersionedViewMixin


class TestGetUrlPatterns:

    def test_with_valid_versioned_urls(self, mocker):

        @version_range(Versions(min_version='v2', max_version='v3'),
                       actions={'list': Versions(min_version='v2', max_version='v2')})
        class VersionedView(VersionedViewMixin, ListModelMixin, GenericViewSet):
            def list(self, request, *args, **kwargs):
                return Response([])

        module_one = mocker.MagicMock()
        module_one.urlpatterns = [mocker.MagicMock()]
        module_one.router = None
        module_two = mocker.MagicMock()
        module_two.urlpatterns = None
        module_two.router = VersionedRouter()
        module_two.router.register('dummy_list', VersionedView, basename='test')
        mocker.patch('importlib.import_module', side_effect=[module_one, module_two])
        modules = ['module_one', 'module_two']
        urlpatterns = get_urlpatterns(modules, 'v2')
        assert len(urlpatterns) == 2

    def test_with_valid_versioned_and_unversioned_urls(self, mocker):

        @version_range(Versions(min_version='v2', max_version='v3'),
                       actions={'list': Versions(min_version='v2', max_version='v2')})
        class VersionedView(VersionedViewMixin, ListModelMixin, GenericViewSet):
            def list(self, request, *args, **kwargs):
                return Response([])

        module_one = mocker.MagicMock()
        module_one.urlpatterns = [mocker.MagicMock()]
        module_one.router = None
        module_two = mocker.MagicMock()
        module_two.urlpatterns = None
        module_two.router = VersionedRouter()
        module_two.router.register('dummy_list', VersionedView, basename='test')
        mocker.patch('importlib.import_module', side_effect=[module_one, module_two])
        modules = ['module_one', 'module_two']
        urlpatterns = get_urlpatterns(modules, 'v3')
        assert len(urlpatterns) == 1

    def test_raises_ImproperlyConfigured_for_invalid_router(self, mocker):
        module = mocker.MagicMock()
        module.urlpatterns = [mocker.MagicMock()]
        module.router = 1 # Not a router
        mocker.patch('importlib.import_module', side_effect=[module])
        modules = ['module']
        with pytest.raises(ImproperlyConfigured):
            urlpatterns = get_urlpatterns(modules, 'v1')

    def test_raises_ImproperlyConfigured_for_non_list_urlpatterns(self, mocker):
        module_with_invalid_urlpatterns = mocker.MagicMock()
        module_with_invalid_urlpatterns.urlpatterns = mocker.MagicMock()  # Not a list
        mocker.patch('importlib.import_module', return_value=module_with_invalid_urlpatterns)
        with pytest.raises(ImproperlyConfigured):
            get_urlpatterns(['module_with_invalid_urlpatterns'], 'v1')


class TestGetVersions:

    @pytest.fixture(autouse=True)
    def setup(self, mocker):
        mocker.patch.object(settings, 'AVAILABLE_VERSIONS', ['v1', 'v2', 'v3'])

    def test_returns_versions(self):
        versions = get_versions(min_version='v1', max_version='v3')
        assert versions == (['v1', 'v2', 'v3'], ['v1', 'v2', 'v3'], [])

    def test_without_max_version(self):
        versions = get_versions(min_version='v2', max_version=None)
        assert versions == (['v2', 'v3'], ['v2', 'v3'], [])

    def test_with_deprecated_in(self):
        versions = get_versions(min_version='v1', max_version='v2', deprecated_in='v2')
        assert versions == (['v1', 'v2'], ['v1'], ['v2'])

    def test_single_version(self):
        versions = get_versions(min_version='v2', max_version='v2', deprecated_in='v2')
        assert versions == (['v2'], [], ['v2'])

    def test_without_min_version(self):
        with pytest.raises(ImproperlyConfigured) as e:
            get_versions(min_version=None, max_version='v2')
            assert 'min_version is required' in str(e)

    def test_invalid_min_version(self):
        with pytest.raises(ImproperlyConfigured) as e:
            get_versions(min_version='v0', max_version='v2', deprecated_in='v2')
            assert 'Invalid version range' in str(e)
    def test_invalid_max_version(self):
        with pytest.raises(ImproperlyConfigured) as e:
            get_versions(min_version='v1', max_version='v4', deprecated_in='v2')
            assert 'Invalid version range' in str(e)

    def test_invalid_deprecated_in(self):
        with pytest.raises(ImproperlyConfigured) as e:
            get_versions(min_version='v1', max_version='v2', deprecated_in='v4')
            assert 'Invalid version range' in str(e)

    def test_invalid_version_order(self):
        with pytest.raises(ImproperlyConfigured) as e:
            get_versions(min_version='v2', max_version='v1')
            assert 'Invalid version range' in str(e)

        with pytest.raises(ImproperlyConfigured) as e:
            get_versions(min_version='v1', max_version='v2', deprecated_in='v3')
            assert 'Invalid version range' in str(e)


class TestVersions:

    @pytest.fixture(autouse=True)
    def setup(self, mocker):
        mocker.patch.object(settings, 'AVAILABLE_VERSIONS', ['v1', 'v2', 'v3'])

    def test_min_version(self):
        versions = Versions(min_version='v2')
        assert versions.min_version == 'v2'
        assert versions.max_version is None
        assert versions.deprecated_in is None
        assert versions.versions == ['v2', 'v3']
        assert versions.allowed_versions == ['v2', 'v3']
        assert versions.deprecated_versions == []

    def test_max_version(self):
        versions = Versions(max_version='v2')
        assert versions.min_version == 'v1'
        assert versions.max_version == 'v2'
        assert versions.deprecated_in is None
        assert versions.versions == ['v1', 'v2']
        assert versions.allowed_versions == ['v1', 'v2']
        assert versions.deprecated_versions == []

    def test_deprecated_in(self):
        versions = Versions(deprecated_in='v2')
        assert versions.min_version == 'v1'
        assert versions.max_version is None
        assert versions.deprecated_in == 'v2'
        assert versions.versions == ['v1', 'v2', 'v3']
        assert versions.allowed_versions == ['v1']
        assert versions.deprecated_versions == ['v2', 'v3']

    def test_all_versions(self):
        versions = Versions(min_version='v1', max_version='v3', deprecated_in='v2')
        assert versions.min_version == 'v1'
        assert versions.max_version == 'v3'
        assert versions.deprecated_in == 'v2'
        assert versions.versions == ['v1', 'v2', 'v3']
        assert versions.allowed_versions == ['v1']
        assert versions.deprecated_versions == ['v2', 'v3']

    def test_invalid_min_version(self):
        with pytest.raises(ImproperlyConfigured) as e:
            Versions(min_version='v0')
            assert 'Invalid version range' in str(e)

    def test_invalid_max_version(self):
        with pytest.raises(ImproperlyConfigured) as e:
            Versions(max_version='v4')
            assert 'Invalid version range' in str(e)

    def test_invalid_deprecated_in(self):
        with pytest.raises(ImproperlyConfigured) as e:
            Versions(deprecated_in='v4')
            assert 'Invalid version range' in str(e)

    def test_invalid_version_order(self):
        with pytest.raises(ImproperlyConfigured) as e:
            Versions(min_version='v2', max_version='v1')
            assert 'Invalid version range' in str(e)

        with pytest.raises(ImproperlyConfigured) as e:
            Versions(min_version='v1', max_version='v2', deprecated_in='v3')
            assert 'Invalid version range' in str(e)


class SingleVersionSerializer(serializers.Serializer):
    name = serializers.CharField()


class NonVersionSerializerV1(serializers.Serializer):
    name = serializers.CharField()


class SerializerV1(SingleVersionSerializer):
    age = serializers.IntegerField()


class SerializerV2(SingleVersionSerializer):
    age = serializers.IntegerField()
    email = serializers.EmailField()


class TestVersionedSerializer:

    @pytest.fixture(autouse=True)
    def setup(self, mocker):
        mocker.patch.object(settings, 'AVAILABLE_VERSIONS', ['v1', 'v2', 'v3'])
        self.mapping = {
            'v1': {
                SingleVersionSerializer: SingleVersionSerializer,
                SerializerV1: SerializerV1,
            },
            'v2': {
                SerializerV1: SerializerV2,
            }
        }
        mocker.patch.object(tools.versioning.utils, 'versions_mapping', self.mapping)

    def test_invalid_version(self):
        with pytest.raises(ImproperlyConfigured) as e:
            versioned_serializer(SingleVersionSerializer, 'v4')
            assert 'Invalid version' in str(e)
    @pytest.mark.parametrize('base_serializer, version, expected_serializer', [
        (SingleVersionSerializer, 'v1', SingleVersionSerializer),
        (SingleVersionSerializer, 'v2', SingleVersionSerializer),
        (SingleVersionSerializer, 'v3', SingleVersionSerializer),
        (SerializerV1, 'v1', SerializerV1),
        (SerializerV1, 'v2', SerializerV2),
        (SerializerV1, 'v3', SerializerV2),
        (NonVersionSerializerV1, 'v1', NonVersionSerializerV1),
        (NonVersionSerializerV1, 'v2', NonVersionSerializerV1),
        (NonVersionSerializerV1, 'v3', NonVersionSerializerV1),
    ])
    def test_version_serializer(self, base_serializer, version, expected_serializer):
        serializer = versioned_serializer(base_serializer, version)
        assert serializer == expected_serializer



class TestFilterPatterns:
    @pytest.fixture(autouse=True)
    def setup(self, mocker):
        mocker.patch.object(settings, 'AVAILABLE_VERSIONS', ['v1', 'v2', 'v3', 'v4', 'v5'])

    def func_patterns(self):
        @version_range(Versions(min_version='v2', max_version='v4', deprecated_in='v3'))
        @api_view(['GET'])
        def dummy_view(request):
            return Response({'foo': 'bar'})

        patterns = [
            path('dummy/', dummy_view, name='dummy_view')
        ]
        nested_patterns = [
            path('nested/', include(patterns))
        ]
        return patterns, nested_patterns

    def view_set(self):
        @version_range(Versions(min_version='v2', max_version='v4', deprecated_in='v3'))
        class DummyView(VersionedViewMixin, ListModelMixin, GenericViewSet):
            def list(self, request, *args, **kwargs):
                return Response([])

        return DummyView

    def class_patterns(self):

        patterns = [
            path('dummy/', self.view_set().as_view({'get': 'list'}), name='dummy_view')
        ]
        nested_patterns = [
            path('nested/', include(patterns))
        ]
        return patterns, nested_patterns

    def custom_action(self):
        @version_range(Versions(min_version='v2', max_version='v4', deprecated_in='v3'))
        class DummyView(VersionedViewMixin, GenericViewSet):
            @version_range(Versions(min_version='v2', max_version='v3', deprecated_in='v3'))
            @action(detail=False, methods=['get'])
            def custom_action(self, request, *args, **kwargs):
                return Response([])

        return DummyView

    def custom_action_patterns(self):

        DummyView = self.custom_action()
        patterns = [
            path('dummy/', DummyView.as_view({'get': 'custom_action'}, **DummyView.custom_action.kwargs), name='dummy_view')
        ]
        nested_patterns = [
            path('nested/', include(patterns))
        ]
        return patterns, nested_patterns

    @pytest.mark.parametrize('version, expected_urls_cnt', [
        ('v1', 0),
        ('v2', 1),
        ('v3', 1),
        ('v4', 1),
        ('v5', 0),
    ])
    def test_func_based_view(self, version, expected_urls_cnt):
        patterns, nested_patterns = self.func_patterns()
        filtered_patterns = tools.versioning.utils.filter_patterns(nested_patterns, version)
        assert len(filtered_patterns) == expected_urls_cnt
        filtered_patterns = tools.versioning.utils.filter_patterns(patterns, version)
        assert len(filtered_patterns) == expected_urls_cnt

    @pytest.mark.parametrize('version, expected_urls_cnt', [
        ('v1', 0),
        ('v2', 1),
        ('v3', 1),
        ('v4', 1),
        ('v5', 0),
    ])
    def test_viewset(self, version, expected_urls_cnt):

        patterns, nested_patterns = self.class_patterns()
        filtered_patterns = tools.versioning.utils.filter_patterns(nested_patterns, version)
        assert len(filtered_patterns) == expected_urls_cnt
        filtered_patterns = tools.versioning.utils.filter_patterns(patterns, version)
        assert len(filtered_patterns) == expected_urls_cnt

    @pytest.mark.parametrize('version, expected_urls_cnt', [
        ('v1', 0),
        ('v2', 1),
        ('v3', 1),
        ('v4', 0),
        ('v5', 0),
    ])
    def test_custom_action(self, version, expected_urls_cnt):

        patterns, nested_patterns = self.custom_action_patterns()
        filtered_patterns = tools.versioning.utils.filter_patterns(nested_patterns, version)
        assert len(filtered_patterns) == expected_urls_cnt
        filtered_patterns = tools.versioning.utils.filter_patterns(patterns, version)
        assert len(filtered_patterns) == expected_urls_cnt

    def get_routed_view(self, view, version):
        router = VersionedRouter()
        router.register('dummy', view, basename='dummy')
        urlpatterns = router.get_versioned_urls(version)
        return urlpatterns

    @pytest.mark.parametrize('version, expected_urls_cnt', [
        ('v1', 0),
        ('v2', 1),
        ('v3', 1),
        ('v4', 1),
        ('v5', 0),
    ])
    def test_routed_viewset(self, version, expected_urls_cnt):

        patterns = self.get_routed_view(self.view_set(), version)
        filtered_patterns = tools.versioning.utils.filter_patterns(patterns, version)
        assert len(filtered_patterns) == expected_urls_cnt

    @pytest.mark.parametrize('version, expected_urls_cnt', [
        ('v1', 0),
        ('v2', 1),
        ('v3', 1),
        ('v4', 0),
        ('v5', 0),
    ])
    def test_routed_custom_action(self, version, expected_urls_cnt):
        patterns = self.get_routed_view(self.custom_action(), version)
        filtered_patterns = tools.versioning.utils.filter_patterns(patterns, version)
        assert len(filtered_patterns) == expected_urls_cnt



class TestVersionedInclude:

    @pytest.fixture(autouse=True)
    def setup(self, mocker):
        mocker.patch.object(settings, 'AVAILABLE_VERSIONS', ['v1', 'v2', 'v3', 'v4', 'v5'])

    def mock_get_urlpatterns(self, mocker, patterns_list, router):
        module_one = mocker.MagicMock()
        module_one.urlpatterns = patterns_list
        module_one.router = router
        mocker.patch('importlib.import_module', return_value=module_one)

    def func_patterns(self):
        @version_range(Versions(min_version='v2', max_version='v4', deprecated_in='v3'))
        @api_view(['GET'])
        def dummy_view(request):
            return Response({'foo': 'bar'})

        patterns = [
            path('dummy/', dummy_view, name='dummy_view')
        ]
        return patterns

    def custom_action(self):
        @version_range(Versions(min_version='v2', max_version='v4', deprecated_in='v3'))
        class DummyView(VersionedViewMixin, GenericViewSet):
            @version_range(Versions(min_version='v2', max_version='v3', deprecated_in='v3'))
            @action(detail=False, methods=['get'])
            def custom_action(self, request, *args, **kwargs):
                return Response([])

        return DummyView

    def view_set(self):
        @version_range(Versions(min_version='v2', max_version='v4', deprecated_in='v3'),
                       actions={'list': Versions(min_version='v2', max_version='v3', deprecated_in='v3')})
        class DummyView(VersionedViewMixin, RetrieveModelMixin, ListModelMixin, GenericViewSet):
            def list(self, request, *args, **kwargs):
                return Response([])

            def retrieve(self, request, *args, **kwargs):
                return Response({})

        return DummyView

    def get_router(self):
        router = VersionedRouter()
        router.register('dummy_set', self.view_set(), basename='dummy_set')
        router.register('dummy_action', self.custom_action(), basename='dummy_action')
        return router

    def test_versioned_include_empty(self, mocker):
        self.mock_get_urlpatterns(mocker, [], None)
        included = tools.versioning.utils.versioned_include('v1', 'dummy', ['dummy.urls_v1'])
        urlpatterns = included[0]
        assert len(urlpatterns) == 1
        url_resolver = urlpatterns[0]
        assert url_resolver.pattern._route == 'v1/'
        assert url_resolver.url_patterns == []

    @pytest.mark.parametrize('version, expected_urls_cnt, expected_view_names', [
        ('v1', 0, set()),
        ('v2', 4, {'dummy_set-list', 'dummy_set-detail', 'dummy_action-custom-action', 'dummy_view'}),
        ('v3', 4, {'dummy_set-list', 'dummy_set-detail', 'dummy_action-custom-action', 'dummy_view'}),
        ('v4', 2, {'dummy_set-detail', 'dummy_view'}),
        ('v5', 0, set()),
    ])
    def test_versioned_include(self, mocker, version, expected_urls_cnt, expected_view_names):
        patterns = self.func_patterns()
        router = self.get_router()
        self.mock_get_urlpatterns(mocker, patterns, router)
        included = tools.versioning.utils.versioned_include(version, 'dummy', ['dummy.urls_v1'])
        urlpatterns = included[0]
        url_resolver = urlpatterns[0]
        assert len(url_resolver.url_patterns) == expected_urls_cnt
        assert url_resolver.pattern._route == f'{version}/'
        view_names = {url.pattern.name for url in url_resolver.url_patterns}
        assert view_names == expected_view_names

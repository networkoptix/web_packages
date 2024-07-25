import pytest
from django.conf import settings
from django.urls import URLPattern
from rest_framework.decorators import action
from rest_framework.viewsets import ModelViewSet

from partners.models import ChannelPartnerServiceExternalId
from partners.serializers.v2.serializers import (
    ChannelPartnerServiceExternalIdSerializer,
)
from partners.views.v2.views import ExternalIdBase
from tools.versioning.decorators import version_range
from tools.versioning.routers import VersionedRouter
from tools.versioning.utils import Versions
from tools.versioning.views import VersionedViewMixin


class TestVersionedRouter:
    @pytest.fixture(autouse=True)
    def setup(self, mocker):
        mocker.patch.object(settings, 'AVAILABLE_VERSIONS', ['v2', 'v3', 'v4', 'v5', 'v6'])
        self.router = VersionedRouter()

    def class_factory(self):
        @version_range(Versions(min_version="v2", max_version="v5", deprecated_in="v4"),
                       actions={
                           "create": Versions(min_version="v2", max_version="v3", deprecated_in="v3"),
                           "partial_update": Versions(min_version="v2", max_version="v4", deprecated_in="v3")
                       })
        class ChannelPartnerServiceExternalIdViewSet(ExternalIdBase, VersionedViewMixin, ModelViewSet):
            serializer_class = ChannelPartnerServiceExternalIdSerializer
            queryset = ChannelPartnerServiceExternalId.objects.all()

            @version_range(Versions(min_version="v2", max_version="v3", deprecated_in="v3"))
            @action(detail=False, methods=['get'])
            def get_external_id(self, request):
                return self.get_serializer_class()(ChannelPartnerServiceExternalId.objects.first()).data

        return ChannelPartnerServiceExternalIdViewSet

    def test_get_versioned_method_map(self):
        view = self.class_factory()
        list_mapping = {
            'get': 'list',
            'post': 'create',
        }
        detail_mapping = {
            'get': 'retrieve',
            'put': 'update',
            'patch': 'partial_update',
            'delete': 'destroy',
        }
        custom_mapping = {
            'get': 'get_external_id',
        }

        version = 'v2'
        method_map = self.router.get_versioned_method_map(view, list_mapping, version)
        assert method_map == {'get': 'list', 'post': 'create'}
        method_map = self.router.get_versioned_method_map(view, detail_mapping, version)
        assert method_map == {'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}
        method_map = self.router.get_versioned_method_map(view, custom_mapping, version)
        assert method_map == {'get': 'get_external_id'}

        version = 'v3'
        method_map = self.router.get_versioned_method_map(view, list_mapping, version)
        assert method_map == {'get': 'list', 'post': 'create'}
        method_map = self.router.get_versioned_method_map(view, detail_mapping, version)
        assert method_map == {'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}
        method_map = self.router.get_versioned_method_map(view, custom_mapping, version)
        assert method_map == {'get': 'get_external_id'}

        version = 'v4'
        method_map = self.router.get_versioned_method_map(view, list_mapping, version)
        assert method_map == {'get': 'list'}
        method_map = self.router.get_versioned_method_map(view, detail_mapping, version)
        assert method_map == {'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}
        method_map = self.router.get_versioned_method_map(view, custom_mapping, version)
        assert method_map == {'get': 'get_external_id'}

        version = 'v5'
        method_map = self.router.get_versioned_method_map(view, list_mapping, version)
        assert method_map == {'get': 'list'}
        method_map = self.router.get_versioned_method_map(view, detail_mapping, version)
        assert method_map == {'get': 'retrieve', 'put': 'update', 'delete': 'destroy'}
        method_map = self.router.get_versioned_method_map(view, custom_mapping, version)
        assert method_map == {'get': 'get_external_id'}

        # Router does not filter out handler in forbidden versions, it just filter default actions,
        # final filtering is done in version_include
        version = 'v6'
        method_map = self.router.get_versioned_method_map(view, list_mapping, version)
        assert method_map == {'get': 'list'}
        method_map = self.router.get_versioned_method_map(view, detail_mapping, version)
        assert method_map == {'get': 'retrieve', 'put': 'update', 'delete': 'destroy'}
        method_map = self.router.get_versioned_method_map(view, custom_mapping, version)
        assert method_map == {'get': 'get_external_id'}

    @pytest.mark.parametrize("version, expected_actions", [
        ('v2', {'get': 'list', 'post': 'create'}),
        ('v3', {'get': 'list', 'post': 'create'}),
        ('v4', {'get': 'list'}),
        ('v5', {'get': 'list'}),
        ('v6', {'get': 'list'}),
    ])
    def test_get_versioned_method_map(self, version, expected_actions):
        self.router.register('dummy', self.class_factory(), basename='dummy')
        urls = self.router.get_versioned_urls(version)
        assert len(urls) == 3
        for url in urls:
            url: URLPattern
            if not url.name == 'dummy-list':
                continue
            assert url.callback.actions == expected_actions











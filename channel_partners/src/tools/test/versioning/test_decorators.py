import pytest
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from rest_framework.decorators import (
    action,
    api_view,
)
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from partners.models import ChannelPartnerServiceExternalId
from partners.serializers.v2.serializers import (
    ChannelPartnerServiceExternalIdSerializer,
)
from partners.views.v2.views import ExternalIdBase
from tools.versioning.decorators import version_range
from tools.versioning.utils import Versions
from tools.versioning.views import VersionedViewMixin


class TestVersionRange:
    @pytest.fixture(autouse=True)
    def setup(self, mocker):
        mocker.patch.object(settings, 'AVAILABLE_VERSIONS', ['v2', 'v3', 'v4', 'v5', 'v6'])


    def class_factory(self):
        @version_range(Versions(min_version="v2", max_version="v5", deprecated_in="v4"),
                       actions={"create": Versions(min_version="v2", max_version="v3", deprecated_in="v3")})
        class ChannelPartnerServiceExternalIdViewSet(ExternalIdBase, VersionedViewMixin, ModelViewSet):
            serializer_class = ChannelPartnerServiceExternalIdSerializer
            queryset = ChannelPartnerServiceExternalId.objects.all()

            @version_range(Versions(min_version="v2", max_version="v3", deprecated_in="v3"))
            @action(detail=False, methods=['get'])
            def get_external_id(self, request):
                return self.get_serializer_class()(ChannelPartnerServiceExternalId.objects.first()).data

        return ChannelPartnerServiceExternalIdViewSet

    def function_factory(self):
        @version_range(Versions(min_version="v3", max_version="v5", deprecated_in="v4"))
        @api_view(['GET'])
        def dummy_view(request):
            return Response({'foo': 'bar'})
        return dummy_view

    def test_class_attributes(self):
        ChannelPartnerServiceExternalIdViewSet = self.class_factory()
        assert ChannelPartnerServiceExternalIdViewSet.versions.versions == ['v2', 'v3', 'v4', 'v5']
        assert ChannelPartnerServiceExternalIdViewSet.versions.allowed_versions == ['v2', 'v3']
        assert ChannelPartnerServiceExternalIdViewSet.versions.deprecated_versions == ['v4', 'v5']
        assert ChannelPartnerServiceExternalIdViewSet.actions_versions['create'].versions == ['v2', 'v3']
        assert ChannelPartnerServiceExternalIdViewSet.actions_versions['create'].allowed_versions == ['v2']
        assert ChannelPartnerServiceExternalIdViewSet.actions_versions['create'].deprecated_versions == ['v3']

    def test_action_handler_attributes(self):
        ChannelPartnerServiceExternalIdViewSet = self.class_factory()
        view = ChannelPartnerServiceExternalIdViewSet.get_external_id
        assert view.versions.versions == ['v2', 'v3']
        assert view.versions.allowed_versions == ['v2']
        assert view.versions.deprecated_versions == ['v3']
        assert view.versions == view.kwargs['versions']

    def test_function_attributes(self):
        view = self.function_factory()
        assert view.view_class.versions.versions == ['v3', 'v4', 'v5']
        assert view.view_class.versions.allowed_versions == ['v3']
        assert view.view_class.versions.deprecated_versions == ['v4', 'v5']

    def test_invalid_version(self):
        with pytest.raises(ImproperlyConfigured) as e:
            @version_range(Versions(min_version="v2", max_version="v3", deprecated_in="v4"))
            def dummy_view(request):
                return Response({'foo': 'bar'})
            assert 'Invalid version' in str(e)

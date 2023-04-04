from django.test import TestCase
from django.urls import reverse

from cms.admin import *
from cms.models import *

import pytest


class TestAssetFilters:
    asset_list_path = reverse('admin:cms_asset_changelist')

    @pytest.fixture(autouse=True)
    def setup(self, admin_client, superuser):
        # Login with any superuser
        self.client = admin_client
        self.superuser = superuser
        caches['filters'].delete(superuser.id)

    def check_filter_saves(self, query_string=''):
        # Apply new filter
        self.check_filter_no_redirect(query_string)
        response = self.client.get(f'{self.asset_list_path}', follow=True)
        assert response.redirect_chain[-1][0] == f'{self.asset_list_path}{query_string}'

    def check_filter_no_redirect(self, query_string=''):
        response = self.client.get(f'{self.asset_list_path}{query_string}', follow=True)
        assert not response.redirect_chain

    @pytest.mark.slow
    def test_filter_caching(self):
        """Test that asset filters are saved and cleared correctly"""
        # Test with no filters cache, should use default filter
        self.check_filter_no_redirect()

        # Apply new filter
        self.check_filter_saves('?asset_type=2')

        # Change filter
        self.check_filter_saves('?customization=4')

        # Clear filter
        self.check_filter_no_redirect('?e=1')
        self.check_filter_no_redirect()

    def test_customization_default(self):
        """Check that assets are filtered by current customization by default"""
        response = self.client.get(f'{self.asset_list_path}')
        assert list(response.context_data['cl'].queryset) == \
               list(Asset.objects.filter(customizations__name=settings.TEST_CUSTOMIZATION).order_by('-pk'))

    def test_customizations_all(self):
        """Check all customizations filter"""
        response = self.client.get(f'{self.asset_list_path}?customization=0')
        assert list(response.context_data['cl'].queryset) == list(Asset.objects.all().order_by('-pk'))

    def test_customizations_other(self):
        """Check other customizations filter"""
        response = self.client.get(f'{self.asset_list_path}?customization=1000')
        assert list(response.context_data['cl'].queryset) == list(Asset.objects.exclude(customizations__name__in=self.superuser.customizations).order_by('-pk'))

    def test_customizations_specific(self):
        """Check filtering by specific customization that has assets"""
        customization = Customization.objects.filter(~Q(asset=None)).first()
        response = self.client.get(f'{self.asset_list_path}?customization={customization.id}')
        assert list(response.context_data['cl'].queryset) == list(Asset.objects.filter(customizations=customization).order_by('-pk'))



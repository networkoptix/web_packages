import logging
from uuid import uuid4

import pytest
from django.core.cache import caches

from channel_partners.mixins.version_mixin import VersionMixin
from partners.models import (
    ChannelPartner,
    CloudSystemId,
    CloudSystemStates,
    Organization,
    OrganizationToUser,
    SystemGroup,
)
from partners.services.cache_service import CacheService
from partners.utils.cache_keys import get_version_cache_key


cache = caches["dependent_cache"]


@pytest.mark.django_db
class TestCacheService:

    @pytest.fixture(autouse=True)
    def setup_method(self):
        pass

    def test_get_cache_key_version(self):
        # Test Setup
        model = ChannelPartner
        object_id = "75a1b24d-cf6d-499e-9e54-eed6896c6275"
        field = "version"

        expected_key = f"{field}:{model.__name__}:{object_id}"
        actual_key = get_version_cache_key(model, object_id, field)

        assert actual_key == expected_key

    def test_get_cache_key_descendant_version(self):
        # Test Setup
        model = ChannelPartner
        object_id = "75a1b24d-cf6d-499e-9e54-eed6896c6275"
        field = "descendant_version"

        expected_key = f"{field}:{model.__name__}:{object_id}"
        actual_key = get_version_cache_key(model, object_id, field)

        assert actual_key == expected_key

    def test_get_versions(self, mocker):
        # Test Setup
        version = 1
        model = ChannelPartner
        id = "75a1b24d-cf6d-499e-9e54-eed6896c6275"

        keys = [{'model': model, 'id': id}]

        # Mock the cache.get_many method to return a specific value
        return_key = {f"version:{model.__name__}:{id}": version}
        mocker.patch('partners.services.cache_service.cache.get_many', return_value=return_key)

        versions = CacheService.get_versions(keys)

        assert versions == return_key

    def test_get_descendant_versions(self, mocker):
        # Test Setup
        version = 1
        model = ChannelPartner
        id = "75a1b24d-cf6d-499e-9e54-eed6896c6275"

        keys = [{'model': model, 'id': id}]

        # Mock the cache.get_many method to return a specific value
        return_key = {f"descendant_version:{model.__name__}:{id}": version}
        mocker.patch('partners.services.cache_service.cache.get_many', return_value=return_key)

        versions = CacheService.get_descendant_versions(keys)

        assert versions == return_key

    def test_get_cached_paths_channel_partner(self, mocker, root_nx_channel_partner, channel_partner_factory):
        # Test Setup
        root_channel_partner = root_nx_channel_partner
        root_child_channel_partner = channel_partner_factory(
            name="root_child",
            parent_channel_partner=root_channel_partner)
        root_grandchild_channel_partner = channel_partner_factory(
            name="root_grandchild",
            parent_channel_partner=root_child_channel_partner)

        # Setup the mocks
        return_key = {}
        mocker.patch('partners.services.cache_service.cache.get_many', return_value=return_key)

        keys = [{'model': ChannelPartner, 'id': root_grandchild_channel_partner.id}]

        actual = CacheService.get_cached_paths(keys)

        expected_key = f"path:{ChannelPartner.__name__}:{root_grandchild_channel_partner.id}"

        assert expected_key in actual
        assert len(actual[expected_key]) == 2

    def test_get_cached_paths_organization(
            self,
            mocker,
            root_nx_channel_partner,
            channel_partner_factory,
            organization_factory
    ) -> None:
        # Test Setup
        ## Setup Channel Partners
        root_channel_partner = root_nx_channel_partner
        root_child_channel_partner = channel_partner_factory(
            name="root_child",
            parent_channel_partner=root_channel_partner)
        root_grandchild_channel_partner = channel_partner_factory(
            name="root_grandchild",
            parent_channel_partner=root_child_channel_partner)

        # Setup Organization
        organization = organization_factory(
            name="org",
            channel_partner=root_grandchild_channel_partner)

        # Setup the mocks
        return_key = {}
        mocker.patch('partners.services.cache_service.cache.get_many', return_value=return_key)

        keys = [{'model': Organization, 'id': organization.id}]

        actual = CacheService.get_cached_paths(keys)

        expected_key = f"path:{Organization.__name__}:{organization.id}"

        assert expected_key in actual
        assert len(actual[expected_key]) == 3

    def test_get_cached_paths_system_group(
            self,
            mocker,
            root_nx_channel_partner,
            channel_partner_factory,
            organization_factory,
            system_group_factory
    ) -> None:
        # Test Setup
        ## Setup Channel Partners
        root_channel_partner: ChannelPartner = root_nx_channel_partner
        root_child_channel_partner: ChannelPartner = channel_partner_factory(
            name="root_child",
            parent_channel_partner=root_channel_partner)
        root_grandchild_channel_partner: ChannelPartner = channel_partner_factory(
            name="root_grandchild",
            parent_channel_partner=root_child_channel_partner)

        # Setup Organization
        organization = organization_factory(
            name="org",
            channel_partner=root_grandchild_channel_partner)

        org_system_group = system_group_factory(organization=organization)

        # Setup the mocks
        return_key = {}
        mocker.patch('partners.services.cache_service.cache.get_many', return_value=return_key)

        keys = [{'model': SystemGroup, 'id': org_system_group.id}]

        actual = CacheService.get_cached_paths(keys)

        expected_key = f"path:{SystemGroup.__name__}:{org_system_group.id}"

        assert expected_key in actual
        assert len(actual[expected_key]) == 4

    def test_get_cached_paths_cloud_system_id_not_belonging_to_group(
            self,
            mocker,
            root_nx_channel_partner,
            channel_partner_factory,
            organization_factory
    ) -> None:
        # Test Setup
        ## Setup Channel Partners
        root_channel_partner: ChannelPartner = root_nx_channel_partner
        root_child_channel_partner: ChannelPartner = channel_partner_factory(
            name="root_child",
            parent_channel_partner=root_channel_partner)
        root_grandchild_channel_partner: ChannelPartner = channel_partner_factory(
            name="root_grandchild",
            parent_channel_partner=root_child_channel_partner)

        # Setup Organization
        organization = organization_factory(
            name="org",
            channel_partner=root_grandchild_channel_partner)

        org_cloud_system = CloudSystemId.objects.get_or_create(
            system_id=str(uuid4()),
            name='Test System',
            system_state=CloudSystemStates.ACTIVATED,
            organization=organization,
            cloud_host=root_grandchild_channel_partner.cloud_host)[0]

        # Setup the mocks
        return_key = {}
        mocker.patch('partners.services.cache_service.cache.get_many', return_value=return_key)

        keys = [{'model': CloudSystemId, 'id': org_cloud_system.id}]

        actual = CacheService.get_cached_paths(keys)

        expected_key = f"path:{CloudSystemId.__name__}:{org_cloud_system.id}"

        assert expected_key in actual
        assert len(actual[expected_key]) == 4

    def test_get_cached_paths_cloud_system_id_belonging_to_system_group(
            self,
            mocker,
            root_nx_channel_partner,
            channel_partner_factory,
            organization_factory,
            system_group_factory
    ) -> None:
        # Test Setup
        ## Setup Channel Partners
        root_channel_partner: ChannelPartner = root_nx_channel_partner
        root_child_channel_partner: ChannelPartner = channel_partner_factory(
            name="root_child",
            parent_channel_partner=root_channel_partner)
        root_grandchild_channel_partner: ChannelPartner = channel_partner_factory(
            name="root_grandchild",
            parent_channel_partner=root_child_channel_partner)

        # Setup Organization
        organization = organization_factory(
            name="org",
            channel_partner=root_grandchild_channel_partner)

        system_group = system_group_factory(organization=organization)

        org_cloud_system = CloudSystemId.objects.get_or_create(
            system_id=str(uuid4()),
            name='Test System',
            system_group=system_group,
            system_state=CloudSystemStates.ACTIVATED,
            organization=organization,
            cloud_host=root_grandchild_channel_partner.cloud_host)[0]

        # Setup the mocks
        return_key = {}
        mocker.patch('partners.services.cache_service.cache.get_many', return_value=return_key)

        keys = [{'model': CloudSystemId, 'id': org_cloud_system.id}]

        actual = CacheService.get_cached_paths(keys)

        expected_key = f"path:{CloudSystemId.__name__}:{org_cloud_system.id}"

        assert expected_key in actual
        assert len(actual[expected_key]) == 5

    def test_get_versions_invalid_model(self, mocker):
        # Test Setup
        model = OrganizationToUser
        id = "75a1b24d-cf6d-499e-9e54-eed6896c6275"

        keys = [{'model': model, 'id': id}]

        # Mock the cache.get_many method to return a specific value
        mocker.patch('partners.services.cache_service.cache.get_many', return_value={})

        with pytest.raises(ValueError):
            CacheService.get_versions(keys)

    @pytest.mark.django_db
    def test_bulk_increment(self, channel_partner_factory):
        # Test Setup
        created_partners = [channel_partner_factory(name=f"partner{i}") for i in range(5)]
        instances = ChannelPartner.objects.filter(id__in=[partner.id for partner in created_partners])
        ids = instances.values_list("id", flat=True)

        version_type = "version"
        mixin_to_check = VersionMixin

        # Call the method to test
        CacheService.bulk_increment(ids, ChannelPartner, version_type, mixin_to_check)

        # Check that the versions have been incremented and cached
        for instance in instances:
            instance.refresh_from_db()
            assert instance.get_version() == 1

    @pytest.mark.django_db
    def test_lua_script_logic(self, caplog):
        # Test Setup
        caplog.set_level(logging.DEBUG)

        old_timestamp = CacheService.timestamp()

        CacheService.set(CacheService.timestamp(), "test_key", 1000)
        CacheService.set(old_timestamp, "test_key", 100)

        actual = cache.get("test_key")
        assert actual == 1000
        assert "Failed to set versions in cache" in caplog.text

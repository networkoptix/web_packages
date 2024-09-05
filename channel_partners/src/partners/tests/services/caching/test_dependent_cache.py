from typing import List

import pytest
from django.core.cache import caches
from django.db import models

from partners.models import (
    ChannelPartner,
    CloudUser,
    Empty,
    Organization,
    OrganizationToUser,
)
from partners.services.caching.cache_dependency import CacheDependency
from partners.services.caching.cache_enums import (
    CachedDependencyFieldTypeEnum,
    CachedFieldChoiceEnum,
    TargetTypeEnum,
)
from partners.services.caching.dependent_cache import DependentCache
from partners.utils.cache_keys import get_version_cache_key


def update_cache(model_instances: List[models.Model]) -> None:
    for instance in model_instances:
        instance.refresh_from_db()
        # Check if the instance has the get_version method
        if hasattr(instance, 'get_version'):
            instance.get_version()

        # Check if the instance has the get_descendant_version method
        if hasattr(instance, 'get_descendant_version'):
            instance.get_descendant_version()

        # Check if the instance has the get_path_version method
        if hasattr(instance, 'get_cached_path'):
            instance.get_cached_path()


def cache_keys() -> List[str]:
    from django.core.cache import caches
    cache = caches["dependent_cache"]
    return cache.keys("*")


@pytest.mark.django_db(transaction=True, reset_sequences=True, serialized_rollback=True)
class TestDependentCache:
    @pytest.fixture(autouse=True, scope="function")
    def setup_method(self):
        caches["default"].clear()
        caches["dependent_cache"].clear()

    def teardown_method(self):
        caches["default"].clear()

    def test_duplicate_dependencies(self):
        # Setup
        dependency_1 = CacheDependency(
            model=Organization,
            field=CachedDependencyFieldTypeEnum.VERSION,
            source="id",
            target=TargetTypeEnum.SELF)

        dependency_2 = CacheDependency(
            model=Organization,
            field=CachedDependencyFieldTypeEnum.VERSION,
            source="id",
            target=TargetTypeEnum.SELF)

        # Exercise and Verify
        with pytest.raises(ValueError, match="Duplicate values found in dependencies"):
            DependentCache(name="test", key_params=["id"], dependencies=[dependency_1, dependency_2])

    def test_validate_auth_not_provided_when_true(
            self,
            channel_partner_factory,
            organization_factory
    ) -> None:
        # Test Setup
        channel_partner = channel_partner_factory()
        organization = organization_factory(channel_partner=channel_partner)

        # Create org_users
        org_user_1 = CloudUser.objects.create(email="org_user_1@aol.com", full_name="Organization User 1")
        org_user_2 = CloudUser.objects.create(email="org_user_2@aol.com", full_name="Organization User 2")

        # Add users to organization
        OrganizationToUser.objects.create(organization=organization, user=org_user_1)
        OrganizationToUser.objects.create(organization=organization, user=org_user_2)

        update_cache([channel_partner, organization, org_user_1, org_user_2])

        # Create Cache
        cache: DependentCache = DependentCache(
            name="organization_users",
            key_params=["organization_id"],
            dependencies=[
                CacheDependency(
                    model=Organization,
                    field=CachedDependencyFieldTypeEnum.VERSION,
                    source="id",
                    target=TargetTypeEnum.SELF)
            ],
            validate_auth=True)

        with pytest.raises(ValueError) as exc_info:
            cache.validate_and_retrieve(
                keys={"organization_id": organization.id},
                validation_sources={"id": organization.id},
                data_fields=['name'],
                auth_entity=None)

        assert 'An AuthEntity must be provided when validate_user is True' in str(exc_info.value)
        self.teardown_method()

    def test_cache_set_and_retrieve_validate_auth_false_no_dependencies(self, organization_factory):
        # Test Setup
        organization = organization_factory()

        # Create org_users
        org_user_1 = CloudUser.objects.create(email="org_user_1@aol.com", full_name="Organization User 1")
        # Add users to organization
        OrganizationToUser.objects.create(organization=organization, user=org_user_1)

        update_cache([organization, org_user_1])
        # Create Cache
        cache: DependentCache = DependentCache(
            name="organization_users",
            key_params=[],
            dependencies=[],
            validate_auth=False)

        # SET
        data_to_set = {
            "name": "Organization 1",
            "description": "Organization 1 description"
        }
        cache.set(
            keys={},
            validation_sources={},
            data=data_to_set
        )

        # GET
        actual = cache.validate_and_retrieve(
            keys={},
            validation_sources={},
            data_fields=['name', 'description'])

        expected = data_to_set
        # Assert that the retrieved data is the same as the data that was set
        assert actual == expected

    def test_cache_set_and_retrieve_validate_auth_false_some_fields_returned(
            self,
            organization_factory
    ) -> None:
        # Test Setup
        organization = organization_factory()

        # Create org_users
        org_user_1 = CloudUser.objects.create(email="org_user_1@aol.com", full_name="Organization User 1")
        org_user_2 = CloudUser.objects.create(email="org_user_2@aol.com", full_name="Organization User 2")

        OrganizationToUser.objects.create(organization=organization, user=org_user_1)
        OrganizationToUser.objects.create(organization=organization, user=org_user_2)

        update_cache([organization, org_user_1, org_user_2])

        # Create Cache
        cache: DependentCache = DependentCache(
            name="organization_users",
            key_params=["organization_id"],
            dependencies=[
                CacheDependency(
                    model=Organization,
                    field=CachedDependencyFieldTypeEnum.VERSION,
                    source="id",
                    target=TargetTypeEnum.SELF)
            ],
            validate_auth=False)

        # SET
        data_to_set = {
            "name": "Organization User 1",
            "description": "User 1 sdfsfdsf"
        }
        cache.set(
            keys={"organization_id": organization.id},
            validation_sources={"id": organization.id},
            data=data_to_set
        )
        # GET
        actual = cache.validate_and_retrieve(
            keys={"organization_id": organization.id},
            validation_sources={"id": organization.id},
            data_fields=['name', 'description', 'should_be_empty'])

        expected = {**data_to_set, 'should_be_empty': Empty}
        # Assert that the retrieved data is the same as the data that was set
        assert actual['name'] == expected['name']
        assert actual['description'] == expected['description']
        assert actual['should_be_empty'] is Empty

    def test_cache_set_and_retrieve_validate_auth_false_all_fields_returned(
            self,
            organization_factory
    ) -> None:
        # Test Setup
        organization = organization_factory()

        # Create org_users
        org_user_1 = CloudUser.objects.create(email="org_user_1@aol.com", full_name="Organization User 1")
        org_user_2 = CloudUser.objects.create(email="org_user_2@aol.com", full_name="Organization User 2")

        OrganizationToUser.objects.create(organization=organization, user=org_user_1)
        OrganizationToUser.objects.create(organization=organization, user=org_user_2)

        update_cache([organization, org_user_1, org_user_2])

        # Create Cache
        cache: DependentCache = DependentCache(
            name="organization_users",
            key_params=["organization_id"],
            dependencies=[
                CacheDependency(
                    model=Organization,
                    field=CachedDependencyFieldTypeEnum.VERSION,
                    source="id",
                    target=TargetTypeEnum.SELF)
            ],
            validate_auth=False)

        # SET
        data_to_set = {
            "name": "Organization User 1",
            "description": "User 1 sdfsfdsf"
        }
        cache.set(
            keys={"organization_id": organization.id},
            validation_sources={"id": organization.id},
            data=data_to_set
        )
        # GET
        actual = cache.validate_and_retrieve(
            keys={"organization_id": organization.id},
            validation_sources={"id": organization.id},
            data_fields=['name', 'description'])

        expected = data_to_set
        # Assert that the retrieved data is the same as the data that was set
        assert actual == expected

    def test_cache_set_and_retrieve_validate_auth_false_all_fields_returned_parent(self, organization_factory):
        # Test Setup
        organization = organization_factory()

        # Create org_users
        org_user_1 = CloudUser.objects.create(email="org_user_1@aol.com", full_name="Organization User 1")
        org_user_2 = CloudUser.objects.create(email="org_user_2@aol.com", full_name="Organization User 2")

        OrganizationToUser.objects.create(organization=organization, user=org_user_1)
        OrganizationToUser.objects.create(organization=organization, user=org_user_2)

        update_cache([organization, org_user_1, org_user_2])

        # Create Cache
        cache: DependentCache = DependentCache(
            name="organization_users",
            key_params=["organization_id"],
            dependencies=[
                CacheDependency(
                    model=Organization,
                    field=CachedDependencyFieldTypeEnum.VERSION,
                    source="id",
                    target=TargetTypeEnum.PARENT)
            ],
            validate_auth=False)

        # SET
        data_to_set = {
            "name": "Organization User 1",
            "description": "User 1 sdfsfdsf"
        }
        cache.set(
            keys={"organization_id": organization.id},
            validation_sources={"id": organization.id},
            data=data_to_set
        )
        # GET
        actual = cache.validate_and_retrieve(
            keys={"organization_id": organization.id},
            validation_sources={"id": organization.id},
            data_fields=['name', 'description'])

        expected = data_to_set
        # Assert that the retrieved data is the same as the data that was set
        assert actual == expected

    def test_cache_set_and_retrieve_validate_with_auth_false_all_fields_returned_parent_channel_partner(
            self,
            channel_partner_factory,
    ) -> None:
        # Test Setup
        cp_root = channel_partner_factory(name="Root")
        cp_child = channel_partner_factory(parent_channel_partner=cp_root, name="Child")
        cp_grandchild = channel_partner_factory(parent_channel_partner=cp_child, name="Grandchild")

        # Update and Refresh Cache
        update_cache([cp_root, cp_child, cp_grandchild])

        # Create Cache
        cache_dependency = CacheDependency(
            model=ChannelPartner,
            field=CachedDependencyFieldTypeEnum.VERSION,
            source="id",
            target=TargetTypeEnum.PARENT)

        cache: DependentCache = DependentCache(
            name="channel_partner",
            key_params=["channel_partner_id"],
            dependencies=[cache_dependency],
            validate_auth=False)

        # SET
        data_to_set = {
            "name": "Child",
            "description": "Child description"
        }

        cache.set(
            keys={"channel_partner_id": cp_child.id},
            validation_sources={"id": cp_child.id},
            data=data_to_set
        )

        # GET
        actual = cache.validate_and_retrieve(
            keys={"channel_partner_id": cp_child.id},
            validation_sources={"id": cp_child.id},
            data_fields=['name', 'description']
        )

        expected = data_to_set
        # Assert that the retrieved data is the same as the data that was set
        assert actual == expected

        # Test get_parent_key method
        path_versions = {
            get_version_cache_key(ChannelPartner, str(cp_child.id), CachedFieldChoiceEnum.PATH_VERSION): [
                ['ChannelPartner', str(cp_root.id)],
                ['ChannelPartner', str(cp_child.id)]
            ]
        }
        parent_key = cache_dependency.get_parent_key(cp_child.id, path_versions)
        assert parent_key['id'] == str(cp_root.id)

    def test_cache_set_and_retrieve_validate_auth_true_all_fields_returned_self(
            self,
            organization_factory
    ) -> None:
        # Test Setup
        organization = organization_factory()

        # Create org_users
        org_user_1 = CloudUser.objects.create(email="org_user_1@aol.com", full_name="Organization User 1")
        org_user_2 = CloudUser.objects.create(email="org_user_2@aol.com", full_name="Organization User 2")

        OrganizationToUser.objects.create(organization=organization, user=org_user_1)
        OrganizationToUser.objects.create(organization=organization, user=org_user_2)

        update_cache([organization, org_user_1, org_user_2])

        # Create Cache
        cache: DependentCache = DependentCache(
            name="organization_users",
            key_params=["organization_id"],
            dependencies=[
                CacheDependency(
                    model=Organization,
                    field=CachedDependencyFieldTypeEnum.VERSION,
                    source="id",
                    target=TargetTypeEnum.SELF)
            ],
            validate_auth=True)

        # SET
        data_to_set = {
            "name": "Organization User 1",
            "description": "User 1 sdfsfdsf"
        }
        cache.set(
            keys={"organization_id": organization.id},
            validation_sources={"id": organization.id},
            data=data_to_set,
            auth_entity=org_user_1
        )
        # GET
        actual = cache.validate_and_retrieve(
            keys={"organization_id": organization.id},
            validation_sources={"id": organization.id},
            data_fields=['name', 'description'],
            auth_entity=org_user_1)

        expected = data_to_set
        # Assert that the retrieved data is the same as the data that was set
        assert actual == expected

    def test_cache_set_and_retrieve_validate_auth_true_all_fields_returned_descendant(
            self,
            organization_factory
    ) -> None:
        # Test Setup
        organization = organization_factory()

        # Create org_users
        org_user_1 = CloudUser.objects.create(email="org_user_1@aol.com", full_name="Organization User 1")

        OrganizationToUser.objects.create(organization=organization, user=org_user_1)

        update_cache([organization, org_user_1])

        # Create Cache
        cache: DependentCache = DependentCache(
            name="organization_users",
            key_params=["organization_id"],
            dependencies=[
                CacheDependency(
                    model=Organization,
                    field=CachedDependencyFieldTypeEnum.DESCENDANT_VERSION,
                    source="id",
                    target=TargetTypeEnum.SELF)
            ],
            validate_auth=True)

        # SET
        data_to_set = {
            "name": "Organization User 1",
            "description": "User 1 sdfsfdsf"
        }
        cache.set(
            keys={"organization_id": organization.id},
            validation_sources={"id": organization.id},
            data=data_to_set,
            auth_entity=org_user_1
        )
        # GET
        actual = cache.validate_and_retrieve(
            keys={"organization_id": organization.id},
            validation_sources={"id": organization.id},
            data_fields=['name', 'description'],
            auth_entity=org_user_1)

        expected = data_to_set
        # Assert that the retrieved data is the same as the data that was set
        assert actual == expected

    def test_cache_set_and_retrieve_validate_auth_true_all_fields_returned_multi(self, organization_factory):
        # Test Setup
        organization = organization_factory()

        # Create org_users
        org_user_1 = CloudUser.objects.create(email="org_user_1@aol.com", full_name="Organization User 1")

        OrganizationToUser.objects.create(organization=organization, user=org_user_1)

        update_cache([organization, org_user_1])

        # Create Cache
        cache: DependentCache = DependentCache(
            name="organization_users",
            key_params=["organization_id"],
            dependencies=[
                CacheDependency(
                    model=Organization,
                    field=CachedDependencyFieldTypeEnum.VERSION,
                    source="id",
                    target=TargetTypeEnum.SELF),
                CacheDependency(
                    model=Organization,
                    field=CachedDependencyFieldTypeEnum.DESCENDANT_VERSION,
                    source="id",
                    target=TargetTypeEnum.PARENT),
                CacheDependency(
                    model=Organization,
                    field=CachedDependencyFieldTypeEnum.DESCENDANT_VERSION,
                    source="id",
                    target=TargetTypeEnum.ANCESTOR)
            ],
            validate_auth=True)

        # SET
        data_to_set = {
            "name": "Organization User 1",
            "description": "User 1 sdfsfdsf"
        }
        cache.set(
            keys={"organization_id": organization.id},
            validation_sources={"id": organization.id},
            data=data_to_set,
            auth_entity=org_user_1
        )

        # GET
        actual = cache.validate_and_retrieve(
            keys={"organization_id": organization.id},
            validation_sources={"id": organization.id},
            data_fields=['name', 'description'],
            auth_entity=org_user_1)

        expected = data_to_set
        # Assert that the retrieved data is the same as the data that was set
        assert actual == expected

    def test_cache_set_and_retrieve_validate_auth_true_all_fields_returned_multi_user_added_after_none_returns(
            self,
            organization_factory
    ) -> None:
        # Test Setup
        organization = organization_factory()

        # Create org_users
        org_user_1 = CloudUser.objects.create(email="org_user_1@aol.com", full_name="Organization User 1")

        update_cache([organization, org_user_1])

        # Create Cache
        cache: DependentCache = DependentCache(
            name="organization_users",
            key_params=["organization_id"],
            dependencies=[
                CacheDependency(
                    model=Organization,
                    field=CachedDependencyFieldTypeEnum.VERSION,
                    source="id",
                    target=TargetTypeEnum.SELF),
                CacheDependency(
                    model=Organization,
                    field=CachedDependencyFieldTypeEnum.DESCENDANT_VERSION,
                    source="id",
                    target=TargetTypeEnum.SELF)
            ],
            validate_auth=True)

        # SET
        data_to_set = {
            "name": "Organization User 1",
            "description": "User 1 sdfsfdsf"
        }
        cache.set(
            keys={"organization_id": organization.id},
            validation_sources={"id": organization.id},
            data=data_to_set,
            auth_entity=org_user_1
        )

        # Add user to organization after cache.set
        OrganizationToUser.objects.create(organization=organization, user=org_user_1)

        # GET
        actual = cache.validate_and_retrieve(
            keys={"organization_id": organization.id},
            validation_sources={"id": organization.id},
            data_fields=['name', 'description'],
            auth_entity=org_user_1)

        expected = None
        # Assert that the retrieved data is None as the user was added to the organization after cache.set
        assert actual == expected

    def test_duplicate_key_params(self):
        with pytest.raises(ValueError):
            DependentCache(name="test", key_params=["id", "id"], dependencies=[])

    def test_set_invalid_user(self):
        dependency = CacheDependency(model=ChannelPartner, field=CachedDependencyFieldTypeEnum.VERSION, source='id')
        cache = DependentCache(name="test", key_params=["id"], dependencies=[dependency], validate_auth=True)
        with pytest.raises(ValueError):
            cache.set(
                keys={"id": "12345"},
                validation_sources={},
                data={},
                auth_entity=None
            )

    def test_validate_and_retrieve_invalid_keys(self):
        dependency = CacheDependency(model=ChannelPartner, field=CachedDependencyFieldTypeEnum.VERSION, source='id')
        cache = DependentCache(name="test", key_params=["id"], dependencies=[dependency])
        with pytest.raises(ValueError):
            cache.validate_and_retrieve(keys={"invalid_key": "12345"}, validation_sources={}, data_fields=[])

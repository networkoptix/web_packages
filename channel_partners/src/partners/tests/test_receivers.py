
import pytest
from django.core.cache import caches

from partners.models import (
    ChannelPartner,
    ChannelPartnerServiceRecord,
    ChannelPartnerToUser,
    CloudSystemId,
    CloudUser,
    Organization,
    OrganizationRole,
    OrganizationToUser,
    SystemGroup,
)


class TestReceivers:

    @pytest.fixture(autouse=True, scope="function")
    def setup_method(self, django_capture_on_commit_callbacks):
        self.capture_callbacks = django_capture_on_commit_callbacks
        caches["dependent_cache"].clear()

    def teardown_method(self):
        caches["dependent_cache"].clear()

    def assert_both_versions(self, instance, expected_value):
        from django.db import transaction
        def check_versions():
            instance.refresh_from_db()
            assert instance.version == expected_value
            assert instance.get_version() == expected_value

        transaction.on_commit(check_versions)

    def assert_both_descendant_versions(self, instance, expected_value):
        from django.db import transaction
        def check_descendant_versions():
            instance.refresh_from_db()
            assert instance.descendant_version == expected_value
            assert instance.get_descendant_version() == expected_value

        transaction.on_commit(check_descendant_versions)

    def assert_path_version(self, instance):
        from django.db import transaction
        def check_path_version():
            instance.refresh_from_db()
            if instance.__class__.__name__ in ['SystemGroup', 'CloudSystemId']:
                path_version = instance.build_path_for_systems
            else:
                path_version = instance.build_path

            cached = instance.get_path_version()
            actual = path_version
            print(cached, actual)
            assert actual == cached

            transaction.on_commit(check_path_version)

    def test_system_move_between_groups(self, organization_factory, system_group_factory, system_factory):
        with self.capture_callbacks(execute=True):
            # Step 1: Create an organization and a few system groups within that organization
            organization: Organization = organization_factory()
            group1: SystemGroup = system_group_factory(organization=organization, name="Group 1")
            group2: SystemGroup = system_group_factory(organization=organization, name="Group 2")

            # Step 2: Create a system and assign it to one of the system groups
            system: CloudSystemId = system_factory(organization=organization, system_group=group1)

        self.assert_both_versions(system, 0)
        self.assert_path_version(system)

        with self.capture_callbacks(execute=True):
            # Move the system to another system group
            system.system_group = group2
            system.save()

        self.assert_both_versions(system, 1)
        self.assert_path_version(system)

        self.teardown_method()

    def test_system_move_to_organization_root(self, organization_factory, system_group_factory, system_factory):
        with self.capture_callbacks(execute=True):
            # Step 1: Create an organization and a system group within that organization
            organization = organization_factory()
            group = system_group_factory(organization=organization)

            # Step 2: Create a system and assign it to the system group
            system = system_factory(organization=organization, system_group=group)

        self.assert_both_versions(system, 0)
        self.assert_path_version(system)

        with self.capture_callbacks(execute=True):
            system.system_group = None
            system.save()
        self.assert_both_versions(system, 1)
        self.assert_path_version(system)

        self.teardown_method()

    def test_system_group_with_parent_group_increase_version_on_organization_to_user_change(
            self,
            channel_partner_factory,
            organization_factory,
            system_group_factory
    ) -> None:
        with self.capture_callbacks(execute=True):
            # Test Setup
            channel_partner = channel_partner_factory()
            organization = organization_factory(
                channel_partner=channel_partner)
            user = CloudUser.objects.create(
                email="test@aol.com",
                full_name="Test User")

            role = OrganizationRole.objects.get(name='System Health Viewer').id

            parent_system_group = system_group_factory(
                organization=organization)

        self.assert_both_versions(parent_system_group, 0)
        self.assert_both_descendant_versions(parent_system_group, 0)

        with self.capture_callbacks(execute=True):
            child_system_group_1 = system_group_factory(
                organization=organization,
                parent=parent_system_group)

            child_system_group_2 = system_group_factory(
                organization=organization,
                parent=parent_system_group)

        self.assert_both_versions(child_system_group_1, 0)
        self.assert_both_descendant_versions(child_system_group_1, 0)

        with self.capture_callbacks(execute=True):
            # Add the user to the organization w/ system
            organization_user = OrganizationToUser.objects.create(
                user=user,
                organization=organization,
                system_group=parent_system_group,
                roles=[role])

        self.assert_both_versions(child_system_group_1, 1)
        self.assert_both_descendant_versions(child_system_group_1, 0)

        self.assert_both_versions(child_system_group_2, 1)
        self.assert_both_descendant_versions(child_system_group_2, 0)

        self.assert_both_versions(parent_system_group, 1)
        self.assert_both_descendant_versions(parent_system_group, 2)

        with self.capture_callbacks(execute=True):
            # Change organization user
            organization_user.title = "New Title"
            organization_user.save()

        self.assert_both_versions(child_system_group_1, 2)
        self.assert_both_descendant_versions(child_system_group_1, 0)

        self.assert_both_versions(child_system_group_2, 2)
        self.assert_both_descendant_versions(child_system_group_2, 0)

        self.assert_both_versions(parent_system_group, 2)
        self.assert_both_descendant_versions(parent_system_group, 2)

        self.teardown_method()

    def test_system_group_no_parent_increase_version_on_organization_to_user_change(
            self,
            channel_partner_factory,
            organization_factory,
            system_group_factory
    ) -> None:
        with self.capture_callbacks(execute=True):
            # Test Setup
            channel_partner = channel_partner_factory()
            organization = organization_factory(
                channel_partner=channel_partner)
            user = CloudUser.objects.create(
                email="test@aol.com",
                full_name="Test User")

            role = OrganizationRole.objects.get(name='System Health Viewer').id

            system_group = system_group_factory(
                organization=organization)

        self.assert_both_versions(system_group, 0)
        self.assert_both_descendant_versions(system_group, 0)

        with self.capture_callbacks(execute=True):
            # Add the user to the organization w/ system
            organization_user = OrganizationToUser.objects.create(
                user=user,
                organization=organization,
                system_group=system_group,
                roles=[role])

        self.assert_both_versions(system_group, 1)
        self.assert_both_descendant_versions(system_group, 0)

        with self.capture_callbacks(execute=True):
            # Change organization user
            organization_user.title = "New Title"
            organization_user.save()

        self.assert_both_versions(system_group, 2)
        self.assert_both_descendant_versions(system_group, 0)

        self.teardown_method()

    def test_organization_increment_descendant_on_system_group_change(
            self,
            channel_partner_factory,
            organization_factory,
            system_group_factory
    ) -> None:
        with self.capture_callbacks(execute=True):
            # Test Setup
            channel_partner = channel_partner_factory()
            organization = organization_factory(
                channel_partner=channel_partner)

        self.assert_both_versions(organization, 0)
        self.assert_both_descendant_versions(organization, 0)

        with self.capture_callbacks(execute=True):
            system_group = system_group_factory(
                organization=organization)

        # Test after creating the system group
        self.assert_both_versions(system_group, 0)

        self.assert_both_versions(organization, 0)
        self.assert_both_descendant_versions(organization, 1)

        with self.capture_callbacks(execute=True):
            # Change the system group
            system_group.name = "New Name"
            system_group.save()

        # Test after changing the system group
        self.assert_both_versions(system_group, 1)
        self.assert_both_versions(organization, 0)

        self.assert_both_versions(organization, 0)
        self.assert_both_descendant_versions(organization, 2)

        self.teardown_method()

    def test_organization_increment_descendant_on_cloud_system_change(
            self,
            channel_partner_factory,
            organization_factory,
            system_factory,
            system_group_factory
    ) -> None:
        with self.capture_callbacks(execute=True):
            # Test Setup
            channel_partner = channel_partner_factory()
            organization = organization_factory(
                channel_partner=channel_partner)

        self.assert_both_versions(organization, 0)
        self.assert_both_descendant_versions(organization, 0)

        with self.capture_callbacks(execute=True):
            system = system_factory(organization=organization)

        # Test after creating the system
        self.assert_both_versions(system, 0)

        self.assert_both_versions(organization, 0)
        self.assert_both_descendant_versions(organization, 1)

        with self.capture_callbacks(execute=True):
            # Change the system
            system.name = "New Name"
            system.save()

        # Test after changing the system
        self.assert_both_versions(system, 1)
        self.assert_both_versions(organization, 0)

        self.assert_both_versions(organization, 0)
        self.assert_both_descendant_versions(organization, 2)

    def test_cloud_system_increment_version_on_service_record_change(
            self,
            channel_partner_factory,
            organization_factory,
            cp_service_factory,
            service_record_factory,
            system_factory
    ) -> None:
        with self.capture_callbacks(execute=True):
            # Test Setup
            channel_partner = channel_partner_factory()

            organization = organization_factory(
                channel_partner=channel_partner)

            system = system_factory(
                organization=organization)

        # Test CloudSystem upon creation
        self.assert_both_versions(system, 0)

        with self.capture_callbacks(execute=True):
            service = cp_service_factory(
                channel_partner=channel_partner)

        # Service isn't connected to the system yet
        self.assert_both_versions(system, 0)

        with self.capture_callbacks(execute=True):
            # Create Service Record manually instead of using the factory
            # due to the need to explicitly test the version increment --
            #   - The factory will make it at Version 3
            service_record = ChannelPartnerServiceRecord.objects.create(
                service=service,
                cloud_system=system,
                organization=organization,
                created_ts=service.created_ts,
                effective_ts=service.created_ts)

        # Test after creating the service record
        self.assert_both_versions(system, 1)

        with self.capture_callbacks(execute=True):
            # Change the service record
            service_record.effective_ts = service_record.effective_ts.replace(year=2022)
            service_record.save()

        # Test after changing the service record
        self.assert_both_versions(system, 2)

        self.teardown_method()

    def test_cloud_system_disconnect(
            self,
            channel_partner_factory,
            organization_factory,
            cp_service_factory,
            service_record_factory,
            system_factory
    ) -> None:

        with self.capture_callbacks(execute=True):
            # Test Setup
            channel_partner = channel_partner_factory()

            organization = organization_factory(
                channel_partner=channel_partner)

        self.assert_both_descendant_versions(organization, 0)

        with self.capture_callbacks(execute=True):
            system = system_factory(
                organization=organization)

        self.assert_both_descendant_versions(organization, 1)

        # Test CloudSystem upon creation
        self.assert_both_versions(system, 0)

        with self.capture_callbacks(execute=True):
            service = cp_service_factory(
                channel_partner=channel_partner)

        # Service isn't connected to the system yet
        self.assert_both_versions(system, 0)

        with self.capture_callbacks(execute=True):
            system.disconnect_system()

        # Test after disconnecting the service
        self.assert_both_versions(system, 1)
        self.assert_both_descendant_versions(organization, 2)

    def test_system_disconnect_several_users_2(
            self,
            channel_partner_factory,
            organization_factory,
            cp_service_factory,
            service_record_factory,
            system_factory,
            system_group_factory
    ) -> None:

        with self.capture_callbacks(execute=True):
            # Test Setup
            channel_partner = channel_partner_factory()

            organization = organization_factory(
                channel_partner=channel_partner)

            group_1_0 = system_group_factory(organization=organization, name="Group 1.0")
            group_1_1 = system_group_factory(organization=organization, name="Group 1.1", parent=group_1_0)
            group_1_2 = system_group_factory(organization=organization, name="Group 1.2", parent=group_1_0)
            group_1_3 = system_group_factory(organization=organization, name="Group 1.3", parent=group_1_0)

            group_1_1.delete()

        # Test after disconnecting the service
        self.assert_both_versions(group_1_0, 0)
        self.assert_both_descendant_versions(group_1_0, 4)

    def test_system_group_move_group(
            self,
            system_group_factory,
            channel_partner_factory,
            organization_factory
    ) -> None:

        with self.capture_callbacks(execute=True):
            # Test Setup
            channel_partner = channel_partner_factory()
            organization = organization_factory(
                channel_partner=channel_partner)
            ## Groups
            parent_group = system_group_factory(
                name="Parent Group",
                organization=organization)
            child_group = system_group_factory(
                name="Child Group",
                parent=parent_group,
                organization=organization)

        # Test SystemGroup upon creation
        self.assert_both_versions(parent_group, 0)
        self.assert_both_versions(child_group, 0)

        with self.capture_callbacks(execute=True):
            # Move the child group to another group
            new_parent_group = system_group_factory(
                name="New Parent Group",
                organization=organization)
            child_group.parent = new_parent_group
            child_group.save()

        # Test after moving the child group
        self.assert_both_versions(parent_group, 0)
        self.assert_both_versions(new_parent_group, 0)
        self.assert_both_versions(child_group, 1)
        self.teardown_method()

    def test_user_increment_version_add_to_channel_partner_to_user(self, channel_partner_factory):

        with self.capture_callbacks(execute=True):
            # Test Setup
            user = CloudUser.objects.create(
                email="test@example.com",
                full_name="Test User"
            )
            channel_partner = channel_partner_factory()

        # Default version upon creation
        self.assert_both_versions(user, 0)

        with self.capture_callbacks(execute=True):
            # Add the user to the channel partner
            channel_partner_user = ChannelPartnerToUser.objects.create(
                channel_partner=channel_partner,
                user=user
            )

        # Test after create
        self.assert_both_versions(user, 1)

        with self.capture_callbacks(execute=True):
            # Remove user from the channel partner
            channel_partner_user.delete()

        # Test after delete
        self.assert_both_versions(user, 2)
        self.teardown_method()

    def test_user_increment_version_add_to_organization_to_user(
            self,
            channel_partner_factory,
            organization_factory,
            org_user_factory):
        with self.capture_callbacks(execute=True):
            # Test Setup
            user = CloudUser.objects.create(
                email="test@example.com",
                full_name="Test User")

        # Default version upon creation
        self.assert_both_versions(user, 0)

        with self.capture_callbacks(execute=True):
            channel_partner = channel_partner_factory()
            organization = organization_factory(
                channel_partner=channel_partner)

            # Add the user to the organization
            organization_user = org_user_factory(
                email=user.email,
                role='Organization Administrator',
                organization=organization)

        # Test after create
        self.assert_both_versions(user, 1)

        with self.capture_callbacks(execute=True):
            # Remove user from the organization
            organization_user.delete()

        # Test after delete
        self.assert_both_versions(user, 2)
        self.teardown_method()

    def test_change_channel_partner_to_user_increment_channel_partner_version(
            self,
            channel_partner_factory
    ) -> None:
        with self.capture_callbacks(execute=True):
            # Test Setup
            user = CloudUser.objects.create(
                email="test@example.com",
                full_name="Test User")

        # Default version upon creation
        self.assert_both_versions(user, 0)

        with self.capture_callbacks(execute=True):
            channel_partner = channel_partner_factory()

        # Test after create
        self.assert_both_versions(user, 0)
        self.assert_both_versions(channel_partner, 0)

        with self.capture_callbacks(execute=True):
            # Add the user to the channel partner
            channel_partner_user = ChannelPartnerToUser.objects.create(
                channel_partner=channel_partner,
                user=user)

        # Test after create
        self.assert_both_versions(user, 1)
        self.assert_both_versions(channel_partner, 1)

        with self.capture_callbacks(execute=True):
            # Change join table entry
            channel_partner_user.title = "New Title"
            channel_partner_user.save()

        # Test after save
        self.assert_both_versions(user, 2)
        self.assert_both_versions(channel_partner, 2)
        self.teardown_method()

    def test_change_organization_to_user_increment_organization_version(
            self,
            channel_partner_factory,
            organization_factory,
            org_user_factory):
        with self.capture_callbacks(execute=True):
            # Test Setup
            user = CloudUser.objects.create(
                email="test@example.com",
                full_name="Test User")

        # Default version upon creation
        self.assert_both_versions(user, 0)

        with self.capture_callbacks(execute=True):
            channel_partner: ChannelPartner = channel_partner_factory()
            organization: Organization = organization_factory(
                channel_partner=channel_partner)

            # Add the user to the organization
            organization_user: OrganizationToUser = org_user_factory(
                email=user.email,
                role='Organization Administrator',
                organization=organization)

        # Test after create
        self.assert_both_versions(user, 1)
        self.assert_both_versions(organization, 1)

        with self.capture_callbacks(execute=True):
            # Change join table entry
            organization_user.title = "New Title"
            organization_user.save()

        # Test after save
        self.assert_both_versions(user, 2)
        self.assert_both_versions(organization, 2)
        self.teardown_method()

    def test_channel_partner_increment_version_on_direct_attribute_change(self, channel_partner_factory) -> None:
        with self.capture_callbacks(execute=True):
            # Test Setup
            channel_partner = channel_partner_factory(name="Test Channel Partner")

        # Default version upon creation
        self.assert_both_versions(channel_partner, 0)

        with self.capture_callbacks(execute=True):
            # Change the name of the channel partner
            channel_partner.name = "New Name"
            channel_partner.save()

        # Test after save
        self.assert_both_versions(channel_partner, 1)
        self.teardown_method()

    def test_organization_increment_version_on_direct_attribute_change(self, organization_factory) -> None:
        with self.capture_callbacks(execute=True):
            # Test Setup
            organization = organization_factory(name="Test Organization")

        # Default version upon creation
        self.assert_both_versions(organization, 0)

        with self.capture_callbacks(execute=True):
            # Change the name of the organization
            organization.name = "New Name"
            organization.save()

        # Test after save
        self.assert_both_versions(organization, 1)
        self.teardown_method()

    def test_cloud_system_id_increment_version_on_direct_attribute_change(self, system_factory) -> None:
        with self.capture_callbacks(execute=True):
            # Test Setup
            system = system_factory(name="Test System")

        # Default version upon creation
        self.assert_both_versions(system, 0)

        with self.capture_callbacks(execute=True):
            # Change the name of the system
            system.name = "New Name"
            system.save()

        # Test after save
        self.assert_both_versions(system, 1)
        self.teardown_method()

    def test_system_group_increment_version_on_direct_attribute_change(
            self,
            organization_factory,
            system_group_factory
    ) -> None:
        with self.capture_callbacks(execute=True):
            # Test Setup
            organization = organization_factory(
                name="Test Organization")
            system_group = system_group_factory(
                organization=organization,
                name="Test System Group")

        # Default version upon creation
        self.assert_both_versions(system_group, 0)
        self.assert_both_descendant_versions(system_group, 0)

        with self.capture_callbacks(execute=True):
            # Change the name of the system group
            system_group.name = "New Name"
            system_group.save()

        # Test after save
        self.assert_both_versions(system_group, 1)
        self.assert_both_descendant_versions(system_group, 0)
        self.teardown_method()

    def test_system_group_increment_descendant_version_on_descendant_grand_change_child(
            self,
            organization_factory,
            system_group_factory
    ) -> None:

        with self.capture_callbacks(execute=True):
            # Create an organization and a root system group
            organization = organization_factory(
                name="Test Organization")
            root_system_group: SystemGroup = system_group_factory(
                organization=organization,
                name="Root System Group")

        # Assert that the version and descendant_version of the root system group are 0 upon creation
        self.assert_both_versions(root_system_group, 0)
        self.assert_both_descendant_versions(root_system_group, 0)

        with self.capture_callbacks(execute=True):
            # Create a child system group under the root system group
            child_system_group: SystemGroup = system_group_factory(
                organization=organization,
                name="Child System Group",
                parent=root_system_group)

        # Assert that the version and descendant_version of the child system group are 0 upon creation
        self.assert_both_versions(child_system_group, 0)
        self.assert_both_descendant_versions(child_system_group, 0)

        # Assert that the descendant_version of the root system group is incremented to 1 after the creation of the child system group
        self.assert_both_versions(root_system_group, 0)
        self.assert_both_descendant_versions(root_system_group, 1)

        with self.capture_callbacks(execute=True):
            # Create a grandchild system group under the child system group
            grand_child_system_group: SystemGroup = system_group_factory(
                organization=organization,
                name="Grand Child System Group",
                parent=child_system_group)

        # Assert that the version and descendant_version of the grandchild system group are 0 upon creation
        self.assert_both_versions(grand_child_system_group, 0)
        self.assert_both_descendant_versions(grand_child_system_group, 0)

        # Assert that the descendant_version of the child system group is incremented to 1 after the creation of the grandchild system group
        self.assert_both_versions(child_system_group, 0)
        self.assert_both_descendant_versions(child_system_group, 1)

        # Assert that the descendant_version of the root system group is incremented to 2 after the creation of the grandchild system group
        self.assert_both_versions(root_system_group, 0)
        self.assert_both_descendant_versions(root_system_group, 2)

        with self.capture_callbacks(execute=True):
            # Update the name of the grandchild system group
            grand_child_system_group.name = "Grand Child System Group v1"
            grand_child_system_group.save()

        # Assert that the version of the grandchild system group is incremented to 1 after the update
        # Assert that the descendant_version of the grandchild system group remains 0 as it has no descendants
        self.assert_both_versions(grand_child_system_group, 1)
        self.assert_both_descendant_versions(grand_child_system_group, 0)

        # Assert that the descendant_version of the child system group is incremented to 2 after the update of the grandchild system group
        self.assert_both_versions(child_system_group, 0)
        self.assert_both_descendant_versions(child_system_group, 2)

        # Assert that the descendant_version of the root system group is incremented to 3 after the update of the grandchild system group
        self.assert_both_versions(root_system_group, 0)
        self.assert_both_descendant_versions(root_system_group, 3)
        self.teardown_method()

    def test_channel_partner_increment_descendant_version_on_descendant_change(self, channel_partner_factory) -> None:

        with self.capture_callbacks(execute=True):
            # Test Setup
            root_channel_partner = channel_partner_factory(
                name="Root Channel Partner")

        # Root upon creation
        self.assert_both_versions(root_channel_partner, 0)
        self.assert_both_descendant_versions(root_channel_partner, 0)

        with self.capture_callbacks(execute=True):
            # Create a child channel partner under the root channel partner
            child_channel_partner = channel_partner_factory(
                name="Child Channel Partner",
                parent_channel_partner=root_channel_partner)

        # Child upon creation
        self.assert_both_versions(child_channel_partner, 0)
        self.assert_both_descendant_versions(child_channel_partner, 0)

        # Root upon Child creation
        self.assert_both_versions(root_channel_partner, 0)
        self.assert_both_descendant_versions(root_channel_partner, 1)

        with self.capture_callbacks(execute=True):
            # Change the name of the child channel partner
            child_channel_partner.name = "New Name"
            child_channel_partner.save()

        # Child upon save
        self.assert_both_versions(child_channel_partner, 1)
        self.assert_both_descendant_versions(child_channel_partner, 0)

        # Root upon Child save
        self.assert_both_versions(root_channel_partner, 0)
        self.assert_both_descendant_versions(root_channel_partner, 2)
        self.teardown_method()

    def test_on_cloud_user_channel_partner_change(self, channel_partner_factory):
        with self.capture_callbacks(execute=True):
            # Test Setup
            user = CloudUser.objects.create(
                email="test@example.com",
                full_name="Test User")

            channel_partner1 = channel_partner_factory(
                name="Channel Partner 1")
            channel_partner2 = channel_partner_factory(
                name="Channel Partner 2")

        # Default version upon creation
        self.assert_both_versions(user, 0)
        self.assert_both_versions(channel_partner1, 0)
        self.assert_both_versions(channel_partner2, 0)

        with self.capture_callbacks(execute=True):
            # Add the user to the channel partners
            channel_partner_user_1 = ChannelPartnerToUser.objects.create(
                channel_partner=channel_partner1,
                user=user)

            channel_partner_user_2 = ChannelPartnerToUser.objects.create(
                channel_partner=channel_partner2,
                user=user)

        # Test after adding channel partners
        self.assert_both_versions(user, 2)
        self.assert_both_versions(channel_partner1, 1)
        self.assert_both_versions(channel_partner2, 1)

        with self.capture_callbacks(execute=True):
            # Remove Channel Partner 1
            channel_partner_user_1.delete()

        # Test after removing Channel Partner 1
        self.assert_both_versions(user, 3)
        self.assert_both_versions(channel_partner1, 2)
        self.assert_both_versions(channel_partner2, 1)

        with self.capture_callbacks(execute=True):
            # Remove remaining Channel Partner
            channel_partner_user_2.delete()

        # Test after removing all channel partners
        self.assert_both_versions(user, 4)
        self.assert_both_versions(channel_partner1, 2)
        self.assert_both_versions(channel_partner2, 2)
        self.teardown_method()

    def test_channel_partner_user_on_change_with_hierarchy(self, channel_partner_factory):
        """
        - We create a cloud user (default: version=0)
        - We create a root channel partner (default: version=0, descendant_version=0)
        - We create a child channel partner under the root channel partner (default: version=0, descendant_version=0)
            - root channel partner's descendant_version should be incremented to 1
        - We add the user to the child channel partner (user version=1, child channel partner version=1, descendant_version=0)
            - root channel partner's descendant_version should be incremented to 2
        - We change the name of the child channel partner (user version=1, child channel partner version=2, descendant_version=0)
            - root channel partner's descendant_version should be incremented to 3
        """
        with self.capture_callbacks(execute=True):
            # Test Setup
            user = CloudUser.objects.create(
                email="test@example.com",
                full_name="Test User")

        # Default user version upon creation
        self.assert_both_versions(user, 0)

        with self.capture_callbacks(execute=True):
            # Create a root channel partner
            root_channel_partner = channel_partner_factory(
                name="Root Channel Partner")

        # Root upon creation
        self.assert_both_versions(root_channel_partner, 0)
        self.assert_both_descendant_versions(root_channel_partner, 0)

        with self.capture_callbacks(execute=True):
            # Create a child channel partner under the root channel partner
            child_channel_partner = channel_partner_factory(
                name="Child Channel Partner",
                parent_channel_partner=root_channel_partner)

        # Child upon creation
        ## Test user
        self.assert_both_versions(user, 0)
        ## Test root channel partner
        self.assert_both_versions(root_channel_partner, 0)
        self.assert_both_descendant_versions(root_channel_partner, 1)
        ## Test new child channel partner
        self.assert_both_versions(child_channel_partner, 0)
        self.assert_both_descendant_versions(child_channel_partner, 0)

        with self.capture_callbacks(execute=True):
            # Add the user to the child channel partner
            channel_partner_user = ChannelPartnerToUser.objects.create(
                channel_partner=child_channel_partner,
                user=user)

        # Test after adding the user to the child channel partner
        ## Test user
        self.assert_both_versions(user, 1)
        ## Test root channel partner
        self.assert_both_versions(root_channel_partner, 0)
        self.assert_both_descendant_versions(root_channel_partner, 2)
        ## Test child channel partner
        self.assert_both_versions(child_channel_partner, 1)
        self.assert_both_descendant_versions(child_channel_partner, 0)

        with self.capture_callbacks(execute=True):
            # Change the name of the child channel partner
            child_channel_partner.name = "New Name"
            child_channel_partner.save()

        # Test after changing the name of the child channel partner
        ## Test user
        self.assert_both_versions(user, 2)
        ## Test root channel partner
        self.assert_both_versions(root_channel_partner, 0)
        self.assert_both_descendant_versions(root_channel_partner, 3)
        ## Test child channel partner
        self.assert_both_versions(child_channel_partner, 2)
        self.assert_both_descendant_versions(child_channel_partner, 0)
        self.teardown_method()

    def test_user_increment_version_on_newly_added_organization_change(self, organization_factory):
        with self.capture_callbacks(execute=True):
            # Test Setup
            user = CloudUser.objects.create(
                email="test@example.com",
                full_name="Test User")

        # Test User upon creation
        self.assert_both_versions(user, 0)

        with self.capture_callbacks(execute=True):
            organization = organization_factory()

        # Test Organization upon creation
        self.assert_both_versions(organization, 0)

        with self.capture_callbacks(execute=True):
            # Add the user to the organization
            OrganizationToUser.objects.create(
                user=user,
                organization=organization)

        # Test after create
        self.assert_both_versions(user, 1)
        self.assert_both_versions(organization, 1)

        # Test after create
        self.assert_both_versions(user, 1)
        self.assert_both_versions(organization, 1)
        self.teardown_method()

    def test_user_increment_version_on_current_organization_change(self, organization_factory):
        with self.capture_callbacks(execute=True):
            # Test Setup
            user = CloudUser.objects.create(
                email="test@example.com",
                full_name="Test User")

        # Test User upon creation
        self.assert_both_versions(user, 0)

        with self.capture_callbacks(execute=True):
            organization = organization_factory()

        # Test Organization upon creation
        self.assert_both_versions(organization, 0)

        with self.capture_callbacks(execute=True):
            # Add the user to the organization
            OrganizationToUser.objects.create(
                user=user,
                organization=organization)

        # Test after create
        self.assert_both_versions(user, 1)
        self.assert_both_versions(organization, 1)

        with self.capture_callbacks(execute=True):
            # Change the name of the organization
            organization.name = 'New Organization'
            organization.save()

        # Test after save
        self.assert_both_versions(user, 2)
        self.assert_both_versions(organization, 2)
        self.teardown_method()

    def test_user_increment_version_on_removed_organization_change(self, organization_factory):
        with self.capture_callbacks(execute=True):
            # Test Setup
            user = CloudUser.objects.create(
                email="test@example.com",
                full_name="Test User")

        # Test User upon creation
        self.assert_both_versions(user, 0)

        with self.capture_callbacks(execute=True):
            organization = organization_factory()

        # Test Organization upon creation
        self.assert_both_versions(organization, 0)

        with self.capture_callbacks(execute=True):
            # Add the user to the organization
            organization_user = OrganizationToUser.objects.create(
                user=user,
                organization=organization)

        # Test after create
        self.assert_both_versions(user, 1)
        self.assert_both_versions(organization, 1)

        with self.capture_callbacks(execute=True):
            # Remove user from the organization
            organization_user.delete()

        # Test after delete
        self.assert_both_versions(user, 2)
        self.assert_both_versions(organization, 2)
        self.teardown_method()

    def test_multiple_users_added_to_organization(self, organization_factory):
        with self.capture_callbacks(execute=True):
            # Test Setup
            user1 = CloudUser.objects.create(
                email="test1@example.com",
                full_name="Test User 1")
            user2 = CloudUser.objects.create(
                email="test2@example.com",
                full_name="Test User 2")

        # Test User upon creation
        self.assert_both_versions(user1, 0)
        self.assert_both_versions(user2, 0)

        with self.capture_callbacks(execute=True):
            organization = organization_factory()

        # Test Organization upon creation
        self.assert_both_versions(organization, 0)

        with self.capture_callbacks(execute=True):
            # Add the users to the organization
            OrganizationToUser.objects.create(
                user=user1,
                organization=organization)

        # Test after adding user
        self.assert_both_versions(user1, 1)
        self.assert_both_versions(organization, 1)

        with self.capture_callbacks(execute=True):
            OrganizationToUser.objects.create(
                user=user2,
                organization=organization)

        # Test after adding user
        self.assert_both_versions(user2, 1)
        self.assert_both_versions(organization, 2)

        # Test after adding users
        self.assert_both_versions(user1, 1)
        self.assert_both_versions(user2, 1)
        self.assert_both_versions(organization, 2)

        with self.capture_callbacks(execute=True):
            # Change the name of the user
            user1.full_name = "New Name"
            user1.save()

        # Test after user change
        self.assert_both_versions(user1, 2)
        self.assert_both_versions(organization, 3)

        self.teardown_method()

    def test_organization_change_with_multiple_users(self, organization_factory):
        with self.capture_callbacks(execute=True):
            # Test Setup
            user1 = CloudUser.objects.create(
                email="test1@example.com",
                full_name="Test User 1")

            user2 = CloudUser.objects.create(
                email="test2@example.com",
                full_name="Test User 2")

        # Test User upon creation
        self.assert_both_versions(user1, 0)
        self.assert_both_versions(user2, 0)

        with self.capture_callbacks(execute=True):
            organization = organization_factory()

        # Test Organization upon creation
        self.assert_both_versions(organization, 0)

        # Add the users to the organization
        with self.capture_callbacks(execute=True):
            OrganizationToUser.objects.create(
                user=user1,
                organization=organization)

        # Test after adding user
        self.assert_both_versions(user1, 1)
        self.assert_both_versions(organization, 1)

        with self.capture_callbacks(execute=True):
            OrganizationToUser.objects.create(
                user=user2,
                organization=organization)

        # Test after adding user
        self.assert_both_versions(user2, 1)
        self.assert_both_versions(organization, 2)

        with self.capture_callbacks(execute=True):
            # Change the name of the organization
            organization.name = 'New Organization Name'
            organization.save()

        # Test after organization change
        self.assert_both_versions(user1, 2)
        self.assert_both_versions(user2, 2)
        self.assert_both_versions(organization, 3)
        self.teardown_method()

    def test_multiple_users_removed_from_organization(self, organization_factory):
        with self.capture_callbacks(execute=True):
            # Test Setup
            user1 = CloudUser.objects.create(
                email="test1@example.com",
                full_name="Test User 1")

            user2 = CloudUser.objects.create(
                email="test2@example.com",
                full_name="Test User 2")

        # Test User upon creation
        self.assert_both_versions(user1, 0)
        self.assert_both_versions(user2, 0)

        with self.capture_callbacks(execute=True):
            organization = organization_factory()

        # Test Organization upon creation
        self.assert_both_versions(organization, 0)

        with self.capture_callbacks(execute=True):
            # Add the users to the organization
            organization_user1 = OrganizationToUser.objects.create(
                user=user1,
                organization=organization)

        # Test after adding user
        self.assert_both_versions(user1, 1)
        self.assert_both_versions(organization, 1)

        with self.capture_callbacks(execute=True):
            organization_user2 = OrganizationToUser.objects.create(
                user=user2,
                organization=organization)

        # Test after adding user
        self.assert_both_versions(user2, 1)
        self.assert_both_versions(organization, 2)

        with self.capture_callbacks(execute=True):
            # Remove users from the organization
            organization_user1.delete()
            organization_user2.delete()

        # Test after removing users
        self.assert_both_versions(user1, 2)
        self.assert_both_versions(user2, 2)
        self.assert_both_versions(organization, 4)
        self.teardown_method()

    def test_user_increment_version_on_current_channel_partner_change(self, channel_partner_factory):
        with self.capture_callbacks(execute=True):
            # Test Setup
            user = CloudUser.objects.create(
                email="test@example.com",
                full_name="Test User")

        # Test User upon creation
        self.assert_both_versions(user, 0)

        with self.capture_callbacks(execute=True):
            channel_partner = channel_partner_factory()

        # Test Channel Partner upon creation
        self.assert_both_versions(channel_partner, 0)

        with self.capture_callbacks(execute=True):
            # Add the user to the channel partner
            ChannelPartnerToUser.objects.create(
                user=user,
                channel_partner=channel_partner)

        # Test after adding user
        self.assert_both_versions(user, 1)
        self.assert_both_versions(channel_partner, 1)
        self.assert_both_descendant_versions(channel_partner, 0)

        with self.capture_callbacks(execute=True):
            # Change the name of the channel partner
            channel_partner.name = "New Name"
            channel_partner.save()

        # Test after save
        self.assert_both_versions(user, 2)
        self.teardown_method()

    def test_user_increment_version_on_newly_added_channel_partner_change(self, channel_partner_factory):
        with self.capture_callbacks(execute=True):
            # Test Setup
            user = CloudUser.objects.create(
                email="test@example.com",
                full_name="Test User")

        # Test User upon creation
        self.assert_both_versions(user, 0)

        with self.capture_callbacks(execute=True):
            channel_partner = channel_partner_factory()

        # Test Channel Partner upon creation
        self.assert_both_versions(channel_partner, 0)

        with self.capture_callbacks(execute=True):
            # Add the user to the channel partner
            ChannelPartnerToUser.objects.create(
                user=user,
                channel_partner=channel_partner)

        # Test after create
        self.assert_both_versions(user, 1)
        self.assert_both_versions(channel_partner, 1)
        self.teardown_method()

    def test_user_increment_version_on_removed_channel_partner_change(self, channel_partner_factory):
        with self.capture_callbacks(execute=True):
            # Test Setup
            user = CloudUser.objects.create(
                email="test@example.com",
                full_name="Test User")

        # Test User upon creation
        self.assert_both_versions(user, 0)

        with self.capture_callbacks(execute=True):
            channel_partner = channel_partner_factory()

        # Test Channel Partner upon creation
        self.assert_both_versions(channel_partner, 0)

        with self.capture_callbacks(execute=True):
            # Add the user to the channel partner
            channel_partner_user = ChannelPartnerToUser.objects.create(
                user=user,
                channel_partner=channel_partner)

        # Test after create
        self.assert_both_versions(user, 1)
        self.assert_both_versions(channel_partner, 1)

        with self.capture_callbacks(execute=True):
            # Remove user from the channel partner
            channel_partner_user.delete()

        # Test after delete
        self.assert_both_versions(user, 2)
        self.assert_both_versions(channel_partner, 2)
        self.teardown_method()

    def test_create_organization_user_then_delete_organization(self, organization_factory):
        with self.capture_callbacks(execute=True):
            # Test Setup
            user = CloudUser.objects.create(
                email="test@example.com",
                full_name="Test User")

        # Test User upon creation
        self.assert_both_versions(user, 0)

        with self.capture_callbacks(execute=True):
            organization = organization_factory()

        # Test Organization upon creation
        self.assert_both_versions(organization, 0)

        with self.capture_callbacks(execute=True):
            # Add the user to the organization
            organization_user = OrganizationToUser.objects.create(
                user=user,
                organization=organization)

        # Test after create
        self.assert_both_versions(user, 1)
        self.assert_both_versions(organization, 1)

        with self.capture_callbacks(execute=True):
            # Delete Organization
            organization.delete()

        # Test after delete
        self.assert_both_versions(user, 2)

    def test_create_channel_partner_user_then_delete_channel_partner(self, channel_partner_factory):

        with self.capture_callbacks(execute=True):
            # Test Setup
            user = CloudUser.objects.create(
                email="test@example.com",
                full_name="Test User")

        # Test User upon creation
        self.assert_both_versions(user, 0)

        with self.capture_callbacks(execute=True):
            channel_partner = channel_partner_factory()

        # Test Channel Partner upon creation
        self.assert_both_versions(channel_partner, 0)

        with self.capture_callbacks(execute=True):
            # Add the user to the channel partner
            channel_partner_user = ChannelPartnerToUser.objects.create(
                user=user,
                channel_partner=channel_partner)

        # Test after create
        self.assert_both_versions(user, 1)
        self.assert_both_versions(channel_partner, 1)

        with self.capture_callbacks(execute=True):
            # Delete Channel Partner
            channel_partner.delete()

        # Test after delete
        self.assert_both_versions(user, 2)

    def test_create_channel_partner_service_then_delete_service(self, channel_partner_factory, cp_service_factory):
        with self.capture_callbacks(execute=True):
            # Test Setup
            channel_partner = channel_partner_factory()

        self.assert_both_versions(channel_partner, 0)
        self.assert_both_descendant_versions(channel_partner, 0)

        with self.capture_callbacks(execute=True):
            service = cp_service_factory(channel_partner=channel_partner)

        # Test Service upon creation
        self.assert_both_versions(channel_partner, 1)
        self.assert_both_descendant_versions(channel_partner, 0)
        # NOTE: Service doesn't have a version field

        with self.capture_callbacks(execute=True):
            # Delete Service
            service.delete()

        # Test after delete
        self.assert_both_versions(channel_partner, 2)
        self.assert_both_descendant_versions(channel_partner, 0)

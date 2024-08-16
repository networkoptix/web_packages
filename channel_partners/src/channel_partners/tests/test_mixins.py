import pytest

from partners.models import (
    ChannelPartner,
    ChannelPartnerStates,
)


@pytest.mark.django_db
class TestFieldOriginalMixin:

    def test_history_after_initialization(self, cloud_test_host, django_capture_on_commit_callbacks):
        """
        Test that the audit history is updated after creating a new object
        """
        with django_capture_on_commit_callbacks(execute=True):
            channel_partner = ChannelPartner.objects.create(name="Test Partner", cloud_host=cloud_test_host)
        assert len(channel_partner.get_audit_history("name")) == 2

    def test_history_after_retrieving_from_database(self, cloud_test_host, django_capture_on_commit_callbacks):
        """
        Test that the audit history is updated after retrieving the object from the database
        """
        name = "Test Partner"
        with django_capture_on_commit_callbacks(execute=True):
            ChannelPartner.objects.create(name=name, cloud_host=cloud_test_host)
        channel_partner = ChannelPartner.objects.filter(name=name).first()
        assert len(channel_partner.get_audit_history("name")) == 1

    def test_field_audit_mixin_organization_updates(self, organization_factory):
        # Create an Organization instance
        organization = organization_factory(
            name="Initial Organization Name",
            state=ChannelPartnerStates.ACTIVE)

        assert len(organization.get_audit_history("name")) > 0
        assert len(organization.get_audit_history("state")) > 0

        # Define new values for testing
        names = ["Organization Name 1", "Organization Name 2"]
        states = [ChannelPartnerStates.ACTIVE, ChannelPartnerStates.SUSPENDED]

        # Test updates to the 'name' and 'state' fields
        for name, state in zip(names, states):
            organization.name = name
            organization.state = state
            organization.save()

            # Check if the field has changed immediately after save
            assert organization.has_field_changed('name') is False, \
                "Field 'name' should not be marked as changed immediately after save"
            assert organization.has_field_changed('state') is False, \
                "Field 'state' should not be marked as changed immediately after save"

            # Check the last audit entry matches the last update
            assert organization.get_audit_history('name', idx=0) == name, \
                "Last audit entry for 'name' should match the last update"
            assert organization.get_audit_history('state', idx=0) == state, \
                "Last audit entry for 'state' should match the last update"

        # Check audit history length and content for 'name'
        name_history = organization.get_audit_history('name')
        assert len(name_history) == len(names) + 1, \
            "Audit history for 'name' should contain initial value and all updates"
        assert name_history[-1] == "Initial Organization Name", \
            "First audit entry for 'name' should be the initial value"

        # Check audit history length and content for 'state'
        state_history = organization.get_audit_history('state')
        assert len(state_history) == len(states) + 1, \
            "Audit history for 'state' should contain initial value and all updates"
        assert state_history[-1] == ChannelPartnerStates.ACTIVE, \
            "First audit entry for 'state' should be the initial value"

        # Test specific index retrieval for 'name'
        assert organization.get_audit_history('name', idx=2) == "Initial Organization Name", \
            "Audit entry at index 0 for 'name' should be the initial value"
        assert organization.get_audit_history('name', idx=1) == names[0], \
            "Audit entry at index 1 for 'name' should be the first update"

        # Test specific index retrieval for 'state'
        assert organization.get_audit_history('state', idx=2) == ChannelPartnerStates.ACTIVE, \
            "Audit entry at index 0 for 'state' should be the initial value"
        assert organization.get_audit_history('state', idx=1) == states[0], \
            "Audit entry at index 1 for 'state' should be the first update"

        # Test out of range index
        assert organization.get_audit_history('name', idx=10) is None, \
            "Out of range index should return None for 'name'"
        assert organization.has_field_changed('name', idx=10) is False, \
            "Out of range index should return False for has_field_changed for 'name'"

        # Test has_field_changed with specific index
        organization.name = "New Organization Name"
        organization.save()
        assert organization.has_field_changed('name', idx=1) is True, \
            "Field 'name' should be marked as changed compared to the first update"

    def test_has_field_changed_after_creation(self, cloud_test_host, django_capture_on_commit_callbacks):
        with django_capture_on_commit_callbacks(execute=True):
            channel_partner = ChannelPartner.objects.create(name="Test Partner", cloud_host=cloud_test_host)

        assert channel_partner.has_field_changed(
            "name") is False, "Field should not have changed immediately after creation"

    def test_has_field_changed_after_update(self, cloud_test_host, django_capture_on_commit_callbacks):
        with django_capture_on_commit_callbacks(execute=True):
            channel_partner = ChannelPartner.objects.create(name="Test Partner", cloud_host=cloud_test_host)

        channel_partner.name = "Updated Partner"
        channel_partner.save()

        assert channel_partner.has_field_changed("name") is False, \
            "Field should not be marked as changed immediately after save"

        channel_partner.name = "Another Update"
        assert channel_partner.has_field_changed("name") is True, \
            "Field should be marked as changed before save"

    def test_has_field_changed_with_index(self, cloud_test_host, django_capture_on_commit_callbacks):
        with django_capture_on_commit_callbacks(execute=True):
            channel_partner = ChannelPartner.objects.create(name="Test Partner", cloud_host=cloud_test_host)

        channel_partner.name = "Updated Partner"
        channel_partner.save()

        channel_partner.name = "Another Update"
        channel_partner.save()

        assert channel_partner.has_field_changed("name", idx=1) is True, \
            "Field should be marked as changed compared to the first update"
        assert channel_partner.has_field_changed("name", idx=0) is False, \
            "Field should not be marked as changed compared to the most recent update"

    def test_has_field_changed_invalid_field(self, cloud_test_host, django_capture_on_commit_callbacks):
        with django_capture_on_commit_callbacks(execute=True):
            channel_partner = ChannelPartner.objects.create(name="Test Partner", cloud_host=cloud_test_host)

        assert channel_partner.has_field_changed("invalid_field") is False, \
            "Invalid field should return False"

    def test_has_field_changed_out_of_range_index(self, cloud_test_host, django_capture_on_commit_callbacks):
        with django_capture_on_commit_callbacks(execute=True):
            channel_partner = ChannelPartner.objects.create(name="Test Partner", cloud_host=cloud_test_host)

        assert channel_partner.has_field_changed("name", idx=10) is False, \
            "Out of range index should return False"

    def test_has_field_changed_prior_to_save_true(self, cloud_test_host, django_capture_on_commit_callbacks):
        with django_capture_on_commit_callbacks(execute=True):
            channel_partner = ChannelPartner.objects.create(name="Test Partner", cloud_host=cloud_test_host)
            channel_partner.name = "Updated Partner"
            assert channel_partner.has_field_changed("name") is True, \
                "Field should be marked as changed before save"

    def test_audit_history_order(self, cloud_test_host, django_capture_on_commit_callbacks):
        """
        Test that explicitly checks the order of entries in the deque after multiple updates.
        """
        with django_capture_on_commit_callbacks(execute=True):
            channel_partner = ChannelPartner.objects.create(name="Initial Name", cloud_host=cloud_test_host)

        updates = ["First Update", "Second Update", "Third Update"]
        for update in updates:
            channel_partner.name = update
            channel_partner.save()

        history = channel_partner.get_audit_history("name")
        assert len(history) == 3  # Only the 3 most recent updates
        assert history == ["Third Update", "Second Update", "First Update"], \
            "Audit history should be in reverse chronological order"

    def test_audit_history_max_length(self, cloud_test_host, django_capture_on_commit_callbacks):
        """
        Test that verifies the behavior when the audit history reaches its maximum length.
        """
        with django_capture_on_commit_callbacks(execute=True):
            channel_partner = ChannelPartner.objects.create(name="Initial Name", cloud_host=cloud_test_host)

        updates = ["First Update", "Second Update", "Third Update", "Fourth Update"]
        for update in updates:
            channel_partner.name = update
            channel_partner.save()

        history = channel_partner.get_audit_history("name")
        assert len(history) == 3, "Audit history should be limited to 3 entries"
        assert history == ["Fourth Update", "Third Update", "Second Update"], \
            "Audit history should contain only the 3 most recent entries"

    def test_get_audit_history_with_different_idx(self, cloud_test_host, django_capture_on_commit_callbacks):
        """
        Test that checks the behavior of get_audit_history with different idx values.
        """
        with django_capture_on_commit_callbacks(execute=True):
            channel_partner = ChannelPartner.objects.create(name="Initial Name", cloud_host=cloud_test_host)

        updates = ["First Update", "Second Update", "Third Update"]
        for update in updates:
            channel_partner.name = update
            channel_partner.save()

        assert channel_partner.get_audit_history("name", idx=0) == "Third Update", \
            "idx=0 should return the most recent update"
        assert channel_partner.get_audit_history("name", idx=1) == "Second Update", \
            "idx=1 should return the second most recent update"
        assert channel_partner.get_audit_history("name", idx=2) == "First Update", \
            "idx=2 should return the third most recent update"
        assert channel_partner.get_audit_history("name", idx=3) is None, \
            "idx=3 should return None as it's out of range"
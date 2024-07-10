import pytest

from partners.models import ChannelPartnerStates


@pytest.mark.django_db
class TestFieldOriginalMixin:

    def test_field_audit_mixin_organization_updates(self, organization_factory):
        # Create an Organization instance
        organization = organization_factory(
            name="Initial Organization Name",
            state=ChannelPartnerStates.ACTIVE)

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
            assert organization.get_audit_history('name')[-1] == name, \
                "Last audit entry for 'name' should match the last update"
            assert organization.get_audit_history('state')[-1] == state, \
                "Last audit entry for 'state' should match the last update"

        # Check audit history length and content for 'name'
        name_history = organization.get_audit_history('name')
        assert len(name_history) == len(names) + 1, \
            "Audit history for 'name' should contain initial value and all updates"
        assert name_history[0] == "Initial Organization Name", \
            "First audit entry for 'name' should be the initial value"

        # Check audit history length and content for 'state'
        state_history = organization.get_audit_history('state')
        assert len(state_history) == len(states) + 1, \
            "Audit history for 'state' should contain initial value and all updates"
        assert state_history[0] == ChannelPartnerStates.ACTIVE, \
            "First audit entry for 'state' should be the initial value"

        # Test specific index retrieval for 'name'
        assert organization.get_audit_history('name', idx=0) == "Initial Organization Name", \
            "Audit entry at index 0 for 'name' should be the initial value"
        assert organization.get_audit_history('name', idx=1) == names[0], \
            "Audit entry at index 1 for 'name' should be the first update"

        # Test specific index retrieval for 'state'
        assert organization.get_audit_history('state', idx=0) == ChannelPartnerStates.ACTIVE, \
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

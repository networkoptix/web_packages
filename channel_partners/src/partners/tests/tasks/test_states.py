from partners.models import ActionConfirmation
from partners.tasks.states import expire_confirmation


def test_expire_confirmation(organization_factory):
    organization = organization_factory()
    confirmation = ActionConfirmation.objects.create(
        target_id=organization.id,
        action=ActionConfirmation.ConfirmationActionType.ORGANIZATION_STATE_CHANGE,
    )
    expire_confirmation(confirmation.id)
    confirmation.refresh_from_db()
    assert confirmation.state == ActionConfirmation.ConfirmationState.EXPIRED

from rest_framework.exceptions import ValidationError

from partners.models import (
    ChannelPartnerStates,
    Organization,
)


def validate_active_organization(value: Organization) -> None:
    if value.effective_state != ChannelPartnerStates.ACTIVE:
        state_text = ChannelPartnerStates.STATE_TEXTS[value.effective_state]
        msg = f'Organization is {state_text}.'
        raise ValidationError(msg)

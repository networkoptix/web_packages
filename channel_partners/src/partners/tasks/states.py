import uuid

from celery import shared_task


@shared_task
def expire_confirmation(confirmation_id: uuid.UUID | str):
    from partners.models import ActionConfirmation
    (ActionConfirmation.objects
     .filter(confirmation_id=confirmation_id)
     .update(state=ActionConfirmation.ConfirmationState.EXPIRED))

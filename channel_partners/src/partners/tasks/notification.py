import logging
import traceback
import uuid

import httpx
from celery import Task
from celery import shared_task
from celery import states
from celery.exceptions import Ignore
from django.conf import settings
from django.core.cache import caches

from nx_cloud_api_client.apis import CdbAccountAPIBase
from partners.models import ActionConfirmation
from partners.models import ChannelPartner
from partners.models import CloudUser
from partners.models import NotificationTypes
from partners.models import Organization

logger = logging.getLogger(__name__)

MAX_RETRIES = 40
RETRY_TIMEOUT = 60


class MessageNotPosted(Exception):
    pass


class TaskWithLogging(Task):

    def on_failure(self, exc, task_id, args, kwargs, einfo):
        logger.critical(f"Task {task_id} failed. Args:{args}, Kwargs:{kwargs}.")
        logger.critical(f"Task {task_id} failed. Exception: \n{''.join(traceback.format_exception(exc))}")

    def on_retry(self, exc, task_id, args, kwargs, einfo):
        # needed for printing in
        logger.error(f"Task {task_id} retrying. Args:{args}, Kwargs:{kwargs}.")
        logger.error(f"Task {task_id} retrying. Exception: \n{''.join(traceback.format_exception(exc))}")


def is_existing_user(host: str, email: str) -> bool:
    api = CdbAccountAPIBase(host=host, client=httpx.Client())
    response = api.status(email)
    if response.status_code == 200:
        return True
    return False


def post_notification(host: str, user: CloudUser, message_type: str, message: dict):
    data = {
        'type': message_type,
        'user_email': user.email,
        'userFullName': user.full_name,
        'message': message
    }
    if 'userFullName' not in message:
        # Notification module takes userFullName from message object.
        message['userFullName'] = data['userFullName']
    customization_name = get_customization(host)
    data['customization'] = customization_name
    response = httpx.post(f'https://{host}/notifications/send', json=data,
                          auth=settings.INSTANCE_CONFIG.notification_auth)
    if not response.is_success:
        msg = f'Request failed. Request: {data}. Response: {response.content}'
        raise MessageNotPosted(msg)


def get_customization(cloud_host_name: str):
    cache_key = f'customization-name-{cloud_host_name}'
    if not (customization_name := caches['default'].get(cache_key)):
        response = httpx.get(f'https://{cloud_host_name}/api/utils/customization')
        response.raise_for_status()
        customization = response.json()
        customization_name = customization.get('name')
        caches['default'].set(cache_key, customization_name, timeout=600)
    return customization_name


@shared_task(bind=True, base=TaskWithLogging, autoretry_for=(Exception,),
             retry_kwargs={'max_retries': MAX_RETRIES, 'countdown': RETRY_TIMEOUT})
def added_channel_partner_role_task(
        self: TaskWithLogging,
        channel_partner_id: uuid.UUID | str, sharer_id: int,
        user_id: str, cloud_host_name: str):
    notification_added_channel_partner_role(channel_partner_id=channel_partner_id, sharer_id=sharer_id,
                                            user_id=user_id, cloud_host_name=cloud_host_name, task=self)


def notification_added_channel_partner_role(
        channel_partner_id: uuid.UUID | str, sharer_id: int,
        user_id: str, cloud_host_name: str, task: TaskWithLogging):
    partner = ChannelPartner.objects.filter(id=channel_partner_id).first()
    sharer = CloudUser.objects.filter(id=sharer_id).first()
    user = CloudUser.objects.filter(id=user_id).first()
    if not all([partner, sharer, user]):
        logger.warning(f'Cannot resolve some data. CP id {channel_partner_id}: {partner}, '
                       f'Sharer id {sharer_id}: {sharer}, User id {user_id}: {user}.')
        task.update_state(
            state=states.FAILURE,
            meta='Cannot resolve initial data.'
        )
        raise Ignore()
    message = {
        'partner_name': partner.name,
        'sharer_name': user.full_name or sharer.email,
        'userFullName': user.full_name or user.email
    }
    user_exists = is_existing_user(host=cloud_host_name, email=user.email)
    message_type = NotificationTypes.cps_partner_share if user_exists else NotificationTypes.cps_partner_invite
    post_notification(host=cloud_host_name, user=user, message_type=message_type, message=message)


@shared_task(bind=True, base=TaskWithLogging, autoretry_for=(Exception,),
             retry_kwargs={'max_retries': MAX_RETRIES, 'countdown': RETRY_TIMEOUT})
def added_organization_role_task(
        self: TaskWithLogging,
        organization_id: uuid.UUID | str, sharer_id: int,
        user_id: str, cloud_host_name: str):
    notification_added_organization_role(organization_id=organization_id, sharer_id=sharer_id,
                                         user_id=user_id, cloud_host_name=cloud_host_name, task=self)


def notification_added_organization_role(
        organization_id: uuid.UUID | str, sharer_id: int,
        user_id: str, cloud_host_name: str, task: TaskWithLogging):
    organization = Organization.objects.filter(id=organization_id).first()
    sharer = CloudUser.objects.filter(id=sharer_id).first()
    user = CloudUser.objects.filter(id=user_id).first()
    if not all([organization, sharer, user]):
        logger.error(f'Cannot resolve some data. CP id {organization_id}: {organization}, '
                     f'Sharer id {sharer_id}: {sharer}, User id {user_id}: {user}.')
        task.update_state(
            state=states.FAILURE,
            meta='Cannot resolve initial data.'
        )
        raise Ignore()
    message = {
        'organization_name': organization.name,
        'sharer_name': user.full_name or sharer.email,
        'userFullName': user.full_name or user.email
    }
    user_exists = is_existing_user(host=cloud_host_name, email=user.email)
    message_type = (
        NotificationTypes.cps_organization_share if user_exists else NotificationTypes.cps_organization_invite
    )
    post_notification(host=cloud_host_name, user=user, message_type=message_type, message=message)


@shared_task(bind=True, base=TaskWithLogging, autoretry_for=(Exception,),
             retry_kwargs={'max_retries': MAX_RETRIES, 'countdown': RETRY_TIMEOUT})
def state_confirmation_task(self: TaskWithLogging, confirmation_id: int, cloud_host_name: str):
    confirmation = ActionConfirmation.objects.filter(pk=confirmation_id).first()
    if not confirmation:
        logger.warning(f'Cannot resolve some data. ConfirmationAction with id {confirmation_id} is missing.')
        self.update_state(
            state=states.FAILURE,
            meta='Cannot resolve initial data.'
        )
        raise Ignore()
    user = CloudUser.objects.filter(email=confirmation.created_by).first()
    if not user:
        logger.warning(f'Cannot resolve some data. CloudUser with email {confirmation.email} is missing.')
        self.update_state(
            state=states.FAILURE,
            meta='Cannot resolve initial data.'
        )
        raise Ignore()
    message = confirmation.get_state_confirmation_message()
    message_type = confirmation.get_notification_type()
    post_notification(host=cloud_host_name, user=user, message_type=message_type, message=message)

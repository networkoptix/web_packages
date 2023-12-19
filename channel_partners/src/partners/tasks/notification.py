import logging
import traceback
import typing
import uuid

import httpx
from celery import Task, shared_task, states
from celery.exceptions import Ignore
from django.conf import settings
from django.core.cache import caches
from nx_cloud_api_client.apis import CdbAccountAPIBase

from partners.models import ChannelPartner, CloudUser, Organization

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


def get_general_notification_type(added_to: typing.Literal["organization", "partner"],
                                  host: str, email: str) -> str:
    api = CdbAccountAPIBase(host=host, client=httpx.Client())
    response = api.status(email)
    if response.status_code == 200:
        return f'cps_{added_to}_share'
    return f'cps_{added_to}_invite'


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
        'sharer_name': getattr(sharer, 'full_name', None) or sharer.email,
        'userFullName': getattr(user, 'full_name', None) or user.email
    }
    message_type = get_general_notification_type(added_to="partner", host=cloud_host_name, email=user.email)
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
        'sharer_name': getattr(sharer, 'full_name', None) or sharer.email,
        'userFullName': getattr(user, 'full_name', None) or user.email
    }
    message_type = get_general_notification_type(added_to="organization", host=cloud_host_name, email=user.email)
    post_notification(host=cloud_host_name, user=user, message_type=message_type, message=message)


def post_notification(host: str, user: CloudUser, message_type: str, message: dict):
    data = {
        'type': message_type,
        'user_email': user.email,
        'userFullName': getattr(user, 'full_name', None) or user.email,
        'message': message
    }
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

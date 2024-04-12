import traceback
import uuid
from typing import List

import httpx
import structlog
from celery import (
    Task,
    shared_task,
    states,
)
from celery.exceptions import Ignore
from django.conf import settings
from django.core.cache import caches
from nx_cloud_api_client.apis import CdbAccountAPIBase
from nx_cloud_api_client.client import NxCloudAPISyncClient

from partners.models import (
    ActionConfirmation,
    ChannelPartner,
    ChannelPartnerRoles,
    ChannelPartnerStates,
    ChannelPartnerToUser,
    CloudUser,
    NotificationTypes,
    Organization,
    OrganizationRoles,
    OrganizationToUser,
)
from tools.nx_cloud_api_client_factory import NxCloudApiClientFactory


logger = structlog.get_logger(__name__)

MAX_RETRIES = 40
RETRY_TIMEOUT = 60


class MessageNotPosted(Exception):
    pass


class TaskWithLogging(Task):

    def on_failure(self, exc, task_id, args, kwargs, einfo):
        logger.critical(
            "Task failed",
            task_id=task_id,
            task_name=self.name,
            args=args,
            kwargs=kwargs,
            exception=''.join(traceback.format_exception(exc)))

    def on_retry(self, exc, task_id, args, kwargs, einfo):
        # needed for printing in
        logger.error(
            "Task retrying",
            task_id=task_id,
            task_name=self.name,
            args=args,
            kwargs=kwargs,
            exception=''.join(traceback.format_exception(exc)))


def get_user_by_email(task: TaskWithLogging, email: str) -> CloudUser:
    """
    Retrieves the CloudUser object associated with the specified email address.
    
    Args:
        task (TaskWithLogging): The current celery task being executed.
        email (str): The email address of the user to retrieve.
        
    Returns:
        CloudUser: A CloudUser object corresponding to the provided email address. 
        If no such user is found, an Ignore exception will be raised.
    
    Raises:
        Ignore: If no CloudUser exists with the specified email address. 
        This causes the current task and its dependencies to complete but 
        prevents downstream tasks or chains from being triggered.
    """
    user = CloudUser.objects.filter(email=email).first()
    if not user:
        logger.error("Unable to find cloud user with email", email=email)

        task.update_state(
            state=states.FAILURE,
            meta='Cannot resolve initial data. Email not found.'
        )
        raise Ignore()
    return user


def is_existing_user(host: str, email: str, request_id: str) -> bool:
    client: NxCloudAPISyncClient = NxCloudApiClientFactory.get_sync_client(host=host, request_id=request_id)
    api: CdbAccountAPIBase = client.account
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
                          auth=(settings.NOTIFICATION_SECRET_USER, settings.NOTIFICATION_SECRET_PASSWORD))
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
        channel_partner_id: uuid.UUID | str,
        sharer_id: int,
        user_id: str,
        cloud_host_name: str,
        request_id: str,
) -> None:
    notification_added_channel_partner_role(
        channel_partner_id=channel_partner_id,
        sharer_id=sharer_id,
        user_id=user_id,
        cloud_host_name=cloud_host_name,
        task=self,
        request_id=request_id,
    )


def notification_added_channel_partner_role(
        channel_partner_id: uuid.UUID | str,
        sharer_id: int,
        user_id: str,
        cloud_host_name: str,
        task: TaskWithLogging,
        request_id: str,
) -> None:
    partner = ChannelPartner.objects.filter(id=channel_partner_id).first()
    sharer = CloudUser.objects.filter(id=sharer_id).first()
    user = CloudUser.objects.filter(id=user_id).first()
    if not all([partner, sharer, user]):
        logger.error(
            "Unable to resolve",
            task_id=task.request.id,
            task_name=task.name,
            channel_partner_id=channel_partner_id,
            partner=partner,
            sharer_id=sharer_id,
            sharer=sharer,
            user_id=user_id,
            user=user)

        task.update_state(
            state=states.FAILURE,
            meta='Cannot resolve initial data.'
        )
        raise Ignore()
    message = {
        'partner_name': partner.name,
        'sharer_name': sharer.full_name or sharer.email,
        'userFullName': user.full_name or user.email
    }
    user_exists = is_existing_user(host=cloud_host_name, email=user.email, request_id=request_id)
    message_type = NotificationTypes.cps_partner_share if user_exists else NotificationTypes.cps_partner_invite
    post_notification(host=cloud_host_name, user=user, message_type=message_type, message=message)


@shared_task(bind=True, base=TaskWithLogging, autoretry_for=(Exception,),
             retry_kwargs={'max_retries': MAX_RETRIES, 'countdown': RETRY_TIMEOUT})
def added_organization_role_task(
        self: TaskWithLogging,
        organization_id: uuid.UUID | str,
        sharer_id: int,
        user_id: str,
        cloud_host_name: str,
        request_id: str
) -> None:
    notification_added_organization_role(
        organization_id=organization_id,
        sharer_id=sharer_id,
        user_id=user_id,
        cloud_host_name=cloud_host_name,
        task=self,
        request_id=request_id,
    )


def notification_added_organization_role(
        organization_id: uuid.UUID | str,
        sharer_id: int,
        user_id: str,
        cloud_host_name: str,
        task: TaskWithLogging,
        request_id: str,
):
    organization = Organization.objects.filter(id=organization_id).first()
    sharer = CloudUser.objects.filter(id=sharer_id).first()
    user = CloudUser.objects.filter(id=user_id).first()

    if not all([organization, sharer, user]):
        logger.error(
            "Unable to resolve",
            task_id=task.request.id,
            task_name=task.name,
            organization_id=organization_id,
            organization=organization,
            sharer_id=sharer_id,
            sharer=sharer,
            user_id=user_id,
            user=user)

        task.update_state(
            state=states.FAILURE,
            meta='Cannot resolve initial data.'
        )
        raise Ignore()
    message = {
        'organization_name': organization.name,
        'sharer_name': sharer.full_name or sharer.email,
        'userFullName': user.full_name or user.email
    }
    user_exists = is_existing_user(
        host=cloud_host_name,
        email=user.email,
        request_id=request_id)
    message_type = (
        NotificationTypes.cps_organization_share if user_exists else NotificationTypes.cps_organization_invite
    )
    post_notification(host=cloud_host_name, user=user, message_type=message_type, message=message)


@shared_task(bind=True, base=TaskWithLogging, autoretry_for=(Exception,),
             retry_kwargs={'max_retries': MAX_RETRIES, 'countdown': RETRY_TIMEOUT})
def state_confirmation_task(self: TaskWithLogging, confirmation_id: int, cloud_host_name: str):
    confirmation = ActionConfirmation.objects.filter(pk=confirmation_id).first()
    if not confirmation:
        logger.error(
            "Unable to find confirmation with id",
            id=confirmation_id)

        self.update_state(
            state=states.FAILURE,
            meta='Cannot resolve initial data.'
        )
        raise Ignore()
    user = get_user_by_email(self, confirmation.created_by)
    message = confirmation.get_state_confirmation_message()
    message_type = confirmation.get_notification_type()
    post_notification(host=cloud_host_name, user=user, message_type=message_type, message=message)


def run_organization_name_change_tasks(
        organization: Organization,
        old_name: str,
        new_name: str
) -> None:
    admins = OrganizationToUser.objects.filter(
        organization=organization, roles__contains=[OrganizationRoles.ORGANIZATION_ADMINISTRATOR])
    cloud_host_name = organization.channel_partner.cloud_host.hostname
    for email in admins.values_list('user__email', flat=True):
        organization_name_change_task.apply_async(
            args=[
                email,
                old_name,
                new_name,
                cloud_host_name,
            ]
        )


@shared_task(bind=True,
             base=TaskWithLogging,
             autoretry_for=(Exception,),
             retry_kwargs={'max_retries': MAX_RETRIES, 'countdown': RETRY_TIMEOUT})
def organization_name_change_task(
        self: TaskWithLogging,
        user_email: str,
        organization_old_name: str,
        organization_new_name: str,
        cloud_host_name: str,
) -> None:
    user = get_user_by_email(self, user_email)
    message = {
        'userFullName': user.full_name or user.email,
        'old_organization_name': organization_old_name,
        'new_organization_name': organization_new_name,
    }
    post_notification(host=cloud_host_name,
                      user=user,
                      message_type=NotificationTypes.cps_organization_name_change,
                      message=message)


def run_partner_name_change_tasks(
        partner: ChannelPartner,
        old_name: str,
        new_name: str
):
    admins = ChannelPartnerToUser.objects.filter(
        channel_partner=partner, roles__contains=[ChannelPartnerRoles.ADMINISTRATOR])
    cloud_host_name = partner.cloud_host.hostname
    for email in admins.values_list('user__email', flat=True):
        partner_name_change_task.apply_async(
            args=[
                email,
                old_name,
                new_name,
                cloud_host_name,
            ]
        )


@shared_task(bind=True,
             base=TaskWithLogging,
             autoretry_for=(Exception,),
             retry_kwargs={'max_retries': MAX_RETRIES, 'countdown': RETRY_TIMEOUT})
def partner_name_change_task(
        self: TaskWithLogging,
        user_email: str,
        partner_old_name: str,
        partner_new_name: str,
        cloud_host_name: str,
) -> None:
    user = get_user_by_email(self, user_email)
    message = {
        'userFullName': user.full_name or user.email,
        'old_partner_name': partner_old_name,
        'new_partner_name': partner_new_name,
    }
    post_notification(host=cloud_host_name,
                      user=user,
                      message_type=NotificationTypes.cps_partner_name_change,
                      message=message)


@shared_task(bind=True,
             base=TaskWithLogging,
             autoretry_for=(Exception,),
             retry_kwargs={'max_retries': MAX_RETRIES, 'countdown': RETRY_TIMEOUT})
def run_organization_state_changed_tasks(
        self: TaskWithLogging,
        organizations_ids: List[str]
) -> None:
    queryset = OrganizationToUser.objects.filter(
        organization_id__in=organizations_ids,
        roles__contains=[OrganizationRoles.ORGANIZATION_ADMINISTRATOR]
    ).values(
        'user__email',
        'organization__effective_state',
        'organization__name',
        'organization__channel_partner__cloud_host__hostname'
    )
    for relation in queryset:
        notification_organization_state_changed_task.apply_async(args=[
            relation['user__email'],
            relation['organization__effective_state'],
            relation['organization__name'],
            relation['organization__channel_partner__cloud_host__hostname']
        ])


@shared_task(bind=True,
             base=TaskWithLogging,
             autoretry_for=(Exception,),
             retry_kwargs={'max_retries': MAX_RETRIES, 'countdown': RETRY_TIMEOUT})
def run_partner_state_changed_tasks(
        self: TaskWithLogging,
        partners_ids: List[str]
) -> None:
    queryset = ChannelPartnerToUser.objects.filter(
        channel_partner__id__in=partners_ids,
        roles__contains=[ChannelPartnerRoles.ADMINISTRATOR]
    ).values(
        'user__email',
        'channel_partner__effective_state',
        'channel_partner__name',
        'channel_partner__cloud_host__hostname'
    )
    for relation in queryset:
        notification_partner_state_changed_task.apply_async(args=[
            relation['user__email'],
            relation['channel_partner__effective_state'],
            relation['channel_partner__name'],
            relation['channel_partner__cloud_host__hostname']
        ])


@shared_task(bind=True,
             base=TaskWithLogging,
             autoretry_for=(Exception,),
             retry_kwargs={'max_retries': MAX_RETRIES, 'countdown': RETRY_TIMEOUT})
def notification_organization_state_changed_task(
        self: TaskWithLogging,
        user_email: str,
        organization_state: int,
        organization_name: str,
        cloud_host_name: str,
) -> None:
    user = get_user_by_email(self, user_email)
    message = {
        'userFullName': user.full_name or user.email,
        'status_name': ChannelPartnerStates.STATE_NAMES[organization_state],
        'organization_name': organization_name,
    }
    if organization_state == ChannelPartnerStates.ACTIVE:
        message_type = NotificationTypes.cps_organization_state_active
    else:
        message_type = NotificationTypes.cps_organization_state_suspended
    post_notification(host=cloud_host_name,
                      user=user,
                      message_type=message_type,
                      message=message)


@shared_task(bind=True,
             base=TaskWithLogging,
             autoretry_for=(Exception,),
             retry_kwargs={'max_retries': MAX_RETRIES, 'countdown': RETRY_TIMEOUT})
def notification_partner_state_changed_task(
        self: TaskWithLogging,
        user_email: str,
        channel_partner_state: int,
        channel_partner_name: str,
        cloud_host_name: str,
) -> None:
    user = get_user_by_email(self, user_email)
    message = {
        'userFullName': user.full_name or user.email,
        'status_name': ChannelPartnerStates.STATE_NAMES[channel_partner_state],
        'partner_name': channel_partner_name,
    }
    if channel_partner_state == ChannelPartnerStates.ACTIVE:
        message_type = NotificationTypes.cps_partner_state_active
    else:
        message_type = NotificationTypes.cps_partner_state_suspended
    post_notification(host=cloud_host_name,
                      user=user,
                      message_type=message_type,
                      message=message)

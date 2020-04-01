import django
import json
import traceback
from django.conf import settings
from django.core.exceptions import ValidationError
from urllib.parse import quote_plus

from api.controllers import cloud_api
from api.helpers import exceptions
from api.models import Account
from notifications.models import Message, Event, Feedback, PushDevice, PushSubscription
from cms.models import Asset, cloud_portal_customization_cache, get_cloud_portal_asset

import logging

logger = logging.getLogger(__name__)

notifications_config = settings.NOTIFICATIONS_CONFIG


def find_message(external_id):
    # trying to find message and expect None otherwise
    msg = Message.objects.filter(external_id=external_id).first()
    if not msg:
        return None
    return msg


def send(user_email, msg_type, message, customization, external_id=None):
    django.core.validators.validate_email(user_email)

    if 'code' in message:
        message['code'] = quote_plus(message['code'])

    msg = Message(user_email=user_email, type=msg_type,
                  message=message, customization=customization,
                  external_id=external_id)

    # TODO: validate email among existing users

    if msg_type not in notifications_config:
        if not settings.DEBUG:
            raise ValidationError(
                'Invalid message type',
                params={'value': msg_type})

    if not message:
        raise ValidationError(
            'Empty message',
            params={'value': message})

    msg.send()


def notify(event_type, object, data):
    event = Event(type=event_type, object=object, data=data)
    event.send()


def send_feedback(event_type, asset_id, data):
    if not asset_id:
        asset = get_cloud_portal_asset()
    else:
        asset = Asset.objects.get(id=asset_id)

    feedback = Feedback.objects.create(message=data['message'],
                                       asset_name=data['asset'],
                                       sender_name=data['sender_name'],
                                       sender_email=data['sender_email'],
                                       target_asset=asset,
                                       type=event_type)
    feedback.send()


# Push Notifications

def _read_push_result(notification_object):
    result_data = notification_object.result_data
    if result_data:
        result_data = json.loads(result_data)
    else:
        result_data = dict()
    return result_data


def _write_push_result(notification_object, result_data):
    result_data = json.dumps(result_data)
    notification_object.result_data = result_data
    notification_object.save()


def log_push_result(notification_object, message, level=logging.INFO, device_token=None, stack_trace=False):
    result_data = _read_push_result(notification_object)
    log_message = f'Push Notification: {notification_object.id}, {message}'
    if stack_trace:
        log_message += f'\nCall Stack: {traceback.format_exc().replace("Traceback", "")}'
    logger.log(level, log_message)

    if device_token:
        if 'devices' not in result_data:
            result_data['devices'] = dict()

        if device_token in result_data['devices']:
            result_data['devices'][device_token] += '\n' + message
        else:
            result_data['devices'][device_token] = message
    else:
        if 'log' in result_data:
            result_data['log'] += '\n' + message
        else:
            result_data['log'] = message

    _write_push_result(notification_object, result_data)


def get_system_with_users(notification_object, request_data):
    # If system credentials used, system should be in request_data
    system = None
    try:
        if 'system' in request_data:
            if request_data['system']['id'] == notification_object.raw_system_id:
                system = request_data['system'].copy()
            else:
                log_push_result(notification_object, 'System credentials do not match target system')
                return None
        else:
            system = cloud_api.System.get(
                request_data['username'], request_data['password'], notification_object.raw_system_id
            )
            system = system['systems'][0]

        if system:
            users = cloud_api.System.users(request_data['username'], request_data['password'], system['id'])
            system['users'] = {user.get('accountEmail', None) for user in users['sharing']}
    except Exception as exception:
        if isinstance(exception, exceptions.APINotAuthorisedException):
            log_push_result(notification_object, 'Invalid cloud credentials for system')
        elif isinstance(exception, exceptions.APILogicException):
            log_push_result(
                notification_object, f'APILogicException: ' +
                                     'likely invalid system_id or cloud account not authorized for the system'
            )
        else:
            raise exception

    return system


def process_push_response(responses, notification_object, dry_run=False):
    resend_tokens = []

    responses = tuple(response for response in responses if response)

    for response in responses:
        for multicast in response:
            for result in multicast['results']:
                if 'error' in result:
                    token = result['original_registration_id']
                    if result['error'] in ('NotRegistered', 'MissingRegistration', 'InvalidRegistration'):
                        log_push_result(
                            notification_object, f'FCM Error: {result["error"]}. Token no longer valid, deleting device',
                            device_token=token
                        )
                        PushDevice.objects.filter(registration_id=token).delete()
                    else:
                        resend_tokens.append(token)
                        log_push_result(notification_object, f'FCM Error: {result["error"]}', device_token=token)

    if not resend_tokens and not dry_run:
        log_push_result(notification_object, 'Successfully completed')

    return resend_tokens


def set_subscriptions_from_targets(notification_object, request_data):
    targets = set(json.loads(notification_object.raw_targets))
    system_id = notification_object.raw_system_id
    system = get_system_with_users(notification_object, request_data)

    if not system:
        return False

    targets = targets.intersection(system['users'])
    target_accounts = Account.objects.filter(email__in=targets).distinct()

    for account in target_accounts:
        targets.remove(account.email)
        if not account.is_active:
            log_push_result(notification_object, 'User {} is not activated'.format(account.email), logging.WARNING)

    for target in targets:
        log_push_result(notification_object, 'User {} not found'.format(target), logging.ERROR)

    return PushDevice.objects.filter(
        subscriptions__system_id__in=(system_id, 'all'), user__in=target_accounts,
        application_id=notification_object.customization.name
    ).distinct()
    # notification_object.devices.set(matching_devices)

    # return matching_devices.values_list('id', flat=True)

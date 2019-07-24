from cms.models import get_cloud_portal_product, Product
from notifications.models import Message, Event, Feedback
from django.core.exceptions import ValidationError
import django
from django.conf import settings

from api.controllers import cloud_api
from api.helpers import exceptions
from api.models import Account
from .models import PushDevice, PushSubscription
from cms.models import cloud_portal_customization_cache

import logging, json

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


def send_feedback(event_type, product_id, data):
    if not product_id:
        product = get_cloud_portal_product()
    else:
        product = Product.objects.get(id=product_id)

    feedback = Feedback.objects.create(message=data['message'],
                                       product_name=data['product'],
                                       sender_name=data['sender_name'],
                                       sender_email=data['sender_email'],
                                       target_product=product,
                                       type=event_type)
    feedback.send()


# Push Notications

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


def log_push_result(notification_object, message, level=logging.INFO, device_token=None):
    result_data = _read_push_result(notification_object)
    log_message = f'Push Notification: {notification_object.id}, {message}'
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


def get_system(notification_object, request_data):
    try:
        system = cloud_api.System.get(
            request_data['username'], request_data['password'], notification_object.raw_system_id
        )
        return system['systems'][0]
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


def process_push_response(response, notification_object):
    resend_tokens = []

    for multicast in response:
        for result in multicast['results']:
            if 'error' in result:
                token = result['original_registration_id']
                if result['error'] in ('NotRegistered', 'MissingRegistration', 'InvalidRegistration'):
                    PushDevice.objects.filter(registration_id=token).first().delete()
                    log_push_result(
                        notification_object, f'FCM Error: {result["error"]}. Token no longer valid, deleting device',
                        device_token=token
                    )
                else:
                    resend_tokens.append(token)
                    log_push_result(notification_object, f'FCM Error: {result["error"]}', device_token=token)

    if not resend_tokens:
        log_push_result(notification_object, 'Successfully completed')

    return resend_tokens


def set_subscriptions_from_targets(notification_object, request_data):
    targets = set(json.loads(notification_object.raw_targets))
    system_id = notification_object.raw_system_id
    system = get_system(notification_object, request_data)

    if not system:
        return False

    target_accounts = Account.objects.filter(email__in=targets).distinct()

    for account in target_accounts:
        targets.remove(account.email)
        if not account.is_active:
            log_push_result(notification_object, 'User {} is not activated'.format(account.email), logging.WARNING)

    for target in targets:
        log_push_result(notification_object, 'User {} not found'.format(target), logging.ERROR)

    auto_active = cloud_portal_customization_cache(
        settings.CUSTOMIZATION, 'config'
    )['push_subscription_auto_active']

    # Check all related devices for valid tokens
    device_check_response = PushDevice.objects.filter(user__in=target_accounts).send_message(
        'Token check', title='Token check', dry_run=True
    )
    process_push_response(device_check_response, notification_object)

    devices_without_sub = PushDevice.objects.filter(user__in=target_accounts, user__is_active=True).exclude(
        pushsubscription__system_id=system_id).select_related('user')
    for device in devices_without_sub:
        active = system['ownerAccountEmail'] == device.user.email or auto_active
        PushSubscription.objects.create(system_id=system_id, account=device.user, active=active, device=device)

    matching_subscriptions = PushSubscription.objects.filter(
        system_id=system_id, account__in=target_accounts, active=True, account__is_active=True
    ).distinct()
    notification_object.subscriptions.set(matching_subscriptions)

    return notification_object.subscriptions.exists()

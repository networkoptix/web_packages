from cms.models import get_cloud_portal_product, Product
from notifications.models import Message, Event, Feedback
from django.core.exceptions import ValidationError
import django
from django.conf import settings

from api.models import Account
from .models import PushDevice, PushSubscription

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

    feedback = Feedback.objects.create(sender_to_be_contacted=data['contact'],
                                       message=data['message'],
                                       product_name=data['product'],
                                       sender_name=data['sender_name'],
                                       sender_email=data['sender_email'],
                                       target_product=product,
                                       type=event_type)
    feedback.send()


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
    logger.log(level, message)

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


def process_push_response(response, notification_object, device_tokens=None):
    if not device_tokens:
        device_tokens = list(
            notification_object.subscriptions.filter(active=True).values_list('device__registration_id', flat=True)
        )
    resend_tokens = []

    for multicast in response:
        for result in multicast['results']:
            logger.info(result)
            if 'error' in result:
                token = result['original_registration_id']
                device_tokens.remove(token)
                if result['error'] in ('NotRegistered', 'MissingRegistration', 'InvalidRegistration'):
                    device = PushDevice.objects.filter(registration_id=token).first()
                    log_push_result(
                        notification_object, f'FCM Error: {result["error"]}. Token no longer valid, deleting device',
                        device_token=token
                    )
                    PushSubscription.objects.filter(device=device).update(active=False)
                    device.delete()
                else:
                    resend_tokens.append(token)
                    log_push_result(notification_object, f'FCM Error: {result["error"]}', device_token=token)

    return resend_tokens


def set_subscriptions_from_targets(notification_object):
    targets = notification_object.raw_targets
    targets = json.loads(targets)
    system_id = notification_object.system_id

    target_accounts = Account.objects.filter(email__in=targets)
    valid_targets = []

    for account in target_accounts:
        if account.is_active:
            valid_targets.append(account.email)
            targets.remove(account.email)
        else:
            log_push_result(notification_object, 'User {} is not activated'.format(account.email), logging.WARNING)
            targets.remove(account.email)

    for target in targets:
        log_push_result(notification_object, 'User {} not found in cloud'.format(target), logging.ERROR)

    matching_subscriptions = PushSubscription.objects.filter(
        system_id=system_id, account__email__in=valid_targets
    )

    return matching_subscriptions

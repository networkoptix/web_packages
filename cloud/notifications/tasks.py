from celery import shared_task
from .engines import email_engine

from smtplib import SMTPDataError, SMTPException, SMTPServerDisconnected
from ssl import SSLError
from celery.exceptions import Ignore

from django.conf import settings
from django.utils import timezone

from api.models import Account
from notifications import notifications_api
from notifications.notifications_api import log_push_result, set_subscriptions_from_targets
from notifications.models import Message, PushSubscription, PushNotification
from util.helpers import get_language_for_email

import json
import traceback
import logging
logger = logging.getLogger(__name__)


class MaxResendException(Exception):
    def __str__(self):
        return "Emails was not sent because it hit max retry limit!!!"


def log_error(error, user_email, msg_type, message, lang, customization, queue, attempt):
    error_formatted = f'\n{error.__class__.__name__}:{error}\nTarget Email: {user_email}\nType: {msg_type}\nMessage:{message}\nLanguage: {lang}\nCustomization: {customization}\nQueue: {queue}\n Attempt: {attempt}\nCall Stack: {traceback.format_exc().replace("Traceback", "")}'

    if isinstance(error, SMTPDataError) or isinstance(error, SMTPException) or isinstance(error, SMTPServerDisconnected):
        logger.warning(error_formatted)
    else:
        logger.error(error_formatted)


def send_email_log(_task):
    def wrapper(*args, **kwargs):
        logger.info(f"Start {_task.__name__} was run with args {args}, kwargs: {kwargs}")
        return _task(*args, **kwargs)
    return wrapper


@shared_task
@send_email_log
def send_email(msg_id, queue="", attempt=1):
    message = Message.objects.get(id=msg_id)
    lang = get_language_for_email(message.user_email, message.customization)
    try:
        email_engine.send(message.user_email, message.type, message.message, lang, message.customization)
    except Exception as error:
        if isinstance(error, SMTPDataError):
            logger.warning(f'SMTP Error. {settings.CONFIG_ERROR}')
        elif (isinstance(error, SMTPException) or isinstance(error, SSLError)) and attempt < settings.MAX_RETRIES:
            send_email.apply_async(args=[message.id, queue, attempt+1], queue=queue)
        elif attempt >= settings.MAX_RETRIES:
            error = MaxResendException()

        log_error(error, message.user_email, message.type, message, lang, message.customization, queue, attempt)

        send_email.update_state(state="FAILURE",
                                meta={
                                    'error': str(error),
                                    'user_email': message.user_email,
                                    'type': message.type,
                                    'message': message.message,
                                    'customization': message.customization,
                                    'language': lang,
                                    'queue': queue,
                                    'attempt': attempt,
                                                       })
        raise Ignore()
    else:
        message.send_date = timezone.now()
        message.save()
        return {
            'user_email': message.user_email,
            'type': message.type,
            'message': message.message,
            'customization': message.customization,
            'language': lang,
            'queue': queue,
            'attempt': attempt
        }


@shared_task
def send_push_notification(notification_id, request_data, device_tokens=None, count=1):
    if count == 1:
        logger.info(f'Start processing push notification: {notification_id}')

    notification_object = PushNotification.objects.get(id=notification_id)

    try:
        if not notification_object.devices.all():
            if not set_subscriptions_from_targets(notification_object, request_data):
                log_push_result(notification_object, 'No matching subscriptions found')
                return

        responses = notification_object.send_notifications()
        resend_tokens = notifications_api.process_push_response(responses, notification_object)

        if resend_tokens and count < settings.PUSH_NOTIFICATIONS_SETTINGS['MAX_RETRIES']:
            send_push_notification.apply_async(
                countdown=settings.PUSH_NOTIFICATIONS_SETTINGS['RETRY_INTERVAL'],
                args=[notification_object.id],
                kwargs={'request_data': request_data, 'device_tokens': resend_tokens, 'count': count + 1}
            )

    except Exception as exception:
        if 'responses' not in locals() or not responses:
            log_push_result(notification_object, f'Exception: {exception}.', logging.ERROR)
            if count < settings.PUSH_NOTIFICATIONS_SETTINGS['MAX_RETRIES']:
                send_push_notification.apply_async(
                    countdown=settings.PUSH_NOTIFICATIONS_SETTINGS['RETRY_INTERVAL'],
                    args=[notification_object.id],
                    kwargs={'request_data': request_data, 'device_tokens': device_tokens, 'count': count + 1}
                )
        elif 'resend_tokens' not in locals():
            log_push_result(
                notification_object, f'{type(exception)}: {exception},\nResponse: {responses}.', logging.ERROR
            )
        else:
            log_push_result(notification_object, f'{type(exception)}: {exception}', logging.ERROR)

        raise exception


# For testing we dont want to send emails to everyone so we need to set
# "BROADCAST_NOTIFICATIONS_SUPERUSERS_ONLY = true" in cloud.settings
@shared_task
def send_to_all_users(notification_id, message, customizations, force=False):
    # if forced and not testing dont apply any filters to send to all users
    users = Account.objects.exclude(activated_date=None, last_login=None).filter(customization__in=customizations)

    if settings.BROADCAST_NOTIFICATIONS_SUPERUSERS_ONLY:
        users = users.filter(is_superuser=True)

    for user in users:
        message['userFullName'] = user.get_full_name()
        notifications_api.send(user.email, 'cloud_notification', message, user.customization)

    return {'notification_id': notification_id, 'subject': message['subject'], 'force': force}


@shared_task
def test_task(x, y):
    from time import sleep
    print("x: %i\ty:%i" % (x, y))
    sleep(y * 60)
    print("total: %i" % (x * y))
    with open('task.log', 'ab+') as f:
        f.write("Task Done: %i * %i = %i" % (x, x, x*y))
    return x * y

from smtplib import SMTPDataError, SMTPException, SMTPServerDisconnected
from ssl import SSLError
import traceback
import logging

from celery import shared_task
from celery.exceptions import Ignore
from django.conf import settings
from django.utils import timezone

from api.models import Account
from notifications import notifications_api
from notifications.engines import email_engine
from notifications.notifications_api import log_push_result, get_push_devices_from_targets, get_system_with_users
from notifications.models import Message, PushNotification
from util.helpers import get_language_for_email

logger = logging.getLogger(__name__)


WARNING_TASK_ERRORS = (SMTPDataError, SMTPException, SMTPServerDisconnected)


class MaxResendException(Exception):
    def __str__(self):
        return "Emails was not sent because it hit max retry limit!!!"


def format_error(error, user_email, msg_type, message, lang, customization, queue, attempt):
    return f'\n{error.__class__.__name__}:{error}\nTarget Email: {user_email}\nType: {msg_type}\nMessage:{message}\nLanguage: {lang}\nCustomization: {customization}\nQueue: {queue}\n Attempt: {attempt}\nCall Stack: {traceback.format_exc().replace("Traceback", "")}'


def log_error(error, user_email, msg_type, message, lang, customization, queue, attempt):
    error_formatted = format_error(
        error, user_email, msg_type, message, lang, customization, queue, attempt)
    task_logger = logger.warning if isinstance(
        error, WARNING_TASK_ERRORS) else logger.error
    task_logger(error_formatted)


def send_email_log(_task):
    def wrapper(*args, **kwargs):
        logger.info(
            f"Start {_task.__name__} was run with args {args}, kwargs: {kwargs}")
        return _task(*args, **kwargs)
    return wrapper


@shared_task
@send_email_log
def send_email(msg_id, queue="", attempt=1):
    message = Message.objects.get(id=msg_id)
    lang = get_language_for_email(message.user_email, message.customization)
    try:
        email_engine.send(message.user_email, message.type,
                          message.message, lang, message.customization)
    except Exception as error:
        if isinstance(error, SMTPDataError):
            logger.warning(f'SMTP Error. {settings.CONFIG_ERROR}')
        elif (
            isinstance(error, (SMTPException, SSLError))
            and attempt < settings.MAX_RETRIES
        ):
            send_email.apply_async(
                args=[message.id, queue, attempt + 1], queue=queue)
        elif attempt >= settings.MAX_RETRIES:
            error = MaxResendException()
        log_error(
            error,
            message.user_email,
            message.type,
            message,
            lang,
            message.customization,
            queue,
            attempt,
        )

        send_email.update_state(
            state='FAILURE',
            meta={
                'error': str(error),
                'user_email': message.user_email,
                'type': message.type,
                'message': message.message,
                'customization': message.customization,
                'language': lang,
                'queue': queue,
                'attempt': attempt,
            },
        )

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


def initialize_push_notification_send(notification_id, count):
    """Gets notification instance and updates count. If count already exceeded None is returned.

    Args:
        notification_id (int): PushNotification ID
        count (int): Number of notifications in progress

    Returns:
        PushNotification | None: PushNotification instance
    """
    notification_object = PushNotification.objects.get(id=notification_id)
    notification_object.state = PushNotification.RESULT_STATES.in_progress
    # Prevent duplicate notification processing
    if notification_object.count >= count:
        return
    notification_object.count = count
    notification_object.save()

    logger.info(
        f'Start processing push notification: {notification_id}'
        if count == 1 else
        f'Retrying push notification: {notification_id} (count={count})')
    return notification_object


def handle_push_notification_send(notification_object, device_ids, request_data):
    """Handles sending standard push notifications. Returns responses and if there were no subscriptions.

    Args:
        notification_object (PushNotification): PushNotification instance
        device_ids (List[int]): List of PushDevice Ids
        request_data (Dict): Dict from request

    Returns:
        tuple[responses, bool]: The first item in the tuple are the responses from sending, the second is to note if there were no subscriptions.
    """
    from notifications.notifications_api import get_system_with_users, get_push_devices_from_targets log_push_result

    if device_ids:
        return [notification_object.send_notifications(
            device_ids=device_ids), False]

    system = get_system_with_users(notification_object, request_data) or {}
    devices = get_push_devices_from_targets(notification_object, system['users']) if 'users' in system else None
    if not devices:
        log_push_result(notification_object,
                        'No matching subscriptions found')
        notification_object.send_date = timezone.now()
        notification_object.state = PushNotification.RESULT_STATES.success
        notification_object.save()
        return [None, True]
    return [notification_object.send_notifications(devices=devices), False]


def handle_push_notification_resend(count, notification_object, request_data, resend_device_ids):
    """Handles retrying sending notification if failure occurred when notification was being sent and not in preparing.

    Args:
        count (int): Send attempt count
        notification_object (PushNotification): PushNotification instance
        request_data (Dict): Dict from request
        resend_device_ids (List[int]): PushDevice Ids to resend
    """
    from notifications.notifications_api import log_push_result

    if count < settings.PUSH_NOTIFICATIONS_SETTINGS['MAX_RETRIES']:
        log_push_result(notification_object,
                        f'Requeuing (count={count+1})')
        send_push_notification.apply_async(
            countdown=settings.PUSH_NOTIFICATIONS_SETTINGS['RETRY_INTERVAL'],
            args=[notification_object.id],
            kwargs={'request_data': request_data,
                    'device_ids': resend_device_ids, 'count': count + 1},
            queue=settings.NOTIFICATIONS_CONFIG['push_notification']['queue']
        )
    else:
        notification_object.state = PushNotification.RESULT_STATES.failure
        log_push_result(notification_object, 'Retries exceeded')


def handle_push_notification_send_exception(scope, notification_object, count, request_data, device_ids, exception):
    """Handles retrying sending notification if failure occurred when notification was being prepared.

    Args:
        scope (Dict): Local variable scope when exception occurred
        notification_object (PushNotification): PushNotification instance
        count (int): Send attempt count
        request_data (Dict): Dict from request
        device_ids (List[int]): PushDevice Ids to resend
        exception (Exception): Raised exception
    """
    from notifications.notifications_api import log_push_result

    if 'responses' not in scope:
        log_push_result(
            notification_object, f'Exception: {exception}.', logging.ERROR, stack_trace=True)
        if count < settings.PUSH_NOTIFICATIONS_SETTINGS['MAX_RETRIES']:
            send_push_notification.apply_async(
                countdown=settings.PUSH_NOTIFICATIONS_SETTINGS['RETRY_INTERVAL'],
                args=[notification_object.id],
                kwargs={'request_data': request_data,
                        'device_ids': device_ids, 'count': count + 1},
                queue=settings.NOTIFICATIONS_CONFIG['push_notification']['queue']
            )
        else:
            notification_object.state = PushNotification.RESULT_STATES.failure
    elif 'resend_device_ids' not in scope:
        notification_object.state = PushNotification.RESULT_STATES.failure
        log_push_result(
            notification_object, f'{type(exception)}: {exception},\nResponse: {scope["responses"]}.', logging.ERROR,
            stack_trace=True
        )
    else:
        notification_object.state = PushNotification.RESULT_STATES.failure
        log_push_result(
            notification_object, f'{type(exception)}: {exception}', logging.ERROR, stack_trace=True)


@shared_task
def send_push_notification(notification_id, request_data, device_ids=None, count=1):
    notification_object = initialize_push_notification_send(
        notification_id, count)

    if not notification_object:
        # Prevent duplicate notification processing
        return

    try:
        responses, no_subscriptions = handle_push_notification_send(
            notification_object, device_ids, request_data)

        if no_subscriptions:
            return

        fcm_responses, resend_device_ids = responses

        # Process fcm legacy responses
        resend_device_ids += notifications_api.process_fcm_push_response(
            fcm_responses, notification_object)

        if resend_device_ids:
            handle_push_notification_resend(
                count, notification_object, request_data, resend_device_ids)

    except Exception as exception:
        scope = locals()
        handle_push_notification_send_exception(
            scope, notification_object, count, request_data, device_ids, exception)
    else:
        notification_object.send_date = timezone.now()
    finally:
        notification_object.save()


# For testing we dont want to send emails to everyone so we need to set
# "BROADCAST_NOTIFICATIONS_SUPERUSERS_ONLY = true" in cloud.settings
@shared_task
def send_to_all_users(notification_id, message, customizations, force=False):
    # if forced and not testing dont apply any filters to send to all users
    users = Account.objects.exclude(activated_date=None, last_login=None).filter(
        customization__in=customizations)

    if settings.BROADCAST_NOTIFICATIONS_SUPERUSERS_ONLY:
        users = users.filter(is_superuser=True)

    for user in users:
        message['userFullName'] = user.get_full_name()
        notifications_api.send(
            user.email, 'cloud_notification', message, user.customization)

    return {'notification_id': notification_id, 'subject': message['subject'], 'force': force}


@shared_task
def async_task_test(x, y):
    from time import sleep
    print(f"x: {x}\ty:{y}")
    sleep(y * 60)
    print(f"total: {x * y}")
    with open('task.log', 'w') as f:
        f.write(f"Task Done: {x} * {y} = {x*y}")
    return x * y

from smtplib import SMTPDataError, SMTPException, SMTPServerDisconnected
from ssl import SSLError
import traceback
import logging
import base64

from celery import shared_task
from celery.exceptions import Ignore
from django.conf import settings
from django.utils import timezone
from django.core.cache import caches

from cloud.controllers import cloud_api
from api.models import Account
from cloud.customization_context import customization_ctx

from notifications import notifications_api
from notifications.engines import email_engine
from notifications.notifications_api import log_push_result, get_push_devices_from_targets, get_system_with_users
from notifications.models import RESULT_STATES, Message, PushNotification, SystemEmail
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
def send_email(msg_id, queue="", attempt=1, email_type='', emails = None, session = None, *, customization=None):
    if emails is None:
        emails = []
    if session is None:
        session = {}
    message = (SystemEmail if email_type == SystemEmail.MSG_TYPE else Message).objects.get(id=msg_id)
    customization = getattr(message, 'customization', customization)
    # ensure customization ctx var is set inside celery task.
    if customization and not customization_ctx.get():
        customization_ctx.set(customization)
    emails = emails or getattr(message, 'user_email', '') or getattr(message, 'targets')
    template_type = getattr(message, 'type', email_type)
    lang = get_language_for_email(emails, customization)
    email_content = getattr(message, 'message')
    send_individual = not isinstance(message, Message)
    subject = ''
    attachments = []

    if isinstance(message, SystemEmail):
        message.result = RESULT_STATES.in_progress
        subject = message.subject
        cached_attachments = caches['emails'].get(message.attachments.get('cache_key'), [])
        attachments = [{**attachment, 'content': base64.b64decode(attachment['content'])} for attachment in cached_attachments]
        if message.system_id:
            try:
                users = cloud_api.System.basic_users(session['username'], session['password'], session['username'])
            except:
                users = []

            try:
                if not users:
                    users = cloud_api.System.users(session, message.system_id) if session.get('access_token') else {'sharing': []}

            except:
                message.result = RESULT_STATES.failure
                message.save()
                return

            cloud_users = [user['accountEmail'] for user in users['sharing']]
            message.targets = [email for email in message.targets if email in cloud_users]


        message.save()

    try:
        targets = emails if send_individual else (emails,)
        errors = []
        failed_emails = []

        for email in targets:
            if not isinstance(email_content, dict) or 'userFullName' in email_content:
                pass
            elif send_individual and (user := Account.objects.filter(email=email).first()):
                # TODO: Need to break dependencies on Account
                email_content['userFullName'] = user.get_full_name()
            else:
                email_content['userFullName'] = email
            try:
                email_engine.send(email, template_type, email_content, lang, customization, subject, attachments)
            except Exception as e:
                errors.append(e)
                failed_emails.append(email)

        if errors:
            if smtp_data_error := next(filter(lambda error: isinstance(error, SMTPDataError), errors), None):
                raise smtp_data_error
            elif smtp_send_error := next(filter(lambda error: isinstance(error, (SMTPException, SSLError)), errors), None):
                raise smtp_send_error
            else:
                raise errors[0]

    except Exception as error:
        if isinstance(error, SMTPDataError):
            logger.warning(f'SMTP Error. {settings.CONFIG_ERROR}')
        elif (
            isinstance(error, (SMTPException, SSLError))
            and attempt < settings.MAX_RETRIES
        ):
            send_email.apply_async(
                args=[message.id, queue, attempt + 1, email_type, failed_emails], queue=queue, customization=customization)
        elif attempt >= settings.MAX_RETRIES:
            error = MaxResendException()
        log_error(
            error,
            failed_emails,
            template_type,
            message,
            lang,
            customization,
            queue,
            attempt,
        )

        if isinstance(message, SystemEmail):
            email_content.pop('userFullName')
            message.result = RESULT_STATES.failure
            message.save()

        send_email.update_state(
            state='FAILURE',
            meta={
                'error': str(error),
                'user_email': failed_emails,
                'type': template_type,
                'message': email_content,
                'customization': customization,
                'language': lang,
                'queue': queue,
                'attempt': attempt,
            },
        )

        raise Ignore()
    else:
        if isinstance(message, Message):
            message.send_date = timezone.now()
        else:
            email_content.pop('userFullName')
            message.completed_date = timezone.now()
            message.result = RESULT_STATES.success
            if cache_key := message.attachments.get('cache_key'):
                caches['emails'].delete(cache_key)

        message.save()

        return {
            'user_email': emails,
            'type': template_type,
            'message': email_content,
            'customization': customization,
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
    # TODO: Need to break dependencies on Account
    users = Account.objects.exclude(activated_date=None, last_login=None).filter(
        customization__in=customizations)

    if settings.BROADCAST_NOTIFICATIONS_SUPERUSERS_ONLY:
        users = users.filter(is_superuser=True)

    for user in users:
        message['userFullName'] = user.get_full_name()
        notifications_api.send(
            user.email, 'cloud_notification', message, customization=user.customization)

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

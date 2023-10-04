import pytest
from model_bakery import baker
from uuid import uuid4
from random import randint
import base64
from datetime import datetime
from unittest.mock import call
from notifications.models import SystemEmail
from notifications.tasks import *


def test_log_error(mocker):
    mock_logger = mocker.patch('notifications.tasks.logger')
    base_args = [str(uuid4()) for _ in range(7)]

    for warning_error_class in WARNING_TASK_ERRORS:
        error = warning_error_class(randint(1, 1000), str(uuid4()))
        args = [error] + base_args
        expected_formatted = format_error(*args)
        log_error(*args)
        mock_logger.warning.assert_called_with(expected_formatted)

    error = Exception(randint(1, 1000), str(uuid4()))
    args = [error] + base_args
    expected_formatted = format_error(*args)
    log_error(*args)
    mock_logger.error.assert_called_once_with(expected_formatted)


def test_send_email_log(mocker):
    mock_logger = mocker.patch('notifications.tasks.logger')
    result = str(uuid4())
    func_name = 'test_func'
    args = (str(uuid4()),)
    kwargs = {str(uuid4()): str(uuid4())}

    @send_email_log
    def test_func(*args, **kwargs):
        return result

    assert test_func(*args, **kwargs) == result
    mock_logger.info.assert_called_once_with(
        f"Start {func_name} was run with args {args}, kwargs: {kwargs}")


class TestSendEmail:
    @pytest.fixture(autouse=True)
    def setup(self, mocker, db):
        self.mock_send = mocker.patch('notifications.engines.email_engine.send')
        self.user_email = f'{uuid4()}@{uuid4()}.com'
        self.message = baker.make(Message, user_email=self.user_email, message=str(uuid4()))
        self.expected_lang = get_language_for_email(
            self.message.user_email, self.message.customization)

    def test_send_email(self, mocker, db):
        # Test with message
        status = send_email(self.message.id)
        updated_message = Message.objects.get(id=self.message.id)
        assert updated_message.send_date
        self.mock_send.assert_called_once_with(
            self.message.user_email, self.message.type, self.message.message, self.expected_lang, self.message.customization, '', [])
        assert status == {
            'user_email': self.message.user_email,
            'type': self.message.type,
            'message': self.message.message,
            'customization': self.message.customization,
            'language': self.expected_lang,
            'queue': '',
            'attempt': 1
        }

    def test_send_system_email(self, mocker, db):
        message_html, message_text, subject, system_id, domain, *emails = [
            str(uuid4()) for _ in range(randint(10, 20))]
        non_cloud_emails = [f'{email}@{domain}.com' for email in emails]
        not_activated_emails = [f'not_activated_{email}' for email in non_cloud_emails]
        activated_emails = [f'activated_{email}' for email in non_cloud_emails]

        # Setup cloud accounts
        for email in not_activated_emails:
            baker.make('Account', email=email, activated_date=None)

        for email in activated_emails:
            baker.make('Account', email=email, activated_date=datetime.now())

        all_emails = non_cloud_emails + not_activated_emails + activated_emails
        mocker.patch.object(cloud_api.System, 'users', return_value={'sharing': [{'accountEmail': target} for target in all_emails]})
        attachments = emails
        expected_attachments = [
            {'filename': f'{attachment}.txt',
            'content': attachment,
            'mimetype': 'text/plain'
            } for attachment in attachments
        ]
        sys_email = baker.make(
            SystemEmail,
            message_html=message_html,
            message_text=message_text,
            subject=subject,
            system_id=system_id,
            targets=all_emails,
            attachments=expected_attachments
        )
        expected_message = {
            'html_body': message_html,
            'text_body': message_text
        }
        status = send_email(sys_email.id, email_type=SystemEmail.MSG_TYPE, session={'access_token': 'access_token'})
        updated_sys_email = SystemEmail.objects.get(id=sys_email.id)
        # assert updated_sys_email.completed_date
        # assert updated_sys_email.result == RESULT_STATES.success

        cached_attachments = caches['emails'].get(cache_key, []) if (cache_key := sys_email.attachments.get('cache_key', '')) else []
        expected_calls = [
            call(
                email,
                SystemEmail.MSG_TYPE,
                expected_message,
                self.expected_lang,
                settings.TEST_CUSTOMIZATION,
                sys_email.subject,
                [{**attachment, 'content': base64.b64decode(attachment['content'])} for attachment in cached_attachments]
            )
            for email in activated_emails
        ]
        assert self.mock_send.call_count == len(activated_emails)
        self.mock_send.assert_has_calls(expected_calls)


        assert status == {
            'user_email': activated_emails,
            'type': SystemEmail.MSG_TYPE,
            'message': expected_message,
            'customization': settings.TEST_CUSTOMIZATION,
            'language': self.expected_lang,
            'queue': '',
            'attempt': 1
        }


def test_initialize_push_notification_send(db):
    raw_system_id = str(uuid4())
    raw_targets = str(uuid4())
    count = randint(5, 50)
    push_notification = baker.make(
        PushNotification, raw_system_id=raw_system_id, raw_targets=raw_targets)

    initialized_notification = initialize_push_notification_send(
        push_notification.id, count)
    assert initialized_notification.state == PushNotification.RESULT_STATES.in_progress
    assert initialized_notification.count == count
    assert initialized_notification.id == push_notification.id


def test_handle_push_notification_send(mocker, db):
    request_data, device_ids, fcm_responses, raw_system_id, raw_targets = [
        str(uuid4()) for _ in range(5)]
    mock_send_notifications = mocker.patch(
        'notifications.models.PushNotification.send_notifications', return_value=[fcm_responses, None])
    system = {'users': baker.make('Account', 2)}
    mock_get_system_with_users = mocker.patch(
        'notifications.tasks.get_system_with_users', return_value=system)
    mock_get_push_devices_from_targets = mocker.patch(
        'notifications.tasks.get_push_devices_from_targets', return_value=None)
    push_notification_with_devices = baker.make(
        PushNotification, raw_system_id=raw_system_id, raw_targets=raw_targets)
    push_notification_without_subscriptions = baker.make(
        PushNotification, raw_system_id=raw_system_id, raw_targets=raw_targets)
    push_notification_with_subscriptions = baker.make(
        PushNotification, raw_system_id=raw_system_id, raw_targets=raw_targets)

    # Test sending with device_ids
    responses, no_subscriptions = handle_push_notification_send(
        push_notification_with_subscriptions, device_ids, request_data)
    updated_with_device_ids = PushNotification.objects.get(
        id=push_notification_with_devices.id)

    assert not no_subscriptions
    assert responses == [fcm_responses, None]
    mock_send_notifications.assert_called_once_with(device_ids=device_ids)
    assert updated_with_device_ids.state == PushNotification.RESULT_STATES.open
    mock_get_system_with_users.assert_not_called()
    mock_get_push_devices_from_targets.assert_not_called()

    # Test sending no subscriptions
    responses, no_subscriptions = handle_push_notification_send(
        push_notification_without_subscriptions, [], request_data)
    updated_without_subscriptions = PushNotification.objects.get(
        id=push_notification_without_subscriptions.id)

    assert responses is None
    assert no_subscriptions
    assert updated_without_subscriptions.state == PushNotification.RESULT_STATES.success
    assert updated_without_subscriptions.send_date
    mock_get_push_devices_from_targets.assert_called_once_with(
        push_notification_without_subscriptions, system['users'])

    # Test sending with subscriptions
    mock_get_system_with_users.reset_mock()
    mock_get_push_devices_from_targets.reset_mock()
    mock_get_push_devices_from_targets.return_value = mocker.sentinel.devices
    mock_send_notifications.reset_mock()
    responses, no_subscriptions = handle_push_notification_send(
        push_notification_with_subscriptions, None, request_data)
    updated_with_subscriptions = PushNotification.objects.get(
        id=push_notification_with_subscriptions.id)

    assert not no_subscriptions
    assert responses == [fcm_responses, None]
    mock_send_notifications.assert_called_with(devices=mocker.sentinel.devices)
    assert updated_with_subscriptions.state == PushNotification.RESULT_STATES.open
    mock_get_system_with_users.assert_called_with(push_notification_with_subscriptions, request_data)
    mock_get_push_devices_from_targets.assert_called_with(push_notification_with_subscriptions, system['users'])


def test_handle_push_notification_resend(mocker):
    request_data = str(uuid4())
    resend_device_ids = str(uuid4())
    mock_push_notification = mocker.MagicMock()
    mock_push_notification.id = str(uuid4())
    mock_apply_async = mocker.patch(
        'notifications.tasks.send_push_notification.apply_async')
    mock_log_push_result = mocker.patch(
        'notifications.notifications_api.log_push_result')
    resend_count = settings.PUSH_NOTIFICATIONS_SETTINGS['MAX_RETRIES'] - 1
    fail_count = settings.PUSH_NOTIFICATIONS_SETTINGS['MAX_RETRIES'] + 1

    # Handle success
    updated_resend_count = resend_count + 1
    handle_push_notification_resend(
        resend_count, mock_push_notification, request_data, resend_device_ids)
    mock_log_push_result.assert_called_once_with(
        mock_push_notification, f'Requeuing (count={updated_resend_count})')
    mock_apply_async.assert_called_once_with(
        countdown=settings.PUSH_NOTIFICATIONS_SETTINGS['RETRY_INTERVAL'],
        args=[mock_push_notification.id],
        kwargs={
            'request_data': request_data,
            'device_ids': resend_device_ids,
            'count': updated_resend_count
        },
        queue=settings.NOTIFICATIONS_CONFIG['push_notification']['queue']
    )

    # Handle fail
    handle_push_notification_resend(
        fail_count, mock_push_notification, request_data, resend_device_ids)
    assert mock_push_notification.state == PushNotification.RESULT_STATES.failure
    mock_log_push_result.assert_called_with(
        mock_push_notification, 'Retries exceeded')


def test_handle_push_notification_send_exception(mocker):
    request_data = str(uuid4())
    resend_device_ids = str(uuid4())
    exception = str(uuid4())
    mock_push_notification = mocker.MagicMock()
    mock_push_notification.id = str(uuid4())
    mock_apply_async = mocker.patch(
        'notifications.tasks.send_push_notification.apply_async')
    mock_log_push_result = mocker.patch(
        'notifications.notifications_api.log_push_result')
    resend_count = settings.PUSH_NOTIFICATIONS_SETTINGS['MAX_RETRIES'] - 1

    # Test retry
    scope = {}
    handle_push_notification_send_exception(
        scope, mock_push_notification, resend_count, request_data, resend_device_ids, exception)
    mock_log_push_result.assert_called_once_with(
        mock_push_notification, f'Exception: {exception}.', logging.ERROR, stack_trace=True)
    mock_apply_async.assert_called_once_with(
        countdown=settings.PUSH_NOTIFICATIONS_SETTINGS['RETRY_INTERVAL'],
        args=[mock_push_notification.id],
        kwargs={
            'request_data': request_data,
            'device_ids': resend_device_ids,
            'count': resend_count + 1
        },
        queue=settings.NOTIFICATIONS_CONFIG['push_notification']['queue']
    )

    # Test resend_device_ids not in scope
    responses = str(uuid4())
    scope['responses'] = responses
    mock_push_notification.state = None
    handle_push_notification_send_exception(
        scope, mock_push_notification, resend_count, request_data, resend_device_ids, exception)
    mock_log_push_result.assert_called_with(
        mock_push_notification, f'{type(exception)}: {exception},\nResponse: {scope["responses"]}.', logging.ERROR, stack_trace=True)
    assert mock_push_notification.state == PushNotification.RESULT_STATES.failure

    # Test other failure
    scope['resend_device_ids'] = resend_device_ids
    mock_push_notification.state = None
    handle_push_notification_send_exception(
        scope, mock_push_notification, resend_count, request_data, resend_device_ids, exception)
    mock_log_push_result.assert_called_with(
        mock_push_notification, f'{type(exception)}: {exception}', logging.ERROR, stack_trace=True)
    assert mock_push_notification.state == PushNotification.RESULT_STATES.failure


def test_send_push_notification(mocker, db, default_customization):
    request_data, raw_system_id, raw_targets, *devices = [
        str(uuid4()) for _ in range(randint(10, 100))]
    request_data = str(uuid4())
    mock_process_fcm_push_response = mocker.patch(
        'notifications.tasks.notifications_api.process_fcm_push_response', return_value=[])
    mock_handle_push_notification_send = mocker.patch(
        'notifications.tasks.handle_push_notification_send', return_value=[[mocker.sentinel.fcm_response, []], False])
    push_notification = baker.make(
        PushNotification, raw_system_id=raw_system_id, raw_targets=raw_targets, customization=default_customization)

    send_push_notification(push_notification.id, request_data)
    updated_notification = PushNotification.objects.get(
        id=push_notification.id)

    mock_handle_push_notification_send.assert_called_once_with(
        push_notification, None, request_data)
    mock_process_fcm_push_response.assert_called_once_with(
        mocker.sentinel.fcm_response, push_notification)
    assert updated_notification.send_date


def test_send_to_all_users(mocker, account_factory, db):
    mock_send = mocker.patch('notifications.notifications_api.send')
    customizations = [settings.TEST_CUSTOMIZATION]
    notification_id = str(uuid4())
    subject = str(uuid4())
    message = {'subject': subject}
    force = True
    first_name = str(uuid4())
    last_name = str(uuid4())
    email = f'{first_name}@{last_name}.com'

    users = [account_factory(email=email, first_name=first_name,
                             last_name=last_name, activated_date=datetime.now()) for _ in range(randint(5, 15))]

    expected_calls = [
        call(user.email, 'cloud_notification', {
            **message,
            'userFullName': user.get_full_name()})
        for user in users
    ]

    assert send_to_all_users(notification_id, message, customizations, force=force) == {
        'notification_id': notification_id, 'subject': subject, 'force': force}
    assert mock_send.has_calls(expected_calls)


def test_async_task_test(mocker):
    mocker.patch('time.sleep')
    x = randint(1, 1000)
    y = randint(1, 1000)

    assert async_task_test(x, y) == x * y
    with open('task.log', 'r') as f:
        assert f.read() == f"Task Done: {x} * {y} = {x*y}"

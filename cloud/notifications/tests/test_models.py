from conftest import check_against_expected_meta
import pytest
from unittest.mock import call
from uuid import uuid4
from random import randint, choice
from datetime import datetime, timedelta
from model_bakery import baker

from notifications.models import *


class TestMessageTypes:
    def test_keys(self):
        MESSAGE_TYPES = MessageTypes()
        keys = list(filter(lambda k: not k.startswith(
            "__", 0, 2) and k != "keys", dir(MESSAGE_TYPES)))
        assert MESSAGE_TYPES.keys() == keys


class BaseModelTest:
    @pytest.fixture()
    def instance(self, get_instance):
        return get_instance(self.model_class)

    @pytest.fixture()
    def get_instance(self, db):
        def _get_instance(model_class=self.model_class, **kwargs):
            assert getattr(self, 'model_class')
            return baker.prepare(model_class, **kwargs)

        return _get_instance

    def test_check_meta(self):
        assert getattr(self, 'expected_meta')
        check_against_expected_meta(self.model_class, self.expected_meta)


class TestEvent(BaseModelTest):
    model_class = Event
    expected_meta = {
        'object': {
            'max_length': 255
        },
        'type': {
            'max_length': 255
        },
        'created_date': {
            'auto_now_add': True
        },
        'send_date': {
            'null': True,
            'blank': True
        }
    }

    def test_str(self, instance):
        name = str(instance)
        assert name == f'{instance.object} - {instance.type}'

    def test_send(self, mocker, instance, get_instance, account_factory):
        mock_message_instance = mocker.MagicMock()
        mock_message = mocker.patch(
            'notifications.models.Message', return_value=mock_message_instance)
        mock_save = mocker.patch('notifications.models.Event.save')

        account = account_factory(
            email=f'{uuid4()}@{uuid4()}.com', first_name=str(uuid4()), last_name=str(uuid4()))
        account.save()
        subscription = get_instance(
            Subscription, user_email=account.email, type=instance.type, object=instance.object)
        subscription.save()
        expected_message = {
            'userFullName': account.get_full_name(),
            **json.loads(instance.data)
        }

        instance.send()

        assert mock_save.call_count == 2
        assert instance.send_date is not None
        mock_message.assert_called_once_with(
            message=expected_message, user_email=account.email, customization=account.customization, type=instance.type, event=instance)
        mock_message_instance.send.assert_called_once_with()


class TestSubscription(BaseModelTest):
    model_class = Subscription
    expected_meta = {
        'object': {
            'max_length': 255,
            'default': '',
            'blank': True,
            'help_text': "What's the target? (release type, customization or cloud instance)"
        },
        'type': {
            'max_length': 255,
            'default': '',
            'blank': True,
            'help_text': "What's the event? (submitted_release, published_{{type}}, cloud_...)"
        },
        'created_date': {
            'auto_now_add': True
        },
        'enabled': {
            'default': True
        }
    }

    def test_str(self, instance):
        name = str(instance)
        assert name == f'{instance.object} - {instance.type}'


class TestMessage(BaseModelTest):
    model_class = Message
    expected_meta = {
        'external_id': {
            'max_length': 64,
            'db_index': True,
            'unique': True,
            'blank': True,
            'null': True
        },
        'task_id': {
            'max_length': 50
        },
        'created_date': {
            'auto_now_add': True
        },
        'send_date': {
            'null': True,
            'blank': True
        },
        'event': {
            'null': True
        }
    }

    def test_str(self, instance):
        name = str(instance)
        assert name == f'{instance.type} - {instance.user_email}'

    def test_send(self, mocker, instance):
        mock_save = mocker.patch('notifications.models.Message.save')
        mock_send_email = mocker.patch('notifications.tasks.send_email')

        instance.send()

        mock_send_email.assert_called_once_with(instance.id)
        mock_save.call_count == 2

    def test_delivery_time_interval(self, instance):
        assert instance.delivery_time_interval() == "Message has not been sent yet"

        interval = timedelta(seconds=randint(5, 100))
        instance.send_date = datetime.now()
        instance.created_date = instance.send_date - interval

        assert instance.delivery_time_interval() == interval.total_seconds()


class TestFeedback(BaseModelTest):
    model_class = Feedback
    expected_meta = {
        'created_date': {
            'auto_now_add': True
        },
        'message': {
            'default': '',
            'blank': True
        },
        'asset_name': {
            'max_length': 255
        },
        'sender_name': {
            'max_length': 255
        },
        'sender_email': {
            'max_length': 255
        },
        'type': {
            'max_length': 255
        }
    }

    def test_str(self, instance):
        name = str(instance)
        assert name == f'{instance.asset_name} - {instance.type}'

    def test_send(self, mocker, get_instance, asset_factory, account_factory):
        account = account_factory()
        asset = next(asset_factory(account=account))
        instance = get_instance(target_asset=asset)
        mock_save = mocker.patch('notifications.models.Feedback.save')
        mock_event = mocker.MagicMock()
        mock_create_event = mocker.patch(
            'notifications.models.Event.objects.create', return_value=mock_event)
        mock_message = mocker.MagicMock()
        mock_create_message = mocker.patch(
            'notifications.models.Message.objects.create', return_value=mock_message)
        expected_message = {
            'sender_name': instance.sender_name,
            'sender_email': instance.sender_email,
            'asset': instance.asset_name,
            'message': instance.message
        }

        instance.send()

        mock_event.send.assert_called_once_with()
        mock_save.assert_called_once_with()
        mock_create_event.assert_called_once_with(
            type=instance.type,
            object=instance.target_asset.id,
            data=expected_message
        )
        mock_create_message.assert_called_once_with(
            user_email=json.dumps([instance.sender_email]),
            type=instance.type,
            customization=settings.CUSTOMIZATION,
            message=expected_message,
            event=mock_event
        )


class TestMessageStatusSerializer:
    def test_serializer(self, mocker, db):
        def update_task_id(message):
            message.task_id = 'sync'
            message.save()

        message = baker.prepare(Message, external_id=str(uuid4()))
        mock_send_email = mocker.patch(
            'notifications.tasks.send_email', side_effect=update_task_id(message))

        serializer = MessageStatusSerializer(message, many=False)
        serialized_data = serializer.data

        for field in MessageStatusSerializer.Meta.fields:
            expected_value = getattr(message, field, None)

            if field == 'send':
                expected_value = None

            if isinstance(expected_value, datetime):
                expected_value = str(expected_value).replace(' ', 'T')
            assert serialized_data[field] == expected_value

        mock_send_email.assert_called_once_with(message.id)

class TestCloudNotification(BaseModelTest):
    model_class = CloudNotification
    expected_meta = {
        'subject': {
            'max_length': 255
        },
        'sent_date': {
            'null': True,
            'blank': True
        },
        'sent_by': {
            'null': True,
            'blank': True
        }
    }

    def test_str(self, instance):
        name = str(instance)
        assert name == instance.subject


class TestPushSubscription(BaseModelTest):
    model_class = PushSubscription
    expected_meta = {
        'type': {
            'choices': PushSubscription.SUB_TYPES,
            'default': PushSubscription.SUB_TYPES.cloud
        },
        'system_id': {
            'max_length': 255,
            'unique': True
        }
    }

    def test_str(self, instance):
        name = str(instance)
        assert name == f'{instance.SUB_TYPES[instance.type]} - {instance.system_id}'


class TestPushDevice(BaseModelTest):
    model_class = PushDevice
    expected_meta = {
        'model': {
            'max_length': 255
        },
        'os': {
            'choices': PushDevice.OS,
            'default': PushDevice.OS.web
        },
        'type': {
            'choices': PushDevice.TYPES,
            'default': PushDevice.TYPES.notification
        },
        'provider': {
            'choices': PushDevice.PROVIDERS,
            'default': PushDevice.PROVIDERS.firebase_legacy
        },
        'arn': {
            'max_length': 255,
            'blank': True
        },
        'baidu_user_id': {
            'max_length': 255,
            'blank': True
        }
    }

    def test_str(self, instance):
        name = str(instance)
        expected_name = instance.name or 'Unnamed Device'
        assert name == expected_name


class TestPushNotification(BaseModelTest):
    model_class = PushNotification
    expected_meta = {
        'title': {
            'max_length': 255,
            'blank': True
        },
        'body': {
            'max_length': PushNotification.SIZE_LIMIT,
            'blank': True,
        },
        'payload': {
            'max_length': PushNotification.SIZE_LIMIT,
            'blank': True,
            'null': True
        },
        'options': {
            'blank': True,
            'null': True
        },
        'raw_system_id': {
            'max_length': 255,
            'default': ''
        },
        'raw_targets': {
            'null': True
        },
        'result_data': {
            'null': True,
            'blank': True
        },
        'customization': {
            'blank': True,
            'null': True
        },
        'count': {
            'default': 0
        }
    }

    def test_str(self, instance):
        name = str(instance)
        expected_name = instance.title or 'Untitled Notification'
        assert name == expected_name

    def test_clean(self, instance):
        instance.clean()

        validation_failed = True

        try:
            instance.title = 'x'
            instance.payload = 'x' * instance.SIZE_LIMIT
            instance.clean()

            # Clean should raise validation error and not reach this line
            validation_failed = False
        except ValidationError as e:
            assert e.message == f'Title, body, and payload cannot total more than {instance.SIZE_LIMIT}'

        assert validation_failed

    def test_save(self, mocker, instance):
        mock_full_clean = mocker.patch(
            'notifications.models.PushNotification.full_clean')

        instance.save()

        mock_full_clean.assert_called_once_with()

    def test_sub_traffic_relay(self, instance):
        system_id = '8e6cc17c-57af-4151-b82a-82a3feb23f0f'
        endpoint = str(uuid4())
        test_url = f'{system_id}/{endpoint}'
        relay = settings.TRAFFIC_RELAY_HOST.replace('{systemId}', system_id)
        expected = f'{relay}/{endpoint}'

        assert instance.sub_traffic_relay(test_url) == expected

    def test_generate_provider_specific_messages(self):
        messages = PushNotification.generate_provider_specific_messages(
            'title',
            'body',
            {'payload_key': 'payload_value'},
            {'options_key': 'options_value'},
            {'data_key': 'data_value'}
        )

        expected_messages = {
            2: '{"APNS": "{\\"aps\\": {\\"alert\\": {\\"title\\": \\"title\\", \\"body\\": \\"body\\"}, \\"options-key\\": \\"options_value\\"}, \\"payload_key\\": \\"payload_value\\"}"}',
            4: '{"APNS_SANDBOX": "{\\"aps\\": {\\"alert\\": {\\"title\\": \\"title\\", \\"body\\": \\"body\\"}, \\"options-key\\": \\"options_value\\"}, \\"payload_key\\": \\"payload_value\\"}"}',
            1: '{"GCM": "{\\"notification\\": {\\"title\\": null, \\"body\\": null}, \\"data\\": {\\"data_key\\": \\"data_value\\", \\"options_key\\": \\"options_value\\"}}"}',
            3: '{"BAIDU": "{\\"msg\\": {\\"title\\": null, \\"description\\": null}, \\"custom_content\\": {\\"data_key\\": \\"data_value\\"}, \\"options_key\\": \\"options_value\\"}"}'
        }

        assert messages == expected_messages

    def test_send_notifications(self, instance, mocker, db):
        def map_id(choices):
            return [id for id, *_ in choices]

        def randomize(device):
            device.os = choice(map_id(PushDevice.OS))
            device.type = choice(map_id(PushDevice.TYPES))
            device.provider = choice(map_id(PushDevice.PROVIDERS))
            device.save()
            return device

        expected_sns_messages = str(uuid4())
        mock_generate_provider_specific_messages = mocker.patch(
            'notifications.models.PushNotification.generate_provider_specific_messages', return_value=expected_sns_messages)

        expected_sns_client = str(uuid4())
        mock_get_sns_client = mocker.patch(
            'notifications.conf.get_sns_client', return_value=expected_sns_client)

        expected_response = str(uuid4())
        mock_send_message = mocker.patch(
            'notifications.models.PushDeviceQuerySet.send_message', return_value=expected_response)

        mock_send_sns_push = mocker.patch(
            'notifications.engines.sns_push.send_sns_push')

        devices = [randomize(device) for device in baker.prepare(
            PushDevice, randint(10, 100))]

        expected_send_sns_push_calls = [
            call(device, expected_sns_client,
                 expected_sns_messages, [], instance)
            for device in devices if device.provider != PushDevice.PROVIDERS.firebase_legacy]

        (notification_response, data_response), *_ = instance.send_notifications(
            device_ids=(device.id for device in devices))

        mock_send_sns_push.has_calls(expected_send_sns_push_calls)
        assert mock_send_message.call_count == 2
        assert notification_response == expected_response
        assert data_response == expected_response

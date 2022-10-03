from enum import Enum
import json
import logging

import botocore

from notifications.models import PushDevice
from notifications.notifications_api import log_push_result
from notifications.serializers import get_aws_platform_arns, PROVIDERS_REVERSE_MAP

logger = logging.getLogger(__name__)


class SNSErrors(Enum):
    def __new__(cls, code, message=None):
        value = len(cls.__members__) + 1
        obj = object.__new__(cls)
        obj._value_ = value
        obj.code = code
        obj.message = message
        return obj

    def __eq__(self, other):
        if isinstance(other, Exception):
            response = getattr(other, 'response', None)
            if not response:
                return False

            error_dict = response.get('Error', None)
            if not error_dict:
                return False
        elif type == dict:
            error_dict = other
        else:
            return False

        code = error_dict.get('Code')
        message = error_dict.get('Message')

        return self.code == code and (not self.message or self.message in message)

    ENDPOINT_DISABLED = 'EndpointDisabled'
    ENDPOINT_INVALID = ('InvalidParameter', 'Invalid parameter: TargetArn Reason: ARN specifies an invalid endpointId')
    ENDPOINT_NOT_EXIST = ('InvalidParameter', 'Invalid parameter: TargetArn Reason: No endpoint found for the target arn specified')


def generate_provider_specific_messages(title, body, payload, options, data_payload):
    apns_message = {
        'aps': {
            'alert': {'title': title, 'body': body},
            **{key.replace('_', '-'): val for key, val in options.items()}
        },
        **payload
    }
    android_priority = options.get('priority', 'normal')
    return {
        PushDevice.PROVIDERS.apn: json.dumps({'APNS': json.dumps(apns_message)}),
        PushDevice.PROVIDERS.apn_sandbox: json.dumps({'APNS_SANDBOX': json.dumps(apns_message)}),
        PushDevice.PROVIDERS.firebase: json.dumps({'GCM': json.dumps({
            'notification': {'title': None, 'body': None},
            'data': {**data_payload, **options},
            'android': {'priority': android_priority},
            'priority': android_priority
        })}),
        PushDevice.PROVIDERS.baidu: json.dumps({'BAIDU': json.dumps({
            'msg': {'title': None, 'description': None},
            'custom_content': {**data_payload},
            **options
        })})
    }


def create_platform_endpoint(device, client):
    platform_arns = get_aws_platform_arns(device.application_id)
    platform_arn = platform_arns[PROVIDERS_REVERSE_MAP[device.provider]]
    if not platform_arn:
        logger.warning(
            f'Provider: {PushDevice.PROVIDERS[device.provider]}, Device Id: {device.registration_id}, UserId: {device.user_id}\n'
            f'ARN is not configured for provider {device.provider}')
        return False

    try:
        if device.provider == 'baidu':
            platform_endpoint = client.create_platform_endpoint(
                PlatformApplicationArn=platform_arn, Token=device.registration_id,
                Attributes={'UserId': device.user_id, 'ChannelId': device.registration_id}
            )
        else:
            platform_endpoint = client.create_platform_endpoint(PlatformApplicationArn=platform_arn,
                                                                Token=device.registration_id)
    except botocore.exceptions.ClientError as client_error:
        logger.warning(
            f'Provider: {PushDevice.PROVIDERS[device.provider]}, Device Id: {device.registration_id}, '
            f'UserId: {device.baidu_user_id}, PlatformARN: {platform_arn}\n'
            f'Boto3 ClientError: {client_error}')
        return False

    endpoint_arn = platform_endpoint.get('EndpointArn')
    device.arn = endpoint_arn
    device.save()
    return True


def send_sns_push(device, client, messages, retry_device_ids, notification_object):
    if not device.active:
        return

    try:
        message = messages[device.provider]
        client.publish(TargetArn=device.arn, Message=message, MessageStructure='json')
    except botocore.exceptions.ClientError as error:
        if error == SNSErrors.ENDPOINT_DISABLED:
            log_push_result(
                notification_object, f'SNS Error: EndpointDisabled. Disabling Push Device',
                device_id=device.id
            )
            device.active = False
            device.save()
        elif error == SNSErrors.ENDPOINT_NOT_EXIST:
            if create_platform_endpoint(device, client):
                retry_device_ids.append(device.id)
        else:
            log_push_result(notification_object, f'SNS ClientError: {error}', logging.ERROR, stack_trace=True,
                            device_id=device.id)
            retry_device_ids.append(device.id)
    except Exception as exception:
        log_push_result(notification_object, f'{type(exception)}: {exception}', logging.ERROR, stack_trace=True, device_id=device.id)
        retry_device_ids.append(device.id)

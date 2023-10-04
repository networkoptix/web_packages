import pytest

from notifications.engines.sns_push import *


def test_generate_provider_specific_messages():
    messages = generate_provider_specific_messages(
        'title',
        'body',
        {'payload_key': 'payload_value'},
        {'options_key': 'options_value'},
        {'data_key': 'data_value'}
    )

    expected_messages = {
        1: '{"GCM": "{\\"notification\\": {\\"title\\": null, \\"body\\": null}, '
           '\\"data\\": {\\"data_key\\": \\"data_value\\", \\"options_key\\": '
           '\\"options_value\\"}, \\"android\\": {\\"priority\\": \\"normal\\", '
           '\\"options_key\\": \\"options_value\\"}, \\"priority\\": \\"normal\\"}"}',
        2: '{"APNS": "{\\"aps\\": {\\"alert\\": {\\"title\\": \\"title\\", '
           '\\"body\\": \\"body\\"}, \\"options-key\\": \\"options_value\\"}, '
           '\\"payload_key\\": \\"payload_value\\"}"}',
        3: '{"BAIDU": "{\\"msg\\": {\\"title\\": null, \\"description\\": null}, '
           '\\"custom_content\\": {\\"data_key\\": \\"data_value\\"}, '
           '\\"options_key\\": \\"options_value\\"}"}',
        4: '{"APNS_SANDBOX": "{\\"aps\\": {\\"alert\\": {\\"title\\": \\"title\\", '
           '\\"body\\": \\"body\\"}, \\"options-key\\": \\"options_value\\"}, '
           '\\"payload_key\\": \\"payload_value\\"}"}'
    }

    assert messages == expected_messages

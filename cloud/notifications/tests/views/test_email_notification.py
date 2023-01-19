import pytest
from uuid import uuid4
from rest_framework.test import force_authenticate
from rest_framework import status
from django.urls import reverse

from notifications.views.email_notification import *


def test_email_notification(arf, account_factory, db, mocker):
    mocker.patch('notifications.tasks.send_email')
    system_id, subject, message_html, message_text, domain, *uuid_list = [str(uuid4()) for _ in range(10)]
    data = {
        'systemId': system_id,
        'subject': subject,
        'messageHtml': message_html,
        'messageText': message_text,
        'targets': [f'{target}@{domain}.com' for target in uuid_list],
        'attachments': [{
            'filename': f'{attachment}.log',
            'mimetype': 'text/plain',
            'content': attachment
        } for attachment in uuid_list]
    }

    url = reverse('push_notification')
    user = account_factory()

    request = arf.post(url, data, format='json')
    request.session = {}
    force_authenticate(request, user=user)
    res = email_notification(request)

    # Test success
    assert res.status_code == status.HTTP_200_OK
    assert res.data == {**data, 'messageId': res.data['messageId'], 'messageHtml': f'<p>{message_html}</p>'}

    # Test missing subject
    request = arf.post(url, {**data, 'subject': ''}, format='json')
    request.session = {}
    force_authenticate(request, user=user)
    res = email_notification(request)

    assert res.status_code == status.HTTP_400_BAD_REQUEST
    assert res.rendered_content == b'{"subject":["This field may not be blank."]}'

    # Test missing targets
    request = arf.post(url, {**data, 'targets': []}, format='json')
    request.session = {}
    force_authenticate(request, user=user)
    res = email_notification(request)

    assert res.status_code == status.HTTP_400_BAD_REQUEST
    assert res.rendered_content == b'{"targets":["This list may not be empty."]}'

    # Test invalid targets
    targets_with_invalid = [*data['targets'], 'invalid_email.com']
    request = arf.post(url, {**data, 'targets': targets_with_invalid}, format='json')
    request.session = {}
    force_authenticate(request, user=user)
    res = email_notification(request)

    assert res.status_code == status.HTTP_400_BAD_REQUEST
    assert res.rendered_content.decode() == f'{{"targets":{{"{len(targets_with_invalid) - 1}":["Enter a valid email address."]}}}}'


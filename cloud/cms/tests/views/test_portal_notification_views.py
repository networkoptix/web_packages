from uuid import uuid4
from random import randint
from datetime import datetime, timedelta

import pytest
from rest_framework import status
from model_bakery import baker
from rest_framework.request import Request


from cms.views.portal_notifications import *


def test_serialize_notifications(mocker):
    expected_serialized_values = [str(uuid4()) for _ in range(10)]
    mock_notifications = [
        mocker.MagicMock(
            spec=PortalNotification,
            get_serialized=mocker.MagicMock(
                return_value=value))
        for value in expected_serialized_values]

    serialized = serialize_notifications(mock_notifications)

    assert serialized == expected_serialized_values


def test_validate_notification_ids_valid():
    validate_notification_ids([num for num in range(10)])


def test_validate_notification_ids_invalid_not_list():
    pytest.raises(
        ValidationError, validate_notification_ids, str(uuid4())).match(
            'Must be a list')


def generate_notifications(min_qty=3, max_qty=7, **kwargs):
    qty = randint(min_qty, max_qty)
    kwargs = {'title': str(uuid4()), 'body': str(uuid4()), **kwargs}

    return [baker.make(PortalNotification, **kwargs) for _ in range(qty)]


def test_get_notifications(mocker, account_factory, db):
    user = account_factory()
    mock_request = mocker.MagicMock(spec=Request, user=user)
    version = randint(1, 20)
    old_build, current_build, future_build = [
        f'{version}.{version + offset}.{version}.{version}'
        for offset in [-1, 0, 1]]

    viewed_notifications = generate_notifications(build=current_build)
    user.portalnotification_set.add(
        *[notification.id for notification in viewed_notifications])
    old_notifications = generate_notifications(
        build=old_build) + generate_notifications(max_ts=datetime.now() - timedelta(weeks=3), build=old_build)
    future_notifications = generate_notifications(
        min_ts=datetime.now() + timedelta(weeks=1), build=future_build)

    mocker.patch.object(settings, 'VERSION', current_build)

    # Old, viewed, and upcoming notifications are correctly excluded
    data = get_notifications(mock_request)
    assert data['currentBuild'] == current_build
    assert not data['notifications']

    # Active notifications property included
    for notification in future_notifications:
        notification.min_ts = datetime.now()
        notification.save()

    data = get_notifications(mock_request)
    assert data['notifications'] == serialize_notifications(
        future_notifications)


def test_mark_read(mocker, account_factory, db):
    user = account_factory()
    version = randint(1, 20)
    current_build = f'{version}.{version}.{version}.{version}'
    mocker.patch.object(settings, 'VERSION', current_build)
    to_be_marked_read, *expected_unread = generate_notifications(build=current_build)
    mock_request = mocker.MagicMock(
        spec=Request, user=user, data={'notificationIds': [to_be_marked_read.id]}, method='POST')

    data = mark_read(mock_request)
    assert data['currentBuild'] == current_build
    assert data['markedRead'] == serialize_notifications([to_be_marked_read])
    assert data['notifications'] == serialize_notifications(expected_unread)


def test_correct_handler_used(mocker, account_factory, arf, db):
    expected_notifications = str(uuid4())
    expected_mark_read = str(uuid4())
    mocker.patch('cms.views.portal_notifications.get_notifications',
                 return_value=expected_notifications)
    mark_read = mocker.patch(
        'cms.views.portal_notifications.mark_read', return_value=expected_mark_read)

    # GET handled by get_notifications
    get_request = arf.get('/api/portal_notifications')
    get_request.user = account_factory()
    res = notifications(get_request)
    assert res.data == expected_notifications

    # POST handled by mark_read
    get_request = arf.post('/api/portal_notifications')
    get_request.user = account_factory()
    res = notifications(get_request)
    assert res.data == expected_mark_read

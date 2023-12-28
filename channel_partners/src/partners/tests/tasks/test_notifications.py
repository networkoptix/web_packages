from uuid import uuid4

from django.core.cache import caches

from partners.tasks.notification import get_customization, is_existing_user


def test_get_customization(mock_get_customization_request, request_host, httpx_mock):
    caches['default'].clear()
    customization = f'{uuid4()}'
    url = mock_get_customization_request(customization_name=customization)
    assert get_customization(request_host) == customization
    sent_requset = httpx_mock.get_request(url=url)
    assert sent_requset
    # Test cached
    httpx_mock.reset(False)
    url = mock_get_customization_request(customization_name=customization)
    assert get_customization(request_host) == customization
    sent_requset = httpx_mock.get_request(url=url)
    assert sent_requset is None


def test_get_general_notification_type(mock_account_status, request_host, httpx_mock):
    email = f'{uuid4()}@example.com'
    mock_account_status(email=email, active=True)
    assert is_existing_user(host=request_host, email=email)

    httpx_mock.reset(True)
    mock_account_status(email=email, active=False)
    assert is_existing_user(host=request_host, email=email) is False



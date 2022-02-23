import pytest
from uuid import uuid4

from rest_framework import status

from cms.views.celery import *


def test_check_status(mocker, arf, account_factory, db):
    mock_request = arf.get('')
    mock_request.session = {}
    mock_request.user = account_factory()
    mock_task = mocker.MagicMock()
    mock_task_id, expected_state, expected_result = [
        str(uuid4()) for _ in range(3)]
    mock_task.state = expected_state
    mock_task.result = None
    mock_async_result = mocker.patch(
        'celery.result.AsyncResult', return_value=mock_task)

    # Test has state
    res = check_status(mock_request, mock_task_id)
    assert res.data == expected_state
    mock_async_result.assert_called_once_with(mock_task_id)

    # Test has result
    mock_task.result = expected_result
    res = check_status(mock_request, mock_task_id)
    assert res.data == expected_result


def test_download_result(mocker, arf, account_factory, db):
    mock_task_id = str(uuid4())
    mock_request = arf.get('')
    mock_request.session = {}
    mock_request.user = account_factory()

    # Test no result
    res = download_result(mock_request, mock_task_id)
    assert res.status_code == status.HTTP_404_NOT_FOUND
    assert res.data['errorText'] == 'File not available'

    # Test result available
    file_name = f'{uuid4()}.txt'
    file_content = str(uuid4())
    DOWNLOAD_CACHE = PackagesCache()
    DOWNLOAD_CACHE[mock_task_id] = {
        'file_name': file_name, 'file': file_content}
    res = download_result(mock_request, mock_task_id)
    assert res.status_code == status.HTTP_200_OK
    assert res.content == file_content.encode()
    res_file_name = res.cookies['filename'].value
    assert res_file_name == file_name

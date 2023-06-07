import pytest
from random import randint
from uuid import uuid4

from cms.feature_flags.feature_flags import *
from cms.feature_flags.helpers import *


class TestFeatureFlagHelpers:
    def test_get_request_argument(self, mocker):
        from rest_framework.request import Request
        request = mocker.MagicMock(spec=Request)
        random_kwargs = {str(uuid4()): str(uuid4()) for _ in range(randint(7, 13))}
        random_kwargs['request'] = request
        random_args = list(random_kwargs.values())
        assert get_request_argument(**random_kwargs) is request
        assert get_request_argument(*random_args) is request
    
    def test_validate_is_superuser(self, mocker):
        request = mocker.MagicMock(spec=Request)

        # Return error message if not superuser
        request.user.is_superuser = False
        assert validate_is_superuser(request) == ERROR_ONLY_SUPERUSERS

        # Return false if superuser
        request.user.is_superuser = True
        assert not validate_is_superuser(request)
    
    def test_get_feature_flag_error(self):
        flag = str(uuid4())
        user = str(uuid4())
        expected_message = f'Feature {flag} is currently not enabled for user {user}'
        assert get_feature_flag_error(flag, user) == expected_message
    
    def test_check_feature_flag_decorator(self, mocker):
        mock_request = mocker.MagicMock(spec=Request)
        mock_request.user.is_superuser = False
        mock_flag_is_active = mocker.patch('waffle.flag_is_active', return_value=True)
        mock_validator = mocker.MagicMock()
        mock_validator.return_value = False

        @check_feature_flag(FLAGS.zendesk_sync, mock_validator)
        def wrapped_function(request):
            assert mock_flag_is_active.return_value
            return mock_flag_is_active.return_value
        
        assert wrapped_function(mock_request)

        mock_flag_is_active.return_value = False
        try:
            wrapped_function(mock_request)
        except PermissionError as error:
            assert error
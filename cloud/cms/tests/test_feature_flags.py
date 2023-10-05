import pytest
from random import randint
from uuid import uuid4

import waffle
from django.core.cache import cache
from model_bakery import baker

from cloud.customization_context import customization_ctx
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

    def test_customization_enabled_flag(self, mocker, default_customization, other_customization):
        flag_name = f'{uuid4()}'
        mocker.patch('cms.feature_flags.feature_flags.FLAGS.json_key', return_value=flag_name)
        flag = baker.make("cms.Flag", name=flag_name)
        mock_request = mocker.MagicMock(spec=Request, META={})
        mock_request.user.is_superuser = False
        mock_request.CUSTOMIZATION = default_customization.name
        other_request = mocker.MagicMock(spec=Request, META={})
        other_request.user.is_superuser = False
        other_request.CUSTOMIZATION = other_customization.name

        is_active = waffle.flag_is_active(mock_request, flag_name=flag.name)

        assert is_active is False

        cache.clear()
        flag.enable_all_customizations = True
        flag.save()
        customization_ctx.set(default_customization.name)
        assert waffle.flag_is_active(mock_request, flag_name=flag.name)
        customization_ctx.set(other_customization.name)
        assert waffle.flag_is_active(other_request, flag_name=flag.name)

        cache.clear()
        flag.enable_all_customizations = False
        flag.save()
        flag.customizations.add(other_customization)
        customization_ctx.set(default_customization.name)
        assert waffle.flag_is_active(mock_request, flag_name=flag.name) is False
        customization_ctx.set(other_customization.name)
        assert waffle.flag_is_active(other_request, flag_name=flag.name)
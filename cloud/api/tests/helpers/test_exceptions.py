import logging
from uuid import uuid4
from random import randint

import pytest
from unittest.mock import call

from nx_drf.drf_async import async_api_view
from cloud.helpers.exceptions import *


class TestExceptions:
    def test_error_code_log_levels(self):
        for error in ErrorCodes:
            log_level = error.log_level()

            if log_level is logging.INFO:
                assert error in info_level_errors
            elif log_level is logging.WARNING:
                assert error in warning_level_errors
            elif logging.ERROR:
                info_and_warning_errors = info_level_errors + warning_level_errors
                assert error not in info_and_warning_errors
            else:
                # Checks to make sure that defined errors log_levels are set
                assert False

    def test_create_response_with_cookies(self, mocker):
        mock_response = mocker.MagicMock()
        mock_response_class = mocker.patch(
            'rest_framework.response.Response', return_value=mock_response)
        mock_data = str(uuid4())
        mock_status_code = str(uuid4())
        cookies_to_delete = {str(uuid4()): '' for _ in range(7)}
        cookies_to_set = {str(uuid4()): str(uuid4()) for _ in range(4)}
        mock_cookies = {**cookies_to_delete, **cookies_to_set}

        response = create_response_with_cookies(
            mock_data, mock_status_code, mock_cookies)

        response.delete_cookie.assert_has_calls(
            call(name)
            for name in cookies_to_delete)

        response.set_cookie.assert_has_calls(
            call(name, value, httponly=True, secure=True)
            for name, value in cookies_to_set.items())

    def test_api_success(self, mocker):
        test_data = str(uuid4())
        test_status_code = status.HTTP_201_CREATED
        test_cookies = str(uuid4())

        # Test without data
        assert api_success().data['resultCode'] == ErrorCodes.ok.value

        # Test with data
        assert api_success(data=test_data).data == test_data

        # Test with custom status code
        assert api_success(
            status_code=test_status_code).status_code == test_status_code

        # Test with cookies
        mock_create_response_with_cookies = mocker.patch(
            'cloud.helpers.exceptions.create_response_with_cookies')
        api_success(data=test_data, status_code=test_status_code,
                    cookies=test_cookies)
        mock_create_response_with_cookies.assert_called_once_with(
            test_data, test_status_code, test_cookies, None)

    def test_require_params(self, mocker):
        mock_request = mocker.MagicMock()
        required_params = [str(uuid4()) for _ in range(7)]
        required_params_values = {param: True for param in required_params}
        other_params = {str(uuid4()): '' for _ in range(7)}
        expected_error = {param: ['This field is required.']
                          for param in required_params}

        # Test missing params POST
        with pytest.raises(APIRequestException) as post_api_exception:
            mock_request.method = 'POST'
            mock_request.data = other_params
            require_params(mock_request, required_params)

        assert post_api_exception.value.error_data == expected_error

        # Test misssing params GET
        with pytest.raises(APIRequestException) as get_api_exception:
            mock_request.method = 'GET'
            mock_request.GET = other_params
            require_params(mock_request, required_params)

        assert get_api_exception.value.error_data == expected_error

        # Test has all params POST
        mock_request.method = 'POST'
        mock_request.data = required_params_values
        require_params(mock_request, required_params)

        # Test has all params GET
        mock_request.method = 'GET'
        mock_request.GET = required_params_values
        require_params(mock_request, required_params)

    def api_exception_test_with(self, api_exception=None, error_text=str(uuid4()), error_code=str(uuid4()), error_data=str(uuid4()), status_code=status.HTTP_500_INTERNAL_SERVER_ERROR):
        class ExceptionTestState:
            def __init__(self, api_exception):
                self.api_exception = api_exception

            def assert_correct_response(self):
                expected_log_level = self.api_exception.error_code.log_level() if isinstance(
                    self.api_exception.error_code, ErrorCodes) else logging.ERROR
                response = self.api_exception.response()
                expected_result_code = getattr(
                    self.api_exception.error_code, 'value', self.api_exception.error_code) or status_code

                assert response.status_code is self.api_exception.status_code
                assert response.data.get(
                    'resultCode', False) == expected_result_code
                assert response.data.get(
                    'errorText', False) == self.api_exception.error_text
                assert response.data.get(
                    'errorData', False) == self.api_exception.error_data
                assert self.api_exception.log_level() is expected_log_level

                return self

            def assert_expected_class(self, expected_class):
                assert isinstance(self.api_exception, expected_class)

                return self

            def assert_correct_status_code(self, status_code):
                assert self.api_exception.status_code is status_code

                return self

        return ExceptionTestState(
            api_exception or APIException(
                error_text=error_text, error_code=error_code, error_data=error_data, status_code=status_code))

    def test_api_exception_string_error_code(self):
        self.api_exception_test_with().assert_correct_response()

    def test_api_exception_no_error_code(self):
        self.api_exception_test_with(error_code=None).assert_correct_response()

    def test_api_internal_exception(self):
        api_internal_exception = APIInternalException(
            str(uuid4()), str(uuid4()))
        self.api_exception_test_with(
            api_exception=api_internal_exception
        ).assert_correct_response(
        ).assert_expected_class(APIInternalException
                                ).assert_correct_status_code(status.HTTP_500_INTERNAL_SERVER_ERROR)

    def test_api_service_exception(self):
        api_service_exception = APIServiceException(
            str(uuid4()), str(uuid4()))
        self.api_exception_test_with(
            api_exception=api_service_exception
        ).assert_correct_response(
        ).assert_expected_class(APIServiceException
                                ).assert_correct_status_code(status.HTTP_503_SERVICE_UNAVAILABLE)

    def test_api_not_found_exception(self):
        api_not_found_exception = APINotFoundException(str(uuid4()))
        self.api_exception_test_with(
            api_exception=api_not_found_exception
        ).assert_correct_response(
        ).assert_expected_class(APINotFoundException
                                ).assert_correct_status_code(status.HTTP_404_NOT_FOUND)

    def test_api_forbidden_exception(self):
        api_forbidden_exception = APIForbiddenException(str(uuid4()))
        self.api_exception_test_with(
            api_exception=api_forbidden_exception
        ).assert_correct_response(
        ).assert_expected_class(APIForbiddenException
                                ).assert_correct_status_code(status.HTTP_403_FORBIDDEN)

    def test_api_not_authorized_exception(self):
        api_not_authorized_exception = APINotAuthorisedException(str(uuid4()))
        self.api_exception_test_with(
            api_exception=api_not_authorized_exception
        ).assert_correct_response(
        ).assert_expected_class(APINotAuthorisedException
                                ).assert_correct_status_code(status.HTTP_401_UNAUTHORIZED)

    def test_api_request_exception(self):
        api_request_exception = APIRequestException(
            str(uuid4()), str(uuid4()))
        self.api_exception_test_with(
            api_exception=api_request_exception
        ).assert_correct_response(
        ).assert_expected_class(APIRequestException
                                ).assert_correct_status_code(status.HTTP_400_BAD_REQUEST)

    def test_api_logic_exception(self):
        api_logic_exception = APILogicException(
            str(uuid4()), str(uuid4()))
        self.api_exception_test_with(
            api_exception=api_logic_exception
        ).assert_correct_response(
        ).assert_expected_class(APILogicException
                                ).assert_correct_status_code(status.HTTP_200_OK)

    def test_api_exception_info_levels(self):
        for error_code in info_level_errors:
            self.api_exception_test_with(
                error_code=error_code).assert_correct_response()

    def test_api_exception_warning_levels(self):
        for error_code in warning_level_errors:
            self.api_exception_test_with(
                error_code=error_code).assert_correct_response()

    def test_api_exception_error_levels(self):
        info_or_warning_errors = info_level_errors + warning_level_errors
        error_level_warnings = [
            error for error in ErrorCodes if error not in info_or_warning_errors]
        for error_code in error_level_warnings:
            self.api_exception_test_with(
                error_code=error_code).assert_correct_response()

    def test_validate_mediaserver_response(self, mocker):
        mock_response = mocker.MagicMock()
        mock_response.json.return_value = {
            'errorText': str(uuid4()),
            'resultCode': ErrorCodes.ok.value
        }
        mock_validator = mocker.MagicMock()
        mock_validator.return_value = mock_response
        mock_args = [str(uuid4()) for _ in range(7)]
        mock_kwargs = {key: str(uuid4()) for key in mock_args}

        validator = validate_mediaserver_response(mock_validator)

        # Test args correctly passed to validator function
        validator(*mock_args, **mock_kwargs)
        mock_validator.assert_called_once_with(*mock_args, **mock_kwargs)

        # Test 204
        mock_response.status_code = status.HTTP_204_NO_CONTENT
        assert validator() is None

        # Test cloud invalid response error
        mock_response.json.return_value = {str(uuid4()): str(uuid4())}
        mock_response.text = str(uuid4())
        for error_code in vms_errors:
            mock_response.status_code = error_code

            with pytest.raises(APIInternalException) as cloud_invalid_exception:
                validator()

            assert cloud_invalid_exception.value.error_text == 'No valid error message from gateway'
            assert cloud_invalid_exception.value.error_code is ErrorCodes.cloud_invalid_response

        # Test mediaserver response errors
        mock_response.json.side_effect = None
        for response_error in vms_errors:
            error_text = str(uuid4())
            result_code = ErrorCodes.ok.value
            mock_response.status_code = response_error
            mock_response.json.return_value = {
                'errorText': error_text,
                'resultCode': result_code
            }

            with pytest.raises(vms_errors[response_error]) as raised_error:
                validator()

            assert raised_error.value.error_text == error_text
            assert raised_error.value.error_code.value == result_code
            assert isinstance(raised_error.value, vms_errors[response_error])

    def test_validate_response(self, mocker):
        mock_response = mocker.MagicMock()
        mock_response.json.return_value = {
            'errorText': str(uuid4()),
            'resultCode': ErrorCodes.ok.value
        }
        mock_validator = mocker.MagicMock()
        mock_validator.return_value = mock_response
        mock_args = [str(uuid4()) for _ in range(7)]
        mock_kwargs = {key: str(uuid4()) for key in mock_args}

        validator = validate_response(mock_validator)

        # Test args correctly passed to validator function
        validator(*mock_args, **mock_kwargs)
        mock_validator.assert_called_once_with(*mock_args, **mock_kwargs)

        # Test 204
        mock_response.status_code = status.HTTP_204_NO_CONTENT
        assert validator() is None

        # Test cloud invalid response error
        with pytest.raises(APIInternalException) as cloud_invalid_exception:
            mock_response.json.side_effect = ValueError()
            mock_response.status_code = str(uuid4())
            mock_response.text = str(uuid4())
            validator()

        assert cloud_invalid_exception.value.error_text == f'No JSON data from cloud_db (code:{mock_response.status_code}) {mock_response.text}'
        assert cloud_invalid_exception.value.error_code is ErrorCodes.cloud_invalid_response

        # Test response errors
        mock_response.json.side_effect = None
        for response_error in response_errors:
            error_text = str(uuid4())
            result_code = ErrorCodes.ok.value
            mock_response.status_code = response_error
            mock_response.json.return_value = {
                'errorText': error_text,
                'resultCode': result_code
            }

            with pytest.raises(response_errors[response_error]) as raised_error:
                validator()

            assert raised_error.value.error_text == error_text
            assert raised_error.value.error_code.value == result_code
            assert isinstance(raised_error.value,
                              response_errors[response_error])

        # Test logic errors
        mock_response.json.side_effect = None
        for logic_error, ErrorClass in logic_errors.items():
            error_text = str(uuid4())
            result_code = logic_error
            mock_response.status_code = logic_error
            mock_response.json.return_value = {
                'errorText': error_text,
                'resultCode': result_code
            }
            with pytest.raises(ErrorClass) as raised_error:
                validator()

            assert raised_error.value.error_text == error_text
            assert raised_error.value.error_code == result_code or raised_error.value.error_code.value == result_code
            assert isinstance(raised_error.value, ErrorClass)

    def test_get_client_ip(self, mocker):
        forwarded_ip, remote_addr = str(uuid4()), False
        ip_addresses = {
            'HTTP_X_FORWARDED_FOR': forwarded_ip,
            'REMOTE_ADDR': remote_addr
        }
        mock_request = mocker.MagicMock()
        mock_request.META.get = lambda lookup: ip_addresses[lookup]

        # Test forwarded ip
        assert get_client_ip(mock_request) == forwarded_ip

        # Test remote addr
        forwarded_ip, remote_addr = remote_addr, forwarded_ip
        assert get_client_ip(mock_request) == remote_addr

    def test_clean_passwords(self):
        password = str(uuid4())
        password_fields = ['password',
                           'new_password', 'old_password', 'system']
        dict_to_clean = {key: {'authKey': password} if key ==
                         'system' else password for key in password_fields}
        clean_passwords(dict_to_clean)
        for field in dict_to_clean.values():
            updated_value = field['authKey'] if isinstance(
                field, dict) else field
            assert updated_value is not password

    def test_log_error(self, mocker):
        mock_data = {str(uuid4()): str(uuid4())}
        mock_page_url = str(uuid4())
        mock_user_email = str(uuid4())
        mock_ip = str(uuid4())
        mocker.patch('cloud.helpers.exceptions.get_client_ip',
                     return_value=mock_ip)
        mock_session_time = 0
        mock_exception = APIException(str(uuid4()), status.HTTP_404_NOT_FOUND)
        mock_log_level = mock_exception.log_level()
        mock_request = mocker.MagicMock()
        mock_request.build_absolute_uri.return_value = mock_page_url
        mock_request.data = mock_data
        mock_request.session = {
            'login': str(uuid4()),
        }
        mock_request.user.email = mock_user_email
        mock_request.is_mock_request = True

        expected_login_type = 'email and password'
        expected_error_message = f'{mock_exception.__class__.__name__}:{mock_exception.error_text}({mock_exception.error_code})\nUser: {mock_user_email} Login: {expected_login_type} Session Time: {mock_session_time} IP: {mock_ip}\n{mock_page_url} Request: {mock_data}'
        error_formatted = log_error(
            mock_request, mock_exception, mock_log_level)
        assert error_formatted.startswith(expected_error_message)

    def test_kill_session(self, mocker):
        mock_logout = mocker.patch('django.contrib.auth.logout')
        mock_request = mocker.MagicMock()
        session_keys = ['access_token', 'refresh_token', 'timezone', 'time']
        mock_request.session = {key: str(uuid4()) for key in session_keys}
        kill_session(mock_request)
        assert not mock_request.session
        mock_logout.assert_called_once_with(mock_request)

    def handler_test_with(self, mock_request, mock_exception, mock_log_error):
        expected_log_level = mock_exception.log_level() if hasattr(
            mock_exception, 'log_level') else logging.ERROR
        result = handler(mock_request, mock_exception)
        assert isinstance(result, Response)
        if hasattr(mock_exception, 'error_text'):
            assert result.data['errorText'] == mock_exception.error_text
        if hasattr(mock_exception, 'status_code'):
            assert result.status_code == mock_exception.status_code
        mock_log_error.assert_called_with(
            mock_request, mock_exception, expected_log_level)
        return result

    def test_handler(self, mocker):
        mock_log_error = mocker.patch('cloud.helpers.exceptions.log_error')
        mock_kill_session = mocker.patch(
            'cloud.helpers.exceptions.kill_session')
        mock_request = mocker.MagicMock()
        mock_request.session = {}

        # APINotAuthorisedException tests
        api_not_authorized = APINotAuthorisedException(str(uuid4()))

        # Test without session
        self.handler_test_with(
            mock_request, api_not_authorized, mock_log_error
        )

        mock_log_error.assert_called_once_with(
            mock_request, api_not_authorized, api_not_authorized.log_level())
        mock_kill_session.assert_not_called()

        # Test with session
        mock_request.session['login'] = str(uuid4())
        handler(mock_request, api_not_authorized)
        mock_kill_session.assert_called_once_with(mock_request)

        # Test APIException
        api_exception = APIException(str(uuid4()), status.HTTP_400_BAD_REQUEST)
        self.handler_test_with(mock_request, api_exception, mock_log_error)

        # Test other exception
        other_exception = Exception(str(uuid4()))
        response = self.handler_test_with(
            mock_request, other_exception, mock_log_error)
        assert response.data['errorText'] == 'Unexpected error somewhere inside'

    def test_handle_exceptions(self, mocker):
        mock_exception_handler = mocker.patch(
            'cloud.helpers.exceptions.handler')
        mock_response = str(uuid4())
        mock_decorated_function = mocker.MagicMock()
        mock_decorated_function.return_value = mock_response
        mock_args = [str(uuid4()) for _ in range(7)]
        mock_kwargs = {key: str(uuid4()) for key in mock_args}

        decorated_function = handle_exceptions(mock_decorated_function)

        # Test args correctly passed to decorated function
        response = decorated_function(*mock_args, **mock_kwargs)
        mock_decorated_function.assert_called_once_with(
            *mock_args, **mock_kwargs)
        mock_exception_handler.assert_not_called()

        # Test handling non Response or HttpResponseRedirect return values
        assert isinstance(response, Response)
        assert response.data == mock_response
        assert response.status_code == status.HTTP_200_OK

        # Test handling Response return values
        mock_data = str(uuid4())
        mock_response = Response(mock_data, status=status.HTTP_200_OK)
        mock_decorated_function.return_value = mock_response
        response = decorated_function(*mock_args, **mock_kwargs)
        assert response is mock_response

        # Test handling HttpResponseRedirect return values
        mock_data = str(uuid4())
        mock_response = HttpResponseRedirect(mock_data)
        mock_decorated_function.return_value = mock_response
        response = decorated_function(*mock_args, **mock_kwargs)
        assert response is mock_response

        # Test exception handling
        exception_to_raise = Exception()
        mock_decorated_function.side_effect = exception_to_raise
        decorated_function(*mock_args, **mock_kwargs)
        mock_exception_handler.assert_called_once_with(
            mock_args[0], exception_to_raise)

    @pytest.mark.asyncio
    async def test_exception_traceback_in_async_func(self, arf):
        exc_msg = "Raised unexpected exception"

        class TbTestException(Exception):
            pass

        async def raiser_func():
            raise TbTestException(exc_msg)

        @async_api_view(['GET'])
        async def view_func(req):
            return api_success(data=await raiser_func())

        request = arf.get('/')
        formatted_msg = ''
        try:
            await view_func(request)
        except Exception as ex:
            formatted_msg = log_error(request, error=ex, log_level=logging.DEBUG)

        assert formatted_msg.find('TbTestException') > 0
        assert formatted_msg.find(exc_msg) > 0
        assert formatted_msg.find('raiser_func') > 0
        assert formatted_msg.find('view_func') > 0


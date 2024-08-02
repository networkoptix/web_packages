from uuid import uuid4

import httpx
import pytest
from django.db import transaction
from drf_standardized_errors.types import ErrorType
from rest_framework.exceptions import (
    APIException,
    ErrorDetail,
    ValidationError,
)

from partners.models import ChannelPartner
from tools.exception import APIErrorWithoutRollback
from tools.helpers import (
    APIForwardException,
    custom_exception_handler,
    forward_cdb_resp,
)
from tools.helpers import settings as django_settings


class TestForwardCdbResp:

    @pytest.fixture(autouse=True)
    def setUp(self, mocker):
        self.url = f'https://testserver/{uuid4()}'
        self.data = {'message': f'{uuid4()}'}
        mocker.patch.object(django_settings, 'DEBUG', return_value=True)

    @property
    def response(self):
        return httpx.post(url=self.url)

    def test_response_200(self, httpx_mock):
        httpx_mock.add_response(url=self.url, json=self.data, status_code=200)
        response = forward_cdb_resp(self.response)
        assert response.status_code == 200
        assert response.data == self.data

    def test_response_400(self, httpx_mock):
        httpx_mock.add_response(url=self.url, json=self.data, status_code=400)
        response = forward_cdb_resp(self.response)
        assert response.status_code == 400
        assert response.data == self.data

    def test_empty_json_response(self, httpx_mock):
        httpx_mock.add_response(url=self.url, json=None, status_code=400)
        response = forward_cdb_resp(self.response)
        assert response.status_code == 400
        assert response.data == ''

    def test_test_response(self, httpx_mock, mocker):
        httpx_mock.add_response(url=self.url, content='some data', status_code=400)
        response = forward_cdb_resp(self.response)
        assert response.status_code == 400
        assert response.data == 'some data'

    def test_exception_200(self, httpx_mock):
        httpx_mock.add_response(url=self.url, json=self.data, status_code=200)
        try:
            response = forward_cdb_resp(self.response, via_exception=True)
        except APIForwardException as ex:
            assert ex.status_code == 200
            assert ex.detail == self.data
        else:
            raise AssertionError('Exception is not called')

    def test_exception_400(self, httpx_mock):
        httpx_mock.add_response(url=self.url, json=self.data, status_code=400)
        try:
            response = forward_cdb_resp(self.response, via_exception=True)
        except APIForwardException as ex:
            assert ex.status_code == 400
            assert ex.detail == self.data
        else:
            raise AssertionError('Exception is not called')


class TestCustomExceptionHandlerHelper:
    @pytest.fixture(autouse=True)
    def setup(self, arf, v3arf):
        self.request_v3 = v3arf.get('/')
        # self.request_v3.version = 'v3'
        self.context_v3 = {'request': self.request_v3}
        self.request_v2 = arf.get('/')
        # self.request_v2.version = 'v2'
        self.context_v2 = {'request': self.request_v2}

    def test_general_error_with_rollback_v3(self, channel_partner_factory):
        with transaction.atomic():
            cp_id = channel_partner_factory().id
            assert ChannelPartner.objects.filter(id=cp_id).exists()
            exc = APIException('Error with rollback', code='testCode')
            response = custom_exception_handler(exc, self.context_v3)
        assert not ChannelPartner.objects.filter(id=cp_id).exists()
        assert response.status_code == 500
        assert response.data == {
            'errors': [{'detail': 'Error with rollback', 'code': 'testCode', 'attr': None}],
            'type': ErrorType.SERVER_ERROR
        }

    def test_general_error_with_rollback_v2(self, channel_partner_factory):
        with transaction.atomic():
            cp_id = channel_partner_factory().id
            assert ChannelPartner.objects.filter(id=cp_id).exists()
            exc = APIException('Error with rollback', code='testCode')
            response = custom_exception_handler(exc, self.context_v2)
        assert not ChannelPartner.objects.filter(id=cp_id).exists()
        assert response.status_code == 500
        assert response.data == {'detail': ErrorDetail(string='Error with rollback', code='testCode')}

    def test_field_error_with_rollback_v3(self, channel_partner_factory):
        with transaction.atomic():
            cp_id = channel_partner_factory().id
            assert ChannelPartner.objects.filter(id=cp_id).exists()
            exc = ValidationError({'field_name': ['Error with rollback']}, code='testCode')
            response = custom_exception_handler(exc, self.context_v3)
        assert not ChannelPartner.objects.filter(id=cp_id).exists()
        assert response.status_code == 400
        assert response.data == {
            'errors': [{'detail': 'Error with rollback', 'code': 'testCode', 'attr': 'field_name'}],
            'type': ErrorType.VALIDATION_ERROR
        }

    def test_field_error_with_rollback_v2(self, channel_partner_factory):
        with transaction.atomic():
            cp_id = channel_partner_factory().id
            assert ChannelPartner.objects.filter(id=cp_id).exists()
            exc = ValidationError({'field_name': ['Error with rollback']}, code='testCode')
            response = custom_exception_handler(exc, self.context_v2)
        assert not ChannelPartner.objects.filter(id=cp_id).exists()
        assert response.status_code == 400
        assert response.data == {
            'field_name': [ErrorDetail(string='Error with rollback', code='testCode')]
        }

    def test_general_error_without_rollback_v3(self, channel_partner_factory):
        with transaction.atomic():
            cp_id = channel_partner_factory().id
            assert ChannelPartner.objects.filter(id=cp_id).exists()
            exc = APIErrorWithoutRollback('Error without rollback', code='testCode')
            response = custom_exception_handler(exc, self.context_v3)
        assert ChannelPartner.objects.filter(id=cp_id).exists()
        assert response.status_code == 500
        # Data must be passed as is. No additional fields must be added. Used for System auth only.
        assert response.data == {'detail': ErrorDetail(string='Error without rollback', code='testCode')}

    def test_general_error_without_rollback_v2(self, channel_partner_factory):
        with transaction.atomic():
            cp_id = channel_partner_factory().id
            assert ChannelPartner.objects.filter(id=cp_id).exists()
            exc = APIErrorWithoutRollback('Error without rollback', code='testCode')
            response = custom_exception_handler(exc, self.context_v2)
        assert ChannelPartner.objects.filter(id=cp_id).exists()
        assert response.status_code == 500
        assert response.data == {'detail': ErrorDetail(string='Error without rollback', code='testCode')}

    def test_api_forward_exception_v2(self):
        message = f'Error {uuid4()}'
        exc = APIForwardException(message, code='testCode')
        exc.status_code = 200
        response = custom_exception_handler(exc, self.context_v2)
        assert response.status_code == 200
        assert response.data == {'detail': ErrorDetail(string=message, code='testCode')}

    def test_api_forward_exception_v3(self):
        message = f'Error {uuid4()}'
        exc = APIForwardException(message, code='testCode')
        exc.status_code = 200
        response = custom_exception_handler(exc, self.context_v3)
        assert response.status_code == 200
        assert response.data == {'detail': ErrorDetail(string=message, code='testCode')}

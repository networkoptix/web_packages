import pytest
from rest_framework import status
from model_bakery import baker
from random import randint, choice

from cms.views.readonly_api import *


class TestReadOnlyAPIViews:
    @pytest.fixture(autouse=True)
    def setup(self, account_factory, mocker):
        self.quantity = randint(2, 10)
        self.user = account_factory(prepare_only=True)
        self.models = baker.prepare(ReadOnlyAPI, _quantity=self.quantity)
        for model_id, model in enumerate(self.models, 1):
            model.id = model_id

        def mock_get(id=None):
            try:
                return next(
                    model for model in self.models if model.id == id)
            except StopIteration:
                raise ReadOnlyAPI.DoesNotExist

        def mock_filter(type=None):
            return [model for model in self.models if model.type == type]

        mocker.patch.object(ReadOnlyAPI.objects, 'get', mock_get)
        mocker.patch.object(ReadOnlyAPI.objects, 'filter', mock_filter)
        mocker.patch.object(ReadOnlyAPI.objects, 'all', lambda: self.models)

    @pytest.mark.no_db
    def get_readonly_api(self, arf=None, user=None, json_id='', request_url=''):
        if not request_url:
            request_url = f'/api/readonly_apis/{json_id}'
        request = arf.get(request_url)
        request.session = {}
        request.user = user
        return get_readonly_api(request, json_id)

    def test_get_readonly_api_success(self, arf, db):
        json_id = choice(self.models).id
        response = self.get_readonly_api(
            arf=arf, user=self.user, json_id=json_id)

        versioned_url = response.url
        assert response.status_code == status.HTTP_302_FOUND

        response = self.get_readonly_api(arf=arf, user=self.user, json_id=json_id, request_url=versioned_url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data['id'] == json_id
        # Testing that the type is showing as human-readable string instead of integer
        assert response.data['type'] == 'VMS'
        assert 'files' in response.data

    @pytest.mark.no_db
    def test_get_readonly_api_no_id(self, arf):
        response = self.get_readonly_api(arf=arf, user=self.user)

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert response.data == API_NOT_FOUND

    @pytest.mark.no_db
    def test_get_readonly_api_invalid_id(self, arf):
        invalid_id = 61111111
        response = self.get_readonly_api(
            arf=arf, user=self.user, json_id=invalid_id)

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert response.data == API_NOT_FOUND

    def get_readonly_apis(self, arf=None, user=None, type=None):
        request_url = '/api/readonly_apis'
        if type:
            request_url = f'{request_url}?type={type}'
        request = arf.get(request_url)
        request.session = {}
        request.user = user
        return get_readonly_apis(request)

    @pytest.mark.no_db
    def test_get_readonly_apis_success(self, arf):
        response = self.get_readonly_apis(arf=arf, user=self.user)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['data']) == self.quantity

    @pytest.mark.no_db
    def test_get_readonly_apis_type(self, arf):
        response = self.get_readonly_apis(arf=arf, user=self.user, type='VMS')

        assert response.status_code == status.HTTP_200_OK
        # Only one type at the moment so quantity is the same, should update this test when more types are available
        assert len(response.data['data']) == self.quantity

    @pytest.mark.no_db
    def test_get_readonly_apis_type_does_not_exist(self, arf):
        response = self.get_readonly_apis(
            arf=arf, user=self.user, type='fake-type')

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert response.data == INVALID_API_TYPE

from uuid import uuid4
import responses
import pytest
from responses import matchers

from api.account_backend import BearerAuthentication
from cloud.controllers.cloud_api import auto_refresh_token, System
from cloud.helpers.exceptions import APINotAuthorisedException


class TestAutoRefreshToken:
    @pytest.fixture(autouse=True)
    def setup(self, superuser, default_customization, arf, default_customization_ctx,
              default_customization_host, mocker):
        self.superuser = superuser
        self.customization = default_customization
        self.request = arf.get('/')
        self.request.CUSTOMIZATION = self.customization
        self.system_get_url = f'https://{self.customization.host}/cdb/system/get'
        self.token_post_url = f'https://{self.customization.host}/cdb/oauth2/token'
        self.random_id = f'{uuid4()}'
        self.salt_idx = 0
        self.unauthorized_response = {
            "errorClass": "unauthorized",
            "errorDetail": "111",
            "errorText": "badUsername",
            "resultCode": "badUsername"
        }
        self.new_tokens = {
            "access_token": f'{uuid4()}',
            "refresh_token": f'{uuid4()}'
        }
        self.mock_kill_tokens = mocker.patch('cloud.controllers.cloud_api.kill_tokens', autospec=True)
        self.mock_kill_session = mocker.patch('cloud.controllers.cloud_api.kill_session', autospec=True)
        mocker.patch('cloud.controllers.cloud_api.salt_machine', new=self.salt)

    def salt(self):
        self.salt_idx += 1
        return f'{self.salt_idx}'

    def test_no_tokens(self):
        with pytest.raises(TypeError):
            System.get(self.request)

    @responses.activate
    def test_success_with_session_token(self, mocker):
        self.request.session = {'access_token': f'{uuid4()}'}
        data = {"value": f"{uuid4()}"}
        responses.add(
            responses.GET,
            self.system_get_url,
            json=data,
            status=200,
        )

        resp = System.get(self.request, system_id=self.random_id)
        assert resp == data

    @responses.activate
    def test_success_with_request_dict(self, mocker):
        self.request = {'access_token': f'{uuid4()}'}
        data = {"value": f"{uuid4()}"}
        responses.add(
            responses.GET,
            self.system_get_url,
            json=data,
            status=200,
        )

        resp = System.get(self.request, system_id=self.random_id)
        assert resp == data



    @responses.activate
    def test_success_with_bearer_token(self, mocker):
        self.request.auth = f'{uuid4()}'
        self.request._authenticator = BearerAuthentication()
        data = {"value": f"{uuid4()}"}
        responses.add(
            responses.GET,
            self.system_get_url,
            json=data,
            status=200,
        )

        resp = System.get(self.request, system_id=self.random_id)
        assert resp == data

    @responses.activate
    def test_refreshed_with_refresh_token(self, mocker):
        self.request.session = {'access_token': f'{uuid4()}', 'refresh_token': f'{uuid4()}'}
        data = {"value": f"{uuid4()}"}
        # First call. Salt 1
        responses.add(
            responses.GET,
            self.system_get_url,
            json=self.unauthorized_response,
            status=401,
            match=[matchers.query_param_matcher({'salt': '1', 'systemId': self.random_id})]
        )
        # Second call. Salt 2
        token_resp = responses.add(
            responses.POST,
            self.token_post_url,
            json=self.new_tokens,
            status=200,
        )
        # Third call. Salt 3
        systems_resp = responses.add(
            responses.GET,
            self.system_get_url,
            json=data,
            status=200,
            match=[matchers.query_param_matcher({'salt': '3', 'systemId': self.random_id})]
        )

        resp = System.get(self.request, system_id=self.random_id)
        assert resp == data
        assert self.request.session['access_token'] == self.new_tokens['access_token']
        assert self.request.session['refresh_token'] == self.new_tokens['refresh_token']
        assert token_resp.call_count == 1
        assert systems_resp.call_count == 1

    @responses.activate
    def test_expired_refresh_token(self, mocker):
        self.request.session = {'access_token': f'{uuid4()}', 'refresh_token': f'{uuid4()}'}
        data = {"value": f"{uuid4()}"}
        # First call. Salt 1
        responses.add(
            responses.GET,
            self.system_get_url,
            json=self.unauthorized_response,
            status=401,
            match=[matchers.query_param_matcher({'salt': '1', 'systemId': self.random_id})]
        )
        # Second call. Salt 2
        token_resp = responses.add(
            responses.POST,
            self.token_post_url,
            json=self.unauthorized_response,
            status=401,
        )
        # Third call. Salt 3
        systems_resp = responses.add(
            responses.GET,
            self.system_get_url,
            json=data,
            status=200,
            match=[matchers.query_param_matcher({'salt': '3', 'systemId': self.random_id})]
        )
        with pytest.raises(APINotAuthorisedException):
            resp = System.get(self.request, system_id=self.random_id)
        assert token_resp.call_count == 1
        assert systems_resp.call_count == 0
        self.mock_kill_tokens.assert_called_once()
        self.mock_kill_session.assert_called_once()

    @responses.activate
    def test_failed_no_refresh_token(self, mocker):
        self.request.session = {'access_token': f'{uuid4()}'}
        data = {"value": f"{uuid4()}"}
        # First call. Salt 1
        responses.add(
            responses.GET,
            self.system_get_url,
            json=self.unauthorized_response,
            status=401,
            match=[matchers.query_param_matcher({'salt': '1', 'systemId': self.random_id})]
        )
        # Second call. Salt 2
        token_resp = responses.add(
            responses.POST,
            self.token_post_url,
            json=self.new_tokens,
            status=200,
        )
        with pytest.raises(APINotAuthorisedException):
            resp = System.get(self.request, system_id=self.random_id)

        assert token_resp.call_count == 0

    @responses.activate
    def test_refresh_on_500(self, mocker):
        self.request.session = {'access_token': f'{uuid4()}', 'refresh_token': f'{uuid4()}'}
        data = {"value": f"{uuid4()}"}
        # First call. Salt 1
        responses.add(
            responses.GET,
            self.system_get_url,
            json={"some": "message"},
            status=500,
            match=[matchers.query_param_matcher({'salt': '1', 'systemId': self.random_id})]
        )
        # Second call. Salt 2
        token_resp = responses.add(
            responses.POST,
            self.token_post_url,
            json=self.new_tokens,
            status=200,
        )
        # Third call. Salt 3
        systems_resp = responses.add(
            responses.GET,
            self.system_get_url,
            json=data,
            status=200,
            match=[matchers.query_param_matcher({'salt': '3', 'systemId': self.random_id})]
        )

        resp = System.get(self.request, system_id=self.random_id)
        assert resp == data
        assert token_resp.call_count == 1
        assert systems_resp.call_count == 1
        assert self.request.session['access_token'] == self.new_tokens['access_token']
        assert self.request.session['refresh_token'] == self.new_tokens['refresh_token']

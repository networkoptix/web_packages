from hashlib import md5, sha256
import base64
import os
import random
import string
import logging

import requests
from requests.auth import HTTPBasicAuth
from django.conf import settings
from rest_framework.response import Response
from rest_framework import status

from api.helpers.exceptions import (validate_response, ErrorCodes, APIRequestException,
                                    APINotAuthorisedException, APINotFoundException)

logger = logging.getLogger(__name__)

CLOUD_DB_URL = settings.CLOUD_CONNECT['url']
CLOUD_STORAGE_URL = settings.CLOUD_STORAGE_URL
CLOUD_STORAGES_URL = settings.CLOUD_STORAGES_URL


def lower_case_email(func):
    def validator(email, *args, **kwargs):
        email = email.lower()
        return func(email, *args, **kwargs)
    return validator


def auto_refresh_token(func):
    def _wrapper(session, *args, **kwargs):
        access_token = session.get('access_token')
        refresh_token = session.get('refresh_token')
        kwargs['headers'] = {
            'Authorization': f'Bearer {access_token}'
        }
        try:
            res = func(session, *args, **kwargs)
            res.raise_for_status()
            return res
        except requests.exceptions.HTTPError as e:
            if not refresh_token:
                raise e
            tokens = Auth.get_refresh_token(refresh_token)
            access_token = tokens['access_token']
            session['access_token'] = access_token
            session['refresh_token'] = tokens['refresh_token']
            kwargs['headers'] = {
                'Authorization': f'Bearer {access_token}'
            }
            return func(session, *args, **kwargs)
    return _wrapper


class TempLogin:
    access_token = None
    refresh_token = None

    def __init__(self, email, password):
        """Turns credentials into temporary tokens"""
        tokens = Auth.get_token(email, password)
        self.access_token = tokens['access_token']
        self.refresh_token = tokens['refresh_token']

    def __exit__(self):
        """Deletes the tokens"""
        Auth.delete_token(self.access_token)
        Auth.delete_token(self.refresh_token)

    @classmethod
    def tokens(cls):
        """Returns the access and refresh tokens"""
        return {
            'access_token': cls.access_token,
            'refresh_token': cls.refresh_token
        }


def salt_machine(char_pool=string.ascii_lowercase + string.digits, size=15):
    return ''.join(random.choice(char_pool) for _ in range(size))


def delete_wrapper(url, auth=None, headers=None):
    default_params = {'salt': salt_machine()}
    logger.info(f'\nDELETE: {url}\n Query Parameters: {default_params}')

    return requests.delete(url, auth=auth, headers=headers)


def get_wrapper(url, params=None, auth=None, headers=None):
    default_params = {'salt': salt_machine()}

    if params:
        default_params.update(params)

    logger.info(f'\nGET: {url}\n Query Parameters: {default_params}')

    return requests.get(url, params=default_params, auth=auth, headers=headers)


def post_wrapper(url, params=None, auth=None, json=None, headers=None):
    default_params = {'salt': salt_machine()}

    if params:
        default_params.update(params)

    logger.info(f'\nPOST: {url}\nQuery Parameters: {default_params}\nJson: {json}')

    return requests.post(url, params=default_params, auth=auth, json=json, headers=headers)


def put_wrapper(url, params=None, auth=None, json=None, headers=None):
    default_params = {'salt': salt_machine()}

    if params:
        default_params.update(params)

    logger.info(f'\nPUT: {url}\nQuery Parameters: {default_params}\nJson: {json}')
    return requests.put(url, params=default_params, auth=auth, json=json, headers=headers)


@validate_response
def ping():
    url = CLOUD_DB_URL + "/ping"
    return get_wrapper(url)


class System(object):
    @staticmethod
    @validate_response
    @auto_refresh_token
    def list(session, one_customization=True, headers=None):
        params = {}
        if one_customization:
            params['customization'] = settings.CUSTOMIZATION

        return get_wrapper(f'{CLOUD_DB_URL}/system/get', params=params, headers=headers)

    @staticmethod
    @validate_response
    @auto_refresh_token
    def get(session, system_id, headers=None):
        params = {
            'systemId': system_id
        }
        return get_wrapper(f'{CLOUD_DB_URL}/system/get', params=params, headers=headers)

    @staticmethod
    @validate_response
    @auto_refresh_token
    def users(session, system_id, headers=None):
        params = {
            'systemId': system_id
        }
        return get_wrapper(f'{CLOUD_DB_URL}/system/getCloudUsers', params=params, headers=headers)

    @staticmethod
    @validate_response
    @auto_refresh_token
    def share(session, system_id, account_email, role, headers=None):
        account_email = account_email.lower()
        params = {
            'systemId': system_id,
            'accountEmail': account_email,
            'accessRole': role
        }
        return post_wrapper(f'{CLOUD_DB_URL}/system/share', json=params, headers=headers)

    @staticmethod
    @validate_response
    @auto_refresh_token
    def get_nonce(session, system_id, headers=None):
        params = {
            'systemId': system_id
        }
        return get_wrapper(f'{CLOUD_DB_URL}/auth/getNonce', params=params, headers=headers)

    @staticmethod
    @validate_response
    @auto_refresh_token
    def rename(session, system_id, system_name, headers=None):
        params = {
            'systemId': system_id,
            'name': system_name
        }
        return post_wrapper(f'{CLOUD_DB_URL}/system/rename', json=params, headers=headers)

    @staticmethod
    @validate_response
    @auto_refresh_token
    def access_roles(session, system_id, headers=None):
        params = {
            'systemId': system_id
        }
        return get_wrapper(f'{CLOUD_DB_URL}/system/getAccessRoleList', params=params, headers=headers)

    @staticmethod
    @validate_response
    @lower_case_email
    @auto_refresh_token
    def unbind(session, system_id, headers=None):
        params = {
            'systemId': system_id,
        }
        return post_wrapper(f'{CLOUD_DB_URL}/system/unbind', json=params, headers=headers)

    @staticmethod
    @validate_response
    @auto_refresh_token
    def bind(session, name, headers=None):
        customization = settings.CLOUD_CONNECT['customization']
        params = {
            'name': name,
            'customization': customization
        }
        return post_wrapper(f'{CLOUD_DB_URL}/system/bind', json=params, headers=headers)

    @staticmethod
    @validate_response
    @auto_refresh_token
    def merge(session, master_system_id, slave_system_id, headers=None):
        params = {
            'systemId': slave_system_id
        }
        return post_wrapper(f'{CLOUD_DB_URL}/system/{master_system_id}/merged_systems/', json=params, headers=headers)


class Account(object):
    @staticmethod
    def extract_temp_credentials(code):
        try:
            (temp_password, email) = base64.b64decode(code + "===").decode('utf-8').split(":")
        except TypeError:
            raise APIRequestException(f"Activation code has wrong structure - TypeError: {code}", ErrorCodes.wrong_code)
        except ValueError:
            raise APIRequestException(f"Activation code has wrong structure - ValueError: {code}", ErrorCodes.wrong_code)

        if not email or not temp_password:
            raise APIRequestException(f"Activation code has wrong structure - no email or temp_password: {code}",
                                      ErrorCodes.wrong_code)

        return temp_password, email

    @staticmethod
    @lower_case_email
    def encode_password(email, password):
        realm = settings.CLOUD_CONNECT['password_realm']
        password_string = ':'.join((email, realm, password)).encode('utf-8')
        password_ha1 = md5(password_string).hexdigest()
        password_ha1_sha256 = sha256(password_string).hexdigest()
        return password_ha1, password_ha1_sha256

    @staticmethod
    @lower_case_email
    def register(ip, email, password, first_name, last_name, code=None):
        logger.debug('cloud_api.Account.register: ' + email)

        headers = {
            'X-Forwarded-For': ip
        }

        @validate_response
        def _update(login, password, params):
            request = CLOUD_DB_URL + '/account/update'
            logger.debug('cloud_api.Account.register - making request: ' + request)
            return post_wrapper(request, json=params, auth=HTTPBasicAuth(login, password), headers=headers)

        @validate_response
        def _register(params):
            request = CLOUD_DB_URL + '/account/register'
            logger.debug('cloud_api.Account.register - making request: ' + request)
            return post_wrapper(request, json=params, headers=headers)

        customization = settings.CLOUD_CONNECT['customization']
        password_ha1, password_ha1_sha256 = Account.encode_password(email, password)

        params = {
            'email': email,
            'passwordHa1': password_ha1,
            'passwordHa1Sha256': password_ha1_sha256,
            'fullName': ' '.join((first_name, last_name)),
            'customization': customization
        }

        if not code:
            return _register(params)
        else:
            temp_password, code_email = Account.extract_temp_credentials(code)
            if email != code_email:
                raise APIRequestException('Activation code doesn\'t match email:' + code, ErrorCodes.wrong_code)

            try:
                data = _update(code_email, temp_password, params)
            except APINotAuthorisedException:
                raise APIRequestException('Activation code was already used', ErrorCodes.wrong_code)
            return data

    @staticmethod
    def restore_password(code, new_password):
        temp_password, email = Account.extract_temp_credentials(code)
        return Account.change_password(email, temp_password, new_password)

    @staticmethod
    @validate_response
    @lower_case_email
    @auto_refresh_token
    def change_password(session, email, new_password, headers=None):
        password_ha1, password_ha1_sha256 = Account.encode_password(email, new_password)
        params = {
            'passwordHa1': password_ha1,
            'passwordHa1Sha256': password_ha1_sha256
        }
        return post_wrapper(f'{CLOUD_DB_URL}/account/update', json=params, headers=headers)

    @staticmethod
    @validate_response
    @auto_refresh_token
    def create_temporary_credentials(session,
                                     credential_type=None, expiration_period=None,
                                     auto_prolongation_enabled=None, prolongation_period=None,
                                     headers=None):
        params = {}
        if credential_type:
            params['type'] = credential_type
        else:
            params['timeouts'] = {}
            if expiration_period:
                params['timeouts']['expirationPeriod'] = str(expiration_period)
            if auto_prolongation_enabled:
                params['timeouts']['autoProlongationEnabled'] = auto_prolongation_enabled
            if prolongation_period:
                params['timeouts']['prolongationPeriod'] = str(prolongation_period)

        return post_wrapper(f'{CLOUD_DB_URL}/account/createTemporaryCredentials', json=params, headers=headers)

    @staticmethod
    @validate_response
    @lower_case_email
    def reset_password(ip, email):
        params = {
            'email': email
        }
        headers = {
            'X-Forwarded-For': ip
        }
        return post_wrapper(f'{CLOUD_DB_URL}/account/resetPassword', json=params, headers=headers)

    @staticmethod
    @validate_response
    def activate(code):
        params = {
            'code': code
        }
        return post_wrapper(f'{CLOUD_DB_URL}/account/activate', json=params)

    @staticmethod
    @validate_response
    @lower_case_email
    def reactivate(email):
        params = {
            'email': email
        }
        return post_wrapper(f'{CLOUD_DB_URL}/account/reactivate', json=params)

    @staticmethod
    @validate_response
    @lower_case_email
    def delete(email, password):
        return delete_wrapper(f'{CLOUD_DB_URL}/account/self', auth=HTTPBasicAuth(email, password))

    @staticmethod
    @validate_response
    @auto_refresh_token
    def update(session, first_name, last_name, headers=None):
        params = {
            'fullName': ' '.join((first_name, last_name))
        }
        return post_wrapper(f'{CLOUD_DB_URL}/account/update', json=params, headers=headers)

    @staticmethod
    @validate_response
    @auto_refresh_token
    def get(session, ip=None, headers=None):
        # ip is not always provided here because of Zapier integration.
        # If someone fails to login to many times we don't want to block all requests from Zapier.
        if ip:
            headers['X-Forwarded-For'] = ip

        request = CLOUD_DB_URL + '/account/get'
        return get_wrapper(request, headers=headers)


class Storage(object):
    """
    Api calls to cloud storage service.
    Link to documentation on wiki:
    https://networkoptix.atlassian.net/wiki/spaces/PM/pages/751501328/Cloud+storage+service

    Storage object
    {
        "id": "storage_id_1",
        "totalSpace": dddddd, // bytes
        "region": "us-east-1",
        "ioDevice": {
        "type": "awss3",
        "url": "https://nx-cloud-storage.s3.amazonaws.com/{id}"
        },
        "systems": [
            // IDs of associated systems.
        ]
    }
    """
    @staticmethod
    @validate_response
    @auto_refresh_token
    def _delete(session, storage_id, headers=None):
        return delete_wrapper(f"{CLOUD_STORAGE_URL}/{storage_id}", headers=headers)

    @staticmethod
    @validate_response
    @auto_refresh_token
    def _merge(session, master_storage_id, slave_storage_id, headers=None):
        body = {
            "slaveStorageId": slave_storage_id
        }
        return put_wrapper(f"{CLOUD_STORAGE_URL}/{master_storage_id}/merged-storages/", json=body, headers=headers)

    @staticmethod
    @validate_response
    @auto_refresh_token
    def _move(session, system_id, storage_id, headers=None):
        body = {
            "id": system_id
        }
        return put_wrapper(f"{CLOUD_STORAGE_URL}/{storage_id}/systems/", json=body, headers=headers)

    @staticmethod
    @validate_response
    @lower_case_email
    @auto_refresh_token
    def _remove_from_system(session, system_id, storage_id, headers=None):
        return delete_wrapper(f"{CLOUD_STORAGE_URL}/{storage_id}/system/{system_id}", headers=headers)

    @staticmethod
    @validate_response
    @lower_case_email
    @auto_refresh_token
    def create(session, system_id, storage_size, headers=None):
        body = {
            "systems": [system_id],
            "totalSpace": storage_size
        }
        return put_wrapper(f"{CLOUD_STORAGES_URL}/", json=body, headers=headers)

    @staticmethod
    @validate_response
    @lower_case_email
    def delete_from_system(session, system_id):
        storages = Storage.list_system_storages(session, system_id)
        logger.debug(f"Delete storage for system.\t SystemId: {system_id}")
        for storage in storages:
            storage_id = storage.get('id')
            logger.debug(f"Removing storage: {storage_id} from the system {system_id}")
            Storage._remove_from_system(session, system_id, storage_id)
            Storage._delete(session, storage_id)
        return Response(None, status=status.HTTP_204_NO_CONTENT)

    @staticmethod
    @validate_response
    @lower_case_email
    @auto_refresh_token
    def list_system_storages(session, system_id, headers=None):
        params = {
            "system-id": system_id
        }
        return get_wrapper(f"{CLOUD_STORAGES_URL}/", params=params, headers=headers)

    @staticmethod
    @validate_response
    @lower_case_email
    @auto_refresh_token
    def list_cameras(session, storage_id, headers=None):
        return get_wrapper(f"{CLOUD_STORAGE_URL}/{storage_id}/cameras", headers=headers)

    @staticmethod
    @validate_response
    @lower_case_email
    def move(session, destination_system_id, source_system_id):
        try:
            source_storages = Storage.list_system_storages(session, source_system_id)
        except APINotFoundException:
            raise APIRequestException('Source System has no storages')

        try:
            destination_storages = Storage.list_system_storages(session, destination_system_id)
        except APINotFoundException:
            destination_storages = []

        if len(destination_storages) == 0:
            for storage in source_storages:
                storage_id = storage['id']
                Storage._remove_from_system(session, source_system_id, storage_id)
                Storage._move(session, destination_system_id, storage_id)

        else:
            destination_storage_id = destination_storages[0]['id']
            for storage in source_storages:
                storage_id = storage['id']
                Storage._remove_from_system(session, source_system_id, storage_id)
                Storage._merge(session, destination_storage_id, storage_id)
        return Response(None, status=status.HTTP_204_NO_CONTENT)

    @staticmethod
    @validate_response
    @lower_case_email
    @auto_refresh_token
    def statistics(session, storage_id, headers=None):
        return get_wrapper(f"{CLOUD_STORAGE_URL}/{storage_id}/statistics", headers=headers)


class Auth(object):
    # Using this for local development
    auth = HTTPBasicAuth(os.getenv('LOCAL_EMAIL'), os.getenv('LOCAL_PASSWORD'))

    @staticmethod
    @validate_response
    @lower_case_email
    def get_code(email, password, ip=None):
        headers = {}
        params = {
            "client_id": "cloud_portal",
            "grant_type": "password",
            "response_type": "code",
            "expiration_period": settings.AUTHENTICATED_SESSION_COOKIE_AGE,
            "prolongation_period": settings.AUTHENTICATED_SESSION_COOKIE_AGE,
            "username": email,
            "password": password
        }

        if ip:
            headers['X-Forwarded-For'] = ip

        return post_wrapper(f"{CLOUD_DB_URL}/oauth2/token", json=params, headers=headers, auth=Auth.auth)

    @staticmethod
    @validate_response
    @lower_case_email
    def get_token(email, password):
        params = {
            "client_id": "cloud_portal",
            "grant_type": "password",
            "response_type": "token",
            "expiration_period": settings.AUTHENTICATED_SESSION_COOKIE_AGE,
            "prolongation_period": settings.AUTHENTICATED_SESSION_COOKIE_AGE,
            "username": email,
            "password": password
        }
        return post_wrapper(f"{CLOUD_DB_URL}/oauth2/token", json=params, auth=Auth.auth)

    @staticmethod
    @validate_response
    def get_access_token(code):
        params = {
            "client_id": "cloud_portal",
            "grant_type": "authorization_code",
            "response_type": "token",
            "code": code
        }
        return post_wrapper(f"{CLOUD_DB_URL}/oauth2/token", json=params, auth=Auth.auth)

    @staticmethod
    @validate_response
    def get_refresh_token(refresh_token):
        params = {
            "grant_type": "refresh_token",
            "response_type": "token",
            "refresh_token": refresh_token
        }
        return post_wrapper(f"{CLOUD_DB_URL}/oauth2/token", json=params, auth=Auth.auth)

    @staticmethod
    @validate_response
    def validate_token(access_token):
        return get_wrapper(f"{CLOUD_DB_URL}/oauth2/token/{access_token}", auth=Auth.auth)

    @staticmethod
    @validate_response
    def delete_token(token):
        return delete_wrapper(f"{CLOUD_DB_URL}/oauth2/token/{token}", auth=Auth.auth)

    @staticmethod
    @validate_response
    def delete_users_tokens():
        # TODO: Update with params
        request = f"{CLOUD_DB_URL}/oauth2/user/self"
        return delete_wrapper(request, auth=Auth.auth)

    @staticmethod
    @validate_response
    def delete_users_tokens_by_client():
        # TODO: Update params
        request = f"{CLOUD_DB_URL}/oauth2/user/self/client/clientId"
        return delete_wrapper(request, auth=Auth.auth)

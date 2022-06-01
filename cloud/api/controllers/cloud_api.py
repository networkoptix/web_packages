from hashlib import md5, sha256
import base64
from functools import wraps
import random
import string
import logging

import requests
from requests.auth import HTTPBasicAuth, HTTPDigestAuth
from django.conf import settings
from rest_framework.response import Response
from rest_framework import status

from api.helpers.exceptions import (validate_response, ErrorCodes, APIRequestException,
                                    APINotAuthorisedException, APINotFoundException, get_client_ip,
                                    kill_session, kill_tokens)

logger = logging.getLogger(__name__)

CLOUD_DB_URL = settings.CLOUD_CONNECT['url']
CLOUD_STORAGE_URL = settings.CLOUD_STORAGE_URL
CLOUD_STORAGES_URL = settings.CLOUD_STORAGES_URL
CLOUD_2FA_URL = f"{CLOUD_DB_URL}/account/self/2fa"

MOBILE_CLIENT_TOKEN_LIFETIME_S = "15778800"  # 6 Months

INVALID_SESSION_ERRORS = [ErrorCodes.bad_username.value,
                          ErrorCodes.not_authorized.value,
                          ErrorCodes.not_found.value,
                          ErrorCodes.account_not_activated.value,
                          ErrorCodes.forbidden.value]


# Todo: Once cloud_db supports basic and digest switch to true.
def basic_digest_handler(use_basic_auth=True):
    """
        Tracks if basic or digest auth should be used.
        If the request fails the decorator will try the other auth type.
    """
    def outer_handler(func):
        def basic_auth_handler(email, password, *args, **kwargs):
            kwargs["auth"] = HTTPBasicAuth(email, password)
            return func(*args, **kwargs)

        def digest_auth_handler(email, password, *args, **kwargs):
            kwargs["auth"] = HTTPDigestAuth(email, password)
            return func(*args, **kwargs)

        def handler(*args, **kwargs):
            nonlocal use_basic_auth
            credentials = kwargs.get("auth")
            if not credentials:
                kwargs["auth"] = None
                return func(*args, **kwargs)

            email = credentials["email"]
            password = credentials["password"]
            res = None

            try:
                res = (basic_auth_handler if use_basic_auth else digest_auth_handler)(email, password, *args, **kwargs)
                res.raise_for_status()
                return res
            except requests.HTTPError:
                # If none that means we chose correctly for the auth type.
                if res is not None and not res.headers.get("WWW-Authenticate"):
                    return res
                use_basic_auth = not use_basic_auth
                return (basic_auth_handler if use_basic_auth else digest_auth_handler)(email, password, *args, **kwargs)
        return handler
    return outer_handler


def lower_case_email(func):
    def validator(email, *args, **kwargs):
        email = email.lower()
        return func(email, *args, **kwargs)
    return validator


def auto_refresh_token(no_refresh=False):
    def outer_wrapper(func):
        @wraps(func)
        def wrapper(request, *args, **kwargs):
            from api.account_backend import BearerAuthentication
            if isinstance(getattr(request, 'successful_authenticator', None), BearerAuthentication):
                access_token = request.auth
                refresh_token = None
            elif hasattr(request, "session"):
                access_token = request.session.get("access_token")
                refresh_token = request.session.get("refresh_token")
            elif type(request) is dict:
                access_token = request.get("access_token")
                refresh_token = request.get("refresh_token")
            else:
                raise TypeError("Arg request should be of type request or dict")

            ip = ""
            if hasattr(request, "META"):
                ip = get_client_ip(request)

            if "headers" not in kwargs or not kwargs["headers"]:
                kwargs["headers"] = {}

            if ip:
                kwargs["headers"].update({
                    "X-Forwarded-For": ip
                })

            if access_token:
                kwargs["headers"].update({
                    "Authorization": f"Bearer {access_token}"
                })
            res = None
            try:
                res = func(request, *args, **kwargs)
                res.raise_for_status()
                return res
            except requests.exceptions.HTTPError as e:
                response_data = None
                if res.headers.get('content-type') == 'application/json':
                    response_data = res.json()
                if not refresh_token:
                    if response_data and response_data["resultCode"] in INVALID_SESSION_ERRORS:
                        raise APINotAuthorisedException(response_data["errorText"], response_data["resultCode"])
                    else:
                        raise e
                elif no_refresh and response_data:
                    raise APINotAuthorisedException(response_data["errorText"], response_data["resultCode"])

            try:
                tokens = Auth.get_refresh_token(refresh_token, ip=ip)
                access_token = tokens["access_token"]
                if hasattr(request, "session"):
                    request.session["access_token"] = access_token
                    request.session["refresh_token"] = tokens["refresh_token"]

                kwargs["headers"] = {
                    "Authorization": f"Bearer {access_token}"
                }
                res = func(request, *args, **kwargs)
                res.raise_for_status()
                return res
            # Handles error for refreshing token.
            except (APINotAuthorisedException, APINotAuthorisedException, APINotAuthorisedException) as e:
                kill_tokens(request, Auth.delete_token_no_refresh)
                kill_session(request)
                raise e

            # Handles http error for wrapped request function.
            except requests.exceptions.HTTPError as e:
                response_data = None
                if res.headers.get('content-type') == 'application/json':
                    response_data = res.json()
                if response_data and response_data["resultCode"] in INVALID_SESSION_ERRORS:
                    kill_tokens(request, Auth.delete_token)
                    kill_session(request)
                    raise APINotAuthorisedException(response_data["errorText"], response_data["resultCode"])
                else:
                    raise e
        return wrapper

    if callable(no_refresh):
        return outer_wrapper(no_refresh)
    else:
        return outer_wrapper


class TempLogin:
    def __init__(self, email, password):
        """Turns credentials into temporary tokens"""
        tokens = Auth.get_token(email, password)
        self.access_token = tokens['access_token']
        self.refresh_token = tokens['refresh_token']
        if error := tokens.get('error'):
            raise APINotAuthorisedException(error, ErrorCodes.not_authorized.value)

    def __enter__(self):
        return self

    def __exit__(self, *args):
        """Deletes the tokens"""
        Auth.delete_token(self.tokens, self.refresh_token)
        Auth.delete_token(self.tokens, self.access_token)

    @property
    def tokens(self):
        """Returns the access and refresh tokens"""
        return {
            'access_token': self.access_token,
            'refresh_token': self.refresh_token
        }


class MakeTokenForSystem:
    def __init__(self, system_id, access_token, refresh_token):
        self.access_token = access_token
        self.refresh_token = refresh_token
        self.system_token = Auth.get_refresh_token(
            refresh_token, scope=f"cloudSystemId={system_id}").get('access_token')

    def __enter__(self):
        return self.system_token

    def __exit__(self, *args, **kwargs):
        Auth.delete_token(self.tokens, self.system_token)

    @property
    def tokens(self):
        """Returns the access and refresh tokens"""
        return {
            'access_token': self.access_token,
            'refresh_token': self.refresh_token
        }


class Grant:
    authorization_code = "authorization_code"
    password = "password"
    refresh_token = "refresh_token"


class ResponseType:
    code = "code"
    token = "token"


def salt_machine(char_pool=string.ascii_lowercase + string.digits, size=15):
    return ''.join(random.choice(char_pool) for _ in range(size))


@basic_digest_handler()
def delete_wrapper(url, auth=None, headers=None):
    default_params = {'salt': salt_machine()}
    logger.info(f'\nDELETE: {url}\n Query Parameters: {default_params}')

    return requests.delete(url, auth=auth, headers=headers)


@basic_digest_handler()
def get_wrapper(url, params=None, auth=None, headers=None):
    default_params = {'salt': salt_machine()}

    if params:
        default_params.update(params)

    logger.info(f'\nGET: {url}\n Query Parameters: {default_params}')

    return requests.get(url, params=default_params, auth=auth, headers=headers)


@basic_digest_handler()
def post_wrapper(url, params=None, auth=None, data=None, json=None, headers=None):
    default_params = {'salt': salt_machine()}

    if params:
        default_params.update(params)

    logger.info(f'\nPOST: {url}\nQuery Parameters: {default_params}\nJson: {json}\nData: {data}')

    return requests.post(url, params=default_params, auth=auth, data=data, json=json, headers=headers)


@basic_digest_handler()
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
    def get_request_url(endpoint=None, system_id=None):
        system_id_segment = f'{system_id}/' if system_id else ''
        if endpoint is None:
            return f'{CLOUD_DB_URL}/system/get'
        if endpoint == 'getNonce':
            return f'{CLOUD_DB_URL}/auth/getNonce'
        return f'{CLOUD_DB_URL}/system/{system_id_segment}{endpoint}'

    @staticmethod
    @validate_response
    @auto_refresh_token
    def list(request, email=None, password=None, one_customization=True, headers=None):
        """Backwards support for digest. Used by push notifications and zapier"""
        auth = None
        params = {}
        if one_customization:
            params['customization'] = settings.CUSTOMIZATION

        if email and password:
            auth = {"email": email, "password": password}

        return get_wrapper(System.get_request_url(), params=params, headers=headers, auth=auth)

    @staticmethod
    @validate_response
    @auto_refresh_token
    def get(request, system_id, headers=None):
        params = {
            'systemId': system_id
        }
        return get_wrapper(System.get_request_url(), params=params, headers=headers)

    @staticmethod
    @validate_response
    @lower_case_email
    def basic_get(email, password, system_id):

        params = {
            'systemId': system_id
        }
        return get_wrapper(System.get_request_url(), params=params, auth={'email': email, 'password': password})

    @staticmethod
    @validate_response
    @auto_refresh_token
    def users(request, system_id, headers=None):
        params = {
            'systemId': system_id
        }
        return get_wrapper(System.get_request_url('getCloudUsers'), params=params, headers=headers)

    @staticmethod
    @validate_response
    @lower_case_email
    def basic_users(email, password, system_id):
        params = {
            'systemId': system_id
        }
        return get_wrapper(System.get_request_url('getCloudUsers'), params=params, auth={'email': email, 'password': password})

    @staticmethod
    @validate_response
    @auto_refresh_token
    def share(request, system_id, account_email, role, headers=None):
        account_email = account_email.lower()
        params = {
            'systemId': system_id,
            'accountEmail': account_email,
            'accessRole': role
        }
        return post_wrapper(System.get_request_url('share'), json=params, headers=headers)

    @staticmethod
    @validate_response
    @auto_refresh_token
    def get_nonce(request, system_id, headers=None):
        params = {
            'systemId': system_id
        }
        return get_wrapper(System.get_request_url('getNonce'), params=params, headers=headers)

    @staticmethod
    @validate_response
    @auto_refresh_token
    def rename(request, system_id, system_name, headers=None):
        params = {
            'systemId': system_id,
            'name': system_name
        }
        return post_wrapper(System.get_request_url('rename'), json=params, headers=headers)

    @staticmethod
    @validate_response
    @auto_refresh_token
    def access_roles(request, system_id, headers=None):
        params = {
            'systemId': system_id
        }
        return get_wrapper(System.get_request_url('getAccessRoleList'), params=params, headers=headers)

    @staticmethod
    @validate_response
    @auto_refresh_token
    def unbind(request, system_id, headers=None):
        return delete_wrapper(f'{CLOUD_DB_URL}/system/{system_id}', headers=headers)

    @staticmethod
    @validate_response
    @auto_refresh_token
    def bind(request, name, headers=None):
        params = {
            'name': name,
            'customization': settings.CUSTOMIZATION
        }
        return post_wrapper(System.get_request_url('bind'), json=params, headers=headers)

    @staticmethod
    @validate_response
    @auto_refresh_token
    def merge(request, master_system_id, slave_system_id, email=None, password=None, headers=None):
        master_system = System.get(request, master_system_id).get('systems', [])[0]
        auth = None
        params = {
            "systemId": slave_system_id
        }

        if int(master_system.get('version', '')[0] or 0) > 4:
            if hasattr(request, "session"):
                refresh_token = request.session.get("refresh_token")
            else:
                refresh_token = request.get("refresh_token")
            master_token = Auth.get_refresh_token(
                refresh_token,
                scope=f"cloudSystemId={master_system_id}"
            ).get("access_token")
            slave_token = Auth.get_refresh_token(
                refresh_token,
                scope=f"cloudSystemId={slave_system_id}"
            ).get("access_token")
            params.update({
                "masterSystemAccessToken": master_token,
                "slaveSystemAccessToken": slave_token
            })
        else:
            headers = None
            auth = {"email": email, "password": password}
            params["password"] = password

        return post_wrapper(System.get_request_url("merged_systems/", master_system_id), json=params, headers=headers, auth=auth)

    @staticmethod
    @validate_response
    def validate_signature(system_id, signature, redirect_uri):
        data = {
            "signature": signature,
            "message": redirect_uri
        }
        return post_wrapper(f"{CLOUD_DB_URL}/system/{system_id}/signature/validate", json=data)

    @staticmethod
    @validate_response
    @auto_refresh_token(no_refresh=True)
    def update(request, system_id, mfa_code, require2fa, headers=None):
        data = {
            'system2faEnabled': require2fa,
            'mfaCode': mfa_code
        }
        return put_wrapper(f"{CLOUD_DB_URL}/system/{system_id}", json=data, headers=headers)


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
    def register(email, password, first_name, last_name, ip=None, code=None):
        logger.debug('cloud_api.Account.register: ' + email)

        headers = {
            'X-Forwarded-For': ip
        }

        @validate_response
        def _update(login, password, params):
            request = CLOUD_DB_URL + '/account/update'
            logger.debug('cloud_api.Account.register - making request: ' + request)
            return post_wrapper(request, json=params, auth={"email": login, "password": password}, headers=headers)

        @validate_response
        def _register(params):
            request = CLOUD_DB_URL + '/account/register'
            logger.debug('cloud_api.Account.register - making request: ' + request)
            return post_wrapper(request, json=params, headers=headers)

        password_ha1, password_ha1_sha256 = Account.encode_password(email, password)

        params = {
            'email': email,
            'passwordHa1': password_ha1,
            'passwordHa1Sha256': password_ha1_sha256,
            'fullName': ' '.join((first_name, last_name)),
            'customization': settings.CUSTOMIZATION
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
    def restore_password(code, new_password, verification_code=None, is_backup=False):
        temp_token, email = Account.extract_temp_credentials(code)
        if verification_code:
            if is_backup:
                Auth.verify_backup_code(verification_code, temp_token)
            else:
                Auth.verify_2fa_code(verification_code, temp_token)
        return Account.change_password({"access_token": temp_token}, email, temp_token, new_password)

    @staticmethod
    @validate_response
    @auto_refresh_token(no_refresh=True)
    def change_password(request, email, old_password, new_password, mfa_code=None, headers=None):
        email = email.lower()
        params = {
            'password': new_password,
            'currentPassword': old_password
        }

        if mfa_code:
            params['mfaCode'] = mfa_code

        auth = None
        if not headers:
            auth = {"email": email, "password": old_password}

        return put_wrapper(f'{CLOUD_DB_URL}/account/self', json=params, headers=headers, auth=auth)

    @staticmethod
    @validate_response
    @auto_refresh_token
    def create_temporary_credentials(request,
                                     credential_type=None, expiration_period=None,
                                     auto_prolongation_enabled=False, prolongation_period=None,
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
    def reset_password(email, ip):
        params = {
            'email': email,
            'customization': settings.CUSTOMIZATION
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
        return delete_wrapper(f'{CLOUD_DB_URL}/account/self', auth={"email": email, "password": password})

    @staticmethod
    @validate_response
    @auto_refresh_token
    def update(request, first_name, last_name, headers=None):
        params = {
            'fullName': ' '.join((first_name, last_name))
        }
        return post_wrapper(f'{CLOUD_DB_URL}/account/update', json=params, headers=headers)

    @staticmethod
    @validate_response
    @auto_refresh_token
    def get(request, email=None, password=None, headers=None):
        auth = None
        if email and password:
            auth = {"email": email, "password": password}
        return get_wrapper(f'{CLOUD_DB_URL}/account/get', headers=headers, auth=auth)

    @staticmethod
    @validate_response
    @auto_refresh_token
    def get_2fa_settings(request, headers=None):
        return get_wrapper(f"{CLOUD_DB_URL}/account/self/settings/security", headers=headers)

    @staticmethod
    @validate_response
    @auto_refresh_token(no_refresh=True)
    def update_2fa_settings(request, mfa_code, tfa_enabled, password=None, headers=None):
        data = {
            "account2faEnabled": tfa_enabled,
            "mfaCode": mfa_code
        }
        if password:
            data["password"] = password

        return put_wrapper(f"{CLOUD_DB_URL}/account/self/settings/security", json=data, headers=headers)


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

    # Endpoint constants

    MERGED_STORAGES_ENDPOINT = 'merged-storages/'
    SYSTEM_ENDPOINT = 'system'
    SYSTEMS_ENDPOINT = 'systems/'
    CAMERAS_ENDPOINT = 'cameras'
    STATISTICS_ENDPOINT = 'statistics'

    # Helpers
    @staticmethod
    def get_request_url(storage_id=None, endpoint=None, system_id=None, use_storages_endpoint=False):
        main_segment = f"{CLOUD_STORAGES_URL if use_storages_endpoint else CLOUD_STORAGE_URL}/"

        storage_segment = storage_id or ''

        # trailing slash optionally included on en
        endpoint_segment = f'/{endpoint}' if endpoint else ''
        system_segment = f'/{system_id}' if system_id else ''
        return f'{main_segment}{storage_segment}{endpoint_segment}{system_segment}'

    # Handlers
    @staticmethod
    @validate_response
    @auto_refresh_token
    def _delete(request, storage_id, headers=None):
        return delete_wrapper(Storage.get_request_url(storage_id), headers=headers)

    @staticmethod
    @validate_response
    @auto_refresh_token
    def _merge(request, master_storage_id, slave_storage_id, headers=None):
        body = {
            "slaveStorageId": slave_storage_id
        }
        return put_wrapper(Storage.get_request_url(master_storage_id, Storage.MERGED_STORAGES_ENDPOINT), json=body, headers=headers)

    @staticmethod
    @validate_response
    @auto_refresh_token
    def _move(request, system_id, storage_id, headers=None):
        body = {
            "id": system_id
        }
        return put_wrapper(Storage.get_request_url(storage_id, Storage.SYSTEMS_ENDPOINT), json=body, headers=headers)

    @staticmethod
    @validate_response
    @auto_refresh_token
    def _remove_from_system(request, system_id, storage_id, headers=None):
        return delete_wrapper(Storage.get_request_url(storage_id, Storage.SYSTEM_ENDPOINT, system_id), headers=headers)

    @staticmethod
    @validate_response
    @auto_refresh_token
    def create(request, system_id, storage_size, headers=None):
        body = {
            "systems": [system_id],
            "totalSpace": storage_size
        }
        return put_wrapper(Storage.get_request_url(use_storages_endpoint=True), json=body, headers=headers)

    @staticmethod
    @validate_response
    def delete_from_system(request, system_id):
        storages = Storage.list_system_storages(request, system_id)
        logger.debug(f"Delete storage for system.\t SystemId: {system_id}")
        for storage in storages:
            storage_id = storage.get('id')
            logger.debug(f"Removing storage: {storage_id} from the system {system_id}")
            Storage._remove_from_system(request, system_id, storage_id)
            Storage._delete(request, storage_id)
        return Response(None, status=status.HTTP_204_NO_CONTENT)

    @staticmethod
    @validate_response
    @auto_refresh_token
    def list_system_storages(request, system_id, headers=None):
        params = {
            "system-id": system_id
        }
        return get_wrapper(Storage.get_request_url(use_storages_endpoint=True), params=params, headers=headers)

    @staticmethod
    @validate_response
    @auto_refresh_token
    def list_cameras(request, storage_id, headers=None):
        return get_wrapper(Storage.get_request_url(storage_id, Storage.CAMERAS_ENDPOINT), headers=headers)

    @staticmethod
    @validate_response
    def move(request, destination_system_id, source_system_id):
        try:
            source_storages = Storage.list_system_storages(request, source_system_id)
        except APINotFoundException:
            raise APIRequestException('Source System has no storages', ErrorCodes.bad_request)

        try:
            destination_storages = Storage.list_system_storages(request, destination_system_id)
        except APINotFoundException:
            destination_storages = []

        if not destination_storages:
            for storage in source_storages:
                storage_id = storage['id']
                Storage._remove_from_system(request, source_system_id, storage_id)
                Storage._move(request, destination_system_id, storage_id)

        else:
            destination_storage_id = destination_storages[0]['id']
            for storage in source_storages:
                storage_id = storage['id']
                Storage._remove_from_system(request, source_system_id, storage_id)
                Storage._merge(request, destination_storage_id, storage_id)
        return Response(None, status=status.HTTP_204_NO_CONTENT)

    @staticmethod
    @validate_response
    @auto_refresh_token
    def statistics(request, storage_id, headers=None):
        return get_wrapper(Storage.get_request_url(storage_id, Storage.STATISTICS_ENDPOINT), headers=headers)


class Auth(object):
    CLIENT_ID = "cloud_portal"
    GRANT_TYPE = Grant
    RESPONSE_TYPE = ResponseType

    @staticmethod
    def get_token_helper():
        pass

    @staticmethod
    @validate_response
    @lower_case_email
    def get_code(email="", password="", client_id=CLIENT_ID, grant_type=GRANT_TYPE.password,
                 ip=None, redirect_uri="", refresh_token=None, scope=""):
        headers = {
            "X-Forwarded-For": ip
        }
        params = {
            "client_id": client_id,
            "grant_type": grant_type,
            "response_type": Auth.RESPONSE_TYPE.code
        }

        if redirect_uri:
            params["redirect_uri"] = redirect_uri

        if scope:
            params["scope"] = scope
        else:
            params["scope"] = f"{settings.CLOUD_PORTAL_URL} cloudSystemId=*"

        if grant_type == Auth.GRANT_TYPE.password:
            params.update({
                "username": email,
                "password": password
            })
        elif grant_type == Auth.GRANT_TYPE.refresh_token:
            params["refresh_token"] = refresh_token

        return post_wrapper(f"{CLOUD_DB_URL}/oauth2/token", json=params, headers=headers)

    @staticmethod
    @validate_response
    @lower_case_email
    def get_token(email, password, client_id=CLIENT_ID, ip=None):
        headers = {
            "X-Forwarded-For": ip
        }
        params = {
            "client_id": client_id,
            "grant_type": Auth.GRANT_TYPE.password,
            "response_type": Auth.RESPONSE_TYPE.token,
            "username": email,
            "password": password
        }
        return post_wrapper(f"{CLOUD_DB_URL}/oauth2/token", json=params, headers=headers)

    @staticmethod
    @validate_response
    def get_access_token(code, is_mobile=False, ip=None):
        headers = {
            "X-Forwarded-For": ip
        }
        params = {
            "grant_type": Auth.GRANT_TYPE.authorization_code,
            "response_type": Auth.RESPONSE_TYPE.token,
            "code": code
        }

        if is_mobile:
            params['refresh_token_lifetime'] = MOBILE_CLIENT_TOKEN_LIFETIME_S

        return post_wrapper(f"{CLOUD_DB_URL}/oauth2/token", json=params, headers=headers)

    @staticmethod
    @validate_response
    def get_refresh_token(refresh_token, ip=None, scope=None):
        headers = {
            "X-Forwarded-For": ip
        }
        params = {
            "grant_type": Auth.GRANT_TYPE.refresh_token,
            "response_type": Auth.RESPONSE_TYPE.token,
            "refresh_token": refresh_token
        }
        if scope:
            params["scope"] = scope

        return post_wrapper(f"{CLOUD_DB_URL}/oauth2/token", json=params, headers=headers)

    @staticmethod
    @validate_response
    def validate_token(access_token, session_access_token=None):
        headers = {"Authorization": f"Bearer {session_access_token or access_token}"}
        return get_wrapper(f"{CLOUD_DB_URL}/oauth2/token/{access_token}", headers=headers)

    @staticmethod
    @validate_response
    @auto_refresh_token
    def delete_token(request, token, headers=None):
        return delete_wrapper(f"{CLOUD_DB_URL}/oauth2/token/{token}", headers=headers)

    @staticmethod
    @validate_response
    def delete_token_no_refresh(request, token, headers=None):
        return delete_wrapper(f"{CLOUD_DB_URL}/oauth2/token/{token}", headers=headers)

    @staticmethod
    @validate_response
    @auto_refresh_token
    def delete_users_tokens(request, headers=None):
        request = f"{CLOUD_DB_URL}/oauth2/user/self"
        return delete_wrapper(request, headers=headers)

    @staticmethod
    @validate_response
    @auto_refresh_token
    def delete_users_tokens_by_client(request, client_id, headers=None):
        request = f"{CLOUD_DB_URL}/oauth2/user/self/client/{client_id}"
        return delete_wrapper(request, headers=headers)

    @staticmethod
    @validate_response
    @auto_refresh_token
    def register_client(request, description, name, redirect_uri, headers=None):
        params = {
            "description": description,
            "name": name,
            "redirect_uri": redirect_uri
        }
        return post_wrapper(f"{CLOUD_DB_URL}/oauth2/client/", json=params, headers=headers)

    @staticmethod
    @validate_response
    @auto_refresh_token
    def delete_backup_codes(request, codes=None, headers=None):
        if not codes:
            codes = ""
        return delete_wrapper(f"{CLOUD_2FA_URL}/backup-code/{codes}", headers=headers)

    @staticmethod
    @validate_response
    @auto_refresh_token
    def delete_2fa_key(request, headers=None):
        return delete_wrapper(f"{CLOUD_2FA_URL}/totp/key", headers=headers)

    @staticmethod
    @validate_response
    @auto_refresh_token
    def generate_2fa_key(request, headers=None):
        return post_wrapper(f"{CLOUD_2FA_URL}/totp/key", headers=headers)

    @staticmethod
    @validate_response
    @auto_refresh_token
    def generate_backup_code(request, count, headers=None):
        return post_wrapper(f"{CLOUD_2FA_URL}/backup-code/", json={"count": count}, headers=headers)

    @staticmethod
    @validate_response
    @auto_refresh_token
    def get_active_backup_codes(request, headers=None):
        return get_wrapper(f"{CLOUD_2FA_URL}/backup-code/", headers=headers)

    @staticmethod
    @validate_response
    def verify_2fa_code(temp_2fa_code, code):
        return get_wrapper(f"{CLOUD_2FA_URL}/totp/key/{temp_2fa_code}", params={'token': code})

    @staticmethod
    @validate_response
    def verify_backup_code(backup_code, code):
        return get_wrapper(f"{CLOUD_2FA_URL}/backup-code/{backup_code}", params={'token': code})

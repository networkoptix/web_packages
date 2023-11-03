import typing
from enum import Enum

import httpx

from .base_api import (
    _BaseAPI, ContextAPIMixin, NotUsedInRequest, NOT_USED_IN_REQUEST
)

from .base_auth import (
    AUTH_TYPES)


class CdbAPIModuleBase(ContextAPIMixin, _BaseAPI):

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)


class CdbAccountAPIBase(CdbAPIModuleBase):
    """
    Account API. /cdb/account
    """

    base_path = '/cdb/account'

    def register(
            self,
            email: str,
            password: str,
            customization: str,
            full_name: typing.Union[str, NotUsedInRequest, None] = NOT_USED_IN_REQUEST,
            headers: typing.Optional[dict] = None,
            **kwargs
    ) -> typing.Union[httpx.Response, typing.Awaitable[httpx.Response]]:
        """
        POST /cdb/account/register
        Registers new account, puts it into "non activated" state and sends email confirmation
        to the supplied email address.
        Args:
            email (str, required): user email
            password (str, required): user password
            customization (str, required): customization name
            full_name (str, optional): user full name
            headers (dict, optional): request headers dict
            **kwargs: request handler arguments

        Returns (httpx.Response): 200 {"code":""}

        """
        data = self.exclude_not_used(**dict(email=email, password=password,
                                            customization=customization, fullName=full_name))
        response = self.post('/register', json=data, headers=headers, **kwargs)
        return response

    def activate(
            self,
            code: str,
            headers: typing.Optional[dict] = None,
            **kwargs
    ) -> typing.Union[httpx.Response, typing.Awaitable[httpx.Response]]:
        """
        POST /cdb/account/activate
        Activate account using the activation link from email.
        Args:
            code (str, required): activation code
            headers (dict, optional): request headers dict
            **kwargs: request handler arguments

        Returns (httpx.Response): 200, {"email": "string"}
        """
        data = dict(code=code)
        response = self.post('/activate', json=data, headers=headers, **kwargs)
        return response

    def reactivate(
            self,
            email: str,
            headers: typing.Optional[dict] = None,
            **kwargs
    ) -> typing.Union[httpx.Response, typing.Awaitable[httpx.Response]]:
        """
        POST /cdb/account/reactivate
        Resend activation link via email.
        Args:
            email (str, required): eser email
            headers (dict, optional): request headers dict
            **kwargs: request handler arguments

        Returns (httpx.Response): 200, {"email": "string"}

        """
        data = dict(email=email)
        response = self.post('/reactivate', json=data, headers=headers, **kwargs)
        return response

    def reset_password(
            self,
            email: str,
            customization: typing.Optional[str] = None,
            headers: typing.Optional[dict] = None,
            **kwargs
    ) -> typing.Union[httpx.Response, typing.Awaitable[httpx.Response]]:
        """
        POST /cdb/account/resetPassword
        Creates a code for a password reset and sends it to the account email through the notification module.
        If request specifies customization, then it is used to prepare the email notification. If customization
        was not specified in the request, then account's customization is used.
        The password reset code is
        CODE = base64(access_token ":" account_email)
        The access token has scope sufficient to invoke 'PUT /cdb/account/self' which changes the password.
        If 2fa is enabled on the account, then the access code will have to be confirmed with 2FA before
        using it to change the password.
        Args:
            email (str, required): user email
            customization (str, optional): customization name
            headers (dict, optional): request headers dict
            **kwargs: request handler arguments

        Returns (httpx.Response): 200, {"code": ""}

        """
        data = dict(email=email)
        if customization:
            data.update(customization=customization)
        response = self.post('/resetPassword', json=data, headers=headers, **kwargs)
        return response

    def status(
            self, email: str,
            headers: typing.Optional[dict] = None,
            **kwargs
    ) -> typing.Union[httpx.Response, typing.Awaitable[httpx.Response]]:
        """
        GET /cdb/account/{email}/status
        Fetch account status. Statuses: invalid, awaitingEmailConfirmation, activated, blocked, invited.
        Args:
            email (str, required): user email
            headers (dict, optional): request headers dict
            **kwargs: request handler arguments

        Returns (httpx.Response): 200, {"statusCode": "activated"}

        """
        return self.get(f'/{email}/status', headers=headers, **kwargs)

    def sharing_data(
            self,
            email: str,
            nonce: typing.Optional[str] = None,
            headers: typing.Optional[dict] = None,
            **kwargs
    ) -> typing.Union[httpx.Response, typing.Awaitable[httpx.Response]]:
        # Todo. Left upon systems and auth is not ready
        return self.get(f'/{email}/sharing-data', headers=headers, **kwargs)

    def create_temporary_credentials(
            self,
            cred_type: typing.Optional[typing.Literal["short", "long"]] = None,
            expiration_period: int = 0,
            auto_prolongation_enabled: bool = True,
            prolongation_period: int = 0,
            headers: typing.Optional[dict] = None,
            auth: AUTH_TYPES.BASIC_BEARER = NOT_USED_IN_REQUEST,
            **kwargs
    ) -> typing.Union[httpx.Response, typing.Awaitable[httpx.Response]]:
        """
        POST /cdb/account/createTemporaryCredentials
        Create temporary credentials that can be used instead of the account
        credentials which are used to authenticate this request. Note: this
        request is supported for account only.
        Used withing one of cred_type or period/prolongation options.
        Args:
            cred_type (str, optional): credentials types: 'short'|'long'
            expiration_period (int, optional): expiration period in seconds. default: 0.
            auto_prolongation_enabled (bool, optional): enable prolongation. default: true
            prolongation_period (int, optional): prolongation period. default: 0
            auth (Union[httpx.BasicAuth, BearerTokenAuth, RequestedTokenAuth], optional): authentication
            headers (dict, optional): request headers dict
            **kwargs: request handler arguments

        Returns (httpx.Response):
        200
        {
            "login": "",
            "password": "",
            "timeouts": {
                "expirationPeriod": "3600",
                "autoProlongationEnabled": true,
                "prolongationPeriod": "600"
            }
        }
        """
        if cred_type:
            data = {"type": cred_type}
        else:
            data = {
                "timeouts": {
                    "expirationPeriod": expiration_period,
                    "autoProlongationEnabled": auto_prolongation_enabled,
                    "prolongationPeriod": prolongation_period
                }
            }
        return self.post('/createTemporaryCredentials', json=data, auth=auth, headers=headers, **kwargs)

    def fetch_account(
            self,
            headers: typing.Optional[dict] = None,
            auth: AUTH_TYPES.BASIC_BEARER = NOT_USED_IN_REQUEST,
            **kwargs
    ) -> typing.Union[httpx.Response, typing.Awaitable[httpx.Response]]:
        """
        GET /cdb/account/self
        Fetch account attributes. The account is found by credentials/token
        that were used to authorize the API call.
        Args:
            auth (Union[httpx.BasicAuth, BearerTokenAuth, RequestedTokenAuth], optional): authentication
            headers (dict, optional): request headers dict
            **kwargs: request handler arguments

        Returns (httpx.Response):
        200
        {
          "id": "string",
          "email": "string",
          "passwordHashes": "string",
          "fullName": "string",
          "customization": "string",
          "statusCode": "invalid",
          "registrationTime": "string",
          "activationTime": "string",
          "httpDigestAuthEnabled": true,
          "account2faEnabled": true,
          "authSessionLifetime": "string"
        }
        """
        return self.get('/self', auth=auth, headers=headers, **kwargs)

    def update_account(
            self,
            password: typing.Union[str, NotUsedInRequest, None] = NOT_USED_IN_REQUEST,
            current_password: typing.Union[str, NotUsedInRequest, None] = NOT_USED_IN_REQUEST,
            full_name: typing.Union[str, NotUsedInRequest, None] = NOT_USED_IN_REQUEST,
            customization: typing.Union[str, NotUsedInRequest, None] = NOT_USED_IN_REQUEST,
            mfa_code: typing.Union[str, NotUsedInRequest, None] = NOT_USED_IN_REQUEST,
            headers: typing.Optional[dict] = None,
            auth: AUTH_TYPES.ALL = NOT_USED_IN_REQUEST,
            **kwargs
    ) -> typing.Union[httpx.Response, typing.Awaitable[httpx.Response]]:
        """
        PUT /cdb/account/self
        Update account properties. The account is found by credentials/token
        that were used to authorize the API call.
        Args:
            password (str, optional):
            current_password (str, optional):
            full_name (str, optional):
            customization (str, optional):
            mfa_code (str, optional):
            auth (Union[httpx.BasicAuth, BearerTokenAuth, RequestedTokenAuth], optional): authentication
            headers (dict, optional): request headers dict
            **kwargs: request handler arguments

        Returns (httpx.Response):
        200
        {
          "id": "string",
          "email": "string",
          "passwordHashes": "string",
          "fullName": "string",
          "customization": "string",
          "statusCode": "invalid",
          "registrationTime": "string",
          "activationTime": "string",
          "httpDigestAuthEnabled": true,
          "account2faEnabled": true,
          "authSessionLifetime": "string"
        }
        """
        data = self.exclude_not_used(**{
            "password": password,
            "currentPassword": current_password,
            "fullName": full_name,
            "customization": customization,
            "mfaCode": mfa_code
        })
        return self.put('/self', json=data, auth=auth, headers=headers, **kwargs)

    def delete_account(
            self,
            headers: typing.Optional[dict] = None,
            auth: AUTH_TYPES.ALL = None,
            **kwargs
    ) -> typing.Union[httpx.Response, typing.Awaitable[httpx.Response]]:
        """
        DELETE /cdb/account/self
        Delete account. The account to delete is found by credentials that were used to authorize the API call.
        Notes:
        - If the account owns at least one system, then this request fails with "403 Forbidden".
        - If the account has access to other systems, it is removed from those systems.
        Args:
            auth (Union[httpx.BasicAuth, BearerTokenAuth, RequestedTokenAuth], optional): authentication
            headers (dict, optional): request headers dict
            **kwargs: request handler arguments

        Returns (httpx.Response): 200, {"code": ""}

        """
        return self.delete('/self', auth=auth, headers=headers, **kwargs)

    def fetch_security_settings(
            self,
            headers: typing.Optional[dict] = None,
            auth: AUTH_TYPES.ALL = None,
            **kwargs
    ) -> typing.Union[httpx.Response, typing.Awaitable[httpx.Response]]:
        """
        GET /cdb/account/self/settings/security
        The account is detected by credentials/tokens used to authorize the request.
        Args:
            auth (Union[httpx.BasicAuth, BearerTokenAuth, RequestedTokenAuth], optional): authentication
            headers (dict, optional): request headers dict
            **kwargs: request handler arguments

        Returns (httpx.Response):
        200,
        {
            "httpDigestAuthEnabled": true,
            "account2faEnabled": true,
            "mfaCode": "string",
            "password": "string",
            "totpExistsForAccount": true,
            "authSessionLifetime": "string"
        }

        """
        return self.get('/self/settings/security', auth=auth, headers=headers, **kwargs)

    def update_security_settings(
            self,
            password: str,
            http_digest_auth_enabled: typing.Union[bool, NotUsedInRequest] = NOT_USED_IN_REQUEST,
            account_2fa_enabled: typing.Union[bool, NotUsedInRequest] = NOT_USED_IN_REQUEST,
            totp_exists_for_account: typing.Union[bool, NotUsedInRequest] = NOT_USED_IN_REQUEST,
            mfa_code: typing.Union[str, NotUsedInRequest, None] = NOT_USED_IN_REQUEST,
            auth_session_lifetime: typing.Union[int, NotUsedInRequest, None] = NOT_USED_IN_REQUEST,
            headers: typing.Optional[dict] = None,
            auth: AUTH_TYPES.BASIC_BEARER = None,
            **kwargs
    ) -> typing.Union[httpx.Response, typing.Awaitable[httpx.Response]]:
        """
        PUT /cdb/account/self/settings/security
        Update account's security settings (e.g., enable/disable 2FA and/or HTTP Digest authentication).
        The account is detected by credentials/tokens used to authorize the request. Note that this request
        MUST always be confirmed by valid account password passed in the request body.
        Note: to enable/disable 2FA, secret 2FA key MUST be generated prior with
        /cdb/account/self/2fa/totp/key API call.
        Note: If an OAUTH token is used to authorize this request, then this token
        is marked as 2fa-validated on success.
        Args:
            password (str, required): Account password. Always required except updating 2fa settings.
            http_digest_auth_enabled (bool, optional): Enable/disable HTTP Digest authentication for the account.
            account_2fa_enabled (bool, optional): Enable/disable two-factor authentication for the account.
            totp_exists_for_account (bool, optional): Only used in get requests. True if a totp key was generated for the account.
            mfa_code (str, optional): One-time password from the authenicator app. Required and MUST be valid if account2faEnabled is specified.
            auth_session_lifetime (int, optional): Maximum authentication session lifetime.
            auth (Union[httpx.BasicAuth, BearerTokenAuth, RequestedTokenAuth], optional): authentication
            headers (dict, optional): request headers dict
            **kwargs: request handler arguments

        Returns (httpx.Response):

        """
        data = self.exclude_not_used(**{
            "httpDigestAuthEnabled": http_digest_auth_enabled,
            "account2faEnabled": account_2fa_enabled,
            "mfaCode": mfa_code,
            "password": password,
            "totpExistsForAccount": totp_exists_for_account,
            "authSessionLifetime": auth_session_lifetime
        })
        return self.put('/self/settings/security', json=data, auth=auth, headers=headers, **kwargs)


class AccessRole(str, Enum):
    none = "none"
    disabled = "disabled"
    custom = "custom"
    liveViewer = "liveViewer"
    viewer = "viewer"
    advancedViewer = "advancedViewer"
    localAdmin = "localAdmin"
    cloudAdmin = "cloudAdmin"
    maintenance = "maintenance"
    owner = "owner"
    system = "system"


class CustomAttribute(typing.TypedDict):
    name: str
    value: str


class BatchRequestItem(typing.TypedDict):
    users: typing.List[str]
    systems: typing.List[str]
    accessRole: str
    attributes: dict


class BatchRequestItems(typing.TypedDict):
    items: typing.List[BatchRequestItem]


class CdbSystemAPIBase(CdbAPIModuleBase):

    base_path = '/cdb/systems'

    def get_systems(
            self,
            customization: typing.Union[str, NotUsedInRequest, None] = NOT_USED_IN_REQUEST,
            system_status: typing.Union[str, NotUsedInRequest, None] = NOT_USED_IN_REQUEST,
            headers: typing.Optional[dict] = None,
            auth: AUTH_TYPES.BASIC_BEARER = None,
            **kwargs
    ) -> typing.Union[httpx.Response, typing.Awaitable[httpx.Response]]:
        """
        GET /cdb/systems
        Fetch list of systems matching the filter specified.
        All query parameters are optional. If none specified, then all account's
        systems in status "activated" and "beingMerged" are reported.
        Args:
            customization (str, optional): The customization name to filter response
            system_status (str, optional): System status to filter response
            auth (Union[httpx.BasicAuth, BearerTokenAuth, RequestedTokenAuth], optional): authentication
            headers (dict, optional): request headers dict
            **kwargs: request handler arguments

        Returns:

        """
        query = self.exclude_not_used(**{
            "customization": customization,
            "systemStatus": system_status
        })
        params = kwargs.pop('params', {})
        params.update(query)
        return self.get('', params=params, auth=auth, headers=headers, **kwargs)

    def get_system(
            self,
            system_id: str,
            headers: typing.Optional[dict] = None,
            auth: AUTH_TYPES.BASIC_BEARER = None,
            **kwargs
    ) -> typing.Union[httpx.Response, typing.Awaitable[httpx.Response]]:
        """
        GET /cdb/systems/{systemId}
        Fetch system attributes and settings.
        Args:
            system_id (str, required): System id
            auth (Union[httpx.BasicAuth, BearerTokenAuth, RequestedTokenAuth], optional): authentication
            headers (dict, optional): request headers dict
            **kwargs: request handler arguments

        Returns:

        """
        return self.get(f'/{system_id}', auth=auth, headers=headers, **kwargs)

    def bind(
            self,
            name: str,
            customization: str,
            opaque: str,
            headers: typing.Optional[dict] = None,
            auth: AUTH_TYPES.BASIC_BEARER = None,
            **kwargs
    ) -> typing.Union[httpx.Response, typing.Awaitable[httpx.Response]]:
        """
        POST /cdb/systems/bind
        Register a new system.
        The cloud account that issued this request is set as the system owner.
        id and authKey attributes from the response must be reported to the
        VMS system which will use them to interact with the Cloud.
        Warning: The authKey is reported by this API only.
        Args:
            name (str, required): System name, non-unique.
            customization (str, required): Customization name
            opaque (str, required): Vms-specific data. Transparently stored and returned.
            auth (Union[httpx.BasicAuth, BearerTokenAuth, RequestedTokenAuth], optional): authentication
            headers (dict, optional): request headers dict
            **kwargs: request handler arguments

        Returns:

        """
        data = {
            "name": name,
            "customization": customization,
            "opaque": opaque
        }
        return self.post("/bind", json=data, headers=headers, auth=auth, **kwargs)

    def update_system(
            self,
            system_id: str,
            name: typing.Union[str, NotUsedInRequest, None] = NOT_USED_IN_REQUEST,
            opaque: typing.Union[str, NotUsedInRequest, None] = NOT_USED_IN_REQUEST,
            system_2fa_enabled: typing.Union[bool, NotUsedInRequest] = NOT_USED_IN_REQUEST,
            mfa_code: typing.Union[str, NotUsedInRequest, None] = NOT_USED_IN_REQUEST,
            headers: typing.Optional[dict] = None,
            auth: AUTH_TYPES.BASIC_BEARER = None,
            **kwargs
    ) -> typing.Union[httpx.Response, typing.Awaitable[httpx.Response]]:
        """
        PUT /cdb/systems/{systemId}
        Update some system attributes/settings.
        system2faEnabled can be set to true only if the owner account has 2fa configured.
        Args:
            system_id (str, required): System ID
            name (str, optional): System name
            opaque (str, optional): Vms-specific data. Transparently stored and returned.
            system_2fa_enabled (str, optional): If set to true, then cloud users wil be asked to enter 2FA code when logging into this system.
            mfa_code (str, optional): One-time password from the authenicator app. Required and MUST be valid if changing system2faEnabled setting
            auth (Union[httpx.BasicAuth, BearerTokenAuth, RequestedTokenAuth], optional): authentication
            headers (dict, optional): request headers dict
            **kwargs: request handler arguments

        Returns:

        """
        data = self.exclude_not_used(**{
            "name": name,
            "opaque": opaque,
            "system_2fa_enabled": system_2fa_enabled,
            "mfa_code": mfa_code,
        })
        return self.put(f"/{system_id}", json=data, headers=headers, auth=auth, **kwargs)

    def delete_system(
            self,
            system_id: str,
            headers: typing.Optional[dict] = None,
            auth: AUTH_TYPES.BASIC_BEARER = None,
            **kwargs
    ) -> typing.Union[httpx.Response, typing.Awaitable[httpx.Response]]:
        """
        DELETE /cdb/systems/{systemId}
        The system is not removed immediately, but its status is set to "deleted".
        While in the "deleted" state, any API request that uses the system credentials
        (id/authKey) receives "credentialsRemovedPermanently" result code. It is used
        by VMS server to update its cloud binding status properly.
        Args:
            system_id (str, required): System ID
            auth (Union[httpx.BasicAuth, BearerTokenAuth, RequestedTokenAuth], optional): authentication
            headers (dict, optional): request headers dict
            **kwargs: request handler arguments

        Returns:

        """
        return self.delete(f"/{system_id}", headers=headers, auth=auth, **kwargs)

    def get_cloud_users(
            self,
            system_id: str,
            headers: typing.Optional[dict] = None,
            auth: AUTH_TYPES.BASIC_BEARER = None,
            **kwargs
    ) -> typing.Union[httpx.Response, typing.Awaitable[httpx.Response]]:
        """
        GET /cdb/systems/{systemId}/users
        Args:
           system_id (str, required): System ID
           auth (Union[httpx.BasicAuth, BearerTokenAuth, RequestedTokenAuth], optional): authentication
           headers (dict, optional): request headers dict
           **kwargs: request handler arguments

        Returns:

        """
        return self.get(f'/{system_id}/users', headers=headers, auth=auth, **kwargs)

    def share_system(
            self,
            system_id: str,
            user_email: str,
            access_role: str,
            user_role: str,
            is_enabled: bool,
            custom_permissions: typing.Union[str, None, NotUsedInRequest] = NOT_USED_IN_REQUEST,
            vms_user_id: typing.Union[str, None, NotUsedInRequest] = NOT_USED_IN_REQUEST,
            send_notification: typing.Union[bool, NotUsedInRequest] = NOT_USED_IN_REQUEST,
            headers: typing.Optional[dict] = None,
            auth: AUTH_TYPES.BASIC_BEARER = None,
            params: typing.Optional[dict] = None,
            **kwargs
    ) -> typing.Union[httpx.Response, typing.Awaitable[httpx.Response]]:
        """
        POST /cdb/systems/{systemId}/users
        Share system with an account. If account does not exist, it is created in non-activated state.
        Args:
            system_id (str, required): System ID
            user_email (str, required): The account to share the system with.
            access_role (str, required): System access role to give to the account.
            user_role (str, required): VMS-specific user role ID. For the cloud this is an opaque string that is sent to the VMS server when adding user.
            is_enabled (bool, required):
            custom_permissions (str, optional): VMS-specific permissions. For the cloud this is an opaque string that is sent to the VMS server when adding user.
            vms_user_id (str, optional):
            send_notification (bool, optional): Regulates whether an appropriate notification is sent to the user. Default is True
            params (dict, optional):
            auth (Union[httpx.BasicAuth, BearerTokenAuth, RequestedTokenAuth], optional): authentication
            headers (dict, optional): request headers dict
            **kwargs: request handler arguments

        Returns:

        """
        data = self.exclude_not_used(**{
            "accountEmail": user_email,
            "accessRole": access_role,
            "userRoleId": user_role,
            "customPermissions": custom_permissions,
            "isEnabled": is_enabled,
            "vmsUserId": vms_user_id
        })
        if not isinstance(send_notification, NotUsedInRequest):
            params = params or {}
            params.update(sendNotification=send_notification)
        return self.post(f'/{system_id}/users', json=data, headers=headers, auth=auth, params=params, **kwargs)

    def stop_sharing_system(
            self,
            system_id: str,
            user_email: str,
            headers: typing.Optional[dict] = None,
            auth: AUTH_TYPES.BASIC_BEARER = None,
            **kwargs
    ) -> typing.Union[httpx.Response, typing.Awaitable[httpx.Response]]:
        """
        DELETE /cdb/systems/{systemId}/users/{email}
        Stop sharing system with an account.
        Args:
            system_id (str, required): System ID
            user_email (str, required): User account email.
            auth (Union[httpx.BasicAuth, BearerTokenAuth, RequestedTokenAuth], optional): authentication
            headers (dict, optional): request headers dict
            **kwargs: request handler arguments

        Returns:

        """
        return self.delete(f'/{system_id}/users/{user_email}', headers=headers, auth=auth, **kwargs)

    def health_history(
            self,
            system_id: str,
            headers: typing.Optional[dict] = None,
            auth: AUTH_TYPES.BASIC_BEARER = None,
            **kwargs
    ) -> typing.Union[httpx.Response, typing.Awaitable[httpx.Response]]:
        """
        GET /cdb/systems/{systemId}/health-history
        Fetch history of system's status change. Note that collecting this history may be
        disabled by settings. Or it may have been disabled for some period of time in the past.
        This request does not reveal in any way periods of time when the history was not collected.
        Args:
            system_id (str, required): System ID
            auth (Union[httpx.BasicAuth, BearerTokenAuth, RequestedTokenAuth], optional): authentication
            headers (dict, optional): request headers dict
            **kwargs: request handler arguments

        Returns:

        """
        return self.get(f'/{system_id}/health-history', headers=headers, auth=auth, **kwargs)

    def validate_auth_key(
            self,
            system_id: str,
            message: str,
            signature: str,
            headers: typing.Optional[dict] = None,
            auth: AUTH_TYPES.BASIC_BEARER = None,
            **kwargs
    ) -> typing.Union[httpx.Response, typing.Awaitable[httpx.Response]]:
        """
        POST /cdb/systems/{systemId}/signature/validate
        Validate the system's authKey through the use of HMAC.
        Args:
            system_id (str, required): System ID
            message (str, required): Opaque text.
            signature (str, required): SIGNATURE = base64(hmacSha256(cloudSystemAuthKey, message)).
            auth (Union[httpx.BasicAuth, BearerTokenAuth, RequestedTokenAuth], optional): authentication
            headers (dict, optional): request headers dict
            **kwargs: request handler arguments

        Returns:
            "200 OK" if validation succeeded
            "404 Not Found" if system was not found
            "400 Bad Request" if the supplied signature does not correspond to records
        """
        data = {
            "message": message,
            "signature": signature
        }
        return self.post(f'/{system_id}/signature/validate',
                         json=data, headers=headers, auth=auth, **kwargs)

    def merge_systems(
            self,
            system_id: str,
            master_system_access_token: str,
            slave_system_access_token: str,
            headers: typing.Optional[dict] = None,
            auth: AUTH_TYPES.BASIC_BEARER = None,
            **kwargs
    ) -> typing.Union[httpx.Response, typing.Awaitable[httpx.Response]]:
        """
        POST /cdb/systems/{systemId}/merged_systems/
        Merge two systems.
        Args:
            system_id (str, required): System ID to merge to
            master_system_access_token (str, required): OAUTH access token valid for authenticating requests to the
             system that stays after the merge. Required when merging 5.0+ systems.
            slave_system_access_token (str, required): OAUTH access token valid for authenticating requests to the
             system that disappers during the merge. Required when merging 5.0+ systems.
            auth (Union[httpx.BasicAuth, BearerTokenAuth, RequestedTokenAuth], optional): authentication
            headers (dict, optional): request headers dict
            **kwargs: request handler arguments

        Returns:

        """
        data = {
            "masterSystemAccessToken": master_system_access_token,
            "slaveSystemAccessToken": slave_system_access_token
        }
        return self.post(f'/{system_id}/merged_systems/',
                         json=data, headers=headers, auth=auth, **kwargs)

    def get_system_custom_attrs(
            self,
            system_id: str,
            headers: typing.Optional[dict] = None,
            auth: AUTH_TYPES.BASIC_BEARER = None,
            **kwargs
    ) -> typing.Union[httpx.Response, typing.Awaitable[httpx.Response]]:
        """
        GET /cdb/systems/{systemId}/attributes
        Fetch custom attributes of the system.
        Args:
            system_id (str, required): System ID
            headers (dict, optional): request headers dict
            auth (Union[httpx.BasicAuth, BearerTokenAuth, RequestedTokenAuth], optional): authentication
            **kwargs: request handler arguments

        Returns:

        """
        return self.get(f'/{system_id}/attributes', headers=headers, auth=auth, **kwargs)

    def add_system_custom_attrs(
            self,
            system_id: str,
            attributes: typing.List[CustomAttribute],
            headers: typing.Optional[dict] = None,
            auth: AUTH_TYPES.BASIC_BEARER = None,
            **kwargs
    ) -> typing.Union[httpx.Response, typing.Awaitable[httpx.Response]]:
        """
        POST /cdb/systems/{systemId}/attributes
        Add attributes list from request to the system attributes.
        Note: Existing attributes won't be modified by this method. Use PUT method to modify existing attributes.
        Args:
            system_id (str, required): System ID
            attributes (list[dict[str, str]], required): list of system attributes ([{"name": "name", "value": "value"}])
            headers (dict, optional): request headers dict
            auth (Union[httpx.BasicAuth, BearerTokenAuth, RequestedTokenAuth], optional): authentication
            **kwargs: request handler arguments

        Returns:
            "200 OK" with the list of added attributes
            "409 Conflict" if the system has already attribute assigned with the same name

        """
        return self.post(f'/{system_id}/attributes', json=attributes, headers=headers, auth=auth, **kwargs)

    def update_system_custom_attrs(
            self,
            system_id: str,
            attributes: typing.List[CustomAttribute],
            headers: typing.Optional[dict] = None,
            auth: AUTH_TYPES.BASIC_BEARER = None,
            **kwargs
    ) -> typing.Union[httpx.Response, typing.Awaitable[httpx.Response]]:
        """
        PUT /cdb/systems/{systemId}/attributes
        Update custom attributes of the system or create new attributes if not found.
        Args:
            system_id (str, required): System ID
            attributes (list[dict[str, str]], required): list of system attributes
            headers (dict, optional): request headers dict
            auth (Union[httpx.BasicAuth, BearerTokenAuth, RequestedTokenAuth], optional): authentication
            **kwargs: request handler arguments

        Returns:
            "200 OK" with the list of added attributes
            "409 Conflict" if the system has already attribute assigned with the same name

        """
        return self.put(f'/{system_id}/attributes', json=attributes, headers=headers, auth=auth, **kwargs)

    def delete_system_custom_attr(
            self,
            system_id: str,
            attribute_name: str,
            headers: typing.Optional[dict] = None,
            auth: AUTH_TYPES.BASIC_BEARER = None,
            **kwargs
    ) -> typing.Union[httpx.Response, typing.Awaitable[httpx.Response]]:
        """
        DELETE /cdb/systems/{systemId}/attributes/{attributeName}
        Delete specific attribute
        Args:
            system_id (str, required): System ID
            attribute_name (str, required): Attribute name
            headers (dict, optional): request headers dict
            auth (Union[httpx.BasicAuth, BearerTokenAuth, RequestedTokenAuth], optional): authentication
            **kwargs: request handler arguments

        Returns:

        """
        return self.delete(f'/{system_id}/attributes/{attribute_name}', headers=headers, auth=auth, **kwargs)

    def add_system_custom_attr(
            self,
            system_id: str,
            attribute_name: str,
            attribute: CustomAttribute,
            headers: typing.Optional[dict] = None,
            auth: AUTH_TYPES.BASIC_BEARER = None,
            **kwargs
    ) -> typing.Union[httpx.Response, typing.Awaitable[httpx.Response]]:
        """
        POST /cdb/systems/{systemId}/attributes/{attributeName}
        Add custom attribute to the system.
        Note: Existing attribute won't be modified by this method. Use PUT method to modify existing attribute.
        Args:
            system_id (str, required): System ID
            attribute_name (str, required): Attribute name
            attribute (dict[str, str], required): system attribute dict ({"name": "name", "value": "value"})
            headers (dict, optional): request headers dict
            auth (Union[httpx.BasicAuth, BearerTokenAuth, RequestedTokenAuth], optional): authentication
            **kwargs: request handler arguments

        Returns:
            "200 OK" with the list of added attributes
            "409 Conflict" if the system has already attribute assigned with the same name

        """
        return self.post(f'/{system_id}/attributes/{attribute_name}',
                         json=attribute, headers=headers, auth=auth, **kwargs)

    def update_system_custom_attr(
            self,
            system_id: str,
            attribute_name: str,
            attribute: CustomAttribute,
            headers: typing.Optional[dict] = None,
            auth: AUTH_TYPES.BASIC_BEARER = None,
            **kwargs
    ) -> typing.Union[httpx.Response, typing.Awaitable[httpx.Response]]:
        """
        PUT /cdb/systems/{systemId}/attributes/{attributeName}
        Update custom attribute of the system or create new attributes if not found.
        Args:
            system_id (str, required): System ID
            attribute_name (str, required): Attribute name
            attribute (dict[str, str], required): attribute dict
            headers (dict, optional): request headers dict
            auth (Union[httpx.BasicAuth, BearerTokenAuth, RequestedTokenAuth], optional): authentication
            **kwargs: request handler arguments

        Returns:

        """
        return self.put(f'/{system_id}/attributes/{attribute_name}',
                         json=attribute, headers=headers, auth=auth, **kwargs)

    def get_system_user_custom_attrs(
            self,
            system_id: str,
            account_email: str,
            headers: typing.Optional[dict] = None,
            auth: AUTH_TYPES.BASIC_BEARER = None,
            **kwargs
    ) -> typing.Union[httpx.Response, typing.Awaitable[httpx.Response]]:
        """
        GET /cdb/systems/{systemId}/users/{accountEmail}/attributes
        Fetch system user attributes.
        Note: The system systemId should be shared with user accountEmail
        Args:
            system_id (str, required): System ID
            account_email (str, required): User email
            headers (dict, optional): request headers dict
            auth (Union[httpx.BasicAuth, BearerTokenAuth, RequestedTokenAuth], optional): authentication
            **kwargs: request handler arguments

        Returns:

        """
        return self.get(f'/{system_id}/users/{account_email}/attributes',
                        headers=headers, auth=auth, **kwargs)

    def update_system_user_custom_attrs(
            self,
            system_id: str,
            account_email: str,
            attributes: typing.List[CustomAttribute],
            headers: typing.Optional[dict] = None,
            auth: AUTH_TYPES.BASIC_BEARER = None,
            **kwargs
    ) -> typing.Union[httpx.Response, typing.Awaitable[httpx.Response]]:
        """
        POST /cdb/systems/{systemId}/users/{accountEmail}/attributes
        Add/update custom attributes of the system user.
        Note: The system systemId should be shared with user accountEmail
        Args:
            system_id (str, required): System ID
            account_email (str, required): User email
            attributes (list[dict[str, str]], required): list of system attributes
                ([{"name": "name", "value": "value"}])
            headers (dict, optional): request headers dict
            auth (Union[httpx.BasicAuth, BearerTokenAuth, RequestedTokenAuth], optional): authentication
            **kwargs: request handler arguments

        Returns:
            "200 OK" with the list of added attributes
            "409 Conflict" if the system has already attribute assigned with the same name

        """
        return self.post(f'/{system_id}/users/{account_email}/attributes',
                         json=attributes, headers=headers, auth=auth, **kwargs)

    def update_system_user_custom_attr(
            self,
            system_id: str,
            account_email: str,
            attribute_name: str,
            attribute: CustomAttribute,
            headers: typing.Optional[dict] = None,
            auth: AUTH_TYPES.BASIC_BEARER = None,
            **kwargs
    ) -> typing.Union[httpx.Response, typing.Awaitable[httpx.Response]]:
        """
        PUT /cdb/systems/{systemId}/users/{accountEmail}/attributes/{attributeName}
        Add/update single custom attribute of the system user.
        Note: The system systemId should be shared with user accountEmail
        Args:
            system_id (str, required): System ID
            account_email (str, required): User email
            attribute_name (str, required): Attribute name
            attribute (dict[str, str], required): custom attribute dict {"name": "name", "value": "value"}
            headers (dict, optional): request headers dict
            auth (Union[httpx.BasicAuth, BearerTokenAuth, RequestedTokenAuth], optional): authentication
            **kwargs: request handler arguments

        Returns:

        """
        return self.post(f'/{system_id}/users/{account_email}/attributes/{attribute_name}',
                         json=attribute, headers=headers, auth=auth, **kwargs)

    def delete_system_user_custom_attr(
            self,
            system_id: str,
            account_email: str,
            attribute_name: str,
            headers: typing.Optional[dict] = None,
            auth: AUTH_TYPES.BASIC_BEARER = None,
            **kwargs
    ) -> typing.Union[httpx.Response, typing.Awaitable[httpx.Response]]:
        """
        DELETE /cdb/systems/{systemId}/users/{accountEmail}/attributes/{attributeName}
        Delete specific attribute
        Args:
            system_id (str, required): System ID
            account_email (str, required): User email
            attribute_name (str, required): Attribute name
            headers (dict, optional): request headers dict
            auth (Union[httpx.BasicAuth, BearerTokenAuth, RequestedTokenAuth], optional): authentication
            **kwargs: request handler arguments

        Returns:

        """
        return self.delete(f'/{system_id}/users/{account_email}/attributes/{attribute_name}',
                           headers=headers, auth=auth, **kwargs)

    def systems_users_batch_request(
            self,
            batch_items: BatchRequestItems,
            headers: typing.Optional[dict] = None,
            auth: AUTH_TYPES.BASIC_BEARER = None,
            **kwargs
    ) -> typing.Union[httpx.Response, typing.Awaitable[httpx.Response]]:
        """
        POST /cdb/systems/users/batch
        Creates a batch request with multiple items of changes to systems users roles/attributes for
        asynchonous processing. If cloud account does not exist for some email in the batch it will
        be created and invited to access systems. If accessRole is set to SystemAccessRole::none then
        users will be deleted from system and all custom system attributes will be wiped. This function
        provides limited transactional guarantees. It guarantees transactional atomic commit/rollback
        semantic for all users of the system in one batch item. But it doesn't guarantee transactional
        semantic for entire batch.
        Args:
            batch_items (dict['items', List[dict]), required): Batch items
            headers (dict, optional): request headers dict
            auth (Union[httpx.BasicAuth, BearerTokenAuth, RequestedTokenAuth], optional): authentication
            **kwargs: request handler arguments

        Returns:

        """
        return self.post(f'/users/batch', json=batch_items,
                         headers=headers, auth=auth, **kwargs)

    def get_batch_request_state(
            self,
            batch_id: str,
            headers: typing.Optional[dict] = None,
            auth: AUTH_TYPES.BASIC_BEARER = None,
            **kwargs
    ) -> typing.Union[httpx.Response, typing.Awaitable[httpx.Response]]:
        """
        GET /cdb/systems/users/batch/{batchId}/state
        Get batch state submitted by POST /cdb/systems/users/batch method.
        Args:
            batch_id (str, required): Batch ID
            headers (dict, optional): request headers dict
            auth (Union[httpx.BasicAuth, BearerTokenAuth, RequestedTokenAuth], optional): authentication
            **kwargs: request handler arguments

        Returns:

        """
        return self.get(f'/users/batch/{batch_id}/state',
                        headers=headers, auth=auth, **kwargs)

    def get_batch_request_error(
            self,
            batch_id: str,
            headers: typing.Optional[dict] = None,
            auth: AUTH_TYPES.BASIC_BEARER = None,
            **kwargs
    ) -> typing.Union[httpx.Response, typing.Awaitable[httpx.Response]]:
        """
        GET /cdb/systems/users/batch/{batchId}/error
        Get batch error information with uncommitted changes for batch
        submitted by POST /cdb/systems/users/batch method.
        Args:
            batch_id (str, required): Batch ID
            headers (dict, optional): request headers dict
            auth (Union[httpx.BasicAuth, BearerTokenAuth, RequestedTokenAuth], optional): authentication
            **kwargs: request handler arguments

        Returns:

        """
        return self.get(f'/users/batch/{batch_id}/error',
                        headers=headers, auth=auth, **kwargs)


class CdbSystemTransferAPIBase(CdbAPIModuleBase):

    base_path = '/cdb/offered-systems'

    def systems_offers(
            self,
            headers: typing.Optional[dict] = None,
            auth: AUTH_TYPES.BASIC_BEARER = None,
            **kwargs
    ) -> typing.Union[httpx.Response, typing.Awaitable[httpx.Response]]:
        """
        GET /cdb/offered-systems
        Get system offers the current account participates in (in either role).

        Args:
            auth (Union[httpx.BasicAuth, BearerTokenAuth, RequestedTokenAuth], optional): authentication
            headers (dict, optional): request headers dict
            **kwargs: request handler arguments

        Returns: 200

        """

        return self.get(f'', headers=headers, auth=auth, **kwargs)

    def offer_system(
            self,
            system_id: str,
            to_account: str,
            comment: typing.Union[str, NotUsedInRequest, None] = NOT_USED_IN_REQUEST,
            headers: typing.Optional[dict] = None,
            auth: AUTH_TYPES.BASIC_BEARER = None,
            **kwargs
    ) -> typing.Union[httpx.Response, typing.Awaitable[httpx.Response]]:
        """
        POST /cdb/offered-systems
        Offer system to another user.
        Args:
            system_id (str, required): System ID to offer
            to_account (str, required): Account ID to offer systems to
            comment (str, required): Offer comment
            auth (Union[httpx.BasicAuth, BearerTokenAuth, RequestedTokenAuth], optional): authentication
            headers (dict, optional): request headers dict
            **kwargs: request handler arguments

        Returns:

        """
        data = self.exclude_not_used(**{
            "toAccount": to_account,
            "systemId": system_id,
            "comment": comment
        })
        return self.post(f'', json=data, headers=headers, auth=auth, **kwargs)

    def delete_offer(
            self,
            system_id: str,
            headers: typing.Optional[dict] = None,
            auth: AUTH_TYPES.BASIC_BEARER = None,
            **kwargs
    ) -> typing.Union[httpx.Response, typing.Awaitable[httpx.Response]]:
        """
        DELETE /cdb/offered-systems/{systemId}
        Delete system offer.
        Args:
            system_id (str, required): System ID to offer
            auth (Union[httpx.BasicAuth, BearerTokenAuth, RequestedTokenAuth], optional): authentication
            headers (dict, optional): request headers dict
            **kwargs: request handler arguments

        Returns:

        """
        return self.delete(f'/{system_id}', headers=headers, auth=auth, **kwargs)

    def update_offer(
            self,
            system_id: str,
            status: typing.Union[typing.Literal["accepted", "rejected"], NotUsedInRequest, None] = NOT_USED_IN_REQUEST,
            comment: typing.Union[str, NotUsedInRequest, None] = NOT_USED_IN_REQUEST,
            headers: typing.Optional[dict] = None,
            auth: AUTH_TYPES.BASIC_BEARER = None,
            **kwargs
    ) -> typing.Union[httpx.Response, typing.Awaitable[httpx.Response]]:
        """
        PUT /cdb/offered-systems/{systemId}
        Accept, reject or update system offer.
        Args:
            system_id (str, required): System ID to offer
            status (str, required): Offer status. Available values: "accepted", "rejected"
            comment (str, required): Offer comment
            auth (Union[httpx.BasicAuth, BearerTokenAuth, RequestedTokenAuth], optional): authentication
            headers (dict, optional): request headers dict
            **kwargs: request handler arguments

        Returns:

        """
        data = self.exclude_not_used(**{
            "status": status,
            "comment": comment
        })
        return self.put(f'/{system_id}', json=data, headers=headers, auth=auth, **kwargs)

    def accept_offer(
            self,
            system_id: str,
            headers: typing.Optional[dict] = None,
            auth: AUTH_TYPES.BASIC_BEARER = None,
            **kwargs
    ) -> typing.Union[httpx.Response, typing.Awaitable[httpx.Response]]:
        """
        PUT /cdb/offered-systems/{systemId}
        Accept system offer.
        Args:
            system_id (str, required): System ID to offer
            auth (Union[httpx.BasicAuth, BearerTokenAuth, RequestedTokenAuth], optional): authentication
            headers (dict, optional): request headers dict
            **kwargs: request handler arguments

        Returns:

        """
        return self.update_offer(system_id, status="accepted", headers=headers, auth=auth, **kwargs)

    def reject_offer(
            self,
            system_id: str,
            headers: typing.Optional[dict] = None,
            auth: AUTH_TYPES.BASIC_BEARER = None,
            **kwargs
    ) -> typing.Union[httpx.Response, typing.Awaitable[httpx.Response]]:
        """
        PUT /cdb/offered-systems/{systemId}
        Reject system offer.
        Args:
            system_id (str, required): System ID to offer
            auth (Union[httpx.BasicAuth, BearerTokenAuth, RequestedTokenAuth], optional): authentication
            headers (dict, optional): request headers dict
            **kwargs: request handler arguments

        Returns:

        """
        return self.update_offer(system_id, status="rejected", headers=headers, auth=auth, **kwargs)

    def modify_offer_comment(
            self,
            system_id: str,
            comment: str,
            headers: typing.Optional[dict] = None,
            auth: AUTH_TYPES.BASIC_BEARER = None,
            **kwargs
    ) -> typing.Union[httpx.Response, typing.Awaitable[httpx.Response]]:
        """
        PUT /cdb/offered-systems/{systemId}
        Modify system offer comment.
        WARNING!!! NOT IMPLEMENTED
        {
            "errorClass": "internalError",
            "errorDetail": "109",
            "errorText": "notImplemented",
            "resultCode": "notImplemented"
        }
        Args:
            system_id (str, required): System ID to offer
            comment (str, required): Offer comment
            auth (Union[httpx.BasicAuth, BearerTokenAuth, RequestedTokenAuth], optional): authentication
            headers (dict, optional): request headers dict
            **kwargs: request handler arguments

        Returns:

        """
        # return self.update_offer(system_id, comment=comment, headers=headers, auth=auth, **kwargs)
        raise NotImplementedError()


class CdbAuthSupportAPIBase(CdbAPIModuleBase):

    base_path = '/cdb/auth'

    def get_nonce(
            self,
            system_id: str,
            headers: typing.Optional[dict] = None,
            params: typing.Optional[dict] = None,
            auth: AUTH_TYPES.BASIC_BEARER = None,
            **kwargs
    ) -> typing.Union[httpx.Response, typing.Awaitable[httpx.Response]]:
        """
        GET /cdb/auth/getNonce
        The nonce is changed by the cloud_db periodically. So, the requesting entity should
         fetch a new nonce some time before expiration of the current one.
        In the cloud_db old and new nonces overlap for some internally configured timeout.
        Args:
            system_id (str, required): System ID to offer
            auth (Union[httpx.BasicAuth, BearerTokenAuth, RequestedTokenAuth], optional): authentication
            headers (dict, optional): request headers dict
            params (dict, optional): query params
            **kwargs: request handler arguments

        Returns:

        """
        params = params or {}
        params.update(systemId=system_id)
        return self.get('/getNonce', params=params, headers=headers, auth=auth, **kwargs)

    def caller_identy(
            self,
            request_method: str,
            request_authorization: str,
            base_nonce: str,
            headers: typing.Optional[dict] = None,
            auth: AUTH_TYPES.BASIC_BEARER = None,
            **kwargs
    ) -> typing.Union[httpx.Response, typing.Awaitable[httpx.Response]]:
        """
        POST /cdb/auth_provider/caller-identity
        cloud_db authenticates HTTP Authorization header value passed in requestAuthorization as if
        it was received by cloud_db directly. Should be used by other cloud services to delegate HTTP
        request authentication to cloud_db. Response contains information whether credentials/token
        found in Authorization header are known and which account/system they belong to.
        This request itself MUST BE confirmed by cloud service's credentials.
        Args:
            request_method (str, required): Method name from request
            request_authorization (str, required): Authorization header value from request
            base_nonce (str, required): once, specific for a system.
            auth (Union[httpx.BasicAuth, BearerTokenAuth, RequestedTokenAuth], optional): authentication
            headers (dict, optional): request headers dict
            **kwargs: request handler arguments

        Returns:

        """
        data = {
            "requestMethod": request_method,
            "requestAuthorization": request_authorization,
            "baseNonce": base_nonce
        }
        # Path is strange, but it will be appended to the base API url `self.base_path`
        return self.post('_provider/caller-identity', json=data, headers=headers, auth=auth, **kwargs)

    def access_level(
            self,
            system_id: str,
            request_method: str,
            request_authorization: str,
            base_nonce: str,
            headers: typing.Optional[dict] = None,
            auth: AUTH_TYPES.BASIC_BEARER = None,
            **kwargs
    ) -> typing.Union[httpx.Response, typing.Awaitable[httpx.Response]]:
        """
        POST /cdb/auth_provider/system/{systemID}/access-level
        Works similar to POST /cdb/auth_provider/caller-identity but provides an access level
        to a given system, not a account/system descriptor. This request itself MUST BE
        confirmed by cloud service's credentials.
        Args:
            request_method (str, required): Method name from request
            request_authorization (str, required): Authorization header value from request
            base_nonce (str, required): once, specific for a system.
            auth (Union[httpx.BasicAuth, BearerTokenAuth, RequestedTokenAuth], optional): authentication
            headers (dict, optional): request headers dict
            **kwargs: request handler arguments

        Returns:

        """
        data = {
            "requestMethod": request_method,
            "requestAuthorization": request_authorization,
            "baseNonce": base_nonce
        }
        # Path is strange, but it will be prepended to the base API url `self.base_path`
        return self.post(f'_provider/system/{system_id}/access-level',
                         json=data, headers=headers, auth=auth, **kwargs)

    def vms_public_key(
            self,
            system_id: str,
            server_id: str,
            fingerprint: str,
            headers: typing.Optional[dict] = None,
            auth: AUTH_TYPES.BASIC_BEARER = None,
            **kwargs
    ) -> typing.Union[httpx.Response, typing.Awaitable[httpx.Response]]:

        # Path is strange, but it will be appended to the base API url `self.base_path`
        return self.get(f'_provider/system/{system_id}/server/{server_id}/certificate/{fingerprint}/public-key',
                        headers=headers, auth=auth, **kwargs)


class Cdb2faAPIBase(CdbAPIModuleBase):

    base_path = '/cdb/account/self/2fa'

    def get_totp_secret_key(
            self,
            headers: typing.Optional[dict] = None,
            auth: AUTH_TYPES.BASIC_BEARER = None,
            **kwargs
    ) -> typing.Union[httpx.Response, typing.Awaitable[httpx.Response]]:
        """
        POST /cdb/account/self/2fa/totp/key
        Generate TOTP secret key. This key is used by both TOTP authenticator apps
        and the cloud_db to generate temporary authentication keys. After sucessful
        execution, account security settings will have totpExistsForAccount field
        set to true.
        Note: If a secret key already exists it is overwritten with a new one.
        Note: This call is forbidden if 2FA was already enabled for the account.
        Args:
            headers (dict, optional): request headers
            auth (Union[httpx.BasicAuth, BearerTokenAuth, RequestedTokenAuth], optional): authentication
            **kwargs: request handler arguments

        Returns:

        """
        return self.post(f'/totp/key',
                        headers=headers, auth=auth, **kwargs)

    def delete_totp_secret_key(
            self,
            headers: typing.Optional[dict] = None,
            auth: AUTH_TYPES.BASIC_BEARER = None,
            **kwargs
    ) -> typing.Union[httpx.Response, typing.Awaitable[httpx.Response]]:
        """
        DELETE /cdb/account/self/2fa/totp/key
        Delete user's TOTP secret key. After successful execution, account security
        settings will have `totpExistsForAccount` field set to true.
        Args:
            headers (dict, optional): request headers
            auth (Union[httpx.BasicAuth, BearerTokenAuth, RequestedTokenAuth], optional): authentication
            **kwargs: request handler arguments

        Returns:

        """
        return self.delete(f'/totp/key', headers=headers, auth=auth, **kwargs)

    def generate_backup_codes(
            self,
            count: int,
            headers: typing.Optional[dict] = None,
            auth: AUTH_TYPES.BASIC_BEARER = None,
            **kwargs
    ) -> typing.Union[httpx.Response, typing.Awaitable[httpx.Response]]:
        """
        POST /cdb/account/self/2fa/backup-code/
        Generate backup codes for the account. The account is detected be authentication tokens or basic auth.
        Args:
            count: count of code to generate
            headers (dict, optional): request headers
            auth (Union[httpx.BasicAuth, BearerTokenAuth, RequestedTokenAuth], optional): authentication
            **kwargs: request handler arguments

        Returns:

        """
        return self.post(f'/backup-code/', json={"count": count},
                         headers=headers, auth=auth, **kwargs)

    def get_backup_codes(
            self,
            headers: typing.Optional[dict] = None,
            auth: AUTH_TYPES.BASIC_BEARER = None,
            **kwargs
    ) -> typing.Union[httpx.Response, typing.Awaitable[httpx.Response]]:
        """
        GET /cdb/account/self/2fa/backup-code/
        Get account's backup codes.
        Args:
            headers (dict, optional): request headers
            auth (Union[httpx.BasicAuth, BearerTokenAuth, RequestedTokenAuth], optional): authentication
            **kwargs: request handler arguments

        Returns:

        """
        return self.get(f'/backup-code/',
                        headers=headers, auth=auth, **kwargs)

    def delete_backup_codes(
            self,
            headers: typing.Optional[dict] = None,
            auth: AUTH_TYPES.BASIC_BEARER = None,
            **kwargs
    ) -> typing.Union[httpx.Response, typing.Awaitable[httpx.Response]]:
        """
        DELETE /cdb/account/self/2fa/backup-code/
        Delete all backup codes for the current user.
        Args:
            headers (dict, optional): request headers
            auth (Union[httpx.BasicAuth, BearerTokenAuth, RequestedTokenAuth], optional): authentication
            **kwargs: request handler arguments

        """
        return self.delete(f'/backup-code/',
                           headers=headers, auth=auth, **kwargs)

    def verify_backup_code(
            self,
            code: str,
            headers: typing.Optional[dict] = None,
            auth: AUTH_TYPES.QUERY = None,
            **kwargs
    ) -> typing.Union[httpx.Response, typing.Awaitable[httpx.Response]]:
        """
        GET /cdb/account/self/2fa/backup-code/{code}
        Validate the OAUTH token present in the request with the backup code using with the
        {code} parameter. If the supplied backup code is valid and belongs to the current
        account as well as the supplied OAUTH token, then the OAUTH token is considered
        validated with the second factor and may be used to authorize requests that require
        the second factor.
        Args:
            code: backup code
            headers (dict, optional): request headers
            auth (Union[QueryParamAuth, RequestedTokenQueryAuth], optional): authentication
            **kwargs: request handler arguments

        Returns:

        """
        return self.get(f'/backup-code/{code}', headers=headers, auth=auth, **kwargs)

    def verify_2fa_code(
            self,
            mfa_code: str,
            headers: typing.Optional[dict] = None,
            auth: AUTH_TYPES.QUERY = None,
            **kwargs
    ) -> typing.Union[httpx.Response, typing.Awaitable[httpx.Response]]:

        return self.get(f'/totp/key/{mfa_code}', headers=headers, auth=auth, **kwargs)

    def delete_backup_code(
            self,
            code: str,
            headers: typing.Optional[dict] = None,
            auth: AUTH_TYPES.BASIC_BEARER = None,
            **kwargs
    ) -> typing.Union[httpx.Response, typing.Awaitable[httpx.Response]]:
        """
        DELETE /cdb/account/self/2fa/backup-code/{code}
        Delete a single backup code for the current user.
        Args:
            code: code to delete
            headers (dict, optional): request headers
            auth (Union[httpx.BasicAuth, BearerTokenAuth, RequestedTokenAuth], optional): authentication
            **kwargs: request handler arguments

        """
        return self.delete(f'/backup-code/{code}', headers=headers, auth=auth, **kwargs)


class CdbOrganizationAPIBase(CdbAPIModuleBase):
    base_path = '/cdb/organizations'

    def bind(
            self,
            id: str,
            name: str,
            customization: str,
            opaque: str,
            organization_id: str,
            headers: typing.Optional[dict] = None,
            auth: AUTH_TYPES.BASIC_BEARER = None,
            **kwargs
    ) -> typing.Union[httpx.Response, typing.Awaitable[httpx.Response]]:
        """
        POST /cdb/systems/bind
        Register a new system.
        Create new system and bind it to the organization specified in the request path. The system will be owned by the organization.
        Note: No users are added to the system by this call. All access is available through the organizations API only.
        id and authKey attributes from the response must be reported to the VMS system immediately so that the VMS may use them to interact with the Cloud. There is no way to request the key again.
        Args:
            id (str, optional): If specified, then an attempt to assign this id will be made. If the id was alredy taken, an error is raised.
            name (str, required): System name, non-unique.
            customization (str, required): Customization name
            opaque (str, required): Vms-specific data. Transparently stored and returned.
            organization_id (str, required): Organization ID which will own the cloud system
            auth (Union[httpx.BasicAuth, BearerTokenAuth, RequestedTokenAuth], optional): authentication
            headers (dict, optional): request headers dict
            **kwargs: request handler arguments

        Returns:

        """
        data = {
            # "id": '',
            "name": name,
            "customization": customization,
            "opaque": opaque
        }
        return self.post(f"/{organization_id}/systems", json=data, headers=headers, auth=auth, **kwargs)

from typing import Tuple

import httpx
import structlog
from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction
from drf_spectacular.extensions import OpenApiAuthenticationExtension
from httpx import Response
from nx_cloud_api_client.client import NxCloudAPISyncClient
from rest_framework import (
    exceptions,
    status,
)
from rest_framework.authentication import BasicAuthentication

from partners.auth.cache import TokenCache
from partners.auth.constants import CREDENTIALS_REMOVED_PERMANENTLY
from partners.auth.token_auth import NxCloudOauthTokenAuthenticationExtension
from partners.models import (
    CloudSystemId,
    CloudSystemStates,
)
from tools.exception import APIErrorWithoutRollback
from tools.nx_cloud_api_client_factory import NxCloudApiClientFactory


logger = structlog.getLogger(__name__)


def check_system_credentials(
        system_id: str,
        system_auth_key: str,
        cloud_host: str
) -> Tuple[bool, None | int, str | None]:
    system_api: NxCloudAPISyncClient = NxCloudApiClientFactory.get_sync_client(host=cloud_host)
    try:
        response: Response = system_api.system.get_system(
            system_id, auth=httpx.BasicAuth(
                username=system_id,
                password=system_auth_key))
    except httpx.HTTPError as ex:
        logger.error(
            "Request to cdb failed",
            exception_type=type(ex).__name__,
            exception_details=str(ex),
            exc_info=True)
        return False, None, None

    if response.is_success:
        response_body = response.json()
        response_system_id = response_body.get('id')
        response_status = response_body.get('status')
        system_name = response_body.get('name')

        state = CloudSystemStates.STATE_DICT.get(response_status)
        is_activated: bool = state == CloudSystemStates.ACTIVATED

        if response_system_id == system_id:
            if not is_activated:
                return False, state, system_name
            if is_activated:
                return True, state, system_name
        return False, None, None

    if response.headers.get('content-type') == 'application/json':
        error = response.json()
        if error.get('resultCode') == CREDENTIALS_REMOVED_PERMANENTLY:
            return False, CloudSystemStates.DELETED, None
    # CLOUD-12908. Let's count any error status code as unauthorized
    logger.info(
        'Authentication failed',
        system_id=system_id,
        response_status_code=response.status_code,
        response_content=response.content.decode())
    return False, None, None


class NxCloudSystemBasicAuthentication(BasicAuthentication):
    """
    Custom authentication class for NxCloud systems using basic authentication.
    """
    def get_cloud_hostname(self, request):
        """
        Retrieve the cloud_host from the request.
        """
        return getattr(request.cloud_host, 'hostname', None)

    def get_system(self, system_id, request):
        """
        Retrieve a CloudSystemId object based on the system_id and cloud_host.
        """
        return CloudSystemId.objects.filter(
            system_id=system_id,
            cloud_host=request.cloud_host
        ).first()

    def get_system_or_raise(self, system_id, request=None):
        """
        Retrieve a CloudSystemId object or raise appropriate exceptions.
        """
        if system := self.get_system(system_id, request):
            if system.system_state == CloudSystemStates.DELETED:
                raise exceptions.NotAuthenticated(detail={
                    'detail': 'System has been disconnected.',
                    'resultCode': CREDENTIALS_REMOVED_PERMANENTLY,
                })
            if not system.organization:
                raise exceptions.NotAuthenticated(detail={
                    'detail': 'Not an organization system.',
                })
            return system
        raise exceptions.NotFound(f'System {system_id} not found.')

    def validate_request(self, request):
        """
        Validate the incoming request.
        """
        if not self.get_cloud_hostname(request):
            raise exceptions.ParseError('Invalid hostname.')

    def check_cached_auth(self, auth_header, userid, request):
        """
        Check if the authentication is cached and valid.
        """
        if (cloud_system_id := TokenCache.get_system_auth(auth_header)) and userid == cloud_system_id:
            request.cloud_system = self.get_system_or_raise(system_id=userid, request=request)
            return get_user_model()(), None
        return None

    def authenticate_system(self, userid, password, request):
        """
        Authenticate the system using the provided credentials.
        """
        return check_system_credentials(
            system_id=userid,
            system_auth_key=password,
            cloud_host=self.get_cloud_hostname(request)
        )

    def update_system_info(self, cloud_system, system_name, system_status):
        """
        Update the cloud system information if needed.
        """
        needs_update = False
        if cloud_system.name != system_name:
            cloud_system.name = system_name
            needs_update = True
        if cloud_system.system_state not in (system_status, CloudSystemStates.DELETED):
            cloud_system.system_state = system_status
            needs_update = True
        if needs_update:
            cloud_system.save()

    def handle_auth_result(self, authenticated, system_status, cloud_system, request):
        """
        Handle the result of the authentication process.
        """
        if authenticated:
            request.cloud_system = cloud_system
            return get_user_model()(), None

        if system_status == CloudSystemStates.DELETED:
            raise APIErrorWithoutRollback(
                detail={
                    'detail': 'Invalid system id or auth key',
                    'resultCode': CREDENTIALS_REMOVED_PERMANENTLY,
                },
                status_code=status.HTTP_401_UNAUTHORIZED
            )

        raise APIErrorWithoutRollback(
            detail='Invalid system id or auth key',
            status_code=status.HTTP_401_UNAUTHORIZED
        )

    def authenticate_credentials(self, userid, password, request=None):
        """
        Authenticate the system credentials.

        This method orchestrates the entire authentication process.
        """
        auth_header = request.headers.get('authorization')
        self.validate_request(request)

        # Check if authentication is cached
        cached_auth = self.check_cached_auth(auth_header, userid, request)
        if cached_auth:
            return cached_auth

        # Authenticate the system
        authenticated, system_status, system_name = self.authenticate_system(userid, password, request)

        # Cache the authentication if successful
        if authenticated and system_status == CloudSystemStates.ACTIVATED:
            TokenCache.set_system_auth(auth_header, userid)

        with transaction.atomic():
            cloud_system = self.get_system_or_raise(system_id=userid, request=request) if authenticated or system_status else None

            # Update system information if needed
            if isinstance(cloud_system, CloudSystemId):
                self.update_system_info(cloud_system, system_name, system_status)

        return self.handle_auth_result(authenticated, system_status, cloud_system, request)


class NxCloudSystemBasicAuthenticationInternal(NxCloudSystemBasicAuthentication):
    """
    Internal version of NxCloudSystemBasicAuthentication with modified behavior.
    """
    def get_cloud_hostname(self, request):
        """
        Retrieve the cloud_host from the request.
        """
        return settings.DEFAULT_HOST_NAME

    def get_system(self, system_id, request):
        """
        Retrieve a CloudSystemId object based on the system_id.
        This version doesn't filter by cloud_host.
        """
        return CloudSystemId.objects.filter(system_id=system_id).first()


    def validate_request(self, request):
        """
        Validate the incoming request.
        This version skips the cloud_host validation.
        """
        pass  # No need to validate cloud_host for internal authentication


    def handle_auth_result(self, authenticated, system_status, cloud_system, request):
        """
        Handle the result of the authentication process.
        This version sets cloud_host on the request.
        The .super() method adds the cloud_system to the request.
        """

        result = super().handle_auth_result(authenticated, system_status, cloud_system, request)
        request.cloud_host = cloud_system.cloud_host
        return result


class NxCloudSystemBasicAuthenticationExtension(OpenApiAuthenticationExtension):
    target_class = 'partners.auth.system_auth.NxCloudSystemBasicAuthentication'
    name = 'Cloud System Credentials Basic Auth'
    priority = 2

    def get_security_definition(self, auto_schema):
        return {
            'type': 'http',
            'scheme': 'basic',
        }


def system_authentication_hook(result, generator, request, public):
    for path in result.get('paths', {}).values():
        for method in path.values():
            found = False
            if 'security' in method:
                for security_schemes in method['security']:
                    if found:
                        break
                    for scheme in security_schemes:
                        if scheme in [
                            NxCloudSystemBasicAuthenticationExtension.name,
                            NxCloudOauthTokenAuthenticationExtension.name
                        ]:
                            if 'parameters' not in method:
                                method['parameters'] = []
                            method['parameters'].append({
                                'name': 'cloud-host',
                                'default': 'cloud-test.hdw.mx',
                                'in': 'header',
                                'schema': {'type': 'string'},
                                'required': True
                            })
                            found = True
                            break
    return result

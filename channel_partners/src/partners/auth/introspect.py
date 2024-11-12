import uuid
from dataclasses import dataclass
from typing import (
    Dict,
    Iterable,
    Optional,
    Set,
)

from partners.auth.cache import TokenCache
from partners.models import VmsRoles
from tools.helpers import cast_uuid
from tools.nx_cloud_api_client_factory import NxCloudApiClientFactory


@dataclass
class IntrospectionResult:
    email: Optional[str]
    introspected_systems_roles: Dict[uuid.UUID, Set[uuid.UUID]]

    def get_email(self) -> str:
        return self.email.lower() if self.email else ''

    def __post_init__(self):
        self.introspected_systems_roles = {
            cast_uuid(system_id): {cast_uuid(role) for role in roles}
            for system_id, roles in self.introspected_systems_roles.items()
        }

    def has_roles_in_system(
            self,
            email: str,
            system_id: uuid.UUID,
            expected_roles: Iterable[uuid] | VmsRoles.AnyRole | None = None
    ) -> bool:
        return bool(
                email
                and email.lower() == self.get_email().lower()
                and system_id in self.introspected_systems_roles
                and (
                    expected_roles == VmsRoles.ANY_ROLE or
                    set(expected_roles).intersection(self.introspected_systems_roles[system_id])
                )
        )

    @classmethod
    def none(cls) -> 'IntrospectionResult':
        return cls(email=None, introspected_systems_roles={})

    @classmethod
    def from_cdb_response(cls, cdb_response: dict) -> 'IntrospectionResult':
        return cls(email=cdb_response.get('username'),
                   introspected_systems_roles=cdb_response.get('system_role_ids', {}))


class CdbTokenIntrospect:

    @staticmethod
    def auth_header(request) -> str:
        return request.headers.get('Authorization') or ''

    @staticmethod
    def is_system_auth(request) -> bool:
        return CdbTokenIntrospect.auth_header(request).lower().startswith('basic')

    @staticmethod
    def is_token_auth(request) -> bool:
        return CdbTokenIntrospect.auth_header(request).lower().startswith('bearer')

    @staticmethod
    def get_bearer_token(request) -> Optional[str]:
        if not CdbTokenIntrospect.is_token_auth(request):
            return None
        return CdbTokenIntrospect.auth_header(request)[6:].strip()

    @staticmethod
    def introspect_with_system(token, cloud_host_name, system_id) -> IntrospectionResult:
        cached = TokenCache.get_system_introspection(token, system_id)
        if cached:
            return cached

        cdb_client = NxCloudApiClientFactory.get_sync_client(
            host=cloud_host_name,
            access_token=token,
            auto_refresh=False
        )

        system_id = cast_uuid(system_id)
        system_ids = [str(system_id)] if system_id else []
        response = cdb_client.authentication.introspect(system_ids)

        if response.status_code == 200:
            introspection = response.json()

            if introspection.get('active') is True and (email := introspection.get('username')):
                introspection_result = IntrospectionResult.from_cdb_response(introspection)

                TokenCache.set_system_introspection(token, system_id, introspection_result)
                TokenCache.set_token(token, email)

                return introspection_result

        return IntrospectionResult.none()

    @staticmethod
    def has_vms_roles(
            request,
            system_id: uuid.UUID,
            roles: Iterable[uuid.UUID] | VmsRoles.AnyRole | None
    ) -> Optional[bool]:
        if not (token := CdbTokenIntrospect.get_bearer_token(request)):
            return None
        system_introspection = CdbTokenIntrospect.introspect_with_system(
            token=token, cloud_host_name=request.cloud_host.hostname, system_id=system_id
        )
        is_allowed = system_introspection.has_roles_in_system(
            email=request.user.email,
            system_id=system_id,
            expected_roles=roles
        )
        request.system_introspection = system_introspection
        return is_allowed

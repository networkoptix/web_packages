import inspect
from typing import (
    Any,
    Callable,
    Iterable,
    List,
    Optional,
)
from uuid import UUID

from rest_framework.permissions import BasePermission

from partners.auth.helpers import AuthHelper
from partners.auth.introspect import CdbTokenIntrospect
from partners.models import (
    CloudSystemId,
    VmsRoles,
)


class IsInternalToken(BasePermission):
    def has_permission(self, request, view):
        auth_token = AuthHelper.get_token(request)
        return auth_token and auth_token.internal


class IsInternalUser(BasePermission):
    def has_permission(self, request, view):
        return request.user.email.endswith('@networkoptix.com')


class IsAuthenticatedSystem(BasePermission):
    message = 'System authentication required'

    def __init__(self, system_id_kwarg=None):
        self.system_id_kwarg = system_id_kwarg

    def has_permission(self, request, view):
        request_system = getattr(request, 'cloud_system', None)
        if not request_system:
            return False
        if not self.system_id_kwarg:
            return bool(request_system.organization_id)
        view_system_id = view.kwargs.get(self.system_id_kwarg, '')
        return request_system.organization_id and str(request_system.system_id) == view_system_id


class IsAuthenticatedCloudUserOrSystem(BasePermission):
    message = 'Authentication required'

    def has_permission(self, request, view):
        return (request.user and request.user.is_authenticated) or bool(getattr(request, 'cloud_system', None))


class CanPerformChannelPartnerAction(BasePermission):
    def __init__(
            self,
            check_function: Optional[Callable],
            system_allowed: bool = False,
            direct_access_allowed: Iterable[UUID] = False
    ):
        self.check_function = check_function
        self.system_allowed = system_allowed

        # Allow access if user is system administrator of the system (directly, not org-level)
        if direct_access_allowed:
            self.direct_access_allowed = direct_access_allowed
        else:
            self.direct_access_allowed = None

    def has_object_permission(self, request, view, obj: Any):
        if system := getattr(request, 'cloud_system', None):
            return system == obj and self.system_allowed and obj.organization_id
        if request.user and request.user.is_authenticated and request.auth:
            if self.check_function:
                if self.check_function(obj, request.user):
                    return True
            # introspection requires for a valid token, so if request
            # is not authenticated then introspection has no sense
            if self.direct_access_allowed is not None and isinstance(obj, CloudSystemId):
                system_id = getattr(obj, 'system_id', None)
                if system_id:
                    if not getattr(obj, 'organization_id', None):
                        return False
                    if CdbTokenIntrospect.has_vms_roles(request, system_id, self.direct_access_allowed):
                        return True
        return False


class IsInternalService(BasePermission):

    def has_permission(self, request, view):
        internal_service = AuthHelper.get_internal_service(request)
        return internal_service and internal_service.is_request_allowed(request)


class IsOneOfAuthorized(BasePermission):

    def __init__(self, permissions_classes: List[BasePermission]):
        self.auth_classes = []
        for auth_class in permissions_classes:
            if inspect.isclass(auth_class):
                auth_class = auth_class()
            if not isinstance(auth_class, BasePermission):
                raise ValueError('All classes must be subclasses of BasePermission')
            self.auth_classes.append(auth_class)

    def __call__(self, *args, **kwargs):
        return self

    def has_permission(self, request, view):
        for auth_class in self.auth_classes:
            if auth_class.has_permission(request, view):
                return True
        return False

    def has_object_permission(self, request, view, obj):
        for auth_class in self.auth_classes:
            if auth_class.has_object_permission(request, view, obj):
                return True
        return False


class CanAccessSystemUser(BasePermission):
    def __init__(self, vms_roles: Iterable[UUID], email_kwarg: Optional[str] = None):
        self.email_kwarg = email_kwarg.lower() if email_kwarg else None
        self.vms_roles = vms_roles

    def has_object_permission(self, request, view, obj):
        if CdbTokenIntrospect.has_vms_roles(request, obj.system_id, self.vms_roles):
            return True

        # check if user has admin or power user role
        if obj.has_vms_role(request.user, VmsRoles.ADMIN_AND_POWER_USER):
            return True

        # If email kwarg is not given stop authorization
        if not self.email_kwarg:
            return False

        if not request.user or not (email := getattr(request.user, 'email', None)):
            return False

        # check if email kwarg is the same as the user email
        if email.lower() != self.email_kwarg:
            return False

        # check if user has any role in system
        if obj.has_vms_role(request.user, VmsRoles.ANY_ROLE):
            return True

        return False
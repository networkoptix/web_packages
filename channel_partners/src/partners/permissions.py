from typing import (
    Any,
    Callable,
    List,
)
from uuid import UUID

from rest_framework.permissions import BasePermission

from partners.auth.introspect import CdbTokenIntrospect
from partners.models import CloudSystemId


class IsInternalToken(BasePermission):
    def has_permission(self, request, view):
        return request.auth.internal


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
            check_function: Callable,
            system_allowed: bool = False,
            direct_access_allowed: List[UUID] = False
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

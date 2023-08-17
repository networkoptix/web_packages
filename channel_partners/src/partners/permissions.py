from rest_framework.permissions import BasePermission

from partners.models import CloudSystemId
from .authentication import check_user_can_administer_system


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
            return bool(request_system)
        view_system_id = view.kwargs.get(self.system_id_kwarg, '')
        return request_system and str(request_system.system_id) == view_system_id


class IsAuthenticatedCloudUserOrSystem(BasePermission):
    message = 'Authentication required'

    def has_permission(self, request, view):
        return (request.user and request.user.is_authenticated) or bool(getattr(request, 'cloud_system', None))


class CanPerformChannelPartnerAction(BasePermission):
    def __init__(self, check_function, system_allowed=False, direct_access_allowed=False):
        self.check_function = check_function
        self.system_allowed = system_allowed

        # Alloow access if user is system administrator of the system (directly, not org-level)
        self.direct_access_allowed = direct_access_allowed

    def has_object_permission(self, request, view, obj: CloudSystemId):
        if system := getattr(request, 'cloud_system', None):
            return system == obj and self.system_allowed
        elif request.user and request.user.is_authenticated and request.auth:
            if self.direct_access_allowed and check_user_can_administer_system(obj.system_id, request.auth, obj.cloud_host.hostname, raise_exception=False):
                return True
            if self.check_function:
                return self.check_function(obj, request.user)
        return False

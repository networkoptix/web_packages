from rest_framework import permissions
from django.core.exceptions import PermissionDenied


class IsSuperuser(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_superuser

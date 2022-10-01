from django.conf import settings
from rest_framework import permissions

from cms import models
from util.helpers import get_customization


class IsSuperuser(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_superuser


class CanViewDevelopers(permissions.BasePermission):
    def has_permission(self, request, view):
        customization = get_customization(request)
        config_cache = models.cloud_portal_customization_cache(
            customization, 'config')
        if config_cache.get('developers_enabled', False):
            return True
        elif request.user.is_authenticated:
            return models.UserGroupsToAssetPermissions. \
                check_customization_permission(
                    request.user, customization, "cms.access_developers")
        return False

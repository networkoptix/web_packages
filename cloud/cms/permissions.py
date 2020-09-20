from django.conf import settings
from rest_framework import permissions

from cms.models import get_cloud_portal_asset, UserGroupsToAssetPermissions, cloud_portal_customization_cache


class IsSuperuser(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_superuser


class CanViewDevelopers(permissions.BasePermission):
    def has_permission(self, request, view):
        config_cache = cloud_portal_customization_cache(settings.CUSTOMIZATION, 'config')
        if config_cache.get('developers_enabled', False):
            return True
        elif request.user.is_authenticated:
            return UserGroupsToAssetPermissions. \
                check_customization_permission(request.user, settings.CUSTOMIZATION, "cms.access_developers")
        return False

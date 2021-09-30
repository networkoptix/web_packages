from django.contrib.auth.models import Group, Permission

from cms.models import UserGroupsToAssetPermissions

CAN_ACCESS_CUSTOMIZATION = "Can View"


def make_customization_visible_to_user(cloud_portal, user):
    customization_group = UserGroupsToAssetPermissions.objects.\
        filter(group__name__icontains=CAN_ACCESS_CUSTOMIZATION,
               asset=cloud_portal).first()

    if customization_group:
        customization_group.group.user_set.add(user)
    else:
        group_name = f"{CAN_ACCESS_CUSTOMIZATION} - {cloud_portal.customizations.first().name}"
        can_view_permission = Permission.objects.get(
            codename='access_customization')
        can_view_group = Group(name=group_name)
        can_view_group.save()
        can_view_group.user_set.add(user)
        can_view_group.permissions.add(can_view_permission)
        UserGroupsToAssetPermissions(
            asset=cloud_portal, group=can_view_group).save()

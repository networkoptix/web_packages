import pytest
from uuid import uuid4
from model_bakery import baker

from api.helpers.permissions import *
from cms.models import Asset, Customization


@pytest.mark.slow
def test_make_customization_visible_to_user(db, account_factory):
    customization_name = str(uuid4())
    customization = baker.make(Customization, name=customization_name)
    cloud_portal = baker.make(Asset)
    cloud_portal.customizations.add(customization)
    users = [
        account_factory(is_superuser=False, email=f'{uuid4()}@{uuid4()}.com')
        for _ in range(5)]

    for user in users:
        make_customization_visible_to_user(cloud_portal, user)

    user_group_to_asset_permissions = UserGroupsToAssetPermissions.objects.filter(
        group__name__icontains=CAN_ACCESS_CUSTOMIZATION, asset=cloud_portal).first()
    can_view_group = user_group_to_asset_permissions.group
    assert can_view_group.name == f"{CAN_ACCESS_CUSTOMIZATION} - {customization_name}"
    assert can_view_group.permissions.filter(
        codename='access_customization').exists()
    group_users = list(can_view_group.user_set.all())
    assert group_users == users

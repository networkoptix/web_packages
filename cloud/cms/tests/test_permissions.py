import pytest
from uuid import uuid4

from cms.permissions import *


def test_is_superuser_permission(account_factory, mocker):
    superuser = account_factory(email=str(uuid4()), prepare_only=True)
    non_superuser = account_factory(email=str(uuid4()), is_superuser=False, prepare_only=True)
    request, view = [mocker.MagicMock() for _ in range(2)]

    instance = IsSuperuser()

    # Test superuser
    request.user = superuser
    assert instance.has_permission(request, view)

    # Test non superuser
    request.user = non_superuser
    assert not instance.has_permission(request, view)

@pytest.mark.no_db
def test_can_view_developers_permission(account_factory, mocker, db):
    superuser = account_factory(email=str(uuid4()))
    non_superuser = account_factory(email=str(uuid4()), is_superuser=False)
    request, view = [mocker.MagicMock() for _ in range(2)]
    request.POST={}
    request.META={}
    request.data={}

    instance = CanViewDevelopers()

    # Test superuser has permission
    request.user = superuser
    assert instance.has_permission(request, view)

    # Test non superuser doesn't have permission
    request.user = non_superuser
    assert not instance.has_permission(request, view)

    # Test non superuser checks customization permission
    check_permission_result = str(uuid4())
    mock_check_customization_permission = mocker.patch.object(
        models.UserGroupsToAssetPermissions, 'check_customization_permission', return_value=check_permission_result)

    assert instance.has_permission(request, view) == check_permission_result
    mock_check_customization_permission.assert_called_once_with(
        non_superuser, settings.CUSTOMIZATION, 'cms.access_developers')

    # Test developers enabled globally
    mocker.patch.object(
        models, 'cloud_portal_customization_cache', return_value={
            'developers_enabled': True})
    assert instance.has_permission(request, view)

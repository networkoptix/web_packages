from uuid import uuid4

import pytest
from rest_framework.exceptions import ValidationError

from partners.models import (
    ChannelPartner,
    ChannelPartnerRoles,
    CloudUser,
)
from partners.serializers.v2.serializers import (
    ChannelPartnerUserSerializer,
    CreateChannelPartnerSerializer,
)
from partners.tests.serializers.v2.test_channel_partner_user_serializer import (
    create_context,
)
from partners.validators import validate_dict_max_size
from partners.views.v2.views import ChannelPartnerUserViewSet


def test_validate_jsonb_size_within_limit():
    value = {"key": "value"}
    try:
        validate_dict_max_size(value, max_size=3000)
    except ValidationError:
        pytest.fail("ValidationError raised unexpectedly!")


def test_validate_jsonb_size_exceeds_limit():
    value = {"key": "a" * 3000}
    with pytest.raises(ValidationError, match=r"JSON size exceeds the maximum allowed size of 3000 bytes."):
        validate_dict_max_size(value, max_size=3000)


@pytest.mark.django_db
def test_channel_partner_attributes_within_limit(cloud_test_host):
    try:
        obj = ChannelPartner(
            cloud_host=cloud_test_host,
            name="Test Partner",
            attributes={"key": "value"},
            support_information={"info": "value"}
        )
        obj.save()
    except ValidationError:
        pytest.fail("ValidationError raised unexpectedly!")


def test_create_channel_partner_serializer_too_large_json(channel_partner_factory, cp_user_factory, arf, mocker):
    cp = channel_partner_factory()
    cp_user = cp_user_factory(channel_partner=cp)
    request = arf.post('/')
    request.user = cp_user.user
    context = {'request': request}

    data = {
        "name": f'{uuid4()}',
        "parentChannelPartner": f"{cp.id}",
        "attributes": {
            "additionalProp1": "a" * 3000,
        }
    }
    serializer = CreateChannelPartnerSerializer(data=data, context=context)
    assert serializer.is_valid() is False
    assert serializer.errors['attributes'][0] == 'JSON size exceeds the maximum allowed size of 3000 bytes.'


def test_success_at_first_then_incrementally_add_until_failure(
        cloud_host_factory,
        channel_partner_factory,
        arf,
        cloud_test_host,
        mock_auth_with_user,
        mock_new_partner_user_role_notification):
    user: CloudUser = CloudUser.objects.create(email="nx_user@example.com")
    cloud_host = cloud_test_host

    nx_cp: ChannelPartner = channel_partner_factory(
        name='nx',
        cloud_host=cloud_host,
        parent_channel_partner=None)

    # Roles
    cp_admin_role = ChannelPartnerRoles.ADMINISTRATOR
    request = arf.post('/')
    request.cloud_host = cloud_host
    context = create_context(cp=nx_cp, created_by=user, cloud_host=cloud_host, request=request)
    mock_notification = mock_new_partner_user_role_notification

    view = ChannelPartnerUserViewSet.as_view(actions={'post': 'create'})

    data = {
        'email': user.email,
        'title': "new title",
        "roleId": cp_admin_role,
        'attributes': {'key1': 'value1'}
    }

    serializer = ChannelPartnerUserSerializer(data=data, context=context)
    serializer.is_valid()
    serializer.save()

    # Add more attributes (Successfully
    for iteration in range(1, 147):
        data['attributes'][f'key{iteration}'] = f'value{iteration}'
        serializer = ChannelPartnerUserSerializer(data=data, context=context)
        serializer.is_valid()
        serializer.save()

    data = {
        'email': user.email,
        'title': "new title",
        "roleId": cp_admin_role,
        'attributes': {'key148': 'value148'}
    }
    request = arf.post('/', data, format='json')
    mock_auth_with_user(user)
    response = view(request, parent_lookup_channel_partner=nx_cp.id)
    assert response.status_code == 400

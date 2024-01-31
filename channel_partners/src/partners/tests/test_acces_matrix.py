import json
import os

import pytest
from django.conf import settings
from django.core.cache import caches

from partners.models import (
    FieldAccessPermissions,
    OrganizationRoles,
)
from partners.serializers import (
    ChannelPartnerSerializer,
    CloudSystemSerializer,
    OrganizationSerializer,
)
from tools.access_matrix import (
    AccessMatrixDict,
    AccessMatrixJson,
    AccessTypes,
    FieldPermission,
    UserAccessMatrix,
)
from tools.serializers import VALUE_REPLACEMENT


CP_ROLES_PERMISSIONS = [
    ('Administrator', 'field_access_cp_admin'),
    ('Manager', 'field_access_cp_manager'),
    ('Accountant', 'field_access_cp_accountant'),
]


def get_content_matrix(content_type):
    file_name = os.path.join(settings.BASE_DIR, 'partners/data/access_matrix.json')
    with open(file_name, 'r') as fp:
        data = json.load(fp)
    return next(filter(lambda x: x["target_content"] == content_type, data))

def clean_cache():
    caches['local'].delete("channel_partner_roles")
    caches['local'].delete("organization_roles")
    caches['local'].delete("access_matrix_channelpartner")
    caches['local'].delete("access_matrix_organization")
    caches['local'].delete("access_matrix_cloudsystemid")


def check_matrix(access_matrix):
    content = get_content_matrix(access_matrix.content_type)
    for field in content["fields"]:
        field_name = field["target_field"]
        # assert hasattr(access_matrix.fields, field_name)
        assert field_name in access_matrix.fields
        # if isinstance(access_matrix, AccessMatrixJson):
        #     assert field_name in access_matrix.fields.fields
        for permission in field["permissions"]:
            perm_codename = permission["permission"]
            perm_object: FieldPermission = access_matrix.fields.get(field_name).get(perm_codename)
            for level in permission["access_levels"]:
                if level["can_read"]:
                    assert access_matrix.fields.check_permissions_access(
                        user_permissions=[perm_codename], field_name=field_name,
                        access_type=AccessTypes.read, level=2 if level["owning_level"] is None else level["owning_level"]
                    )
                    assert level["owning_level"] in perm_object.get_levels(AccessTypes.read)
                else:
                    assert access_matrix.fields.check_permissions_access(
                        user_permissions=[perm_codename], field_name=field_name,
                        access_type=AccessTypes.read, level=2 if level["owning_level"] is None else level["owning_level"]
                    ) is False
                    assert level["owning_level"] not in perm_object.get_levels(AccessTypes.read)

                if level["can_write"]:
                    assert access_matrix.fields.check_permissions_access(
                        user_permissions=[perm_codename], field_name=field_name,
                        access_type=AccessTypes.write, level=2 if level["owning_level"] is None else level["owning_level"]
                    )
                    assert level["owning_level"] in perm_object.get_levels(AccessTypes.write)
                else:
                    assert access_matrix.fields.check_permissions_access(
                        user_permissions=[perm_codename], field_name=field_name,
                        access_type=AccessTypes.write, level=2 if level["owning_level"] is None else level["owning_level"]
                    ) is False
                    assert level["owning_level"] not in perm_object.get_levels(AccessTypes.write)



class TestAccessMatrixJson:

    def test_init_channel_partner(self, db):
        clean_cache()
        access_matrix = AccessMatrixJson(content_type="channelpartner")
        check_matrix(access_matrix)

    def test_init_organization(self, db):
        clean_cache()
        access_matrix = AccessMatrixJson(content_type="organization")
        check_matrix(access_matrix)


class TestAccessMatrixDict:

    def test_init(self, db):
        access_matrix = AccessMatrixDict(content_type="channelpartner")
        check_matrix(access_matrix)


class TestUserAccessMatrix:
    @pytest.fixture(autouse=True)
    def setup(self, channel_partner_factory, organization_factory, cp_user_factory, org_user_factory):
        self.partners = []
        parent = None
        for _ in range(5):
            parent = channel_partner_factory(parent_channel_partner=parent)
            self.partners.append(parent)
        self.organizations = [organization_factory(channel_partner=cp) for cp in self.partners]
        clean_cache()

    def test_init_org_user(self, org_user_factory):
        MatrixClass = UserAccessMatrix
        org_admin = org_user_factory(organization=self.organizations[0], role='Organization Administrator')
        org_power_user = org_user_factory(organization=self.organizations[0], role='Power User')
        org_viewer = org_user_factory(organization=self.organizations[0], role='Viewer')
        org_admin_access_matrix = MatrixClass(cloud_user=org_admin.user, content_type='channelpartner')
        org_power_user_access_matrix = MatrixClass(cloud_user=org_power_user.user, content_type='channelpartner')
        org_viwer_access_matrix = MatrixClass(cloud_user=org_viewer.user, content_type='channelpartner')
        check_matrix(org_admin_access_matrix.access_matrix)
        assert (
                org_admin_access_matrix.get_user_permissions(self.organizations[0], org_admin.roles)
                == {FieldAccessPermissions.field_access_org_admin}
        )
        assert (
                org_admin_access_matrix.get_user_permissions(self.organizations[0], org_power_user.roles)
                == {FieldAccessPermissions.field_access_org_power_user}
        )
        assert (
                org_admin_access_matrix.get_user_permissions(self.organizations[0], org_viewer.roles)
                == {FieldAccessPermissions.field_access_org_other}
        )

        assert org_admin_access_matrix.get_instance_to_user_rels(self.organizations[0]) == [org_admin]
        assert org_power_user_access_matrix.get_instance_to_user_rels(self.organizations[0]) == [org_power_user]
        assert org_viwer_access_matrix.get_instance_to_user_rels(self.organizations[0]) == [org_viewer]

    def test_init_cp_user(self, cp_user_factory):
        MatrixClass = UserAccessMatrix
        cp_admin = cp_user_factory(channel_partner=self.partners[0], role='Administrator')
        cp_manager = cp_user_factory(channel_partner=self.partners[0], role='Manager')
        cp_accountant = cp_user_factory(channel_partner=self.partners[0], role='Accountant')
        cp_admin_access_matrix = MatrixClass(cloud_user=cp_admin.user, content_type='channelpartner')
        cp_manager_access_matrix = MatrixClass(cloud_user=cp_manager.user, content_type='channelpartner')
        cp_accountant_access_matrix = MatrixClass(cloud_user=cp_accountant.user, content_type='channelpartner')
        check_matrix(cp_admin_access_matrix.access_matrix)
        assert (
                cp_admin_access_matrix.get_user_permissions(self.partners[0], cp_admin.roles)
                == {FieldAccessPermissions.field_access_cp_admin}
        )
        assert (
                cp_admin_access_matrix.get_user_permissions(self.partners[0], cp_manager.roles)
                == {FieldAccessPermissions.field_access_cp_manager}
        )
        assert (
                cp_admin_access_matrix.get_user_permissions(self.partners[0], cp_accountant.roles)
                == {FieldAccessPermissions.field_access_cp_accountant}
        )

        assert cp_admin_access_matrix.get_instance_to_user_rels(self.partners[0]) == [cp_admin]
        assert cp_manager_access_matrix.get_instance_to_user_rels(self.partners[0]) == [cp_manager]
        assert cp_accountant_access_matrix.get_instance_to_user_rels(self.partners[0]) == [cp_accountant]


    def test_init_dict_org_user(self, org_user_factory):
        MatrixClass = UserAccessMatrix
        org_admin = org_user_factory(organization=self.organizations[0], role='Organization Administrator')
        org_power_user = org_user_factory(organization=self.organizations[0], role='Power User')
        org_viewer = org_user_factory(organization=self.organizations[0], role='Viewer')
        org_admin_access_matrix = MatrixClass(cloud_user=org_admin.user, content_type='channelpartner')
        org_power_user_access_matrix = MatrixClass(cloud_user=org_power_user.user, content_type='channelpartner')
        org_viwer_access_matrix = MatrixClass(cloud_user=org_viewer.user, content_type='channelpartner')
        check_matrix(org_admin_access_matrix.access_matrix)
        assert (
                org_admin_access_matrix.get_user_permissions(self.organizations[0], org_admin.roles)
                == {FieldAccessPermissions.field_access_org_admin}
        )
        assert (
                org_admin_access_matrix.get_user_permissions(self.organizations[0], org_power_user.roles)
                == {FieldAccessPermissions.field_access_org_power_user}
        )
        assert (
                org_admin_access_matrix.get_user_permissions(self.organizations[0], org_viewer.roles)
                == {FieldAccessPermissions.field_access_org_other}
        )

        assert org_admin_access_matrix.get_instance_to_user_rels(self.organizations[0]) == [org_admin]
        assert org_power_user_access_matrix.get_instance_to_user_rels(self.organizations[0]) == [org_power_user]
        assert org_viwer_access_matrix.get_instance_to_user_rels(self.organizations[0]) == [org_viewer]

    def test_init_dict_cp_user(self, cp_user_factory):
        MatrixClass = UserAccessMatrix
        cp_admin = cp_user_factory(channel_partner=self.partners[0], role='Administrator')
        cp_manager = cp_user_factory(channel_partner=self.partners[0], role='Manager')
        cp_accountant = cp_user_factory(channel_partner=self.partners[0], role='Accountant')
        cp_admin_access_matrix = MatrixClass(cloud_user=cp_admin.user, content_type='channelpartner')
        cp_manager_access_matrix = MatrixClass(cloud_user=cp_manager.user, content_type='channelpartner')
        cp_accountant_access_matrix = MatrixClass(cloud_user=cp_accountant.user, content_type='channelpartner')
        check_matrix(cp_admin_access_matrix.access_matrix)
        assert (
                cp_admin_access_matrix.get_user_permissions(self.partners[0], cp_admin.roles)
                == {FieldAccessPermissions.field_access_cp_admin}
        )
        assert (
                cp_admin_access_matrix.get_user_permissions(self.partners[0], cp_manager.roles)
                == {FieldAccessPermissions.field_access_cp_manager}
        )
        assert (
                cp_admin_access_matrix.get_user_permissions(self.partners[0], cp_accountant.roles)
                == {FieldAccessPermissions.field_access_cp_accountant}
        )

        assert cp_admin_access_matrix.get_instance_to_user_rels(self.partners[0]) == [cp_admin]
        assert cp_manager_access_matrix.get_instance_to_user_rels(self.partners[0]) == [cp_manager]
        assert cp_accountant_access_matrix.get_instance_to_user_rels(self.partners[0]) == [cp_accountant]


class TestChannelPartnerSerializerFieldAccessLevels:
    @pytest.fixture(autouse=True)
    def setup(self, channel_partner_factory, organization_factory,
              cp_user_factory, org_user_factory):
        self.partners = []
        parent = None
        for _ in range(5):
            parent = channel_partner_factory(parent_channel_partner=parent)
            self.partners.append(parent)
        self.organizations = [organization_factory(channel_partner=cp) for cp in self.partners]
        with open(os.path.join(settings.BASE_DIR, 'partners/data/access_matrix.json'), 'r') as f:
            self.access_levels = json.load(f)
        caches['local'].delete("channel_partner_roles")
        caches['local'].delete("organization_roles")
        caches['local'].delete("access_matrix_channelpartner")

    def test_cp_admin(self, cp_user_factory, org_user_factory, arf):
        request = arf.get('/')
        cp_user = cp_user_factory(channel_partner=self.partners[2], role='Administrator')
        request.user = cp_user.user
        ctx = {'request': request}

        # Check user grandparent
        ser = ChannelPartnerSerializer(instance=self.partners[0], context=ctx)
        check_matrix(ser.user_access_matrix.access_matrix)
        instance = self.partners[0]
        assert ser.get_read_perm_method(ser.fields["name"])(instance=instance) is False
        assert ser.get_write_perm_method(ser.fields["name"])(instance=instance) is False
        assert ser.get_read_perm_method(ser.fields["parentChannelPartner"])(instance=instance) is False
        assert ser.get_write_perm_method(ser.fields["parentChannelPartner"])(instance=instance) is False
        assert ser.get_read_perm_method(ser.fields["state"])(instance=instance) is False
        assert ser.get_write_perm_method(ser.fields["state"])(instance=instance) is False
        assert ser.get_read_perm_method(ser.fields["effectiveState"])(instance=instance) is False
        assert ser.get_read_perm_method(ser.fields["monthlyAdditionalServiceLimit"])(instance=instance) is False
        assert ser.get_read_perm_method(ser.fields["attributes"])(instance=instance) is False
        assert ser.get_write_perm_method(ser.fields["attributes"])(instance=instance) is False

        #  Check user parent
        ser = ChannelPartnerSerializer(instance=self.partners[1], context=ctx)
        check_matrix(ser.user_access_matrix.access_matrix)
        instance = self.partners[1]
            # assert ser.get_read_perm_method(ser.fields["name"])(instance=instance) is True
            # assert ser.get_write_perm_method(ser.fields["name"])(instance=instance) is False
        assert ser.get_read_perm_method(ser.fields["parentChannelPartner"])(instance=instance) is True
        assert ser.get_write_perm_method(ser.fields["parentChannelPartner"])(instance=instance) is False
        assert ser.get_read_perm_method(ser.fields["state"])(instance=instance) is False
        assert ser.get_write_perm_method(ser.fields["state"])(instance=instance) is False
        assert ser.get_read_perm_method(ser.fields["effectiveState"])(instance=instance) is False
        assert ser.get_read_perm_method(ser.fields["monthlyAdditionalServiceLimit"])(instance=instance) is False
        assert ser.get_read_perm_method(ser.fields["attributes"])(instance=instance) is False
        assert ser.get_write_perm_method(ser.fields["attributes"])(instance=instance) is False

        #  Check user's level
        ser = ChannelPartnerSerializer(instance=self.partners[2], context=ctx)
        check_matrix(ser.user_access_matrix.access_matrix)
        instance = self.partners[2]
        assert ser.get_read_perm_method(ser.fields["name"])(instance=instance) is True
        assert ser.get_write_perm_method(ser.fields["name"])(instance=instance) is True
        assert ser.get_read_perm_method(ser.fields["parentChannelPartner"])(instance=instance) is True
        assert ser.get_write_perm_method(ser.fields["parentChannelPartner"])(instance=instance) is False
        assert ser.get_read_perm_method(ser.fields["state"])(instance=instance) is True
        assert ser.get_write_perm_method(ser.fields["state"])(instance=instance) is False
        assert ser.get_read_perm_method(ser.fields["effectiveState"])(instance=instance) is True
        assert ser.get_read_perm_method(ser.fields["monthlyAdditionalServiceLimit"])(instance=instance) is True
        assert ser.get_read_perm_method(ser.fields["attributes"])(instance=instance) is True
        assert ser.get_write_perm_method(ser.fields["attributes"])(instance=instance) is True

        #  Check user child
        ser = ChannelPartnerSerializer(instance=self.partners[3], context=ctx)
        check_matrix(ser.user_access_matrix.access_matrix)
        instance = self.partners[3]
        assert ser.get_read_perm_method(ser.fields["name"])(instance=instance) is True
        assert ser.get_write_perm_method(ser.fields["name"])(instance=instance) is False
        assert ser.get_read_perm_method(ser.fields["parentChannelPartner"])(instance=instance) is True
        assert ser.get_write_perm_method(ser.fields["parentChannelPartner"])(instance=instance) is False
        assert ser.get_read_perm_method(ser.fields["state"])(instance=instance) is True
        assert ser.get_write_perm_method(ser.fields["state"])(instance=instance) is True
        assert ser.get_read_perm_method(ser.fields["effectiveState"])(instance=instance) is True
        assert ser.get_read_perm_method(ser.fields["monthlyAdditionalServiceLimit"])(instance=instance) is True
        assert ser.get_read_perm_method(ser.fields["attributes"])(instance=instance) is True
        assert ser.get_write_perm_method(ser.fields["attributes"])(instance=instance) is True

        #  Check user's  grand child
        ser = ChannelPartnerSerializer(instance=self.partners[4], context=ctx)
        check_matrix(ser.user_access_matrix.access_matrix)
        instance = self.partners[4]
        assert ser.get_read_perm_method(ser.fields["name"])(instance=instance) is False
        assert ser.get_write_perm_method(ser.fields["name"])(instance=instance) is False
        assert ser.get_read_perm_method(ser.fields["parentChannelPartner"])(instance=instance) is True
        assert ser.get_write_perm_method(ser.fields["parentChannelPartner"])(instance=instance) is False
        assert ser.get_read_perm_method(ser.fields["state"])(instance=instance) is True
        assert ser.get_write_perm_method(ser.fields["state"])(instance=instance) is False
        assert ser.get_read_perm_method(ser.fields["effectiveState"])(instance=instance) is True
        assert ser.get_read_perm_method(ser.fields["monthlyAdditionalServiceLimit"])(instance=instance) is True
        assert ser.get_read_perm_method(ser.fields["attributes"])(instance=instance) is True
        assert ser.get_write_perm_method(ser.fields["attributes"])(instance=instance) is False

    def test_org_admin(self, organization_factory, org_user_factory, arf):
        request = arf.get('/')
        org = organization_factory(channel_partner=self.partners[1])
        org_user = org_user_factory(organization=org, role='Organization Administrator')
        request.user = org_user.user
        ctx = {'request': request}

        # Check user grandparent
        ser = ChannelPartnerSerializer(instance=self.partners[0], context=ctx)
        instance = self.partners[0]
        assert ser.get_read_perm_method(ser.fields["name"])(instance=instance) is False
        assert ser.get_write_perm_method(ser.fields["name"])(instance=instance) is False
        assert ser.get_read_perm_method(ser.fields["parentChannelPartner"])(instance=instance) is False
        assert ser.get_write_perm_method(ser.fields["parentChannelPartner"])(instance=instance) is False
        assert ser.get_read_perm_method(ser.fields["state"])(instance=instance) is False
        assert ser.get_write_perm_method(ser.fields["state"])(instance=instance) is False
        assert ser.get_read_perm_method(ser.fields["effectiveState"])(instance=instance) is False
        assert ser.get_read_perm_method(ser.fields["monthlyAdditionalServiceLimit"])(instance=instance) is False
        assert ser.get_read_perm_method(ser.fields["attributes"])(instance=instance) is False
        assert ser.get_write_perm_method(ser.fields["attributes"])(instance=instance) is False

        #  Check user's organization parent
        ser = ChannelPartnerSerializer(instance=self.partners[1], context=ctx)
        instance = self.partners[1]
        assert ser.get_read_perm_method(ser.fields["name"])(instance=instance) is True
        assert ser.get_write_perm_method(ser.fields["name"])(instance=instance) is False
        assert ser.get_read_perm_method(ser.fields["parentChannelPartner"])(instance=instance) is False
        assert ser.get_write_perm_method(ser.fields["parentChannelPartner"])(instance=instance) is False
        assert ser.get_read_perm_method(ser.fields["state"])(instance=instance) is False
        assert ser.get_write_perm_method(ser.fields["state"])(instance=instance) is False
        assert ser.get_read_perm_method(ser.fields["effectiveState"])(instance=instance) is False
        assert ser.get_read_perm_method(ser.fields["monthlyAdditionalServiceLimit"])(instance=instance) is False
        assert ser.get_read_perm_method(ser.fields["attributes"])(instance=instance) is False
        assert ser.get_write_perm_method(ser.fields["attributes"])(instance=instance) is False

        #  Check out of user scope
        ser = ChannelPartnerSerializer(instance=self.partners[2], context=ctx)
        instance = self.partners[2]
        assert ser.get_read_perm_method(ser.fields["name"])(instance=instance) is False
        assert ser.get_write_perm_method(ser.fields["name"])(instance=instance) is False
        assert ser.get_read_perm_method(ser.fields["parentChannelPartner"])(instance=instance) is False
        assert ser.get_write_perm_method(ser.fields["parentChannelPartner"])(instance=instance) is False
        assert ser.get_read_perm_method(ser.fields["state"])(instance=instance) is False
        assert ser.get_write_perm_method(ser.fields["state"])(instance=instance) is False
        assert ser.get_read_perm_method(ser.fields["effectiveState"])(instance=instance) is False
        assert ser.get_read_perm_method(ser.fields["monthlyAdditionalServiceLimit"])(instance=instance) is False
        assert ser.get_read_perm_method(ser.fields["attributes"])(instance=instance) is False
        assert ser.get_write_perm_method(ser.fields["attributes"])(instance=instance) is False

        #  Check out of user scope
        ser = ChannelPartnerSerializer(instance=self.partners[3], context=ctx)
        instance = self.partners[3]
        assert ser.get_read_perm_method(ser.fields["name"])(instance=instance) is False
        assert ser.get_write_perm_method(ser.fields["name"])(instance=instance) is False
        assert ser.get_read_perm_method(ser.fields["parentChannelPartner"])(instance=instance) is False
        assert ser.get_write_perm_method(ser.fields["parentChannelPartner"])(instance=instance) is False
        assert ser.get_read_perm_method(ser.fields["state"])(instance=instance) is False
        assert ser.get_write_perm_method(ser.fields["state"])(instance=instance) is False
        assert ser.get_read_perm_method(ser.fields["effectiveState"])(instance=instance) is False
        assert ser.get_read_perm_method(ser.fields["monthlyAdditionalServiceLimit"])(instance=instance) is False
        assert ser.get_read_perm_method(ser.fields["attributes"])(instance=instance) is False
        assert ser.get_write_perm_method(ser.fields["attributes"])(instance=instance) is False

        #  Check out of user scope
        ser = ChannelPartnerSerializer(instance=self.partners[4], context=ctx)
        instance = self.partners[4]
        assert ser.get_read_perm_method(ser.fields["name"])(instance=instance) is False
        assert ser.get_write_perm_method(ser.fields["name"])(instance=instance) is False
        assert ser.get_read_perm_method(ser.fields["parentChannelPartner"])(instance=instance) is False
        assert ser.get_write_perm_method(ser.fields["parentChannelPartner"])(instance=instance) is False
        assert ser.get_read_perm_method(ser.fields["state"])(instance=instance) is False
        assert ser.get_write_perm_method(ser.fields["state"])(instance=instance) is False
        assert ser.get_read_perm_method(ser.fields["effectiveState"])(instance=instance) is False
        assert ser.get_read_perm_method(ser.fields["monthlyAdditionalServiceLimit"])(instance=instance) is False
        assert ser.get_read_perm_method(ser.fields["attributes"])(instance=instance) is False
        assert ser.get_write_perm_method(ser.fields["attributes"])(instance=instance) is False

    def test_serializer_many(self, cp_user_factory, arf):
        cp_user = cp_user_factory(channel_partner=self.partners[2], role='Administrator')
        request = arf.get('/')
        request.user = cp_user.user
        ctx = {'request': request}
        ser = ChannelPartnerSerializer(self.partners, many=True, context=ctx)
        data = ser.data
        assert data[0]['name'] == VALUE_REPLACEMENT
        assert data[1]['name'] == self.partners[1].name
        assert data[2]['name'] == self.partners[2].name
        assert data[3]['name'] == self.partners[3].name
        assert data[4]['name'] == VALUE_REPLACEMENT
        
        
class TestOrganizationSerializerFieldAccessLevels:
    @pytest.fixture(autouse=True)
    def setup(self, channel_partner_factory, organization_factory,
              cp_user_factory, org_user_factory, system_group_factory):
        self.partners = []
        parent = None
        for _ in range(5):
            parent = channel_partner_factory(parent_channel_partner=parent)
            self.partners.append(parent)
        self.organizations = [
            organization_factory(channel_partner=cp, channel_partner_access_level_id=None) for cp in self.partners]
        self.groups = [system_group_factory(organization=org) for org in self.organizations]
        with open(os.path.join(settings.BASE_DIR, 'partners/data/access_matrix.json'), 'r') as f:
            self.access_levels = json.load(f)

        caches['local'].delete("channel_partner_roles")
        caches['local'].delete("organization_roles")
        caches['local'].delete("access_matrix_organization")

    def test_cp_admin(self, cp_user_factory, org_user_factory, arf):
        request = arf.get('/')
        cp_user = cp_user_factory(channel_partner=self.partners[1], role='Administrator')
        request.user = cp_user.user
        ctx = {'request': request}
        # Check user parent
        ser = OrganizationSerializer(instance=self.organizations[0], context=ctx)
        check_matrix(ser.user_access_matrix.access_matrix)
        instance = self.organizations[0]
        assert ser.get_read_perm_method(ser.fields["name"])(instance=instance) is False
        assert ser.get_write_perm_method(ser.fields["name"])(instance=instance) is False
        assert ser.get_read_perm_method(ser.fields["state"])(instance=instance) is False
        assert ser.get_write_perm_method(ser.fields["state"])(instance=instance) is False
        assert ser.get_read_perm_method(ser.fields["channelPartnerAccessLevel"])(instance=instance) is False
        assert ser.get_write_perm_method(ser.fields["channelPartnerAccessLevel"])(instance=instance) is False
        assert ser.get_read_perm_method(ser.fields["attributes"])(instance=instance) is False
        assert ser.get_write_perm_method(ser.fields["attributes"])(instance=instance) is False

        #  Check user cp's organization
        ser = OrganizationSerializer(instance=self.organizations[1], context=ctx)
        check_matrix(ser.user_access_matrix.access_matrix)
        instance = self.organizations[1]
        assert ser.get_read_perm_method(ser.fields["name"])(instance=instance) is True
        assert ser.get_write_perm_method(ser.fields["name"])(instance=instance) is False
        assert ser.get_read_perm_method(ser.fields["state"])(instance=instance) is True
        assert ser.get_write_perm_method(ser.fields["state"])(instance=instance) is True
        assert ser.get_read_perm_method(ser.fields["channelPartnerAccessLevel"])(instance=instance) is True
        assert ser.get_write_perm_method(ser.fields["channelPartnerAccessLevel"])(instance=instance) is False
        assert ser.get_read_perm_method(ser.fields["attributes"])(instance=instance) is True
        assert ser.get_write_perm_method(ser.fields["attributes"])(instance=instance) is True

        #  Check user child cp organization
        ser = OrganizationSerializer(instance=self.organizations[2], context=ctx)
        check_matrix(ser.user_access_matrix.access_matrix)
        instance = self.organizations[2]
        assert ser.get_read_perm_method(ser.fields["name"])(instance=instance) is False
        assert ser.get_write_perm_method(ser.fields["name"])(instance=instance) is False
        assert ser.get_read_perm_method(ser.fields["state"])(instance=instance) is True
        assert ser.get_write_perm_method(ser.fields["state"])(instance=instance) is False
        assert ser.get_read_perm_method(ser.fields["channelPartnerAccessLevel"])(instance=instance) is False
        assert ser.get_write_perm_method(ser.fields["channelPartnerAccessLevel"])(instance=instance) is False
        assert ser.get_read_perm_method(ser.fields["attributes"])(instance=instance) is True
        assert ser.get_write_perm_method(ser.fields["attributes"])(instance=instance) is False

        #  Check levels down
        ser = OrganizationSerializer(instance=self.organizations[3], context=ctx)
        check_matrix(ser.user_access_matrix.access_matrix)
        instance = self.organizations[3]
        assert ser.get_read_perm_method(ser.fields["name"])(instance=instance) is False
        assert ser.get_write_perm_method(ser.fields["name"])(instance=instance) is False
        assert ser.get_read_perm_method(ser.fields["state"])(instance=instance) is True
        assert ser.get_write_perm_method(ser.fields["state"])(instance=instance) is False
        assert ser.get_read_perm_method(ser.fields["channelPartnerAccessLevel"])(instance=instance) is False
        assert ser.get_write_perm_method(ser.fields["channelPartnerAccessLevel"])(instance=instance) is False
        assert ser.get_read_perm_method(ser.fields["attributes"])(instance=instance) is True
        assert ser.get_write_perm_method(ser.fields["attributes"])(instance=instance) is False

        #  Check user's  grand child
        ser = OrganizationSerializer(instance=self.organizations[4], context=ctx)
        check_matrix(ser.user_access_matrix.access_matrix)
        instance = self.organizations[4]
        assert ser.get_read_perm_method(ser.fields["name"])(instance=instance) is False
        assert ser.get_write_perm_method(ser.fields["name"])(instance=instance) is False
        assert ser.get_read_perm_method(ser.fields["state"])(instance=instance) is True
        assert ser.get_write_perm_method(ser.fields["state"])(instance=instance) is False
        assert ser.get_read_perm_method(ser.fields["channelPartnerAccessLevel"])(instance=instance) is False
        assert ser.get_write_perm_method(ser.fields["channelPartnerAccessLevel"])(instance=instance) is False
        assert ser.get_read_perm_method(ser.fields["attributes"])(instance=instance) is True
        assert ser.get_write_perm_method(ser.fields["attributes"])(instance=instance) is False

    def test_org_admin(self, organization_factory, org_user_factory, arf):
        request = arf.get('/')
        org = self.organizations[1]
        org_admin = org_user_factory(organization=org, role='Organization Administrator')
        org_power_user = org_user_factory(organization=org, role='Power User')
        org_viewer = org_user_factory(organization=org, role='Viewer')
        request.user = org_admin.user
        ctx = {'request': request}

        # Check out of scope
        ser = OrganizationSerializer(instance=self.organizations[0], context=ctx)
        instance = self.organizations[0]
        assert ser.get_read_perm_method(ser.fields["name"])(instance=instance) is False
        assert ser.get_write_perm_method(ser.fields["name"])(instance=instance) is False
        assert ser.get_read_perm_method(ser.fields["state"])(instance=instance) is False
        assert ser.get_write_perm_method(ser.fields["state"])(instance=instance) is False
        assert ser.get_read_perm_method(ser.fields["channelPartnerAccessLevel"])(instance=instance) is False
        assert ser.get_write_perm_method(ser.fields["channelPartnerAccessLevel"])(instance=instance) is False
        assert ser.get_read_perm_method(ser.fields["attributes"])(instance=instance) is False
        assert ser.get_write_perm_method(ser.fields["attributes"])(instance=instance) is False

        #  Check user's organization  for Org Admin
        ser = OrganizationSerializer(instance=self.organizations[1], context=ctx)
        instance = self.organizations[1]
        assert ser.get_read_perm_method(ser.fields["name"])(instance=instance) is True
        assert ser.get_write_perm_method(ser.fields["name"])(instance=instance) is True
        assert ser.get_read_perm_method(ser.fields["state"])(instance=instance) is True
        assert ser.get_write_perm_method(ser.fields["state"])(instance=instance) is False
        assert ser.get_read_perm_method(ser.fields["channelPartnerAccessLevel"])(instance=instance) is True
        assert ser.get_write_perm_method(ser.fields["channelPartnerAccessLevel"])(instance=instance) is True
        assert ser.get_read_perm_method(ser.fields["attributes"])(instance=instance) is True
        assert ser.get_write_perm_method(ser.fields["attributes"])(instance=instance) is False

        #  Check user's organization  for Power User
        ser = OrganizationSerializer(instance=self.organizations[1], context=ctx)
        request.user = org_power_user.user
        instance = self.organizations[1]
        assert ser.get_read_perm_method(ser.fields["name"])(instance=instance) is True
        assert ser.get_write_perm_method(ser.fields["name"])(instance=instance) is False
        assert ser.get_read_perm_method(ser.fields["state"])(instance=instance) is True
        assert ser.get_write_perm_method(ser.fields["state"])(instance=instance) is False
        assert ser.get_read_perm_method(ser.fields["channelPartnerAccessLevel"])(instance=instance) is False
        assert ser.get_write_perm_method(ser.fields["channelPartnerAccessLevel"])(instance=instance) is False
        assert ser.get_read_perm_method(ser.fields["attributes"])(instance=instance) is True
        assert ser.get_write_perm_method(ser.fields["attributes"])(instance=instance) is False

        #  Check user's organization  for Viewer
        request.user = org_viewer.user
        ser = OrganizationSerializer(instance=self.organizations[1], context=ctx)
        instance = self.organizations[1]
        assert ser.get_read_perm_method(ser.fields["name"])(instance=instance) is True
        assert ser.get_write_perm_method(ser.fields["name"])(instance=instance) is False
        assert ser.get_read_perm_method(ser.fields["state"])(instance=instance) is True
        assert ser.get_write_perm_method(ser.fields["state"])(instance=instance) is False
        assert ser.get_read_perm_method(ser.fields["channelPartnerAccessLevel"])(instance=instance) is False
        assert ser.get_write_perm_method(ser.fields["channelPartnerAccessLevel"])(instance=instance) is False
        assert ser.get_read_perm_method(ser.fields["attributes"])(instance=instance) is True
        assert ser.get_write_perm_method(ser.fields["attributes"])(instance=instance) is False


    def test_group_admin(self, organization_factory, sys_group_user_factory, arf):
        request = arf.get('/')
        org = self.organizations[1]
        group = self.groups[1]
        group_admin = sys_group_user_factory(organization=org, group=group,
                                             role_id=OrganizationRoles.ORGANIZATION_ADMINISTRATOR)
        group_power_user = sys_group_user_factory(organization=org, group=group,
                                                  role_id=OrganizationRoles.POWER_USER)
        group_viewer = sys_group_user_factory(organization=org, group=group,
                                                    role_id=OrganizationRoles.VIEWER)
        request.user = group_admin.user
        ctx = {'request': request}

        # Check out of scope
        ser = OrganizationSerializer(instance=self.organizations[0], context=ctx)
        instance = self.organizations[0]
        assert ser.get_read_perm_method(ser.fields["name"])(instance=instance) is False
        assert ser.get_write_perm_method(ser.fields["name"])(instance=instance) is False
        assert ser.get_read_perm_method(ser.fields["state"])(instance=instance) is False
        assert ser.get_write_perm_method(ser.fields["state"])(instance=instance) is False
        assert ser.get_read_perm_method(ser.fields["channelPartnerAccessLevel"])(instance=instance) is False
        assert ser.get_write_perm_method(ser.fields["channelPartnerAccessLevel"])(instance=instance) is False
        assert ser.get_read_perm_method(ser.fields["attributes"])(instance=instance) is False
        assert ser.get_write_perm_method(ser.fields["attributes"])(instance=instance) is False

        #  Check user's organization  for Org Admin
        ser = OrganizationSerializer(instance=self.organizations[1], context=ctx)
        instance = self.organizations[1]
        assert ser.get_read_perm_method(ser.fields["name"])(instance=instance) is True
        assert ser.get_write_perm_method(ser.fields["name"])(instance=instance) is False
        assert ser.get_read_perm_method(ser.fields["state"])(instance=instance) is True
        assert ser.get_write_perm_method(ser.fields["state"])(instance=instance) is False
        assert ser.get_read_perm_method(ser.fields["channelPartnerAccessLevel"])(instance=instance) is True
        assert ser.get_write_perm_method(ser.fields["channelPartnerAccessLevel"])(instance=instance) is False
        assert ser.get_read_perm_method(ser.fields["attributes"])(instance=instance) is True
        assert ser.get_write_perm_method(ser.fields["attributes"])(instance=instance) is False

        #  Check user's organization  for Power User
        ser = OrganizationSerializer(instance=self.organizations[1], context=ctx)
        request.user = group_power_user.user
        instance = self.organizations[1]
        assert ser.get_read_perm_method(ser.fields["name"])(instance=instance) is True
        assert ser.get_write_perm_method(ser.fields["name"])(instance=instance) is False
        assert ser.get_read_perm_method(ser.fields["state"])(instance=instance) is True
        assert ser.get_write_perm_method(ser.fields["state"])(instance=instance) is False
        assert ser.get_read_perm_method(ser.fields["channelPartnerAccessLevel"])(instance=instance) is False
        assert ser.get_write_perm_method(ser.fields["channelPartnerAccessLevel"])(instance=instance) is False
        assert ser.get_read_perm_method(ser.fields["attributes"])(instance=instance) is True
        assert ser.get_write_perm_method(ser.fields["attributes"])(instance=instance) is False

        #  Check user's organization  for Viewer
        request.user = group_viewer.user
        ser = OrganizationSerializer(instance=self.organizations[1], context=ctx)
        instance = self.organizations[1]
        assert ser.get_read_perm_method(ser.fields["name"])(instance=instance) is True
        assert ser.get_write_perm_method(ser.fields["name"])(instance=instance) is False
        assert ser.get_read_perm_method(ser.fields["state"])(instance=instance) is True
        assert ser.get_write_perm_method(ser.fields["state"])(instance=instance) is False
        assert ser.get_read_perm_method(ser.fields["channelPartnerAccessLevel"])(instance=instance) is False
        assert ser.get_write_perm_method(ser.fields["channelPartnerAccessLevel"])(instance=instance) is False
        assert ser.get_read_perm_method(ser.fields["attributes"])(instance=instance) is True
        assert ser.get_write_perm_method(ser.fields["attributes"])(instance=instance) is False


    def test_serializer_many(self, org_user_factory, arf):
        cp_user = org_user_factory(organization=self.organizations[2], role='Administrator')
        request = arf.get('/')
        request.user = cp_user.user
        ctx = {'request': request}
        ser = OrganizationSerializer(self.organizations, many=True, context=ctx)
        data = ser.data
        assert data[0]['name'] == VALUE_REPLACEMENT
        assert data[1]['name'] == VALUE_REPLACEMENT
        assert data[2]['name'] == self.organizations[2].name
        assert data[3]['name'] == VALUE_REPLACEMENT
        assert data[4]['name'] == VALUE_REPLACEMENT

    def test_cpal(self, cp_user_factory, arf):
        self.organizations[0].channel_partner_access_level_id = OrganizationRoles.ORGANIZATION_ADMINISTRATOR
        self.organizations[0].save()
        user_0 = cp_user_factory(channel_partner=self.partners[0])
        self.organizations[1].channel_partner_access_level_id = OrganizationRoles.SYSTEM_HEALTH_VIEWER
        self.organizations[1].save()
        user_1 = cp_user_factory(channel_partner=self.partners[1])
        self.organizations[2].channel_partner_access_level_id = OrganizationRoles.SYSTEM_HEALTH_VIEWER
        self.organizations[2].save()
        user_2 = cp_user_factory(channel_partner=self.partners[2])

        request = arf.get('/')
        request.user = user_0.user
        ctx = {'request': request}
        instance = self.organizations[0]
        ser = OrganizationSerializer(instance, context=ctx)
        assert ser.get_read_perm_method(ser.fields["name"])(instance=instance) is True
        assert ser.get_write_perm_method(ser.fields["name"])(instance=instance) is True # CPAL permission
        assert ser.get_read_perm_method(ser.fields["channelPartnerAccessLevel"])(instance=instance) is True
        assert ser.get_write_perm_method(ser.fields["channelPartnerAccessLevel"])(instance=instance) is True # CPAL

        request.user = user_1.user
        instance = self.organizations[1]
        ser = OrganizationSerializer(instance, context=ctx)
        assert ser.get_read_perm_method(ser.fields["name"])(instance=instance) is True
        assert ser.get_write_perm_method(ser.fields["name"])(instance=instance) is False
        assert ser.get_read_perm_method(ser.fields["channelPartnerAccessLevel"])(instance=instance) is True # CP role
        assert ser.get_write_perm_method(ser.fields["channelPartnerAccessLevel"])(instance=instance) is False

        request.user = user_2.user
        instance = self.organizations[2]
        ser = OrganizationSerializer(instance, context=ctx)
        assert ser.get_read_perm_method(ser.fields["name"])(instance=instance) is True
        assert ser.get_write_perm_method(ser.fields["name"])(instance=instance) is False
        assert ser.get_read_perm_method(ser.fields["channelPartnerAccessLevel"])(instance=instance) is True # CP role
        assert ser.get_write_perm_method(ser.fields["channelPartnerAccessLevel"])(instance=instance) is False


class TestCloudSystemSerializerFieldAccessLevels:

    @pytest.fixture(autouse=True)
    def setup(self, channel_partner_factory, organization_factory, system_factory,
              cp_user_factory, org_user_factory, system_group_factory):
        self.partners = []
        parent = None
        for _ in range(5):
            parent = channel_partner_factory(parent_channel_partner=parent)
            self.partners.append(parent)
        self.organizations = [
            organization_factory(channel_partner=cp, channel_partner_access_level_id=None) for cp in self.partners]
        self.groups = [system_group_factory(organization=org) for org in self.organizations]
        self.systems = [
            system_factory(organization=org, system_group=group) for org, group in zip(self.organizations, self.groups)
        ]
        clean_cache()

    def test_cp_admin(self, cp_user_factory, org_user_factory, arf):
        request = arf.get('/')
        cp_user = cp_user_factory(channel_partner=self.partners[1], role='Administrator')
        request.user = cp_user.user
        ctx = {'request': request}
        # Check user parent
        ser = CloudSystemSerializer(instance=self.systems[0], context=ctx)
        check_matrix(ser.user_access_matrix.access_matrix)
        instance = self.systems[0]
        assert ser.get_read_perm_method(ser.fields["name"])(instance=instance) is False
        assert ser.get_write_perm_method(ser.fields["name"])(instance=instance) is False
        assert ser.get_read_perm_method(ser.fields["state"])(instance=instance) is False
        assert ser.get_write_perm_method(ser.fields["state"])(instance=instance) is False

        #  Check user cp's organization
        ser = CloudSystemSerializer(instance=self.systems[1], context=ctx)
        check_matrix(ser.user_access_matrix.access_matrix)
        instance = self.systems[1]
        assert ser.get_read_perm_method(ser.fields["name"])(instance=instance) is True
        assert ser.get_write_perm_method(ser.fields["name"])(instance=instance) is False
        assert ser.get_read_perm_method(ser.fields["state"])(instance=instance) is True
        assert ser.get_write_perm_method(ser.fields["state"])(instance=instance) is True

        #  Check user child cp organization
        ser = CloudSystemSerializer(instance=self.systems[2], context=ctx)
        check_matrix(ser.user_access_matrix.access_matrix)
        instance = self.systems[2]
        assert ser.get_read_perm_method(ser.fields["name"])(instance=instance) is False
        assert ser.get_write_perm_method(ser.fields["name"])(instance=instance) is False
        assert ser.get_read_perm_method(ser.fields["state"])(instance=instance) is False
        assert ser.get_write_perm_method(ser.fields["state"])(instance=instance) is False

        #  Check levels down
        ser = CloudSystemSerializer(instance=self.systems[3], context=ctx)
        check_matrix(ser.user_access_matrix.access_matrix)
        instance = self.systems[3]
        assert ser.get_read_perm_method(ser.fields["name"])(instance=instance) is False
        assert ser.get_write_perm_method(ser.fields["name"])(instance=instance) is False
        assert ser.get_read_perm_method(ser.fields["state"])(instance=instance) is False
        assert ser.get_write_perm_method(ser.fields["state"])(instance=instance) is False

        #  Check levels down
        ser = CloudSystemSerializer(instance=self.systems[4], context=ctx)
        check_matrix(ser.user_access_matrix.access_matrix)
        instance = self.systems[4]
        assert ser.get_read_perm_method(ser.fields["name"])(instance=instance) is False
        assert ser.get_write_perm_method(ser.fields["name"])(instance=instance) is False
        assert ser.get_read_perm_method(ser.fields["state"])(instance=instance) is False
        assert ser.get_write_perm_method(ser.fields["state"])(instance=instance) is False

    def test_org_admin(self, organization_factory, org_user_factory, arf):
        request = arf.get('/')
        org = self.organizations[1]
        org_admin = org_user_factory(organization=org, role='Organization Administrator')
        org_power_user = org_user_factory(organization=org, role='Power User')
        org_viewer = org_user_factory(organization=org, role='Viewer')
        request.user = org_admin.user
        ctx = {'request': request}

        # Check out of scope
        ser = CloudSystemSerializer(instance=self.systems[0], context=ctx)
        instance = self.systems[0]
        assert ser.get_read_perm_method(ser.fields["name"])(instance=instance) is False
        assert ser.get_write_perm_method(ser.fields["name"])(instance=instance) is False
        assert ser.get_read_perm_method(ser.fields["state"])(instance=instance) is False
        assert ser.get_write_perm_method(ser.fields["state"])(instance=instance) is False

        #  Check user's organization  for Org Admin
        ser = CloudSystemSerializer(instance=self.systems[1], context=ctx)
        instance = self.systems[1]
        assert ser.get_read_perm_method(ser.fields["name"])(instance=instance) is True
        assert ser.get_write_perm_method(ser.fields["name"])(instance=instance) is True
        assert ser.get_read_perm_method(ser.fields["state"])(instance=instance) is True
        assert ser.get_write_perm_method(ser.fields["state"])(instance=instance) is False

        #  Check user's organization  for Power User
        ser = CloudSystemSerializer(instance=self.systems[1], context=ctx)
        request.user = org_power_user.user
        instance = self.systems[1]
        assert ser.get_read_perm_method(ser.fields["name"])(instance=instance) is True
        assert ser.get_write_perm_method(ser.fields["name"])(instance=instance) is False
        assert ser.get_read_perm_method(ser.fields["state"])(instance=instance) is True
        assert ser.get_write_perm_method(ser.fields["state"])(instance=instance) is False

        #  Check user's organization  for Viewer
        request.user = org_viewer.user
        ser = CloudSystemSerializer(instance=self.systems[1], context=ctx)
        instance = self.systems[1]
        assert ser.get_read_perm_method(ser.fields["name"])(instance=instance) is True
        assert ser.get_write_perm_method(ser.fields["name"])(instance=instance) is False
        assert ser.get_read_perm_method(ser.fields["state"])(instance=instance) is True
        assert ser.get_write_perm_method(ser.fields["state"])(instance=instance) is False

    def test_group_admin(self, organization_factory, sys_group_user_factory, arf):
        request = arf.get('/')
        org = self.organizations[1]
        group = self.groups[1]
        group_admin = sys_group_user_factory(organization=org, group=group,
                                             role_id=OrganizationRoles.ORGANIZATION_ADMINISTRATOR)
        group_power_user = sys_group_user_factory(organization=org, group=group,
                                                  role_id=OrganizationRoles.POWER_USER)
        group_admin_viewer = sys_group_user_factory(organization=org, group=group,
                                                    role_id=OrganizationRoles.VIEWER)
        request.user = group_admin.user
        ctx = {'request': request}

        # Check out of scope
        ser = CloudSystemSerializer(instance=self.systems[0], context=ctx)
        instance = self.systems[0]
        assert ser.get_read_perm_method(ser.fields["name"])(instance=instance) is False
        assert ser.get_write_perm_method(ser.fields["name"])(instance=instance) is False
        assert ser.get_read_perm_method(ser.fields["state"])(instance=instance) is False
        assert ser.get_write_perm_method(ser.fields["state"])(instance=instance) is False

        #  Check user's organization  for Org Admin
        ser = CloudSystemSerializer(instance=self.systems[1], context=ctx)
        instance = self.systems[1]
        assert ser.get_read_perm_method(ser.fields["name"])(instance=instance) is True
        assert ser.get_write_perm_method(ser.fields["name"])(instance=instance) is False
        assert ser.get_read_perm_method(ser.fields["state"])(instance=instance) is True
        assert ser.get_write_perm_method(ser.fields["state"])(instance=instance) is False

        #  Check user's organization  for Power User
        ser = CloudSystemSerializer(instance=self.systems[1], context=ctx)
        request.user = group_power_user.user
        instance = self.systems[1]
        assert ser.get_read_perm_method(ser.fields["name"])(instance=instance) is True
        assert ser.get_write_perm_method(ser.fields["name"])(instance=instance) is False
        assert ser.get_read_perm_method(ser.fields["state"])(instance=instance) is True
        assert ser.get_write_perm_method(ser.fields["state"])(instance=instance) is False

        #  Check user's organization  for Viewer
        request.user = group_admin_viewer.user
        ser = CloudSystemSerializer(instance=self.systems[1], context=ctx)
        instance = self.systems[1]
        assert ser.get_read_perm_method(ser.fields["name"])(instance=instance) is True
        assert ser.get_write_perm_method(ser.fields["name"])(instance=instance) is False
        assert ser.get_read_perm_method(ser.fields["state"])(instance=instance) is True
        assert ser.get_write_perm_method(ser.fields["state"])(instance=instance) is False


    def test_serializer_many(self, org_user_factory, arf):
        cp_user = org_user_factory(organization=self.organizations[2], role='Administrator')
        request = arf.get('/')
        request.user = cp_user.user
        ctx = {'request': request}
        ser = OrganizationSerializer(self.organizations, many=True, context=ctx)
        data = ser.data
        assert data[0]['name'] == VALUE_REPLACEMENT
        assert data[1]['name'] == VALUE_REPLACEMENT
        assert data[2]['name'] == self.organizations[2].name
        assert data[3]['name'] == VALUE_REPLACEMENT
        assert data[4]['name'] == VALUE_REPLACEMENT

    def test_cpal(self, cp_user_factory, arf):
        self.organizations[0].channel_partner_access_level_id = OrganizationRoles.ORGANIZATION_ADMINISTRATOR
        self.organizations[0].save()
        user_0 = cp_user_factory(channel_partner=self.partners[0])
        self.organizations[1].channel_partner_access_level_id = OrganizationRoles.SYSTEM_HEALTH_VIEWER
        self.organizations[1].save()
        user_1 = cp_user_factory(channel_partner=self.partners[1])
        self.organizations[2].channel_partner_access_level_id = OrganizationRoles.SYSTEM_HEALTH_VIEWER
        self.organizations[2].save()
        user_2 = cp_user_factory(channel_partner=self.partners[2])

        request = arf.get('/')
        request.user = user_0.user
        ctx = {'request': request}
        instance = self.systems[0]
        ser = OrganizationSerializer(instance, context=ctx)
        assert ser.get_read_perm_method(ser.fields["name"])(instance=instance) is True
        assert ser.get_write_perm_method(ser.fields["name"])(instance=instance) is True # CPAL permission

        request.user = user_1.user
        instance = self.systems[1]
        ser = OrganizationSerializer(instance, context=ctx)
        assert ser.get_read_perm_method(ser.fields["name"])(instance=instance) is True
        assert ser.get_write_perm_method(ser.fields["name"])(instance=instance) is False

        request.user = user_2.user
        instance = self.systems[2]
        ser = OrganizationSerializer(instance, context=ctx)
        assert ser.get_read_perm_method(ser.fields["name"])(instance=instance) is True
        assert ser.get_write_perm_method(ser.fields["name"])(instance=instance) is False
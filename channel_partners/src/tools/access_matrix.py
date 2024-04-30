import abc
import dataclasses
import json
import os.path
import typing as t
from dataclasses import dataclass
from enum import StrEnum
from uuid import UUID

from django.conf import settings
from django.core.cache import caches
from django.utils.functional import cached_property

from partners.models import (
    ChannelPartner,
    ChannelPartnerRoles,
    ChannelPartnerToUser,
    CloudSystemId,
    CloudUser,
    HierarchyLevels,
    Organization,
    OrganizationToUser,
    get_channel_partner_roles,
    get_organization_roles,
)


class NoFieldAccess(Exception):
    pass


class AccessTypes(StrEnum):
    read = "read"
    write = "write"


def process_levels(levels: t.List[dict]) -> dict:
    res = {AccessTypes.read: [], AccessTypes.write: []}
    for level in levels:
        if level.get("can_read") is True:
            res[AccessTypes.read].append(level.get("owning_level"))
        if level.get("can_write") is True:
            res[AccessTypes.write].append(level.get("owning_level"))
    return res


def process_filed_permissions(field_permissions: t.List[dict], levels_class=dict) -> dict:
    return {
        p["permission"]: levels_class(**process_levels(p["access_levels"]))
        for p in field_permissions
    }


@dataclass
class FieldPermission:
    read: t.List[int | None] = dataclasses.field(default_factory=list)
    write: t.List[int | None] = dataclasses.field(default_factory=list)

    def has_level_access(self, access_type: AccessTypes,  level: int):
        levels = getattr(self, access_type, [])
        if level <= HierarchyLevels.direct_child and level in levels:
            return True
        if level > HierarchyLevels.direct_child and None in levels:
                return True
        return False

    def get_levels(self, access_type: AccessTypes) -> t.List:
        # Used for tests
        return getattr(self, access_type, [])


class FieldPermissionDict(dict):

    def has_level_access(self, access_type: AccessTypes,  level: int):
        levels = self.get(access_type, [])
        if level <= HierarchyLevels.direct_child and level in levels:
            return True
        if level > HierarchyLevels.direct_child and None in levels:
                return True
        return False

    def get_levels(self, access_type: AccessTypes) -> t.List:
        # Used for tests
        return self.get(access_type, [])


class ContentField:

    def __init__(self, field_permissions: t.List[dict]):
        self.permissions_names = []
        for permission, levels in process_filed_permissions(field_permissions).items():
            setattr(self, permission, FieldPermission(**levels))
            self.permissions_names.append(permission)

    def get(self, permission_name) -> FieldPermission:
        return getattr(self, permission_name, None)

    def has_permission_access(self, permission_name: str, access_type: AccessTypes, level: int | None):
        if not (field_permissions := self.get(permission_name)):
            # if a permission is not explicitly defined in the json file field
            # attribute it does not grant permission to access a field
            return False

        return field_permissions.has_level_access(access_type=access_type, level=level)

    def get_field_permissions(self, access_type: AccessTypes) -> dict:
        levels = {}
        for permission_name in self.permissions_names:
            if not (permission := self.get(permission_name)):
                continue
            allowed_levels = permission.get_levels(access_type=access_type)
            for level in allowed_levels:
                levels[level] = levels.get(level, set()) | {permission_name}
        return levels


class ContentFieldDict(dict):
    def has_permission_access(self, permission_name: str, access_type: AccessTypes, level: int | None):
        if not (field_permissions := self.get(permission_name)):
            # if a permission is not explicitly defined in the json file field
            # attribute it does not grant permission to access a field
            return False

        return field_permissions.has_level_access(access_type=access_type, level=level)


class ContentFields:

    def __init__(self, content_matrix_data):
        self.fields = []
        for field in content_matrix_data.get("fields", []):
            setattr(self, field["target_field"], ContentField(field_permissions=field["permissions"]))
            self.fields.append(field["target_field"])

    def get(self, field_name) -> ContentField | None:
        return getattr(self, field_name, None)

    def __iter__(self):
        return iter(self.fields)

    def has_field_access(self, field_name: str, permission_name: str,
                         access_type: AccessTypes, level: int | None) -> bool:
        if not (field := self.get(field_name)):
            # if a field is not explicitly defined in the json file then
            # field has full access for everyone
            return True

        return field.has_permission_access(permission_name=permission_name,
                                           access_type=access_type, level=level)

    def check_permissions_access(self, user_permissions: t.Iterable[str], field_name: str,
                                 access_type: AccessTypes, level: int):
        for permission_name in user_permissions:
            if self.has_field_access(field_name=field_name, permission_name=permission_name,
                                     access_type=access_type, level=level):
                return True
        return False

    def allowed_field_levels(self, field_name: str, access_type: AccessTypes) -> None | dict:
        if field := self.get(field_name):
            return field.get_field_permissions(access_type=access_type)


class ContentFieldsDictionary(dict):

    def has_field_access(self, field_name: str, permission_name: str,
                         access_type: AccessTypes, level: int | None) -> bool:
        if not (field := self.get(field_name)):
            # if a field is not explicitly defined in the json file then
            # field has full access for everyone
            return True

        return field.has_permission_access(permission_name=permission_name,
                                           access_type=access_type, level=level)

    def check_permissions_access(self, user_permissions: t.Iterable[str], field_name: str,
                                 access_type: AccessTypes, level: int):
        for permission_name in user_permissions:
            if self.has_field_access(field_name=field_name, permission_name=permission_name,
                                     access_type=access_type, level=level):
                return True
        return False


def process_matrix_content(content_matrix_data) -> ContentFieldsDictionary:
    matrix_dict = ContentFieldsDictionary()
    for field in content_matrix_data.get("fields", []):
        matrix_dict[field["target_field"]] = ContentFieldDict(
            process_filed_permissions(field["permissions"], levels_class=FieldPermissionDict).items())
    return matrix_dict


class MatricesLoaderBase(abc.ABC):

    def __init__(self, content_type: str):
        """
        Params:
            content_type (str): data content type (not a django one) determine what
             data matrix must be loaded for. e.g. channelpartner, organization, cloudsystem
        """
        self.content_type = content_type


    def matrix_content_data(self):
        file_name = os.path.join(settings.BASE_DIR, 'partners/data/access_matrix.json')
        with open(file_name, 'r') as fp:
            data = json.load(fp)
        return next(filter(lambda x: x["target_content"] == self.content_type, data))

    @abc.abstractmethod
    def load_data(self) -> ContentFields:
        ...


class AccessMatrixBase:
    loader_class: t.Type[MatricesLoaderBase] = None

    def __init__(self, content_type: str):
        if not self.loader_class:
            raise NotImplementedError("loader_class attribute must be set.")
        self.content_type = content_type
        self.fields = self.loader.load_data()
        self.channel_partner_roles = get_channel_partner_roles()
        self.organization_roles = get_organization_roles()

    @property
    def loader(self) -> MatricesLoaderBase:
        return self.loader_class(content_type=self.content_type)

    @staticmethod
    def cache_key(content_type):
        return f'access_matrix_{content_type}'

    @classmethod
    def load_matrix(cls, content_type):
        if matrix := caches['local'].get(cls.cache_key(content_type)):
            return matrix
        matrix = cls(content_type=content_type)
        caches['local'].set(cls.cache_key(content_type), matrix)
        return matrix

    def check_permissions_access(self, user_permissions: t.Iterable[str], field_name: str,
                                 access_type: AccessTypes, level: int):
        return self.fields.check_permissions_access(
            user_permissions=user_permissions,
            field_name=field_name, access_type=access_type,
            level=level
        )


class MatrixFileLoader(MatricesLoaderBase):

    def load_data(self):
        return ContentFields(self.matrix_content_data())


class MatrixDictLoader(MatricesLoaderBase):

    def load_data(self) -> ContentFieldsDictionary:
        return process_matrix_content(self.matrix_content_data())


class AccessMatrixJson(AccessMatrixBase):
    loader_class = MatrixFileLoader


class AccessMatrixDict(AccessMatrixBase):
    loader_class = MatrixDictLoader


class UserAccessMatrix:
    matrix_class = AccessMatrixJson

    def __init__(self, cloud_user: CloudUser, content_type: str, request=None):
        self.content_type = content_type
        # for list views organizations and channel partner must be prefetched
        self.cloud_user = cloud_user
        self.access_matrix = self.matrix_class.load_matrix(content_type=content_type)
        self.request = request

    @cached_property
    def user_channel_partners(self):
        return self.cloud_user.channelpartnertouser_set.all().prefetch_related('channel_partner')

    @cached_property
    def user_organizations(self):
        return self.cloud_user.organizationtouser_set.all().prefetch_related('organization', 'system_group')

    def get_cp_to_user_rel(self, channel_partner_id: UUID) -> None | ChannelPartnerToUser:
        return next(
            filter(lambda r: r.channel_partner_id == channel_partner_id, self.user_channel_partners), None)

    def get_org_to_user_rels(self, organization_id: UUID) -> t.List[OrganizationToUser]:
        def filter_func(rel):
            return rel.organization_id == organization_id and rel.system_group_id is None

        return [rel for rel in filter(filter_func, self.user_organizations)]

    def get_group_to_user_rels(
            self, group_id: UUID = None, organization_id: UUID = None) -> t.List[OrganizationToUser]:
        if group_id:
            def filter_func(rel):
                return rel.system_group_id == group_id
        else:
            def filter_func(rel):
                return rel.organization_id == organization_id and rel.system_group_id is not None

        return [rel for rel in filter(filter_func, self.user_organizations)]

    def get_instance_to_user_rels(
            self, instance: ChannelPartner | Organization | CloudSystemId
    ) -> t.List[ChannelPartnerToUser | OrganizationToUser]:
        if isinstance(instance, ChannelPartner):
            if rel := self.get_cp_to_user_rel(instance.id):
                return [rel]
            return []
        if isinstance(instance, Organization):
            return self.get_org_to_user_rels(instance.id)

        if isinstance(instance, CloudSystemId):
            rels = self.get_org_to_user_rels(instance.organization_id)
            for group_id in instance.groups_path:
                rels += self.get_group_to_user_rels(group_id)
            return rels

    def get_user_instance_roles(self, instance: ChannelPartner | Organization | CloudSystemId):
        roles = set()
        for rel in self.get_instance_to_user_rels(instance):
            roles |= set(rel.roles or [])
        return roles

    def get_user_permissions(self, instance: Organization | ChannelPartner | CloudSystemId,
                             user_roles: t.Iterable[UUID]):
        if isinstance(instance, Organization) or isinstance(instance, CloudSystemId):
            return self.get_org_permissions(user_roles=user_roles)
        elif isinstance(instance, ChannelPartner):
            return self.get_cp_permissions(user_roles=user_roles)
        else:
            raise TypeError(f"{instance} must be an object of ChannelPartner"
                            f" or Organization, not {instance.__class__}")

    def get_org_permissions(self, user_roles: t.Iterable, filtered=True):
        roles = self.access_matrix.organization_roles
        permissions = set()
        for role in user_roles:
            permissions |= set(roles.get(role, {}).get('permissions', []))
        if filtered:
            return {perm for perm in permissions if perm.startswith('field_access')}
        return permissions

    def get_cp_permissions(self, user_roles, filtered=True):
        roles = self.access_matrix.channel_partner_roles
        permissions = set()
        for role in user_roles:
            permissions |= set(roles.get(role, {}).get('permissions', []))
        if filtered:
            return {perm for perm in permissions if perm.startswith('field_access')}
        return permissions

    def get_instance_hierarchy_level(self, instance):
        for qs in (self.user_channel_partners, self.user_organizations):
            for user_rel in qs:
                if (hierarchy_level := user_rel.get_hierarchy_level(instance)) is None:
                    continue
                if hierarchy_level > HierarchyLevels.direct_child:
                    yield None, user_rel
                yield hierarchy_level, user_rel

    def check_permission(self, field_name: str, access_type: AccessTypes,
                         target_instance: ChannelPartner | Organization | CloudSystemId) -> bool:
        if field_name not in self.access_matrix.fields:
            # if field not explicitly defined in json access is always allowed
            return True

        # check if authenticated user is a VMS user with some roles.
        # partners.authentication.CdbInternalAuthentication.has_vms_roles
        if (
            (system_introspection := getattr(self.request, 'system_introspection', None))
            and (system_id := getattr(target_instance, 'system_id', None))
        ):
            if system_introspection.introspected_systems_roles.get(system_id):
                return True

        levels_permissions = self.access_matrix.fields.allowed_field_levels(field_name=field_name,
                                                                            access_type=access_type)
        for level, user_rel in self.get_instance_hierarchy_level(instance=target_instance):
            # group roles do not allow to write
            if access_type == AccessTypes.write and getattr(user_rel, 'system_group_id', None):
                continue
            if needed_permissions := levels_permissions.get(level):
                if isinstance(user_rel, OrganizationToUser):
                    user_permissions = self.get_org_permissions(user_rel.roles)
                else:
                    user_permissions = self.get_cp_permissions(user_rel.roles)
                if needed_permissions.intersection(user_permissions):
                    return True
            # cpal
            cpal_needs = levels_permissions.get(HierarchyLevels.own)
            if all([
                    level == HierarchyLevels.direct_child,
                    cpal_needs,
                    isinstance(user_rel, ChannelPartnerToUser),
                    not isinstance(target_instance, ChannelPartner),
                    set(user_rel.roles).intersection({ChannelPartnerRoles.ADMINISTRATOR, ChannelPartnerRoles.MANAGER})
            ]):
                if isinstance(target_instance, Organization):
                    cpal = target_instance.channel_partner_access_level_id
                else:
                    cpal = target_instance.organization.channel_partner_access_level_id
                if cpal_needs.intersection(self.get_org_permissions([cpal])):
                    return True
        return False

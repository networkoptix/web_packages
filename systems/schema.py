from enum import Enum
from marshmallow import Schema, fields, ValidationError, validates


class ActionEnum(Enum):
    AGGREGATE_SYSTEMS_REQUEST = 'aggregate_systems_request'
    AGGREGATE_REQUEST_BY_GROUP = 'aggregate_request_by_group'
    CREATE_GROUP = 'create_group'
    DELETE_GROUP = 'delete_group'
    LIST_GROUP = 'list_groups'
    UPDATE_GROUP = 'update_group'
    MOVE_GROUP = 'move_group'
    MOVE_SYSTEM = 'move_system'
    SYSTEMS = 'systems'
    # CREATE_USER = 'create_user'
    # DELETE_USER = 'delete_user'
    # LIST_USERS = 'list_users'
    # UPDATE_USER = 'update_user'
    CREATE_ORG_USER = 'create_org_user'
    UPDATE_ORG_USER = 'update_org_user'

    @classmethod
    def _get_actions(cls):
        return [item.value for item in cls.__members__.values()]

    @classmethod
    def has_action(cls, action):
        return action in cls._get_actions()

    @classmethod
    def values(cls):
        return cls._get_actions()


class SystemsSchema(Schema):
    pass


class BaseMoveSchema(Schema):
    org_id = fields.Str()
    target_id = fields.Str(required=True)


class MoveGroupSchema(BaseMoveSchema):
    group_id = fields.Str(required=True)


class MoveSystemSchema(BaseMoveSchema):
    system_id = fields.Str(required=True)


class AggregateRequestSchema(Schema):
    method = fields.Str()
    url = fields.Str(required=True)
    post_body = fields.Dict(required=False)


class AggregateRequestByGroupSchema(AggregateRequestSchema):
    group_id = fields.Str(required=True)


class GroupSchema(Schema):
    org_id = fields.Str(required=True)

    @validates('org_id')
    def validate_org_id(self, value):
        if not value:
            raise ValidationError("org_id cannot be blank")


class CreateGroupSchema(GroupSchema):
    name = fields.Str(required=True)
    target_id = fields.Str(required=False)


    @validates("name")
    def validate_name(self, value):
        if not value:
            raise ValidationError("Name cannot be blank")


class TargetGroupSchema(GroupSchema):
    group_id = fields.Str(required=True)


class UpdateGroupSchema(CreateGroupSchema, TargetGroupSchema):
    pass


class UserSchema(Schema):
    org_id = fields.Str(required=True)


class TargetUserSchema(UserSchema):
    email = fields.Str(required=True)


class RoleUserSchema(TargetUserSchema):
    role = fields.Str(required=True)


class CreateUserSchema(RoleUserSchema):
    pass


class DeleteUserSchema(TargetUserSchema):
    pass


class UpdateUserSchema(RoleUserSchema):
    pass


params_to_actions = {
    ActionEnum.AGGREGATE_SYSTEMS_REQUEST: AggregateRequestSchema,
    ActionEnum.AGGREGATE_REQUEST_BY_GROUP: AggregateRequestByGroupSchema,
    ActionEnum.CREATE_GROUP: CreateGroupSchema,
    ActionEnum.DELETE_GROUP: TargetGroupSchema,
    ActionEnum.LIST_GROUP: GroupSchema,
    ActionEnum.UPDATE_GROUP: UpdateGroupSchema,
    ActionEnum.MOVE_GROUP: MoveGroupSchema,
    ActionEnum.MOVE_SYSTEM: MoveSystemSchema,
    ActionEnum.SYSTEMS: SystemsSchema,
    # ActionEnum.CREATE_USER: CreateUserSchema,
    # ActionEnum.DELETE_USER: DeleteUserSchema,
    # ActionEnum.LIST_USERS: UserSchema,
    # ActionEnum.UPDATE_USER: UpdateUserSchema,
    ActionEnum.CREATE_ORG_USER: CreateUserSchema,
    ActionEnum.UPDATE_ORG_USER: UpdateUserSchema,
}

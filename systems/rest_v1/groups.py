from marshmallow import Schema, fields, ValidationError, validates
from quart import Blueprint, request

from views import GroupView
from nx_common import RestConnector

group_blueprint = Blueprint('group', __name__, url_prefix='/group')


class GroupNameSchema(Schema):
    name = fields.Str()

    @validates("name")
    def validate_name(self, value):
        if not value:
            raise ValidationError("Name cannot be blank")


class CreateGroupSchema(GroupNameSchema):
    parent_id = fields.Str(required=False)


@group_blueprint.route('/', methods=['POST'])
async def create_group():
    connector = RestConnector(request)
    try:
        raw_data = await request.get_json()
        data = CreateGroupSchema().load(data=raw_data)
        return GroupView.create_group(data['name'], connector.email, parent_id=data['parent_id'])
    except ValidationError as err:
        return err.messages, 400


@group_blueprint.route('/', methods=['GET'], defaults={'group_id': ''})
@group_blueprint.route('/<group_id>', methods=['GET'])
def get_group(group_id=None):
    connector = RestConnector(request)
    groups = GroupView.list_groups(connector.email, group_id=group_id)
    return {"data": groups}


@group_blueprint.route('/<group_id>', methods=['PATCH'])
async def update_group(group_id):
    connector = RestConnector(request)
    try:
        raw_data = await request.get_json()
        data = GroupNameSchema().load(raw_data)
        results = GroupView.update_group(group_id, connector.email, data['name'])
        if error_code := results.get('error'):
            del results['error']
        return results, error_code or 200

    except ValidationError as err:
        return err.messages, 400


@group_blueprint.route('/<group_id>', methods=['DELETE'])
async def delete_group(group_id):
    connector = RestConnector(request)
    return await GroupView.delete_group(connector.share_system, group_id, connector.email)

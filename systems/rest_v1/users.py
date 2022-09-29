from marshmallow import Schema, fields
from quart import Blueprint, request

from views import UserView
from nx_common import RestConnector


user_blueprint = Blueprint('user', __name__, url_prefix='/user')


class UserRoleSchema(Schema):
    email = fields.Email()
    role = fields.String()


@user_blueprint.route('/<group_id>', methods=['POST'])
async def add_user(group_id):
    connector = RestConnector(request)
    raw_data = await request.get_json()
    data = UserRoleSchema().load(data=raw_data)
    return await UserView.add_user_to_group(
        connector.share_system, group_id, data['email'], data['role'])


@user_blueprint.route('/', methods=['GET'], defaults={'group_id': ''})
@user_blueprint.route('/<group_id>', methods=['GET'])
def list_users(group_id):
    connector = RestConnector(request)
    return UserView.list_users(group_id)


@user_blueprint.route('/<group_id>', methods=['PATCH'])
async def update_user(group_id):
    connector = RestConnector(request)
    raw_data = await request.get_json()
    users = UserRoleSchema(many=True).load(data=raw_data)
    return await UserView.update_users_in_group(connector.share_system, group_id, users)


@user_blueprint.route('/<group_id>', methods=['DELETE'])
async def remove_user(group_id):
    connector = RestConnector(request)
    raw_data = await request.get_json()
    data = UserRoleSchema().load(data=raw_data)
    return await UserView.remove_user_from_group(connector.share_system, group_id, data['email'])

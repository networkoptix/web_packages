from quart import Blueprint, request

from nx_common import is_org_admin, RestConnector, LicenseConnector
from schema import CreateUserSchema, UpdateUserSchema, DeleteUserSchema
from views import OrganizationView

users_blueprint = Blueprint('users', __name__, url_prefix='/users')


@users_blueprint.route('/', methods=['POST'])
@is_org_admin
async def create_org_user():
    raw_data = await request.get_json()
    data = CreateUserSchema().load(raw_data)
    connector = RestConnector(request)
    license_api = LicenseConnector(await connector.email, connector.get_token())
    return await OrganizationView(data).add_user_to_org(connector, license_api)


@users_blueprint.route('/', methods=['PATCH'])
@is_org_admin
async def update_org_user():
    raw_data = await request.get_json()
    data = UpdateUserSchema().load(raw_data)
    connector = RestConnector(request)
    license_api = LicenseConnector(await connector.email, connector.get_token())
    return await OrganizationView(data).update_org_user(connector, license_api)


@users_blueprint.route('/', methods=['DELETE'])
@is_org_admin
async def delete_org_user():
    raw_data = await request.get_json()
    data = DeleteUserSchema().load(raw_data)
    connector = RestConnector(request)
    license_api = LicenseConnector(await connector.email, connector.get_token())
    return await OrganizationView(data).delete_org_user(connector, license_api)
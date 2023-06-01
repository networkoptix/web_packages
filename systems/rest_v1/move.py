from quart import Blueprint, request

from views import GroupView
from nx_common import is_org_admin, RestConnector

move_blueprint = Blueprint('move', __name__, url_prefix='/move')


@move_blueprint.route('/<dst_id>/group/<src_id>', methods=['POST'])
@is_org_admin
async def move_group(dst_id, src_id):
    if not dst_id or not src_id:
        return {'msg': 'source and/or destination group id are missing.'}, 400
    connector = RestConnector(request)
    return await GroupView.move_group_to_group(connector.share_system, src_id, dst_id)


@move_blueprint.route('/<dst_id>/system/<system_id>', methods=['POST'])
@is_org_admin
async def move_system(dst_id, system_id):
    if not dst_id or not system_id:
        return {'msg': 'system and/or destination group id are missing.'}, 400
    connector = RestConnector(request)
    system = await connector.get_system(system_id)
    return await GroupView.move_system_to_group(connector.share_system, dst_id, system)

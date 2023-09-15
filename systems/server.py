import quart.flask_patch  # Keep needed for using flask things in quart
import asyncio
import httpx
import json
import os
from logging.config import dictConfig
from quart import Quart, current_app, websocket

from debug_tools import PrintDebug
from models import db
from nx_common import CloudConnector, LicenseConnector
from rest_v1 import rest_blueprint
from schema import ActionEnum
from views import GroupView, ParamsValidator, OrganizationView

dictConfig({
    'version': 1,
    'loggers': {
        __name__: {
            'level': 'INFO'
        },
        'quart.app': {
            'level': 'INFO',
        },
    },
})


app = Quart(__name__)
# Eventually add db auth.
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
# Database url should be 'mysql+pymysql://{username}:{password}@{db_host}:{db_port}/{db_name}'
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DB_URI') or 'sqlite:///test.sqlite3'

db.init_app(app)
db.create_all(app=app)

app.register_blueprint(rest_blueprint)


class AuthMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if not scope.get('path').startswith('/rest/'):
            return await self.app(scope, receive, send)

        for header, value in scope['headers']:
            if header == b'authorization' and value:
                return await self.app(scope, receive, send)

        return await self.error_response(receive, send)

    async def error_response(self, receive, send):
        await send({
            'type': 'http.response.start',
            'status': 401,
            'headers': [(b'content-length', b'0')],
        })
        await send({
            'type': 'http.response.body',
            'body': b'',
            'more_body': False,
        })


app.asgi_app = AuthMiddleware(app.asgi_app)

async def receiving(cloud_connector):
    await websocket.send(json.dumps({
        'action': 'connected',
        'data': {}
    }))
    user_email = cloud_connector.account.get('email')
    try:
        while True:
            action, data = ParamsValidator.validate_group(await websocket.receive())
            async with LicenseConnector(user_email) as license_api:
                token = await cloud_connector.get_token()
                await license_api.update_token(token)
                try:
                    res = None
                    if action in [ActionEnum.CREATE_GROUP, ActionEnum.DELETE_GROUP, ActionEnum.MOVE_GROUP, ActionEnum.MOVE_SYSTEM, ActionEnum.UPDATE_GROUP]:
                        if not await license_api.is_admin_in_org(data.get('org_id')):
                            data.update({'msg': 'Unauthorized', 'error': 400})
                    if 'error' in data:
                        res = data
                    elif action == ActionEnum.CREATE_GROUP:
                        # TODO: support assigning parent on creation
                        res = GroupView.create_group(data['name'], data.get('org_id'), data.get('target_id'))
                    elif action == ActionEnum.DELETE_GROUP:
                        res = await GroupView.delete_group(cloud_connector.share_system, data['group_id'])
                    elif action == ActionEnum.MOVE_GROUP:
                        res = await GroupView.move_group_to_group(
                            cloud_connector.share_system, data['target_id'], data['group_id'])
                    elif action == ActionEnum.MOVE_SYSTEM:
                        system = await cloud_connector.get_systems(system_id=data['system_id'])
                        res = await GroupView.move_system_to_group(
                            cloud_connector.share_system, data['group_id'], system)
                    elif action == ActionEnum.UPDATE_GROUP:
                        res = await GroupView.update_group(data['group_id'], data['name'])
                    elif action == ActionEnum.SYSTEMS:
                        res = await cloud_connector.get_systems()
                        # app.logger.debug(res)
                    # # User management
                    elif action == ActionEnum.CREATE_ORG_USER:
                        res = await OrganizationView.add_user_to_org(cloud_connector, license_api, token, data['org_id'], data['email'], data['role'], data['groups'])
                    elif action == ActionEnum.UPDATE_ORG_USER:
                        res = await OrganizationView.update_org_user(cloud_connector, license_api, token, data['org_id'], data['email'], data['role'], data['groups'])
                    # End of user management
                    elif action == ActionEnum.AGGREGATE_SYSTEMS_REQUEST:
                        res = await cloud_connector.aggregate_request(
                            data['url'], method=data['method'], post_body=data.get('postBody')
                        )
                    elif action == ActionEnum.AGGREGATE_REQUEST_BY_GROUP:
                        res = await cloud_connector.aggregate_request_by_group(
                            data['group_id'], data['url'], method=data['method'], post_body=data.get('postBody')
                        )
                    elif action != ActionEnum.LIST_GROUP:
                        res = {'msg': 'Please send data in a json format', 'error': 400}

                    if action != ActionEnum.LIST_GROUP:
                        return_data = {
                            'action': action or 'error',
                            'data': res
                        }
                        app.logger.debug(return_data)
                        await websocket.send(json.dumps(return_data))
                    elif (not res or 'error' not in res) and (org_id := data.get('org_id')) and await license_api.is_user_in_org(org_id):
                        await websocket.send(json.dumps({
                            'action': ActionEnum.LIST_GROUP,
                            'data': GroupView.list_groups(org_id)
                        }))

                except httpx.HTTPError as e:
                    await license_api.session.aclose()
                    raise(e)
    except asyncio.CancelledError as e:
        # Handles disconnections
        await cloud_connector.session.aclose()


# Actual views
@app.websocket('/ws')
async def ws():
    if code := websocket.args.get('code'):
        try:
            with PrintDebug(app.logger.debug) as p:
                cloud_connector = CloudConnector()
                p.log('logging in')
                await cloud_connector.login(code)
                p.log('code exchanged for tokens')
                await cloud_connector.get_account_info()
                p.log('user info fetched')
                if not cloud_connector.account or not cloud_connector.account.get('is_authenticated', False):
                    return await websocket.close(401, 'Not Authenticated')
                p.log('starting handler')
            return await asyncio.create_task(receiving(cloud_connector))
        except httpx.HTTPError as e:
            await cloud_connector.session.aclose()
            app.logger.error(e)
            return await websocket.close(500, 'Something went wrong')
    return await websocket.close(400, 'Missing code')


@app.route('/ping')
@app.route('/health')
def server_health():
    app.logger.debug('health check')
    return 'OK', 200


@app.errorhandler(httpx.HTTPError)
def not_found(error):
    return error.response.json(), error.response.status_code


if __name__ == "__main__":
    @app.route('/')
    async def index():
        return await current_app.send_static_file('index.html')

    app.run()

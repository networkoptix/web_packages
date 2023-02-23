import asyncio
import hashlib
import base64

from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from asgiref.sync import sync_to_async
from api.account_backend import get_ip
from cloud.controllers import cloud_api, cloud_gateway
from cloud.controllers.cloud_api import Auth
from cloud.drf_async import async_api_view
from cloud.helpers.exceptions import api_success, require_params, \
     APINotAuthorisedException, APIRequestException, ErrorCodes, APIException, APIInternalException
from api.serializers import *


# Swagger parameters
system_id__route_param = openapi.Parameter(
    'system_id', openapi.IN_PATH, type=openapi.TYPE_STRING, required=True)

# Swagger schemas for body
disconnect_user_email__body = openapi.Schema(type=openapi.TYPE_STRING,
                                             description="If the user is not currently logged in they need to"
                                                         "provide their email.")
master_system_id__body = openapi.Schema(type=openapi.TYPE_STRING,
                                        description="The system that remains after the cloud merge finishes.")
password__body = openapi.Schema(type=openapi.TYPE_STRING)
slave_system_id__body = openapi.Schema(type=openapi.TYPE_STRING,
                                       description="The system that disappears after the cloud merge completes.")
system_id__body = openapi.Schema(type=openapi.TYPE_STRING)
system_name__body = openapi.Schema(
    type=openapi.TYPE_STRING, description="Name of the system.")
mfa_code__body = openapi.Schema(
    type=openapi.TYPE_STRING, description="Verification code from 2fa app.")
user_email__body = openapi.Schema(type=openapi.TYPE_STRING)
user_role__body = openapi.Schema(type=openapi.TYPE_STRING)


def get_refresh_from_request(request):
    refresh_token = request.session.get(
        'refresh_token') or request.data.get('refresh_token')
    if not refresh_token:
        raise APINotAuthorisedException('No refresh token was found')
    return refresh_token


@swagger_auto_schema(method="GET",  # auto_schema=None,
                     operation_description="If the user has access to the system clouddb will return its info.",
                     manual_parameters=[system_id__route_param])
@async_api_view(['GET'])
@permission_classes((IsAuthenticated, ))
async def system(request, system_id):
    data = await sync_to_async(cloud_api.System.get)(request, system_id)
    return api_success(data['systems'])


@swagger_auto_schema(method="GET",  # auto_schema=None,
                     operation_description="Check if license server is cached for system else get default",
                     manual_parameters=[system_id__route_param],
                     responses={
                         '200': openapi.Response('LicenseServer', LicenseServerSerializer)
                     })
@swagger_auto_schema(method="POST",  # auto_schema=None,
                     operation_description="Updates cached license server for system.",
                     manual_parameters=[system_id__route_param],
                     request_body=SystemIdSerializer,
                     responses={
                         '200': openapi.Response('LicenseServer', LicenseServerSerializer)
                     })
@async_api_view(['GET', 'POST'])
@permission_classes((IsAuthenticated, ))
async def license_server(request, system_id):
    # TODO: Add tests for this view.
    #  Actually, there is no asynchronous stuff.
    #  I'm not sure about necessity of these changes.
    serializer = LicenseServerSerializer(
        data={**request.data, 'systemId': system_id})
    serializer.is_valid()

    return api_success(serializer.data)


@swagger_auto_schema(method="GET",  # auto_schema=None,
                     operation_description="Returns a list of systems that the user has access to.")
@async_api_view(['GET'])
@permission_classes((IsAuthenticated, ))
async def list_systems(request):
    data = await sync_to_async(cloud_api.System.list, thread_sensitive=False)(request)
    return api_success(data['systems'])


@swagger_auto_schema(method="GET",  # auto_schema=None,
                     operation_description="Returns a list of cloud users for that system",
                     manual_parameters=[system_id__route_param])
@swagger_auto_schema(method="POST",  # auto_schema=None,
                     operation_description="Adds the account related to user_email to the system. If the account does"
                     "not exist that user_email is sent an invite to register on cloud portal",
                     manual_parameters=[system_id__route_param],
                     request_body=openapi.Schema(
                         type=openapi.TYPE_OBJECT,
                         properties={
                             "role": user_role__body,
                             "user_email": user_email__body
                         },
                         required=["role", "user_email"]
                     ))
@async_api_view(['GET', 'POST'])
@permission_classes((AllowAny, ))
async def sharing(request, system_id):
    if request.method == 'GET':
        if not request.user.is_authenticated:
            raise APINotAuthorisedException(
                'User is not authorized', ErrorCodes.not_authorized)
        # get authorized user here
        data = await sync_to_async(cloud_api.System.users, thread_sensitive=False)(request, system_id)
        return api_success(data['sharing'])

    elif request.method == 'POST':
        require_params(request, ('user_email', 'role'))
        # 2. share or change sharing
        user_email = request.data['user_email'].lower()
        if not request.user.is_authenticated:
            require_params(request, ('email', 'password'))
            login = request.data['email'].lower()
            password = request.data['password']

            with cloud_api.TempLogin(login, password) as credentials:
                data = await sync_to_async(cloud_api.System.share, thread_sensitive=False)(
                    credentials.tokens,
                    system_id,
                    user_email,
                    request.data['role']
                )
        else:
            data = await sync_to_async(cloud_api.System.share, thread_sensitive=False)(
                request,
                system_id,
                user_email,
                request.data['role']
            )

        return api_success(data)


def md5(data):
    m = hashlib.md5()
    m.update(data.encode('utf-8'))
    return m.hexdigest()


def digest(login, password, realm, nonce, method):
    dig = md5(f"{login}:{realm}:{password}")
    method = md5(f"{method}:")
    auth_digest = md5(f"{dig}:{nonce}:{method}")
    auth = f"{login}:{nonce}:{auth_digest}".encode('utf-8')
    return base64.b64encode(auth)


@swagger_auto_schema(method="POST",  # auto_schema=None,
                     operation_description="Returns access code needed to get tokens for a cloud system."
                                           "If system_id is * then a general access code is returned instead.",
                     manual_parameters=[system_id__route_param],
                     request_body=openapi.Schema(
                         type=openapi.TYPE_OBJECT,
                         properties={
                             "refresh_token": openapi.Schema(type=openapi.TYPE_STRING)
                         }
                     ))
@async_api_view(["POST"])
@permission_classes((IsAuthenticated, ))
async def get_code(request, system_id):
    refresh_token = get_refresh_from_request(request)
    scope = None
    if system_id != "*":
        scope = f"cloudSystemId={system_id}"
    data = await sync_to_async(cloud_api.Auth.get_code, thread_sensitive=False)(
        email="",
        password="",
        grant_type=cloud_api.Auth.GRANT_TYPE.refresh_token,
        ip=get_ip(request),
        refresh_token=refresh_token,
        scope=scope
    )
    return api_success(data)


@swagger_auto_schema(method="GET",  # auto_schema=None,
                     operation_description="Returns the auth keys needed to make api requests to a cloud system.",
                     manual_parameters=[system_id__route_param])
@async_api_view(['GET'])
@permission_classes((IsAuthenticated, ))
async def get_auth(request, system_id):
    # Todo: Add oauth support when servers get it.
    data, cred = await asyncio.gather(
        sync_to_async(cloud_api.System.get_nonce, thread_sensitive=False)(request, system_id),
        sync_to_async(cloud_api.Account.create_temporary_credentials, thread_sensitive=False)(
            request, credential_type='short')
    )
    realm = settings.CLOUD_CONNECT['password_realm']
    nonce = data["nonce"]
    login = cred['login']
    password = cred['password']
    return api_success({
        'authGet': digest(login, password, realm, nonce, 'GET'),
        'authPost': digest(login, password, realm, nonce, 'POST'),
        'authPlay': digest(login, password, realm, nonce, 'PLAY')
    })


@swagger_auto_schema(method="POST",  # auto_schema=None,
                     operation_description="Returns access token needed to make api requests to a cloud system.",
                     manual_parameters=[system_id__route_param],
                     request_body=openapi.Schema(
                         type=openapi.TYPE_OBJECT,
                         properties={
                             "refresh_token": openapi.Schema(type=openapi.TYPE_STRING)
                         }
                     ))
@async_api_view(["POST"])
@permission_classes((IsAuthenticated, ))
async def get_token(request, system_id):
    refresh_token = get_refresh_from_request(request)
    data = await sync_to_async(cloud_api.Auth.get_refresh_token, thread_sensitive=False)(
        refresh_token,
        ip=get_ip(request),
        scope=f"cloudSystemId={system_id}"
    )

    if "refresh_token" in data:
        del data["refresh_token"]

    return api_success(data)


@swagger_auto_schema(method="POST",  # auto_schema=None,
                     operation_description="Revokes token used to make api requests to a cloud system.",
                     request_body=openapi.Schema(
                         type=openapi.TYPE_OBJECT,
                         properties={
                             "token": openapi.Schema(type=openapi.TYPE_STRING)
                         }
                     ))
@async_api_view(['POST'])
@permission_classes((IsAuthenticated, ))
async def revoke_token(request):
    require_params(request, ("token",))
    data = await sync_to_async(Auth.delete_token, thread_sensitive=False)(request, request.data.get("token"))
    return api_success(data)


@swagger_auto_schema(method="POST",  # auto_schema=None,
                     operation_description="Renames the cloud system.",
                     manual_parameters=[system_id__route_param],
                     request_body=openapi.Schema(
                         type=openapi.TYPE_OBJECT,
                         properties={
                             'name': system_name__body
                         }
                     ))
@async_api_view(['POST'])
@permission_classes((IsAuthenticated, ))
async def rename(request, system_id):
    require_params(request, ('name',))
    data = await sync_to_async(cloud_api.System.rename, thread_sensitive=False)(
        request, system_id, request.data['name']
    )
    return api_success(data)


@swagger_auto_schema(method="POST",  # auto_schema=None,
                     operation_description="Merges two cloud systems into one.",
                     request_body=openapi.Schema(
                         type=openapi.TYPE_OBJECT,
                         properties={
                             "master_system_id": master_system_id__body,
                             "slave_system_id": slave_system_id__body,
                             "password": password__body
                         }
                     ))
@async_api_view(['POST'])
@permission_classes((IsAuthenticated, ))
async def merge(request):
    require_params(request, ('master_system_id', 'slave_system_id'))
    master_id = request.data['master_system_id']
    slave_id = request.data['slave_system_id']
    if password := request.data.get('password'):
        try:
            data = await sync_to_async(cloud_api.System.merge, thread_sensitive=False)(
                request, master_id, slave_id, email=request.user.email, password=password)
        except APINotAuthorisedException:
            raise APIRequestException('User action was not allowed.', ErrorCodes.wrong_password,
                                      error_data={'password': ['Not recognized']})
        except APIInternalException as e:
            raise APIRequestException(
                e.error_text, ErrorCodes.cloud_invalid_response, error_data=e.error_data)
    else:
        if not request.session["refresh_token"]:
            require_params(request, ("refresh_token",))
            request.session["refresh_token"] = request.data["refresh_token"]
        data = await sync_to_async(cloud_api.System.merge, thread_sensitive=False)(
            request, master_id, slave_id
        )
    return api_success(data)


@swagger_auto_schema(method="GET",  # auto_schema=None,
                     operation_description="Returns the user access roles for the system.",
                     manual_parameters=[system_id__route_param])
@async_api_view(['GET'])
@permission_classes((IsAuthenticated, ))
async def access_roles(request, system_id):
    data = await sync_to_async(cloud_api.System.access_roles, thread_sensitive=False)(request, system_id)
    return api_success(data['accessRoles'])


@swagger_auto_schema(method="POST",  # auto_schema=None,
                     operation_description="Disconnects the system from cloud portal.",
                     request_body=openapi.Schema(
                         type=openapi.TYPE_OBJECT,
                         properties={
                             "email": disconnect_user_email__body,
                             "password": password__body,
                             "system_id": system_id__body
                         },
                         required=["system_id"]
                     ),
                     responses={'200': 'Ok'})
@async_api_view(['POST'])
@permission_classes((AllowAny, ))
async def disconnect(request):
    require_params(request, ('system_id',))

    if request.user.is_authenticated:
        await sync_to_async(cloud_api.System.unbind, thread_sensitive=False)(
            request, request.data['system_id']
        )
    else:
        try:
            require_params(request, ('email', 'password'))
            with cloud_api.TempLogin(request.data['email'].lower(), request.data['password']) as credentials:
                await sync_to_async(cloud_api.System.unbind, thread_sensitive=False)(
                    credentials.tokens, request.data['system_id'])
        except APINotAuthorisedException:
            raise APIRequestException('User action was not allowed.', ErrorCodes.wrong_password,
                                      error_data={'password': ['Not recognized.']})

    return api_success()


@swagger_auto_schema(method="POST",  # auto_schema=None,
                     operation_description="Connects a system to cloud portal. If the user is already logged in only "
                                           "the system_id is required. Otherwise the email and password are required "
                                           "as well.",
                     request_body=openapi.Schema(
                         type=openapi.TYPE_OBJECT,
                         properties={
                             "email": user_email__body,
                             "name": system_name__body,
                             "password": password__body,
                             "system_id": system_id__body,
                         },
                         required=["name", "system_id"]
                     ))
@async_api_view(['POST'])
@permission_classes((AllowAny, ))
async def connect(request):
    require_params(request, ('name',))
    if request.user.is_authenticated:
        data = await sync_to_async(cloud_api.System.bind, thread_sensitive=False)(
            request, request.data['name'], customization=get_customization(request)
        )
        return api_success(data)

    require_params(request, ('email', 'password'))
    with cloud_api.TempLogin(request.data['email'].lower(), request.data['password']) as credentials:
        data = await sync_to_async(cloud_api.System.bind, thread_sensitive=False)(
            credentials.tokens, request.data['name'], customization=get_customization(request)
        )
    return api_success(data)


@swagger_auto_schema(method="POST",  # auto_schema=None,
                     operation_description="Toggles the systems system2faEnabled setting. "
                                           "This setting forces all cloud users for the system to use 2fa",
                     request_body=openapi.Schema(
                         type=openapi.TYPE_OBJECT,
                         properties={
                             "system_id": system_id__body,
                             "mfaCode": mfa_code__body
                         },
                         required=["system_id", "mfaCode"]
                     ))
@async_api_view(['POST'])
@permission_classes((IsAuthenticated, ))
async def toggle2fa(request):
    require_params(request, ('systemId', 'mfaCode'))
    system_id = request.data.get('systemId')
    systems = await sync_to_async(cloud_api.System.get, thread_sensitive=False)(request, system_id)
    target_system = next(filter(lambda s: s['id'] == system_id, systems.get('systems')), {})
    twofa_enabled = target_system.get('system2faEnabled', False)
    data = await sync_to_async(cloud_api.System.update, thread_sensitive=False)(
        request, system_id, request.data.get('mfaCode'), not twofa_enabled
    )
    return api_success(data)


@swagger_auto_schema(method="GET", auto_schema=None,
                     deprecated=True,
                     operation_description="Old way of sending GET request to systems.")
@swagger_auto_schema(method="POST", auto_schema=None,
                     deprecated=True,
                     operation_description="Old way of sending POST request to systems.")
@async_api_view(['GET', 'POST'])
@permission_classes((AllowAny, ))
async def proxy(request, system_id, system_url):
    # Todo: Add oauth support when servers get it.
    email = None
    password = None

    full_url = request.get_full_path()
    position = full_url.find('?')
    if position > -1:
        system_url += full_url[position:]

    if request.user.is_authenticated:
        email = request.user.email
        password = request.session['password']

    if request.method == 'GET':
        data = await sync_to_async(cloud_gateway.get, thread_sensitive=False)(
            system_id, system_url, email=email, password=password)
        return api_success(data)
    elif request.method == 'POST':
        data = await sync_to_async(cloud_gateway.post, thread_sensitive=False)(
            system_id, system_url, request.data, email=email, password=password)
        return api_success(data)

    return None


@swagger_auto_schema(method="POST", auto_schema=None)
@async_api_view(['POST'])
@permission_classes((IsAuthenticated, ))
async def system_groups_users_management(request):
    systems = request.data.get('systems', [])
    users = request.data.get('users', [])
    if len(users) == 0:
        return api_success()
    for system_id in systems:
        for user in users:
            try:
                await sync_to_async(cloud_api.System.share)(
                    request, system_id, user.get('email'), user.get('role', ''), enabled=user.get('enabled', True))
            # A broad exception is used here because we don't know why sharing failed.
            except APIException:
                pass
    return api_success()

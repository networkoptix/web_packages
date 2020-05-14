from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema

from api.controllers import cloud_api, cloud_gateway

from api.helpers.exceptions import handle_exceptions, api_success, require_params, \
    APINotAuthorisedException, APIRequestException, ErrorCodes

from cloud import settings
import hashlib
import base64


# Swagger parameters
system_id__route_param = openapi.Parameter('system_id', openapi.IN_PATH, type=openapi.TYPE_STRING, required=True)

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
system_name__body = openapi.Schema(type=openapi.TYPE_STRING, description="Name of the system.")
user_email__body = openapi.Schema(type=openapi.TYPE_STRING)
user_role__body = openapi.Schema(type=openapi.TYPE_STRING)


@swagger_auto_schema(method="GET",  # auto_schema=None,
                     operation_description="If the user has access to the system clouddb will return its info.",
                     manual_parameters=[system_id__route_param])
@api_view(['GET'])
@permission_classes((IsAuthenticated, ))
@handle_exceptions
def system(request, system_id):
    data = cloud_api.System.get(request.session['login'], request.session['password'], system_id)
    return api_success(data['systems'])


@swagger_auto_schema(method="GET",  # auto_schema=None,
                     operation_description="Returns a list of systems that the user has access to.")
@api_view(['GET'])
@permission_classes((IsAuthenticated, ))
@handle_exceptions
def list_systems(request):
    data = cloud_api.System.list(request.session['login'], request.session['password'])
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
@api_view(['GET', 'POST'])
@permission_classes((IsAuthenticated, ))
@handle_exceptions
def sharing(request, system_id):
    if request.method == 'GET':
        # get authorized user here
        data = cloud_api.System.users(request.session['login'], request.session['password'], system_id)
        return api_success(data['sharing'])

    elif request.method == 'POST':
        require_params(request, ('user_email', 'role'))
        # 2. share or change sharing
        user_email = request.data['user_email'].lower()
        data = cloud_api.System.share(request.session['login'], request.session['password'], system_id,
                                      user_email,
                                      request.data['role'])

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


@swagger_auto_schema(method="GET",  # auto_schema=None,
                     operation_description="Returns the auth keys needed to make api requests to a cloud system.",
                     manual_parameters=[system_id__route_param])
@api_view(['GET'])
@permission_classes((IsAuthenticated, ))
@handle_exceptions
def get_auth(request, system_id):
    data = cloud_api.System.get_nonce(request.session['login'], request.session['password'], system_id)
    nonce = data["nonce"]
    realm = settings.CLOUD_CONNECT['password_realm']
    auth_get = digest(request.session['login'], request.session['password'], realm, nonce, 'GET')
    auth_post = digest(request.session['login'], request.session['password'], realm, nonce, 'POST')
    auth_play = digest(request.session['login'], request.session['password'], realm, nonce, 'PLAY')
    return api_success({'authGet': auth_get, 'authPost': auth_post, 'authPlay': auth_play})


@swagger_auto_schema(method="POST",  # auto_schema=None,
                     operation_description="Renames the cloud system.",
                     manual_parameters=[system_id__route_param],
                     request_body=openapi.Schema(
                         type=openapi.TYPE_OBJECT,
                         properties={
                             'name': system_name__body
                         }
                     ))
@api_view(['POST'])
@permission_classes((IsAuthenticated, ))
@handle_exceptions
def rename(request, system_id):
    require_params(request, ('name',))
    data = cloud_api.System.rename(request.session['login'], request.session['password'], system_id,
                                   request.data['name'])
    return api_success(data)


@swagger_auto_schema(method="POST",  # auto_schema=None,
                     operation_description="Merges two cloud systems into one.",
                     request_body=openapi.Schema(
                         type=openapi.TYPE_OBJECT,
                         properties={
                             "master_system_id": master_system_id__body,
                             "master_system_id": slave_system_id__body,
                             "password": password__body
                         }
                     ))
@api_view(['POST'])
@permission_classes((IsAuthenticated, ))
@handle_exceptions
def merge(request):
    require_params(request, ('master_system_id', 'slave_system_id', 'password'))
    try:
        data = cloud_api.System.merge(request.user.email, request.data['password'],
                                      request.data['master_system_id'], request.data['slave_system_id'])
    except APINotAuthorisedException:
        raise APIRequestException('User action was not allowed.', ErrorCodes.wrong_password,
                                  error_data={'password': ['Not recognized']})
    return api_success(data)


@swagger_auto_schema(method="GET",  # auto_schema=None,
                     operation_description="Returns the user access roles for the system.",
                     manual_parameters=[system_id__route_param])
@api_view(['GET'])
@permission_classes((IsAuthenticated, ))
@handle_exceptions
def access_roles(request, system_id):
    data = cloud_api.System.access_roles(request.session['login'], request.session['password'], system_id)
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
                         required=["password", "system_id"]
                     ))
@api_view(['POST'])
@permission_classes((AllowAny, ))
@handle_exceptions
def disconnect(request):
    require_params(request, ('system_id', 'password'))

    try:
        if request.user.is_authenticated:
            email = request.user.email
        else:
            require_params(request, ('email',))
            email = request.data['email'].lower()

        cloud_api.System.unbind(email, request.data['password'], request.data['system_id'])
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
@api_view(['POST'])
@permission_classes((AllowAny, ))
@handle_exceptions
def connect(request):
    require_params(request, ('name',))
    if request.user.is_authenticated:
        data = cloud_api.System.bind(request.session['login'], request.session['password'], request.data['system_id'])
        return api_success(data)

    require_params(request, ('email', 'password'))
    email = request.data['email'].lower()
    data = cloud_api.System.bind(email, request.data['password'], request.data['name'])
    return api_success(data)


@swagger_auto_schema(method="GET", auto_schema=None,
                     deprecated=True,
                     operation_description="Old way of sending GET request to systems.")
@swagger_auto_schema(method="POST", auto_schema=None,
                     deprecated=True,
                     operation_description="Old way of sending POST request to systems.")
@api_view(['GET', 'POST'])
@permission_classes((AllowAny, ))
@handle_exceptions
def proxy(request, system_id, system_url):
    email = None
    password = None

    full_url = request.get_full_path()
    position = full_url.find('?')
    if position > -1:
        system_url += full_url[position:]

    if request.user.is_authenticated:
        email = request.session['login']
        password = request.session['password']

    if request.method == 'GET':
        data = cloud_gateway.get(system_id, system_url, email=email, password=password)
        return api_success(data)
    elif request.method == 'POST':
        data = cloud_gateway.post(system_id, system_url, request.data, email=email, password=password)
        return api_success(data)

    return None

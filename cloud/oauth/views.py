import re
import urllib
from django.shortcuts import redirect
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated

from api.account_backend import get_ip
from api.controllers.cloud_api import Auth, System
from api.helpers.exceptions import (
    require_params, api_success, APILogicException, APINotAuthorisedException, APIRequestException, ErrorCodes, kill_session
)

client_description = "A registered client_id."
redirect_uri_description = "Where the endpoint should redirect to after authorization."
response_type_description = "Valid options are code or token."
scope_description = "Scope for the oauth token."
signature_description = "HMAC-SHA256 string used to validate oauth redirect_uri for system."

access_token_param = openapi.Parameter('access_token', openapi.IN_QUERY, required=True, type=openapi.TYPE_STRING)
authorization_code_param = openapi.Parameter('code', openapi.IN_QUERY, type=openapi.TYPE_STRING)
client_id_param = openapi.Parameter('client_id', openapi.IN_QUERY, required=True, description=client_description, type=openapi.TYPE_STRING)
email_param = openapi.Parameter('email', openapi.IN_QUERY, required=True, type=openapi.TYPE_STRING)
grant_type_param = openapi.Parameter('grant_type', openapi.IN_QUERY, required=True, type=openapi.TYPE_STRING)
password_param = openapi.Parameter('password', openapi.IN_QUERY, required=True, type=openapi.TYPE_STRING)
redirect_uri_param = openapi.Parameter('redirect_uri', openapi.IN_QUERY, required=True, description=redirect_uri_description, type=openapi.TYPE_STRING)
refresh_token_param = openapi.Parameter('refresh_token', openapi.IN_QUERY, description=response_type_description, type=openapi.TYPE_STRING)
response_type_param = openapi.Parameter('response_type', openapi.IN_QUERY, required=True, description=response_type_description, type=openapi.TYPE_STRING)
scope_param = openapi.Parameter('scope', openapi.IN_QUERY, required=True, description=scope_description, type=openapi.TYPE_STRING)
signature_param = openapi.Parameter('signature', openapi.IN_QUERY, required=True, description=signature_description, type=openapi.TYPE_STRING)

access_token__body = openapi.Schema(type=openapi.TYPE_STRING)
authorization_code__body = openapi.Schema(description="An authorization code.", type=openapi.TYPE_STRING)
client_id__body = openapi.Schema(description=client_description, type=openapi.TYPE_STRING)
client_token__body = openapi.Schema(type=openapi.TYPE_STRING)
description__body = openapi.Schema(description="Who is the client and what is it for.", type=openapi.TYPE_STRING)
grant_type__body = openapi.Schema(description="Valid options are authorization_code, password or refresh_token", type=openapi.TYPE_STRING)
email__body = openapi.Schema(type=openapi.TYPE_STRING)
name__body = openapi.Schema(description="The name of the application", type=openapi.TYPE_STRING)
password__body = openapi.Schema(type=openapi.TYPE_STRING)
redirect_uri__body = openapi.Schema(description=redirect_uri_description, type=openapi.TYPE_STRING)
refresh_token__body = openapi.Schema(type=openapi.TYPE_STRING)
response_type__body = openapi.Schema(description=response_type_description, type=openapi.TYPE_STRING)
scope__body = openapi.Schema(description=scope_description, type=openapi.TYPE_STRING)
signature__body = openapi.Schema(description=signature_description, type=openapi.TYPE_STRING)
token__body = openapi.Schema(description="An access or refresh token.", type=openapi.TYPE_STRING)

successful_authenticate_response = openapi.Response(
    description="Returns a redirect link with a valid access code.",
    examples={
        "application/json": {
            "link": "{redirect_uri}?code={some access code}"
        }
    })

successful_introspect_response = openapi.Response(
    description="Returns information related to an access token.",
    examples={
        "application/json": {
            "access_token": "{access token}",
            "expires_in": "86389",
            "expires_at": "1622078072542",
            "token_type": "bearer",
            "prolongation_period": "0",
            "scope": "{cloud instance} cloudSystemId=*",
            "username": "{email of token owner}",
            "time_since_password": "11"
        }
    }
)

successful_revoke_response = openapi.Response(
    description="Returns ",
    examples={
        "application/json": {}
    }
)

successful_token_response = openapi.Response(
    description="Returns an access and refresh token",
    examples={
        "application/json": {
            "access_token": "{access token}",
            "refresh_token": "{refresh token}",
            "expires_in": "86400",
            "expires_at": "1622077477993",
            "token_type": "bearer",
            "scope": "{cloud instance} cloudSystemId=*"
        }
    }
)


SYSTEM_PATTERN = re.compile(r"cloudSystemId=([\w\d]{8}-[\w\d]{4}-[\w\d]{4}-[\w\d]{4}-[\w\d]{12})")


def check_signature(signature, scope, redirect_uri):
    return True
    system_id = SYSTEM_PATTERN.search(scope)
    if not system_id:
        raise APIRequestException("Scope is missing a valid system id", error_code=ErrorCodes.bad_request)
    try:
        System.validate_signature(system_id.group(1), signature, redirect_uri)
    except APILogicException:
        raise APIRequestException("Signature does not match.", error_code=ErrorCodes.bad_request)


def get_param(request, name):
    """Depending on request method it extracts value from query_params or body."""
    if request.method == "GET":
        return request.query_params.get(name)
    return request.data.get(name)


def set_params_for_redirect(code, state):
    params = {
        "code": code,
    }
    if state:
        params["state"] = state
    return params


def build_redirect_url(url, code, state):
    parsed_redirect = urllib.parse.urlparse(url)
    redirect_params = urllib.parse.parse_qs(parsed_redirect.query)
    redirect_params.update(set_params_for_redirect(code, state))

    updated_redirect_params = urllib.parse.urlencode(redirect_params, doseq=True)
    return f"{parsed_redirect.geturl().split('?')[0]}?{updated_redirect_params}"


@swagger_auto_schema(method="POST",  # auto_schema=None,
                     operation_description="Request an authorization code using email and password",
                     request_body=openapi.Schema(
                         type=openapi.TYPE_OBJECT,
                         properties={
                             "client_id": client_id__body,
                             "email": email__body,
                             "password": password__body,
                             "redirect_uri": redirect_uri__body,
                             "response_type": response_type__body,
                             "scope": scope__body,
                             "signature": signature__body
                         },
                         required=["client_id", "email", "password", "response_type"]),
                     responses={
                         200: successful_authenticate_response
                     })
@api_view(["POST"])
@permission_classes((AllowAny, ))
def authenticate(request):
    require_params(request, ("client_id", "email", "password", "response_type"))
    if get_param(request, "response_type") != Auth.RESPONSE_TYPE.code:
        raise APIRequestException("Invalid value for response_type. It must be code.", error_code=ErrorCodes.bad_request)

    ip = get_ip(request)
    redirect_uri = get_param(request, "redirect_uri") or "/"
    state = get_param(request, "state")
    scope = get_param(request, "scope")

    if signature := get_param(request, "signature"):
        check_signature(signature, scope, redirect_uri)

    try:
        res = Auth.get_code(email=get_param(request, "email"),
                            password=get_param(request, "password"),
                            client_id=get_param(request, "client_id"),
                            ip=ip,
                            redirect_uri=redirect_uri,
                            scope=scope)
    except Exception as e:
        # Ensure session and csrf are reset on failure
        kill_session(request)
        raise e

    data = {
        "code": res.get('code'),
        "link": build_redirect_url(redirect_uri, res.get('code'), state)
    }

    error = res.get("error")
    if error:
        data["error"] = error

    return api_success(data)


# @swagger_auto_schema(method="GET", auto_schema=None,
#                      operation_description="Login using existing session",
#                      manual_parameters=[client_id_param, redirect_uri_param, response_type_param],
#                      responses={
#                          200: successful_authenticate_response
#                      })
# @api_view(["GET"])
# @permission_classes((IsAuthenticated, ))
# def authenticate_with_session(request):
#     require_params(request, ("redirect_uri", "response_type"))
#     if request.query_params["response_type"] != Auth.RESPONSE_TYPE.code:
#         raise APIRequestException("Invalid value for response_type. It must be code.")
#
#     ip = get_ip(request)
#     redirect_uri = request.query_params["redirect_uri"]
#     state = request.query_params.get("state")
#     code = Auth.get_code(grant_type=Auth.GRANT_TYPE.refresh_token,
#                          refresh_token=request.session.get("refresh_token"),
#                          ip=ip,
#                          redirect_uri=redirect_uri)
#
#     return redirect(f"{redirect_uri}?{urllib.parse.urlencode(set_params_for_redirect(code, state))}")


@swagger_auto_schema(methods=["POST"],  # auto_schema=None,
                     operation_description="Logout for tokens w/ system specific scopes.",
                     request_body=openapi.Schema(
                         type=openapi.TYPE_OBJECT,
                         properties={
                             "accessToken": access_token__body,
                             "cloudAccessToken": client_token__body,
                             "refreshToken": refresh_token__body
                         },
                     required=["accessToken", "cloudAccessToken", "refreshToken"]))
@api_view(["POST"])
@permission_classes((AllowAny, ))
def logout(request):
    require_params(request, ("cloudAccessToken", "refreshToken"))
    cloud_access_token = request.data["cloudAccessToken"]
    refresh_token = request.data["refreshToken"]

    # Handles situation where we cancel re-login attempt with different user
    temporary_session = {
        "access_token": cloud_access_token,
        "refresh_token": refresh_token
    }

    # If this fails that means the refresh and cloud access token expired.
    # If one or the other is valid logout should work.
    if access_token := request.data.get("accessToken"):
        try:
            Auth.delete_token(temporary_session, access_token)
        except (APILogicException, APINotAuthorisedException):
            raise APINotAuthorisedException("Invalid cloud access and refresh token", ErrorCodes.not_authorized)

    # At this point the access_token is valid and the refresh might be valid
    try:
        Auth.delete_token(temporary_session, refresh_token)
    # Handles the 404 error when the refresh token is gone, and 401 if the access_token is invalid
    except (APILogicException, APINotAuthorisedException):
        pass

    # At this point it doesn't matter if the call fails since the refresh token is dead.
    try:
        Auth.delete_token(request, cloud_access_token)
    # Handles the rare case where the access token expires after killing the refresh
    except (APILogicException, APINotAuthorisedException):
        pass

    return api_success("Successfully logged out.")


@swagger_auto_schema(method="POST",  # auto_schema=None,
                     operation_description="Register 3rd party client apps",
                     request_body=openapi.Schema(
                         type=openapi.TYPE_OBJECT,
                         properties={
                             "description": description__body,
                             "name": name__body
                         },
                         required=["description", "name"]
                     ))
@api_view(["POST"])
@permission_classes((IsAuthenticated, ))
def register_client(request):
    require_params(request, ("description", "name"))
    description = request.data["description"]
    name = request.data["name"]
    return Auth.register_client(request, description, name)


@swagger_auto_schema(methods=["GET"],  # auto_schema=None,
                     operation_description="Returns new access and refresh tokens.",
                     manual_parameters=[client_id_param, authorization_code_param, email_param, grant_type_param, password_param, refresh_token_param, response_type_param, scope_param, signature_param],
                     responses={
                         200: successful_token_response
                     })
@swagger_auto_schema(methods=["POST"],  # auto_schema=None,
                     operation_description="Returns new access and refresh tokens.",
                     request_body=openapi.Schema(
                         type=openapi.TYPE_OBJECT,
                         properties={
                             "client_id": client_id__body,
                             "code": authorization_code__body,
                             "email": email__body,
                             "grant_type": grant_type__body,
                             "password": password__body,
                             "refresh_token": refresh_token__body,
                             "response_type": response_type__body,
                             "scope": scope__body,
                             "signature": signature__body
                         }
                     ),
                     responses={
                         200: successful_token_response
                     })
@api_view(["GET", "POST"])
@permission_classes((AllowAny, ))
def token(request):
    code = get_param(request, "code")
    refresh_token = get_param(request, "refresh_token")
    if not code and not refresh_token:
        require_params(request, ("grant_type", "response_type",))

    grant_type = get_param(request, "grant_type")
    if not grant_type:
        if code:
            grant_type = Auth.GRANT_TYPE.authorization_code

        if refresh_token:
            grant_type = Auth.GRANT_TYPE.refresh_token

    response_type = get_param(request, "response_type") or Auth.RESPONSE_TYPE.token

    scope = get_param(request, 'scope')
    ip = get_ip(request)

    if grant_type == Auth.GRANT_TYPE.password:
        require_params(request, ("email", "password", "client_id", "redirect_uri"))
        email = get_param(request, "email")
        password = get_param(request, "password")
        client_id = get_param(request, "client_id")
        redirect_uri = get_param(request, "redirect_uri")
        state = get_param(request, 'state')

        if signature := get_param(request, "signature"):
            check_signature(signature, scope, redirect_uri)

        if response_type == Auth.RESPONSE_TYPE.code:
            res = Auth.get_code(email, password, client_id=client_id, ip=ip, redirect_uri=redirect_uri, scope=scope)
            return redirect(build_redirect_url(redirect_uri, res.get('code'), state))

    elif response_type == Auth.RESPONSE_TYPE.token:
        if grant_type == Auth.GRANT_TYPE.authorization_code:
            require_params(request, ("code",))
            is_mobile = get_param(request, "client_type") == "mobile"
            return api_success(Auth.get_access_token(code, is_mobile=is_mobile, ip=ip))
        elif grant_type == Auth.GRANT_TYPE.refresh_token:
            require_params(request, ("refresh_token",))
            return api_success(Auth.get_refresh_token(refresh_token, ip=ip, scope=scope))

    elif grant_type == Auth.GRANT_TYPE.refresh_token and response_type == Auth.RESPONSE_TYPE.code:
        require_params(request, ("refresh_token",))
        return api_success(Auth.get_code(email="",
                                         password="",
                                         grant_type=Auth.GRANT_TYPE.refresh_token,
                                         ip=get_ip(request),
                                         refresh_token=refresh_token,
                                         scope=scope))

    raise APIRequestException("Invalid grant_type and response_type combination", ErrorCodes.bad_request)


@swagger_auto_schema(method="POST",  # auto_schema=None,
                     operation_description="Deletes the token.",
                     request_body=openapi.Schema(
                         type=openapi.TYPE_OBJECT,
                         properties={
                             "token": token__body
                         },
                         required=["token"]
                     ),
                     responses={})
@api_view(["POST"])
@permission_classes((IsAuthenticated,))
def revoke_token(request):
    require_params(request, ("token", ))
    return api_success(Auth.delete_token(request, request.data["token"]))


@swagger_auto_schema(method="GET",  # auto_schema=None,
                     operation_description="Validates access token.",
                     manual_parameters=[access_token_param],
                     responses={
                         200: successful_introspect_response
                     })
@api_view(["GET"])
@permission_classes((AllowAny, ))
def validate_token(request):
    require_params(request, ("token", ))
    return api_success(Auth.validate_token(request.query_params["token"]))

from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from oauth2_provider.contrib.rest_framework import IsAuthenticatedOrTokenHasScope
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny

from api.account_backend import get_ip
from api.controllers.cloud_api import Auth
from api.helpers.exceptions import (
    require_params, api_success, APINotAuthorisedException, APIRequestException, ErrorCodes
)
from api import models

authorization_code__body = openapi.Schema(description="An authorization code.", type=openapi.TYPE_STRING)

login__body = openapi.Schema(type=openapi.TYPE_STRING)
password__body = openapi.Schema(type=openapi.TYPE_STRING)


@swagger_auto_schema(method="POST",  # auto_schema=None,
                     request_body=openapi.Schema(
                         type=openapi.TYPE_OBJECT,
                         properties={
                             "login": login__body,
                             "password": password__body
                         },
                         required=["login", "password"]
                     ))
@api_view(['POST'])
@permission_classes((AllowAny, ))
def authenticate(request):
    require_params(request, ("email", "password"))
    email = request.data.get("email").lower()
    password = request.data.get("password")
    ip = get_ip(request)
    code = Auth.get_code(email, password, ip)
    return api_success({"code": code})


@api_view(["GET"])
@permission_classes((AllowAny, ))
def authorize(request):
    client_id = request.data.get("client_id")
    redirect_url = request.data.get("redirect_url")
    state = request.data.get("state")
    return api_success({"msg": "todo"}, status_code=ErrorCodes.not_implemented)


@api_view(["GET"])
@permission_classes((AllowAny, ))
def refresh(request):
    # Todo: Update this after making 3rd party endpoints.
    access_token = request.COOKIES.get("access_token")
    refresh_token = request.COOKIES.get("refresh_token")

    if access_token:
        Auth.delete_token(access_token)

    if not refresh_token:
        raise APINotAuthorisedException("Refresh token was not passed or expired.", ErrorCodes.not_authorized)

    new_token = Auth.get_refresh_token(refresh_token)
    validate_token = Auth.validate_token(new_token["access_token"])

    try:
        models.Account.objects.get(email=validate_token["username"])
    except models.Account.DoesNotExist:
        raise APINotAuthorisedException("Credentials invalid.")
    return api_success(new_token)


@api_view(['post'])
@permission_classes((IsAuthenticatedOrTokenHasScope, ))
def register_client(request):
    require_params(request, ("description", "name"))
    description = request.data.get("description")
    name = request.data.get("name")
    return Auth.register_client(request.session, description, name)


@api_view(["GET"])
@permission_classes((AllowAny, ))
def token(request):
    require_params(request, ("grant_type", "response_type",))
    grant_type = request.data.get("grant_type")
    response_type = request.data.get("response_type")

    if grant_type == "password":
        require_params(request, ("email", "password"))
        email = request.data.get("email")
        password = request.data.get("password")
        if response_type == "code":
            return Auth.get_code(email, password)
        elif response_type == "token":
            return Auth.get_token(email, password)

    elif response_type == "token":
        if grant_type == "authorization_code":
            require_params(request, ("code",))
            return Auth.get_access_token(request.data.get("code"))
        elif grant_type == "refresh_token":
            require_params(request, "refresh_token")
            return Auth.get_refresh_token(request.data.get("refresh_token"))

    raise APIRequestException("Invalid grant_type and response_type combination")


@swagger_auto_schema(method="GET",  # auto_schema=None,
                     request_body=openapi.Schema(
                         type=openapi.TYPE_OBJECT,
                         properties={
                             "code": authorization_code__body
                         },
                         required=["code"]
                     ))
@api_view(["GET"])
@permission_classes((AllowAny, ))
def validate(request):
    require_params(request, ("token", ))
    return api_success(Auth.validate_token(request.data.get("token")))

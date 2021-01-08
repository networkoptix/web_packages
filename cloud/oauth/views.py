import urllib
from django.shortcuts import redirect
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from oauth2_provider.contrib.rest_framework import IsAuthenticatedOrTokenHasScope
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated

from api.account_backend import get_ip
from api.controllers.cloud_api import Auth
from api.helpers.exceptions import require_params, api_success, APIRequestException

authorization_code__body = openapi.Schema(description="An authorization code.", type=openapi.TYPE_STRING)

login__body = openapi.Schema(type=openapi.TYPE_STRING)
password__body = openapi.Schema(type=openapi.TYPE_STRING)


def get_param(request, name):
    """Depending on request method it extracts value from query_params or body."""
    if request.METHOD == "GET":
        return request.query_params.get(name)
    return request.data.get(name)


def set_params_for_redirect(code, state):
    params = {
        "code": code,
    }
    if state:
        params["state"] = state
    return params


@swagger_auto_schema(method="GET",  # auto_schema=None,
                     request_body=openapi.Schema(
                         type=openapi.TYPE_OBJECT,
                         properties={
                             "login": login__body,
                             "password": password__body
                         },
                         required=["client_id", "email", "password", "redirect_url", "response_type"]
                     ))
@api_view(["GET"])
@permission_classes((AllowAny, ))
def authenticate(request):
    require_params(request, ("client_id", "email", "password", "redirect_url", "response_type"))
    if request.query_params["response_type"] != Auth.RESPONSE_TYPE.code:
        raise APIRequestException("Invalid value for response_type. It must be code.")

    ip = get_ip(request)
    redirect_url = request.query_params["redirect_url"]
    state = request.query_params.get("state")

    code = Auth.get_code(email=request.data["email"],
                         password=request.data["password"],
                         client_id=request.data["client_id"],
                         ip=ip)

    return redirect(f"{redirect_url}?{urllib.parse.urlencode(set_params_for_redirect(code, state))}")


@api_view(["GET"])
@permission_classes((IsAuthenticated, ))
def authenticate_with_session(request):
    require_params(request, ("redirect_url", "response_type"))
    if request.query_params["response_type"] != Auth.RESPONSE_TYPE.code:
        raise APIRequestException("Invalid value for response_type. It must be code.")

    ip = get_ip(request)
    redirect_url = request.query_params["redirect_url"]
    state = request.query_params.get("state")
    code = Auth.get_code(grant_type=Auth.GRANT_TYPE.refresh_token,
                         refresh_token=request.session.get("refresh_token"),
                         ip=ip)

    return redirect(f"{redirect_url}?{urllib.parse.urlencode(set_params_for_redirect(code, state))}")


@api_view(["POST"])
@permission_classes((IsAuthenticatedOrTokenHasScope, ))
def register_client(request):
    require_params(request, ("description", "name"))
    description = request.data["description"]
    name = request.data["name"]
    return Auth.register_client(request, description, name)


@api_view(["GET", "POST"])
@permission_classes((AllowAny, ))
def token(request):
    require_params(request, ("grant_type", "response_type",))
    grant_type = get_param(request, "grant_type")
    response_type = get_param(request, "response_type")
    ip = get_ip(request)

    if grant_type == Auth.GRANT_TYPE.password:
        require_params(request, ("email", "password", "client_id"))
        email = get_param(request, "email")
        password = get_param(request, "password")
        client_id = get_param(request, "client_id")

        if response_type == Auth.RESPONSE_TYPE.token:
            return Auth.get_token(email, password, client_id=client_id, ip=ip)

    elif response_type == Auth.RESPONSE_TYPE.token:
        if grant_type == Auth.GRANT_TYPE.authorization_code:
            require_params(request, ("code",))
            return Auth.get_access_token(get_param(request, "code"), ip=ip)
        elif grant_type == Auth.GRANT_TYPE.refresh_token:
            require_params(request, "refresh_token")
            return Auth.get_refresh_token(get_param(request, ["refresh_token"]), ip=ip)

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
def validate_token(request):
    require_params(request, ("token", ))
    return api_success(Auth.validate_token(request.data["token"]))

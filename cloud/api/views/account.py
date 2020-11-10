import base64
import time
import logging

import django
from django.conf import settings
from django.contrib.auth.models import Permission
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.serializers import ValidationError
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from dal import autocomplete

from api import models
from api.controllers.cloud_api import Account
from api.account_backend import AccountManager, get_ip
from api.helpers.exceptions import (
    handle_exceptions, APIRequestException, APINotAuthorisedException,
    APIInternalException, APINotFoundException, api_success, ErrorCodes,
    require_params, kill_session)
from api.views.account_serializers import (
    AccountSerializer, CreateAccountSerializer, AccountUpdateSerializer)

logger = logging.getLogger(__name__)

# Swagger Schemas for body parameters
email__body = openapi.Schema(type=openapi.TYPE_STRING)
first_name__body = openapi.Schema(type=openapi.TYPE_STRING)
last_name__body = openapi.Schema(type=openapi.TYPE_STRING)
password__body = openapi.Schema(type=openapi.TYPE_STRING)

login__body = openapi.Schema(type=openapi.TYPE_STRING)
remember__body = openapi.Schema(type=openapi.TYPE_BOOLEAN)
timezone__body = openapi.Schema(description="The users current timezone.", type=openapi.TYPE_STRING)

activate_code__body = openapi.Schema(description="The code used to activate the account.", type=openapi.TYPE_STRING)
restore_code__body = openapi.Schema(description="The code used to restore the password for an account.",
                                    type=openapi.TYPE_STRING)

code__body = openapi.Schema(description="A temporary code.", type=openapi.TYPE_STRING)

# Swagger Responses
account__response = openapi.Response('Account info.', AccountSerializer)


def set_session_credentials(request, email, password):
    """
        The user will have temporary credentials that lasts for 2 weeks without usage.
        During that time the user has to use the credentials at least once to keep the
        credentials valid for another two weeks. Otherwise the credentials will become
        invalid and the user will have to login again.
    """
    tempCredentials = Account.create_temporary_credentials(email, password,
                                                           expiration_period=settings.AUTHENTICATED_SESSION_COOKIE_AGE,
                                                           auto_prolongation_enabled=True,
                                                           prolongation_period=settings.AUTHENTICATED_SESSION_COOKIE_AGE)
    request.session['login'] = tempCredentials['login']
    request.session['password'] = tempCredentials['password']


@swagger_auto_schema(method="POST",  # auto_schema=None,
                     request_body=openapi.Schema(
                         type=openapi.TYPE_OBJECT,
                         properties={
                             "email": email__body,
                             "first_name": first_name__body,
                             "last_name": last_name__body,
                             "password": password__body
                         },
                         required=["email", "first_name", "last_name", "password"]
                     ))
@api_view(['POST'])
@permission_classes((AllowAny, ))
def register(request):
    from util.helpers import detect_language_by_request
    logger.debug('/api/account/register called')
    lang = detect_language_by_request(request)
    data = request.data.copy()
    data['language'] = lang
    data['IP'] = get_ip(request)

    account = models.Account.objects.filter(email=data['email']).first()
    if not account or account.is_active:
        AccountManager.check_email_in_portal(data['email'], False)  # Check if account is in Cloud_db
        serializer = CreateAccountSerializer(data=data)
        if not serializer.is_valid():
            raise APIRequestException('Wrong form parameters', ErrorCodes.wrong_parameters,
                                      error_data=serializer.errors)
        logger.debug('/api/account/register calling serializer.save')
        serializer.save()
    else:
        AccountManager().register_cloud_invite_user(data['email'], data['password'], data)

    logger.debug('/api/account/register checking if activated')
    activated = AccountManager().check_if_activated(data['email'], data['password'], data.pop('IP', ''))
    logger.debug('/api/account/register completed')
    return api_success({'activated': activated})


@swagger_auto_schema(method="POST",  # auto_schema=None,
                     request_body=openapi.Schema(
                         type=openapi.TYPE_OBJECT,
                         properties={
                             "login": login__body,
                             "password": password__body,
                             "remember": remember__body,
                             "timezone": timezone__body
                         },
                         required=["login", "password"]
                     ))
@api_view(['POST'])
@permission_classes((AllowAny, ))
def login(request):
    user = None
    if 'login' in request.session and 'password' in request.session:
        email = request.session['login']
        password = request.session['password']
        user = django.contrib.auth.authenticate(request=request, username=email, password=password)

    if user is None:
        require_params(request, ('email', 'password'))
        email = request.data['email'].lower()
        password = request.data['password']
        user = django.contrib.auth.authenticate(request=request, username=email, password=password)

    if user is None:
        # If account was blocked we put it in the session to log the login error
        if 'account_blocked' in request.session:
            request.session.pop('account_blocked', None)
            raise APINotAuthorisedException("Account is blocked", ErrorCodes.account_blocked)
        # try to find user in the DB
        if not AccountManager.is_email_in_portal(email):
            raise APINotFoundException("User not in cloud portal")  # user not found here
        raise APINotAuthorisedException("Password is invalid")

    if 'remember' not in request.data or not request.data['remember']:
        request.session.set_expiry(0)
    else:
        request.session.set_expiry(settings.AUTHENTICATED_SESSION_COOKIE_AGE)

    django.contrib.auth.login(request, user)

    # If the user does not have an activated_date set it to the current time
    if not user.activated_date:
        user.activated_date = timezone.now()
        user.save()

    set_session_credentials(request, email, password)
    request.session['time'] = time.time()
    if 'timezone' in request.data:
        request.session['timezone'] = request.data['timezone']
    serializer = AccountSerializer(user, many=False)
    return api_success(serializer.data)


# @swagger_auto_schema(method="POST", auto_schema=None)
@api_view(['POST'])
@permission_classes((IsAuthenticated, ))
def logout(request):
    kill_session(request)
    return api_success()


@swagger_auto_schema(method="GET",  # auto_schema=None,
                     operation_description="Returns info about the current logged in user.",
                     responses={"200": account__response})
@swagger_auto_schema(method="POST",  # auto_schema=None,
                     operation_description="Updates the user's account information and returns it.",
                     request_body=openapi.Schema(
                         type=openapi.TYPE_OBJECT,
                         properties={
                             "first_name": first_name__body,
                             "last_name": last_name__body
                         }
                     ),
                     responses={"200": account__response})
@api_view(['GET', 'POST'])
@permission_classes((IsAuthenticated, ))
def index(request):
    if request.method == 'GET':
        # validate credentials in cloud_db
        # password could be changed, ot temporary link expired
        Account.get(request.session['login'], request.session['password'])
        # get authorized user here
        serializer = AccountSerializer(request.user, many=False)
        return Response(serializer.data)

    elif request.method == 'POST':
        serializer = AccountUpdateSerializer(request.user, data=request.data)

        if not serializer.is_valid():
            raise APIRequestException('Wrong form parameters',
                                      ErrorCodes.wrong_parameters,
                                      error_data=serializer.errors)

        Account.update(request.session['login'], request.session['password'], request.data['first_name'],
                       request.data['last_name'])
        # if not success:
        #    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return api_success(serializer.data)


@swagger_auto_schema(method="POST",  # auto_schema=None,
                     operation_description="Returns an temporary authkey based on the user's credentials.",
                     responses={"200": "auth_key"})
@api_view(['POST'])
@permission_classes((IsAuthenticated,))
def auth_key(request):
    data = Account.create_temporary_credentials(request.session['login'], request.session['password'], 'short')

    key = base64.b64encode((data['login'] + ':' + data['password']).encode('utf-8'))
    return api_success({'auth_key': key})


@swagger_auto_schema(method="POST",  # auto_schema=None,
                     operation_description="Delete's the user's account from cloud portal and cloud db.",
                     request_body=openapi.Schema(
                         type=openapi.TYPE_OBJECT,
                         properties={
                             "password": password__body
                         },
                         required=["password"]
                     ))
@api_view(['POST'])
@permission_classes((IsAuthenticated,))
def delete_user(request):
    require_params(request, ('password',))
    user = request.user

    try:
        Account.delete(user.email, request.data.get('password'))
    except APINotAuthorisedException as error:
        raise APIRequestException('Wrong password', ErrorCodes.wrong_password,
                                  error_data={'password': error.error_data})

    kill_session(request)
    user.delete()
    return api_success()


@swagger_auto_schema(method="POST",  # auto_schema=None,
                     request_body=openapi.Schema(
                         type=openapi.TYPE_OBJECT,
                         properties={
                             "new_password": password__body,
                             "old_password": password__body
                         },
                         required=["new_password", "old_password"]
                     ))
@api_view(['POST'])
@permission_classes((IsAuthenticated, ))
def change_password(request):
    require_params(request, ('old_password', 'new_password'))
    old_password = request.data['old_password']
    new_password = request.data['new_password']

    try:
        CreateAccountSerializer.validate_password(new_password)
    except ValidationError as error:
        raise APIRequestException('Incorrect new password', ErrorCodes.wrong_parameters,
                                  error_data={'new_password': error.detail})

    try:
        Account.change_password(request.user.email, old_password, new_password)
        models.Account.objects.get(email=request.user.email).password_changed()
    except APINotAuthorisedException as error:
        raise APIRequestException('Wrong old password', ErrorCodes.wrong_old_password,
                                  error_data={'old_password': error.error_data})

    set_session_credentials(request, request.user.email, new_password)
    return api_success()


@swagger_auto_schema(method="POST",  # auto_schema=None,
                     operation_description="If the code is present an attempt will be made to activate the account. If "
                                           "the email is present the user will get another activation email with a "
                                           "valid code. If neither is present an error will occur.",
                     request_body=openapi.Schema(
                         type=openapi.TYPE_OBJECT,
                         properties={
                             "code": activate_code__body,
                             "email": email__body
                         }
                     ))
@api_view(['POST'])
@permission_classes((AllowAny, ))
def activate(request):
    if 'code' in request.data:
        code = request.data['code']

        tmp_pass, email = Account.extract_temp_credentials(code)
        account_query = models.Account.objects.filter(email=email).first()
        if account_query and account_query.activated_date:
            raise APIRequestException('Account has already been activated', ErrorCodes.account_activated)

        user_data = Account.activate(code)

        if 'email' not in user_data:
            raise APIInternalException('No email from cloud_db', ErrorCodes.cloud_invalid_response)

        email = user_data['email'].lower()
        if not AccountManager.is_email_in_portal(email):
            raise APIInternalException('No email in portal_db', ErrorCodes.portal_critical_error)

        user = models.Account.objects.get(email=email)
        user.activated_date = timezone.now()
        user.save(update_fields=['activated_date'])
        return api_success()
    elif 'user_email' in request.data:
        user_email = request.data['user_email'].lower()
        Account.reactivate(user_email)
    else:
        raise APIRequestException('Parameters are missing', ErrorCodes.wrong_parameters,
                                  error_data={'code': ['This field is required.'],
                                              'user_email': ['This field is required.']})

    return api_success()


@swagger_auto_schema(method="POST",  # auto_schema=None,
                     operation_description="If the code is present an attempt will be made to restore the account's "
                                           "password. If the email is present the user will get another restore"
                                           "password email with a valid code. If neither is present an error will"
                                           "occur.",
                     request_body=openapi.Schema(
                         type=openapi.TYPE_OBJECT,
                         properties={
                             "code": restore_code__body,
                             "new_password": password__body,
                             "user_email": email__body
                         }
                     ))
@api_view(['POST'])
@permission_classes((AllowAny, ))
def restore_password(request):
    if 'code' in request.data:
        code = request.data['code']
        new_password = request.data['new_password']
        try:
            CreateAccountSerializer.validate_password(new_password)
        except ValidationError as error:
            raise APIRequestException('Wrong new password', ErrorCodes.wrong_parameters,
                                      error_data={'new_password': error.detail})

        email = Account.extract_temp_credentials(code)[1]
        Account.restore_password(code, new_password)
        models.Account.objects.get(email=email).password_changed()

        account = models.Account.objects.get(email=email)
        if not account.activated_date:
            account.activated_date = timezone.now()
            account.save()
    elif 'user_email' in request.data:
        user_email = request.data['user_email'].lower()
        Account.reset_password(get_ip(request), user_email)
    else:
        raise APIRequestException('Parameters are missing', ErrorCodes.wrong_parameters,
                                  error_data={'code': ['This field is required.'],
                                              'user_email': ['This field is required.']})
    return api_success()


@swagger_auto_schema(method="POST",  # auto_schema=None,
                     operation_description="Check the code and returns an email if its valid.",
                     request_body=openapi.Schema(
                         type=openapi.TYPE_OBJECT,
                         properties={
                             "code": code__body
                         },
                         required=["code"]
                     ),
                     responses={"200": "User's email related to the code."})
@api_view(['POST'])
@permission_classes((AllowAny, ))
def check_code_in_portal(request):
    require_params(request, ('code',))
    code = request.data['code']
    (temp_password, email) = Account.extract_temp_credentials(code)
    email_exists = AccountManager.is_email_in_portal(email)
    return api_success({'emailExists': email_exists})


@swagger_auto_schema(method="POST",  # auto_schema=None,
                     operation_description="",
                     request_body=openapi.Schema(
                         type=openapi.TYPE_OBJECT,
                         properties={
                             "code": code__body
                         },
                         required=["code"]
                     ),
                     responses={"200": "User's email related to the auth code."})
@api_view(['POST'])
@permission_classes((AllowAny,))
def check_auth_code(request):
    require_params(request, ('code',))
    code = request.data['code']
    (email, temp_password) = Account.extract_temp_credentials(code)
    user = django.contrib.auth.authenticate(request=request, username=email, password=temp_password)
    if user is None:
        raise APINotAuthorisedException("Auth code has expired.", ErrorCodes.not_authorized)
    email = user.email
    if request.user.is_anonymous:
        email = ""
    return api_success({"email": email})


class AccountAutocomplete(autocomplete.Select2QuerySetView):
    def get_queryset(self):
        # Don't forget to filter out results depending on the visitor !
        if not self.request.user.is_superuser:
            return models.Account.objects.none()

        qs = models.Account.objects.all()
        if self.q:
            qs = qs.filter(email__istartswith=self.q)
        return qs


class PermissionsAutocomplete(autocomplete.Select2QuerySetView):
    def get_queryset(self):
        # Don't forget to filter out results depending on the visitor !
        if not self.request.user.is_superuser:
            return Permission.objects.none()

        qs = Permission.objects.all()
        if self.q:
            qs = qs.filter(name__icontains=self.q)
        return qs

    def get_selected_result_label(self, item):
        return item.name

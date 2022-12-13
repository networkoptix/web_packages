import base64
import enum
import time
import logging
import json
from django.shortcuts import redirect
from django.urls import reverse
import requests
from uuid import uuid4
from django.core.cache import cache

from asgiref.sync import sync_to_async
import django
from django.conf import settings
from django.contrib.auth.models import Permission
from django.contrib.auth.signals import user_login_failed
from django.core.exceptions import ObjectDoesNotExist

from django.utils import timezone
from django.utils.decorators import method_decorator
from rest_framework import status
from rest_framework.decorators import  permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.serializers import ValidationError
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from dal import autocomplete

from api import models
from cloud.controllers.cloud_api import Account, Auth
from api.account_backend import get_ip
from cloud.helpers.exceptions import (
    APIRequestException, APINotAuthorisedException, APILogicException,
    APIInternalException, APINotFoundException, api_success, ErrorCodes,
    require_params, kill_session, kill_tokens)
from api.views.account_serializers import (
    AccountSerializer, CreateAccountSerializer, AccountSecuritySerializer, AccountUpdateSerializer)
from cloud.drf_async import async_api_view as api_view, AsyncAPIView as APIView
from cloud.utils import get_authenticated_session_cookie_age, method_decorator_async
from util.helpers import get_customization

logger = logging.getLogger(__name__)

# Swagger Schemas for body parameters
action__body = openapi.Schema(type=openapi.TYPE_STRING,
                              description="The action is use to determine how the 2fa settings is update."
                                          " Valid values are activate, deactivate, and toggle.")
email__body = openapi.Schema(type=openapi.TYPE_STRING)
first_name__body = openapi.Schema(type=openapi.TYPE_STRING)
last_name__body = openapi.Schema(type=openapi.TYPE_STRING)
password__body = openapi.Schema(type=openapi.TYPE_STRING)
mfa_code_body = openapi.Schema(
    description="Timed one time password for auth app.", type=openapi.TYPE_STRING)

login__body = openapi.Schema(type=openapi.TYPE_STRING)
remember__body = openapi.Schema(type=openapi.TYPE_BOOLEAN)
timezone__body = openapi.Schema(
    description="The users current timezone.", type=openapi.TYPE_STRING)

activate_code__body = openapi.Schema(
    description="The code used to activate the account.", type=openapi.TYPE_STRING)
restore_code__body = openapi.Schema(description="The code used to restore the password for an account.",
                                    type=openapi.TYPE_STRING)

authorization_code__body = openapi.Schema(
    description="An authorization code.", type=openapi.TYPE_STRING)
code__body = openapi.Schema(
    description="A temporary code.", type=openapi.TYPE_STRING)

# Swagger Responses
account__response = openapi.Response('Account info.', AccountSerializer)


async def create_user(email, first_name=None, last_name=None, customization=None, is_active=False):
    default_language_code = (await models.Customization.objects.select_related('default_language').\
        aget(name=customization)).default_language.code

    user = await models.Account.objects.acreate(
        email=email,
        first_name=first_name,
        last_name=last_name,
        language=default_language_code,
        customization=customization
    )
    if is_active:
        user.activated_date = timezone.now()
        await sync_to_async(user.save)()
    return user


async def login_helper(request, token, user):
    await sync_to_async(django.contrib.auth.login)(request, user)
    request.session['access_token'] = token['access_token']
    request.session['refresh_token'] = token['refresh_token']

    # If the user does not have an activated_date set it to the current time
    if not user.activated_date:
        user.activated_date = timezone.now()
        await sync_to_async(user.save)()

    request.session['time'] = time.time()
    if 'timezone' in request.data:
        request.session['timezone'] = request.data['timezone']
    serializer = AccountSerializer(request, many=False)
    return api_success(await sync_to_async(AccountSerializer.data.fget)(serializer))


@swagger_auto_schema(method="POST",  # auto_schema=None,
                     request_body=openapi.Schema(
                         type=openapi.TYPE_OBJECT,
                         properties={
                             "email": email__body,
                             "first_name": first_name__body,
                             "last_name": last_name__body,
                             "password": password__body
                         },
                         required=["email", "first_name",
                                   "last_name", "password"]
                     ),
                     responses={'200': openapi.Schema(type=openapi.TYPE_OBJECT, properties={'activated': openapi.Schema(type=openapi.TYPE_BOOLEAN)})})
@api_view(['POST'])
@permission_classes((AllowAny, ))
async def register(request):
    from util.helpers import detect_language_by_request
    logger.debug('/api/account/register called')
    lang = await sync_to_async(detect_language_by_request)(request)
    data = request.data.copy()
    data['language'] = lang
    data['IP'] = get_ip(request)

    account = await models.Account.objects.filter(email=data['email']).afirst()
    if not account:
        serializer = CreateAccountSerializer(data=data)
        if not serializer.is_valid():
            raise APIRequestException('Wrong form parameters', ErrorCodes.wrong_parameters,
                                      error_data=serializer.errors)
        logger.debug('/api/account/register calling serializer.save')
        await sync_to_async(serializer.save)()
    elif account.is_active:
        raise APILogicException('User already registered',
                                ErrorCodes.account_exists)
    else:
        await models.AccountManager().register_cloud_invite_user(
            data['email'], data['password'], data)

    logger.debug('/api/account/register checking if activated')
    activated = models.AccountManager().check_if_activated(
        request, data['email'], data['password'])
    logger.debug('/api/account/register completed')
    return api_success({'activated': activated})


def send_login_failed_signal(sender, email, password, request):
    user_login_failed.send(
        sender=sender,
        credentials=django.contrib.auth._clean_credentials(
            {'email': email, 'password': password}),
        request=request
    )


@swagger_auto_schema(method="POST",  # auto_schema=None,
                     request_body=openapi.Schema(
                         type=openapi.TYPE_OBJECT,
                         properties={
                             "code": authorization_code__body,
                             "remember": remember__body,
                             "timezone": timezone__body
                         },
                         required=["code"]
                     ))
@api_view(["POST"])
@permission_classes((AllowAny, ))
async def login(request):
    require_params(request, ('email', 'password'))

    email = request.data.get('email').lower()
    password = request.data.get('password')
    ip = get_ip(request)

    try:
        token = await sync_to_async(Auth.get_token, thread_sensitive=False)(email, password, ip=ip)
        validate_token = await sync_to_async(Auth.validate_token, thread_sensitive=False)(token['access_token'])
    except (APILogicException, APINotAuthorisedException) as exception:
        await sync_to_async(send_login_failed_signal)(__name__, email, password, request)
        raise exception

    if email != validate_token['username']:
        email = validate_token['username']

    try:
        user = await models.Account.objects.aget(email=email)
    except models.Account.DoesNotExist:
        send_login_failed_signal(__name__, email, password, request)
        user = None

    if user is None:
        # If account was blocked we put it in the session to log the login error
        if 'account_blocked' in request.session:
            request.session.pop('account_blocked', None)
            raise APINotAuthorisedException(
                "Account is blocked", ErrorCodes.account_blocked)
        # try to find user in the DB
        if not await sync_to_async(models.AccountManager.is_email_in_portal)(email):
            raise APINotFoundException(
                "User not in cloud portal")  # user not found here
        raise APINotAuthorisedException("Password is invalid")

    if 'remember' not in request.data or not request.data['remember']:
        request.session.set_expiry(0)
    else:
        request.session.set_expiry(get_authenticated_session_cookie_age())

    return await login_helper(request, token, user)


@api_view(["POST"])
@permission_classes((AllowAny, ))
async def login_with_code(request):
    require_params(request, ["code"])
    ip = get_ip(request)
    tokens = None
    try:
        tokens = await sync_to_async(Auth.get_access_token, thread_sensitive=False)(request.data.get("code"), ip)
        validate_token = await sync_to_async(Auth.validate_token, thread_sensitive=False)(tokens['access_token'])
    except Exception as e:
        if isinstance(e, APINotAuthorisedException) and tokens and e.error_text == "2FA is required":
            return api_success(tokens, status_code=status.HTTP_401_UNAUTHORIZED)
        raise e

    account_info = await sync_to_async(Account.get, thread_sensitive=False)(tokens)
    customization = account_info['customization']
    try:
        user = await models.Account.objects.aget(email=validate_token['username'])
        if user.customization != customization:
            user.customization = customization
            await sync_to_async(user.save)()
    except models.Account.DoesNotExist:
        first_name, last_name = account_info.get('fullName', '').split(' ')
        user = await create_user(
            account_info['email'],
            first_name=first_name,
            last_name=last_name,
            customization=customization,
            is_active=True)

    request.session.set_expiry(get_authenticated_session_cookie_age())
    return await login_helper(request, tokens, user)


@api_view(["POST"])
@permission_classes((IsAuthenticated, ))
async def login_with_tokens(request):
    require_params(request, ["access_token", "refresh_token"])
    tokens = {
        "access_token": request.data["access_token"],
        "refresh_token": request.data["refresh_token"]
    }
    validate_token = await sync_to_async(Auth.validate_token)(tokens["access_token"])
    try:
        user = await models.Account.objects.aget(email=validate_token['username'])
    except models.Account.DoesNotExist:
        raise APINotFoundException("User not in cloud")
    await sync_to_async(kill_tokens)(request, Auth.delete_token)
    await sync_to_async(kill_session)(request)
    request.session.set_expiry(get_authenticated_session_cookie_age())
    return await login_helper(request, tokens, user)


@swagger_auto_schema(method="POST", responses={'200': 'Ok'})
@api_view(['POST'])
@permission_classes((IsAuthenticated, ))
async def logout(request):
    await sync_to_async(kill_tokens)(request, Auth.delete_token)
    await sync_to_async(kill_session)(request)
    return api_success()


@swagger_auto_schema(method="GET",  # auto_schema=None,
                     operation_description="Returns time since password was used in seconds.")
@api_view(['GET'])
@permission_classes((IsAuthenticated, ))
async def time_since_password(request):
    return api_success({
        "timeSincePassword": await sync_to_async(Auth.validate_token)(request.session.get("access_token")).get("time_since_password")
    })


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
@permission_classes((AllowAny, ))
async def index(request):
    theme_cookie = {'theme': { 'value': 'auto', 'httponly': False, 'secure': False }}
    if request.user.is_anonymous:
        return api_success({'is_authenticated': False}, cookies=theme_cookie)

    if request.method == 'GET':
        # get authorized user here
        # Redirect if no version
        # Add indefinate cache heading
        cached = request.query_params.get('cached')
        current_version = not request.query_params.get('force') and cache.get(request.user.email)
        if not cached or not current_version or cached != current_version:
            if not current_version:
                current_version = str(uuid4())
                cache.set(request.user.email, current_version)
            return redirect(f'{reverse("account")}?cached={current_version}')
        serializer = AccountSerializer(request, many=False)
        theme_custom_property = await request.user.accountcustomproperty_set.filter(endpoint='theme').afirst()
        if theme_custom_property and isinstance(theme_custom_property.json_data, dict) and (user_theme := theme_custom_property.json_data.get('theme')):
            theme_cookie['theme']['value'] = user_theme

        return api_success(await sync_to_async(AccountSerializer.data.fget)(serializer), cookies=theme_cookie, additional_headers={'Cache-Control': f'max-age={60**2 * 24}'})

    serializer = AccountUpdateSerializer(request, data=request.data)

    if not serializer.is_valid():
        raise APIRequestException('Wrong form parameters',
                                    ErrorCodes.wrong_parameters,
                                    error_data=serializer.errors)

    await sync_to_async(Account.update)(
        request, request.data['first_name'], request.data['last_name'])
    # if not success:
    #    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    await sync_to_async(serializer.save)()

    return api_success(await sync_to_async(AccountSerializer.data.fget)(serializer))


@swagger_auto_schema(method="POST",  # auto_schema=None,
                     request_body=openapi.Schema(
                         type=openapi.TYPE_OBJECT,
                         properties={
                             "code": authorization_code__body
                         },
                         required=["code"]
                     ))
@api_view(['POST'])
@permission_classes((IsAuthenticated, ))
async def renew_session(request):
    require_params(request, ("code", ))
    old_tokens = {
        "access_token": request.session.pop("access_token"),
        "refresh_token": request.session.pop("refresh_token")
    }
    tokens = await sync_to_async(Auth.get_access_token)(request.data.get("code"), get_ip(request))
    request.session["access_token"] = tokens["access_token"]
    request.session["refresh_token"] = tokens["refresh_token"]

    await sync_to_async(Auth.delete_token)(request, old_tokens["access_token"])
    await sync_to_async(Auth.delete_token)(request, old_tokens["refresh_token"])

    return api_success({
        "msg": "Session has been renewed."
    })


@swagger_auto_schema(method="POST",  # auto_schema=None,
                     operation_description="Returns an temporary authkey based on the user's credentials.",
                     responses={"200": "auth_key"})
@api_view(['POST'])
@permission_classes((IsAuthenticated, ))
async def auth_key(request):
    data = await sync_to_async(Account.create_temporary_credentials)(
        request, credential_type='short')

    key = base64.b64encode(
        (data['login'] + ':' + data['password']).encode('utf-8'))
    return api_success({'auth_key': key})


@swagger_auto_schema(method="POST",  # auto_schema=None,
                     operation_description="Delete's the user's account from cloud portal and cloud db.",
                     request_body=openapi.Schema(
                         type=openapi.TYPE_OBJECT,
                         properties={
                             "password": password__body
                         },
                         required=["password"],
                     ),
                     responses={'200': 'Ok'})
@api_view(['POST'])
@permission_classes((IsAuthenticated, ))
async def delete_user(request):
    require_params(request, ('password',))
    user = request.user

    try:
        await sync_to_async(Account.delete)(user.email, request.data.get('password'))
    except APINotAuthorisedException as error:
        raise APIRequestException('Wrong password', ErrorCodes.wrong_password,
                                  error_data={'password': error.error_data})
    await sync_to_async(kill_tokens)(request, Auth.delete_token)
    await sync_to_async(kill_session)(request)
    await sync_to_async(user.delete)()
    return api_success()


class SecurityAction(enum.Enum):
    activate = 'activate'
    deactivate = 'deactivate'
    toggle = 'toggle'

    @classmethod
    def actions(cls):
        return list(cls.__members__.keys())



class AccountSecurity(APIView):
    permission_classes = [IsAuthenticated]

    def invalidate_user_cache(self, email):
        """
        Clears the cached version for a user to invalidate browser cached version on next request.
        """
        cache.delete(email)

    @method_decorator_async(swagger_auto_schema(
        # auto_schema=None,
        operation_description="Configures 2fa settings for users account.",
        request_body=AccountSecuritySerializer
    ))
    async def post(self, request, *args, **kwargs):
        account_security_serializer = AccountSecuritySerializer(
            data=request.data)
        account_security_serializer.is_valid(raise_exception=True)
        self.invalidate_user_cache(request.user.email)

        mfa_code = account_security_serializer.validated_data.get("mfaCode")
        action = account_security_serializer.validated_data.get("action")
        if action not in SecurityAction.actions():
            raise APIRequestException(
                f"Action is not valid. Should be one of the following {SecurityAction.actions()}",
                ErrorCodes.bad_request)

        if action == SecurityAction.toggle.name:
            account = await sync_to_async(Account.get)(request)
            account_2fa_enabled = not account.get("account2faEnabled")
            res = await sync_to_async(Account.update_2fa_settings, thread_sensitive=False)(
                request, mfa_code, account_2fa_enabled)
            if account_2fa_enabled:
                await sync_to_async(Auth.verify_2fa_code, thread_sensitive=False)(mfa_code, request.session.get("access_token"))
                request.session["has2fa"] = True
            return api_success(res)

        if action == SecurityAction.activate.name:
            require_params(request, ("password",))
            password = request.data.get("password")
            return api_success(await sync_to_async(Account.update_2fa_settings, thread_sensitive=False)(request, mfa_code, True, password=password))
        else:
            res = await sync_to_async(Account.update_2fa_settings, thread_sensitive=False)(request, mfa_code, False)
            await sync_to_async(Auth.delete_2fa_key, thread_sensitive=False)(request)
            request.session["has2fa"] = False
            return api_success(res)

    async def delete(self, request, *args, **kwargs):
        if (await sync_to_async(Account.get, thread_sensitive=False)(request)).get("account2faEnabled"):
            raise APIRequestException('Cannot delete totp while 2fa is enabled', ErrorCodes.bad_request)
        request.session["has2fa"] = False
        cache.delete(request.user.email)
        return api_success(await sync_to_async(Auth.delete_2fa_key, thread_sensitive=False)(request))


@swagger_auto_schema(method="POST",  # auto_schema=None,
                     operation_description="If true then the user has accepted the cookie policy and the cookie banner will not appear.",
                     responses={"200": "Ok"})
@api_view(['POST'])
@permission_classes((IsAuthenticated, ))
async def review_cookie(request):
    request.user.cookie_reviewed = True
    await sync_to_async(request.user.save)()
    return api_success()


@swagger_auto_schema(method="POST",  # auto_schema=None,
                     request_body=openapi.Schema(
                         type=openapi.TYPE_OBJECT,
                         properties={
                             "new_password": password__body,
                             "old_password": password__body,
                             "mfaCode": mfa_code_body
                         },
                         required=["new_password", "old_password"]
                     ),
                     responses={'200': 'Ok'})
@api_view(['POST'])
@permission_classes((IsAuthenticated, ))
async def change_password(request):
    require_params(request, ('old_password', 'new_password'))
    old_password = request.data['old_password']
    new_password = request.data['new_password']

    try:
        CreateAccountSerializer.validate_password(new_password)
    except ValidationError as error:
        raise APIRequestException('Incorrect new password', ErrorCodes.wrong_parameters,
                                  error_data={'new_password': error.detail})

    try:
        mfa_code = request.data.get('mfaCode')
        await sync_to_async(Account.change_password, thread_sensitive=False)(
            request, request.user.email, old_password, new_password, mfa_code)
        await (await models.Account.objects.aget(email=request.user.email)).password_changed()
    except APINotAuthorisedException:
        raise APIRequestException('Wrong old password or invalid mfaCode', ErrorCodes.bad_request)
    except requests.exceptions.HTTPError:
        raise APIRequestException('Missing mfaCode', ErrorCodes.wrong_parameters)
    return api_success()


@swagger_auto_schema(method="POST", auto_schema=None,
                     request_body=openapi.Schema(
                         type=openapi.TYPE_OBJECT,
                         properties={
                             "password": password__body
                         },
                         required=["password"]
                     ),
                     responses={'200': 'Ok'})
@api_view(['POST'])
@permission_classes((IsAuthenticated, ))
async def verify_password(request):
    require_params(request, ['password'])
    await sync_to_async(Account.get, thread_sensitive=False)({}, email=request.user.email,
                password=request.data["password"])
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
                     ), responses={'200': 'Ok'})
@api_view(['POST'])
@permission_classes((AllowAny, ))
async def activate(request):
    if 'code' in request.data:
        code = request.data['code']

        tmp_pass, email = Account.extract_temp_credentials(code)
        account_query = await models.Account.objects.filter(email=email).afirst()
        if account_query and account_query.activated_date:
            raise APIRequestException(
                'Account has already been activated', ErrorCodes.account_activated)

        user_data = await sync_to_async(Account.activate, thread_sensitive=False)(code)

        if 'email' not in user_data:
            raise APIInternalException(
                'No email from cloud_db', ErrorCodes.cloud_invalid_response)

        email = user_data['email'].lower()
        if not await sync_to_async(models.AccountManager.is_email_in_portal)(email):
            raise APIInternalException(
                'No email in portal_db', ErrorCodes.portal_critical_error)

        user = await models.Account.objects.aget(email=email)
        user.activated_date = timezone.now()
        await sync_to_async(user.save)(update_fields=['activated_date'])
    elif 'user_email' in request.data:
        user_email = request.data['user_email'].lower()
        await sync_to_async(Account.reactivate, thread_sensitive=False)(user_email)
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
                     ),
                     responses={'200': 'Ok'})
@api_view(['POST'])
@permission_classes((AllowAny, ))
async def restore_password(request):
    if 'code' in request.data:
        code = request.data['code']
        new_password = request.data['new_password']
        try:
            CreateAccountSerializer.validate_password(new_password)
        except ValidationError as error:
            raise APIRequestException('Wrong new password', ErrorCodes.wrong_parameters,
                                      error_data={'new_password': error.detail})

        mfa_code = request.data.get('mfaCode')
        is_backup = request.data.get('isBackup')
        email = Account.extract_temp_credentials(code)[1]
        await sync_to_async(Account.restore_password, thread_sensitive=False)(code, new_password, mfa_code, is_backup)
        await (await models.Account.objects.aget(email=email)).password_changed()

        account = await models.Account.objects.aget(email=email)
        if not account.activated_date:
            account.activated_date = timezone.now()
            await sync_to_async(account.save)()
    elif 'user_email' in request.data:
        user_email = request.data['user_email'].lower()
        await sync_to_async(Account.reset_password, thread_sensitive=False)(user_email, get_ip(request), request=request)
    else:
        raise APIRequestException('Parameters are missing', ErrorCodes.wrong_parameters,
                                  error_data={'code': ['This field is required.'],
                                              'user_email': ['This field is required.']})
    return api_success()


@api_view(['POST'])
@permission_classes((AllowAny, ))
async def check_account_in_portal(request):
    require_params(request, ('email',))
    email = request.data['email']
    account = await models.Account.objects.filter(email=email).afirst()
    is_active = False
    if account:
        is_active = account.activated_date is not None
    else:
        try:
            account = await sync_to_async(Account.check_account, thread_sensitive=False)(email)
            is_active = account.get('statusCode', '') == 'activated'
            account = await create_user(
                email=email,
                first_name='',
                last_name='',
                customization=get_customization(request),
                is_active=is_active
            )
            if account.is_active:
                account.activated_date = timezone.now()
                await sync_to_async(account.save)()
        except APINotFoundException:
            account = None

    return api_success({
        'active': bool(account) and is_active,
        'emailExists': bool(account)
    })


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
async def check_code_in_portal(request):
    require_params(request, ('code',))
    (temp_password, email) = Account.extract_temp_credentials(
        request.data['code'])
    email_exists = await sync_to_async(models.AccountManager.is_email_in_portal)(email)
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
async def check_auth_code(request):
    require_params(request, ('code',))
    (email, temp_password) = Account.extract_temp_credentials(
        request.data['code'])
    user = django.contrib.auth.authenticate(
        request=request, username=email, password=temp_password)
    if user is None:
        raise APINotAuthorisedException(
            "Auth code has expired.", ErrorCodes.not_authorized)
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


class AccountCustomPropertyView(APIView):
    """
   Get or post custom properties attached to a cloud account.

   GET/POST to your own account requires you to be logged in and is accessed using the following endpoint.
   custom-properties/{custom-endpoint-name}

   GET/POST to another account's custom property requires superuser permissions and is accessed at the following endpoint.
   custom-properties/{custom-endpoint-name}/{username-for-other-account}

   TODO: Add developer/application endpoints such as custom-properties/{developer-username}/{custom-endpoint-name}/{username-for-other-account}
   Could maybe be used to allow an easy place to persist user specific data for other either developer experiments or integrations
    """

    permission_classes = IsAuthenticated,

    def get_and_validate_user(self, request, username=None):
        is_superuser = request.user.is_superuser
        current_user = request.user.email
        if username and not is_superuser and username != current_user:
            raise APIRequestException(
                'Only superusers are able to request custom properties of other users', ErrorCodes.not_authorized)
        else:
            return username or current_user

    async def get(self, request, username=None, endpoint=None):
        username = self.get_and_validate_user(request, username)
        try:
            obj = await models.AccountCustomProperty.objects.aget(
                account__email=username, endpoint=endpoint)
            return Response(obj.json_data)
        except (ObjectDoesNotExist, AttributeError) as e:
            raise APIRequestException(
                f'Custom property {endpoint} was not found for user {username}', ErrorCodes.not_found, str(e))

    async def post(self, request, username=None, endpoint=None, developer=None):
        username = self.get_and_validate_user(request, username)
        current_account = await models.Account.objects.filter(email=username).afirst()

        if not current_account:
            raise APIRequestException(
                f'Failed to save "{endpoint}" for user "{username}". User does not exist', ErrorCodes.not_found)

        try:
            obj, _ = await models.AccountCustomProperty.objects.aget_or_create(
                account=current_account, endpoint=endpoint)
            obj.json_data = request.data
            await sync_to_async(obj.save)()
            return Response(obj.json_data, status=201)
        except Exception as e:
            raise APIRequestException(
                f'Failed to save "{endpoint}" for user "{username}"', ErrorCodes.unknown_error, str(e))

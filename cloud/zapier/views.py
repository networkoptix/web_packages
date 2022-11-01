import base64
import json
import uuid
import logging

import django
from django.utils.http import urlencode
from rest_framework import status
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from bs4 import BeautifulSoup
from drf_yasg.utils import swagger_auto_schema
from zapier.models import ZapHook, GeneratedRule

from cloud.helpers.exceptions import api_success, APINotAuthorisedException, APIException, log_error
from cloud.controllers import cloud_api, cloud_gateway

from cloud import settings

CLOUD_INSTANCE_URL = settings.conf['cloud_portal']['url']
logger = logging.getLogger(__name__)


# Todo: Update zapier auth flow when mediaservers support oauth2 CLOUD-6499
def zapier_exceptions(func):
    """
    Decorator for api_methods to handle all unhandled exception and return some reasonable response for a client
    :param func:
    :return:
    """

    def handler(*args, **kwargs):
        # noinspection PyBroadException
        try:
            data = func(*args, **kwargs)
            if not isinstance(data, Response):
                return Response(data, status=status.HTTP_200_OK)
            return data

        except APIException as error:
            # Do not log not_authorized errors
            log_error(args[0], error, logging.WARNING)

            return error.response()

        except Exception as error:
            log_error(args[0], error, logging.WARNING)

            return Response({
                'resultCode': status.HTTP_503_SERVICE_UNAVAILABLE,
                'errorText': "System unavailable or offline"
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    return handler


def cleanup_generated_tokens(tokens):
    access_token = tokens.get('access_token')
    headers = {
        "Authorization": f"Bearer {access_token}"
    }
    cloud_api.Auth.delete_token_no_refresh(tokens, tokens.get('refresh_token'), headers=headers)
    cloud_api.Auth.delete_token_no_refresh(tokens, access_token, headers=headers)


# Remove password or tokens
def get_system_credentials(system_id, email, password, tokens):
    created_temp_tokens = False
    if email and password:
        with cloud_api.TempLogin(email, password) as credentials:
            data = cloud_api.System.get(credentials.tokens, system_id)
    else:
        data = cloud_api.System.get(tokens, system_id)

    system_info = data.get('systems')[0]

    # System uses rest. Password is removed so that we use the bearer token
    if int(system_info.get("version", "0")[0]) > 4:
        if not tokens:
            tokens = cloud_api.Auth.get_token(email, password)
            created_temp_tokens = True
        password = None
    # System does not use rest. Must use basic auth. If password is missing generate one with tokens.
    elif not password:
        data = cloud_api.Account.create_temporary_credentials(tokens, credential_type='short')
        email = data.get('login')
        password = data.get('password')
    return email, password, tokens, created_temp_tokens


def authenticate(request):
    user = email = password = tokens = None
    if "HTTP_AUTHORIZATION" in request.META:
        auth_type, credentials = request.META['HTTP_AUTHORIZATION'].split()
        auth_type = auth_type.lower()
        if auth_type == "basic":
            email, password = base64.b64decode(
                credentials).decode('utf-8').split(':', 1)
            user = django.contrib.auth.authenticate(
                request=request, username=email, password=password)
        elif auth_type == "bearer":
            tokens = {
                'access_token': credentials,
                'refresh_token': request.data.get('refresh_token')
            }
            user = django.contrib.auth.authenticate(request=request)
            email = user.email

    if user is None:
        raise APINotAuthorisedException('Credentials are invalid')

    return user, email, password, tokens


def increment_rule(rule):
    rule.times_used += 1
    rule.save()


def random_uuid():
    return str(uuid.uuid4())


def sanitize(text):
    return BeautifulSoup(text, "lxml").text


def make_rule(rule_type, email, password, system_id, caption="", description="", source="", zapier_trigger="", tokens=None):
    if rule_type == "Generic Event":
        action_params = json.dumps({"additionalResources": ["{00000000-0000-0000-0000-100000000000}",
                                                            "{00000000-0000-0000-0000-100000000001}"],
                                    "allUsers": False,
                                    "durationMs": 5000,
                                    "forced": True,
                                    "fps": 10,
                                    "needConfirmation": False,
                                    "playToClient": True,
                                    "recordAfter": 0,
                                    "recordBeforeMs": 1000,
                                    "streamQuality": "highest",
                                    "useSource": False
                                    })

        event_condition = json.dumps({"caption": caption,
                                      "description": description,
                                      "eventTimestampUsec": "0",
                                      "eventType": "undefinedEvent",
                                      "metadata": {
                                          "allUsers": False
                                      },
                                      "reasonCode": "none",
                                      "resourceName": source
                                      })

        data = {
            "actionParams": action_params,
            "actionResourceIds": [],
            "actionType": "showPopupAction",
            "aggregationPeriod": 0,
            "comment": f"Auto generated rule for Generic Event from Zapier made by {email}",
            "disabled": False,
            "eventCondition": event_condition,
            "eventResourceIds": [],
            "eventState": "Undefined",
            "eventType": "userDefinedEvent",
            "schedule": "",
            "system": False
        }

    elif rule_type == "Http Action":
        action_params = json.dumps({"allUsers": False,
                                    "durationMs": 5000,
                                    "forced": True,
                                    "fps": 10,
                                    "needConfirmation": False,
                                    "playToClient": True,
                                    "recordAfter": 0,
                                    "recordBeforeMs": 1000,
                                    "requestType": "R0VU",
                                    "httpMethod": "GET",
                                    "streamQuality": "highest",
                                    "url": zapier_trigger,
                                    "useSource": False
                                    })

        event_condition = json.dumps({"caption": "Soft Trigger Send " + caption + " to Zapier",
                                      "description": "_bell_on",
                                      "eventTimestampUsec": "0",
                                      "eventType": "undefinedEvent",
                                      "inputPortId": random_uuid(),
                                      "metadata": {
                                          "allUsers": False,
                                          "instigators": ["{00000000-0000-0000-0000-100000000000}",
                                                          "{00000000-0000-0000-0000-100000000001}"]
                                      },
                                      "reasonCode": "none"
                                      })

        data = {
            "actionParams": action_params,
            "actionResourceIds": [],
            "actionType": "execHttpRequestAction",
            "aggregationPeriod": 0,
            "comment": f"Auto generated rule for HTTP action to Zapier made by {email}",
            "disabled": False,
            "eventCondition": event_condition,
            "eventResourceIds": [],
            "eventState": "Undefined",
            "eventType": "softwareTriggerEvent",
            "schedule": "",
            "system": False
        }

    else:
        return

    cloud_gateway.post(system_id, "ec2/saveEventRule", data, email=email, password=password, tokens=tokens)


def make_or_increment_rule(action, email, system_id, caption, password=None,
                           description=None, source=None, target_url=None,
                           tokens=None):
    rules_query = GeneratedRule.objects.filter(
        email=email, system_id=system_id, caption=caption)
    if action == 'Generic Event':
        rules_query = rules_query.filter(
            source=source, direction="Zapier to Nx").first()

        if not rules_query:
            make_rule(action, email, password, system_id,
                      caption=caption, source=source, description=description, tokens=tokens)
            GeneratedRule(email=email, system_id=system_id, caption=caption,
                          source=source, direction="Zapier to Nx").save()

        else:
            increment_rule(rules_query)

    elif action == 'Http Action':
        rules_query = rules_query.filter(direction="Nx to Zapier")
        if not rules_query.exists():
            make_rule(action, email, password, system_id,
                      caption=caption, zapier_trigger=target_url, tokens=tokens)
            GeneratedRule(email=email, system_id=system_id, caption=caption, direction="Nx to Zapier",
                          times_used=0).save()

    elif action == 'Hook Fired':
        rules_query = rules_query.filter(direction="Nx to Zapier").first()

        if rules_query:
            increment_rule(rules_query)


@swagger_auto_schema(method="GET", auto_schema=None)
@api_view(['GET'])
@permission_classes((AllowAny, ))
@zapier_exceptions
def get_systems(request):
    user, email, password, tokens = authenticate(request)
    data = cloud_api.System.list(
        request, email=email, password=password, one_customization=False)
    zap_list = {'systems': []}
    systems = []

    for system in data['systems']:
        if system['stateOfHealth'] == 'online':
            systems.append({'name': system['name'], 'system_id': system['id']})

    zap_list['systems'] = systems
    return api_success(systems if tokens else zap_list)


def encode_url(query_params):
    return f"api/createEvent?{urlencode(query_params).replace('+', '%20')}"


@swagger_auto_schema(method="POST", auto_schema=None)
@api_view(['POST'])
@permission_classes((AllowAny, ))
@zapier_exceptions
def zapier_send_generic_event(request):
    user, email, password, tokens = authenticate(request)
    system_id = request.data['systemId']
    source = sanitize(request.data['source'])
    caption = sanitize(request.data['caption'])

    email, password, tokens, created_temp_tokens = get_system_credentials(system_id, email, password, tokens)

    query_params = {"source": source, "caption": caption}

    description = sanitize(
        request.data['description']) if 'description' in request.data else ""

    if description:
        query_params['description'] = description

    make_or_increment_rule('Generic Event', email, system_id, caption,
                           password=password, description=description, source=source, tokens=tokens)

    res = cloud_gateway.get(
        system_id, 'api/createEvent', params=query_params, email=email, password=password, tokens=tokens)

    if created_temp_tokens:
        cleanup_generated_tokens(tokens)

    return res


@swagger_auto_schema(method="GET", auto_schema=None)
@api_view(['GET'])
@permission_classes((AllowAny, ))
@zapier_exceptions
def nx_http_action(request):
    if 'caption' not in request.query_params or 'system_id' not in request.query_params:
        return Response({'message': "Caption or System Id are missing from query parameters"}, status=400)
    caption = request.query_params['caption']
    system_id = request.query_params['system_id']
    event = system_id + ' ' + caption
    hooks_event = ZapHook.objects.filter(event=event)

    if hooks_event.exists():
        for hook in hooks_event:
            hook.deliver_hook(None, {'caption': caption})
            make_or_increment_rule(
                'Hook Fired', hook.user.email, system_id, caption)

        return Response({'message': "Webhook fired for " + caption}, status=200)

    else:
        return Response({'message': "Webhook for " + caption + " does not exist"}, status=404)


@swagger_auto_schema(method="GET", auto_schema=None)
@api_view(['GET'])
@permission_classes((AllowAny, ))
@zapier_exceptions
def ping(request):
    authenticate(request)
    return Response({'status': 'ok'})


def generate_subscribe_url_link(query_params):
    return f'{CLOUD_INSTANCE_URL}/zapier/?{urlencode(query_params)}'


@swagger_auto_schema(method="POST", auto_schema=None)
@api_view(['POST'])
@permission_classes((AllowAny, ))
@zapier_exceptions
def subscribe_webhook(request):
    user, email, password, tokens = authenticate(request)

    system_id = request.query_params['system_id']
    caption = sanitize(request.query_params['caption'])
    target = request.data['target_url']

    email, password, tokens, created_temp_tokens = get_system_credentials(system_id, email, password, tokens)

    event = system_id + " " + caption
    query_params = {"system_id": system_id, "caption": caption}
    user_hooks = ZapHook.objects.filter(user=user, target=target)
    if user_hooks.exists():
        return Response({'message': 'There is already a webhook for ' + caption, 'link': None}, status=500)

    url_link = generate_subscribe_url_link(query_params)

    make_or_increment_rule(
        'Http Action', email, system_id, caption, password=password, target_url=url_link, tokens=tokens)
    zap_hook = ZapHook(user=user, event=event, target=target)
    zap_hook.save()

    if created_temp_tokens:
        cleanup_generated_tokens(tokens)
    return Response({'message': 'Webhook created for ' + caption, 'link': url_link}, status=200)


@swagger_auto_schema(method="POST", auto_schema=None)
@api_view(['POST'])
@permission_classes((AllowAny, ))
@zapier_exceptions
def unsubscribe_webhook(request):
    user, email, password, tokens = authenticate(request)
    target = request.data['target_url']

    user_hook = ZapHook.objects.filter(user=user, target=target).first()
    if not user_hook:
        return Response({'message': "Webhook for " + target + " does not exist"}, status=500)

    event = user_hook.event
    user_hook.delete()
    return Response({'message': 'Webhook deleted for ' + event}, status=200)


@swagger_auto_schema(methods=["GET", "POST"], auto_schema=None)
@api_view(['GET', 'POST'])
@permission_classes((AllowAny, ))
@zapier_exceptions
def mock_subscribe(request):
    authenticate(request)
    return Response({'data': [{'caption': 'caption'}]})

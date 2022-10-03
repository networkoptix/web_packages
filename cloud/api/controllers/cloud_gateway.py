from urllib.parse import urljoin
import logging

import requests
from requests.auth import HTTPDigestAuth
from django.conf import settings

from api.controllers.cloud_api import MakeTokenForSystem
from api.helpers.exceptions import validate_mediaserver_response

logger = logging.getLogger(__name__)

CLOUD_GATEWAY_URL = settings.TRAFFIC_RELAY_PROTOCOL + settings.TRAFFIC_RELAY_HOST


@validate_mediaserver_response
def get(system_id, url, params=None, email=None, password=None, tokens=None):
    request = CLOUD_GATEWAY_URL.replace('{systemId}', system_id)
    request = urljoin(request, url)

    auth = None
    if email and password:
        auth = HTTPDigestAuth(email, password)

    if not auth and tokens:
        with MakeTokenForSystem(system_id,
                                access_token=tokens.get('access_token'),
                                refresh_token=tokens.get('refresh_token')) as token:
            return requests.get(request, params=params, headers={"x-runtime-guid": token})

    return requests.get(request, params=params, auth=auth)


@validate_mediaserver_response
def post(system_id, url, data, email=None, password=None, tokens=None):
    request = CLOUD_GATEWAY_URL.replace('{systemId}', system_id)
    request = urljoin(request, url)

    auth = None
    if email and password:
        auth = HTTPDigestAuth(email, password)

    if not auth and tokens:
        with MakeTokenForSystem(system_id,
                                access_token=tokens.get('access_token'),
                                refresh_token=tokens.get('refresh_token')) as token:
            return requests.post(request, json=data, headers={"x-runtime-guid": token})

    return requests.post(request, json=data, auth=auth)

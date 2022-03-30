from urllib.parse import urljoin
import logging

import requests
from requests.auth import HTTPDigestAuth
from django.conf import settings

from cloud.controllers.cloud_api import MakeTokenForSystem
from cloud.helpers.exceptions import validate_mediaserver_response

logger = logging.getLogger(__name__)

CLOUD_GATEWAY_URL = settings.TRAFFIC_RELAY_PROTOCOL + settings.TRAFFIC_RELAY_HOST


@validate_mediaserver_response
def get(system_id, url, email=None, password=None, tokens=None):
    request = CLOUD_GATEWAY_URL.replace('{systemId}', system_id)
    request = urljoin(request, url)

    if tokens:
        with MakeTokenForSystem(system_id,
                                access_token=tokens.get('access_token'),
                                refresh_token=tokens.get('refresh_token')) as token:
            return requests.get(request, headers={"Authorization": f"Bearer {token}"})

    auth = None
    if email and password:
        auth = HTTPDigestAuth(email, password)
    return requests.get(request, auth=auth)


@validate_mediaserver_response
def post(system_id, url, data, email=None, password=None, tokens=None):
    request = CLOUD_GATEWAY_URL.replace('{systemId}', system_id)
    request = urljoin(request, url)
    if tokens:
        with MakeTokenForSystem(system_id,
                                access_token=tokens.get('access_token'),
                                refresh_token=tokens.get('refresh_token')) as token:
            return requests.post(request, json=data, headers={"Authorization": f"Bearer {token}"})

    auth = None
    if email and password:
        auth = HTTPDigestAuth(email, password)

    return requests.post(request, json=data, auth=auth)

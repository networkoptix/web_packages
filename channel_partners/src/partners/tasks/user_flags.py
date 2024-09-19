import httpx
import structlog
from celery import shared_task
from django.conf import settings
from nx_cloud_api_client.base_auth import BearerTokenAuth

from tools.cdb_service_auth import get_auth_token


logger = structlog.get_logger(__name__)


def save_attrs(email: str, attrs: dict):
    client = httpx.Client()
    # TODO. CLOUD-12144
    url = f"https://{settings.DEFAULT_HOST_NAME}/cdb/internal/v0/account/{email}/organization-attrs"
    try:
        auth_token = get_auth_token()
        auth = BearerTokenAuth(auth_token)
    except Exception as exc:
        logger.error("Failed to get auth credentials", error=str(exc))
        auth = None
    response = client.put(url=url, json=attrs, auth=auth)
    return response


@shared_task(retry_kwargs={'max_retries': 30, 'countdown': 30}, autoretry_for=(Exception,))
def register_cps_user(email: str):
    # TBD. Task to create user similar to system
    pass


@shared_task(retry_kwargs={'max_retries': 30, 'countdown': 30}, autoretry_for=(Exception,))
def mark_organization_user(email: str):
    attrs = {"belongsToSomeOrganization": True}
    response = save_attrs(email, attrs)
    if response.status_code == 200:
        return response.json()
    if response.status_code == 404:
        register_cps_user.delay(email)
        return
    response.raise_for_status()
    return response.json()

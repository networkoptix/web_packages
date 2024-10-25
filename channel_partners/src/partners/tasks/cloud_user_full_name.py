from typing import (
    List,
    Set,
    TypedDict,
)
from uuid import uuid4

import httpx
import structlog
from celery import shared_task
from django.conf import settings
from django.db.models import QuerySet
from httpx import Response
from nx_cloud_api_client.base_auth import BearerTokenAuth

from tools.cdb_service_auth import get_auth_token


logger = structlog.get_logger(__name__)


class UserInfo(TypedDict):
    email: str
    full_name: str


def get_emails_from_internal_endpoint(emails: List[str], request_id: str, original_host: str = None) -> List[UserInfo]:
    """
    Fetches user information from an internal endpoint given a list of emails.

    Args:
        emails (List[str]): A list of email addresses to fetch user info for.

    Returns:
        List[UserInfo]: A list of dictionaries containing user information.
    """
    path = f"https://{settings.DEFAULT_HOST_NAME}/cdb/internal/accounts/info"
    headers = {}
    if request_id:
        headers["x-request-id"] = request_id

    if original_host:
        headers["x-original-host"] = original_host
    try:
        auth_token = get_auth_token()
    except Exception as exc:
        logger.error(
            "Failed to get auth credentials",
            exception_type=type(exc).__name__,
            exception_details=str(exc),
            exc_info=True)
        return []
    auth = BearerTokenAuth(auth_token)
    with httpx.Client() as client:

        response: Response = client.post(
            path,
            json={"emails": emails, "fields": ["fullName"]},
            auth=auth,
            headers=headers)

    if response.status_code != 200:
        logger.error(
            "Failed to get emails from internal endpoint",
            response_status_code=response.status_code,
            response_content=response.content,
        )
        response.raise_for_status()

    users = response.json()
    result: List[UserInfo] = []
    for user in users:
        if not (email := user["email"]):
            # just in case
            continue
        if (full_name := user.get("fullName")) is None:
            # data returned for non existing user contains just email
            continue
        result.append(UserInfo(email=email, full_name=full_name))
    return result


def get_missing_emails(emails: Set[str], cloud_db_users: List[UserInfo]) -> None:
    """
    Logs which emails are missing from the returned cloud database users.

    Args:
        emails (Set[str]): A set of email addresses to check against.
        cloud_db_users (List[UserInfo]): A list of user information dictionaries.
    """
    returned_emails = {user_info['email'] for user_info in cloud_db_users}
    missing_emails = emails - returned_emails
    if missing_emails:
        logger.debug("Emails not returned from Cloud DB", emails=list(missing_emails))


def get_users_to_update(cloud_users: QuerySet, cloud_db_users: List[UserInfo]) -> List['CloudUser']:
    """
    Identifies which CloudUser instances need to be updated based on the cloud database users.

    Args:
        cloud_users (QuerySet): A queryset of CloudUser instances to be checked.
        cloud_db_users (List[UserInfo]): A list of user information dictionaries.

    Returns:
        List[CloudUser]: A list of CloudUser instances that require an update.
    """
    users_to_update = []
    cloud_user_dict = {cloud_user.email: cloud_user for cloud_user in cloud_users}

    for user_info in cloud_db_users:
        cloud_user = cloud_user_dict.get(user_info['email'])
        if cloud_user and cloud_user.full_name != user_info['full_name']:
            cloud_user.full_name = user_info['full_name']
            users_to_update.append(cloud_user)

    return users_to_update


def bulk_update_users(users_to_update: List['CloudUser']) -> None:
    """
    Performs a bulk update on a list of CloudUser instances.

    Args:
        users_to_update (List[CloudUser]): The list of CloudUser instances to update.
    """
    from partners.models import CloudUser
    CloudUser.objects.bulk_update(users_to_update, ['full_name'])


@shared_task
def update_cloud_users_full_name(batch_size: int = 500) -> None:
    """
    A Celery task that updates the full names of CloudUser instances in batches.

    Args:
        batch_size (int, optional): The number of CloudUser instances to process per batch. Defaults to 500.
    """
    from partners.models import CloudUser

    # TODO: Create a story to improve the logging.
    #       This should be using Traces / Transactions / Spans!
    request_id = str(uuid4())
    logger.info("Starting Task", request_id=request_id)

    total_users = CloudUser.objects.count()
    logger.info("Total number of CloudUser objects to process", total_users=total_users)

    for start in range(0, total_users, batch_size):
        end = min(start + batch_size, total_users)
        logger.debug("Processing batch", start=start, end=end)

        cloud_users_batch = CloudUser.objects.order_by('id')[start:end]
        emails = {user.email for user in cloud_users_batch}

        cloud_db_users = get_emails_from_internal_endpoint(list(emails), request_id=request_id)
        get_missing_emails(emails, cloud_db_users)

        users_to_update = get_users_to_update(cloud_users_batch, cloud_db_users)

        bulk_update_users(users_to_update)
        logger.debug("Batch update completed", updated_count=len(users_to_update))

    logger.info("Task completed")


@shared_task
def update_cloud_user_full_name(email: str, request_id: str, original_host: str = None) -> None:
    """
    A Celery task that updates the full name of a CloudUser instances

    Args:
        email (str): The email address to update the full name of Cloud User
        request_id (str): The string representation of a UUID for the id of the request.
    """
    from partners.models import CloudUser
    logger.info("Starting Task", email=email)

    # Fetch user information from internal endpoint
    cloud_db_user = get_emails_from_internal_endpoint(
        [email], request_id=request_id, original_host=original_host)

    # Check if any user information was returned
    if not cloud_db_user:
        logger.error("Cloud user not found in Cloud DB", email=email)
        return

    # Extract the user info
    user_info = cloud_db_user[0]

    # Check if the returned email matches the expected email
    if email != user_info.get("email"):
        logger.error(
            "Cloud DB did not return correct Cloud User",
            expected_email=email,
            provided_email=user_info.get("email")
        )
        return

    # Retrieve the CloudUser instance from the local database
    try:
        cloud_user = CloudUser.objects.get(email=email)
    except CloudUser.DoesNotExist:
        logger.error("Local CloudUser does not exist", email=email)
        return

    # Update the full name if it has changed
    if cloud_user.full_name != user_info['full_name']:
        cloud_user.full_name = user_info['full_name']
        cloud_user.save(update_fields=['full_name'])
        logger.debug("CloudUser full name updated", email=email)
    else:
        logger.debug("CloudUser full name is already up to date", email=email)

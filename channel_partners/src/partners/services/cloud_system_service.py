
import httpx
import structlog
from django.conf import settings
from httpx import Response

from partners.models import CloudSystemId


logger = structlog.get_logger(__name__)


class CloudSystemService:

    @staticmethod
    def notify_service_change(cloud_system: CloudSystemId) -> bool:

        # Construct url
        url_path: str = "/rest/v3/system/cloud/sync"
        system_id: str = cloud_system.system_id
        relay_host: str = f"https://{system_id}.{settings.TRAFFIC_RELAY_DOMAIN}{url_path}"

        # Make request and handle response
        try:
            response: Response = httpx.post(relay_host, json={"waitForDone": False})
        except Exception as ex:
            logger.error("Got exception during relay request.",
                         relay_hosts=settings.TRAFFIC_RELAY_DOMAIN,
                         relay_host=relay_host,
                         system_id=cloud_system.system_id,
                         exception=str(ex))
            return False

        if response.is_success:
            logger.info(
                "Successfully sent notification",
                id=cloud_system.pk,
                system_id=cloud_system.system_id,
                relay_host=relay_host,
            )
            return True
        else:
            logger.info(
                "An issue occurred while sending notification",
                id=cloud_system.pk,
                system_id=cloud_system.system_id,
                status_code=response.status_code,
                response_body=response.text,
                request_url=relay_host)
            return False

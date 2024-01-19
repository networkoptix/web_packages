from typing import List

import httpx
import structlog
from httpx import Response

from channel_partners.settings import TRAFFIC_RELAY_HOSTS
from partners.models import CloudSystemId


logger = structlog.get_logger(__name__)


class CloudSystemService:

    @staticmethod
    def notify_service_change(cloud_system: CloudSystemId) -> None:

        hosts: List[str] = TRAFFIC_RELAY_HOSTS

        # Confirming there's at least 1 host
        if len(hosts) == 0:
            logger.error("No Traffic Relay Hosts found")
            raise Exception("No Traffic Relay Hosts found")

        # Construct url
        url_path: str = "/rest/v3/system/cloud/sync"
        traffic_relay_host: str = hosts[0].strip()
        system_id: str = cloud_system.system_id
        relay_host: str = f"https://{system_id}.{traffic_relay_host}{url_path}"

        # Make request and handle response
        response: Response = httpx.post(relay_host, json={"waitForDone": False})

        if response.is_success:
            logger.info(
                "Successfully sent notification",
                id=cloud_system.pk,
                system_id=cloud_system.system_id
            )
        else:
            logger.info(
                "An issue occurred while sending notification",
                id=cloud_system.pk,
                system_id=cloud_system.system_id,
                status_code=response.status_code,
                response_body=response.text,
                request_url=relay_host)

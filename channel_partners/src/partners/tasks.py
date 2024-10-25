import structlog
from celery import shared_task

from partners.models import (
    ChannelPartnerRole,
    OrganizationRole,
)


logger = structlog.get_logger(__name__)


@shared_task()
def celery_health_check():
    org_roles_cnt = OrganizationRole.objects.count()
    cp_roles_cnt = ChannelPartnerRole.objects.count()

    logger.info(
        "Celery health check",
        organization_roles_count=org_roles_cnt,
        channel_partner_roles_count=cp_roles_cnt)

    return {"org_roles_cnt": org_roles_cnt, "cp_roles_cnt": cp_roles_cnt}

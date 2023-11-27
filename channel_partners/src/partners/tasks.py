import logging

from celery import shared_task
from partners.models import OrganizationRole, ChannelPartnerRole

logger = logging.getLogger(__name__)

@shared_task()
def celery_health_check():
    org_roles_cnt = OrganizationRole.objects.count()
    cp_roles_cnt = ChannelPartnerRole.objects.count()
    logger.info(f"Celery health check: organization roles - {org_roles_cnt}, channel partner roles: {cp_roles_cnt}")
    return {"org_roles_cnt": org_roles_cnt, "cp_roles_cnt": cp_roles_cnt}

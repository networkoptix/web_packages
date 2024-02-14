import structlog
from celery import shared_task
from django.db import transaction

from partners.models import ChannelPartnerServiceRecord


logger = structlog.getLogger(__name__)


@shared_task
def check_expired_services_task():
    with transaction.atomic():
        negation_records = ChannelPartnerServiceRecord.check_expired_services()
    logger.info(f"Expired services are checked.", negation_records_count=negation_records)

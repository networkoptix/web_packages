from dateutil.relativedelta import relativedelta
from django.conf import settings
from django.utils import timezone


def calculate_grace_period_expiration_date() -> str:
    """
    Calculates the expiration date based on a grace period.

    This function calculates the expiration date by adding a grace period (in seconds)
    to the current time. The grace period is determined by the `SERVICE_USAGE_CHECK_PERIOD`
    setting, which is used to calculate the number of seconds to offset.

    Returns:
        str: The calculated expiration date formatted as a string in 'YYYY-MM-DD HH:MM:SS' format.
    """
    grace_period_seconds = settings.SERVICE_USAGE_CHECK_PERIOD * 30
    expiration_date = timezone.now() + relativedelta(seconds=grace_period_seconds)
    return expiration_date.strftime('%Y-%m-%d %H:%M:%S')

from django.utils import timezone


def get_period_start():
    return timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)

from datetime import datetime
from unittest import mock

import pytest
from django.utils import timezone

from partners.utils.date_calculations import (
    calculate_grace_period_expiration_date,
)


@pytest.mark.parametrize("service_usage_check_period, expected_result", [
    (30, "2023-01-01 00:15:00"),
    (60, "2023-01-01 00:30:00"),
    (86_400, "2023-01-31 00:00:00"),
    (1, "2023-01-01 00:00:30"),
    (0, "2023-01-01 00:00:00"),
])
def test_expiration_date_calculation(settings, service_usage_check_period, expected_result):
    settings.SERVICE_USAGE_CHECK_PERIOD = service_usage_check_period
    fixed_now = timezone.make_aware(datetime(2023, 1, 1))

    with mock.patch('django.utils.timezone.now', return_value=fixed_now):
        actual = calculate_grace_period_expiration_date()
        assert actual == expected_result

import json
import logging
from uuid import uuid4

import pytest
from django.conf import settings
from pytest_httpx import HTTPXMock

from partners.models import CloudUser
from partners.tasks.cloud_user_full_name import (
    bulk_update_users,
    get_emails_from_internal_endpoint,
    get_missing_emails,
    update_cloud_users_full_name,
)


def count_log_records(caplog, logger_name, level, message):
    # Nice little helper function
    return sum(
        1 for record in caplog.records
        if record.name == logger_name and record.levelno == level and message in record.message
    )


@pytest.mark.no_tasks_autofix
class TestCloudUserFullName:
    host: str = settings.DEFAULT_HOST_NAME

    @pytest.fixture(autouse=True)
    def setUp(self, context_vars):
        pass

    @pytest.mark.django_db
    def test_update_cloud_user_full_name_success(self, httpx_mock: HTTPXMock, caplog):
        email = "user@example.com"
        full_name = "Updated User Example"


        httpx_mock.add_response(
            method="POST",
            url=f"https://{settings.DEFAULT_HOST_NAME}/cdb/internal/accounts/info",
            json=[{"email": email, "fullName": full_name}],
            status_code=200
        )

        CloudUser.objects.create(email=email)

        updated_user = CloudUser.objects.get(email=email)
        assert updated_user.full_name == full_name
        assert "CloudUser full name updated" in caplog.text

    @pytest.mark.django_db
    def test_get_emails_from_internal_endpoint_success(self, httpx_mock: HTTPXMock):
        httpx_mock.add_response(
            method="POST",
            url=f"https://{self.host}/cdb/internal/accounts/info",
            json=[{"email": "user@example.com", "fullName": "User Example"}],
            status_code=200
        )
        emails = ["user@example.com"]

        result = get_emails_from_internal_endpoint(emails, str(uuid4()))

        assert result == [{"email": "user@example.com", "full_name": "User Example"}]

    @pytest.mark.django_db
    def test_get_emails_from_internal_endpoint_not_exists(self, httpx_mock: HTTPXMock):
        httpx_mock.add_response(
            method="POST",
            url=f"https://{self.host}/cdb/internal/accounts/info",
            json=[{"email": "user@example.com"}],
            status_code=200
        )
        emails = ["user@example.com"]

        result = get_emails_from_internal_endpoint(emails, str(uuid4()))

        assert result == []

    @pytest.mark.django_db
    def test_get_emails_from_internal_endpoint_failure(self, httpx_mock):
        emails = ["user@example.com"]
        httpx_mock.add_response(
            method="POST",
            url=f"https://{self.host}/cdb/internal/accounts/info",
            status_code=500
        )

        with pytest.raises(Exception):
            get_emails_from_internal_endpoint(emails)

    def test_get_missing_emails(self, caplog):
        emails = {"user1@example.com", "user2@example.com"}
        cloud_db_users = [{"email": "user1@example.com", "full_name": "User One"}]

        with caplog.at_level(logging.WARNING):
            get_missing_emails(emails, cloud_db_users)

        assert "Emails not returned from Cloud DB" in caplog.text
        assert "user2@example.com" in caplog.text

    @pytest.mark.django_db
    def test_bulk_update_users(self, httpx_mock):

        httpx_mock.add_response(
            method="POST",
            url=f"https://{self.host}/cdb/internal/accounts/info",
            json=[{"email": "user_1@example.com", "fullName": "User One"}],
            status_code=200
        )
        user_1 = CloudUser.objects.create(email='user_1@example.com')
        user_1.save()
        user_1.full_name = 'User One'

        httpx_mock.add_response(
            method="POST",
            url=f"https://{self.host}/cdb/internal/accounts/info",
            json=[{"email": "user_2@example.com", "fullName": "User Two"}],
            status_code=200
        )
        user_2 = CloudUser.objects.create(email='user_2@example.com')
        user_2.save()
        user_2.full_name = 'User Two'

        users_to_update = [user_1, user_2]

        bulk_update_users(users_to_update)

        updated_users = CloudUser.objects.filter(email__in=['user_1@example.com', 'user_2@example.com'])
        assert len(updated_users) == len(users_to_update)

    @pytest.mark.django_db
    def test_update_cloud_users_full_name(self, httpx_mock):
        httpx_mock.add_response(
            method="POST",
            url=f"https://{self.host}/cdb/internal/accounts/info",
            json=[{"email": "user@example.com", "fullName": "User Example"}],
            status_code=200
        )
        CloudUser.objects.create(email='user@example.com').save()

        update_cloud_users_full_name()

        updated_user = CloudUser.objects.get(email='user@example.com')
        assert updated_user.full_name == "User Example"

    @pytest.mark.django_db
    def test_update_cloud_users_full_name_happy_path(self, httpx_mock, caplog):
        num_users = 10
        batch_size = 1
        num_batches = num_users // batch_size

        new_users = [
            CloudUser(email=f'user{i}@example.com')
            for i in range(num_users)
        ]

        CloudUser.objects.bulk_create(new_users)

        for i in range(num_batches):
            expected_request_body = {
                "emails": sorted([f"user{j}@example.com" for j in range(i * batch_size, (i + 1) * batch_size)]),
                "fields": ["fullName"]
            }
            expected_request_json = json.dumps(expected_request_body).encode('utf-8')

            httpx_mock.add_response(
                method="POST",
                url=f"https://{settings.DEFAULT_HOST_NAME}/cdb/internal/accounts/info",
                match_content=expected_request_json,
                json=[
                    {"email": f"user{j}@example.com", "fullName": f"User {j}"}
                    for j in range(i * batch_size, (i + 1) * batch_size)
                ],
                status_code=200
            )

        update_cloud_users_full_name(batch_size=batch_size)

        for i in range(num_users):
            updated_user = CloudUser.objects.get(email=f'user{i}@example.com')
            assert updated_user.full_name == f"User {i}"

        starting_task_count = count_log_records(
            caplog,
            'partners.tasks.cloud_user_full_name',
            logging.INFO,
            'Starting Task')
        task_completed_count = count_log_records(
            caplog,
            'partners.tasks.cloud_user_full_name',
            logging.INFO,
            'Task completed')
        processing_batch_count = count_log_records(
            caplog,
            'partners.tasks.cloud_user_full_name',
            logging.INFO,
            'Processing batch')
        batch_update_completed_count = count_log_records(
            caplog,
            'partners.tasks.cloud_user_full_name',
            logging.INFO,
            'Batch update completed')

        assert starting_task_count == 1
        assert task_completed_count == 1
        assert processing_batch_count == num_batches
        assert batch_update_completed_count == num_batches

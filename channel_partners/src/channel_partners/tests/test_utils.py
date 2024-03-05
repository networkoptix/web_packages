import uuid

from django.test import TestCase

from channel_partners.utils import standardize_path


class TestNormalizePath(TestCase):
    def test_uuid_replace(self):
        path = f"/partners/api/v2/cloud_systems/{uuid.uuid4()}/saas_report/"

        actual = standardize_path(path)
        expected = "/partners/api/v2/cloud_systems/{uuid}/saas_report/"

        assert actual == expected

    def test_multiple_uuid_replace_no_trailing_slash(self):
        path = f"/partners/api/v2/cloud_systems/{uuid.uuid4()}/saas_report/{uuid.uuid4()}"

        actual = standardize_path(path)
        expected = "/partners/api/v2/cloud_systems/{uuid}/saas_report/{uuid}"

        assert actual == expected

    def test_multiple_uuid_replace_with_trailing_slash(self):
        path = f"/partners/api/v2/cloud_systems/{uuid.uuid4()}/saas_report/{uuid.uuid4()}/"

        actual = standardize_path(path)
        expected = "/partners/api/v2/cloud_systems/{uuid}/saas_report/{uuid}/"

        assert actual == expected

    def test_replace_when_nothing_to_replace(self):
        path = "/partners/api/v2/cloud_systems/saas_report/"

        actual = standardize_path(path)
        expected = "/partners/api/v2/cloud_systems/saas_report/"

        assert actual == expected

    def test_email_replace_std_email_no_trailing_slash(self):
        path = "/partners/api/v2/internal/systems/users/nhartleb@networkoptix.com"

        actual = standardize_path(path)
        expected = "/partners/api/v2/internal/systems/users/{email}"

        assert actual == expected

    def test_email_replace_std_email_with_trailing_slash(self):
        path = "/partners/api/v2/internal/systems/users/nhartleb@networkoptix.com/"

        actual = standardize_path(path)
        expected = "/partners/api/v2/internal/systems/users/{email}/"

        assert actual == expected

    def test_enhanced_email_replace_std_email_no_trailing_slash(self):
        path = "/partners/api/v2/internal/systems/users/nhartleb+cpadmin@networkoptix.com"

        actual = standardize_path(path)
        expected = "/partners/api/v2/internal/systems/users/{email}"

        assert actual == expected

    def test_enhanced_email_replace_std_email_with_trailing_slash(self):
        path = "/partners/api/v2/internal/systems/users/nhartleb+cpadmin@networkoptix.com/"

        actual = standardize_path(path)
        expected = "/partners/api/v2/internal/systems/users/{email}/"

        assert actual == expected

    def test_uuid_and_email_no_trailing_slash(self):
        path = f"/partners/api/v2/internal/systems/{uuid.uuid4()}/users/nhartleb@networkoptix.com"

        actual = standardize_path(path)
        expected = "/partners/api/v2/internal/systems/{uuid}/users/{email}"

        assert actual == expected

    def test_uuid_and_email_with_trailing_slash(self):
        path = f"/partners/api/v2/internal/systems/{uuid.uuid4()}/users/nhartleb@networkoptix.com/"

        actual = standardize_path(path)
        expected = "/partners/api/v2/internal/systems/{uuid}/users/{email}/"

        assert actual == expected

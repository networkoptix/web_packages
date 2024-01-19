import pytest
from django.test import RequestFactory
from mock.mock import MagicMock

from utils.views import HealthCheckView


class TestHealthCheckView:

    @pytest.fixture(autouse=True)
    def setup(self):
        self.factory = RequestFactory()

    def test_check_migrations(self, mocker, db):
        errors = HealthCheckView.check_migrations()
        assert errors is False

        mocker.patch('utils.views.MigrationExecutor.migration_plan', return_value=["some value here"])
        errors = HealthCheckView.check_migrations()
        assert errors is True

    def test_check_redis(self, mocker):
        errors = HealthCheckView.check_redis()
        assert errors is False

        caches_mock = mocker.patch('utils.views.caches')
        caches_mock['default']._cache.get_client = MagicMock(side_effect=AttributeError("Some error"))
        errors = HealthCheckView.check_redis()
        assert errors is True

    def test_get_ok(self, db):
        request = self.factory.get('/')
        view = HealthCheckView.as_view()
        response = view(request)
        assert response.status_code == 200

    def test_get_redis_failure(self, db, mocker):
        caches_mock = mocker.patch('utils.views.caches')
        caches_mock['default']._cache.get_client = MagicMock(side_effect=AttributeError("Some error"))
        request = self.factory.get('/')
        view = HealthCheckView.as_view()
        response = view(request)
        assert response.status_code == 503

    def test_get_migrations_failure(self, db, mocker):
        mocker.patch('utils.views.MigrationExecutor.migration_plan', return_value=["some value here"])
        request = self.factory.get('/')
        view = HealthCheckView.as_view()
        response = view(request)
        assert response.status_code == 503

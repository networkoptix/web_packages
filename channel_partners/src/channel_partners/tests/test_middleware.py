import pytest

from partners.views.v2.views import organization_roles


@pytest.fixture()
def set_broken_service_switch():
    def _set_broken_service_switch(active: bool = False):
        from waffle.models import Switch
        Switch.objects.create(name='broken_service', active=active)

    return _set_broken_service_switch


class TestBrokenServiceMiddleware:
    def test_broken_service_middleware(self, arf, set_broken_service_switch):
        from channel_partners.middleware import broken_service_middleware
        request = arf.get('/partners/api/v1/test')
        middleware = broken_service_middleware(organization_roles)
        set_broken_service_switch(active=True)
        response = middleware(request)
        assert response.status_code == 500

    def test_broken_service_middleware_inactive(self, arf, set_broken_service_switch):
        from channel_partners.middleware import broken_service_middleware
        request = arf.get('/partners/api/v1/test')
        middleware = broken_service_middleware(organization_roles)
        set_broken_service_switch(active=False)
        response = middleware(request)
        assert response.status_code == 200

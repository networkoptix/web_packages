from model_bakery import baker

from api.models import Account
from api.views.common import redis_connections


def test_redis_connections(arf, superuser, active_user):
    test_srv_email = 'noptixautoqa@gmail.com'
    test_usr = baker.make(Account, email=test_srv_email)
    forbidden_request = arf.get('/')
    forbidden_request.user = active_user

    response_403 = redis_connections(forbidden_request)

    assert response_403.status_code == 403

    request = arf.get('/')
    request.user = test_usr
    response = redis_connections(request)

    assert response.status_code == 200
    data = response.data
    assert data['total_count'] > 0
    assert 'async_count' in data
    assert 'sync_count' in data
    assert 'unspecified_count' in data

    request = arf.get('/')
    request.user = superuser
    response = redis_connections(request)
    assert response.status_code == 200
import httpx
from django.conf import settings

from partners.auth.system_auth import check_system_credentials
from partners.models import CloudSystemStates


def test_check_system_credentials(mocker, httpx_mock, channel_partner_factory,
                                  organization_factory, system_factory):
    cp = channel_partner_factory()
    org = organization_factory(channel_partner=cp)
    sys = system_factory(organization=org)
    system_id = str(sys.system_id)
    cloud_host = settings.DEFAULT_HOST_NAME
    system_auth_key = 'system_auth_key'
    cdb_url = f'https://{cloud_host}/cdb/systems/{system_id}'
    activated_system = {
        'id': system_id,
        'status': 'activated',
        'name': 'name_activated',
    }
    not_activated_system = {
        'id': system_id,
        'status': 'notActivated',
        'name': 'name_not_activated',
    }
    deleted_system = {
        'id': system_id,
        'status': 'deleted'
    }
    auth_error = {
        'resultCode': 'credentialsRemovedPermanently'
    }
    wrong_id = {
        'id': 'wrong_id',
        'status': 'activated'
    }
    httpx_mock.add_response(url=cdb_url, json=activated_system, status_code=200)
    authenticated, status, system_name = check_system_credentials(system_id, system_auth_key, cloud_host)

    assert authenticated is True
    assert status == CloudSystemStates.ACTIVATED
    assert system_name == 'name_activated'

    httpx_mock.reset()
    httpx_mock.add_response(url=cdb_url, json=not_activated_system, status_code=200)
    authenticated, status, system_name = check_system_credentials(system_id, system_auth_key, cloud_host)

    assert authenticated is False
    assert status == CloudSystemStates.NOT_ACTIVATED
    assert system_name == 'name_not_activated'

    httpx_mock.reset()
    httpx_mock.add_response(url=cdb_url, json=wrong_id, status_code=200)
    authenticated, status, system_name = check_system_credentials(system_id, system_auth_key, cloud_host)

    assert authenticated is False
    assert status is None
    assert system_name == None

    sys.refresh_from_db()
    assert sys.system_state == CloudSystemStates.ACTIVATED

    httpx_mock.reset()
    httpx_mock.add_response(url=cdb_url, json=deleted_system, status_code=200)
    authenticated, status, system_name = check_system_credentials(system_id, system_auth_key, cloud_host)
    assert authenticated is False
    assert status == CloudSystemStates.DELETED
    assert system_name == None

    httpx_mock.reset()
    httpx_mock.add_response(url=cdb_url, json=auth_error, status_code=403)
    authenticated, status, system_name = check_system_credentials(system_id, system_auth_key, cloud_host)
    assert authenticated is False
    assert status == CloudSystemStates.DELETED
    assert system_name is None

    httpx_mock.reset()
    httpx_mock.add_response(url=cdb_url, content=b'some text response', status_code=403)
    authenticated, status, system_name = check_system_credentials(system_id, system_auth_key, cloud_host)
    assert authenticated is False
    assert status is None
    assert system_name is None

    httpx_mock.reset()
    httpx_mock.add_response(url=cdb_url, content=b'some text response', status_code=500)
    authenticated, status, system_name = check_system_credentials(system_id, system_auth_key, cloud_host)
    assert authenticated is False
    assert status is None
    assert system_name is None

    httpx_mock.reset()
    httpx_mock.add_exception(url=cdb_url, exception=httpx.ConnectError('error'))
    authenticated, status, system_name = check_system_credentials(system_id, system_auth_key, cloud_host)
    assert authenticated is False
    assert status is None
    assert system_name is None

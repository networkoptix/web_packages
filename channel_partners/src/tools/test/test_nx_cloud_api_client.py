from uuid import uuid4

import structlog

from tools.nx_cloud_api_client_factory import NxCloudApiClientFactory


class TestNxCloudApiClientFactory:

    def test_get_sync_client_missing_aws_trace_id(self, httpx_mock, cloud_test_host, cdb_introspect_url):
        httpx_mock.add_response(url=cdb_introspect_url, json={}, status_code=200)

        client = NxCloudApiClientFactory.get_sync_client(
            host=cloud_test_host.hostname,
            access_token=str(uuid4()),
            auto_refresh=False
        )
        response = client.authentication.introspect([str(uuid4())])

        assert response.status_code == 200
        assert response.request.headers['X-Amzn-Trace-Id'] == "NOT_SET"

    def test_get_sync_client_with_aws_trace_id_in_context(self, httpx_mock, cloud_test_host, cdb_introspect_url):
        aws_trace_id = str(uuid4())
        structlog.contextvars.bind_contextvars(x_amzn_trace_id=aws_trace_id)

        httpx_mock.add_response(url=cdb_introspect_url, json={}, status_code=200)

        client = NxCloudApiClientFactory.get_sync_client(
            host=cloud_test_host.hostname,
            access_token=str(uuid4()),
            auto_refresh=False,
        )
        response = client.authentication.introspect([str(uuid4())])

        assert response.status_code == 200
        assert response.request.headers['X-Amzn-Trace-Id'] == aws_trace_id

    def test_get_sync_client_with_request_id_in_context(self, httpx_mock, cloud_test_host, cdb_introspect_url):
        request_id = str(uuid4())
        structlog.contextvars.bind_contextvars(request_id=request_id)

        httpx_mock.add_response(url=cdb_introspect_url, json={}, status_code=200)

        client = NxCloudApiClientFactory.get_sync_client(
            host=cloud_test_host.hostname,
            access_token=str(uuid4()),
            auto_refresh=False,
        )
        response = client.authentication.introspect([str(uuid4())])

        assert response.status_code == 200
        assert response.request.headers['x-request-id'] == request_id
        assert response.request.headers['X-Amzn-Trace-Id'] == "NOT_SET"

    def test_get_sync_client_with_request_id_in_context_and_request_id_passed(
            self,
            httpx_mock,
            cloud_test_host,
            cdb_introspect_url
    ) -> None:
        passed_request_id = str(uuid4())
        context_request_id = str(uuid4())

        structlog.contextvars.bind_contextvars(request_id=context_request_id)

        httpx_mock.add_response(url=cdb_introspect_url, json={}, status_code=200)

        client = NxCloudApiClientFactory.get_sync_client(
            host=cloud_test_host.hostname,
            access_token=str(uuid4()),
            auto_refresh=False,
            request_id=passed_request_id,
        )
        response = client.authentication.introspect([str(uuid4())])

        assert response.status_code == 200
        assert response.request.headers['x-request-id'] != context_request_id
        assert response.request.headers['x-request-id'] == passed_request_id
        assert response.request.headers['X-Amzn-Trace-Id'] == "NOT_SET"

import unittest
from typing import (
    Any,
    Dict,
)
from unittest.mock import (
    MagicMock,
    patch,
)

from tools.utils import bind_system_to_cdb_organization


class TestBindSystemToCdbOrganization(unittest.TestCase):
    @patch('tools.utils.NxCloudApiClientFactory.get_sync_client')
    def test_user_agent_header_deleted(self, mock_client: MagicMock):
        # Set up the mock client and its methods
        mock_instance: MagicMock = MagicMock()
        mock_system: MagicMock = MagicMock()
        mock_bind: MagicMock = MagicMock()
        mock_json: MagicMock = MagicMock()
        mock_response: MagicMock = MagicMock(status_code=200, json=mock_json)

        mock_client.return_value.__enter__.return_value = mock_instance
        mock_instance.system = mock_system
        mock_system.bind = mock_bind
        mock_bind.return_value = mock_response

        # Call the function with some test data
        cloud_host: str = 'http://test-cloud-host'
        access_token: str = 'test-access-token'
        organization_id: int = 1234567890
        system_id: int = 9876543210
        name: str = 'Test System'
        customization: Dict[str, Any] = {}
        opaque: str = ''

        bind_system_to_cdb_organization(
            cloud_host,
            access_token,
            organization_id,
            system_id,
            name,
            customization,
            opaque)

        mock_client.assert_called_once_with(host=cloud_host)
        self.assertNotIn('User-Agent', mock_instance.headers)

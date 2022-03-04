import pytest
from rest_framework import status

from cms.views.integration import INTEGRATION_FORBIDDEN, INTEGRATION_NOT_FOUND, get_integration, get_integrations


class TestIntegrations:
    non_existing_asset_id = 100
    number_integrations = 7

    @pytest.fixture(autouse=True)
    def setup(self, account_factory, asset_factory, db):
        self.superuser = account_factory()
        self.non_superuser = account_factory(email='non@super.com', is_superuser=False)
        self.integrations = list(asset_factory(
            qty=self.number_integrations, account=self.superuser))
        self.existing_asset_id = self.integrations[0].id

    def patch_enabled(self, mocker, state=True):
        mocker.patch("cms.views.integration.check_integration_store_enabled", return_value=state)

    def test_get_integration_404(self, mocker, arf):
        self.patch_enabled(mocker)
        request = arf.get(f'/api/cms/integration/{self.non_existing_asset_id}')
        request.session = {}
        request.user = self.superuser
        response = get_integration(request, self.non_existing_asset_id)
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert response.data == INTEGRATION_NOT_FOUND

    def test_get_integration_success(self, mocker, arf):
        self.patch_enabled(mocker)
        request = arf.get(f'/api/cms/integration/{self.existing_asset_id}')
        request.session = {}
        request.user = self.superuser
        response = get_integration(request, self.existing_asset_id)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert response.data[0]['id'] == self.existing_asset_id

    def test_get_integration_draft_permission(self, mocker, arf):
        request = arf.get(f'/api/cms/integration/{self.existing_asset_id}?draft=True')
        request.session = {}
        request.user = self.non_superuser
        mocker.patch('cms.models.UserGroupsToAssetPermissions.check_customization_permission', return_value=True)
        response = get_integration(request, self.existing_asset_id)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert response.data[0]['id'] == self.existing_asset_id

    def test_get_integration_draft_forbidden(self, mocker, arf):
        request = arf.get(f'/api/cms/integration/{self.existing_asset_id}?draft=True')
        request.session = {}
        request.user = self.non_superuser
        response = get_integration(request, self.existing_asset_id)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_get_integration_forbidden(self, mocker, arf):
        self.patch_enabled(mocker, state=False)
        request = arf.get(f'/api/cms/integration/{self.existing_asset_id}')
        request.session = {}
        response = get_integration(request, self.existing_asset_id)
        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert response.data == INTEGRATION_FORBIDDEN

    @pytest.mark.slow
    def test_get_integrations_success(self, mocker, arf):
        self.patch_enabled(mocker)
        request = arf.get(f'/api/cms/integrations')
        request.session = {}
        response = get_integrations(request)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['data']) == self.number_integrations

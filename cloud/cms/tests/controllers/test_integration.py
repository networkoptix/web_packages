import pytest
from uuid import uuid4
from model_bakery import baker
from random import randint

from cms.controllers.integration import add_integration_properties, handle_integration_contexts
from cms.models import AssetType
from cms.tests.controllers.test_asset_json import BaseTestMakeAssetJSON

INTEGRATION = AssetType.ASSET_TYPES.integration

def can_edit_count(assets):
    return len(list(filter(lambda i: i['canEdit'], assets)))

class TestMakeIntegrationsJSON(BaseTestMakeAssetJSON):
    asset_type = INTEGRATION

    @pytest.mark.slow
    def test_integration_properties(self):
        assets = self.make_assets(
            self.user, self.asset_count)
        asset_jsons = self.make_asset_json(assets=assets, user=self.user)

        for asset_json in asset_jsons:
            assert 'urlified' in asset_json
            assert asset_json['mine'] == True
            assert asset_json['canEdit'] == True

    @pytest.mark.slow
    def test_superuser_can_edit_all(self, account_factory):
        additional_user = account_factory(
            email='user2@user.com', is_superuser=False)
        additional_user_asset_count = randint(1,10)
        assets = [
            *self.make_assets(self.user, self.asset_count),
            *self.make_assets(additional_user, additional_user_asset_count),
        ]
        non_superuser_asset_json = self.make_asset_json(
            assets=assets, user=self.user, request=self.request)
        superuser_asset_json = self.make_asset_json(
            assets=assets, user=self.superuser_account, request=self.request)

        # Test that non-superuser can only edit their own assets
        assert can_edit_count(non_superuser_asset_json) == self.asset_count
        assert can_edit_count(superuser_asset_json) == len(assets)


class TestHandleIntegrationContexts:
    def test_downloadFiles_adds_downloads_order(self, db, mocker):
        context_name = 'downloadFiles'
        context = baker.make('Context', name=context_name)
        asset_dict = {}
        context_dict = {
            'test': str(uuid4())
        }
        order = str(uuid4())
        mocker.patch(
            'cms.controllers.integration.get_downloads_order', return_value=order)
        handle_integration_contexts(context_dict, context, asset_dict)

        assert asset_dict[context_name] == context_dict
        assert asset_dict[f"{context_name}Order"] == order

    def test_support_context_removes_properties(self, db):
        context_name = 'support'
        context = baker.make('Context', name=context_name)
        asset_dict = {}
        context_dict = {
            'supportEmail': True,
            'hideEmail': True,
            'test': True
        }
        handle_integration_contexts(context_dict, context, asset_dict)

        assert asset_dict['support']['test']
        assert 'hideEmail' not in asset_dict['support']
        assert 'supportEmail' not in asset_dict['support']


class TestAddIntegrationProperties:
    @pytest.fixture(autouse=True)
    def setup(self, db, account_factory):
        self.asset_name = str(uuid4())
        self.asset = baker.make('Asset', name=self.asset_name)
        self.user = account_factory()

    def test_mine(self, account_factory):
        self.user.is_superuser = False
        user_assets = {
            self.asset.id: True
        }
        asset_dict = add_integration_properties({}, self.asset, self.user, user_assets)

        assert asset_dict['mine'] == True
        assert asset_dict['canEdit'] == True # Because 'mine' is True

    def test_canEdit_is_true_if_superuser(self, account_factory):
        asset_dict = add_integration_properties({}, self.asset, self.user, {})

        assert asset_dict['mine'] == False
        assert asset_dict['canEdit'] == True

    # TODO: test urlify

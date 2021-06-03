import pytest

from cms.models import AssetCustomizationReview
from cms.controllers.integration import make_integrations_json


class TestMakeIntegrationsJSON:
    user_a_count = 3
    user_b_count = 2
    pending_count = 3

    @pytest.fixture(autouse=True)
    def setup(self, db, account_factory, mocker, asset_factory, language_factory):
        self.accepted_count = self.user_a_count + self.user_b_count
        self.language = language_factory()
        self.superuser_account = account_factory()
        self.user_a_account = account_factory(email='a@user.com', is_superuser=False)
        self.user_b_account = account_factory(email='a@user.com', is_superuser=False)

        user_a_assets = list(asset_factory(
            qty=self.user_a_count, account=self.user_a_account))
        user_b_assets = list(asset_factory(
            qty=2, account=self.user_b_account))
        mocker.patch.object(self.user_a_account, 'assets_with_permission', return_value=[
                            asset.id for asset in user_a_assets])
        mocker.patch.object(self.user_b_account, 'assets_with_permission', return_value=[
                            asset.id for asset in user_b_assets])

        self.integrations = [
            *user_a_assets,
            *user_b_assets,
            *asset_factory(qty=self.pending_count, account=self.superuser_account,
                                  state=AssetCustomizationReview.REVIEW_STATES.pending)
        ]

    def with_arguments(self, user=None, **kwargs):
        '''
        Default kwargs:

        contexts=None, show_pending=False, show_drafts=False, user=None
        '''
        return make_integrations_json(self.integrations, self.language, user=user or self.superuser_account, **kwargs)

    def test_with_defaults(self):
        integrations = self.with_arguments()
        assert len(integrations) == self.accepted_count

    def test_superuser_can_edit(self):
        integrations = self.with_arguments()
        assert can_edit_count(integrations) == self.accepted_count

    def test_with_show_pending(self):
        integrations = self.with_arguments(show_pending=True)
        assert len(integrations) == self.pending_count

    def test_with_show_drafts(self):
        integrations = self.with_arguments(show_drafts=True)
        assert all(integration['draft'] for integration in integrations)

    def test_with_non_superuser(self):
        integrations = self.with_arguments(user=self.user_a_account)
        assert can_edit_count(integrations) == self.user_a_count


def can_edit_count(integrations):
    return len(list(filter(lambda i: i['canEdit'], integrations)))

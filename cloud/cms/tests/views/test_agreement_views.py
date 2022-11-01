import pytest
from rest_framework import status

from cms.views.agreement import AGREEMENT_NOT_FOUND, AGREEMENT_REVIEW_NOT_FOUND, NO_REVIEW_PROVIDED, PREVIEW_NOT_ALLOWED, accept_agreement, get_agreement
from cms.models import AssetCustomizationReview, AssetType


class TestAgreement:
    non_existing_agreement_id = -1

    @pytest.fixture
    def uses(self, account_factory, asset_factory, customization_factory, arf, db):
        def helper(customization=False, superuser=False, non_superuser=False, agreement=False, draft_agreement=False, pending_agreement=False):
            self.arf = arf
            if agreement or draft_agreement or pending_agreement:
                superuser = non_superuser = True

            if customization:
                self.customization = customization_factory()

            # users
            if superuser:
                self.superuser = account_factory()

            if non_superuser:
                self.non_superuser = account_factory(
                    email='non@super.com', is_superuser=False)

            # agreements
            if agreement:
                self.agreement = next(asset_factory(
                    asset_type=AssetType.ASSET_TYPES.agreement, account=self.superuser))
            if draft_agreement:
                self.draft_agreement = next(asset_factory(
                    asset_type=AssetType.ASSET_TYPES.agreement, account=self.superuser, draft=True))

            if pending_agreement:
                self.pending_agreement = next(asset_factory(
                    asset_type=AssetType.ASSET_TYPES.agreement, account=self.superuser, state=AssetCustomizationReview.REVIEW_STATES.pending))


        return helper

    def get_agreement_with(self, user, agreement_id=None, state=None):
        request = self.arf.get(
            f'/api/cms/agreement?state={state or ""}&id={agreement_id}')
        request.session = {}
        request.user = user
        return get_agreement(request)

    def accept_agreement_with(self, user, agreement_id = None):
        request = self.arf.post(f'/api/cms/accept_agreement',
                                data=agreement_id and {'review_id': agreement_id})
        request.session = {}
        request.user = user
        return accept_agreement(request)

    def test_agreement_200(self, uses):
        uses(agreement=True)
        response = self.get_agreement_with(
            self.non_superuser, self.agreement.id)
        assert response.status_code == status.HTTP_200_OK
        assert response.data['id'] == self.agreement.id
        assert not response.data['accepted']

    def test_agreement_404(self, uses):
        uses(agreement=True)
        response = self.get_agreement_with(
            self.non_superuser, self.non_existing_agreement_id)
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert response.data['errorText'] == AGREEMENT_NOT_FOUND

    def test_agreement_403(self, uses):
        uses(agreement=True)
        response = self.get_agreement_with(
            self.non_superuser, self.agreement.id, state='draft')
        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert response.data['errorText'] == PREVIEW_NOT_ALLOWED

    def test_accept_success(self, uses):
        uses(agreement=True)
        review = AssetCustomizationReview.objects.filter(
            version__asset=self.agreement).last()
        response = self.accept_agreement_with(self.non_superuser, review.id)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['resultCode'] == 'ok'

    def test_accept_none_found(self, uses):
        uses(agreement=True)
        response = self.accept_agreement_with(
            self.non_superuser, self.non_existing_agreement_id)
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert response.data == AGREEMENT_REVIEW_NOT_FOUND

    def test_accept_no_review_id(self, uses):
        uses(agreement=True)
        response = self.accept_agreement_with(
            self.non_superuser)
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert response.data == NO_REVIEW_PROVIDED

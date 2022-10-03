from cms.views.article import ARTICLE_NOT_FOUND, get_article
import pytest
from rest_framework import status

from cms.models import AssetCustomizationReview, AssetType


class TestArticle:
    non_existing_article_id = -1

    @pytest.fixture
    def uses(self, account_factory, asset_factory, customization_factory, arf, db):
        def helper(customization=False, superuser=False, non_superuser=False, su_accepted=False, su_draft=False, su_pending=False, non_su_accepted=False, non_su_draft=False, non_su_pending=False):
            self.arf = arf
            non_su_asset = non_su_accepted or non_su_draft or non_su_pending
            su_asset = su_accepted or su_draft or su_pending
            non_superuser = non_superuser or non_su_asset
            superuser = superuser or su_asset
 
            if customization or non_su_asset or su_asset:
                self.customization = customization_factory()

            # users

            if superuser:
                self.superuser = account_factory()
            
            if non_superuser:
                self.non_superuser = account_factory(
                    email='non@super.com', is_superuser=False)

            # superuser articles

            if su_accepted:
                self.superuser_accepted_article = next(asset_factory(
                    asset_type=AssetType.ASSET_TYPES.article, account=self.superuser))
            
            if su_draft:
                self.superuser_draft_article = next(asset_factory(
                    asset_type=AssetType.ASSET_TYPES.article, account=self.superuser, draft=True))
            
            if su_pending:
                self.superuser_pending_article = next(asset_factory(
                    asset_type=AssetType.ASSET_TYPES.article, account=self.superuser, state=AssetCustomizationReview.REVIEW_STATES.pending))

            # non-superuser articles

            if non_su_accepted:
                self.non_superuser_accepted_article = next(asset_factory(
                    asset_type=AssetType.ASSET_TYPES.article, account=self.non_superuser))
            
            if non_su_draft:
                self.non_superuser_draft_article = next(asset_factory(
                    asset_type=AssetType.ASSET_TYPES.article, account=self.non_superuser, draft=True))
            
            if non_su_pending:
                self.non_superuser_pending_article = next(asset_factory(
                    asset_type=AssetType.ASSET_TYPES.article, account=self.non_superuser, state=AssetCustomizationReview.REVIEW_STATES.pending))
        

        return helper

    def get_article_with(self, user, article_id=None, state=None):
        request = self.arf.get(
            f'/api/article/{article_id}?state={state}&id={article_id}')
        request.session = {}
        request.user = user
        return get_article(request, article_id)

    def test_get_article_200(self, uses):
        uses(su_accepted=True)
        response = self.get_article_with(self.superuser, article_id=self.superuser_accepted_article.id)

        assert response.status_code == status.HTTP_200_OK

    def test_get_article_404(self, uses):
        uses(su_accepted=True, non_superuser=True)
        response = self.get_article_with(self.non_superuser, article_id=self.non_existing_article_id)
 
        assert response.data.get('errorText', '') == ARTICLE_NOT_FOUND

    def test_get_draft_article_200(self, uses):
        uses(su_draft=True)
        response = self.get_article_with(self.superuser, article_id=self.superuser_draft_article.id, state='draft')

        assert response.status_code == status.HTTP_200_OK

    def test_superuser_get_draft_article_200(self, uses):
        uses(non_su_draft=True, superuser=True)
        response = self.get_article_with(self.superuser, article_id=self.non_superuser_draft_article.id, state='draft')

        assert response.status_code == status.HTTP_200_OK

    def test_non_superuser_get_draft_article_403(self, uses):
        uses(su_draft=True, non_superuser=True)
        response = self.get_article_with(self.non_superuser, article_id=self.superuser_draft_article.id, state='draft')

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_superuser_get_pending_article_200(self, uses):
        uses(non_su_pending=True, superuser=True)
        response = self.get_article_with(self.superuser, article_id=self.non_superuser_pending_article.id, state='pending')

        assert response.status_code == status.HTTP_200_OK

    def test_non_superuser_get_pending_article_403(self, uses):
        uses(su_pending=True, non_superuser=True)
        response = self.get_article_with(self.non_superuser, article_id=self.superuser_pending_article.id, state='pending')

        assert response.status_code == status.HTTP_403_FORBIDDEN

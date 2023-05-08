from datetime import timedelta, datetime
from time import sleep

import pytest
from django.conf import settings
from django.core.cache import caches, cache
from rest_framework import status

from cloud.middleware import TOSAgreementMiddleware
from cms.views.agreement import AGREEMENT_NOT_FOUND, AGREEMENT_REVIEW_NOT_FOUND, NO_REVIEW_PROVIDED, \
    PREVIEW_NOT_ALLOWED, accept_agreement, get_agreement, check_required_tos
from cms.models import AssetCustomizationReview, AssetType, DataStructure, Context, DataRecord, AgreementTypes
from conftest import get_asset_type, make_tos_agreement, make_test_agreement, make_test_version_with_records, \
    make_test_review
from util.base_cache import AgreementCache


class TestAgreement:
    non_existing_agreement_id = -1

    @pytest.fixture
    def uses(self, account_factory, asset_factory, customization_factory, arf, db):
        def helper(customization=False, superuser=False, non_superuser=False, agreement=False,
                   draft_agreement=False, pending_agreement=False, tos_agreement=False,):
            self.arf = arf
            if agreement or draft_agreement or pending_agreement or tos_agreement:
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
                    asset_type=AssetType.ASSET_TYPES.agreement, account=self.superuser,
                    state=AssetCustomizationReview.REVIEW_STATES.pending))

            if tos_agreement:
                self.tos_agreement = next(asset_factory(
                    asset_type=AssetType.ASSET_TYPES.agreement, account=self.superuser))
                make_tos_agreement(self.tos_agreement)

        return helper

    def get_agreement_with(self, user, agreement_id=None, state=None, agreement_type=None):
        request = self.arf.get(
            f'/api/cms/agreement?state={state or ""}&id={agreement_id or ""}&type={agreement_type or ""}')
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
        assert response.data['type'] == 'contributor'
        assert not response.data['accepted']

    def test_agreement_200_without_id(self, uses):
        uses(agreement=True)
        response = self.get_agreement_with(
            self.non_superuser)
        assert response.status_code == status.HTTP_200_OK
        assert response.data['id'] == self.agreement.id
        # Todo. Fix agreement creation to populate it with right data records.
        assert response.data['type'] == 'contributor'
        assert not response.data['accepted']

    def test_tos_agreement_200(self, uses):
        uses(tos_agreement=True)
        response = self.get_agreement_with(
            self.non_superuser, agreement_id=self.tos_agreement.id)
        assert response.status_code == status.HTTP_200_OK
        assert response.data['id'] == self.tos_agreement.id
        assert response.data['type'] == 'tos'
        assert not response.data['accepted']

    def test_tos_agreement_200_without_id(self, uses):
        uses(tos_agreement=True)
        response = self.get_agreement_with(
            self.non_superuser, agreement_type='tos')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['id'] == self.tos_agreement.id
        assert response.data['type'] == 'tos'
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


class TestTosAgreements:

    @pytest.fixture(autouse=True)
    def setup(self, db, default_customization, active_user, superuser):
        caches['agreement'].clear()
        self.customization = default_customization
        self.agreement = make_test_agreement(self.customization)
        self.version = make_test_version_with_records(self.agreement)
        self.review = make_test_review(self.customization, self.version)
        self.user = active_user
        self.superuser = superuser

    def test_check_required_tos_with_no_tos(self):
        review = check_required_tos(self.customization.name, self.user)
        assert review is None

    def test_check_required_tos_grace_period(self):
        version = make_test_version_with_records(self.agreement, agreement_type=AgreementTypes.tos, grace_period=10)
        review = make_test_review(self.customization, version)
        res = check_required_tos(self.customization.name, self.user)
        assert res is None

    def test_check_required_tos_grace_period_expired(self):
        version = make_test_version_with_records(self.agreement, agreement_type=AgreementTypes.tos)
        review = make_test_review(self.customization, version)
        review.reviewed_date = review.reviewed_date - timedelta(days=30)
        review.save()

        res = check_required_tos(self.customization.name, self.user)
        assert res['id'] == review.id
        assert res['asset_id'] == self.agreement.id
        assert res['version_id'] == version.id

    def test_tos_middleware_grace_period(self, arf):
        version = make_test_version_with_records(self.agreement,
                                                 agreement_type=AgreementTypes.tos,
                                                 grace_period=10)
        review = make_test_review(self.customization, version)

        request = arf.get('/admin/cms')
        request.session = {}
        request.user = self.user

        resp = TOSAgreementMiddleware.process_request(TOSAgreementMiddleware, request)
        assert resp is None

    def test_tos_middleware_grace_period_expired(self, arf, disable_feature_flags):
        version = make_test_version_with_records(self.agreement, agreement_type=AgreementTypes.tos)
        review = make_test_review(self.customization, version)
        review.reviewed_date = review.reviewed_date - timedelta(days=30)
        review.save()

        request = arf.get('/admin/cms')
        request.session = {}
        request.user = self.user

        resp = TOSAgreementMiddleware.process_request(TOSAgreementMiddleware, request)
        assert resp.status_code == 451

        # Test superuser access
        request.user = self.superuser

        resp = TOSAgreementMiddleware.process_request(TOSAgreementMiddleware, request)
        assert resp is None

        # Test excluded path
        request = arf.get('/')
        request.session = {}
        request.user = self.user

        resp = TOSAgreementMiddleware.process_request(TOSAgreementMiddleware, request)
        assert resp is None


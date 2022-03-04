from random import randint
import pytest
from rest_framework import status
from cms.models import AssetType

from cms.views.release_notes import RELEASE_NOTES_DRAFT_FORBIDDEN, RELEASE_NOTES_FORBIDDEN, RELEASE_NOTES_NOT_FOUND, RELEASE_NOTES_REVIEW_FORBIDDEN, get_release_note, get_release_notes


class TestReleaseNotes:
    @pytest.fixture(autouse=True)
    def setup(self, account_factory, asset_factory, db):
        self.release_notes_quantity = randint(1, 10)

        self.user = account_factory()
        self.non_superuser = account_factory(
            email='non@super.com', is_superuser=False)
        self.unrelated_user = account_factory(
            email='unrelated@user.com', is_superuser=False)
        self.release_notes = list(asset_factory(
            qty=self.release_notes_quantity, account=self.user, asset_type=AssetType.ASSET_TYPES.release_notes))
        self.existing_release_note_id = self.release_notes[0].id

    def get_release_note(self, arf=None, asset_id=None, user=None, draft=False, pending=False):
        request_url = f'/api/cms/release-notes/{asset_id}?'
        if draft:
            request_url = request_url + 'draft'
        if pending:
            request_url = request_url + 'pending'
        request = arf.get(request_url)
        request.session = {}
        request.user = user
        return get_release_note(request, asset_id)

    def test_get_release_note_404(self, arf):
        non_existant_release_note_id = 0
        response = self.get_release_note(
            arf=arf, asset_id=non_existant_release_note_id, user=self.user)
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert response.data == RELEASE_NOTES_NOT_FOUND

    def test_get_release_note_success(self, arf):
        response = self.get_release_note(
            arf=arf, asset_id=self.existing_release_note_id, user=self.user)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert response.data[0]['id'] == self.existing_release_note_id

    def test_get_release_note_forbidden_anonymous_user_draft(self, arf):
        response = self.get_release_note(
            arf=arf, asset_id=self.existing_release_note_id, draft=True)  # No user
        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert response.data == RELEASE_NOTES_FORBIDDEN

    def test_get_release_note_forbidden_anonymous_user_pending(self, arf):
        response = self.get_release_note(
            arf=arf, asset_id=self.existing_release_note_id, pending=True)  # No user
        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert response.data == RELEASE_NOTES_FORBIDDEN

    def test_get_release_note_forbidden_authenticated_user_draft(self, arf):
        response = self.get_release_note(
            arf=arf, asset_id=self.existing_release_note_id, draft=True, user=self.non_superuser)
        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert response.data == RELEASE_NOTES_DRAFT_FORBIDDEN

    def test_get_release_note_forbidden_authenticated_user_review(self, arf):
        response = self.get_release_note(
            arf=arf, asset_id=self.existing_release_note_id, pending=True, user=self.non_superuser)
        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert response.data == RELEASE_NOTES_REVIEW_FORBIDDEN

    def get_release_notes(self, arf=None, user=None):
        request_url = f'/api/cms/release-notes'
        request = arf.get(request_url)
        request.session = {}
        request.user = user
        return get_release_notes(request)

    def test_get_release_notes_success(self, arf):
        response = self.get_release_notes(arf=arf)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['data']) == self.release_notes_quantity

    @pytest.mark.slow
    def test_get_release_notes_success_superuser(self, arf):
        response = self.get_release_notes(arf=arf, user=self.user)
        assert response.status_code == status.HTTP_200_OK
        # double for drafts
        assert len(response.data['data']) == self.release_notes_quantity * 2

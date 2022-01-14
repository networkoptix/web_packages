import pytest
from random import randint, sample, choice
from uuid import uuid4
from model_bakery import baker
from cms.controllers.integration import make_integrations_json
from cms.controllers.release_notes import RELEASE_NOTES, make_release_notes_json

from cms.models import AssetCustomizationReview, AssetType, Context, DataStructure
from cms.controllers.asset_json import REPLACEMENT_LINK, S3_LINK, generate_asset_dictionary, get_contexts_and_datastructures_of_asset_type, get_current_version, get_latest_ds_values
from conftest import generate_uuids
from util.base_cache import BaseCache

CLOUD_PORTAL = AssetType.ASSET_TYPES.cloud_portal
REVIEW = AssetCustomizationReview.REVIEW_STATES.pending
ACCEPTED = AssetCustomizationReview.REVIEW_STATES.accepted

INTEGRATION = AssetType.ASSET_TYPES.integration
RELEASE_NOTES = AssetType.ASSET_TYPES.release_notes

asset_type_to_json_function = {
    INTEGRATION: make_integrations_json,
    RELEASE_NOTES: make_release_notes_json
}

class BaseTestMakeAssetJSON:
    asset_type = None # Specify the asset_type or the tests will fail
    @pytest.fixture(autouse=True)
    def setup(self, db, account_factory, mocker, asset_factory, language_factory):
        self.asset_factory = asset_factory
        self.mocker = mocker
        self.asset_count = randint(1, 10)
        self.language = language_factory()
        self.superuser_account = account_factory()
        self.user = account_factory(email='user@user.com', is_superuser=False)

    def make_asset_json(self, assets=[], user=None, **kwargs):
        '''
        Default kwargs:

        show_pending=False, show_drafts=False, user=None
        '''
        return asset_type_to_json_function[self.asset_type](assets, self.language, user=user or self.superuser_account, **kwargs)

    def make_assets(self, user, asset_count, state=ACCEPTED, draft=False):
        assets = list(self.asset_factory(qty=asset_count, account=user, asset_type=self.asset_type, state=state, draft=draft))
        self.mocker.patch.object(user, 'assets_with_permission', return_value=[
            asset.id for asset in assets])
        return assets

    def test_no_assets(self):
        asset_json = self.make_asset_json()
        assert isinstance(asset_json, list)
        assert len(asset_json) == 0

    @pytest.mark.slow
    def test_success(self):
        assets = self.make_assets(
            self.user, self.asset_count)
        asset_jsons = self.make_asset_json(assets=assets, user=self.user)
        contexts = Context.objects.filter(asset_type__type=self.asset_type)

        assert len(asset_jsons) == self.asset_count
        for ind in range(self.asset_count):
            assert all(asset_jsons[ind][context.name] is not None for context in contexts)
            assert asset_jsons[ind]['lastModified'] == assets[ind].last_modified
            assert asset_jsons[ind]['review_id'] == None
            assert 'version' not in asset_jsons[ind]

    @pytest.mark.slow
    def test_with_pending(self):
        pending_count = randint(1,10)
        assets = [
            *self.make_assets(self.user, pending_count, state=REVIEW),
            *self.make_assets(self.user, self.asset_count),
            ]
        asset_json = self.make_asset_json(
            assets=assets, user=self.user)
        asset_json_pending = self.make_asset_json(
            assets=assets, user=self.user, show_pending=True)

        # Test that pending assets dont show up if show_pending is False
        assert len(asset_json) == self.asset_count
        for asset in asset_json:
            assert 'pending' not in asset

        # Test that only pending assets show up if show_pending is True
        assert len(asset_json_pending) == pending_count
        assert all(asset['pending'] for asset in asset_json_pending)

    @pytest.mark.slow
    def test_with_draft(self):
        assets = self.make_assets(self.user, self.asset_count)
        asset_json_draft = self.make_asset_json(
            assets=assets, user=self.user, show_drafts=True)

        # all assets default to draft form
        assert len(asset_json_draft) == len(assets)
        assert all(asset['draft'] for asset in asset_json_draft)


class TestGetContextsAndDatastructuresOfAssetType:
    @pytest.fixture(autouse=True)
    def setup(self, db, mocker):
        self.asset_type = choice(AssetType.objects.all())
        self.context = baker.make(
            'Context', asset_type=self.asset_type)

        self.datastructure_count = randint(1,10)
        self.datastructures = baker.make("Datastructure", _quantity=self.datastructure_count, context=self.context)

    def test_success(self):
        contexts, datastructures = get_contexts_and_datastructures_of_asset_type(self.asset_type.type)
        assert self.context in contexts
        assert all(mock_datastructure in datastructures for mock_datastructure in self.datastructures)


class TestGenerateAssetStateDictionary:
    class MockAsset:
        def __init__(self, last_modified, id):
            self.last_modified = last_modified
            self.id = id

    def test_standard(self):
        current_version, review_id, last_modified, id = generate_uuids(4)
        asset_dict = generate_asset_dictionary(False, False, self.MockAsset(last_modified, id), current_version, review_id, include_last_modified=True)

        assert asset_dict['lastModified'] == last_modified
        assert asset_dict['version'] == current_version
        assert asset_dict['id'] == id
        assert asset_dict['review_id'] == review_id

    def test_pending_and_draft(self):
        current_version, review_id, last_modified, id = generate_uuids(4)
        asset_dict = generate_asset_dictionary(True, True, self.MockAsset(
            last_modified, id), current_version, review_id, include_last_modified=True)

        # Even if include_last_modified is True, dont include if draft or pending is showing
        assert 'lastModified' not in asset_dict
        assert asset_dict['version'] == current_version
        assert asset_dict['id'] == id
        assert asset_dict['review_id'] == review_id
        assert asset_dict['pending'] == True
        assert asset_dict['draft'] == True


class TestGetLatestDsValues:
    @pytest.fixture(autouse=True)
    def setup(self, db, mocker):
        self.datastructure_count = randint(3,10)
        ids = sample(range(1000,4000), self.datastructure_count)
        self.context = baker.make("Context")
        datastructures = []
        self.mock_records = {}  # records structure: { datastructure_id: datastructure_value }
        for id in ids:
            self.mock_records[id] = str(uuid4())
            datastructures.append(baker.make(
                'Datastructure', id=id, context=self.context, name=f"{id}'s name"))

        self.datastructures = datastructures
        mocker.patch(
            'cms.controllers.asset_json.find_actual_values',  return_value=self.mock_records)

    def test_success(self):
        for context, context_dict in get_latest_ds_values(False, False, [self.context], self.datastructures, None, None):
            assert context == self.context
            for key in context_dict:
                id = int(key[:4])
                assert self.mock_records[id] == context_dict[key]

    def test_s3_links_are_replaced(self):
        external_image, external_file = self.datastructures[0:2]
        external_image.type = DataStructure.DATA_TYPES.external_image
        external_image.save()
        self.mock_records[external_image.id] = f"Test {S3_LINK} Test"

        external_file.type = DataStructure.DATA_TYPES.external_file
        external_file.save()
        self.mock_records[external_file.id] = f"Test {S3_LINK} Test"

        for context, context_dict in get_latest_ds_values(False, False, [self.context], self.datastructures, None, None):
            for key in context_dict:
                assert S3_LINK not in context_dict[key]
                if key in [external_image.name, external_file.name]:
                    assert REPLACEMENT_LINK in context_dict[key]

    def test_private_datastructures_are_skipped(self):
        private_ds = self.datastructures[0]
        private_ds.public = False
        private_ds.save()

        for context, context_dict in get_latest_ds_values(False, False, [self.context], self.datastructures, None, None):
            for key in context_dict:
                assert key != private_ds.name

    def test_blank_record_values_are_skipped_unless_multiselect(self):
        blank_ds, multiselect_ds = self.datastructures[0:2]
        blank_id, multiselect_id = blank_ds.id, multiselect_ds.id
        multiselect_ds.type = DataStructure.DATA_TYPES.multiselect
        multiselect_ds.save()
        self.mock_records[blank_id], self.mock_records[multiselect_id] = '', ''

        for context, context_dict in get_latest_ds_values(False, False, [self.context], self.datastructures, None, None):
            multiselect_ds_found = False
            for key in context_dict:
                assert key != blank_ds.name
                multiselect_ds_found = multiselect_ds_found or key == multiselect_ds.name
            assert multiselect_ds_found


class TestGetCurrentVersion:
    @pytest.fixture(autouse=True)
    def setup(self, db, mocker, language_factory):
        self.state = choice('latest, review')
        self.language = language_factory()
        self.current_version = randint(1000,4000)
        self.asset = baker.make('Asset')
        self.versions = {
            self.asset.id: self.current_version
        }

    def generate_lookup_key(self):
        return BaseCache.generate_lookup_key(self.language, self.state, self.asset.id, self.current_version)

    def version_not_found(self, has_version, current_version, lookup_key, review_id):
        assert has_version is False
        assert current_version is None
        assert lookup_key is None
        assert review_id is None

    def test_success(self):
        has_version, current_version, lookup_key, review_id = get_current_version(
            self.language, self.state, self.versions, self.asset)

        assert has_version == True
        assert current_version == self.current_version
        assert lookup_key == self.generate_lookup_key()
        assert review_id == None

    def test_version_not_found(self):
        self.versions[self.asset.id] = 0
        has_version, current_version, lookup_key, review_id = get_current_version(
            self.language, self.state, self.versions, self.asset)

        self.version_not_found(has_version, current_version, lookup_key, review_id)

    def test_pending_success(self, mocker):
        version = baker.make("ContentVersion", id=self.current_version)
        review = baker.make('AssetCustomizationReview', version=version)
        mocked_get_pending_version = mocker.patch('cms.controllers.asset_json.get_review_matching_current_version',
                                                   return_value=review)
        has_version, current_version, lookup_key, review_id = get_current_version(
            self.language, self.state, self.versions, self.asset, show_pending=True)

        assert mocked_get_pending_version.called_once_with(self.asset, self.current_version)
        assert has_version == True
        assert current_version == self.current_version
        assert lookup_key == self.generate_lookup_key()
        assert review_id == review.id

    def test_pending_version_not_found(self, mocker):
        mocker.patch('cms.controllers.asset_json.get_review_matching_current_version',
                      return_value=None)
        has_version, current_version, lookup_key, review_id = get_current_version(
            self.language, self.state, self.versions, self.asset, show_pending=True)

        self.version_not_found(has_version, current_version, lookup_key, review_id)

    def test_draft_success(self):
        self.state = 'draft'
        has_version, current_version, lookup_key, review_id = get_current_version(
            self.language, self.state, self.versions, self.asset, show_drafts=True) # show_drafts True

        assert has_version == True
        assert current_version == None
        assert lookup_key == self.generate_lookup_key()
        assert review_id == None

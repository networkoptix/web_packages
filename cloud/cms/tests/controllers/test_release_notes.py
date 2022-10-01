from cms.controllers.release_notes import RELEASE_NOTES
from cms.tests.controllers.test_asset_json import BaseTestMakeAssetJSON


class TestMakeReleaseNotesJSON(BaseTestMakeAssetJSON):
    asset_type = RELEASE_NOTES
from cms.models import AssetCustomizationReview, AssetType
from cms.controllers.documentation import generate_doc_json, inline_styles, split_blocks
import pytest

def test_inline_styles():
    body = '<h2>Test</h2>'
    css = 'h2 {\r\n    color: blue !important;\r\n}'
    expected_with_css = '<style>.article-content h2 {\n  color: blue !important; }\n</style><h2>Test</h2>'
    no_css = inline_styles(body, '')
    with_css = inline_styles(body, css)
    assert no_css == body
    assert with_css == expected_with_css


def test_split_blocks():
    html = '<h2>Test</h2><p class="content-block">Block</p><h3></h3><p class="content-block">Block</p>'
    blocks = split_blocks(html)
    assert len(blocks) == 4


class TestGenerateDocJSON:
    accepted_count = 5
    pending_count = 3

    @pytest.fixture(autouse=True)
    def setup(self, db, language_factory, account_factory, asset_factory):
        self.language = language_factory()
        account = account_factory()

        self.docs = [
            *asset_factory(qty=self.pending_count, account=account, asset_type=AssetType.ASSET_TYPES.documentation,
                                  state=AssetCustomizationReview.REVIEW_STATES.pending),
            *asset_factory(qty=self.accepted_count, account=account, asset_type=AssetType.ASSET_TYPES.documentation,
                                  state=AssetCustomizationReview.REVIEW_STATES.accepted)
        ]

    def with_arguments(self, **kwargs):
        '''
        Default kwargs:

         draft=False, review=False, trust_cache=False, global_contexts=None, global_contexts_dict=None
        '''
        return generate_doc_json(self.docs, self.language, **kwargs)

    def test_with_defaults(self):
        docs = self.with_arguments()
        assert len(docs) == self.accepted_count

    def test_with_review(self):
        docs = self.with_arguments(review=True)
        assert len(docs) == self.pending_count + self.accepted_count

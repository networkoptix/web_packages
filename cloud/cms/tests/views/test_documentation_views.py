import pytest
from rest_framework import status

from cms.controllers.documentation import generate_doc_json
from cms.models import Menu, AssetType, MenuCache
from cms.views.documentation import KB_NOT_FOUND, PAGE_NOT_FOUND, find_article, find_asset_knowledgebase, get_page, get_pages, kb_for_article, menu_to_endpoint, populate_docs_from_knowledgebase, simple_filter

MENU_CACHE = MenuCache()


class TestDocumentation:
    customization = 'default'
    non_existing_asset_id = -1
    number_docs = 11

    # kb menu settings
    test_kb_name = 'Test Knowledgebase'
    test_kb_non_existing = 'Non Existing'
    test_kb_base_url = 'test'
    test_kb_url = 'knowledgebase'

    # kb struct settings
    test_struct_name = 'Test Struct'
    test_struct_base_url = 'test'
    test_struct_url = 'struct'

    @pytest.fixture(autouse=True)
    def setup(self, account_factory, asset_factory, customization_factory, menu_factory, asset_menu_node_factory, arf, db):
        # Setup common
        MENU_CACHE.clear_cache()
        self.arf = arf
        self.superuser = account_factory()
        self.enabled_customizations = [customization_factory()]
        self.non_superuser = account_factory(
            email='non@super.com', is_superuser=False)

        # Setup KB Menu docs and nodes
        self.kb_docs = list(asset_factory(asset_type=AssetType.ASSET_TYPES.documentation,
                                          qty=self.number_docs, account=self.superuser))
        self.existing_asset_id = self.kb_docs[0].id
        self.kb_menu_docs = menu_factory(
            name=self.test_kb_name, base_url=self.test_kb_base_url, url=self.test_kb_url)
        self.kb_menu_nodes = [asset_menu_node_factory(
            asset=doc, enabled_customizations=self.enabled_customizations, parent_menu=self.kb_menu_docs) for doc in self.kb_docs]
        self.kb_menu_docs.nodes.add(*self.kb_menu_nodes)

        # Setup KB struct
        self.struct_docs = list(asset_factory(asset_type=AssetType.ASSET_TYPES.documentation,
                                              qty=self.number_docs, account=self.superuser))
        self.kb_menu_struct = menu_factory(
            name=self.test_struct_name, base_url=self.test_struct_base_url, url=self.test_struct_url, menu_type=Menu.MENU_TYPES.docs_struct)
        self.struct_nodes = [asset_menu_node_factory(
            asset=doc, enabled_customizations=self.enabled_customizations, parent_menu=self.kb_menu_struct) for doc in self.struct_docs]
        self.kb_menu_struct.nodes.add(*self.struct_nodes)

    # Helper Methods

    def get_page_with(self, user, asset_id, state=''):
        request = self.arf.get(
            f'/api/documentation/{self.non_existing_asset_id}?state={state}')
        request.session = {}
        request.user = user
        return get_page(request, asset_id)

    def get_pages_with(self, kb_name, user):
        request = self.arf.get(f'/api/documentation/kb/{kb_name}')
        request.session = {}
        request.user = user
        return get_pages(request, kb_name)

    def kb_for_article_with(self, asset_id, user):
        request = self.arf.get(
            f'/api/documentation/find_kb/{asset_id}')
        request.session = {}
        request.user = user
        return kb_for_article(request, asset_id)

    # Testing Views

    @pytest.mark.slow
    def test_get_page_200(self, arf):
        response = self.get_page_with(self.superuser, self.existing_asset_id)
        assert response.status_code == status.HTTP_200_OK
        assert response.data.get('id', None) == self.existing_asset_id

    @pytest.mark.slow
    def test_get_page_403(self, arf):
        response = self.get_page_with(
            self.non_superuser, self.existing_asset_id, state='draft')
        assert response.status_code == status.HTTP_403_FORBIDDEN

    @pytest.mark.slow
    def test_get_page_404(self, arf):
        response = self.get_page_with(
            self.superuser, self.non_existing_asset_id)
        assert response.data.get('errorText', '') == PAGE_NOT_FOUND

    @pytest.mark.slow
    def test_get_pages_200(self):
        response = self.get_pages_with(self.test_kb_name, self.superuser)
        assert response.status_code == status.HTTP_200_OK

    @pytest.mark.slow
    def test_get_pages_404(self):
        response = self.get_pages_with(
            self.test_kb_non_existing, self.superuser)
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert response.data.get(
            'errorText', '') == f'Knowledgebase {self.test_kb_non_existing} not found'

    @pytest.mark.slow
    def test_kb_for_article_200(self):
        response = self.kb_for_article_with(
            self.existing_asset_id, self.superuser)
        assert response.status_code == status.HTTP_200_OK
        assert response.data.get('kb_name', None) == self.test_kb_url
        assert response.data.get('base', None) == self.test_kb_base_url

    @pytest.mark.slow
    def test_kb_for_article_404(self):
        response = self.kb_for_article_with(
            self.non_existing_asset_id, self.superuser)
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert response.data.get('errorText', '') == KB_NOT_FOUND

    @pytest.mark.slow
    def test_menu_to_endpoint(self):
        request = self.arf.get(
            f'/api/documentation/struct/{self.test_struct_name}')
        request.session = {}
        request.user = self.superuser
        response = menu_to_endpoint(request, self.test_struct_name)
        assert response.status_code == status.HTTP_200_OK

    # Testing other documentation view functions

    @pytest.mark.slow
    def test_find_asset_knowledgebase(self):
        found_kb = find_asset_knowledgebase(
            self.kb_docs[0], self.test_kb_base_url)
        assert found_kb == self.test_kb_url


    @pytest.mark.slow
    def test_populate_docs_from_knowledgebase(self, language_factory):
        docs_target = []
        docs_asset_ids = [{'asset_id': doc.id}for doc in self.kb_docs]
        populate_docs_from_knowledgebase(docs_asset_ids, docs_target)
        assert len(docs_target) == self.number_docs

    @pytest.mark.slow
    def test_simple_filter(self, language_factory, asset_factory):
        match_term = 'findMe'
        num_title_matches = 3
        num_short_description_matches = 2

        docs_json = generate_doc_json(
            self.kb_docs, language=language_factory(), trust_cache=False)

        for index in range(num_title_matches + num_short_description_matches):
            docs_json[index]['title' if index < num_title_matches else 'shortDescription'] = ' ' * index + match_term
        filtered = simple_filter(docs_json, match_term)
        assert len(filtered) == num_title_matches + num_short_description_matches
        assert all(index in (doc['titleMatchStart'], doc['shortDescriptionMatchStart']) for index, doc in enumerate(filtered))
        assert all(index + len(match_term) in (doc['titleMatchEnd'], doc['shortDescriptionMatchEnd']) for index, doc in enumerate(filtered))

    @pytest.mark.slow
    def test_find_article(self):
        assert find_article(self.kb_menu_nodes, self.existing_asset_id)

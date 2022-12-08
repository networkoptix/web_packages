import pytest
from collections import defaultdict, OrderedDict
from uuid import uuid4
from random import randint, choice, shuffle, sample, getrandbits
from unittest.mock import call
from model_bakery import baker

from cms.controllers.zendesk import *
from api.tests.utils import unwrap


def test_clean_nodes(mocker):
    generated_assets = []
    generated_nodes = []

    def generate_nodes(target_assets, target_nodes, depth=randint(10, 50)):
        mock_node = mocker.MagicMock()
        add_nodes = depth or depth % choice([2, 3])
        add_asset = depth % choice([3, 4])
        mock_node.nodes.all.return_value = generate_nodes(
            target_assets, target_nodes, depth - 1) if add_nodes else []
        if add_asset:
            mock_asset = mocker.MagicMock()
            mock_node.asset = mock_asset
            target_assets.append(mock_asset)
        target_nodes.append(mock_node)
        return [mock_node]

    node_tree = generate_nodes(generated_assets, generated_nodes)

    clean_nodes(node_tree)
    nodes_and_assets_to_delete = [*generated_assets, *generated_nodes]
    for to_delete in nodes_and_assets_to_delete:
        to_delete.delete.assert_called_once_with()


def test_clean_menu(mocker):
    categories = [mocker.MagicMock() for _ in range(randint(5, 15))]
    mock_nodes = [str(uuid4())]
    mock_clean_nodes = mocker.patch('cms.controllers.zendesk.clean_nodes')
    mock_menu = mocker.MagicMock()
    mock_menu.zendeskcategory_set.all.return_value = categories
    mock_menu.nodes.all.return_value = mock_nodes

    clean_menu(mock_menu)
    mock_clean_nodes.assert_called_once_with(mock_nodes)
    for category in categories:
        category.delete.assert_called_once_with()


def test_item_position(mocker):
    mock_item = mocker.MagicMock()
    assert item_position(mock_item) == mock_item.position


def test_generate_branding_dict(mocker):
    branding_name, branding_value, hidden_name, hidden_value = [
        str(uuid4()) for _ in range(4)]
    branding = [({'name': branding_name}, branding_value)]
    hidden = [({'name': hidden_name}, hidden_value)]
    cloud = [({'name': '%CLOUD_NAME%'}, 'Nx Cloud')]
    vms = [({'name': '%VMS_NAME%'}, 'Nx Meta')]

    mock_get_branding_shortcuts = mocker.patch.object(
        forms, 'get_branding_shortcuts', return_value=[branding, hidden])
    branding_dict = generate_branding_dict()
    ds_values = branding + hidden + cloud + vms
    expected_dict = {
        re.escape(value): ds['name']
        for ds, value in ds_values
    }
    assert branding_dict == expected_dict
    mock_get_branding_shortcuts.assert_called_once_with(customization=None, request=None)


def test_substitute_branding():
    replacement_keys = [f'%{uuid4()}%' for _ in range(5, 50)]
    replacements_lookup = {re.escape(key): str(uuid4())
                           for key in replacement_keys}
    initial = ' '.join(replacement_keys)
    expected = ' '.join(replacements_lookup.values())

    assert substitute_branding(replacements_lookup, initial) == expected


def test_background(mocker):
    mocker.patch('cms.controllers.zendesk.test_background_decorator', True)
    mock_threading = mocker.patch.object(threading, 'Thread')
    args = [str(uuid4()) for _ in range(5, 10)]
    kwargs = {str(uuid4()): str(uuid4()) for _ in range(5, 10)}

    @background
    def test_func(*args, **kwargs):
        pass

    test_func(*args, **kwargs)
    called_kwargs = mock_threading.mock_calls[0].kwargs
    assert called_kwargs['target'].__name__ == test_func.__name__
    assert list(called_kwargs['args']) == args
    assert called_kwargs['kwargs'] == kwargs
    mocker.patch('cms.controllers.zendesk.test_background_decorator', False)


def test_retry(mocker):
    mock_function = mocker.MagicMock()
    args = [str(uuid4()) for _ in range(5, 10)]
    kwargs = {str(uuid4()): str(uuid4()) for _ in range(5, 10)}
    retries = randint(2, 5)

    @retry(retries=retries, delay=0, backoff=0)
    def test_func(*args, **kwargs):
        mock_function(*args, **kwargs)
        raise ValueError()

    # Test retries
    pytest.raises(ValueError, test_func, *args, **kwargs)
    assert mock_function.call_count == retries + 1

    # Test block exception
    @retry(retries=retries, delay=0, backoff=0, block_final_exception=True)
    def test_block_exception():
        raise ValueError()

    test_block_exception()


class TestImporter:
    @pytest.fixture
    def importer_instance(self, asset_factory, db):
        domain, subdomain, user, oauth_token = [str(uuid4()) for _ in range(4)]
        credentials = {'oauth_token': oauth_token}
        _, = asset_factory(asset_type=AssetType.ASSET_TYPES.documentation)
        importer = Importer(domain, subdomain, credentials, user)
        importer.branding = defaultdict(lambda: '')
        return importer

    @pytest.fixture
    def mock_items(self, mocker):
        def create_item(position):
            item = mocker.MagicMock()
            item.position = position
            item.id = item.value = str(uuid4())
            return item

        items = [create_item(position) for position in range(randint(5, 20))]
        expected_values = [section.value for section in items]
        shuffle(items)
        return items, expected_values

    def test_process_sections(self, mocker, importer_instance, mock_items):
        mocker.patch.object(
            Importer, '_process_section', lambda _, section: section.value)
        sections, expected_values = mock_items

        assert importer_instance._process_sections(
            sections) == expected_values

    def test_get_articles(self, mocker, importer_instance, mock_items):
        articles, expected_values = mock_items
        mock_section_id = str(uuid4())
        mock_section = mocker.MagicMock()
        mock_section.id = mock_section_id
        mock_articles_search = mocker.patch.object(
            importer_instance.zen_client.help_center.articles, 'search', return_value=articles)

        articles = importer_instance._get_articles(mock_section)
        assert [article.value for article in articles] == expected_values

    def test_get_sections(self, mocker, importer_instance, mock_items):
        mocker.patch.object(
            importer_instance, '_process_sections', lambda sections: sections)
        importer_instance.all_sections = mock_items[0]
        parent_section = mocker.MagicMock()
        parent_section.id = str(uuid4())
        included_sections = importer_instance.all_sections[:randint(1, 5)]
        for section in included_sections:
            section.parent_section_id = parent_section.id

        assert importer_instance._get_sections(
            parent_section) == included_sections

    def test_process_section(self, mocker, importer_instance):
        section, expected_articles, expected_sections = [
            str(uuid4()) for _ in range(3)]

        mocker.patch.object(
            importer_instance, '_get_articles', return_value=expected_articles)
        mocker.patch.object(
            importer_instance, '_get_sections', return_value=expected_sections)

        assert importer_instance._process_section(section) == {
            'object': section,
            'articles': expected_articles,
            'sections': expected_sections
        }

    def test_pull_category_from_zendesk(self, mocker, importer_instance, mock_items):
        mock_categories = [mocker.MagicMock() for _ in range(5, 20)]
        target_category = choice(mock_categories)

        for category in mock_categories:
            category.name = str(uuid4())

        section_list = mock_items[0]

        for section in section_list:
            section.parent_section_id = None

        mocker.patch.object(
            importer_instance.zen_client.help_center, 'categories', return_value=mock_categories)
        mocker.patch.object(importer_instance.zen_client.help_center.categories,
                            'sections', return_value=section_list)
        mocker.patch.object(
            importer_instance, '_process_sections', lambda sections: sections)

        # Test category not found
        importer_instance.category_name = str(uuid4())
        pytest.raises(CategoryNotFoundException,
                      importer_instance._pull_category_from_zendesk)

        # Test category_found
        importer_instance.category_name = target_category.name
        result = importer_instance._pull_category_from_zendesk()
        assert result == {'category': target_category,
                          'sections': section_list}

    def test_sub_image_sources(self, mocker):
        mock_content_file, *match_obj = [
            str(uuid4()) for _ in range(4)]
        mock_external = mocker.patch.object(
            structure, 'external_file_to_content_file', return_value=mock_content_file)
        files_target = {}

        sub_handler = Importer.sub_image_sources(files_target, mocker.sentinel.branding)
        result = sub_handler(match_obj)
        file_id, file_content = list(files_target.items())[0]
        assert result == f'{match_obj[1]}src="{{image_import:{file_id}}}"'
        assert mock_content_file == file_content
        mock_external.assert_called_with(match_obj[2], mocker.sentinel.branding)

    def test_get_data_records(self, mocker, importer_instance):
        title, substituted_title, src, mock_content_file, *labels = [
            str(uuid4()) for _ in range(randint(10, 20))]
        branding = {str(uuid4()): str(uuid4()) for _ in range(randint(10, 20))}
        importer_instance.branding = branding
        mock_article = mocker.MagicMock()
        mock_article.title = title
        mock_article.label_names = labels
        mock_body = f'<img src="{src}">'
        mocker.patch.object(
            structure, 'external_file_to_content_file', return_value=mock_content_file)
        mocker.patch(
            'cms.controllers.zendesk.substitute_branding', return_value=substituted_title)

        data_records, files = importer_instance._get_data_records(
            mock_article, mock_body)
        file_id, file_content = list(files.items())[0]
        assert data_records == {
            'title': substituted_title,
            'body': f'<img src="{{image_import:{file_id}}}">',
            'labels': ', '.join(set(mock_article.label_names))
        }

    def test_article_save_records(self, mocker, importer_instance, db):
        branding, body, substituted_body, data_records, files, asset = [
            str(uuid4()) for _ in range(6)]
        mock_article = mocker.MagicMock()
        mock_article.body = body
        importer_instance.branding = branding
        target_context = Context.objects.get(
            asset_type__type=AssetType.ASSET_TYPES.documentation, name='content')

        mock_substitute_branding = mocker.patch(
            'cms.controllers.zendesk.substitute_branding', return_value=substituted_body)
        mock_get_data_records = mocker.patch.object(
            importer_instance, '_get_data_records', return_value=[data_records, files])

        mock_save_unrevisioned_records = mocker.patch.object(
            modify_db, 'save_unrevisioned_records')
        importer_instance._article_save_records(mock_article, asset)
        mock_substitute_branding.assert_called_once_with(branding, body)
        mock_get_data_records.assert_called_once_with(
            mock_article, substituted_body)
        structures = mock_save_unrevisioned_records.mock_calls[0].args[3]
        mock_save_unrevisioned_records.assert_called_once_with(
            asset, target_context, None, structures, data_records, files, importer_instance.user, customization=None)

    def test_update_zendesk_article(self, mocker, importer_instance):
        mock_zd_article = mocker.MagicMock()
        mock_article = mocker.MagicMock()
        mock_article.label_names = [str(uuid4()) for _ in range(5, 15)]
        fields = ['author_id', 'comments_disabled', 'draft', 'edited_at',
                  'html_url', 'permission_group_id', 'position', 'promoted',
                  'title', 'updated_at', 'user_segment_id']

        for field in fields:
            setattr(mock_zd_article, field, str(uuid4()))
            setattr(mock_article, field, str(uuid4()))

        mocker.patch.object(
            ZendeskArticleLabel.objects, 'get_or_create', lambda name, site: [name])

        importer_instance._update_zendesk_article(
            mock_article, mock_zd_article)

        for field in fields:
            updated_zd_field_value = getattr(
                mock_zd_article, field, str(uuid4()))
            updated_article_field_value = getattr(
                mock_article, field, str(uuid4()))
            assert updated_zd_field_value == updated_article_field_value

        mock_zd_article.save.assert_called_once_with()
        mock_zd_article.labels.set.assert_called_once_with(
            mock_article.label_names)

    def test_create_zendesk_article(self, mocker, importer_instance):
        asset, section, menu_node, *labels = [str(uuid4()) for _ in range(10)]
        article = mocker.MagicMock()
        mock_zd_article = mocker.MagicMock()
        article.label_names = labels
        mock_article_create = mocker.patch.object(
            ZendeskArticle.objects, 'create', return_value=mock_zd_article)
        mocker.patch.object(ZendeskArticleLabel.objects,
                            'get_or_create', lambda name, site: [name])

        importer_instance._create_zendesk_article(
            article, asset, section, menu_node)
        mock_article_create.assert_called_once_with(
            site=importer_instance.site, section=section, menu_node=menu_node, asset=asset, article=article)
        mock_zd_article.labels.set.assert_called_once_with(labels)

    def test_update_or_create_menu_node(self, mocker, importer_instance, db):
        mock_section_object = mocker.MagicMock()
        mock_section_object.position = randint(5, 100)
        section = {'object': mock_section_object}
        parent_node_name = str(uuid4())
        child_node_name = str(uuid4())

        # Test that node is created
        created_menu_node = importer_instance._update_or_create_menu_node(
            None, parent_node_name, section)
        assert created_menu_node.name == parent_node_name
        assert created_menu_node.order == mock_section_object.position

        # Test that previously created node is retrieved
        retrieved_menu_node = importer_instance._update_or_create_menu_node(
            None, parent_node_name, section)

        assert created_menu_node.id == retrieved_menu_node.id

        # Test creating child node
        child_menu_node = importer_instance._update_or_create_menu_node(
            created_menu_node, child_node_name, section)
        assert child_menu_node.parent_node == created_menu_node

    def test_update_or_create_section(self, mocker, importer_instance, db):
        importer_instance.site = baker.make(ZendeskSite)
        menu_node = baker.make(MenuNode)
        parent_section = baker.make(ZendeskSection)
        mock_section_object = mocker.MagicMock()
        mock_section_object.position = randint(5, 100)
        mock_section_object.id = randint(5, 100)
        mock_section_object.name = str(uuid4())

        # Test create new section
        created_zd_section = importer_instance._update_or_create_section(
            mock_section_object, menu_node, parent_section)
        assert created_zd_section

        # Test retreive existing section
        retrieved_zd_section = importer_instance._update_or_create_section(
            mock_section_object, menu_node, parent_section)
        assert created_zd_section == retrieved_zd_section

    def test_update_or_create_article_node(self, mocker, importer_instance, db):
        menu_node = baker.make(MenuNode)
        mock_article = mocker.MagicMock()
        mock_article.title = str(uuid4())
        mock_article.position = randint(1, 1000)
        mock_article.id = randint(1, 1000)
        zd_section = baker.make(ZendeskSection)
        asset = baker.make(Asset)

        initial_article_node, _ = MenuNode.objects.get_or_create(
            name=substitute_branding(importer_instance.branding, mock_article.title), parent_node=menu_node, asset=asset)
        initial_article = baker.make(ZendeskArticle, section=zd_section,
                                     article_id=mock_article.id, asset=initial_article_node.asset)

        zd_article, article_menu_node = importer_instance._update_or_create_article_node(
            mock_article, menu_node, zd_section)

        assert zd_article and article_menu_node
        assert initial_article_node.id == article_menu_node.id
        assert initial_article.article_id == zd_article.article_id

    def test_add_article_to_menu_node(self, mocker, importer_instance, db):
        menu_node = baker.make(MenuNode)
        mock_article = mocker.MagicMock()
        mock_article.title = str(uuid4())

        importer_instance._add_article_to_menu_node(menu_node, mock_article)
        assert menu_node.asset.name == mock_article.title

    def test_handle_update_zd_article(self, mocker, importer_instance):
        zd_article, article, asset, zd_section = [
            str(uuid4()) for _ in range(4)]
        article_menu_node = mocker.MagicMock()
        article_menu_node.asset = asset
        common_args = article, article_menu_node, zd_section

        mock_create = mocker.patch.object(
            importer_instance, '_create_zendesk_article')
        mock_update = mocker.patch.object(
            importer_instance, '_update_zendesk_article')

        # Test create
        importer_instance._handle_update_zd_article(
            None, *common_args)
        mock_create.assert_called_once_with(
            article, asset, zd_section, article_menu_node)

        # Test update
        importer_instance._handle_update_zd_article(
            zd_article, *common_args)
        mock_update.assert_called_once_with(article, zd_article)

        assert mock_create.call_count == 1
        assert mock_update.call_count == 1

    def test_save_article(self, mocker, importer_instance):
        zd_article, article, asset, menu_node, zd_section = [
            str(uuid4()) for _ in range(5)]
        article_menu_node = mocker.MagicMock()
        article_menu_node.asset = asset

        mock_update_or_create_article_node = mocker.patch.object(
            importer_instance, '_update_or_create_article_node', return_value=[
                zd_article, article_menu_node])
        mock_handle_update_zd_article = mocker.patch.object(
            importer_instance, '_handle_update_zd_article')
        mock_article_save_records = mocker.patch.object(
            importer_instance, '_article_save_records')

        importer_instance._save_article(
            article, menu_node, zd_section)
        mock_update_or_create_article_node.assert_called_once_with(
            article, menu_node, zd_section)
        mock_handle_update_zd_article.assert_called_once_with(
            zd_article, article, article_menu_node, zd_section)
        mock_article_save_records.assert_called_once_with(
            article, asset)

    def test_create_zendesk_sections(self, mocker, importer_instance, db):
        importer_instance.site = baker.make(ZendeskSite)
        importer_instance.menu = baker.make(Menu)
        name = str(uuid4())
        position, section_id = [randint(1, 1000) for _ in range(2)]
        section_object = mocker.MagicMock()
        section_object.name = name
        section_object.id = section_id
        section_object.position = position
        section = defaultdict(list)
        section['object'] = section_object
        sections = [section]

        importer_instance._create_zendesk_sections(sections)
        created_section = ZendeskSection.objects.filter(
            section_id=section_id, name=name, site=importer_instance.site).first()

        assert created_section

    def test_import_knowledgebase(self, mocker, importer_instance, db):
        menu = baker.make(Menu)
        name, *sections = [str(uuid4()) for _ in range(10)]
        mock_zd_category = mocker.MagicMock()
        mock_zd_category.name = name
        mock_zd_category.id = randint(1, 1000)
        mock_struct = {
            'category': mock_zd_category,
            'sections': sections
        }
        mock_pull_category_from_zendesk = mocker.patch.object(
            importer_instance, '_pull_category_from_zendesk', return_value=mock_struct)
        mock_create_zendesk_sections = mocker.patch.object(
            importer_instance, '_create_zendesk_sections')
        mocker.patch('cms.controllers.zendesk.Exporter')

        importer_instance.import_knowledgebase(menu, mock_zd_category.name)
        saved_category = ZendeskCategory.objects.filter(
            site=importer_instance.site, menu=menu, name=name, category_id=mock_zd_category.id).first()

        mock_pull_category_from_zendesk.assert_called_once_with()
        mock_create_zendesk_sections.assert_called_once_with(sections)
        assert importer_instance.category and saved_category
        assert importer_instance.category == saved_category


class TestZendeskMapper:
    @pytest.fixture
    def get_mapper_instance(self, mocker):
        mocker.patch('cms.controllers.zendesk.Exporter', mocker.MagicMock())

        def _get_mapper_instance(customization_name=settings.CUSTOMIZATION):
            return ZendeskMapper(
                customization_name=customization_name, cloud_portal=mocker.MagicMock(), default_permission_group_id=randint(1000, 9999))

        return _get_mapper_instance

    @pytest.fixture
    def mock_item(self, mocker, db):
        mocker.patch('cms.controllers.zendesk.Exporter', mocker.MagicMock())
        site = baker.make(ZendeskSite)
        parent_category = baker.make(
            ZendeskCategory, site=site, category_id=randint(1, 1000))
        parent_section = baker.make(
            ZendeskSection, site=site, parent_category=parent_category, section_id=randint(1, 1000))
        mock_item = mocker.MagicMock()
        mock_item.id = randint(1, 1000)
        mock_item.name = str(uuid4())
        mock_item.parent_section_id = parent_section.section_id
        mock_item.category_id = parent_category.category_id
        mock_item.position = randint(1, 20)

        return site, parent_category, parent_section, mock_item

    def test_get_query_params(self, mock_item, get_mapper_instance, db):
        site, parent_category, parent_section, mock_item = mock_item
        mapper_instance = get_mapper_instance(site.customization.name)
        label = str(uuid4())
        query_params = mapper_instance._get_query_params(
            parent_category.category_id, parent_section.section_id, label, mock_item)

        assert query_params == {
            f'{label}_id': mock_item.id,
            'name': mock_item.name,
            'site': site.id,
            'parent_category': parent_category.id,
            'parent_section': parent_section.id,
            'section': parent_section.id,
            'permission_group_id': mapper_instance.default_permission_group_id,
            'position': mock_item.position
        }

    def test_map_item(self, mock_item, get_mapper_instance, db):
        site, parent_category, parent_section, mock_item = mock_item
        mock_item.position = randint(1, 1000)
        label = 'article'
        url, html_url = [str(uuid4()) for _ in range(2)]
        mock_item.html_url = html_url
        mock_item.url = url
        mapper_instance = get_mapper_instance(site.customization.name)

        query_params = mapper_instance._get_query_params(
            parent_category.category_id, parent_section.section_id, label, mock_item)
        mapped = mapper_instance._map_item(mock_item, label)
        assert mapped == {
            'type': label,
            f'zendesk_{label}_id': mock_item.id,
            'name': mock_item.name,
            'position': mock_item.position,
            'category_id': parent_category.category_id,
            'section_id': parent_section.section_id,
            'url': mock_item.html_url,
            'json': mock_item.url,
            'admin_url': None,
            'zd_admin_url': None,
            'links': [
                {'title': 'Admin Links', 'label': True},
                {
                    'title': f'Create Zendesk {label.title()}',
                    'url': '' f"{reverse(f'admin:cms_zendesk{label}_add')}?{urlencode(query_params)}",
                    'class': 'success'
                },
                {'title': 'Menu' if label == 'category' else 'Menu Node',
                    'url': None,  'class': 'primary'},
                {'title': f'Zendesk {label.title()}', 'url': None,
                 'class': 'primary'},
                {'title': f'Asset', 'url': None,  'class': 'primary'},
                {'title': 'Zendesk Links', 'label': True, 'class': 'push-right'},
                {'title': f'{label.title()} HTML', 'url': html_url,
                 'class': 'info'},
                {'title': f'{label.title()} JSON', 'url': url,  'class': 'info'}
            ],
            'children': []
        }

    def test_get_article_admin_url(self, mocker, get_mapper_instance, asset_type_factory, db):
        menu_node_name, asset_name, mock_asset_admin_url = [
            str(uuid4()) for _ in range(3)]
        site = baker.make(ZendeskSite)
        mocker.patch.object(Asset, 'admin_link', mock_asset_admin_url)
        article = baker.make(
            ZendeskArticle, article_id=randint(1, 1000), menu_node__name=menu_node_name, asset=baker.make(Asset, name=asset_name, asset_type=asset_type_factory(AssetType.ASSET_TYPES.documentation)), site=site)
        mapper = get_mapper_instance(site.customization.name)

        # Test only handles articles
        assert not mapper._get_article_admin_url('other', article.article_id)

        # Test retrieves admin urls
        urls = mapper._get_article_admin_url('article', article.article_id)
        assert urls == (article.menu_node.admin_link,
                        article.admin_link, mock_asset_admin_url)

    def test_get_section_admin_url(self, get_mapper_instance, db):
        menu_node_name = str(uuid4())
        site = baker.make(ZendeskSite)
        section = baker.make(
            ZendeskSection, section_id=randint(1, 1000), menu_node__name=menu_node_name, site=site)
        mapper = get_mapper_instance(site.customization.name)

        # Test only handles sections
        assert not mapper._get_section_admin_url('other', section.section_id)

        # Test retrieves admin urls
        urls = mapper._get_section_admin_url('section', section.section_id)
        assert urls == (section.menu_node.admin_link, section.admin_link, None)

    def test_get_category_admin_url(self, get_mapper_instance, db):
        menu_name = str(uuid4())
        site = baker.make(ZendeskSite)
        category = baker.make(
            ZendeskCategory, category_id=randint(1, 1000), menu__name=menu_name, site=site)
        mapper = get_mapper_instance(site.customization.name)

        # Test only handles categories
        assert not mapper._get_category_admin_url(
            'other', category.category_id)

        # Test retrieves admin urls
        urls = mapper._get_category_admin_url('category', category.category_id)
        assert urls == (category.menu.admin_link, category.admin_link, None)

    def test_get_admin_urls(self, mocker, get_mapper_instance, db):
        fallback = None
        mapper = get_mapper_instance()
        label, category_urls, section_urls, article_urls = [
            str(uuid4()) for _ in range(4)]
        item_id = randint(1000, 10000)

        # Test handlers used in correct order
        handlers = OrderedDict()
        handlers[fallback] = (None, None, None)
        handlers['_get_category_admin_url'] = category_urls
        handlers['_get_section_admin_url'] = section_urls
        handlers['_get_article_admin_url'] = article_urls

        for method, expected_result in handlers.items():
            if method:
                mocker.patch.object(
                    mapper, method, return_value=expected_result)
            assert mapper._get_admin_urls(item_id, label) == expected_result

    def test_map_and_sort(self, mocker, get_mapper_instance, db):
        mapper = get_mapper_instance()
        expected_items = [{'position': position} for position in range(100)]
        out_of_order_items = sample(expected_items, len(expected_items))
        mocker.patch.object(mapper, '_map_item', lambda item, label: item)

        assert mapper._map_and_sort(out_of_order_items, '') == expected_items

    @pytest.fixture
    def zendesk_test_get(self, mocker, get_mapper_instance, db):
        def _zendesk_test_get(endpoint_to_test, label):
            initial, processed = [
                str(uuid4()) for _ in range(2)]
            mapper = get_mapper_instance()
            mock_map_and_sort = mocker.patch.object(
                mapper, '_map_and_sort', return_value=processed)
            mocker.patch.object(
                mapper.zen_client.help_center, endpoint_to_test, return_value=initial)

            assert getattr(mapper, f'_get_{endpoint_to_test}')() == processed
            mock_map_and_sort.assert_called_once_with(initial, label)

        return _zendesk_test_get

    def test_get_categories(self, zendesk_test_get):
        zendesk_test_get('categories', 'category')

    def test_get_sections(self, zendesk_test_get):
        zendesk_test_get('sections', 'section')

    def test_get_articles(self, zendesk_test_get):
        zendesk_test_get('articles', 'article')

    def test_build_struct(self, mocker, get_mapper_instance, db):
        categories = [{
            'children': [],
            'zendesk_category_id': str(uuid4()),
            'position': position
        } for position in range(randint(5, 10))]
        sections = [{
            'children': [],
            'category_id': category['zendesk_category_id'],
            'zendesk_section_id': str(uuid4()),
            'admin_url': str(uuid4()),
            'position': position
        } for position, category in enumerate(categories)
            if choice([True, False])]
        articles = [{
            'section_id': section['zendesk_section_id'],
            'zendesk_article_id': str(uuid4()),
            'position': position
        } for position, section in enumerate(sections)
            if choice([True, False])]
        mapper = get_mapper_instance()
        mocker.patch.object(mapper, '_get_categories', return_value=categories)
        mocker.patch.object(mapper, '_get_sections', return_value=sections)
        mocker.patch.object(mapper, '_get_articles', return_value=articles)

        assert mapper.build_struct() == mapper.struct
        assert mapper.struct

        for category in categories:
            assert any(
                mapped_category['zendesk_category_id'] == category['zendesk_category_id']
                for mapped_category in mapper.struct)

        mapped_sections = [
            section for category in mapper.struct for section in category['children']]

        for section in sections:
            assert any(
                mapped_section['zendesk_section_id'] == section['zendesk_section_id']
                for mapped_section in mapped_sections)

        mapped_articles = [
            article for section in mapped_sections for article in section['children']]

        for article in articles:
            assert any(
                mapped_article['zendesk_article_id'] == article['zendesk_article_id']
                for mapped_article in mapped_articles)

    def test_parse_struct_for_unmapped_and_empty_nodes(self, get_mapper_instance, db):
        site = baker.make(ZendeskSite)
        mapper = get_mapper_instance(site.customization.name)
        unmapped_article = {'children': [], 'type': 'article',
                            'zd_admin_url': None, 'zendesk_article_id': str(uuid4())}
        unmapped_and_empty_section = {'children': [
        ], 'type': 'section', 'zd_admin_url': None, 'zendesk_section_id': str(uuid4())}
        not_empty_section = {'children': [
            unmapped_article], 'type': 'section', 'zd_admin_url': None, 'zendesk_section_id': str(uuid4())}
        mapped_article = {'children': [], 'type': 'article', 'zd_admin_url': str(
            uuid4()), 'zendesk_article_id': str(uuid4())}
        unmapped_and_empty_category = {'children': [
        ], 'type': 'category', 'zd_admin_url': None, 'zendesk_category_id': str(uuid4())}

        unmapped, empty = mapper._parse_struct_for_unmapped_and_empty_nodes([
            unmapped_and_empty_section, not_empty_section, mapped_article, unmapped_and_empty_category])

        assert unmapped == {
            'customization': site.customization.name,
            'category': [unmapped_and_empty_category['zendesk_category_id']],
            'section': [section['zendesk_section_id'] for section in (unmapped_and_empty_section, not_empty_section)],
            'article': [unmapped_article['zendesk_article_id']]
        }

        assert empty == {
            'customization': site.customization.name,
            'category': [unmapped_and_empty_category['zendesk_category_id']],
            'section': [unmapped_and_empty_section['zendesk_section_id']],
        }

    def test_get_unmapped_and_empty(self, mocker, get_mapper_instance, db):
        struct, unmapped, empty = [str(uuid4()) for _ in range(3)]
        mapper = get_mapper_instance()
        mapper.struct = struct
        mock_parse_unmapped_empty = mocker.patch.object(
            mapper, '_parse_struct_for_unmapped_and_empty_nodes', return_value=([unmapped], [empty]))

        result = mapper.get_unmapped_and_empty()

        assert result['unmapped'] == [unmapped]
        assert result['empty'] == [empty]
        mock_parse_unmapped_empty.assert_called_once_with(struct)

    @pytest.fixture
    def clean_zendesk(self, mocker, get_mapper_instance, db):
        def _clean_zendesk(endpoint, label, action='delete'):
            id = randint(1, 1000)
            mapper = get_mapper_instance()
            mock_action = mocker.patch.object(
                getattr(mapper.zen_client.help_center, endpoint), action)
            getattr(mapper, f'_clean_{label}')(id)
            assert mock_action.mock_calls[0].args[0].id == id

        return _clean_zendesk

    def test_clean_category(self, clean_zendesk):
        clean_zendesk('categories', 'category')

    def test_clean_section(self, clean_zendesk):
        clean_zendesk('sections', 'section')

    def test_clean_article(self, clean_zendesk):
        clean_zendesk('articles', 'article', 'archive')

    def test_clean_zd(self, mocker, get_mapper_instance, db):
        mapper = get_mapper_instance()
        mock_clean_category = mocker.patch.object(mapper, '_clean_category')
        mock_clean_section = mocker.patch.object(mapper, '_clean_section')
        mock_clean_article = mocker.patch.object(mapper, '_clean_article')

        categories, sections, articles = [
            [str(uuid4()) for _ in range(randint(5, 15))] for _ in range(3)]

        items_to_remove = {
            'category': categories,
            'section': sections,
            'article': articles
        }

        mapper.clean_zd(items_to_remove)

        mock_clean_category.assert_has_calls(
            call(category) for category in categories)
        mock_clean_section.assert_has_calls(
            call(section) for section in sections)
        mock_clean_article.assert_has_calls(
            call(article) for article in articles)


@pytest.fixture
def get_exporter_instance(mocker):
    def _get_exporter_instance(customization_name=settings.CUSTOMIZATION):
        exporter_instance = Exporter(
            customization_name=customization_name, cloud_portal=mocker.MagicMock())
        mocker.patch('cms.controllers.zendesk.Exporter')
        return exporter_instance

    return _get_exporter_instance


class TestExporter:

    def test_check_and_get_zenpy_article(self, mocker, get_exporter_instance, asset_type_factory, db):
        site = baker.make(ZendeskSite)
        exporter = get_exporter_instance(
            site.customization.name)
        new_zd_article = baker.make(
            ZendeskArticle, site=site, asset=baker.make(Asset, asset_type=asset_type_factory(AssetType.ASSET_TYPES.documentation)), sync=False)
        sync_log = baker.make(
            ZendeskSyncLog, zendesk_site=site)

        # Test sync disabled
        assert not exporter._check_and_get_zenpy_article(
            new_zd_article, sync_log, False)

        # Test new article
        new_zd_article.sync = True
        assert not exporter._check_and_get_zenpy_article(
            new_zd_article, sync_log, False).id

        # Test existing article
        article_id = randint(1, 1000)
        expected_zenpy_article = Article(id=article_id)
        mock_articles = mocker.patch.object(
            exporter.zen_client.help_center, 'articles', return_value=expected_zenpy_article)
        existing_zd_article = baker.make(
            ZendeskArticle, site=site, article_id=article_id, asset=baker.make(Asset, asset_type=asset_type_factory(AssetType.ASSET_TYPES.documentation)))
        assert exporter._check_and_get_zenpy_article(
            existing_zd_article, sync_log, False).id == article_id
        assert not existing_zd_article.needs_sync

        # Test delete
        mock_archive = mocker.patch.object(
            exporter.zen_client.help_center.articles, 'archive')
        assert not exporter._check_and_get_zenpy_article(
            existing_zd_article, sync_log, True)
        mock_archive.assert_called_once_with(expected_zenpy_article)

        # Test not found
        mock_articles.side_effect = RecordNotFoundException
        assert not exporter._check_and_get_zenpy_article(
            existing_zd_article, sync_log, False).id
        assert not existing_zd_article.article_id

    def test_update_zenpy_from_zd_article(self, mocker, get_exporter_instance, asset_type_factory, db):
        updated_zenpy_article = str(uuid4())
        new_title = str(uuid4())
        site = baker.make(ZendeskSite)
        exporter = get_exporter_instance(
            site.customization.name)
        articles_endpoint = exporter.zen_client.help_center.articles
        mock_update = mocker.patch.object(
            articles_endpoint, 'update', side_effect=RecordNotFoundException)
        mock_create = mocker.patch.object(
            articles_endpoint, 'create', return_value=updated_zenpy_article)
        mock_section = baker.make(ZendeskSection, section_id=randint(1, 1000))
        zenpy_article = mocker.MagicMock()
        new_zd_article = baker.make(
            ZendeskArticle, site=site, section=mock_section, permission_group_id=randint(1, 1000), title=new_title, asset=baker.make(Asset, name=new_title, asset_type=asset_type_factory(AssetType.ASSET_TYPES.documentation)))

        # Test that update and create attempted
        assert exporter._update_zenpy_from_zd_article(
            zenpy_article, new_zd_article) == updated_zenpy_article
        mock_update.assert_called_once_with(zenpy_article)
        mock_create.assert_called_once_with(
            mock_section.section_id, zenpy_article)

        # Check attributes updated
        to_check = ['position', 'author_id', 'promoted',
                    'comments_disabled', 'permission_group_id',
                    'user_segment_id', 'draft', 'title']
        for attribute in to_check:
            assert getattr(zenpy_article, attribute) == getattr(
                new_zd_article, attribute)

        assert zenpy_article.section_id == mock_section.section_id

    def test_update_zd_article_with_zenpy_data(self, mocker, get_exporter_instance, db):
        exporter = get_exporter_instance()
        fields = ['author_id', 'created_at', 'edited_at', 'updated_at',
                  'html_url', 'user_segment_id', 'permission_group_id']
        field_mapping = {
            **{field: field for field in fields},
            'article_id': 'id'
        }

        mock_zd_article = mocker.MagicMock()
        mock_zenpy_article = mocker.MagicMock()

        # Initialize mock articles
        for zd_key, zenpy_key in field_mapping.items():
            setattr(mock_zd_article, zd_key, str(uuid4()))
            setattr(mock_zenpy_article, zenpy_key, str(uuid4()))

        expected_id = mock_zenpy_article.id

        exporter._update_zd_article_with_zenpy_data(
            mock_zd_article, mock_zenpy_article)

        # Check that fields match
        for zd_key, zenpy_key in field_mapping.items():
            assert getattr(mock_zd_article, zd_key) == getattr(
                mock_zenpy_article, zenpy_key)

        # Check that changes saved
        mock_zd_article.save.assert_called_once_with()

        # Check that zd_article was updated with zenpy_article not the other way
        assert mock_zd_article.article_id == expected_id

    def test_update_zendesk_translation(self, mocker, get_exporter_instance, db):
        zenpy_translation, zenpy_article, zd_article = [
            mocker.MagicMock() for _ in range(3)]
        zenpy_translation.locale = 'en-us'
        zenpy_article.id = str(uuid4())
        zd_article.draft = str(uuid4())
        zd_article.title = str(uuid4())
        exporter = get_exporter_instance()
        mock_get_translations = mocker.patch.object(
            exporter.zen_client.help_center.articles, 'translations', return_value=[zenpy_translation])

        # Test existing translation
        updated_translation = exporter._update_zendesk_translation(
            zd_article, zenpy_article)
        assert updated_translation == zenpy_translation
        mock_get_translations.assert_called_once_with(zenpy_article)
        assert updated_translation.draft == zd_article.draft
        assert updated_translation.title == zd_article.title

        # Test new translation
        mock_get_translations.return_value = []
        new_translation = exporter._update_zendesk_translation(
            zd_article, zenpy_article)
        assert isinstance(new_translation, Translation)
        assert new_translation.locale == 'en-us'
        assert new_translation.source_type == 'Article'
        assert new_translation.source_id == zenpy_article.id
        assert new_translation.draft == zd_article.draft
        assert new_translation.title == zd_article.title

    def test_get_update_attachment_handler(self, mocker, get_exporter_instance, db):
        exporter = get_exporter_instance()
        original_url, portal_url, replacement = [
            str(uuid4()) for _ in range(3)]
        external_file = baker.make(ExternalFile)
        file_info = {
            'original_url': original_url,
            'id': external_file.id
        }
        body = f'/{original_url}'
        zenpy_article, asset,  *existing_attachments = [
            mocker.MagicMock(file_name=str(uuid4()))
            for _ in range(randint(5, 15))]
        attachment_to_handle = choice(existing_attachments)
        attachment_to_handle.relative_path = replacement
        file_info['external_file_name'] = attachment_to_handle.file_name

        assert exporter._get_update_attachment_handler(
            existing_attachments, zenpy_article, portal_url, asset)(body, file_info) == replacement

    def test_update_body_with_attachments(self, mocker, get_exporter_instance, db):
        portal_url, update_attachment, zenpy_article, asset, existing_attachments, *external_files = [
            mocker.MagicMock() for _ in range(5, 15)]
        updated_body = str(uuid4())
        exporter = get_exporter_instance()
        content = {'external_files': [], 'blocks': []}
        mock_get_update_handler = mocker.patch.object(
            exporter, '_get_update_attachment_handler', return_value=update_attachment)
        update_attachment.return_value = updated_body
        mock_get_attachments = mocker.patch.object(
            exporter.zen_client.help_center, 'attachments', existing_attachments)

        # Test no attachments
        no_attachment_result = exporter._update_body_with_attachments(
            content, zenpy_article, portal_url, asset)
        assert no_attachment_result == ([], '', False)

        # Test add attachments and has existing
        attachments_to_clean = [str(uuid4()) for _ in range(randint(5, 15))]
        existing_attachments.return_value = attachments_to_clean
        content['external_files'] = external_files
        attachment_result = exporter._update_body_with_attachments(
            content, zenpy_article, portal_url, asset)
        assert attachment_result == (attachments_to_clean, updated_body, True)

    def test_clean_attachments(self, mocker, get_exporter_instance, db):
        attachments = [str(uuid4()) for _ in range(randint(5, 15))]
        expected_calls = [call(attachment) for attachment in attachments]
        exporter = get_exporter_instance()
        mock_delete = mocker.patch.object(
            exporter.zen_client.help_center.attachments, 'delete')

        exporter._clean_attachments(attachments)
        mock_delete.assert_has_calls(expected_calls)

    def test_update_attachments_from_content(self, mocker, get_exporter_instance, db, mock_set):
        exporter = get_exporter_instance()
        title, portal_url, *labels = [
            str(uuid4()) for _ in range(randint(5, 15))]
        existing_labels = labels[2:5]
        zd_article, zenpy_article, updated_body, abandoned_attachments = [
            mocker.MagicMock() for _ in range(4)]
        zd_site = baker.prepare(ZendeskSite)
        zenpy_article.configure_mock(label_names=existing_labels)
        zd_article.configure_mock(site=zd_site)

        content = {
            'title': title,
            'labels': labels
        }
        mock_get_config = mocker.patch(
            'util.config.get_config', return_value={'cloud_portal': {'url': portal_url}})
        mock_update_body = mocker.patch.object(
            exporter, '_update_body_with_attachments', return_value=[abandoned_attachments, updated_body, True])
        mock_clean_attachments = mocker.patch.object(
            exporter, '_clean_attachments')
        mock_update = mocker.patch.object(
            exporter.zen_client.help_center.articles, 'update')
        mock_create_label = mocker.patch.object(
            exporter.zen_client.help_center.labels, 'create')
        mocker.patch(
            'cms.controllers.zendesk.ZendeskArticleLabel.objects', mock_set(*(ZendeskArticleLabel(name=label, site=zd_site) for label in existing_labels))
        )

        assert exporter._update_attachments_from_content(
            zd_article, zenpy_article, content) == (updated_body, zd_article.title)
        mock_get_config.assert_called_once_with(
            zd_article.site.customization.name)
        mock_update_body.assert_called_once_with(
            content, zenpy_article, portal_url, zd_article.asset)
        mock_clean_attachments.assert_called_once_with(
            abandoned_attachments)
        mock_update.assert_called_once_with(
            zenpy_article)

        new_labels = labels[:2] + labels[5:]
        assert mock_create_label.call_count == len(new_labels)
        for create_call in mock_create_label.calls:
            article, label = create_call.call_args.args
            assert article == zenpy_article
            assert label.name in new_labels
            new_labels.remove(label.name)

    def test_update_or_create_article_translation(self, mocker, get_exporter_instance, db):
        zenpy_article = mocker.MagicMock()
        zenpy_translation = mocker.MagicMock()
        exporter = get_exporter_instance()
        articles_endpoint = exporter.zen_client.help_center.articles
        mock_create_translation = mocker.patch.object(
            articles_endpoint, 'create_translation')
        mock_update_translation = mocker.patch.object(
            articles_endpoint, 'update_translation')

        # Test update
        exporter._update_or_create_article_translation(
            zenpy_article, zenpy_translation)
        mock_update_translation.assert_called_once_with(
            zenpy_article, zenpy_translation)

        # Test create
        zenpy_translation.id = None
        exporter._update_or_create_article_translation(
            zenpy_article, zenpy_translation)
        mock_create_translation.assert_called_once_with(
            zenpy_article, zenpy_translation)

    def test_update_labels(self, mocker, get_exporter_instance, db):
        site = baker.make(ZendeskSite)
        mock_zd_article = mocker.MagicMock()
        mock_zenpy_article = mocker.MagicMock()
        existing_zenpy_labels = {}
        for _ in range(randint(5, 15)):
            id = getrandbits(32)
            existing_zenpy_labels[id] = Label(name=str(uuid4()), id=id)
        exporter = get_exporter_instance(site.customization.name)
        mocker.patch.object(exporter.zen_client.help_center.articles, 'labels', return_value=existing_zenpy_labels.values())

        labels = exporter._update_labels(
            mock_zd_article, mock_zenpy_article)

        for label in labels:
            assert label.label_id in existing_zenpy_labels
            del existing_zenpy_labels[label.label_id]
        assert not existing_zenpy_labels

        mock_zd_article.labels.set.assert_called_once_with(labels)

    def test_sync_article(self, mocker, get_exporter_instance, db):
        exporter = get_exporter_instance()
        zenpy_article, zd_article, zenpy_translation = [
            mocker.MagicMock() for _ in range(3)]
        body, title = [str(uuid4()) for _ in range(2)]
        update_attachments_result = body, title

        mocker.patch.object(
            exporter, '_check_and_get_zenpy_article', return_value=zenpy_article)
        mocker.patch.object(
            exporter, '_update_zenpy_from_zd_article', return_value=zenpy_article)
        mocker.patch.object(exporter, '_update_zd_article_with_zenpy_data')
        mocker.patch.object(
            exporter, '_update_zendesk_translation', return_value=zenpy_translation)
        mocker.patch.object(exporter, '_update_attachments_from_content',
                            return_value=update_attachments_result)
        mocker.patch.object(exporter, '_update_or_create_article_translation')
        mocker.patch.object(exporter, '_update_labels')

        assert exporter.sync_article(zd_article) is zenpy_article
        assert zenpy_translation.body == body
        assert zenpy_translation.title == title
        assert not zd_article.needs_sync
        zd_article.save.assert_called_once_with()

    def test_check_and_get_zenpy_section(self, mocker, get_exporter_instance, db):
        site = baker.make(ZendeskSite)
        exporter = get_exporter_instance(
            site.customization.name)
        new_zd_section = baker.make(
            ZendeskSection, site=site, sync=False)

        # Test sync disabled
        assert not exporter._check_and_get_zenpy_section(
            new_zd_section, False)

        # Test new section
        new_zd_section.sync = True
        assert not exporter._check_and_get_zenpy_section(
            new_zd_section, False).id

        # Test existing section
        section_id = randint(1, 1000)
        expected_zenpy_section = Section(id=section_id)
        mock_articles = mocker.patch.object(
            exporter.zen_client.help_center, 'sections', return_value=expected_zenpy_section)
        existing_zd_section = baker.make(
            ZendeskSection, site=site, section_id=section_id)
        assert exporter._check_and_get_zenpy_section(
            existing_zd_section, False).id == section_id
        assert not existing_zd_section.needs_sync

        # Test delete
        mock_archive = mocker.patch.object(
            exporter.zen_client.help_center.sections, 'delete')
        assert not exporter._check_and_get_zenpy_section(
            existing_zd_section, True)
        mock_archive.assert_called_once_with(expected_zenpy_section)

        # Test not found
        mock_articles.side_effect = RecordNotFoundException
        assert not exporter._check_and_get_zenpy_section(
            existing_zd_section, False).id
        assert not existing_zd_section.section_id

    def test_update_zenpy_section_from_data(self, mocker, get_exporter_instance, db):
        mock_create = mocker.MagicMock()

        def mock_zenpy_created(zenpy_section):
            zenpy_section.id = expected_id
            mock_create(zenpy_section)
            return zenpy_section

        section_name = str(uuid4())
        expected_id, category_id, position, parent_section_id = [
            randint(1, 1000) for _ in range(4)]
        site = baker.make(ZendeskSite)
        exporter = get_exporter_instance(
            site.customization.name)
        parent_category = baker.make(
            ZendeskCategory, site=site, category_id=category_id)
        parent_section = baker.make(
            ZendeskSection, site=site, parent_category=parent_category, section_id=parent_section_id)
        zd_section = baker.make(
            ZendeskSection, site=site, parent_section=parent_section, position=position, name=section_name)
        zenpy_section = mocker.MagicMock()
        sections_endpoint = exporter.zen_client.help_center.sections
        mock_update = mocker.patch.object(
            sections_endpoint, 'update', side_effect=RecordNotFoundException)
        mocker.patch.object(
            sections_endpoint, 'create', mock_zenpy_created)

        # Test that zenpy section updated
        updated_zenpy = exporter._update_zenpy_section_from_data(
            zenpy_section, zd_section)
        assert updated_zenpy.id == expected_id
        assert ZendeskSection.objects.get(pk=zd_section.pk).section_id == expected_id
        assert updated_zenpy.category_id == category_id
        assert updated_zenpy.parent_section_id == parent_section_id
        assert updated_zenpy.position == position
        assert updated_zenpy.name == section_name

        # Check that section is created after update fails
        mock_update.assert_called_once_with(zenpy_section)
        mock_create.assert_called_once_with(zenpy_section)

    def test_get_section_translation(self, mocker, get_exporter_instance, db):
        zenpy_section = str(uuid4())
        exporter = get_exporter_instance()
        translations = [mocker.MagicMock() for _ in range(randint(5, 15))]
        expected_translation = choice(translations)
        expected_translation.locale = 'en-us'
        mock_get_translations = mocker.patch.object(
            exporter.zen_client.help_center.sections, 'translations', return_value=translations)

        assert exporter._get_section_translation(
            zenpy_section) == expected_translation
        mock_get_translations.assert_called_once_with(zenpy_section)

    def test_update_or_create_zenpy_section_translation(self, mocker, get_exporter_instance, db):
        expected_title, zenpy_section = [
            str(uuid4()) for _ in range(2)]
        mock_create = mocker.MagicMock()
        expected_id = randint(1, 1000)

        def mock_create_translation(zenpy_section, zenpy_translation):
            mock_create(zenpy_section, zenpy_translation)
            zenpy_translation.id = expected_id
            return zenpy_translation

        exporter = get_exporter_instance()
        zenpy_translation = mocker.MagicMock(id=randint(1, 1000))
        zd_section = baker.make(ZendeskSection, name=expected_title)

        sections_endpoint = exporter.zen_client.help_center.sections
        mock_update = mocker.patch.object(
            sections_endpoint, 'update_translation', side_effect=RecordNotFoundException)
        mocker.patch.object(
            sections_endpoint, 'create_translation', mock_create_translation)

        new_translation = exporter._update_or_create_zenpy_section_translation(
            zenpy_section, zd_section, zenpy_translation)

        assert new_translation != zenpy_translation
        assert new_translation.title == zd_section.name
        assert new_translation.id == expected_id

        # Check that attempted to update existing translation
        mock_update.assert_called_once_with(
            zenpy_section, zenpy_translation)

        # Check that new translation is created if existing not found
        assert ((zenpy_section, zenpy_translation),
                ) not in mock_create.call_args_list

    def test_sync_section(self, mocker, get_exporter_instance, db):
        exporter = get_exporter_instance()
        zd_section, zenpy_section, zenpy_translation = [
            mocker.MagicMock() for _ in range(3)]

        mocker.patch.object(
            exporter, '_check_and_get_zenpy_section', return_value=zenpy_section)
        mocker.patch.object(
            exporter, '_update_zenpy_section_from_data', return_value=zenpy_section)
        mocker.patch.object(exporter, '_get_section_translation',
                            return_value=zenpy_translation)
        mocker.patch.object(
            exporter, '_update_or_create_zenpy_section_translation')

        assert exporter.sync_section(zd_section) is zenpy_section
        assert not zd_section.needs_sync
        zd_section.save.assert_called_once_with()

    def test_check_and_get_zenpy_category(self, mocker, get_exporter_instance, db):
        category_id = randint(1, 1000)
        existing_category = str(uuid4())
        site = baker.make(ZendeskSite)
        exporter = get_exporter_instance(
            site.customization.name)
        zd_category = baker.make(
            ZendeskCategory, site=site, category_id=category_id)
        help_center = exporter.zen_client.help_center
        mock_get_existing_category = mocker.patch.object(
            help_center, 'categories', return_value=existing_category)

        mock_delete = mocker.patch.object(help_center.categories, 'delete')

        # Test that existing category is correctly retrieved and deleted
        assert not exporter._check_and_get_zenpy_category(zd_category, True)
        mock_delete.assert_called_once_with(existing_category)
        mock_get_existing_category.assert_called_once_with(id=category_id)

        # Test category not found correctly handled
        mock_get_existing_category.return_value = None
        new_category = exporter._check_and_get_zenpy_category(
            zd_category, False)
        assert isinstance(new_category, Category)

    def test_update_or_create_zenpy_category(self, mocker, get_exporter_instance, db):
        exporter = get_exporter_instance()
        zenpy_category, zd_category, updated_zenpy_category, created_zenpy_category = [
            mocker.MagicMock() for _ in range(4)]
        categories_endpoint = exporter.zen_client.help_center.categories
        mock_update = mocker.patch.object(
            categories_endpoint, 'update', return_value=updated_zenpy_category, side_effect=RecordNotFoundException)
        mock_create = mocker.patch.object(
            categories_endpoint, 'create', return_value=created_zenpy_category)

        # Test create if failed to update existing
        assert exporter._update_or_create_zenpy_category(
            zenpy_category, zd_category) is created_zenpy_category
        assert zd_category.category_id == created_zenpy_category.id
        zd_category.save.assert_called_once_with()

        # Test successful update
        zenpy_category.id = randint(1, 1000)
        mock_update.side_effect = None
        assert exporter._update_or_create_zenpy_category(
            zenpy_category, zd_category) is updated_zenpy_category

    def test_get_category_translation(self, mocker, get_exporter_instance, db):
        zenpy_category = str(uuid4())
        exporter = get_exporter_instance()
        translations = [mocker.MagicMock() for _ in range(randint(5, 15))]
        expected_translation = choice(translations)
        expected_translation.locale = 'en-us'
        mock_get_translations = mocker.patch.object(
            exporter.zen_client.help_center.categories, 'translations', return_value=translations)

        assert exporter._get_category_translation(
            zenpy_category) == expected_translation
        mock_get_translations.assert_called_once_with(zenpy_category)

    def test_update_or_create_zenpy_category_translation(self, mocker, get_exporter_instance, db):
        zenpy_category = mocker.MagicMock()
        zd_category = mocker.MagicMock()
        category_name = str(uuid4())
        zd_category.name = category_name
        zenpy_translation = mocker.MagicMock()
        exporter = get_exporter_instance()
        categories_endpoint = exporter.zen_client.help_center.categories
        mock_create_translation = mocker.patch.object(
            categories_endpoint, 'create_translation')
        mock_update_translation = mocker.patch.object(
            categories_endpoint, 'update_translation')

        # Test update
        exporter._update_or_create_zenpy_category_translation(
            zenpy_category, zd_category, zenpy_translation)
        mock_update_translation.assert_called_once_with(
            zenpy_category, zenpy_translation)

        # Test create
        new_category_translation = exporter._update_or_create_zenpy_category_translation(
            zenpy_category, zd_category, None)
        assert new_category_translation.title == category_name
        assert mock_create_translation.call_count == 1
        mock_create_translation.assert_called_once_with(
            zenpy_category, new_category_translation)

        # Test handle category not found
        mock_update_translation.side_effect = RecordNotFoundException
        assert isinstance(
            exporter._update_or_create_zenpy_category_translation(
                zenpy_category, zd_category, zenpy_translation), Translation)
        assert mock_update_translation.call_count == 2
        assert mock_create_translation.call_count == 2

    def test_sync_category(self, mocker, get_exporter_instance, db):
        exporter = get_exporter_instance()
        zd_category, zenpy_category, zenpy_translation = [
            mocker.MagicMock() for _ in range(3)]
        mocker.patch.object(
            exporter, '_check_and_get_zenpy_category', return_value=zenpy_category)
        mocker.patch.object(
            exporter, '_update_or_create_zenpy_category', return_value=zenpy_category)
        mocker.patch.object(
            exporter, '_get_category_translation', return_value=zenpy_translation)
        mocker.patch.object(
            exporter, '_update_or_create_zenpy_category_translation')

        assert exporter.sync_category(zd_category) is zenpy_category


def test_sync_article(get_exporter_instance, mocker, asset_type_factory, db):
    doc_json = str(uuid4())
    exporter = get_exporter_instance()
    customization = Customization.objects.filter(
        name=exporter.customization_name).first()
    site = ZendeskSite.objects.filter(customization=customization).first(
    ) or baker.make(ZendeskSite, customization=customization)
    category = baker.make(
        ZendeskCategory, site=site, category_id=randint(1, 1000))
    section = baker.make(
        ZendeskSection, site=site, parent_category=category, section_id=randint(1, 1000))
    asset = baker.make(Asset, asset_type=asset_type_factory(AssetType.ASSET_TYPES.documentation))
    review = baker.make(
        AssetCustomizationReview, customization=site.customization, version__asset=asset, state=AssetCustomizationReview.REVIEW_STATES.accepted)
    article = baker.make(
        ZendeskArticle, site=site, section=section, menu_node__asset=asset, asset=asset, menu_node__parent_menu__zendesk_sync_enabled=[customization])
    mock_exporter_sync = mocker.patch.object(exporter, 'sync_article')
    sync_article(article, doc_json, site, exporter)

    created_sync_log = ZendeskSyncLog.objects.filter(
        menu=article.menu_node.parent_menu, zendesk_category=category).first()
    assert created_sync_log
    mock_exporter_sync.assert_called_once_with(
        article, doc_json, sync_log=created_sync_log)

    created_sync_item = ZendeskSyncItem.objects.filter(
        menu_node=article.menu_node, asset_id=asset.id, zendesk_section_id=article.section_id, zendesk_article=article, sync_log=created_sync_log, review=review).first()
    assert created_sync_item.state == ZendeskSyncItem.SYNC_STATES.success


def test_push_accepted_article_to_zendesk(mocker, asset_type_factory, db):
    exporter, *doc_json = [
        str(uuid4()) for _ in range(2)]
    customization = Customization.objects.filter(
        name=settings.CUSTOMIZATION).first()
    site = ZendeskSite.objects.filter(customization=customization).first(
    ) or baker.make(ZendeskSite, customization=customization)
    cloud_portal = get_cloud_portal_asset(customization=settings.CUSTOMIZATION)
    mocker.patch.object(cloud_portal, 'read_global_value', return_value=True)
    mocker.patch.object(Asset, 'read_global_value', return_value=True)
    mocker.patch.object(documentation, 'generate_doc_json',
                        return_value=doc_json)
    mocker.patch('cms.controllers.zendesk.Exporter', return_value=exporter)
    mock_sync_article = mocker.patch('cms.controllers.zendesk.sync_article')
    asset = baker.make(
        Asset, asset_type=asset_type_factory(AssetType.ASSET_TYPES.documentation))
    article = baker.make(
        ZendeskArticle, asset=asset)

    push_accepted_article_to_zendesk(asset)

    assert mock_sync_article.call_count == 1
    updated_article, updated_doc_json, updated_site, updated_exporter = mock_sync_article.call_args_list[
        0].args
    assert updated_article.id == article.id
    assert [updated_doc_json] == doc_json
    assert updated_site.id == site.id
    assert updated_exporter == exporter


def test_update_zd_section(mocker, get_exporter_instance, db):
    position = randint(1, 1000)
    updated_name = str(uuid4())
    exporter = get_exporter_instance()
    customization = Customization.objects.filter(
        name=exporter.customization_name).first()
    site = ZendeskSite.objects.filter(customization=customization).first(
    ) or baker.make(ZendeskSite, customization=customization)
    parent_zd = baker.make(
        ZendeskCategory, site=site, category_id=randint(1, 1000))
    section = baker.make(
        ZendeskSection, site=site, parent_category=parent_zd, section_id=randint(1, 1000), menu_node__enabled=[customization], menu_node__name=updated_name, needs_sync=True)
    menu_node = section.menu_node
    mock_sync_section = mocker.patch.object(exporter, 'sync_section')
    mock_sync_section.return_value.position = position
    mock_sync_section.return_value.name = updated_name

    updated_zd_section = update_zd_section(
        menu_node, site, parent_zd, exporter, customization, position)
    sync_section = mock_sync_section.call_args_list[0].args[0]
    delete = mock_sync_section.call_args_list[0].kwargs.get('delete', True)
    assert updated_zd_section.position == position
    assert updated_zd_section.name == updated_name
    assert mock_sync_section.call_count == 1
    assert not delete


def test_update_zd_article(mocker, get_exporter_instance, asset_type_factory, db):
    exporter = get_exporter_instance()
    position = randint(1, 1000)
    customization = Customization.objects.filter(
        name=settings.CUSTOMIZATION).first()
    site = ZendeskSite.objects.filter(customization=customization).first(
    ) or baker.make(ZendeskSite, customization=customization)
    category = baker.make(
        ZendeskCategory, site=site, category_id=randint(1, 1000))
    section = baker.make(
        ZendeskSection, site=site, parent_category=category, section_id=randint(1, 1000))
    asset = baker.make(
        Asset, asset_type=asset_type_factory(type=AssetType.ASSET_TYPES.documentation), customizations=[customization])
    review = baker.make(
        AssetCustomizationReview, customization=site.customization, version__asset=asset, state=AssetCustomizationReview.REVIEW_STATES.accepted)
    article = baker.make(
        ZendeskArticle, site=site, section=section, asset=asset, menu_node__asset=asset, menu_node__parent_menu__zendesk_sync_enabled=[customization], needs_sync=True, sync=True)
    mock_sync_article = mocker.patch.object(exporter, 'sync_article')

    state = update_zd_article(article.menu_node, site,
                              section, exporter, customization, position)
    existing_article = next(state)
    successful_update = next(state)
    assert successful_update
    updated_article = ZendeskArticle.objects.filter(
        id=existing_article.id).first()
    mock_sync_article.assert_called_once_with(
        updated_article, {
            'title': '',
            'blocks': [],
            'external_files': [],
            'id': asset.id,
            'labels': [],
            'shortDescription': '',
            'script': '',
            'kbMenus': [node.get_parent().name for node in asset.nodes.all()]
        },
        delete=False,
        sync_log=None
    )


def test_check_if_article_can_sync(mocker, asset_type_factory, db):
    mocker.patch('cms.controllers.zendesk.Exporter')
    customization = Customization.objects.filter(
        name=settings.CUSTOMIZATION).first()
    site = ZendeskSite.objects.filter(customization=customization).first(
    ) or baker.make(ZendeskSite, customization=customization)
    sync_log = baker.make(ZendeskSyncLog, zendesk_site=site)
    category = baker.make(
        ZendeskCategory, site=site, category_id=randint(1, 1000))
    section = baker.make(
        ZendeskSection, site=site, parent_category=category, section_id=randint(1, 1000))
    asset = baker.make(
        Asset, asset_type=asset_type_factory(type=AssetType.ASSET_TYPES.documentation))
    review = baker.make(
        AssetCustomizationReview, customization=site.customization, version__asset=asset, state=AssetCustomizationReview.REVIEW_STATES.accepted)
    article = baker.make(
        ZendeskArticle, site=site, section=section, asset=asset, menu_node__asset=asset, menu_node__parent_menu__zendesk_sync_enabled=[customization])

    sync = check_if_article_can_sync(sync_log, article.menu_node)
    assert sync == (article, review)


def test_process_asset(mocker, asset_type_factory, db):
    mocker.patch('cms.controllers.zendesk.Exporter')
    parent_enabled, force_update, position, node_name, * \
        nodes_list = [str(uuid4()) for _ in range(randint(10, 15))]
    read_global_value = mocker.MagicMock(return_value='1')
    cloud_portal = mocker.MagicMock(read_global_value=read_global_value)
    customization = Customization.objects.filter(
        name=settings.CUSTOMIZATION).first()
    site = ZendeskSite.objects.filter(customization=customization).first(
    ) or baker.make(ZendeskSite, customization=customization)
    sync_log = baker.make(ZendeskSyncLog, zendesk_site=site)
    category = baker.make(
        ZendeskCategory, site=site, category_id=randint(1, 1000))
    section = baker.make(
        ZendeskSection, site=site, parent_category=category, section_id=randint(1, 1000))
    asset = baker.make(
        Asset, asset_type=asset_type_factory(AssetType.ASSET_TYPES.documentation))
    review = baker.make(
        AssetCustomizationReview, customization=site.customization, version__asset=asset, state=AssetCustomizationReview.REVIEW_STATES.accepted)
    article = baker.make(
        ZendeskArticle, site=site, section=section, menu_node__asset=asset, asset=baker.make(Asset, asset_type=asset_type_factory(AssetType.ASSET_TYPES.documentation)), menu_node__parent_menu__zendesk_sync_enabled=[customization], menu_node__name=node_name)
    mocker.patch('cms.controllers.zendesk.check_if_article_can_sync',
                 return_value=(article, review))
    mocker.patch(
        'cms.controllers.zendesk.update_zd_article',
        return_value=iter([article, True]),
    )

    setattr(article.menu_node, 'nodes_list', nodes_list)

    unwrap(process_asset)(section, parent_enabled, sync_log, force_update,
                  position, article.menu_node, cloud_portal=cloud_portal)

    updated_sync_item = ZendeskSyncItem.objects.filter(
        menu_node=article.menu_node, asset=asset, zendesk_section=section, zendesk_article=article, sync_log=sync_log, review=review).first()

    assert updated_sync_item
    assert updated_sync_item.state == ZendeskSyncItem.SYNC_STATES.success


def test_process_nodes(mocker, asset_type_factory, db):
    mock_exporter = mocker.patch(
        'cms.controllers.zendesk.Exporter').return_value
    mock_process_node = mocker.patch('cms.controllers.zendesk.process_node')
    customization = Customization.objects.filter(
        name=settings.CUSTOMIZATION).first()
    site = ZendeskSite.objects.filter(customization=customization).first(
    ) or baker.make(ZendeskSite, customization=customization)
    category = baker.make(
        ZendeskCategory, site=site, category_id=randint(1, 1000))
    sync_log = baker.make(ZendeskSyncLog, zendesk_site=site, zendesk_category=category)
    section = baker.make(
        ZendeskSection, site=site, parent_category=category, section_id=randint(1, 1000), position=100)
    child_section = baker.make(
        ZendeskSection, site=site, name=str(uuid4()), parent_section=section, section_id=randint(1, 1000), position=100)
    asset = baker.make(Asset, asset_type=asset_type_factory(AssetType.ASSET_TYPES.documentation))
    article = baker.make(
        ZendeskArticle, site=site, asset=asset, title=str(uuid4()), section=section, article_id=randint(1, 1000))
    nodes = [article.menu_node]

    unwrap(process_nodes)(nodes, section)
    mock_process_node.assert_called_once_with(
        section, True, None, False, 100, article.menu_node)
    updated_section = mock_exporter.sync_section.call_args_list[0].args[0]
    assert updated_section.name == child_section.name
    updated_article = mock_exporter.sync_article.call_args_list[0].args[0]
    assert updated_article.title == article.title


def test_process_node(mocker, asset_type_factory, db):
    assets = [
        baker.make(Asset, asset_type=asset_type_factory(AssetType.ASSET_TYPES.documentation))
        for _ in range(5, 15)]
    nodes_list = [
        mocker.MagicMock(asset=asset)
        for asset in assets]
    parent_enabled, force_update, position, *nodes_list = [
        str(uuid4()) for _ in range(10)]
    mock_exporter = mocker.patch(
        'cms.controllers.zendesk.Exporter').return_value
    customization = Customization.objects.filter(
        name=settings.CUSTOMIZATION).first()
    node = baker.make(MenuNode)
    node.enabled.add(customization)
    setattr(node, 'nodes_list', nodes_list)
    site = ZendeskSite.objects.filter(customization=customization).first(
    ) or baker.make(ZendeskSite, customization=customization)
    category = baker.make(
        ZendeskCategory, site=site, category_id=randint(1, 1000))
    sync_log = baker.make(ZendeskSyncLog, zendesk_site=site, zendesk_category=category)
    section = baker.make(
        ZendeskSection, site=site, parent_category=category, section_id=randint(1, 1000), position=100)
    article = baker.make(ZendeskArticle, site=site, section=section, asset=baker.make(Asset, asset_type=asset_type_factory(AssetType.ASSET_TYPES.documentation)))
    node.zendeskarticle_set.add(article)
    mock_update_section = mocker.patch(
        'cms.controllers.zendesk.update_zd_section', return_value=section)
    mock_process_nodes = mocker.patch(
        'cms.controllers.zendesk.process_nodes')

    process_node(section, parent_enabled, sync_log,
                 force_update, position, node)
    mock_update_section.assert_called_once_with(
        node, site, section, mock_exporter, customization, position, customization)
    mock_process_nodes.assert_called_once_with(
        nodes_list, section, customization, sync_log, force_update)
    mock_exporter.sync_article.assert_called_once_with(
        article, delete=True, sync_log=sync_log)

@pytest.mark.slow
def test_process_general_section_node(mocker, get_exporter_instance, asset_type_factory, db):
    top_level_assets = [
        baker.make(Asset, asset_type=asset_type_factory(AssetType.ASSET_TYPES.documentation))
        for _ in range(5, 15)]
    nodes_list = [
        mocker.MagicMock(asset=asset)
        for asset in top_level_assets]
    mock_exporter = mocker.patch('cms.controllers.zendesk.Exporter')
    customization = Customization.objects.filter(
        name=settings.CUSTOMIZATION).first()
    site = ZendeskSite.objects.filter(customization=customization).first(
    ) or baker.make(ZendeskSite, customization=customization)
    sync_log = baker.make(ZendeskSyncLog, zendesk_site=site)
    category = baker.make(
        ZendeskCategory, site=site, category_id=randint(1, 1000))

    # Test create general section and add assets
    process_general_section_node(category, nodes_list, sync_log)
    created_general_section = ZendeskSection.objects.filter(
        site=category.site, parent_category=category, position=0, name=category.general_section_title).first()

    assert created_general_section
    mock_exporter.return_value.sync_section.assert_called_once_with(
        created_general_section, delete=False)

    # Test update removed articles
    removed_articles = [
        baker.make(ZendeskArticle, site=site, article_id=randint(1, 1000), asset=baker.make(Asset, asset_type=asset_type_factory(AssetType.ASSET_TYPES.documentation)))
        for _ in range(randint(5, 15))]
    created_general_section.zendeskarticle_set.set(removed_articles)
    expected_sync_article_calls = [
        call(article, delete=True, sync_log=sync_log)
        for article in removed_articles]
    process_general_section_node(category, [], sync_log)
    assert mock_exporter.return_value.sync_article.has_calls(
        expected_sync_article_calls)


def test_update_customization_structure(mocker, db):
    sync_log, force_update, * \
        nodes_list = [str(uuid4()) for _ in range(randint(5, 15))]
    mocker.patch('cms.controllers.zendesk.Exporter')
    mock_process_general_section = mocker.patch(
        'cms.controllers.zendesk.process_general_section_node')
    mock_process_nodes = mocker.patch(
        'cms.controllers.zendesk.process_nodes')
    site = baker.make(ZendeskSite)
    menu = baker.make(Menu, zendesk_sync_enabled=[site.customization])
    category = baker.make(
        ZendeskCategory, menu=menu, site=site)
    mocker.patch.object(
        menu, 'prefetch_menu', return_value=mocker.MagicMock(
            nodes_list=nodes_list))

    update_customization_structure(menu, site, sync_log, force_update)
    mock_process_general_section.assert_called_once_with(
        category, nodes_list, sync_log)
    mock_process_nodes.assert_called_once_with(
        nodes_list, category, site.customization, zendesk_sync_log=sync_log, force_update=force_update, verify_auth=True)


def test_sync_menu(mocker, db):
    mocker.patch('cms.controllers.zendesk.Exporter')
    customization = baker.make(Customization)
    menu = baker.make(Menu)
    task_id = randint(5, 1000)
    mock_task = mocker.MagicMock(task_id=task_id)
    mock_zendesk_sync = mocker.patch.object(
        async_zendesk_sync, 'apply_async', return_value=mock_task)

    result = list(sync_menu(menu, [customization]))
    assert result == [task_id]
    assert (created_zd_site := ZendeskSite.objects.get(
        customization=customization))
    assert (created_zd_category := ZendeskCategory.objects.get(
        site=created_zd_site, menu=menu, name=menu.name))
    assert (created_log := ZendeskSyncLog.objects.get(
        menu=menu, zendesk_site=created_zd_site, zendesk_category=created_zd_category))
    mock_zendesk_sync.assert_called_once_with(
        args=[menu.id, customization.name, created_log.id, True], queue='broadcast-notifications')

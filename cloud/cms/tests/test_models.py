from collections import Counter

from django.test import TestCase
from cms.controllers import filldata
from cms.models import *

from django_mock_queries.query import MockSet
from model_bakery import baker
import pytest


class FindActualValuesTestCase(TestCase):
    def against_find_actual_value(self, **kwargs):
        """Test that find_actual_value and find_actual_values produce the same result"""

        def compare_records(data_structures, **kwargs):
            values_dict = DataStructure.find_actual_values(data_structures=data_structures, **kwargs)
            value_dict = {}
            for ds in data_structures:
                value_dict[ds] = ds.find_actual_value(**kwargs)
            version_id = kwargs.get('version_id', None)

            for ds in value_dict:
                error_info = f'Asset ID: {asset.id}, Asset Name: {asset.name}, DS: {ds.name}, Version: {version_id}, ' \
                             f'Language: {lang.name if lang else None}'
                self.assertIn(ds, values_dict, f'{error_info}\nMissing {ds}')
                self.assertEqual(value_dict[ds], values_dict[ds],
                                 f'{error_info}\n{value_dict[ds]} != {values_dict[ds]}')

        assets = Asset.objects.filter(asset_type__type=2)

        for asset in assets:
            data_structures = [d for con in asset.asset_type.context_set.all() for d in con.datastructure_set.all()]
            for cust in (*asset.customizations.all(), None):
                customization_name = cust.name if cust else None
                for lang in (*Language.objects.all(), None):
                    if kwargs.pop('with_version', False):
                        for content_version in asset.contentversion_set.all():
                            compare_records(
                                asset=asset, data_structures=data_structures, version_id=content_version.id,
                                language=lang, customization_name=customization_name, **kwargs
                            )
                    else:
                        compare_records(
                            asset=asset, data_structures=data_structures, language=lang,
                            customization_name=customization_name, **kwargs
                        )

    def test_draft_without_version(self):
        self.against_find_actual_value(draft=True, with_version=False)

    def test_draft_with_version(self):
        self.against_find_actual_value(draft=True, with_version=True)

    def test_no_draft_without_version(self):
        self.against_find_actual_value(draft=False, with_version=False)

    def test_no_draft_with_version(self):
        self.against_find_actual_value(draft=False, with_version=True)


class TestMenuFields:
    @pytest.fixture(autouse=True)
    def setup(self):
        self.menu1 = baker.prepare('Menu', name='test-menu', depth=3)

    def test_name(self):
        name = self.menu1._meta.get_field('name')
        assert name.verbose_name == 'name'
        assert name.max_length == 255
        assert name.unique

    def test_depth(self):
        depth = self.menu1._meta.get_field('depth')
        assert depth.verbose_name == 'depth'
        assert depth.default == 2
        assert depth.blank

    def test_base_url(self):
        base_url = self.menu1._meta.get_field('base_url')
        assert base_url.verbose_name == 'base url'
        assert base_url.max_length == 255
        assert base_url.help_text == 'Ex: developers'
        assert base_url.blank

    def test_url(self):
        url = self.menu1._meta.get_field('url')
        assert url.verbose_name == 'url'
        assert url.max_length == 255
        assert url.help_text == 'Ex: knowledgebase'
        assert url.blank

    def test_allow_porting(self):
        allow_porting = self.menu1._meta.get_field('allow_porting')
        assert allow_porting.verbose_name == 'allow porting'
        assert allow_porting.default is False

    def test_type(self):
        type_field = self.menu1._meta.get_field('type')
        assert type_field.verbose_name == 'type'
        assert type_field.default == Menu.MENU_TYPES.generic
        assert type_field.choices == Menu.MENU_TYPES

    def test_title(self):
        title = self.menu1._meta.get_field('title')
        assert title.verbose_name == 'title'
        assert title.blank
        assert title.max_length == 255
        assert title.help_text == 'Title, used in meta tags for SEO if applicable'

    def test_short_description(self):
        short_description = self.menu1._meta.get_field('short_description')
        assert short_description.verbose_name == 'short description'
        assert short_description.blank
        assert short_description.help_text == 'Short description, used in meta tags for SEO if applicable'

    def test_admin_config(self):
        admin_config = self.menu1._meta.get_field('admin_config')
        assert not admin_config.blank
        assert admin_config.help_text == 'customizes admin view'
        assert admin_config.default == r"""{
        "header": ["name","url","enabled","order","preview"],
        "details": ["asset","icon","authentication"],
        "advanced": ["related_assets","next_item","subtitle","condition","permissions", "new_window", "is_global"]
    }"""


class TestMenuMethods:
    @pytest.fixture()
    def kb_menu(self):
        return baker.prepare(
            'Menu', type=Menu.MENU_TYPES.docs_knowledgebase, url='url1', base_url='base1'
        )

    @pytest.fixture()
    def struct_menu(self):
        return baker.prepare(
            'Menu', type=Menu.MENU_TYPES.docs_struct, url='', base_url='base1'
        )

    def test_str(self):
        no_name = baker.prepare('Menu', name=None)
        assert str(no_name) == 'Menu object (None)'

        with_name = baker.prepare('Menu', name='Test Name')
        assert str(with_name) == 'Test Name'

    def test_validate_unique(self, db):
        baker.make('Menu', base_url='base1', url='url1', type=Menu.MENU_TYPES.docs_knowledgebase)
        conflicting_menu = baker.prepare('Menu', base_url='base1', url='url1', type=Menu.MENU_TYPES.docs_knowledgebase)
        with pytest.raises(ValidationError):
            conflicting_menu.validate_unique()

        non_conflicting_menu = baker.prepare('Menu', base_url='base1', url='url2', type=Menu.MENU_TYPES.docs_knowledgebase)
        non_conflicting_menu.validate_unique()

    def test_preview_url(self, struct_menu, kb_menu):
        assert struct_menu.preview_url() == f'/docs/base1?state=draft'
        assert struct_menu.preview_url(state='some') == '/docs/base1?state=some'

        assert kb_menu.preview_url() == '/docs/base1/url1?state=draft'
        assert kb_menu.preview_url(state='some') == '/docs/base1/url1?state=some'

    def test_node_preview_url(self, struct_menu, kb_menu):
        assert struct_menu.node_preview_url == '/docs/base1?state=draft'
        assert kb_menu.node_preview_url == '/docs/base1/url1/asset_id?state=draft'

    def test_generate_menus_for_customization(self, mocker, default_customization):
        kb_menu = baker.make('Menu', type=Menu.MENU_TYPES.docs_knowledgebase)
        generate_node_structure = mocker.patch.object(MenuNode, 'generate_node_structure')
        generate_node_structure.return_value = ['node1', 'node2']
        mocker.patch.object(kb_menu, 'nodes_list', new_callable=mocker.PropertyMock, return_value=[], create=True)
        cust, structures = Menu.generate_menus_for_customization([kb_menu], default_customization)
        assert cust == default_customization
        assert structures == {
            kb_menu.name.lower(): {
                'nodes': generate_node_structure.return_value,
                'type': Menu.MENU_TYPES.docs_knowledgebase,
                'base_url': kb_menu.base_url,
                'id': kb_menu.id,
                'title': kb_menu.title,
                'description': kb_menu.short_description
            }
        }

    def test_generate_menu(self, kb_menu, mocker, default_customization):
        prefetch_mock = mocker.patch.object(Menu, 'get_prefetched_menus', return_value=['prefetched_menu'])
        gen_mock = mocker.patch.object(
            Menu, 'generate_menus_for_customization',
            return_value=('customization', {kb_menu.name.lower(): mocker.sentinel.generated_menu})
        )
        generated_menu = Menu.generate_menu(kb_menu.name)
        assert generated_menu == mocker.sentinel.generated_menu
        prefetch_mock.assert_called_with(kb_menu.name.lower())
        gen_mock.assert_called_with(['prefetched_menu'], default_customization, include_not_accepted=True)

    def test_generate_menus(self, mocker, other_customization, default_customization):
        mocker.patch.object(Menu, 'get_prefetched_menus', return_value=['prefetched_menu'])
        generated_menus = [
            (default_customization, {'menu1': mocker.sentinel.generated_menu_default}),
            (other_customization, {'menu1': mocker.sentinel.generated_menu_other})
        ]
        gen_mock = mocker.patch.object(
            Menu, 'generate_menus_for_customization',
            side_effect=generated_menus
        )

        menus = Menu.generate_menus()
        assert menus == {'other': {'menu1': mocker.sentinel.generated_menu_other}, 'default': {'menu1': mocker.sentinel.generated_menu_default}}

        gen_mock.side_effect = generated_menus[0:1]
        menus = Menu.generate_menus(customization_name='default')
        assert menus == {'menu1': mocker.sentinel.generated_menu_default}

    def test_get_prefetched_menus(self, mocker, kb_menu, struct_menu):
        qs = MockSet(kb_menu, struct_menu, Menu(enabled=False))
        max_depth = qs.aggregate(models.Max('depth'))['depth__max']
        mocker.patch.object(Menu, 'objects', qs)
        prefetch_object_mock = mocker.patch.object(Menu, 'get_prefetch_objects', return_value='nodes')
        prefetched = Menu.get_prefetched_menus()
        assert prefetched == list(qs.filter(enabled=True))
        prefetch_object_mock.assert_called_with(max_depth=max_depth, depth=1)

    def test_get_prefetch_objects(self):
        prefetch_strs = [prefetch.prefetch_through for prefetch in Menu.get_prefetch_objects(3, 1)]
        assert prefetch_strs == ['nodes', 'nodes_list__enabled', 'nodes_list__permissions', 'nodes_list__related_assets', 'nodes_list__nodes', 'nodes_list__nodes_list__enabled', 'nodes_list__nodes_list__permissions', 'nodes_list__nodes_list__related_assets', 'nodes_list__nodes_list__nodes', 'nodes_list__nodes_list__nodes_list__enabled', 'nodes_list__nodes_list__nodes_list__permissions', 'nodes_list__nodes_list__nodes_list__related_assets']

        prefetch_strs = [prefetch.prefetch_through for prefetch in Menu.get_prefetch_objects(1, 1)]
        assert prefetch_strs == ['nodes', 'nodes_list__enabled', 'nodes_list__permissions', 'nodes_list__related_assets']

    def test_cache_all_customizations(self, mocker):
        gen_menus_mock = mocker.patch.object(
            Menu, 'generate_menus',
            return_value={'default': mocker.sentinel.default_struct, 'other': mocker.sentinel.other_struct}
        )
        menu_cache_mock = mocker.patch('cms.models.MENU_CACHE')
        Menu.cache_all_customizations()
        gen_menus_mock.assert_called()
        menu_cache_mock.__setitem__.assert_any_call('default', mocker.sentinel.default_struct)
        menu_cache_mock.__setitem__.assert_any_call('other', mocker.sentinel.other_struct)

    def test_to_dict(self, menu_with_nodes, expected_menu_dict):
        menu = menu_with_nodes()
        # Assets are a list of uuids that have no guaranteed order, so they need to be sorted for comparison
        menu_dict = menu.to_dict()
        menu_dict['assets'].sort()
        expected_menu_dict['assets'].sort()
        assert menu_dict == expected_menu_dict

    def test_from_dict(self, menu_import_dict, superuser, db):
        menu = baker.make('Menu')
        menu.from_dict(menu_import_dict, superuser)
        menu.refresh_from_db()
        nodes = menu.nodes.all()
        assert nodes.count() == 2
        assert nodes[0].name == 'node1'
        assert nodes[0].asset.name == 'node_asset1'
        assert nodes[0].order == 0
        assert nodes[1].name == 'node2'
        assert nodes[1].asset.name == 'node_asset2'
        assert nodes[1].order == 1

        sub_nodes = nodes[0].nodes.all()
        assert sub_nodes[0].name == 'node1_node1'
        assert sub_nodes[0].asset.name == 'node1_node_asset1'
        assert sub_nodes[0].order == 0

    def test_extract_from_nodes(self, menu_with_nodes):
        menu = menu_with_nodes(2, 2)
        all_nodes = menu.extract_from_nodes(lambda node: node.name)
        assert Counter(all_nodes) == Counter(['node1', 'node2', 'node1_node1', 'node1_node2', 'node2_node1', 'node2_node2'])

    def test_all_node_ids(self, mocker):
        mocker.patch.object(Menu, 'extract_from_nodes', return_value=[1, 2, 3])
        menu = baker.prepare('Menu')
        assert menu.all_node_ids == [1, 2, 3]

    def test_all_asset_ids(self, mocker):
        mocker.patch.object(Menu, 'extract_from_nodes', return_value=[1, 2, 3])
        menu = baker.prepare('Menu')
        assert menu.all_asset_ids == [1, 2, 3]


class TestMenuNodeFields:
    @pytest.fixture(autouse=True)
    def setup(self):
        self.node = baker.prepare('MenuNode')

    def test_name(self):
        name = self.node._meta.get_field('name')
        assert name.verbose_name == 'name'
        assert name.max_length == 255
        assert name.blank

    def test_subtitle(self):
        subtitle = self.node._meta.get_field('subtitle')
        assert subtitle.verbose_name == 'subtitle'
        assert subtitle.max_length == 255
        assert subtitle.blank

    def test_url(self):
        url = self.node._meta.get_field('url')
        assert url.verbose_name == 'url'
        assert url.max_length == 2048
        assert url.blank

    def test_asset(self):
        asset = self.node._meta.get_field('asset')
        assert asset.verbose_name == 'asset'
        assert asset.null
        assert asset.blank
        assert asset.related_model == Asset
        assert asset.related_query_name() == 'nodes'

    def test_related_assets(self):
        related_assets = self.node._meta.get_field('related_assets')
        assert related_assets.verbose_name == 'related assets'
        assert related_assets.default is None
        assert related_assets.blank
        assert related_assets.related_model == Asset
        assert related_assets.related_query_name() == 'nodes_related'

    def test_next_item(self):
        next_item = self.node._meta.get_field('next_item')
        assert not next_item.default
        assert next_item.verbose_name == 'Link to next'

    def test_new_window(self):
        new_window = self.node._meta.get_field('new_window')
        assert new_window.verbose_name == 'new window'
        assert not new_window.default

    def test_icon(self):
        icon = self.node._meta.get_field('icon')
        assert icon.verbose_name == 'icon'
        assert icon.blank
        assert icon.max_length == 255

    def test_available(self):
        available = self.node._meta.get_field('available')
        assert available.verbose_name == 'available'
        assert available.blank
        assert available.related_model == Customization
        assert available.related_query_name() == 'available_nodes'

    def test_enabled(self):
        enabled = self.node._meta.get_field('enabled')
        assert enabled.verbose_name == 'enabled'
        assert enabled.blank
        assert enabled.related_model == Customization
        assert enabled.related_query_name() == 'enabled_nodes'

    def test_authentication(self):
        authentication = self.node._meta.get_field('authentication')
        assert authentication.verbose_name == 'authentication'
        assert authentication.choices == MenuNode.AUTH_CHOICES
        assert authentication.default == MenuNode.AUTH_CHOICES.both

    def test_condition(self):
        condition = self.node._meta.get_field('condition')
        assert condition.verbose_name == 'condition'
        assert condition.blank
        assert condition.max_length == 255

    def test_permissions(self):
        permissions = self.node._meta.get_field('permissions')
        assert permissions.verbose_name == 'permissions'
        assert permissions.related_model == Permission
        assert permissions.default is None
        assert permissions.blank

    def test_order(self):
        order = self.node._meta.get_field('order')
        assert order.verbose_name == 'order'
        assert order.default == 0

    def test_is_global(self):
        is_global = self.node._meta.get_field('is_global')
        assert is_global.default
        assert is_global.verbose_name == 'Global'

    def test_parent_menu(self):
        parent_menu = self.node._meta.get_field('parent_menu')
        assert parent_menu.verbose_name == 'parent menu'
        assert parent_menu.null
        assert parent_menu.blank
        assert parent_menu.related_model == Menu
        assert parent_menu.related_query_name() == 'nodes'

    def test_parent_node(self):
        parent_node = self.node._meta.get_field('parent_node')
        assert parent_node.verbose_name == 'parent node'
        assert parent_node.null
        assert parent_node.blank
        assert parent_node.related_model == MenuNode
        assert parent_node.related_query_name() == 'nodes'

    def test_touched(self):
        touched = self.node._meta.get_field('touched')
        assert touched.verbose_name == 'touched'
        assert not touched.default


class TestMenuNodeMethods:
    def test_str(self, mocker):
        mocker.patch.object(MenuNode, 'display_name', return_value='Epic Node')

        no_parent_node = baker.prepare('MenuNode')
        assert str(no_parent_node) == 'Item: Epic Node (Menu: None)'

        level_1_node = baker.prepare('MenuNode', parent_menu=baker.prepare('Menu', name='Amazing Menu'))
        assert str(level_1_node) == 'Item: Epic Node (Menu: Amazing Menu)'

        level_3_node = baker.prepare(
            'MenuNode', parent_menu=None,
            parent_node=baker.prepare(
                'MenuNode', parent_menu=None,
                parent_node=baker.prepare(
                    'MenuNode', parent_node=None,
                    parent_menu=baker.prepare('Menu', name='Great Menu')
                )
            )
        )
        assert str(level_3_node) == 'Item: Epic Node (Menu: Great Menu)'

    def test_display_name(self):
        node = baker.prepare('MenuNode', name='', asset=None)
        assert node.display_name() == 'New'

        node = baker.prepare('MenuNode', name='Cool node', asset=None)
        assert node.display_name() == 'Cool node'

        node = baker.prepare('MenuNode', name='', asset=baker.prepare('Asset', name='Great Asset', asset_type=None))
        assert node.display_name() == '(Asset: Great Asset)'

        node = baker.prepare('MenuNode', name='Cool node', asset=baker.prepare('Asset', name='Great Asset', asset_type=None))
        assert node.display_name() == 'Cool node'

        node = baker.prepare('MenuNode', name='', asset=None, pk=999)
        assert node.display_name() == str(999)

    class TestGenerateNodeStructure:
        @pytest.fixture(autouse=True)
        def menu_node(self, menu_with_nodes, default_portal, default_customization):
            self.menu = menu_with_nodes(1, 2)
            self.portal = default_portal
            self.customization = default_customization

        @pytest.fixture()
        def dss_mock(self, mocker):
            dss = {
                'title': mocker.MagicMock(),
                'url': mocker.MagicMock()
            }
            dss['title'].find_actual_value.return_value = 'Great title'
            dss['url'].find_actual_value.return_value = 'my_url'
            return dss

        # TODO: Revisit and add more variation to get more branch coverage
        def test_simple(self, asset_factory, superuser, customization_factory, dss_mock):
            cust_1 = customization_factory(name='cust1')
            docs = list(asset_factory(
                'doc', asset_type=AssetType.ASSET_TYPES.documentation, account=superuser, qty=3, customization_name='cust1'
            ))
            nodes = list(self.menu.nodes.all())
            nodes[0].asset = docs[0]
            nodes[0].save()
            nodes[1].asset = docs[1]
            nodes[1].save()
            prefetched_menu = Menu.get_prefetched_menus(menu_name='auto_menu')[0]
            prefetched_menu.nodes_list[0].nodes_list = []
            prefetched_menu.nodes_list[1].nodes_list = []

            node_structure = MenuNode.generate_node_structure(
                prefetched_menu.nodes_list, self.portal, cust_1, {}, 1, 2, document_dss=dss_mock
            )
            assert node_structure == [
                {
                    'subtitle': 'node1_subtitle',
                    'url': 'node1_url',
                    'asset_id': docs[0].id,
                    'accepted': True,
                    'pending': False,
                    'draft': False,
                    'asset_type': 'Documentation Page',
                    'related_asset_ids': [asset.id for asset in nodes[0].related_assets.all()],
                    'next_item': True,
                    'new_window': False,
                    'icon': 'icon1.svg',
                    'permissions': [],
                    'authentication': 'Logged Out',
                    'order': 0,
                    'condition': '%DEVELOPERS_ENABLED%',
                    'condition_met': False,
                    'urlified': f'{docs[0].id}-my_url',
                    'name': 'node1',
                    'display_name': 'node1'
                }, {
                    'subtitle': 'node2_subtitle',
                    'url': 'node2_url',
                    'asset_id': docs[1].id,
                    'accepted': True,
                    'pending': False,
                    'draft': False,
                    'asset_type': 'Documentation Page',
                    'related_asset_ids': [asset.id for asset in nodes[1].related_assets.all()],
                    'next_item': False,
                    'new_window': True,
                    'icon': 'icon2.svg',
                    'permissions': [],
                    'authentication': 'Logged In',
                    'order': 1,
                    'condition': '',
                    'condition_met': True,
                    'urlified': f'{docs[1].id}-my_url',
                    'name': 'node2',
                    'display_name': 'node2'
                }
            ]

    def test_enable_global(self, default_portal):
        nodes = baker.make('MenuNode', _quantity=2, enabled=[])
        MenuNode.enable_global(default_portal)
        for node in nodes:
            assert node.enabled.filter(name='default').exists()

    def test_enabled_customizations(self, db):
        node = baker.make('MenuNode')
        cust1, cust2, cust3 = baker.make('Customization', name=baker.seq('cust'), _quantity=3)
        node.enabled.set([cust1])
        assert list(node.enabled_customizations) == [cust1]
        node.enabled_list = [cust1, cust2]
        assert node.enabled_customizations == [cust1, cust2]

        node = baker.make('MenuNode')
        node.asset = baker.make('Asset', name='asset', customizations=[cust1])
        assert list(node.enabled_customizations) == [cust1]
        node.asset.asset_customizations_list = [cust1, cust3]
        assert node.enabled_customizations == [cust1, cust3]

    def test_is_enabled(self, mocker):
        node = baker.prepare('MenuNode')
        cust = baker.prepare('Customization')
        cust.id = 1
        enabled_cust_patch = mocker.patch.object(type(node), 'enabled_customizations', new_callable=mocker.PropertyMock, return_value=[])
        assert not node.is_enabled(cust)
        enabled_cust_patch.return_value = [cust]
        assert node.is_enabled(cust)

    def test_get_parent(self):
        menu = baker.prepare('Menu')
        node = baker.prepare('MenuNode', parent_menu=menu)
        assert node.get_parent() == menu
        node = baker.prepare(
            'MenuNode', parent_menu=None,
            parent_node=baker.prepare(
                'MenuNode', parent_menu=None,
                parent_node=baker.prepare('MenuNode', parent_menu=menu, parent_node=None)
            )
        )
        assert node.get_parent() == menu


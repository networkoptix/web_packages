import pytest
from collections import Counter
from random import randint, choice
from uuid import uuid4

from django.contrib.contenttypes.models import ContentType
from django.db.models import Count
from django.core.files.base import ContentFile
from model_bakery import baker, seq

from django.test import TestCase
from django_mock_queries.query import MockSet

from cms.controllers.asset_json import get_contexts_and_datastructures_of_asset_type
from cms.helpers.cached_asset import AssetCacheLoaderBase
from cms.models import *
from conftest import make_tos_agreement, make_agreement_ds, make_test_agreement, make_test_version_with_records, \
    make_test_review, get_asset_type


class TestModelFunctions:
    @pytest.fixture
    def uses(self, account_factory, asset_factory, customization_factory, db):
        def helper(menu=False, cloud_portal_asset=False, vms_asset=False, integration_asset=False, documentation_asset=False, customization=False, account=False):
            create_asset = cloud_portal_asset or vms_asset or integration_asset or documentation_asset

            if menu:
                menu_name = str(uuid.uuid4())
                self.menu =  baker.make(Menu, name=menu_name, depth=2, title=f'{menu_name} title', short_description=f'{menu_name} description')

            if create_asset or account:
                self.account = account_factory()

            if create_asset or customization:
                self.customization = customization_factory()

            if cloud_portal_asset:
                self.cloud_portal_asset = Asset.objects.filter(
                    customizations__name__in=[
                        self.customization.name], asset_type__name="",
                    asset_type__type=AssetType.ASSET_TYPES.cloud_portal
                ).first() or next(
                    asset_factory(account=self.account,
                                asset_type=AssetType.ASSET_TYPES.cloud_portal,
                                state=AssetCustomizationReview.REVIEW_STATES.accepted))

            if vms_asset:
                self.vms_asset = Asset.objects.filter(
                    customizations__name__in=[
                        self.customization.name], asset_type__name="",
                    asset_type__type=AssetType.ASSET_TYPES.vms
                ).first() or next(
                    asset_factory(account=self.account,
                                asset_type=AssetType.ASSET_TYPES.vms,
                                state=AssetCustomizationReview.REVIEW_STATES.accepted))

            if integration_asset:
                self.integration_asset = next(
                    asset_factory(account=self.account,
                                asset_type=AssetType.ASSET_TYPES.integration,
                                state=AssetCustomizationReview.REVIEW_STATES.accepted))

            if documentation_asset:
                self.documentation_asset = next(
                    asset_factory(account=self.account,
                                asset_type=AssetType.ASSET_TYPES.documentation,
                                state=AssetCustomizationReview.REVIEW_STATES.accepted))


        return helper

    # Permission group helpers

    def create_group_with(self, asset):
        Group.objects.all().delete()
        return create_default_permission_group(asset)

    def rename_group_with(self, asset):
        group = self.create_group_with(asset)
        group.name = 'Incorrect Name'
        group.save()
        rename_permission_group(group, asset)
        return group

    # Permission group tests

    def test_get_name_factory_group_name_length(self, mocker):
        mock_asset = mocker.MagicMock()
        mock_asset.id = randint(1, 1000)
        mock_group_name = str(uuid.uuid4())[:randint(1, 36)]
        mock_asset.name = str(uuid.uuid4()) * 7
        generated_name = get_name_factory(mock_group_name)(mock_asset)
        generated_name_length = len(generated_name)
        group_name_max_length = Group._meta.get_field('name').max_length
        assert  generated_name_length == group_name_max_length


    def test_create_default_permission_group_documentation(self, uses):
        uses(documentation_asset=True)
        group = self.create_group_with(self.documentation_asset)

        assert group is None

    def test_create_default_permission_group_cloud_portal(self, uses):
        uses(cloud_portal_asset=True)

        group = self.create_group_with(self.cloud_portal_asset)

        expected_group_name = portal_manager_group_name(
            self.cloud_portal_asset)
        expected_permissions = Permission.objects.filter(
            codename__in=PORTAL_MANAGER_PERMISSIONS)
        actual_permissions = group.permissions.all()

        assert group.name == expected_group_name
        assert all(
            permission in actual_permissions for permission in expected_permissions)

    def test_create_default_permission_group_integration(self, uses):
        uses(integration_asset=True)

        group = self.create_group_with(self.integration_asset)

        expected_group_name = integration_dev_group_name(
            self.integration_asset)
        expected_permissions = Permission.objects.filter(
            codename__in=INTEGRATIONS_DEV_PERMISSIONS)
        actual_permissions = group.permissions.all()

        assert group.name == expected_group_name
        assert all(
            permission in actual_permissions for permission in expected_permissions)

    def test_rename_permission_group_cloud_portal(self, uses):
        uses(cloud_portal_asset=True)
        group = self.rename_group_with(self.cloud_portal_asset)

        assert group.name == portal_manager_group_name(self.cloud_portal_asset)

    def test_rename_permission_group_integration(self, uses):
        uses(integration_asset=True)
        group = self.rename_group_with(self.integration_asset)

        assert group.name == integration_dev_group_name(self.integration_asset)

    # Asset Test

    def test_get_cloud_portal_asset(self, uses):
        uses(cloud_portal_asset=True)

        assert get_cloud_portal_asset(
            customization=self.customization.name).id == self.cloud_portal_asset.id

    def test_get_vms_asset(self, uses):
        uses(vms_asset=True)

        assert get_vms_asset(customization=self.customization.name).id ==self.vms_asset.id

    def test_get_asset_by_revision(self, uses):
        uses(documentation_asset=True)
        test_asset = self.documentation_asset
        content_version = self.documentation_asset.contentversion_set.last()

        asset = get_asset_by_revision(content_version.id)

        assert asset.id == test_asset.id

    # Cache Test

    def test_update_global_cache(self, uses, test_version=None):
        uses(customization=True)
        customization = self.customization.name
        test_version = test_version or str(uuid.uuid4())

        update_global_cache(customization, test_version)

        cached_version = caches['customization'].get(global_version_key(customization))
        assert cached_version == test_version

    def test_check_update_cache(self, uses):
        uses(customization=True)
        test_version = str(uuid.uuid4())

        self.test_update_global_cache(uses, test_version=test_version)

        assert check_update_cache(self.customization.name, test_version)

    def test_cloud_portal_customization_cache(self, uses):
        uses(customization=True)
        customization = self.customization.name
        test_key = 'test_value'
        test_value = str(uuid.uuid4())
        cache_key = cloud_portal_customization_cache_key(customization)
        caches['customization'].set(cache_key, {test_key: test_value})

        data = cloud_portal_customization_cache(customization)

        assert data['test_value'] == test_value
        assert cloud_portal_customization_cache(
            customization, value=test_key) == test_value
        assert cloud_portal_customization_cache(
            customization, value=test_key, force=True) is None

    # Menu Cache Helpers

    def cache_menu_with(self, menu_type=Menu.MENU_TYPES.docs_struct, nodes_count=3, base_url='', menu_url='', new_menu=False, menu_name=None):
        customization = self.customization.name
        menu_cache = MenuCache(customization_name=customization)
        menu_cache.clear_cache()
        menu_name = menu_name or str(uuid.uuid4())
        menu = self.menu
        if new_menu:
            menu = baker.make(
                Menu,name=menu_name, depth=2)
        menu.type = menu_type
        menu.title = self.menu.name = menu_name
        menu.base_url = base_url
        menu.url = menu_url
        menu.save()
        for node in range(nodes_count):
            node = baker.make(MenuNode, name=f'{menu_name} - node {node}', enabled=[self.customization], available=[
                       self.customization], authentication=MenuNode.AUTH_CHOICES.logged_in, parent_menu=menu)
        menu_cache[customization] = Menu.generate_menus(customization=customization, menu_names=[menu_name])
        return customization, menu_name, menu_type, nodes_count

    def map_menu_helper(self, menu_name, base_url, menu_url):
        self.cache_menu_with(menu_name=menu_name, base_url=base_url, menu_url=menu_url, new_menu=True)
        return lambda menu_map: menu_map.get(base_url, {}).get(menu_url, '') == menu_name

    # Menu Cache Test
    def test_cached_doc_menu_map(self, uses):
        uses(customization=True, menu=True)
        customization = self.customization.name
        menu_cache = MenuCache(customization_name=customization)
        menu_cache.clear_cache()
        test_if_one_in_menu_map = self.map_menu_helper('menu-name-one', 'base-url-one', 'menu-url-one')
        test_if_two_in_menu_map = self.map_menu_helper('menu-name-two', 'base-url-two', 'menu-url-two')

        menu_map = cached_doc_menu_map(customization, refresh=True)

        assert test_if_one_in_menu_map(menu_map)
        assert test_if_two_in_menu_map(menu_map)

    def test_get_cached_menu(self, uses, arf):
        uses(account=True, customization=True, menu=True)
        customization, menu_name, menu_type, nodes_count = self.cache_menu_with()
        request = arf.get('/')
        request.user = self.account
        request.session = request.META = {}
        cached_menus = get_cached_menu(
            customization, user=self.account, menu_type=menu_type, request=request)

        menu = cached_menus.get(menu_name, {})
        assert menu.get('title', False) == menu_name
        assert menu.get('type', False) == menu_type
        assert len(menu.get('nodes', False)) == nodes_count

    def test_get_cached_menu_different_users_get_different_menus(self, uses, account_factory, mocker, arf):
        uses(account=True, customization=True, menu=True)
        user_one = account_factory(email='user_one@email.com', is_superuser=False)
        user_two = account_factory(email='user_two@email.com', is_superuser=False)
        condition = 'user_one_condition'
        baker.make(MenuNode, name=f'user1 node', enabled=[self.customization], available=[
                       self.customization], condition=condition, parent_menu=self.menu)
        # return flag name starting with 'access_' to test beta permissions
        mocker.patch('cms.feature_flags.feature_flags.FLAGS.value_to_key',
                     lambda node_condition, **kwargs: f'access_{condition}' if node_condition == condition else '')
        mocker.patch('cms.models.feature_flag_is_active', lambda flag, user, _, **kwargs: flag and user == user_one)
        customization, menu_name, menu_type, nodes_count = self.cache_menu_with()

        # user_one gets an extra node because they have permission
        request = arf.get('/')
        request.user = user_one
        request.session = request.META = {}
        cached_menus = get_cached_menu(
            customization, user=user_one, menu_type=menu_type)
        assert len(cached_menus.get(menu_name).get('nodes', False)) == nodes_count + 1

        # user_two does not have access to the extra node
        request.user = user_two
        cached_menus = get_cached_menu(
            customization, user=user_two, menu_type=menu_type)
        assert len(cached_menus.get(menu_name).get('nodes', False)) == nodes_count

    # External File Test
    def test_slugify_lower(self):
        slug = slugify('T$E%S@T', True)
        assert slug == 't-e-s-t'

    def test_rename_file(self, uses):
        uses(integration_asset=True)
        ds_name = 'ds-name'
        file_name = 'file_name'
        asset_name = slugify(self.integration_asset.name, True)
        ds = baker.make(DataStructure, name=ds_name)
        asset_ds_pair = baker.make(
            AssetDsPair, data_structure=ds, asset=self.integration_asset)
        external_file = baker.make(ExternalFile, asset_ds_pair=[asset_ds_pair])

        renamed = rename_file(external_file, file_name)

        assert renamed == f'{asset_name}/{ds_name}-{external_file.id}/{file_name}'

    # Other Test

    def test_slugify(self):
        slug = slugify('T$E%S@T')
        assert slug == 'T-E-S-T'

    def test_get_integration_type(self, db):
        integration_id = get_integration_type()

        integration = AssetType.objects.only('id').filter(
            type=AssetType.ASSET_TYPES.integration).first()
        expected_integration_id = integration.id if integration else None
        assert integration_id == expected_integration_id


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
    @pytest.fixture(autouse=True)
    def setup(self, default_customization_ctx):
        pass

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
        generated_menu = Menu.generate_menu(kb_menu.name, customization=settings.TEST_CUSTOMIZATION)
        assert generated_menu == mocker.sentinel.generated_menu
        prefetch_mock.assert_called_with([kb_menu.name.lower()])
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
        menus = Menu.generate_menus(customization='default')
        assert menus == {'menu1': mocker.sentinel.generated_menu_default}

    def test_get_prefetched_menus(self, mocker, kb_menu, struct_menu, db):
        qs = MockSet(kb_menu, struct_menu, Menu(enabled=False))
        kb_menu.save()
        struct_menu.save()
        max_depth = qs.aggregate(models.Max('depth'))['depth__max']
        prefetch_object_mock = mocker.patch.object(Menu, 'get_prefetch_objects', return_value=[])
        prefetched = Menu.get_prefetched_menus([kb_menu.name, struct_menu.name])
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
        Menu.cache_all_customizations(customization=settings.TEST_CUSTOMIZATION)
        gen_menus_mock.assert_called()
        menu_cache = MenuCache(customization_name=settings.TEST_CUSTOMIZATION)
        assert menu_cache['default'] == mocker.sentinel.default_struct
        assert menu_cache['other'] == mocker.sentinel.other_struct

    @pytest.mark.slow
    def test_to_dict(self, menu_with_nodes, expected_menu_dict):
        menu = menu_with_nodes()
        # Assets are a list of uuids that have no guaranteed order, so they need to be sorted for comparison
        menu_dict = menu.to_dict()
        menu_dict['assets'].sort()
        expected_menu_dict['assets'].sort()
        assert menu_dict == expected_menu_dict

    @pytest.mark.slow
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
            prefetched_menu = Menu.get_prefetched_menus(menu_names=['auto_menu'])[0]
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
                    'name_raw': 'node1',
                    'next_item': True,
                    'new_window': False,
                    'icon': 'icon1.svg',
                    'permissions': [],
                    'authentication': 'Logged Out',
                    'order': 0,
                    'condition': '%DEVELOPERS_ENABLED%',
                    'condition_met': False,
                    'urlified': f'{docs[0].id}-my_url',
                    'version': docs[0].version_id(cust_1),
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
                    'name_raw': 'node2',
                    'next_item': False,
                    'new_window': True,
                    'icon': 'icon2.svg',
                    'permissions': [],
                    'authentication': 'Logged In',
                    'order': 1,
                    'condition': '',
                    'condition_met': True,
                    'urlified': f'{docs[1].id}-my_url',
                    'version': docs[1].version_id(cust_1),
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


class TestAssetFields:
    @pytest.fixture(autouse=True)
    def setup(self):
        self.asset = baker.prepare('Asset', asset_type=None)

    def test_name(self):
        name = self.asset._meta.get_field('name')
        assert name.verbose_name == 'name'
        assert name.max_length == 255

    def test_created_by(self, django_user_model):
        created_by = self.asset._meta.get_field('created_by')
        assert created_by.verbose_name == 'created by'
        assert created_by.related_model == django_user_model
        assert created_by.blank
        assert created_by.related_query_name() == 'created_asset'

    def test_customizations(self):
        customizations = self.asset._meta.get_field('customizations')
        assert customizations.verbose_name == 'customizations'
        assert customizations.default is None
        assert customizations.related_model == Customization
        assert customizations.blank

    def test_asset_type(self):
        asset_type = self.asset._meta.get_field('asset_type')
        assert asset_type.verbose_name == 'asset type'
        assert asset_type.related_model == AssetType
        assert asset_type.default == get_integration_type
        assert asset_type.null

    def test_preview_statuses(self):
        assert Counter(Asset.PREVIEW_STATUS._triples) == Counter([(0, 'draft', 'draft'), (1, 'review', 'review')])

    def test_preview_status(self):
        preview_status = self.asset._meta.get_field('preview_status')
        assert preview_status.verbose_name == 'preview status'
        assert preview_status.choices == Asset.PREVIEW_STATUS
        assert preview_status.default == Asset.PREVIEW_STATUS.draft

    def test_primary_group(self):
        primary_group = self.asset._meta.get_field('primary_group')
        assert primary_group.verbose_name == 'primary group'
        assert primary_group.related_model == Group
        assert primary_group.unique
        assert primary_group.null
        assert primary_group.blank

    def test_protected(self):
        protected = self.asset._meta.get_field('protected')
        assert protected.verbose_name == 'protected'
        assert protected.default is False

    def test_uuid(self):
        uuid_field = self.asset._meta.get_field('uuid')
        assert uuid_field.verbose_name == 'uuid'
        assert uuid_field.default == uuid.uuid4
        assert not uuid_field.editable
        assert uuid_field.unique


class TestAssetMethods:
    @pytest.fixture(autouse=True)
    def asset(self, default_customization_ctx):
        self.asset = baker.prepare('Asset', name='Great Asset', asset_type=None)

    @pytest.fixture()
    def saved_asset(self, db):
        return baker.make('Asset', name='test asset')

    def test_str(self, default_portal):
        assert str(self.asset) == 'Great Asset'

        assert str(default_portal) == 'Cloud Portal - Cloud Portal - default'

    def test_can_preview_on_portal(self, default_portal):
        assert default_portal.can_preview_on_portal
        integration = baker.prepare(
            'Asset', asset_type=baker.prepare('AssetType', type=AssetType.ASSET_TYPES.integration, can_preview=False)
        )
        assert not integration.can_preview_on_portal

    def test_default_language(self, default_portal, english_language, default_customization, other_customization):
        assert default_portal.default_language == english_language
        asset = baker.make('Asset', name='test asset', customizations=[default_customization, other_customization])
        assert asset.default_language == english_language

    def test_languages_list(self, default_customization):
        asset_no_customizations = baker.make('Asset', name='test', customizations=[])
        assert list(asset_no_customizations.languages_list) == ['en_US']

        languages = baker.make('Language', code=seq('en_'), _quantity=2)
        cust = baker.make('Customization', name='test', languages=languages)
        asset = baker.make('Asset', name='test2', customizations=[default_customization, cust])
        print(asset.customizations.all())
        assert Counter(asset.languages_list) == Counter(['en_US', 'en_1', 'en_2'])

    def test_asset_root(self, default_portal):
        assert default_portal.asset_root == 'default'
        assert self.asset.asset_root == ''

    def test_is_agreement(self):
        self.asset.asset_type = baker.prepare('AssetType', type=AssetType.ASSET_TYPES.agreement)
        assert self.asset.is_agreement

        self.asset.asset_type = baker.prepare('AssetType', type=AssetType.ASSET_TYPES.integration)
        assert not self.asset.is_agreement

    def test_is_article(self):
        self.asset.asset_type = baker.prepare('AssetType', type=AssetType.ASSET_TYPES.article)
        assert self.asset.is_article

        self.asset.asset_type = baker.prepare('AssetType', type=AssetType.ASSET_TYPES.integration)
        assert not self.asset.is_article

    def test_is_documentation(self):
        self.asset.asset_type = baker.prepare('AssetType', type=AssetType.ASSET_TYPES.documentation)
        assert self.asset.is_documentation

        self.asset.asset_type = baker.prepare('AssetType', type=AssetType.ASSET_TYPES.integration)
        assert not self.asset.is_documentation

    def test_is_cloud_portal(self):
        self.asset.asset_type = baker.prepare('AssetType', type=AssetType.ASSET_TYPES.cloud_portal)
        assert self.asset.is_cloud_portal

        self.asset.asset_type = baker.prepare('AssetType', type=AssetType.ASSET_TYPES.integration)
        assert not self.asset.is_cloud_portal

    def test_is_integration(self):
        self.asset.asset_type = baker.prepare('AssetType', type=AssetType.ASSET_TYPES.integration)
        assert self.asset.is_integration

        self.asset.asset_type = baker.prepare('AssetType', type=AssetType.ASSET_TYPES.agreement)
        assert not self.asset.is_integration

    def test_is_vms(self):
        self.asset.asset_type = baker.prepare('AssetType', type=AssetType.ASSET_TYPES.vms)
        assert self.asset.is_vms

        self.asset.asset_type = baker.prepare('AssetType', type=AssetType.ASSET_TYPES.agreement)
        assert not self.asset.is_vms

    def test_is_single_customization(self, other_customization):
        asset_type = baker.prepare('AssetType', single_customization=True)
        asset = baker.prepare('Asset', name='test', asset_type=asset_type)
        assert asset.is_single_customization
        asset_type.single_customization = False
        assert not asset.is_single_customization

    def test_urlify(self):
        self.asset.id = 123
        assert self.asset.urlify() == '123-great-asset'
        assert self.asset.urlify(name='test name') == '123-test-name'
        assert self.asset.urlify(name='test--name') == '123-test--name'

    def test_is_dirty_no_versions(self, saved_asset):
        assert not saved_asset.is_dirty

    def test_is_dirty_no_versions_with_record(self, saved_asset):
        baker.make('DataRecord', asset=saved_asset)
        assert saved_asset.is_dirty

    def test_is_dirty_with_version_no_new_records(self, saved_asset):
        version = baker.make('ContentVersion', asset=saved_asset)
        baker.make('DataRecord', version=version, _quantity=2)
        assert not saved_asset.is_dirty

    def test_is_dirty_with_version_and_new_records(self, saved_asset):
        version = baker.make('ContentVersion', asset=saved_asset)
        baker.make('DataRecord', version=version, _quantity=2, asset=saved_asset)
        baker.make('DataRecord', asset=saved_asset)
        assert saved_asset.is_dirty

    def test_last_modified_no_version(self, saved_asset):
        assert saved_asset.last_modified == ''

    def test_last_modified_with_version(self, saved_asset, mocker):
        now = datetime.now()
        version = baker.make('ContentVersion', asset=saved_asset, accepted_date=now)
        mocker.patch.object(saved_asset, 'version_id', return_value=version.id)
        assert saved_asset.last_modified == now.strftime('%m/%d/%Y')

    def test_is_asset_type(self):
        self.asset.asset_type = baker.prepare('AssetType', type=AssetType.ASSET_TYPES.integration)
        assert self.asset.is_asset_type(AssetType.ASSET_TYPES.integration)
        assert not self.asset.is_asset_type(AssetType.ASSET_TYPES.documentation)

    def test_version_id(self, saved_asset, default_customization):
        assert saved_asset.version_id() == 0
        version = baker.make('ContentVersion', asset=saved_asset)
        baker.make(
            'AssetCustomizationReview', version=version, state=AssetCustomizationReview.REVIEW_STATES.accepted,
            customization=default_customization
        )
        assert saved_asset.version_id() == version.id

    def test_version_ids(self, default_customization, asset_factory):
        asset1, = asset_factory(name='asset1')
        version1 = baker.make('ContentVersion', asset=asset1)
        baker.make(
            'AssetCustomizationReview', version=version1, state=AssetCustomizationReview.REVIEW_STATES.accepted,
            customization=default_customization
        )

        asset2, = asset_factory(name='asset2')
        version2 = baker.make('ContentVersion', asset=asset2)
        baker.make(
            'AssetCustomizationReview', version=version2, state=AssetCustomizationReview.REVIEW_STATES.accepted,
            customization=default_customization
        )

        assert Asset.version_ids([asset1, asset2], customization=default_customization.name) == {asset1.id: version1.id, asset2.id: version2.id}

    def test_change_preview_status(self, saved_asset):
        assert saved_asset.preview_status == Asset.PREVIEW_STATUS.draft
        saved_asset.change_preview_status(Asset.PREVIEW_STATUS.review)
        assert saved_asset.preview_status == Asset.PREVIEW_STATUS.review

    def test_read_global_value_no_contexts(self, saved_asset):
        assert saved_asset.read_global_value('%DS1%') is None

    @pytest.fixture()
    def asset_with_ds(self, saved_asset, mocker):
        asset_type = baker.make('AssetType', name='test')
        context = baker.make('Context', asset_type=asset_type, is_global=True)
        baker.make('DataStructure', context=context, name='%DS1%')
        saved_asset.asset_type = asset_type
        saved_asset.save()
        mocker.patch.object(DataStructure, 'find_actual_value', return_value='test_val')
        return saved_asset

    def test_read_global_value_doesnt_exists(self, asset_with_ds):
        assert asset_with_ds.read_global_value('%DS2%') is None

    def test_read_global_value_ds_exists(self, asset_with_ds):
        assert asset_with_ds.read_global_value('%DS1%') == 'test_val'

    def test_read_global_values(self):
        context_dict = {'%DS1%': 'val1', "%DS2%": 'val2'}
        assert self.asset.replace_global_values('text 123 %DS1% text 456 %DS1%\n %DS2% more text %DS3%', context_dict) == \
               'text 123 val1 text 456 val1\n val2 more text %DS3%'

    def test_clean(self, saved_asset):
        asset_type = baker.make('AssetType', type=AssetType.ASSET_TYPES.integration, name='integration')
        saved_asset.asset_type = asset_type
        saved_asset.save()
        self.asset.asset_type = asset_type
        self.asset.name = 'test asset'
        with pytest.raises(ValidationError):
            self.asset.clean()

    def test_save_portal(self, db):
        self.asset.asset_type = baker.make('AssetType', name='portal', type=AssetType.ASSET_TYPES.cloud_portal)
        self.asset.save()
        assert self.asset.primary_group
        assert self.asset.primary_group.name == f'Portal Manager - {self.asset.name} - {self.asset.id}'
        assert self.asset.primary_group.permissions.filter(
            codename__in=['access_customization', 'change_account',
                          'change_assetcustomizationreview',
                          'change_asset', 'edit_content',
                          'force_update', 'publish_version']
        ).aggregate(num_codenames=Count('codename'))['num_codenames'] == 7

    def test_save_integration(self, db):
        self.asset.asset_type = baker.make('AssetType', name='integration', type=AssetType.ASSET_TYPES.integration)
        self.asset.save()
        assert self.asset.primary_group
        assert self.asset.primary_group.name == f'Developer - {self.asset.name} - {self.asset.id}'
        assert self.asset.primary_group.permissions.filter(
            codename__in=['edit_content', 'change_asset','change_assetcustomizationreview']
        ).aggregate(num_codenames=Count('codename'))['num_codenames'] == 3


class TestAssetTypeFields:
    @pytest.fixture(autouse=True)
    def setup(self):
        self.type = baker.prepare('AssetType')

    def test_asset_types(self):
        assert Counter(AssetType.ASSET_TYPES._triples) == Counter([(0, "cloud_portal", "Cloud Portal"),
                                                                   (1, "vms", "Vms"),
                                                                   (2, "integration", "Integration"),
                                                                   (3, "other", "Other"),
                                                                   (4, "article", "Article"),
                                                                   (5, "agreement", "Agreement"),
                                                                   (6, "documentation", "Documentation Page"),
                                                                   (7, 'release_notes', "Release Notes"),
                                                                   (8, 'vms_extension', 'VMS Extension')])

    def test_name(self):
        name = self.type._meta.get_field('name')
        assert name.verbose_name == 'name'
        assert name.max_length == 255
        assert name.default == ''
        assert name.blank

    def test_can_preview(self):
        can_preview = self.type._meta.get_field('can_preview')
        assert can_preview.verbose_name == 'can preview'
        assert can_preview.default is False

    def test_single_customiation(self):
        single_customization = self.type._meta.get_field('single_customization')
        assert single_customization.verbose_name == 'single customization'
        assert single_customization.default is False

    def assert_type(self):
        typ = self.type._meta.get_field('type')
        assert typ.verbose_name == 'type'
        assert typ.choices == AssetType.ASSET_TYPES
        assert typ.default == AssetType.ASSET_TYPES.cloud_portal

    def test_advanced(self):
        advanced = self.type._meta.get_field('advanced')
        assert advanced.verbose_name == 'advanced'
        assert advanced.default is True


class TestAssetTypeMethods:
    @pytest.fixture(autouse=True)
    def setup(self):
        self.asset_type = baker.prepare('AssetType')

    def test_str(self):
        self.asset_type.type = AssetType.ASSET_TYPES.integration
        assert str(self.asset_type) == 'Integration'

        self.asset_type.name = 'something'
        assert str(self.asset_type) == 'something - Integration'

    def test_get_model_by_type(self, asset_type_factory):
        int_type = asset_type_factory(AssetType.ASSET_TYPES.integration)
        assert AssetType.get_model_by_type(AssetType.ASSET_TYPES.integration) == int_type

    def test_get_type_by_name(self):
        assert AssetType.get_type_by_name('') == AssetType.ASSET_TYPES.cloud_portal
        assert AssetType.get_type_by_name('integration') == AssetType.ASSET_TYPES.integration
        assert AssetType.get_type_by_name('Integration') == AssetType.ASSET_TYPES.integration
        assert AssetType.get_type_by_name('nothing') == 0

    def test_get_customization(self, db):
        asset_type = baker.make('AssetType', name='int', type=AssetType.ASSET_TYPES.integration)
        cust1, cust2, cust3 = baker.make('Customization', name=seq('cust'), _quantity=3)
        asset1 = baker.make('Asset', asset_type=asset_type, name='asset1', customizations=[cust1, cust2])
        baker.make('Asset', asset_type=asset_type, name='asset2', customizations=[cust2, cust3])
        assert set(asset_type.get_customizations(asset1)) == {'cust2', 'cust3'}


class TestLanguage:
    @pytest.fixture(autouse=True)
    def setup(self):
        self.lang = baker.prepare('Language')

    def test_name(self):
        name = self.lang._meta.get_field('name')
        assert name.verbose_name == 'name'
        assert name.max_length == 255
        assert name.unique

    def test_code(self):
        code = self.lang._meta.get_field('code')
        assert code.verbose_name == 'code'
        assert code.max_length == 8
        assert code.unique

    def test_str(self):
        self.lang.code = 'en_NX'
        assert str(self.lang) == 'en_NX'

    def test_by_code(self, english_language):
        assert Language.by_code('en_US') == english_language
        assert Language.by_code('en_NX') is None
        assert Language.by_code('en_NX', self.lang) == self.lang


class TestContextFields:
    @pytest.fixture(autouse=True)
    def setup(self):
        self.context = baker.prepare('Context')

    def test_asset_type(self):
        asset_type = self.context._meta.get_field('asset_type')
        assert asset_type.verbose_name == 'asset type'
        assert asset_type.related_model == AssetType
        assert asset_type.null

    def test_name(self):
        name = self.context._meta.get_field('name')
        assert name.max_length == 1024

    def test_label(self):
        label = self.context._meta.get_field('label')
        assert label.max_length == 1024
        assert label.default == ''
        assert label.blank

    def test_description(self):
        description = self.context._meta.get_field('description')
        assert description.blank
        assert description.default == ''

    def test_translatable(self):
        translatable = self.context._meta.get_field('translatable')
        assert translatable.default

    def test_is_global(self):
        is_global = self.context._meta.get_field('is_global')
        assert not is_global.default

    def test_hidden(self):
        hidden = self.context._meta.get_field('hidden')
        assert not hidden.default

    def test_order(self):
        order = self.context._meta.get_field('order')
        assert order.default == 100000

    def test_deprecated(self):
        deprecated = self.context._meta.get_field('deprecated')
        assert not deprecated.default

    def test_file_path(self):
        file_path = self.context._meta.get_field('file_path')
        assert file_path.max_length == 1024
        assert file_path.blank
        assert file_path.default == ''

    def test_url(self):
        url = self.context._meta.get_field('url')
        assert url.max_length == 1024
        assert url.blank
        assert url.default == ''


class TestContextMethods:
    @pytest.fixture(autouse=True)
    def setup(self, arf):
        self.context = baker.prepare('Context', name='test_context')

    @pytest.fixture
    def cust_request(self, arf):
        return arf.get('/', customization_name=self.customization.name)

    def test_str(self):
        assert str(self.context) == 'test_context'
        self.context.asset_type = baker.prepare('AssetType', name='test_type')
        assert str(self.context) == f'{self.context.asset_type} - test_context'

    def test_get_nice_name(self):
        assert self.context.get_nice_name() == 'test_context'
        self.context.label = 'nice label'
        assert self.context.get_nice_name() == 'nice label'

    def test_template_for_language_exact(self, english_language):
        context = baker.make('Context')
        baker.make('ContextTemplate', context=context, language=english_language, template='temp', skin='blue')
        assert context.template_for_language(english_language, english_language, 'blue') == 'temp'

    @pytest.fixture()
    def asset_with_context_and_ds(self, db, asset_type_factory):
        self.customization = baker.make('Customization', name='cust')
        self.asset_type = asset_type_factory(AssetType.ASSET_TYPES.integration)
        self.asset = baker.make('Asset', name='test', asset_type=self.asset_type, customizations=[self.customization])
        self.context = baker.make('Context', name='context')
        self.dss = baker.make(
            'DataStructure', context=self.context, name=seq('ds'), _quantity=5, optional=False, default='',
            type=DataStructure.DATA_TYPES.text
        )
        return self.asset

    @pytest.fixture()
    def asset_with_datarecords(self, asset_with_context_and_ds):
        self.drs = []
        for ds in self.dss:
            self.drs.append(baker.make('DataRecord', data_structure=ds, asset=self.asset, value='test val'))

    @pytest.fixture()
    def asset_with_datarecords_and_review(self, asset_with_datarecords, settings):
        # Todo. Fix after removing get_customization() function
        self.version = baker.make('ContentVersion', asset=self.asset)
        for dr in self.drs:
            dr.version = self.version
            dr.save()
        self.review = baker.make(
            'AssetCustomizationReview', version=self.version, customization=self.customization,
            state=AssetCustomizationReview.REVIEW_STATES.pending
        )

    def test_get_state_incomplete(self, asset_with_context_and_ds, cust_request):
        assert self.context.get_state(self.asset, request=cust_request) == 'Incomplete'

    def test_get_state_draft(self, asset_with_datarecords, cust_request):
        assert self.context.get_state(self.asset, request=cust_request) == 'Draft'

    def test_get_state_review(self, asset_with_datarecords_and_review, cust_request):
        assert self.context.get_state(self.asset, request=cust_request) == 'In review'

    def test_get_state_published(self, asset_with_datarecords_and_review, cust_request):
        self.review.state = AssetCustomizationReview.REVIEW_STATES.accepted
        self.review.save()
        assert self.context.get_state(self.asset, request=cust_request) == 'Published'

    def test_get_state_rejected(self, asset_with_datarecords_and_review, cust_request):
        self.review.state = AssetCustomizationReview.REVIEW_STATES.rejected
        self.review.save()
        assert self.context.get_state(self.asset, request=cust_request) == 'Rejected'


class TestContributorAgreement:
    @pytest.fixture(autouse=True)
    def setup(self):
        self.agm = baker.prepare('ContributorAgreement')

    def test_accepted_date(self):
        accepted_date = self.agm._meta.get_field('accepted_date')
        assert accepted_date.auto_now_add

    def test_accepted_agreement(self):
        accepted_agreement = self.agm._meta.get_field('accepted_agreement')
        assert accepted_agreement.related_model == AssetCustomizationReview

    def test_user(self, django_user_model):
        user = self.agm._meta.get_field('user')
        assert user.related_model == django_user_model

    def test_str(self, django_user_model):
        user = baker.prepare(django_user_model)
        agreement = baker.prepare('AssetCustomizationReview')
        self.agm.accepted_agreement = agreement
        self.agm.user = user
        assert str(self.agm) == f'{agreement} - {user}'

    def test_clean_agreement(self):
        self.agm.accepted_agreement = baker.prepare(
            'AssetCustomizationReview', version=baker.prepare(
                'ContentVersion', asset=baker.prepare(
                    'Asset', asset_type=baker.prepare('AssetType', type=AssetType.ASSET_TYPES.agreement)
                )
            )
        )
        self.agm.clean()

    def test_clean_not_agreement(self):
        self.agm.accepted_agreement = baker.prepare(
            'AssetCustomizationReview', version=baker.prepare(
                'ContentVersion', asset=baker.prepare(
                    'Asset', asset_type=baker.prepare('AssetType', type=AssetType.ASSET_TYPES.integration)
                )
            )
        )

        with pytest.raises(ValidationError):
            self.agm.clean()

    @pytest.mark.parametrize("agreement_type", [
                (AgreementTypes.tos),
                (AgreementTypes.contributor),
                (AgreementTypes.cookie)
            ])
    def test_get_current(self, asset_type_factory, agreement_type, default_customization):
        agreement = make_test_agreement(default_customization)
        version = make_test_version_with_records(agreement, agreement_type=agreement_type)
        review = make_test_review(default_customization, version)  
        if agreement_type == AgreementTypes.contributor: # get current returns contributor on default
            assert ContributorAgreement.get_current(customization=default_customization) == review
        assert ContributorAgreement.get_current(customization=default_customization,
                                                agreement_type=agreement_type) == review


    def test_is_valid(self, mocker, db):
        review = baker.prepare('AssetCustomizationReview')
        mocker.patch.object(self.agm, 'get_current', return_value=review)
        self.agm.accepted_agreement = review
        assert self.agm.is_valid()


class TestCustomization:
    @pytest.fixture(autouse=True)
    def setup(self):
        self.cust = baker.prepare('Customization')

    def test_permissions(self):
        assert self.cust._meta.permissions == (
            ('access_customization', 'Can access customization'),
            ('access_integration_store', 'Can access the integration store'),
            ('access_developers', 'Can see Developers pages'),
            ('view_integration_drafts', 'Can view all integration drafts')
        )

    def test_name(self):
        name = self.cust._meta.get_field('name')
        assert name.max_length == 255
        assert name.unique

    def test_default_language(self):
        default_language = self.cust._meta.get_field('default_language')
        assert default_language.related_model == Language
        assert default_language.related_query_name() == 'default_in_customization'

    def test_langauges(self):
        languages = self.cust._meta.get_field('languages')
        assert languages.related_model == Language

    def test_parent(self):
        parent = self.cust._meta.get_field('parent')
        assert parent.related_model == Customization
        assert parent.default is None
        assert parent.null
        assert parent.blank
        assert parent.related_query_name() == 'children_customizations'

    def test_trust_parent(self):
        trust_parent = self.cust._meta.get_field('trust_parent')
        assert trust_parent.default is False

    def test_str(self):
        self.cust.name = 'test'
        assert str(self.cust) == 'test'

    def test_languages_list(self, db):
        languages = baker.make('Language', code=seq('nx_'), _quantity=2)
        cust = baker.make('Customization', languages=languages, name='cust1')
        assert set(cust.languages_list) == {'nx_1', 'nx_2'}

    def test_children_ids(self, db):
        root_customization = baker.make('Customization', name='root')
        l1_customizations = baker.make('Customization', parent=root_customization, name=seq('l1_'), _quantity=3)
        l2_customizations = baker.make('Customization', parent=l1_customizations[0], name=seq('l2_'), _quantity=3)
        baker.make('Customization', name='unrelated')
        ids = {customization.id for customization in (*l1_customizations, *l2_customizations)}
        assert set(root_customization.get_children_ids(root_customization)) == ids

    def test_save(self, db, english_language, asset_type_factory):
        integration = baker.make(
            'Asset', asset_type=asset_type_factory(AssetType.ASSET_TYPES.integration), name='Integration',
            customizations=Customization.objects.all()
        )
        customization = Customization(name='new_cust', default_language=english_language)
        customization.save()
        portal = Asset.objects.filter(customizations=customization, asset_type__type=AssetType.ASSET_TYPES.cloud_portal).first()
        assert portal
        assert portal.asset_type.type == AssetType.ASSET_TYPES.cloud_portal
        assert portal.name == 'Cloud Portal'

        integration.refresh_from_db()
        assert integration.customizations.filter(id=customization.id).exists()


class TestCustomClient:
    @pytest.fixture(autouse=True)
    def setup(self):
        self.client = baker.prepare('CustomClient', base_vms=None, values={'test': 'test'})

    def test_name(self):
        name = self.client._meta.get_field('name')
        assert name.max_length == 100

    def test_last_modified(self):
        last_modified = self.client._meta.get_field('last_modified')
        assert last_modified.auto_now

    def test_base_vms(self):
        base_vms = self.client._meta.get_field('base_vms')
        assert base_vms.related_model == Asset
        assert base_vms.get_limit_choices_to() == {'asset_type__type': 1}

    def test_created_by(self, django_user_model):
        created_by = self.client._meta.get_field('created_by')
        assert created_by.related_model == django_user_model

    def test_created_on(self):
        created_on = self.client._meta.get_field('created_on')
        assert created_on.auto_now_add


class TestContentVersionFields:
    @pytest.fixture(autouse=True)
    def setup(self):
        self.version = baker.prepare('ContentVersion')

    def test_customization(self):
        customization = self.version._meta.get_field('customization')
        assert customization.related_model == Customization
        assert customization.default is None
        assert customization.null

    def test_asset(self):
        asset = self.version._meta.get_field('asset')
        assert asset.related_model == Asset
        assert asset.default == 1

    def test_created_date(self):
        created_date = self.version._meta.get_field('created_date')
        assert created_date.auto_now_add is True

    def test_created_by(self, django_user_model):
        created_by = self.version._meta.get_field('created_by')
        assert created_by.related_model == django_user_model
        assert created_by.null
        assert created_by.blank
        assert created_by.related_query_name() == 'created_contentversion'

    def test_accepted_date(self):
        accepted_date = self.version._meta.get_field('accepted_date')
        assert accepted_date.null
        assert accepted_date.blank

    def test_accepted_by(self, django_user_model):
        accepted_by = self.version._meta.get_field('accepted_by')
        assert accepted_by.related_model == django_user_model
        assert accepted_by.null
        assert accepted_by.blank
        assert accepted_by.related_query_name() == 'accepted_contentversion'


class TestContentVersionMethods:
    def test_str(self):
        version = baker.prepare('ContentVersion')
        version.id = 5
        assert str(version) == '5'

    @pytest.fixture()
    def asset(self, default_customization, other_customization, asset_type_factory, superuser):
        integration_type = asset_type_factory(AssetType.ASSET_TYPES.integration)
        return baker.make('Asset', name='asset', asset_type=integration_type, customizations=[default_customization, other_customization])

    def test_create_missing_reviews(self, asset, superuser, default_customization, other_customization):
        customizations = [default_customization, other_customization]
        version_oldest = baker.make('ContentVersion', asset=asset, created_by=superuser)
        baker.make(
            'AssetCustomizationReview', version=version_oldest,
            customization=iter(customizations),
            state=AssetCustomizationReview.REVIEW_STATES.accepted, _quantity=2
        )

        version_older = baker.make('ContentVersion', asset=asset, created_by=superuser)
        baker.make(
            'AssetCustomizationReview', version=version_older,
            customization=default_customization, state=AssetCustomizationReview.REVIEW_STATES.accepted
        )
        version_newest = baker.make('ContentVersion', asset=asset, created_by=superuser)
        baker.make(
            'AssetCustomizationReview', version=version_newest,
            customization=iter(customizations),
            state=AssetCustomizationReview.REVIEW_STATES.pending, _quantity=2
        )

        ContentVersion.create_missing_reviews(asset, version_newest, customization=other_customization)
        missing_review = version_older.assetcustomizationreview_set.filter(customization=other_customization).first()
        assert missing_review
        assert missing_review.state == AssetCustomizationReview.REVIEW_STATES.pending
        assert missing_review.version == version_older

    def test_create_reviews(self, asset, superuser, default_customization, other_customization):
        version = baker.make('ContentVersion', asset=asset, created_by=superuser)
        version.create_reviews()
        assert version.assetcustomizationreview_set.filter(customization=default_customization).exists()
        assert version.assetcustomizationreview_set.filter(customization=other_customization).exists()

    def test_state(self, mocker, django_user_model):
        asset = baker.prepare('Asset', asset_type=None)
        version = baker.prepare('ContentVersion', asset=asset, id=5, accepted_by=None)
        assert version.state == 'in review'

        version_id_mock = mocker.patch.object(type(asset), 'version_id', return_value=10)
        version.accepted_by = baker.prepare(django_user_model)
        assert version.state == 'old'

        version_id_mock.return_value = 2
        assert version.state == 'current'


class TestExternalFile:
    @pytest.fixture(autouse=True)
    def setup(self):
        self.file = baker.prepare('ExternalFile')

    def test_file(self):
        file = self.file._meta.get_field('file')
        assert file.upload_to == rename_file
        assert type(file.storage) is MediaStorage
        assert file.max_length == 1000

    def test_md5(self):
        md5 = self.file._meta.get_field('md5')
        assert md5.max_length == 32
        assert not md5.blank
        assert md5.unique

    def test_size(self):
        size = self.file._meta.get_field('size')
        assert size.default == 0.0

    def test_asset_ds_pair(self):
        asset_ds_pair = self.file._meta.get_field('asset_ds_pair')
        assert asset_ds_pair.related_model == AssetDsPair
        assert asset_ds_pair.default is None
        assert asset_ds_pair.blank

    def test_str(self, mocker):
        external_file = baker.prepare('ExternalFile')
        external_file.file = mocker.MagicMock()
        external_file.file.name = 'test'
        assert str(external_file) == 'test'

    @pytest.fixture()
    def saved_ext_file(self, db, mocker):
        return baker.make('ExternalFile')

    @pytest.fixture()
    def saved_asset(self, db, asset_type_factory):
        return baker.make('Asset', asset_type=asset_type_factory(AssetType.ASSET_TYPES.integration), name='test')

    def test_delete_no_args(self, saved_ext_file):
        saved_ext_file.delete()
        assert not ExternalFile.objects.filter(id=saved_ext_file.id).exists()

    @pytest.fixture()
    def ext_file_with_file(self, saved_asset, saved_ext_file, mocker):
        self.pair = baker.make('AssetDsPair', asset=saved_asset, data_structure=baker.make('DataStructure', name='test_ds'))
        saved_ext_file.asset_ds_pair.add(self.pair)
        saved_ext_file.file = ContentFile(b'test_file', name='mock_file.txt')
        mocker.patch('django.core.files.storage.Storage.save', return_value='test_ds')
        saved_ext_file.save()
        return saved_ext_file

    def test_delete_one_pair(self, ext_file_with_file):
        ext_file_with_file.delete(asset_ds_pair=self.pair)
        assert not ExternalFile.objects.filter(id=ext_file_with_file.id).exists()

    def test_delete_more_pairs(self, ext_file_with_file, saved_asset):
        ext_file_with_file.asset_ds_pair.add(
            baker.make('AssetDsPair', asset=saved_asset, data_structure=baker.make('DataStructure', name='test_ds2'))
        )
        ext_file_with_file.delete(asset_ds_pair=self.pair)
        assert ExternalFile.objects.filter(id=ext_file_with_file.id).exists()


class TestDataRecord:
    @pytest.fixture(autouse=True)
    def setup(self):
        self.dr = baker.prepare('DataRecord')

    def test_data_structure(self):
        ds = self.dr._meta.get_field('data_structure')
        assert ds.related_model == DataStructure

    def test_asset(self):
        asset = self.dr._meta.get_field('asset')
        assert asset.related_model == Asset
        assert asset.default is None
        assert asset.null

    def test_language(self):
        language = self.dr._meta.get_field('language')
        assert language.related_model == Language
        assert language.null
        assert language.blank

    def test_customization(self):
        cust = self.dr._meta.get_field('customization')
        assert cust.related_model == Customization
        assert cust.default is None
        assert cust.blank
        assert cust.null

    def test_version(self):
        version = self.dr._meta.get_field('version')
        assert version.related_model == ContentVersion
        assert version.null
        assert version.blank

    def test_created_date(self):
        created_date = self.dr._meta.get_field('created_date')
        assert created_date.auto_now_add

    def test_created_by(self, django_user_model):
        created_by = self.dr._meta.get_field('created_by')
        assert created_by.related_model == django_user_model
        assert created_by.null
        assert created_by.blank
        assert created_by.related_query_name() == 'created_datarecord'

    def test_value(self):
        value = self.dr._meta.get_field('value')
        assert value.default == ''
        assert value.blank

    def test_external_file(self):
        ext_file = self.dr._meta.get_field('external_file')
        assert ext_file.related_model == ExternalFile
        assert ext_file.default is None
        assert ext_file.blank
        assert ext_file.null

    def test_str(self):
        self.dr.value = 'test'
        assert str(self.dr) == 'test'

    def test_short_description(self):
        self.dr.value = 'a' * 500
        assert self.dr.short_description == 'a' * 99 + '…'

    def test_context(self):
        context = baker.prepare('Context')
        self.dr.data_structure = baker.prepare('DataStructure', context=context)
        assert self.dr.context == context

    def test_get_data_structure_with_name(self):
        self.dr.language = baker.prepare('Language', code='nx_US')
        self.dr.data_structure = baker.prepare('DataStructure', name='test_ds', context=baker.prepare('Context', name='test_context'))
        assert self.dr.get_data_structure_with_name == 'test_context-test_ds-nx_US'

    def test_cast_value(self, mocker):
        ds_cast_value_mock = mocker.patch.object(self.dr.data_structure, 'cast_value', return_value='test')
        assert self.dr.cast_value == 'test'
        ds_cast_value_mock.asset_called_with(self.dr.data_structure, self.dr.value)

class TestMaintenanceSchedulingAndCompletion:
    def test_save_scheduling_with_message(self, db):
        expected_message = str(uuid4())
        start_date = datetime.now()
        ms = baker.make(MaintenanceScheduling, user_message=expected_message, datetime=start_date)
        assert ms.portal_notification
        assert ms.portal_notification.body == expected_message
        assert ms.portal_notification.min_ts == start_date
        assert ms.portal_notification.max_ts == start_date + timedelta(weeks=1)

    def test_save_scheduling_without_message(self, db):
        start_date = datetime.now()
        ms = baker.make(MaintenanceScheduling, user_message='', datetime=start_date)
        assert not ms.portal_notification

    def test_maintenance_and_notification_relations(self, db):
        start = datetime.now()
        end = start + timedelta(weeks=1)
        completion = start + timedelta(days=3)

        ms = baker.make(MaintenanceScheduling, datetime=start)

        # Maintenance Scheduling should have correct initial max_ts
        assert ms.portal_notification.max_ts == end

        mc = baker.make(MaintenanceCompletion, scheduled_maintenance=ms, datetime=completion)

        # Assert that correct maintenance to notification relationships
        assert ms.portal_notification.body == ms.user_message
        assert ms.portal_notification.title == MaintenanceScheduling.MESSAGE_TITLE
        assert mc.portal_notification.body == ms.user_message
        assert mc.portal_notification.title == MaintenanceCompletion.MESSAGE_TITLE
        assert mc.scheduled_maintenance == ms
        assert ms.portal_notification.max_ts == mc.portal_notification.min_ts
        assert  mc.portal_notification.max_ts == (completion + timedelta(weeks=1))

        ms_id = ms.id
        ms_notification_id = ms.portal_notification.id
        mc_id = mc.id
        mc_notification_id = mc.portal_notification.id
        ms.user_message = ''
        ms.save()

        # Portal notifications should be cleaned up when no message
        assert not PortalNotification.objects.filter(id=ms_notification_id).first()
        assert not PortalNotification.objects.filter(id=mc_notification_id).first()
        assert not MaintenanceScheduling.objects.filter(id=ms_id).first().portal_notification
        assert not MaintenanceCompletion.objects.filter(id=mc_id).first().portal_notification

    class TestPortalNotification:
        def generate_version(self):
            as_float = PortalNotification.calc_build(f'{randint(1, 100)}.{randint(1, 100)}.{randint(1, 100)}.{randint(1, 99999)}1')
            return as_float, PortalNotification.parse_build(as_float)

        def test_initializes_with_correct_build(self, db):
            expected_raw_build, build = self.generate_version()
            portal_notification = baker.make(PortalNotification, build=build)
            assert portal_notification.build_raw == expected_raw_build

        def test_parse_build(self):
            raw_build, expected_build = self.generate_version()
            assert PortalNotification.parse_build(raw_build) == expected_build

        def test_calc_build(self):
            expected_raw_build, build = self.generate_version()
            assert PortalNotification.calc_build(build) == expected_raw_build

        def test_get_serialized(self, db):
            _, build = self.generate_version()
            portal_notification = baker.make(PortalNotification, build=build)
            assert portal_notification.get_serialized() == {
                'title': portal_notification.title,
                'id': portal_notification.id,
                'body': portal_notification.body,
                'url': portal_notification.url,
                'build': portal_notification.build,
            }

        def test_build_property(self, db):
            initial_raw_build, initial_build = self.generate_version()
            updated_raw_build, updated_build = self.generate_version()

            portal_notification = baker.make(PortalNotification, build=initial_build)

            # Should have correct build and raw build
            assert portal_notification.build == initial_build
            assert portal_notification.build_raw == initial_raw_build

            # Should correctly update raw build when build is updated
            portal_notification.build = updated_build
            assert portal_notification.build == updated_build
            assert portal_notification.build_raw == updated_raw_build

class TestReadOnlyAPI:
    @pytest.fixture(autouse=True)
    def setup(self):
        self.version = str(uuid4())
        self.name = str(uuid4())
        self.model = baker.prepare(ReadOnlyAPI, version=self.version, name=self.name)

    def test_str(self):
        assert str(self.model) == f"{self.name} - {self.version}"

    def test_name(self):
        name = self.model._meta.get_field('name')
        assert name.help_text == 'API display name'
        assert name.max_length == 36

    def test_version(self):
        version = self.model._meta.get_field('version')
        assert version.help_text == 'API version'
        assert version_validator in version.validators
        assert version.max_length == 13

    def test_type(self):
        type = self.model._meta.get_field('type')
        assert type.choices == ReadOnlyAPI.API_TYPES

    def test_enabled(self):
        enabled = self.model._meta.get_field('enabled')
        assert enabled.default == True

    def test_manifest(self):
        manifest = self.model._meta.get_field('manifest')
        assert manifest.help_text == 'Content manifest'


class TestReadOnlyAPIFile:
    @pytest.fixture(autouse=True)
    def setup(self, db):
        self.readonly_api_name = str(uuid4())
        self.readonly_api = baker.make(ReadOnlyAPI, name=self.readonly_api_name)
        self.file_count = 2
        self.readonly_api_files = baker.make(ReadOnlyAPIFile, _quantity=self.file_count, readonly_api=self.readonly_api)
        self.vars_substitutions = {
            "id": "%id%",
            "vmsName": "%vmsName%",
            "vmsId": "%vmsId%",
            "contact": {
                "licensingAddress": "%contact.licensingAddress%",
                "systemWebPages": {
                    "homePage": "%contact.systemWebPages.homePage%",
                }
            },
        }
        self.vms_content = '{"@customization.vmsName@":"@customization.contact.systemWebPages.homePage@", ' \
                           '"@notExisting@":"@advanced.NotExistingToo@"}'
        self.replaced_content = '{"%vmsName%":"%contact.systemWebPages.homePage%", ' \
                                '"@notExisting@":"@advanced.NotExistingToo@"}'

    def test_content(self):
        content = self.readonly_api_files[0]._meta.get_field('content')
        assert content.help_text == "File contents"

    def test_filename(self):
        filename = self.readonly_api_files[0]._meta.get_field('filename')
        assert filename.max_length == 46

    def test_type(self):
        type = self.readonly_api_files[0]._meta.get_field('type')
        assert type.choices == ReadOnlyAPIFile.FILE_TYPES

    def test_readonly_api_has_files(self):
        assert len(ReadOnlyAPIFile.objects.filter(readonly_api=self.readonly_api)) == self.file_count

    def make_model_with_invalid_json(self, file_type):
        invalid_json = str(uuid4())
        return baker.prepare(ReadOnlyAPIFile, content=invalid_json, type=file_type)

    def test_clean_raises_validation_error(self):
        readonlyfile = self.make_model_with_invalid_json(ReadOnlyAPIFile.FILE_TYPES.json)

        with pytest.raises(ValidationError):
            readonlyfile.clean()

    def test_clean_does_not_raise_validation_error(self):
        non_json_types = [ReadOnlyAPIFile.FILE_TYPES.preamble_markdown, ReadOnlyAPIFile.FILE_TYPES.changelog_markdown]
        for type in non_json_types:
            readonlyfile = self.make_model_with_invalid_json(type)

            try:
                readonlyfile.clean()
            except ValidationError:
                pytest.fail('Unexpected Validation error')

    def test_validate_unique(self):
        unique_types = [ReadOnlyAPIFile.FILE_TYPES.preamble_markdown, ReadOnlyAPIFile.FILE_TYPES.changelog_markdown]
        file_type = choice(unique_types)
        first_readonly = baker.make(ReadOnlyAPIFile, type=file_type, readonly_api=self.readonly_api)
        first_readonly.save()
        second_readonly = baker.make(ReadOnlyAPIFile, type=file_type, readonly_api=self.readonly_api)
        with pytest.raises(ValidationError):
            second_readonly.validate_unique(self)

    def test_vars_replacement(self):
        assert vms_vars_replacement(self.vms_content, self.vars_substitutions) == self.replaced_content

    def test_vars_replacement_on_save(self, default_customization, default_portal):
        customization_ctx.set(default_customization.name)
        ctx = baker.make(Context, asset_type=get_asset_type(AssetType.ASSET_TYPES.vms), name="General information")
        template = baker.make(ContextTemplate, context=ctx, template=json.dumps(self.vars_substitutions))
        api_file = baker.make(ReadOnlyAPIFile, content=self.vms_content,
                              readonly_api=self.readonly_api,
                              filename='openapi_v1.json')
        api_file.save()
        api_file.clean()
        assert api_file.content == self.replaced_content

class TestDataStructure:
    @pytest.fixture(autouse=True)
    def setup(self):
        self.ds: DataStructure = baker.prepare('DataStructure')
        caches["assets_values"].clear()

    def test_str(self):
        name = 'nice data structure'
        self.ds.name = name
        assert str(self.ds) == name

    def test_is_protected_true(self, mocker):
        asset = mocker.MagicMock()
        asset.version_id.return_value = 4
        self.ds.protected = True
        assert self.ds.is_protected(asset)

    def test_is_protected_false(self, mocker):
        asset = mocker.MagicMock()

        # Not accepted version
        asset.version_id.return_value = 0
        self.ds.protected = True
        assert not self.ds.is_protected(asset)

        # Not protected
        asset.version_id.return_value = 4
        self.ds.protected = False
        assert not self.ds.is_protected(asset)

        # Not protected and not accepted version
        asset.version_id.return_value = 0
        self.ds.protected = False
        assert not self.ds.is_protected(asset)

    def test_cast_value_check_box(self):
        self.ds.type = DataStructure.DATA_TYPES.check_box
        assert DataStructure.cast_value(self.ds, 'True') is True
        assert DataStructure.cast_value(self.ds, 'False') is False

    def test_cast_value_integer(self):
        self.ds.type = DataStructure.DATA_TYPES.integer
        assert DataStructure.cast_value(self.ds, '') == 0
        assert DataStructure.cast_value(self.ds, '0') == 0
        assert DataStructure.cast_value(self.ds, '5') == 5

    def test_cast_value_object(self):
        self.ds.type = DataStructure.DATA_TYPES.object

        assert DataStructure.cast_value(self.ds, '') == {}
        assert DataStructure.cast_value(self.ds, '{}') == {}

        obj = {'key': 2}
        obj_str = json.dumps(obj)
        assert DataStructure.cast_value(self.ds, obj_str) == obj

    def test_cast_value_array(self):
        self.ds.type = DataStructure.DATA_TYPES.array

        assert DataStructure.cast_value(self.ds, '') == []
        assert DataStructure.cast_value(self.ds, '[]') == []

        arr = ['el1', 'el2']
        arr_str = json.dumps(arr)
        assert DataStructure.cast_value(self.ds, arr_str) == arr

    def test_cast_value_multiselect_array(self):
        self.ds.type = DataStructure.DATA_TYPES.multiselect
        self.ds.meta_settings['options'] = ['opt1', 'opt2', 'opt3']

        assert DataStructure.cast_value(self.ds, '') == []
        assert DataStructure.cast_value(self.ds, '[]') == []
        opts = ['opt2', 'opt3']
        opts_str = json.dumps(opts)
        assert DataStructure.cast_value(self.ds, opts_str) == opts

    def test_cast_value_multiselect_dict(self):
        self.ds.type = DataStructure.DATA_TYPES.multiselect
        self.ds.meta_settings['options'] = [
            {'id': 'id1', 'label': 'val1'},
            {'id': 'id2', 'label': 'val2'},
            {'id': 'id3', 'label': 'val3'}
        ]

        assert DataStructure.cast_value(self.ds, '') == []
        assert DataStructure.cast_value(self.ds, '[]') == []

        opts = ['val1', 'val3']
        opts_str = json.dumps(opts)

        assert DataStructure.cast_value(self.ds, opts_str) == [
            {'id': 'id1', 'label': 'val1'},
            {'id': 'id3', 'label': 'val3'}
        ]

    def test_cast_value_other(self):
        self.ds.type = DataStructure.DATA_TYPES.text
        assert DataStructure.cast_value(self.ds, '') == ''
        assert DataStructure.cast_value(self.ds, 'some str') == 'some str'

    # TODO: FAV functions are too complex to properly unit test now.
    # Refactor into smaller units for better coverage and easier mocking.

    @pytest.fixture()
    def setup_accepted_review(self, default_customization, asset_type_factory):
        integration_type = asset_type_factory(AssetType.ASSET_TYPES.integration)
        asset: Asset = baker.make('Asset', customizations=[default_customization], asset_type=integration_type)
        version: ContentVersion = baker.make('ContentVersion', asset=asset)
        review: AssetCustomizationReview = baker.make('AssetCustomizationReview', version=version,
                                                      customization=default_customization,
                                                      state=AssetCustomizationReview.REVIEW_STATES.accepted)
        return asset, version, review

    def test_find_actual_value(self, setup_accepted_review):
        asset, version, review = setup_accepted_review
        ds: DataStructure = baker.make(
            'DataStructure', type=DataStructure.DATA_TYPES.text, default='default text', translatable=False
        )

        # Test default value
        assert ds.find_actual_value(asset) == ds.default

        dr = baker.make('DataRecord', data_structure=ds, version=version, value='new value', asset=asset)
        assert ds.find_actual_value(asset, use_cached=True) == dr.value
        assert ds.find_actual_value(asset, use_cached=False) == dr.value

    def test_find_actual_values(self, setup_accepted_review):
        # Find actual value requires for customization contextvar.
        customization_ctx.set(settings.TEST_CUSTOMIZATION)
        asset, version, review = setup_accepted_review
        ctx = baker.make('Context', asset_type=asset.asset_type, name="TEST CONTEXT", translatable=False)
        data_structures = baker.make(
            'DataStructure', type=DataStructure.DATA_TYPES.text, default='default text', translatable=False,
            _quantity=3, name=seq('%ds_', suffix='%'), context=ctx
        )

        for idx, ds in enumerate(data_structures):
            baker.make('DataRecord', version=version, data_structure=ds, asset=asset, value=f'val_{idx + 1}')

        values = DataStructure.find_actual_values(data_structures, asset)
        for idx, ds in enumerate(data_structures):
            assert values[ds] == f'val_{idx + 1}'

        assert len(values) == len(data_structures)

        cached_values = AssetCacheLoaderBase.get_values(asset=asset, datastructures=data_structures)
        for idx, ds in enumerate(data_structures):
            assert cached_values[ds] == f'val_{idx + 1}'
        assert len(cached_values) == len(data_structures)

    def test_to_string_str(self):
        ds = baker.prepare('DataStructure')
        value = 'test str'
        assert DataStructure.to_string(ds, value) == value

    def test_to_string_json(self):
        ds = baker.prepare('DataStructure', type=DataStructure.DATA_TYPES.array)
        value = ["array", "here"]
        assert DataStructure.to_string(ds, value) == '["array", "here"]'

    def test_to_string_other(self):
        ds = baker.prepare('DataStructure', type=DataStructure.DATA_TYPES.integer)
        value = 5
        assert DataStructure.to_string(ds, value) == '5'

    def test_get_type_by_name(self):
        assert DataStructure.get_type_by_name('text') == DataStructure.DATA_TYPES.text
        assert DataStructure.get_type_by_name('Text') == DataStructure.DATA_TYPES.text
        assert DataStructure.get_type_by_name('External File') == DataStructure.DATA_TYPES.external_file
        assert DataStructure.get_type_by_name('Nonexistant type') == DataStructure.DATA_TYPES.text

    def test_is_file_or_image(self):
        assert not DataStructure.is_file_or_image('text')
        assert DataStructure.is_file_or_image('image')
        assert DataStructure.is_file_or_image('file')
        assert not DataStructure.is_file_or_image(DataStructure.DATA_TYPES.text)
        assert DataStructure.is_file_or_image(DataStructure.DATA_TYPES.image)
        assert DataStructure.is_file_or_image(DataStructure.DATA_TYPES.file)

    def test_is_string(self):
        for typ in ['text', 'long_text', 'guid', 'html', 'select']:
            assert DataStructure.is_string(getattr(DataStructure.DATA_TYPES, typ))

        assert not DataStructure.is_string(DataStructure.DATA_TYPES.check_box)

    def test_is_image(self):
        ds: DataStructure = baker.prepare(DataStructure)
        ds.type = DataStructure.DATA_TYPES.image
        assert ds.is_image
        ds.type = DataStructure.DATA_TYPES.external_image
        assert ds.is_image
        ds.type = DataStructure.DATA_TYPES.file
        assert not ds.is_image

    def test_has_image_field(self):
        ds: DataStructure = baker.prepare(DataStructure, type=DataStructure.DATA_TYPES.image)
        assert ds.has_image_field

    def test_has_file_field(self):
        ds: DataStructure = baker.prepare(DataStructure)
        ds.type = DataStructure.DATA_TYPES.file
        assert ds.has_file_field
        ds.type = DataStructure.DATA_TYPES.external_image
        assert ds.has_file_field
        ds.type = DataStructure.DATA_TYPES.external_file
        assert ds.has_file_field


class TestGetReviewsByType:
    @pytest.fixture(autouse=True)
    def setup(self, db, asset_type_factory, default_customization):
        self.agreement_asset_type = asset_type_factory(AssetType.ASSET_TYPES.agreement)
        self.ctx, self.ds_type, self.ds_grace_period = make_agreement_ds()
        self.customization = default_customization

    def make_review(self, version):
        return make_test_review(self.customization, version)
    
    def get_random_agreement_type_excluding_current(self, exclude_type):
        all_types = [value for name, value in AgreementTypes.__dict__.items() if not name.startswith('__') and name != exclude_type]
        return choice(all_types)

    def set_type(self, agreement, agreement_type=AgreementTypes.contributor):

        version = make_test_version_with_records(agreement, agreement_type=agreement_type)
        review = self.make_review(version)
        return version, review

    def set_grace_period(self, agreement, grace_period=5):
        version = make_test_version_with_records(agreement, grace_period=grace_period)
        review = self.make_review(version)
        return version, review

    @pytest.mark.parametrize("agreement_type", [
                (AgreementTypes.tos),
                (AgreementTypes.contributor),
                (AgreementTypes.cookie)
            ])
    def test_without_any_reviews(self, agreement_type):
        reviews = get_reviews_by_type(agreement_type, self.customization.name)
        assert reviews.count() == 0

    @pytest.mark.parametrize("agreement_type", [
            (AgreementTypes.tos),
            (AgreementTypes.contributor),
            (AgreementTypes.cookie)
        ])
    def test_get_reviews_by_type(self, agreement_type):
        agreement_1 = make_test_agreement(self.customization)
        agreement_2 = make_test_agreement(self.customization)
        agreement_3 = make_test_agreement(self.customization)

        # test without reviews
        reviews = get_reviews_by_type(agreement_type, self.customization.name)
        assert reviews.count() == 0
        # test with a single review of current type
        version_1, review_1 = self.set_type(agreement_1, agreement_type)
        reviews = get_reviews_by_type(agreement_type, self.customization.name)
        assert reviews.count() == 1
        assert reviews.last().id == review_1.id
        assert reviews.last().version.id == version_1.id
        assert reviews.last().version.asset.id == agreement_1.id

        # test with two reviews of different types
        version_2, review_2 = self.set_type(agreement_2, self.get_random_agreement_type_excluding_current(agreement_type))
        reviews = get_reviews_by_type(agreement_type, self.customization.name)
        assert reviews.count() == 1
        assert reviews.last().id == review_1.id
        assert reviews.last().version.id == version_1.id
        assert reviews.last().version.asset.id == agreement_1.id

        # setting agreements 2, 3 to current type, latest 3
        version_2, review_2 = self.set_type(agreement_2, agreement_type)
        version_3, review_3 = self.set_type(agreement_3, agreement_type)

        reviews = get_reviews_by_type(agreement_type, self.customization.name)
        assert reviews.count() == 4
        assert reviews.last().id == review_3.id
        assert reviews.last().version.id == version_3.id
        assert reviews.last().version.asset.id == agreement_3.id

        # changing agreement_3 to another type, latest TOS is agreement_2
        version_3, review_3 = self.set_type(agreement_3, self.get_random_agreement_type_excluding_current(agreement_type))
        reviews = get_reviews_by_type(agreement_type, self.customization.name)
        assert reviews.count() == 3
        assert reviews.last().id == review_2.id
        assert reviews.last().version.id == version_2.id
        assert reviews.last().version.asset.id == agreement_2.id

        # change grace period. latest current type is agreement_1
        version_1, review_1 = self.set_grace_period(agreement_1)
        reviews = get_reviews_by_type(agreement_type, self.customization.name)
        assert reviews.count() == 4
        assert reviews.last().id == review_1.id
        assert reviews.last().version.id == version_1.id
        assert reviews.last().version.asset.id == agreement_1.id


class TestBetaPermissions:
    @pytest.fixture(autouse=True)
    def setup(self, arf, db, default_portal):
        self.request = arf.get('/')
        self.request.META = self.request.session = {}
        self.access_developers = FLAGS.access_developers
        self.access_integration_store = FLAGS.access_integration_store
        access_developers_permission, _ = Permission.objects.get_or_create(codename='access_developers',
                                                                           name='Name test beta developers',
                                                                           content_type=ContentType.objects.all().first())
        self.access_developers_group, _ = Group.objects.get_or_create(name='access_developers')
        self.access_developers_group.permissions.add(access_developers_permission)
        self.access_developers_group.save()
        self.user_group_asset, _ = UserGroupsToAssetPermissions.objects.get_or_create(
            asset=default_portal, group=self.access_developers_group
        )
        self.access_developers_flag = Flag.objects.get(name=self.access_developers)
        self.access_developers_flag.groups.add(self.access_developers_group)
        self.access_developers_flag.save()
        waffle.utils.get_cache().clear()

    def test_superuser_flag_active(self, superuser):
        self.request.user = superuser
        assert waffle.flag_is_active(self.request, self.access_developers)
        assert waffle.flag_is_active(self.request, self.access_integration_store)

    def test_regular_user_flag_inactive(self, active_user):
        self.request.user = active_user
        assert waffle.flag_is_active(self.request, self.access_developers) is False
        assert waffle.flag_is_active(self.request, self.access_integration_store) is False

    def test_regular_user_with_group(self, active_user, default_customization, default_portal):
        active_user.groups.add(self.access_developers_group)
        self.request.user = active_user
        assert waffle.flag_is_active(self.request, self.access_developers) is True
        assert waffle.flag_is_active(self.request, self.access_integration_store) is False
        active_user.groups.remove(self.access_developers_group)
        assert waffle.flag_is_active(self.request, self.access_developers) is False

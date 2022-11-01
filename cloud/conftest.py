from typing import Iterable

import os
import json
from uuid import uuid4
import pytest
from random import randint
import model_bakery
from model_bakery import baker

from api.tests.utils import NxTestClient, NxAPIClient, MockCache
from cms.controllers.structure import read_structure_json
from cms.models import *
from api.models import Account

from rest_framework.test import APIRequestFactory
from rest_framework.test import APIClient
from django_mock_queries.query import MockSet


class BaseModelTest:
    @pytest.fixture()
    def instance(self, get_instance):
        return get_instance(self.model_class)

    @pytest.fixture()
    def get_instance(self, db):
        def _get_instance(model_class=self.model_class, **kwargs):
            assert getattr(self, 'model_class')
            return baker.prepare(model_class, **kwargs)

        return _get_instance

    def test_check_meta(self):
        assert getattr(self, 'expected_meta')
        check_against_expected_meta(self.model_class, self.expected_meta)


def generateJSON():
    return json.dumps({
        str(uuid4()): str(uuid4()),
        str(uuid4()): [str(uuid4()) for _ in range(randint(1, 20))]
    })


def generate_uuids(amount):
    return [str(uuid4()) for _ in range(amount)]


baker.generators.add('jsonfield.fields.JSONField', 'conftest.generateJSON')


@pytest.fixture(scope='session')
def django_db_setup(django_db_setup, django_db_blocker, django_db_createdb, django_db_keepdb):
    with django_db_blocker.unblock():
        if django_db_createdb:
            read_structure_json()
        eng = Language.objects.get_or_create(name='English', code='en_US')[0]
        Customization.objects.get_or_create(
            name='default', default_language=eng)


@pytest.fixture(autouse=True)
def set_settings(settings):
    settings.TESTING = True
    settings.USE_ASYNC_QUEUE = False


@pytest.fixture()
def arf():
    return APIRequestFactory()


@pytest.fixture()
def api_client():
    return NxAPIClient()


@pytest.fixture
def superuser(django_user_model, db):
    return django_user_model.objects.get_or_create(email='auto_superuser@networkoptix.com', is_superuser=True, is_staff=True)[0]


@pytest.fixture
def temp_superuser(django_user_model):
    return django_user_model(email='temp_superuser@networkoptix.com', is_superuser=True, is_staff=True)


@pytest.fixture()
def client():
    return NxTestClient()


@pytest.fixture
def admin_client(db, superuser):
    client = NxTestClient()
    client.force_login(superuser)
    return client


@pytest.fixture
def authenticated_client(django_user_model, client, db):
    def _authenticated_client(email):
        user = django_user_model.objects.get_or_create(email=email)[0]
        client.force_login(user)
    return _authenticated_client


@pytest.fixture
def english_language(db):
    return Language.objects.get_or_create(name='English', code='en_US')[0]


@pytest.fixture()
def default_customization(english_language, db):
    cust, created = Customization.objects.get_or_create(
        name='default', default_language=english_language)
    cust.languages.add(english_language)
    return cust


@pytest.fixture
def cloud_portal_type(db):
    return AssetType.get_model_by_type(AssetType.ASSET_TYPES.cloud_portal)


@pytest.fixture
def default_portal(default_customization, cloud_portal_type, db):
    return Asset.objects.filter(asset_type=cloud_portal_type, customizations=default_customization).first()


@pytest.fixture()
def other_customization(english_language, db):
    return Customization.objects.get_or_create(name='other', default_language=english_language)[0]


@pytest.fixture()
def other_portal(other_customization, cloud_portal_type, db):
    return Asset.objects.filter(customizations=other_customization, asset_type=cloud_portal_type).first()


@pytest.fixture
def active_user(db, django_user_model):
    return django_user_model.objects.create(email='active_user@fixture.com', is_active=True)


@pytest.fixture
def mock_cloud_portal_customization_cache(mocker):
    def handler(target: str = '', **kwargs):
        """Patch cloud_portal_customization_cache

        Args:
            target (str): target module to patch (ex: 'api.views.storage')
            **kwargs: values that make up return dict of function call

        Returns:
            None
        """
        return mocker.patch(
            f'{target}.cloud_portal_customization_cache' if target else 'cms.models.cloud_portal_customization_cache',
            return_value=kwargs
        )

    return handler


@pytest.fixture(scope="session")
def asset_factory():
    def generate_mock_assets(name="test", qty=1, state=AssetCustomizationReview.REVIEW_STATES.accepted, customization_name='default', asset_type=AssetType.ASSET_TYPES.integration, account=None, draft=False, write_db=True):
        """Useful for generating mock assets for testing. Current implementation works well for integrations, some changes might need to be made to use with other asset types.

        Args:
            name (str, optional): Asset Title. Defaults to "test".
            qty (int, optional): Number of assets to generate. Defaults to 1.
            state ([type], optional): Review State. Defaults to AssetCustomizationReview.REVIEW_STATES.accepted.
            customization_name (str, optional): Customization. Defaults to 'default'.
            asset_type ([type], optional): Asset Type. Defaults to AssetType.ASSET_TYPES.integration.
            account ([type], optional): User Account. Defaults to None.
            draft (bool, optional): Draft. Defaults to False.

        Yields:
            Asset: With asset type and name from asset_type and name kwargs
        """
        language = get_language()
        customization = get_customization(customization_name)
        customization.languages.add(language)
        accepted = state == AssetCustomizationReview.REVIEW_STATES.accepted
        create_asset = baker.make if write_db else baker.prepare
        for asset_copy in range(qty):
            asset = create_asset(
                Asset, name=f"{name} - {asset_copy}", customizations=[customization], asset_type=get_asset_type(asset_type))
            accepted_date = datetime.now() if accepted else None
            accepted_by = account if accepted else None
            version = create_asset(
                ContentVersion, asset=asset, customization=customization, created_by=account, accepted_date=accepted_date, accepted_by=accepted_by)
            if not draft:
                create_asset(AssetCustomizationReview,
                             customization=customization, version=version)
            if accepted:
                reviews = AssetCustomizationReview.objects.filter(
                    version__asset=asset)
                for review in reviews:
                    review.update_state(
                        account, AssetCustomizationReview.REVIEW_STATES.accepted)

            yield asset
    return generate_mock_assets


@pytest.fixture(scope="session")
def account_factory():
    def get_account(email='super@user.com', is_superuser=True, customization_name='default', prepare_only=False, **kwargs):
        """Gets existing Account or creates new.

        Args:
            email (str, optional): Account Email. Defaults to 'py@test.com'.
            is_superuser (bool, optional): Is Superuser account. Defaults to True.

        Returns:
            Account: Account with superuser value mocked
        """
        existing = baker.prepare(Account, email=email, is_superuser=is_superuser, customization=customization_name,
                                 **kwargs) if prepare_only else Account.objects.filter(email=email).first()
        account = existing or baker.make(
            Account, email=email, is_superuser=is_superuser, customization=customization_name, **kwargs)

        if existing:
            account.is_superuser = is_superuser
            if not prepare_only:
                account.save()

        return account
    return get_account


@pytest.fixture()
def asset_type_factory(db):
    return get_asset_type


def get_asset_type(type=AssetType.ASSET_TYPES.integration):
    """Gets existing AssetType or creates new.

    Args:
        type (int, optional): Value from AssetType.ASSET_TYPES. Defaults to AssetType.ASSET_TYPES.integration.

    Returns:
        AssetType: Instance of AssetType
    """
    return AssetType.objects.filter(type=type).first(
    ) or baker.make(AssetType, type=type)


@pytest.fixture(scope="session")
def customization_factory():
    return get_customization


def get_customization(name='default'):
    """Gets existing Customization or creates new.

    Args:
        name (str, optional): Customization Name. Defaults to 'default'.

    Returns:
        Customization: Instance of Customization
    """
    return Customization.objects.filter(name=name).first(
    ) or baker.make(Customization, name=name)


@pytest.fixture(scope="session")
def menu_factory():
    return get_menu


def get_menu(name='Test Menu', base_url='test', url='menu', menu_type=Menu.MENU_TYPES.docs_knowledgebase):
    """Gets existing Menu or creates new.

    Args:
        name (str, optional): Menu Name. Defaults to 'Test Menu'.
        base_url (str, optional): Base Url. Defaults to 'test'.
        url (str, optional): Url. Defaults to 'menu'.
        menu_type (str, optional): Menu Type. Defaults to 'Menu.MENU_TYPES.docs_knowledgebase'.

    Returns:
        Menu: Instance of Menu
    """
    return Menu.objects.filter(name=name, base_url=base_url, url=url, type=menu_type).first(
    ) or baker.make(Menu, name=name, base_url=base_url, url=url, type=menu_type, enabled=True)


@pytest.fixture(scope="session")
def asset_menu_node_factory():
    return get_asset_menu_node


def get_asset_menu_node(asset: Asset, enabled_customizations: Iterable[Customization] = [], parent_menu: Menu = None, parent_node: MenuNode = None):
    """Gets existing MenuNode w/ Asset or creates new.

    Args:
        asset (Asset): Asset. Asset to attach to node.
        enabled_customizations (Iterable[Customization], optional): Customizations List. Customizations enabled for node.
        parent_menu (Menu, optional): Parent Menu. Defaults to None.
        parent_node (MenuNode, optional): Parent Node. Defaults to None.

    Returns:
        Menu: Instance of MenuNode
    """
    existing_node = MenuNode.objects.filter(
        asset=asset, parent_menu=parent_menu, parent_node=parent_node).first()
    if existing_node:
        existing_node.enabled.add(*enabled_customizations)
    return existing_node or baker.make(MenuNode, asset=asset, parent_menu=parent_menu, parent_node=parent_node, enabled=enabled_customizations, name=asset.name)


@pytest.fixture(scope="session")
def language_factory():
    return get_language


def get_language(code='en_US', name='English (US)'):
    """Get existing Language or creates new

    Args:
        code (str, optional): Language Code. Defaults to 'en_US'.
        name (str, optional): Language Description. Defaults to 'English (US)'.

    Returns:
        Language: Instance of Language
    """
    return Language.objects.filter(code=code).first(
    ) or baker.make(Language, code=code, name=name)


@pytest.fixture()
def add_permission(db, cloud_portal_type):
    def _add_permission(user, codename):
        group = Group.objects.create(name=f'{user.email}_{codename}_auto',)
        group.options.all_assets = True
        group.options.save()
        UserGroupsToAssetType.objects.get_or_create(
            asset_type=cloud_portal_type, group=group)
        permission = Permission.objects.filter(codename=codename).first()
        if not permission:
            raise Exception('Permission not found')
        group.permissions.add(permission)
        user.groups.add(group)
        return user
    return _add_permission


@pytest.fixture(scope='session')
def bakery():
    return model_bakery


def check_meta_factory(target_class):
    def check_meta(field, attribute, expected):
        assert getattr(target_class._meta.get_field(field),
                       attribute, not expected) == expected

    return check_meta


def check_against_expected_meta(target_class, expected_meta):
    check_meta = check_meta_factory(target_class)
    for field, meta in expected_meta.items():
        for attribute, expected in meta.items():
            check_meta(field, attribute, expected)


@pytest.fixture
def mock_set():
    return MockSet


@pytest.fixture()
def disable_feature_flags(mocker):
    mocker.patch('waffle.flag_is_active', return_value=True)


@pytest.fixture()
def mock_cache(mocker):
    def _mock(target):
        dummy_cache = MockCache()
        cache_mock = mocker.patch(target)
        cache_mock.get.side_effect = dummy_cache.get
        cache_mock.set.side_effect = dummy_cache.set
        return cache_mock
    return _mock

@pytest.fixture()
def mock_session(mocker):
    def _mock_session(session_dict = None):
        if session_dict is None:
            session_dict = {}

        session_dict = {}
        session =  mocker.MagicMock()
        session.__getitem__.side_effect = session_dict.__getitem__
        session.__setitem__.side_effect = session_dict.__setitem__
        return session

    return _mock_session
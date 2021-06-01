import pytest

from api.tests.utils import NxTestClient, NxAPIClient
from cms.controllers.structure import read_structure_json
from cms.models import *

from rest_framework.test import APIRequestFactory


@pytest.fixture(scope='session')
def django_db_setup(django_db_setup, django_db_blocker, django_db_createdb, django_db_keepdb):
    with django_db_blocker.unblock():
        if django_db_createdb:
            read_structure_json()
        eng = Language.objects.get_or_create(name='English', code='en_US')[0]
        Customization.objects.get_or_create(name='default', default_language=eng)
        portal_type = AssetType.get_model_by_type(AssetType.ASSET_TYPES.documentation)
        Asset.objects.get_or_create(name='Nx Cloud', asset_type=portal_type)


@pytest.fixture(autouse=True)
def set_settings(settings):
    settings.TESTING = True
    for key, cache in settings.CACHES.items():
        cache['BACKEND'] = 'django.core.cache.backends.locmem.LocMemCache'


@pytest.fixture()
def arf():
    return APIRequestFactory()


@pytest.fixture()
def api_client():
    return NxAPIClient()


@pytest.fixture
def superuser(django_user_model, db):
    return django_user_model.objects.get_or_create(email='auto_superuser@networkoptix.com', is_superuser=True, is_staff=True)[0]


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
    return Customization.objects.get_or_create(name='default', default_language=english_language)[0]


@pytest.fixture
def cloud_portal_type(db):
    return AssetType.get_model_by_type(AssetType.ASSET_TYPES.cloud_portal)


@pytest.fixture
def default_portal(default_customization, cloud_portal_type, db):
    return Asset.objects.get_or_create(name='Nx Cloud', asset_type=cloud_portal_type)[0]


@pytest.fixture()
def other_customization(english_language, db):
    return Customization.objects.get_or_create(name='other', default_language=english_language)[0]


@pytest.fixture()
def other_portal(other_customization, cloud_portal_type, db):
    return Asset.objects.get_or_create(name='Other Cloud', asset_type=cloud_portal_type)[0]


@pytest.fixture
def active_user(db, django_user_model):
    return django_user_model.objects.create(email='active_user@fixture.com', is_active=True)


@pytest.fixture()
def add_permission(db, cloud_portal_type):
    def _add_permission(user, codename):
        group = Group.objects.create(name=f'{user.email}_{codename}_auto',)
        group.options.all_assets = True
        group.options.save()
        UserGroupsToAssetType.objects.get_or_create(asset_type=cloud_portal_type, group=group)
        permission = Permission.objects.filter(codename=codename).first()
        if not permission:
            raise Exception('Permission not found')
        group.permissions.add(permission)
        user.groups.add(group)
    return _add_permission

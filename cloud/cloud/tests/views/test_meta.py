import pytest
from uuid import uuid4
from django.conf import settings
from model_bakery import baker
from cloud.views.meta import check_redirect

from cms.models import AssetType, Customization, Menu, MenuNode


# TODO: Add unit tests as part of CLOUD-8391


def test_get_route_meta():
    pass


def test_register_meta_handler():
    pass


def test_get_integrations_meta():
    pass


def test_get_doc_meta():
    pass


def test_get_lang_meta():
    pass


def test_get_config_meta():
    pass


def test_get_meta():
    pass


def test_check_redirect(account_factory, asset_factory, mocker, db):
    expected_url, expected_base_url = [str(uuid4()) for _ in range(2)]
    customization = Customization.objects.filter(
        name=settings.CUSTOMIZATION).first()
    menu = baker.make(Menu, url=expected_url, base_url=expected_base_url)
    doc, doc_no_kb = asset_factory(asset_type=AssetType.ASSET_TYPES.documentation,
                                   qty=2, account=account_factory())
    menu_node = baker.make(MenuNode, parent_menu=menu, asset=doc)
    customization.enabled_nodes.add(menu_node)

    latest_route = f'/docs/{expected_base_url}/{expected_url}/{doc.urlify()}'

    # Don't redirect if latest route
    assert not check_redirect(mocker.MagicMock(path=latest_route))

    # Redirect changed slug
    route_old_slug = f'/docs/{expected_base_url}/{expected_url}/{doc.id}-{uuid4()}'
    assert check_redirect(mocker.MagicMock(
        path=route_old_slug)) == latest_route

    # Redirect changed kb
    route_old_kb = f'/docs/{uuid4()}/{uuid4()}/{doc.urlify()}'
    assert check_redirect(mocker.MagicMock(path=route_old_kb)) == latest_route

    # Redirect to content if article no longer attached to kb
    doc_no_kb_slug = doc_no_kb.urlify()
    route_non_kb = f'/docs/{uuid4()}/{uuid4()}/{doc_no_kb_slug}'
    generic_doc_route = f'/docs/content/{doc_no_kb_slug}'
    assert check_redirect(mocker.MagicMock(
        path=route_non_kb)) == generic_doc_route


def test_app_view():
    pass


def test_robots_txt():
    pass

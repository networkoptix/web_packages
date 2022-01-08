import pytest
from random import choice
from uuid import uuid4
from django.conf import settings
from django.contrib.auth.models import AnonymousUser
from model_bakery import baker
from cloud.views.meta import *

from cms.models import AssetType, Customization, Menu, MenuNode
from cms.tests.management.commands.test_read_structure import FileTest


def test_get_route_meta(mocker):
    path = [str(uuid4()) for _ in range(5)]
    _, *segments = path
    expected_return, *args = [str(uuid4()) for _ in range(5)]
    get_route_meta.handlers = [mocker.MagicMock(
        can_handle=lambda _: False) for _ in range(5)]
    matched_handler = choice(get_route_meta.handlers)
    matched_handler.can_handle = lambda _: True
    matched_handler.return_value = expected_return

    assert get_route_meta(path, *args) == expected_return
    matched_handler.assert_called_once_with(segments, *args)


def test_register_meta_handler(mocker):
    handled_route = str(uuid4())
    mock_function = mocker.MagicMock()

    register_meta_handler(handled_route)(mock_function)

    assert mock_function.route == f'/{handled_route}'
    assert mock_function.can_handle(handled_route)
    assert not mock_function.can_handle('other_route')


def test_get_integrations_meta(mocker, db):
    mock_integration = baker.make(Asset)
    path_title, lang, overview_video, screenshot, content_title, installation_instructions, short_description = [
        str(uuid4()) for _ in range(7)]
    mock_title = ' '.join(path_title.split('-'))
    mock_config_meta = {
        get_integrations_meta.route: {
            'title': mock_title
        }
    }
    mock_integration_content = {
        'information': {
            'title': content_title,
            'shortDescription': short_description
        },
        'overview': {
            'overviewVideo': overview_video
        },
        'instructions': {
            'instructionScreenshot1': screenshot
        }
    }
    path = [f'{mock_integration.id}-{path_title}', 'how-to-setup']
    mock_make_json = mocker.patch.object(
        integration, 'make_integrations_json', return_value=(mock_integration_content,))
    integration_meta = get_integrations_meta(
        path, None, lang, mock_config_meta, {})

    mock_make_json.assert_called_once_with([mock_integration], lang)
    expected_meta = {
        'title': mock_title,
        'type': 'article',
        'video': overview_video,
        'image': screenshot,
        'description': short_description
    }

    # Test with short description
    assert integration_meta == expected_meta

    # Test with installation instructions
    expected_meta['description'] = mock_integration_content['instructions']['installationInstructions'] = installation_instructions
    integration_meta = get_integrations_meta(
        path, None, lang, mock_config_meta, {})
    assert integration_meta == expected_meta


def test_get_doc_meta(mocker, db):
    base_url, menu_url, doc_title, doc_description, lang, menu_title, meta_title, menu_description = [
        str(uuid4()) for _ in range(8)]
    baker.make(Menu, base_url=base_url, url=menu_url, title=menu_title, short_description=menu_description)
    doc_asset_type = AssetType.objects.filter(
        type=AssetType.ASSET_TYPES.documentation).first()
    mock_doc = baker.make(Asset, asset_type=doc_asset_type)
    doc_slug = f'{mock_doc.id}-{doc_title}'
    path = [base_url, menu_url, doc_slug]
    mock_lang_meta = {
        get_doc_meta.route: {
            'title': meta_title
        }
    }

    # Test with meta from menu
    mock_doc_json = [{}]
    mock_generate_doc_json = mocker.patch.object(documentation, 'generate_doc_json', return_value=mock_doc_json)
    integration_meta = get_doc_meta(
        path, None, lang, mock_lang_meta, {})
    mock_generate_doc_json.assert_called_once_with([mock_doc], lang, trust_cache=True)
    assert integration_meta == {
        'title': f'{menu_title} - {meta_title}',
        'type': 'article',
        'description': menu_description
    }

    # Test with meta from doc
    mock_doc_json = [{
        'title': doc_title,
        'shortDescription': doc_description
    }]
    mock_generate_doc_json.return_value = mock_doc_json
    integration_meta = get_doc_meta(
        path, None, lang, mock_lang_meta, {})
    assert integration_meta == {
        'title': f'{doc_title} - {menu_title}',
        'type': 'article',
        'description': doc_description
    }

    # Test with partial from doc fallback to menu meta
    mock_doc_json = [{
        'title': doc_title
    }]
    mock_generate_doc_json.return_value = mock_doc_json
    integration_meta = get_doc_meta(
        path, None, lang, mock_lang_meta, {})
    assert integration_meta == {
        'title': f'{doc_title} - {menu_title}',
        'type': 'article',
        'description': menu_description
    }


def test_get_lang_meta(arf, db):
    url = str(uuid4())
    request = arf.get(url)
    request.user = AnonymousUser()
    request.session = {}
    expected_lang_meta = generate_expected_lang_meta()
    data = json.dumps({'metaDefaults': expected_lang_meta})

    with FileTest(content=data) as lang_path:
        lang_meta = get_lang_meta(request, lang_path=lang_path)
        assert lang_meta == expected_lang_meta


def generate_expected_lang_meta():
    return {
        str(uuid4()): str(uuid4())
        for _ in range(10)
    }


def test_get_config_meta(arf):
    url = str(uuid4())
    request = arf.get(url)
    request.user = AnonymousUser()
    request.session = {}
    image_prefix = 'http://testserver'
    file_content, expected_config_meta = generate_mock_config_meta(
        image_prefix)
    with FileTest(content=json.dumps(file_content)) as config_path:
        config_meta = get_config_meta(request, config_path=config_path)
        assert config_meta == expected_config_meta


def generate_mock_config_meta(image_prefix):
    file_content = {
        str(uuid4()) if index else 'default': {
            'image': str(uuid4())
        }
        for index in range(10)
    }
    expected_config_meta = {
        route: {
            'image': image_prefix + meta.get('image', '')
        }
        for route, meta in file_content.items()
    }

    return file_content, expected_config_meta


def test_get_meta(arf, mocker, db):
    url, title = [str(uuid4()) for _ in range(2)]
    request = arf.get(url)
    request.user = AnonymousUser()
    request.session = {}
    mock_route_meta = {}
    mock_lang_meta = {
        'default': {
            'title': title
        }
    }
    mocker.patch('cloud.views.meta.get_lang_meta', return_value=mock_lang_meta)
    image_prefix = 'http://testserver'
    file_content, expected_config_meta = generate_mock_config_meta(
        image_prefix)

    with FileTest(content=json.dumps(file_content)) as config_path:
        base_meta = {
            **expected_config_meta['default'],
            'title': title
        }

        mocker.patch('waffle.switch_is_active', return_value=True)
        mocker.patch('cloud.views.meta.get_route_meta',
                     return_value=mock_route_meta)

        meta = get_meta(request, config_path)

    expected_meta = {
        'title': title,
        'meta': [
            *sorted(base_meta.items()),
            ('url', request.build_absolute_uri(request.path))
        ]
    }
    assert meta == expected_meta


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


SHARE_AGENTS = ['facebookexternalhit/TEST', 'Facebot',
                'TwitterTEST', 'Pinterest', 'LinkedInTEST', 'LinkedInBot']


def iterate_agents(mocker, check_agent_callback):
    for switch_active in [True, False]:
        mocker.patch('waffle.switch_is_active', return_value=switch_active)

        for agent in [*SHARE_AGENTS, str(uuid4())]:
            check_agent_callback(agent, switch_active)


def test_app_view(arf, mocker):
    url = str(uuid4())
    request = arf.get(url)
    request.user = AnonymousUser()
    request.session = {}
    mock_context = {
        str(uuid4()): str(uuid4())
        for _ in range(5)
    }
    mocker.patch('cloud.views.meta.get_meta', return_value=mock_context)

    def check_app_view(agent, switch_active):
        def mock_render(template,  context=None):
            return template, context

        mocker.patch.object(shortcuts, 'render_to_response', mock_render)
        request.META['HTTP_USER_AGENT'] = agent
        mock_as_view = mocker.patch.object(TemplateView, 'as_view')
        res = app_view(request)
        if switch_active:
            if agent in SHARE_AGENTS:
                assert res == ('cms/sharing_meta.html', mock_context)
            else:
                mock_as_view.assert_called_once_with(
                    template_name='static/index.mustache.html', extra_context=mock_context)
                mock_as_view.return_value.assert_called_once_with(request)
        else:
            assert res == ('static/index.html', None)

    iterate_agents(mocker, check_app_view)

    redirect_path = str(uuid4())
    mock_redirect = mocker.patch.object(
        shortcuts, 'redirect', return_value=redirect_path)

    app_view(request)
    mock_redirect.assert_not_called()
    mocker.patch('cloud.views.meta.check_redirect', return_value=redirect_path)
    app_view(request)
    mock_redirect.assert_called_once_with(redirect_path, permanent=True)


def test_robots_txt(arf, mocker, db):
    url = str(uuid4())
    request = arf.get(url)
    request.user = AnonymousUser()
    request.session = {}

    def check_robots_txt(agent, switch_active):
        request.META['HTTP_USER_AGENT'] = agent
        res = robots_txt(request)
        lines = res.content.decode().split('\n')
        assert lines == ['# robotstxt.org', '', 'User-agent: *',
                         f'{"allow" if switch_active and agent in SHARE_AGENTS else "disallow"}: /']

    iterate_agents(mocker, check_robots_txt)

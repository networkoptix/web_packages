import json
import os
import re
from itertools import chain
from django.conf import settings
from django import shortcuts
from django.http import HttpResponse
from django.views.generic.base import TemplateView
import waffle

from cms.models import cloud_portal_customization_cache
from util.helpers import detect_language_by_request, get_customization
from cms.models import Menu, Asset, Language
from cms.controllers import documentation
from cms.controllers import integration
from cms.feature_flags import SWITCHES


def get_route_meta(path, *args):
    root, *segments = path

    handler = next((
        handler
        for handler in get_route_meta.handlers
        if handler.can_handle(root)
    ), lambda *_: {})

    return handler(segments, *args)


def register_meta_handler(root):
    def _for_route(func):
        get_route_meta.handlers = [
            *get_route_meta.handlers, func] if hasattr(get_route_meta, 'handlers') else [func]
        func.can_handle = lambda route: route == root
        func.route = f'/{root}'
        return func
    return _for_route


@register_meta_handler('integrations')
def get_integrations_meta(path, config, lang, config_meta, lang_meta):
    integration_slug, context, *_ = chain(path, [''] * 2)
    base_route_meta = {
        **config_meta.get(get_integrations_meta.route, {}),
        **lang_meta.get(get_integrations_meta.route, {})
    }

    title_segments = base_route_meta['title'].split(' - ')[::-1]

    if integration_id := integration_slug.split('-')[0]:
        integration_asset = Asset.objects.filter(id=integration_id).first()
        how_to_setup = context == 'how-to-setup'

        if integration_asset:
            base_route_meta['type'] = 'article'
            integration_content, = integration.make_integrations_json(
                [integration_asset], lang)

            information_content = integration_content.get('information', {})
            overview_content = integration_content.get('overview', {})
            instructions_content = integration_content.get('instructions', {})

            if overview_video := overview_content.get('overviewVideo'):
                base_route_meta['video'] = overview_video

            if how_to_setup and (screenshot := instructions_content.get('instructionScreenshot1')):
                base_route_meta['image'] = screenshot

            if title := information_content.get('name'):
                title_segments.append(title)

            if how_to_setup and (instructions := instructions_content.get('installationInstructions')):
                base_route_meta['description'] = instructions
            elif description := information_content.get('shortDescription'):
                base_route_meta['description'] = description

    base_route_meta['title'] = ' - '.join(
        title for title in title_segments[::-1][:2] if title)

    return base_route_meta


@register_meta_handler('docs')
def get_doc_meta(path, config, lang, config_meta, lang_meta):
    menu_base, menu_url, doc_slug, *_ = chain(path, [''] * 3)
    base_route_meta = {
        **config_meta.get(get_doc_meta.route, {}),
        **lang_meta.get(get_doc_meta.route, {})
    }

    title_segments = base_route_meta['title'].split(' - ')[::-1]

    if menu := Menu.objects.filter(base_url=menu_base, url=menu_url).first():
        title_segments.append(menu.title)
        base_route_meta['description'] = menu.short_description

    if doc_id := doc_slug.split('-')[0]:
        doc = Asset.objects.filter(id=doc_id).first()
        if doc:
            base_route_meta['type'] = 'article'
            doc_json = documentation.generate_doc_json(
                [doc], lang, trust_cache=True)

            if not doc_json:
                return base_route_meta

            doc_content = doc_json[0]

            if title := doc_content.get('title'):
                title_segments.append(title)

            if description := doc_content.get('shortDescription'):
                base_route_meta['description'] = description

    base_route_meta['title'] = ' - '.join(
        title for title in title_segments[::-1][:2] if title)

    return base_route_meta

# Not sure if we need custom meta for content route
# @register_meta_handler('content')
# def get_content_meta(path, config, lang, config_meta, lang_meta):
#     return {}


def get_lang_meta(request, lang_path=None):
    lang = detect_language_by_request(request)
    if not lang_path:
        lang_path = os.path.join(settings.STATIC_LOCATION, get_customization(request),
                                 'static', f'lang_{lang}', 'language_compiled.json')
    with open(lang_path) as file:
        return json.load(file)['metaDefaults']


def get_config_meta(request, config_path=None):
    if not config_path:
        config_path = os.path.join(
            settings.STATIC_LOCATION, get_customization(request), 'static', 'metaDefaults.json')
    is_secure = request.is_secure()
    host = request.get_host()
    base = f'http{"s" if is_secure else ""}://{host}'
    with open(config_path) as file:
        config_meta = json.load(file)

    for route in config_meta:
        image_path = config_meta[route].get('image', '')
        if image_path:
            config_meta[route]['image'] = base + image_path

    return config_meta


def get_meta(request, config_path=None):
    config = cloud_portal_customization_cache(get_customization(request))['config']
    lang = Language(code=detect_language_by_request(request))
    lang_meta = get_lang_meta(request)
    config_meta = get_config_meta(request, config_path)
    base_meta = {
        **lang_meta['default'],
        **config_meta['default'],
        'url': request.build_absolute_uri(request.path)
    }

    generated_meta = {
        **base_meta,
        **get_route_meta(
            request.path.split('/')[1:],
            config,
            lang,
            config_meta,
            lang_meta
        )
    }

    return {
        'title': generated_meta['title'],
        'meta': sorted(generated_meta.items())
    }


def check_redirect(request):
    if request.path == '/index.html':
        return

    doc_slug, url, _base_url, _base, *_ = chain(
        [segment for segment in request.path.split('/')[::-1] if segment],
        [''] * 4
    )

    base = _base or _base_url

    try:
        doc_id = int(doc_slug.split('-')[0])
    except ValueError:
        return

    if base != 'docs' or not doc_id or not (doc := Asset.objects.filter(id=doc_id).first()):
        return

    slug = doc.urlify()
    redirect_url = ''

    for node in doc.nodes.all():
        node_enabled = node.enabled_customizations.filter(
            name=get_customization(request)).exists()
        parent_menu = node.get_parent()

        if node_enabled and parent_menu and parent_menu.enabled:
            segments = ['docs', parent_menu.base_url, parent_menu.url, slug]
            current_menu_path = '/' + \
                '/'.join(segment for segment in segments if segment)

            if current_menu_path == request.path:
                return
            elif not redirect_url:
                redirect_url = current_menu_path

    return redirect_url or doc.last_modified and f'/docs/content/{slug}'


SHARE_CRAWLER_REGEX = r'^(facebookexternalhit\/(.*)|Facebot|Twitter(.*)|Pinterest|LinkedIn(.*)|LinkedInBot)$'


def app_view(request):
    if redirect_path := check_redirect(request):
        return shortcuts.redirect(redirect_path, permanent=True)

    if waffle.switch_is_active(SWITCHES.server_side_meta):
        context = get_meta(request)
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        open_graph_crawler = re.match(SHARE_CRAWLER_REGEX, user_agent)

        if open_graph_crawler:
            return shortcuts.render(request, "cms/sharing_meta.html", context)

        return TemplateView.as_view(
            template_name="static/index.mustache.html",
            extra_context=context)(request)

    return shortcuts.render(request, "static/index.html")


def robots_txt(request):
    user_agent = request.META.get('HTTP_USER_AGENT', '')
    open_graph_crawler = re.match(SHARE_CRAWLER_REGEX, user_agent)
    allow = waffle.switch_is_active(
        SWITCHES.server_side_meta) and open_graph_crawler
    lines = ['# robotstxt.org', '', 'User-agent: *',
             f'{"allow" if allow else "disallow"}: /']
    return HttpResponse('\n'.join(lines), content_type="text/plain")

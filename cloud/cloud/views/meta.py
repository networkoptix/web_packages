import json
import os
import re
from itertools import chain
import urllib
import logging

from asgiref.sync import async_to_sync
from django.conf import settings
from django import shortcuts
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.generic.base import TemplateView
import waffle

from cms.controllers.filldata import global_contexts_to_dict, ContextProcessor
from cms.models import cloud_portal_customization_cache, get_cloud_portal_asset, Context
from cms.controllers.static_files import get_template, TemplatesCache
from util.config import get_cloud_portal_url, get_cloud_db_url
from util.helpers import detect_language_by_request
from cms.models import Menu, Asset, Language
from cms.controllers import documentation
from cms.controllers import integration
from cms.feature_flags.feature_flags import SWITCHES

logger = logging.getLogger(__name__)

# Static language file is always places in skin directory
STATIC_LANG_PATH = os.path.join(
    settings.STATIC_LOCATION, '_source/blue/static/language_i18n_static.json')
# Compiled language files are placed in skin directory at instance
COMPILED_LANG_PATH = os.path.join(
    settings.STATIC_LOCATION, '_source/blue/static/lang_{language}/language_compiled.json')
# Compiled en_US language file is placed in skin directory always and can be sed for fallback
COMPILED_EN_US_PATH = os.path.join(
    settings.STATIC_LOCATION, '_source/blue/static/language_compiled.json')
if settings.LOCAL_ENVIRONMENT or settings.TESTING:
    # Compiled language files in local development are placed in cloud_portal/translation/{language}/
    COMPILED_LANG_PATH = os.path.join(os.path.dirname(
        settings.BASE_DIR), 'translations/{language}/language_compiled.json')


if not os.path.isfile(COMPILED_LANG_PATH):
    # If file does not exist, use default en_US file
    COMPILED_LANG_PATH = COMPILED_EN_US_PATH


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

    title_segments = base_route_meta.get('title', '').split(' - ')[::-1]

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


def sub_translated(target, sub_lookup):
    if isinstance(target, str):
        return sub_lookup.get(target, target)
    if isinstance(target, list):
        return [sub_translated(val, sub_lookup) for val in target]
    return {key: sub_translated(val, sub_lookup) for key,val in target.items()}


def get_lang_meta(request, lang=None):
    try:
        if not lang:
            lang = detect_language_by_request(request)
        with open(STATIC_LANG_PATH, 'r') as file:
            content = json.load(file)
        meta_defaults = content['metaDefaults']
        with open(COMPILED_LANG_PATH.format(language=lang), 'r') as file:
            compiled_lang = json.load(file)

        return sub_translated(meta_defaults, compiled_lang)
    except Exception as e:
        logger.warn(e)

    return { 'default': {} }


def get_config_meta(request, config_path=None):
    if not config_path:
        config_path = os.path.join(
            settings.STATIC_LOCATION, '_source/blue/static', 'metaDefaults.json')
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
    # language strings with customization variables and process it within global context it
    config = cloud_portal_customization_cache(request.CUSTOMIZATION)['config']
    lang_code = detect_language_by_request(request)
    lang = Language(code=lang_code)
    cloud_portal = get_cloud_portal_asset(customization=request.CUSTOMIZATION)
    template_cache = TemplatesCache(
        customization_name=request.CUSTOMIZATION,
        template_name=f'meta-{request.get_full_path()}',
        language_code=lang_code,
        skin=None,
        version_id=cloud_portal.version_id(),
    )
    if cached := template_cache.get_value():
        return cached

    lang_meta = get_lang_meta(request, lang=lang_code)
    config_meta = get_config_meta(request, config_path)
    base_meta = {
        **lang_meta['default'],
        **config_meta['default'],
        'url': request.build_absolute_uri(request.path),
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

    processed_meta = process_meta(
        meta={'title': generated_meta['title'],
              'site_name': generated_meta.get('site_name', ''),
              'site_url': f'{request.scheme}://{request.get_host()}/',
              'meta': sorted([[k, v] for k, v in generated_meta.items()])},
        cloud_portal_asset=get_cloud_portal_asset(customization=request.CUSTOMIZATION),
        customization_name=request.CUSTOMIZATION,
        language=lang)
    template_cache.set_value(processed_meta)
    return processed_meta


def process_meta(meta, cloud_portal_asset,  customization_name, language):
    # it is weird and ugly but serialization/deserialization is cheaper
    # here than collecting language in app_view where template is rendered
    global_contexts = Context.objects.filter(
        asset_type=cloud_portal_asset.asset_type, is_global=True, hidden=False)
    global_contexts_dict = global_contexts_to_dict(
        global_contexts, cloud_portal_asset)
    context_processor = ContextProcessor(
        asset=cloud_portal_asset, preview=False,
        version_id=cloud_portal_asset.version_id(),
        global_contexts=global_contexts,
        global_contexts_dict=global_contexts_dict
    )
    context_processor.process_global_contexts(
        content=meta, language=language)
    return meta


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
            name=request.CUSTOMIZATION).exists()
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


@csrf_exempt
def app_view(request):
    response = None
    if redirect_path := check_redirect(request):
        return shortcuts.redirect(redirect_path, permanent=True)

    if waffle.switch_is_active(SWITCHES.server_side_meta):
        context = get_meta(request)
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        open_graph_crawler = re.match(SHARE_CRAWLER_REGEX, user_agent)

        if open_graph_crawler:
            return shortcuts.render(request, "cms/sharing_meta.html", context)

        response = TemplateView.as_view(
            template_name="static/index.mustache.html",
            extra_context=context)(request)

    response = response or shortcuts.render(request, "static/index.html")

    if settings.LOCAL_ENVIRONMENT and not settings.TESTING and request.get_full_path().startswith('/cdb'):
        from proxy.views import proxy_view
        remoteurl = f'{get_cloud_db_url()}{re.sub(r"^/cdb", "", request.get_full_path())}'
        return proxy_view(request, remoteurl)

    return response


def robots_txt(request):
    user_agent = request.META.get('HTTP_USER_AGENT', '')
    open_graph_crawler = re.match(SHARE_CRAWLER_REGEX, user_agent)
    allow = waffle.switch_is_active(
        SWITCHES.server_side_meta) and open_graph_crawler
    lines = ['# robotstxt.org', '', 'User-agent: *',
             f'{"allow" if allow else "disallow"}: /']
    return HttpResponse('\n'.join(lines), content_type="text/plain")

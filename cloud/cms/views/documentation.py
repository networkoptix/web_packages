from time import sleep
from django.core.paginator import Paginator
from rest_framework.decorators import api_view, permission_classes
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from django.conf import settings
from math import ceil
from rest_framework import status

from cloud.helpers.exceptions import (
    APIInternalException, api_success, handle_exceptions, APINotFoundException, APIForbiddenException)
from api.serializers import MenusSerializer
from cms.controllers.integration import make_integrations_json
from cms.controllers.documentation import generate_doc_json, DOC_CACHE
from cms.controllers.filldata import global_contexts_to_dict
from cms.models import Asset, AssetType, get_cached_menu, Context, get_cloud_portal_asset, Menu, cached_doc_menu_map, \
    AssetCustomizationReview
from cms.permissions import CanViewDevelopers
from cms.serializers import *
from util.helpers import get_language_object_from_request, get_meilisearch_client
import re
from meilisearch.errors import MeiliSearchApiError

PAGE_NOT_FOUND = 'Page not found'
KB_NOT_FOUND = 'Kb not found'

SEARCH_SNIPPET_PADDING = 250
CACHE_HEADER = {'Cache-Control': f'max-age={60}'}
LONG_CACHE_HEADER = {'Cache-Control': f'max-age={60*60*24*30}'}

state__query_param = openapi.Parameter("state", openapi.IN_QUERY,
                                       description="State of the page. Ex: draft, published, or pending",
                                       type=openapi.TYPE_STRING)
filter__query_param = openapi.Parameter("filter", openapi.IN_QUERY,
                                        description="Search string which documentation pages are filtered against",
                                        type=openapi.TYPE_STRING)
id__query_param = openapi.Parameter(
    "id", openapi.IN_PATH, type=openapi.TYPE_STRING)


@swagger_auto_schema(
    method="GET",
    operation_description="Returns a documentation page",
    manual_parameters=[state__query_param],
    responses={'200': openapi.Response(
        'Documentation Page', DocumentationPageSerializer)}
)
@api_view(("GET", ))
@permission_classes((CanViewDevelopers, ))
@handle_exceptions
def get_page(request, doc_id):
    draft = request.query_params.get('state') == 'draft'
    review = request.query_params.get('state') in ('pending', 'review')
    version = request.query_params.get('version')
    language = get_language_object_from_request(request)

    doc = Asset.objects.filter(
        asset_type__type=AssetType.ASSET_TYPES.documentation, id=doc_id).first()

    # If doc is not found, then return a 404
    if doc:
        headers = LONG_CACHE_HEADER if version and version == str(
            doc.version_id()) else None
        if (draft or review) and not (request.user.is_superuser or doc.created_by == request.user):
            raise APIForbiddenException(error_data={'id': doc_id},
                                        error_text='Not allowed to view this preview')

        docs_json = generate_doc_json(
            [doc], language=language, draft=draft, review=review)
        if docs_json:
            ser = DocumentationPageSerializer(data=docs_json[0])
            ser.is_valid()
            return api_success(ser.data, additional_headers=headers)

    raise APINotFoundException(
        error_data={'id': doc_id}, error_text=PAGE_NOT_FOUND)


def find_article(nodes, doc_id):
    for node in nodes:
        if node.asset and node.asset.id == doc_id or find_article(node.get('nodes', []), doc_id):
            return True
    return False


@swagger_auto_schema(
    method="GET",
    operation_description="Returns the first knowledgebase found for an article",
    responses={'200': openapi.Response('Article Knowledgebase', openapi.Schema(
        type=openapi.TYPE_OBJECT,
        properties={
            'base': openapi.Schema(type=openapi.TYPE_STRING),
            'kb_name': openapi.Schema(type=openapi.TYPE_STRING)
        }
    ))}
)
@api_view(("GET", ))
@permission_classes((CanViewDevelopers, ))
@handle_exceptions
def kb_for_article(request, doc_id):
    doc = Asset.objects.filter(
        id=doc_id, asset_type__type=AssetType.ASSET_TYPES.documentation, customizations__name=settings.CUSTOMIZATION,
        contentversion__assetcustomizationreview__state=AssetCustomizationReview.REVIEW_STATES.accepted
    ).first()
    if not doc:
        raise APINotFoundException(
            error_data={'id': doc_id}, error_text=KB_NOT_FOUND)
    nodes = doc.nodes.all()
    menus = {node.get_parent() for node in nodes}
    for menu in menus:
        if menu.base_url and menu.url and menu.enabled:
            return {'base': menu.base_url, 'kb_name': menu.url}
    raise APINotFoundException(
        error_data={'id': doc_id}, error_text=KB_NOT_FOUND)


# Simple filter for checking that each space delimited string exists somewhere in the doc
# For more complicated filtering we will probably need to check out something like Haystack
def simple_filter(docs, filter_query):
    filter_regex = re.compile(
        rf'(?:^|\W)(.{{0,{SEARCH_SNIPPET_PADDING}}}({re.escape(filter_query)}).{{0,{SEARCH_SNIPPET_PADDING}}})(?:$|\W)', re.IGNORECASE | re.DOTALL)
    matched_docs = []
    for doc in docs:
        matched = False
        doc_dict = {
            'doc_id': doc['id'],
            'title': doc['title'],
            'titleMatchStart': None,
            'titleMatchEnd': None,
            'shortDescription': doc['shortDescription'],
            'shortDescriptionMatchStart': None,
            'shortDescriptionMatchEnd': None,
            'snippets': []
        }

        title_match = filter_regex.match(doc['title'])
        if title_match:
            matched = True
            doc_dict['titleMatchStart'] = title_match.start(2)
            doc_dict['titleMatchEnd'] = title_match.end(2)

        short_description_match = filter_regex.match(doc['shortDescription'])
        if short_description_match:
            matched = True
            doc_dict['shortDescriptionMatchStart'] = short_description_match.start(
                2)
            doc_dict['shortDescriptionMatchEnd'] = short_description_match.end(
                2)

        for block in doc.get('blocks', []):
            block_content = block.get('content', '')
            for match in filter_regex.finditer(block_content):
                matched = True
                match_content = match.group(1)
                shift = 0
                if match.start() > 0:
                    match_content = f'... {match_content}'
                    shift = 4
                if match.end() < len(block_content) - 1:
                    match_content = f'{match_content} ...'
                doc_dict['snippets'].append({
                    'content': match_content,
                    'matchStart': match.start(2) - match.start(1) + shift,
                    'matchEnd': match.end(2) - match.start(1) + shift
                })
        if matched:
            matched_docs.append(doc_dict)

    return matched_docs


def populate_docs_from_knowledgebase(nodes, docs):
    for node in nodes:
        asset_id = node.get('asset_id', None)
        if asset_id and node.get('asset_type', AssetType.ASSET_TYPES[AssetType.ASSET_TYPES.documentation]):
            docs.append(asset_id)
        if node.get('nodes', None):
            populate_docs_from_knowledgebase(node['nodes'], docs)


page__query_param = openapi.Parameter("page", openapi.IN_QUERY,
                                      description="Which page of results to return",
                                      type=openapi.TYPE_STRING)
page_size__query_param = openapi.Parameter("pageSize", openapi.IN_QUERY,
                                           description="Max number of results per page",
                                           type=openapi.TYPE_STRING)
kb_name__path_param = openapi.Parameter(
    'name', openapi.IN_PATH, type=openapi.TYPE_STRING, description='Knowledgebase name'
)


def sync_search_for_menu(request, name):
    cache_key = f'!!{settings.CUSTOMIZATION}--kb--{name}'
    docs = DOC_CACHE[cache_key]
    language = get_language_object_from_request(request)
    knowledgebase_menu = get_cached_menu(
        settings.CUSTOMIZATION, name, menu_type=Menu.MENU_TYPES.docs_knowledgebase)
    if not knowledgebase_menu:
        raise APINotFoundException(f'Knowledgebase {name} not found')
    knowledgebase = knowledgebase_menu['nodes']
    docs = []
    populate_docs_from_knowledgebase(knowledgebase, docs)
    DOC_CACHE[cache_key] = docs
    return generate_doc_json(docs, language=language, force_update=True)


@api_view(("GET", ))
@permission_classes((CanViewDevelopers, ))
@handle_exceptions
def sync_search(request, name=None):
    """Force sync either instant search for either a single knowledgebase or for all docs.

    This will mostly be available for admins in case something weird happens where the instant search gets in a weird state.
    """
    if not name:
        index = get_meilisearch_client().index('documentation')
        index.delete_all_documents()

    docs = sync_search_for_menu(
        request, name) if name else generate_doc_json(
            Asset.objects.filter(
                asset_type__type=AssetType.ASSET_TYPES.documentation
            ).values_list(
                'pk', flat=True
            ),
            language=get_language_object_from_request(request),
            force_update=True
    )

    if docs:
        return api_success(docs)
    else:
        raise APINotFoundException(f'Knowledgebase {name} not found')


SEARCH_NOT_CONFIGURED = 'Instant search not properly configured for this instance'
SEARCH_INDEX_NOT_FOUND = 'Instant Search index for "documentation" not found. Needs to be initialized'
SEARCH_INDEX_UPDATING = 'Instant search index is being updated. Using legacy search.'


@api_view(("GET", ))
@permission_classes((CanViewDevelopers, ))
@handle_exceptions
def kb_search(request, name):
    if not settings.MEILISEARCH_ENDPOINT or not settings.MEILISEARCH_MASTER_KEY:
        raise APIInternalException(
            SEARCH_NOT_CONFIGURED, status.HTTP_501_NOT_IMPLEMENTED)

    if DOC_CACHE.being_initialized:
        raise APIInternalException(
            SEARCH_INDEX_UPDATING, status.HTTP_501_NOT_IMPLEMENTED)

    def get_param(param, default=None):
        default = default or []
        return [param for param in request.query_params.get(param, '').split(',') if param] or default

    query = request.query_params.get('query', '')
    kb_menus_filter = [name] if name else get_param('kbMenus')
    labels_filter = get_param('labels')
    filter_counts = get_param('filterCounts')
    crop_length = int(request.query_params.get('cropLength', 150))
    attributes_to_crop = get_param('attributesToCrop', ['*'])
    to_highlight = get_param('highlight', ["*"])
    perPage = int(request.query_params.get('perPage', 10))
    page = int(request.query_params.get('page', 1))

    index = get_meilisearch_client().index('documentation')

    kb_menus_filter = [f"kbMenus = '{kb}'" for kb in kb_menus_filter if kb]
    labels_filter = [f"labels = '{label}'" for label in labels_filter if label]

    options = {
        'attributesToHighlight': to_highlight,
        'cropLength': crop_length,
        'attributesToCrop': attributes_to_crop,
        'facetsDistribution': filter_counts,
        'filter': [*kb_menus_filter, *labels_filter],
        'limit': perPage,
        'offset': page * perPage - perPage
    }

    raw_results = index.search(
        query, {key: val for key, val in options.items() if val})
    num_hits = raw_results.get('nbHits', 0)

    if not num_hits and not index.get_stats().get('numberOfDocuments', 0) and not index.search('', {'filter': kb_menus_filter}).get('nbHits', 0):
        # Update docs if kb hasn't been added to meilisearch. This would only really happen on first deploy of the meilisearch service
        docs_json = sync_search_for_menu(request, name)

        if not docs_json:
            raise APIInternalException(
                SEARCH_INDEX_NOT_FOUND, status.HTTP_501_NOT_IMPLEMENTED)

        raw_results = index.search(
            query, {key: val for key, val in options.items() if val})

    doc_keys = ['body', 'title', 'shortDescription', 'labels', 'kbMenus', 'id']
    unformatted = ['kbMenus']
    docs = [
        {
            key: val.replace('</em> <em>', ' ').replace('</em>', '</strong>').replace(
                '<em>', '<strong class="highlighted">') if isinstance(val, str) and key not in unformatted else val
            for key, val in hit['_formatted'].items()
            if key in doc_keys
        }
        for hit in raw_results.get('hits', [])
        if hit['kbMenus']
    ]

    search_result = {
        'docs': docs,
        'page': 1,
        'pageSize': perPage,
        'totalPages': int(ceil(num_hits / perPage)),
        'totalResults': num_hits,
        **raw_results.get('facetsDistribution', {}).pop('labels', {})
    }

    return api_success(search_result, additional_headers=CACHE_HEADER)


@swagger_auto_schema(method="GET",
                     operation_description="Returns an array of all documentation pages. Can be filtered",
                     manual_parameters=[
                         filter__query_param, page__query_param, page_size__query_param, kb_name__path_param],
                     responses={'200': DocumentsSerializer()})
@api_view(("GET", ))
@permission_classes((CanViewDevelopers, ))
@handle_exceptions
def get_pages(request, name):
    filter_query = request.query_params.get('filter')
    page = request.query_params.get('page', 1)
    page_size = request.query_params.get('pageSize', 5)
    language = get_language_object_from_request(request)
    cache_key = f'!!{settings.CUSTOMIZATION}--kb--{name}'
    docs = DOC_CACHE[cache_key]
    if not docs:
        knowledgebase_menu = get_cached_menu(
            settings.CUSTOMIZATION, name, menu_type=Menu.MENU_TYPES.docs_knowledgebase)
        if not knowledgebase_menu:
            raise APINotFoundException(f'Knowledgebase {name} not found')
        knowledgebase = knowledgebase_menu['nodes']
        docs = []
        populate_docs_from_knowledgebase(knowledgebase, docs)
        DOC_CACHE[cache_key] = docs
        docs_json = generate_doc_json(
            docs, language=language, trust_cache=False)
    else:
        docs_json = generate_doc_json(
            docs, language=language, trust_cache=True)
    if filter_query:
        docs_json = simple_filter(docs_json, filter_query)

    paginator = Paginator(docs_json, page_size)
    page_obj = paginator.get_page(page)

    return api_success({
        'docs': page_obj.object_list, 'page': page_obj.number, 'pageSize': paginator.per_page,
        'totalPages': paginator.num_pages, 'totalResults': paginator.count,
    }, additional_headers=CACHE_HEADER)


def find_asset_knowledgebase(asset, base_url):
    for node in asset.nodes.all():
        menu = node.get_parent()
        if menu.type == Menu.MENU_TYPES.docs_knowledgebase and menu.base_url == base_url:
            return menu.url
    return ''


def prepare_menu_dict(parent, base_url, language, global_contexts=None, global_contexts_dict=None, draft=False, review=False, user=None):
    for node in parent:
        asset_id = node.get('asset_id', None)
        if asset_id:
            asset = Asset.objects.filter(id=asset_id).first()
            asset_type = asset.asset_type.type
            if asset:
                if asset_type == AssetType.ASSET_TYPES.documentation:
                    docs = generate_doc_json(
                        [asset],
                        language=language,
                        global_contexts=global_contexts,
                        global_contexts_dict=global_contexts_dict,
                        draft=draft,
                        review=review
                    )
                    if docs:
                        node['asset'] = docs[0]
                        node['assetKB'] = find_asset_knowledgebase(
                            asset, base_url)
                elif asset_type == AssetType.ASSET_TYPES.integration:
                    integrations = make_integrations_json(
                        [asset], language=language, user=user)
                    if integrations:
                        node['asset'] = integrations[0]
        if node.get('nodes', None):
            prepare_menu_dict(
                node['nodes'],
                base_url, language,
                global_contexts=global_contexts,
                global_contexts_dict=global_contexts_dict,
                draft=draft,
                review=review,
                user=user
            )


menu_name__path_param = openapi.Parameter(
    'name', openapi.IN_PATH, description='Menu Name', type=openapi.TYPE_STRING)


@swagger_auto_schema(method="GET",
                     operation_description="Returns a serialized version of a menu with assets",
                     manual_parameters=[
                         menu_name__path_param, state__query_param],
                     responses={'200': MenusSerializer()})
@api_view(("GET",))
@permission_classes((CanViewDevelopers,))
def menu_to_endpoint(request, name):
    language = get_language_object_from_request(request)
    cache_id = f'!!{settings.CUSTOMIZATION}-{language.code}--struct--{name}'
    state = request.GET.get('state', '')

    menu_dict = (not state and DOC_CACHE[cache_id]) or generate_menu_dict(
        request, name, language, cache_id, state)

    return api_success(menu_dict)


def generate_menu_dict(request, name, language=None, cache_id=None, state=None):
    language = language or get_language_object_from_request(request)
    cache_id = cache_id or f'!!{settings.CUSTOMIZATION}-{language.code}--struct--{name}'
    state = state or request.GET.get('state', '')
    draft = state == 'draft' and request.user.is_superuser
    review = state == 'review' and request.user.is_superuser
    show_superuser_draft_review = (
        draft or review) and request.user.is_superuser

    if show_superuser_draft_review:
        menu_dict = Menu.generate_menu(
            menu_name=name, customization_name=settings.CUSTOMIZATION)
    else:
        menu_dict = get_cached_menu(
            settings.CUSTOMIZATION, name, menu_type=Menu.MENU_TYPES.docs_struct)

    if not menu_dict:
        raise APINotFoundException(f'Menu {name} not found')

    base_url = menu_dict['base_url']
    cloud_portal = get_cloud_portal_asset()
    global_contexts = Context.objects.filter(
        asset_type=cloud_portal.asset_type, is_global=True, hidden=False)
    global_contexts_dict = global_contexts_to_dict(
        global_contexts, cloud_portal)

    prepare_menu_dict(
        menu_dict['nodes'],
        base_url,
        language=language,
        global_contexts=global_contexts,
        global_contexts_dict=global_contexts_dict,
        draft=draft,
        review=review,
        user=request.user
    )

    if not draft and not review:
        DOC_CACHE[cache_id] = menu_dict
    serializer = MenusSerializer(data=menu_dict)
    serializer.is_valid()

    return serializer.data

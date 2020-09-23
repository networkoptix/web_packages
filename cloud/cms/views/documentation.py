from django.core.paginator import Paginator
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from django.conf import settings

from api.helpers.exceptions import (
    api_success, handle_exceptions, APINotFoundException, APIForbiddenException)
from cms.controllers.documentation import generate_doc_json, DOC_CACHE
from cms.models import Asset, AssetType, get_cached_menu
from cms.permissions import CanViewDevelopers
from util.helpers import get_language_object_from_request
import re

state__query_param = openapi.Parameter("state", openapi.IN_QUERY,
                                       description="State of the page. Ex: draft, published, or pending",
                                       type=openapi.TYPE_STRING)
filter__query_param = openapi.Parameter("filter", openapi.IN_QUERY,
                                       description="Search string which documentation pages are filtered against",
                                       type=openapi.TYPE_STRING)
id__query_param = openapi.Parameter("id", openapi.IN_PATH, type=openapi.TYPE_STRING)


@swagger_auto_schema(method="GET",
                     operation_description="Returns an documentation page using based on id and state param",
                     manual_parameters=[state__query_param, id__query_param])
@api_view(("GET", ))
@permission_classes((CanViewDevelopers, ))
@handle_exceptions
def get_page(request, doc_id):
    draft = request.query_params.get('state') == 'draft'
    review = request.query_params.get('state') == 'pending'
    language = get_language_object_from_request(request)

    doc = Asset.objects.filter(asset_type__type=AssetType.ASSET_TYPES.documentation,id=doc_id).first()

    # If doc is not found, then return a 404
    if doc:
        if (draft or review) and not (request.user.is_superuser or doc.created_by == request.user):
            raise APIForbiddenException(error_data={'id': doc_id},
                                        error_text='Not allowed to view this preview')

        docs_json = generate_doc_json([doc], language=language, draft=draft, review=review)
        if docs_json:
            return api_success(docs_json[0])

    raise APINotFoundException(error_data={'id': doc_id}, error_text='Page not found')


# Simple filter for checking that each space delimited string exists somewhere in the doc
# For more complicated filtering we will probably need to check out something like Haystack
def simple_filter(docs, filter_query):
    filter_regex = re.compile(rf'(?:^|\W)(.{{0,100}}({re.escape(filter_query)}).{{0,100}})(?:$|\W)', re.IGNORECASE | re.DOTALL)
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
            doc_dict['shortDescriptionMatchStart'] = short_description_match.start(2)
            doc_dict['shortDescriptionMatchEnd'] = short_description_match.end(2)

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


@swagger_auto_schema(method="GET",
                     operation_description="Returns an array of all documentation pages. Can be filtered",
                     manual_parameters=[filter__query_param, page__query_param, page_size__query_param])
@api_view(("GET", ))
@permission_classes((CanViewDevelopers, ))
@handle_exceptions
def get_pages(request):
    filter_query = request.query_params.get('filter')
    page = request.query_params.get('page', 1)
    page_size = request.query_params.get('pageSize', 5)
    language = get_language_object_from_request(request)

    docs = DOC_CACHE[f'!!{settings.CUSTOMIZATION}-docs']
    if not docs:
        knowledgebase = get_cached_menu(settings.CUSTOMIZATION, 'Knowledgebase')
        docs = []
        populate_docs_from_knowledgebase(knowledgebase, docs)
        DOC_CACHE[f'!!{settings.CUSTOMIZATION}-docs'] = docs
        docs_json = generate_doc_json(docs, language=language, trust_cache=False)
    else:
        docs_json = generate_doc_json(docs, language=language, trust_cache=True)
    if filter_query:
        docs_json = simple_filter(docs_json, filter_query)

    paginator = Paginator(docs_json, page_size)
    page_obj = paginator.get_page(page)

    return api_success({
        'docs': page_obj.object_list, 'page': page_obj.number, 'pageSize': paginator.per_page,
        'totalPages': paginator.num_pages, 'totalResults': paginator.count,
    })


def prepare_menu_dict(parent, language):
    for node in parent:
        asset_id = node.get('asset_id', None)
        if asset_id and node.get('asset_type', AssetType.ASSET_TYPES[AssetType.ASSET_TYPES.documentation]):
            asset = Asset.objects.filter(id=asset_id).first()
            if asset:
                docs = generate_doc_json([asset], language=language)
                if docs:
                    node['asset'] = docs[0]
        if node.get('nodes', None):
            prepare_menu_dict(node['nodes'], language)


@api_view(("GET",))
@permission_classes((CanViewDevelopers,))
def menu_to_endpoint(request, cache_name, menu_name):
    language = get_language_object_from_request(request)
    cache_id = f'!!{settings.CUSTOMIZATION}-{language.code}--{cache_name}'
    menu_dict = DOC_CACHE[cache_id]
    if not menu_dict:
        menu_dict = get_cached_menu(settings.CUSTOMIZATION, menu_name)
        prepare_menu_dict(menu_dict, language=language)
        DOC_CACHE[cache_id] = menu_dict
    return api_success(menu_dict)

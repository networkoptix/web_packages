from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema

from api.helpers.exceptions import (
    api_success, handle_exceptions, APINotFoundException, APIForbiddenException)
from cms.controllers.documentation import generate_doc_json
from cms.models import Asset, AssetType
from util.helpers import get_language_object_from_request

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
@permission_classes((AllowAny, ))
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
def simple_filter(docs, filters):
    remove_indices = []
    for fil in filters:
        for i in range(len(docs)):
            doc = docs[i]
            if fil in doc['title'] or fil in doc['shortDescription']:
                continue
            for block in doc.get('blocks', []):
                if fil in block.get('title', '') or fil in block.get('content', ''):
                    break
            else:
                # Tag index for removal
                remove_indices.append(i)

    # Remove tagged indices
    for i in sorted(remove_indices, reverse=True):
        docs.pop(i)

    return docs


@swagger_auto_schema(method="GET",
                     operation_description="Returns an array of all documentation pages. Can be filtered",
                     manual_parameters=[filter__query_param])
@api_view(("GET", ))
@permission_classes((AllowAny, ))
@handle_exceptions
def get_pages(request):
    filters = request.query_params.get('filter')
    if filters:
        filters = filters.split()

    docs = Asset.objects.filter(asset_type__type=AssetType.ASSET_TYPES.documentation)
    language = get_language_object_from_request(request)
    docs_json = generate_doc_json(list(docs), language=language)
    if filters:
        docs_json = simple_filter(docs_json, filters)

    return api_success(docs_json)

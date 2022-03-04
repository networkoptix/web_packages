from cms.controllers.asset_json import find_actual_values, get_contexts_and_datastructures_of_asset_type, map_ds_attribute_to_actual_value
from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema

from cloud.helpers.exceptions import (
    api_success, APINotFoundException, APIForbiddenException)
from cms.controllers.asset_json import get_review_matching_current_version, process_asset_global_contexts
from cms.controllers.filldata import global_contexts_to_dict
from cms.models import (Context, Asset, AssetType, get_cloud_portal_asset,
                        AssetCustomizationReview, DataStructure)
from cms.serializers import ArticleSerializer

from util.base_cache import BaseCache
from util.helpers import get_language_object_from_request

from typing import Union

state__query_param = openapi.Parameter("state", openapi.IN_QUERY,
                                       description="State of the article. Ex: draft, published, or review",
                                       type=openapi.TYPE_STRING)
id__query_param = openapi.Parameter(
    "id", openapi.IN_QUERY, type=openapi.TYPE_STRING)
url__route_param = openapi.Parameter("url_param", openapi.IN_PATH,
                                     description="Route in the url that points to the article.",
                                     type=openapi.TYPE_STRING)

ARTICLE_NOT_FOUND = 'Article not found'


@swagger_auto_schema(method="GET",
                     operation_description="Returns an article based on params",
                     manual_parameters=[state__query_param,
                                        id__query_param, url__route_param],
                     responses={'200': openapi.Response('Article', ArticleSerializer)})
@api_view(("GET", ))
@permission_classes((AllowAny, ))
def get_article(request, url_param, **kwargs):
    ARTICLE_CACHE = BaseCache(cache_key='article')
    state = request.query_params.get('state') or 'accepted'
    draft = state == 'draft'
    review = state == 'pending'
    article_id = request.query_params.get('id')
    language = get_language_object_from_request(request)
    article: Union[Asset, None] = None
    version = None
    cached_article = None

    if article_id:
        # If id is provided, then only search with id, url_parm is ignored to make sure correct article is found
        # Used primarily for showing previews correctly
        article = Asset.objects.filter(id=article_id).first()

    else:
        article_review = AssetCustomizationReview.objects.filter(
            version__asset__datarecord__value=url_param, version__asset__datarecord__data_structure__name='url',
            version__asset__asset_type__type=AssetType.ASSET_TYPES.article,
            state=AssetCustomizationReview.REVIEW_STATES.accepted, customization__name=settings.CUSTOMIZATION
        ).last()
        if article_review:
            # Check that that the asset's current url still matches
            article = article_review.version.asset
            version = article.version_id(settings.CUSTOMIZATION)
            ARTICLE_CACHE.lookup_key = BaseCache.generate_lookup_key(
                language, state, url_param, version)
            cached_article = ARTICLE_CACHE.get_cached_item()

            if not cached_article:
                url_ds = DataStructure.objects.get(
                    context__asset_type=article.asset_type, name='url')
                if url_ds.find_actual_value(asset=article, version_id=version,
                                            customization_name=settings.CUSTOMIZATION) != url_param:
                    article = None
    # If article is not found, then return a 404
    if article or cached_article:
        if (draft or review) and not (request.user.is_superuser or article.created_by == request.user):
            raise APIForbiddenException(error_data={'url_param': url_param},
                                        error_text='Not allowed to view this preview')
        if cached_article:
            return api_success(cached_article)
        # Set version based on draft or pending query params
        version = article.version_id()
        if review:
            pending_review = get_review_matching_current_version(
                article, version)
            if pending_review:
                version = pending_review.version.id
        elif draft:
            version = None

        # If version is 0, then article has no acceptable version and the request isn't for a draft
        if version != 0:
            _, datastructures = get_contexts_and_datastructures_of_asset_type(
                AssetType.ASSET_TYPES.article)
            actual_values = find_actual_values(
                datastructures, article, version, draft, review, ['title', 'body'])
            article_dict = map_ds_attribute_to_actual_value(
                actual_values, 'name')

            # Get global contexts and fill any matching variables in datarecords
            cloud_portal = get_cloud_portal_asset()
            global_contexts = Context.objects.filter(
                asset_type=cloud_portal.asset_type, is_global=True, hidden=False)
            global_contexts_dict = global_contexts_to_dict(
                global_contexts, cloud_portal)
            process_asset_global_contexts(
                language, cloud_portal, global_contexts, article.version_id(),
                article_dict, global_contexts_dict=global_contexts_dict)

            ARTICLE_CACHE.set_cached_item(article_dict)

            ser = ArticleSerializer(data=article_dict)
            ser.is_valid()
            return api_success(ser.data)

    raise APINotFoundException(
        error_data={'url_param': url_param}, error_text=ARTICLE_NOT_FOUND)
